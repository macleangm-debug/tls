"""
Orders Routes - Stamp orders and physical orders management
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

orders_router = APIRouter(tags=["Orders"])


def get_orders_dependencies():
    """Import dependencies from main server module at runtime"""
    from server import (
        db, get_current_user, csrf_protect,
        STAMP_TYPES, StampOrderCreate, StampOrder,
        PhysicalOrderCreate, PhysicalOrder
    )
    return {
        "db": db,
        "get_current_user": get_current_user,
        "csrf_protect": csrf_protect,
        "STAMP_TYPES": STAMP_TYPES,
        "StampOrderCreate": StampOrderCreate,
        "StampOrder": StampOrder,
        "PhysicalOrderCreate": PhysicalOrderCreate,
        "PhysicalOrder": PhysicalOrder
    }


@orders_router.get("/stamp-types")
async def get_stamp_types():
    """Get available stamp types"""
    deps = get_orders_dependencies()
    return deps["STAMP_TYPES"]


@orders_router.post("/orders")
async def create_stamp_order(
    order_data: dict,
    user: dict = Depends(lambda: get_orders_dependencies()["get_current_user"])
):
    """Create a new stamp order"""
    deps = get_orders_dependencies()
    db = deps["db"]
    STAMP_TYPES = deps["STAMP_TYPES"]
    
    # Find stamp type
    stamp_type = next((s for s in STAMP_TYPES if s["id"] == order_data.get("stamp_type_id")), None)
    if not stamp_type:
        raise HTTPException(status_code=400, detail="Invalid stamp type")
    
    quantity = order_data.get("quantity", 1)
    
    order = {
        "id": str(uuid.uuid4()),
        "advocate_id": user["id"],
        "stamp_type_id": stamp_type["id"],
        "stamp_type_name": stamp_type["name"],
        "quantity": quantity,
        "customization": order_data.get("customization", {}),
        "delivery_address": order_data.get("delivery_address", ""),
        "total_price": stamp_type["price"] * quantity,
        "currency": stamp_type.get("currency", "TZS"),
        "status": "pending",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.stamp_orders.insert_one(order)
    
    return {k: v for k, v in order.items() if k != "_id"}


@orders_router.get("/orders")
async def get_orders(user: dict = Depends(lambda: get_orders_dependencies()["get_current_user"])):
    """Get user's stamp orders"""
    deps = get_orders_dependencies()
    db = deps["db"]
    
    orders = await db.stamp_orders.find(
        {"advocate_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return orders


@orders_router.get("/orders/{order_id}")
async def get_order(
    order_id: str,
    user: dict = Depends(lambda: get_orders_dependencies()["get_current_user"])
):
    """Get specific order"""
    deps = get_orders_dependencies()
    db = deps["db"]
    
    order = await db.stamp_orders.find_one(
        {"id": order_id, "advocate_id": user["id"]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# =============== PHYSICAL ORDERS ===============

@orders_router.post("/physical-orders")
async def create_physical_order(
    order_data: dict,
    user: dict = Depends(lambda: get_orders_dependencies()["get_current_user"])
):
    """Create a physical stamp/ink order"""
    deps = get_orders_dependencies()
    db = deps["db"]
    
    items = order_data.get("items", [])
    if not items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")
    
    total_price = sum(item.get("total_price", 0) for item in items)
    
    order = {
        "id": str(uuid.uuid4()),
        "advocate_id": user["id"],
        "advocate_name": user.get("full_name", "Unknown"),
        "items": items,
        "delivery_address": order_data.get("delivery_address", ""),
        "special_instructions": order_data.get("special_instructions", ""),
        "customization": order_data.get("customization", {}),
        "total_price": total_price,
        "currency": "TZS",
        "status": "pending_review",
        "payment_status": "pending",
        "status_history": [{
            "status": "pending_review",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "Order received"
        }],
        "notes": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.physical_orders.insert_one(order)
    
    return {k: v for k, v in order.items() if k != "_id"}


@orders_router.get("/physical-orders")
async def get_physical_orders(user: dict = Depends(lambda: get_orders_dependencies()["get_current_user"])):
    """Get user's physical orders"""
    deps = get_orders_dependencies()
    db = deps["db"]
    
    orders = await db.physical_orders.find(
        {"advocate_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return orders


@orders_router.get("/physical-orders/{order_id}")
async def get_physical_order(
    order_id: str,
    user: dict = Depends(lambda: get_orders_dependencies()["get_current_user"])
):
    """Get specific physical order"""
    deps = get_orders_dependencies()
    db = deps["db"]
    
    order = await db.physical_orders.find_one(
        {"id": order_id, "advocate_id": user["id"]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@orders_router.put("/physical-orders/{order_id}/status")
async def update_physical_order_status(
    order_id: str,
    status_data: dict,
    user: dict = Depends(lambda: get_orders_dependencies()["get_current_user"])
):
    """Update physical order status (admin only)"""
    deps = get_orders_dependencies()
    db = deps["db"]
    
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    order = await db.physical_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    new_status = status_data.get("status")
    note = status_data.get("note", "")
    
    valid_statuses = [
        "pending_review", "approved", "in_production", 
        "quality_check", "ready_dispatch", "dispatched", 
        "delivered", "cancelled"
    ]
    
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Add to status history
    status_entry = {
        "status": new_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": note,
        "updated_by": user["id"]
    }
    
    update_data = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status_data.get("tracking_number"):
        update_data["tracking_number"] = status_data["tracking_number"]
    
    await db.physical_orders.update_one(
        {"id": order_id},
        {
            "$set": update_data,
            "$push": {"status_history": status_entry}
        }
    )
    
    updated = await db.physical_orders.find_one({"id": order_id}, {"_id": 0})
    return updated


@orders_router.post("/physical-orders/{order_id}/notes")
async def add_order_note(
    order_id: str,
    note_data: dict,
    user: dict = Depends(lambda: get_orders_dependencies()["get_current_user"])
):
    """Add a note to an order"""
    deps = get_orders_dependencies()
    db = deps["db"]
    
    order = await db.physical_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user is admin or order owner
    if user.get("role") not in ["admin", "super_admin"] and order["advocate_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    note = {
        "id": str(uuid.uuid4()),
        "text": note_data.get("text", ""),
        "author_id": user["id"],
        "author_name": user.get("full_name", "Unknown"),
        "author_role": user.get("role", "advocate"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.physical_orders.update_one(
        {"id": order_id},
        {"$push": {"notes": note}}
    )
    
    return note


@orders_router.get("/physical-orders/stats/summary")
async def get_physical_orders_stats(user: dict = Depends(lambda: get_orders_dependencies()["get_current_user"])):
    """Get physical orders statistics (admin only)"""
    deps = get_orders_dependencies()
    db = deps["db"]
    
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pipeline = [
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "total_value": {"$sum": "$total_price"}
            }
        }
    ]
    
    results = await db.physical_orders.aggregate(pipeline).to_list(None)
    
    stats = {
        "by_status": {r["_id"]: {"count": r["count"], "value": r["total_value"]} for r in results},
        "total_orders": sum(r["count"] for r in results),
        "total_value": sum(r["total_value"] for r in results)
    }
    
    return stats
