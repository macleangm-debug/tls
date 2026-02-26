"""
Membership Billing Routes
Handles membership policy management (IDC admin) and status queries (advocates).
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


membership_router = APIRouter(prefix="/api", tags=["Membership"])


# =============== PYDANTIC MODELS ===============

class MembershipPolicyUpdate(BaseModel):
    enabled: Optional[bool] = None
    mode: Optional[str] = None  # "subscription" | "fixed"
    period: Optional[str] = None  # "monthly" | "annual"
    currency: Optional[str] = None
    subscription_tier_id: Optional[str] = None
    fixed_price: Optional[float] = None
    grace_days: Optional[int] = Field(None, ge=0, le=30)
    enforcement: Optional[str] = None  # "warn_only" | "block_stamping" | "block_all"

class ManualPaymentCreate(BaseModel):
    user_id: str
    amount: float
    period: str = "annual"
    payment_method: str = "manual"
    reference: Optional[str] = None


# =============== ROUTE FACTORY ===============

def create_membership_routes(db, get_current_user, require_admin, require_super_admin):
    """Create membership routes with database and auth dependencies."""
    
    from services.membership_service import get_membership_service
    
    # =============== ADVOCATE ENDPOINTS ===============
    
    @membership_router.get("/membership/status")
    async def get_membership_status(user: dict = Depends(get_current_user)):
        """Get current user's membership status."""
        service = get_membership_service(db)
        status = await service.get_member_status(user)
        return status
    
    # =============== ADMIN ENDPOINTS ===============
    
    @membership_router.get("/admin/membership/settings")
    async def get_membership_settings(user: dict = Depends(require_super_admin)):
        """Get membership billing settings. Requires super_admin."""
        service = get_membership_service(db)
        policy = await service.get_policy()
        return {"policy": policy}
    
    @membership_router.patch("/admin/membership/settings")
    async def update_membership_settings(
        data: MembershipPolicyUpdate,
        user: dict = Depends(require_super_admin)
    ):
        """Update membership billing settings. Requires super_admin."""
        # Validate enforcement value
        if data.enforcement and data.enforcement not in ["warn_only", "block_stamping", "block_all"]:
            raise HTTPException(status_code=400, detail="Invalid enforcement mode")
        
        # Validate mode
        if data.mode and data.mode not in ["subscription", "fixed"]:
            raise HTTPException(status_code=400, detail="Invalid billing mode")
        
        # Validate period
        if data.period and data.period not in ["monthly", "annual"]:
            raise HTTPException(status_code=400, detail="Invalid billing period")
        
        service = get_membership_service(db)
        updates = data.dict(exclude_unset=True)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        policy = await service.update_policy(updates, user["id"])
        
        # Log system event
        now = datetime.now(timezone.utc).isoformat()
        await db.system_events.insert_one({
            "event_type": "MEMBERSHIP_POLICY_UPDATED",
            "updated_by": user["id"],
            "updated_by_email": user.get("email"),
            "changes": list(updates.keys()),
            "new_values": updates,
            "timestamp": now
        })
        
        return {"message": "Membership policy updated", "policy": policy}
    
    @membership_router.post("/admin/membership/manual-payment")
    async def create_manual_payment(
        data: ManualPaymentCreate,
        user: dict = Depends(require_admin)
    ):
        """Create a manual membership payment for a user. For admin use."""
        # Verify user exists - check both users and advocates collections
        target_user = await db.users.find_one({"id": data.user_id}, {"_id": 0})
        if not target_user:
            target_user = await db.advocates.find_one({"id": data.user_id}, {"_id": 0})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        service = get_membership_service(db)
        payment = await service.create_membership_payment(
            user_id=data.user_id,
            amount=data.amount,
            period=data.period,
            payment_method=data.payment_method,
            reference=data.reference
        )
        
        # Log system event
        now = datetime.now(timezone.utc).isoformat()
        await db.system_events.insert_one({
            "event_type": "MEMBERSHIP_PAYMENT_CREATED",
            "created_by": user["id"],
            "created_by_email": user.get("email"),
            "target_user_id": data.user_id,
            "target_user_email": target_user.get("email"),
            "amount": data.amount,
            "period": data.period,
            "timestamp": now
        })
        
        return {"message": "Payment recorded", "payment": payment}
    
    @membership_router.get("/admin/membership/payments")
    async def list_membership_payments(
        status: Optional[str] = None,
        limit: int = 100,
        user: dict = Depends(require_admin)
    ):
        """List membership payments. For admin use."""
        query = {}
        if status:
            query["status"] = status
        
        payments = await db.membership_payments.find(
            query, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Get user details for each payment
        user_ids = list(set(p["user_id"] for p in payments))
        users = await db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "roll_number": 1}
        ).to_list(len(user_ids))
        user_map = {u["id"]: u for u in users}
        
        for payment in payments:
            user_info = user_map.get(payment["user_id"], {})
            payment["user_name"] = user_info.get("full_name", "Unknown")
            payment["user_email"] = user_info.get("email", "")
            payment["user_roll"] = user_info.get("roll_number", "")
        
        return {"payments": payments, "total": len(payments)}
    
    @membership_router.get("/admin/membership/stats")
    async def get_membership_stats(user: dict = Depends(require_admin)):
        """Get membership statistics."""
        service = get_membership_service(db)
        policy = await service.get_policy()
        
        # Count payments
        total_payments = await db.membership_payments.count_documents({"status": "paid"})
        
        # Count active members (payments not expired)
        now = datetime.now(timezone.utc).isoformat()
        active_members = await db.membership_payments.count_documents({
            "status": "paid",
            "expires_at": {"$gt": now}
        })
        
        # Count total advocates
        total_advocates = await db.advocates.count_documents({"role": "advocate"})
        
        # Count expiring soon (within 30 days)
        thirty_days = (datetime.now(timezone.utc) + __import__("datetime").timedelta(days=30)).isoformat()
        expiring_soon = await db.membership_payments.count_documents({
            "status": "paid",
            "expires_at": {"$gt": now, "$lt": thirty_days}
        })
        
        return {
            "policy_enabled": policy.get("enabled", False),
            "enforcement": policy.get("enforcement", "warn_only"),
            "total_advocates": total_advocates,
            "total_payments": total_payments,
            "active_members": active_members,
            "expiring_soon": expiring_soon,
            "unpaid_estimate": total_advocates - active_members
        }
    
    return membership_router
