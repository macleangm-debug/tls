"""
KwikPay Payment Integration Module (MOCKED)
Supports: Bank, QR Code, MoMo (Mobile Money), Card Payments
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import hashlib
import qrcode
import base64
from io import BytesIO

# Create router
payment_router = APIRouter(prefix="/api/payments", tags=["Payments - KwikPay"])

# =============== ENUMS & MODELS ===============

class PaymentMethod(str, Enum):
    BANK = "bank"
    QR_CODE = "qr_code"
    MOMO = "momo"  # Mobile Money
    CARD = "card"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class ServiceType(str, Enum):
    INVOICE = "invoice"
    PHYSICAL_STAMP = "physical_stamp"
    DIGITAL_STAMP = "digital_stamp"
    CERTIFICATION = "certification"
    CONSULTATION = "consultation"
    OTHER = "other"

class PaymentInitiate(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = "TZS"
    payment_method: PaymentMethod
    service_type: ServiceType
    description: str
    reference_id: Optional[str] = None  # Invoice ID, Order ID, etc.
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None

class MoMoPushRequest(BaseModel):
    phone_number: str
    amount: float
    description: str
    service_type: ServiceType
    reference_id: Optional[str] = None

class PaymentVerify(BaseModel):
    payment_id: str
    otp: Optional[str] = None

class RefundRequest(BaseModel):
    payment_id: str
    amount: Optional[float] = None  # Partial refund if specified
    reason: str


# =============== HELPER FUNCTIONS ===============

def generate_payment_reference() -> str:
    """Generate unique payment reference"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_suffix = uuid.uuid4().hex[:6].upper()
    return f"KP-{timestamp}-{random_suffix}"

def generate_qr_code(data: str) -> str:
    """Generate QR code as base64 string"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def simulate_payment_processing(payment_method: PaymentMethod) -> dict:
    """Simulate KwikPay payment processing (MOCKED)"""
    import random
    
    # Simulate success rate (90% success for demo)
    success = random.random() < 0.9
    
    processing_times = {
        PaymentMethod.BANK: "2-3 business days",
        PaymentMethod.QR_CODE: "Instant",
        PaymentMethod.MOMO: "Instant",
        PaymentMethod.CARD: "Instant"
    }
    
    return {
        "success": success,
        "processing_time": processing_times.get(payment_method, "Instant"),
        "gateway_reference": f"KWIK-{uuid.uuid4().hex[:12].upper()}",
        "message": "Payment processed successfully" if success else "Payment failed - please try again"
    }


# =============== ROUTE FACTORY ===============

def create_payment_routes(db, get_current_user):
    """Factory function to create payment routes with database dependency"""
    
    # ===================== PAYMENT INITIATION =====================
    
    @payment_router.post("/initiate")
    async def initiate_payment(data: PaymentInitiate, user: dict = Depends(get_current_user)):
        """Initiate a new payment request"""
        now = datetime.now(timezone.utc).isoformat()
        payment_ref = generate_payment_reference()
        payment_id = str(uuid.uuid4())
        
        # Generate QR code data for QR payments
        qr_data = None
        qr_code_base64 = None
        if data.payment_method == PaymentMethod.QR_CODE:
            qr_payload = {
                "payment_ref": payment_ref,
                "amount": data.amount,
                "currency": data.currency,
                "advocate_id": user["id"],
                "advocate_name": user.get("full_name", ""),
                "description": data.description
            }
            qr_data = f"kwikpay://pay?ref={payment_ref}&amount={data.amount}&currency={data.currency}"
            qr_code_base64 = generate_qr_code(qr_data)
        
        # Create payment record
        payment = {
            "id": payment_id,
            "advocate_id": user["id"],
            "payment_reference": payment_ref,
            "amount": data.amount,
            "currency": data.currency,
            "payment_method": data.payment_method.value,
            "service_type": data.service_type.value,
            "description": data.description,
            "reference_id": data.reference_id,
            "client_name": data.client_name,
            "client_phone": data.client_phone,
            "client_email": data.client_email,
            "status": PaymentStatus.PENDING.value,
            "qr_data": qr_data,
            "gateway_reference": None,
            "gateway_response": None,
            "created_at": now,
            "updated_at": now,
            "completed_at": None
        }
        
        await db.payments.insert_one(payment)
        
        response = {
            "payment_id": payment_id,
            "payment_reference": payment_ref,
            "amount": data.amount,
            "currency": data.currency,
            "payment_method": data.payment_method.value,
            "status": PaymentStatus.PENDING.value,
            "message": "Payment initiated successfully"
        }
        
        # Add QR code if applicable
        if qr_code_base64:
            response["qr_code"] = qr_code_base64
            response["qr_data"] = qr_data
            response["instructions"] = "Show this QR code to your client for scanning"
        
        # Add MoMo instructions
        if data.payment_method == PaymentMethod.MOMO:
            response["instructions"] = f"A payment request will be sent to {data.client_phone}"
            response["ussd_simulation"] = f"*150*00*{payment_ref}#"
        
        # Add bank instructions
        if data.payment_method == PaymentMethod.BANK:
            response["bank_details"] = {
                "bank_name": "CRDB Bank Tanzania",
                "account_name": "TLS Advocate Payments",
                "account_number": "0150XXXXXXXX",
                "reference": payment_ref,
                "instructions": "Use the payment reference when making the transfer"
            }
        
        return response
    
    @payment_router.post("/momo/push")
    async def send_momo_push(data: MoMoPushRequest, user: dict = Depends(get_current_user)):
        """Send MoMo push notification to client's phone (MOCKED)"""
        now = datetime.now(timezone.utc).isoformat()
        payment_ref = generate_payment_reference()
        payment_id = str(uuid.uuid4())
        
        # Create payment record
        payment = {
            "id": payment_id,
            "advocate_id": user["id"],
            "payment_reference": payment_ref,
            "amount": data.amount,
            "currency": "TZS",
            "payment_method": PaymentMethod.MOMO.value,
            "service_type": data.service_type.value,
            "description": data.description,
            "reference_id": data.reference_id,
            "client_phone": data.phone_number,
            "status": PaymentStatus.PROCESSING.value,
            "gateway_reference": f"MOMO-{uuid.uuid4().hex[:8].upper()}",
            "created_at": now,
            "updated_at": now
        }
        
        await db.payments.insert_one(payment)
        
        # Simulate push notification sent
        return {
            "payment_id": payment_id,
            "payment_reference": payment_ref,
            "status": "processing",
            "message": f"[MOCKED] USSD push sent to {data.phone_number}",
            "simulation_note": "In production, client would receive a USSD prompt on their phone",
            "ussd_preview": f"TLS Payment Request\nAmount: TZS {data.amount:,.0f}\nRef: {payment_ref}\n1. Confirm\n2. Cancel",
            "expires_in": 120  # seconds
        }
    
    @payment_router.post("/simulate-complete/{payment_id}")
    async def simulate_payment_complete(payment_id: str, user: dict = Depends(get_current_user)):
        """Simulate payment completion (FOR TESTING ONLY)"""
        payment = await db.payments.find_one({"id": payment_id, "advocate_id": user["id"]})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        if payment["status"] == PaymentStatus.COMPLETED.value:
            raise HTTPException(status_code=400, detail="Payment already completed")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Simulate successful completion
        gateway_result = simulate_payment_processing(PaymentMethod(payment["payment_method"]))
        
        if gateway_result["success"]:
            await db.payments.update_one(
                {"id": payment_id},
                {"$set": {
                    "status": PaymentStatus.COMPLETED.value,
                    "gateway_reference": gateway_result["gateway_reference"],
                    "gateway_response": gateway_result,
                    "completed_at": now,
                    "updated_at": now
                }}
            )
            
            # Update invoice if linked
            if payment.get("reference_id"):
                await db.invoices.update_one(
                    {"id": payment["reference_id"]},
                    {"$set": {
                        "status": "paid",
                        "payment_id": payment_id,
                        "payment_date": now,
                        "payment_method": payment["payment_method"]
                    }}
                )
            
            # Update advocate earnings
            await db.advocates.update_one(
                {"id": user["id"]},
                {"$inc": {"total_earnings": payment["amount"]}}
            )
            
            # Record in revenue tracking
            await db.revenue_records.insert_one({
                "id": str(uuid.uuid4()),
                "advocate_id": user["id"],
                "payment_id": payment_id,
                "amount": payment["amount"],
                "service_type": payment["service_type"],
                "payment_method": payment["payment_method"],
                "recorded_at": now
            })
            
            return {
                "success": True,
                "payment_id": payment_id,
                "status": PaymentStatus.COMPLETED.value,
                "gateway_reference": gateway_result["gateway_reference"],
                "message": "Payment completed successfully"
            }
        else:
            await db.payments.update_one(
                {"id": payment_id},
                {"$set": {
                    "status": PaymentStatus.FAILED.value,
                    "gateway_response": gateway_result,
                    "updated_at": now
                }}
            )
            
            return {
                "success": False,
                "payment_id": payment_id,
                "status": PaymentStatus.FAILED.value,
                "message": gateway_result["message"]
            }
    
    @payment_router.get("/status/{payment_id}")
    async def get_payment_status(payment_id: str, user: dict = Depends(get_current_user)):
        """Get payment status"""
        payment = await db.payments.find_one(
            {"id": payment_id, "advocate_id": user["id"]},
            {"_id": 0}
        )
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        return payment
    
    @payment_router.get("/history")
    async def get_payment_history(
        status: Optional[str] = None,
        service_type: Optional[str] = None,
        payment_method: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = Query(default=50, le=200),
        user: dict = Depends(get_current_user)
    ):
        """Get payment history with filters"""
        query = {"advocate_id": user["id"]}
        
        if status:
            query["status"] = status
        if service_type:
            query["service_type"] = service_type
        if payment_method:
            query["payment_method"] = payment_method
        if start_date and end_date:
            query["created_at"] = {"$gte": start_date, "$lte": end_date}
        
        payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
        
        # Calculate totals
        total_amount = sum(p["amount"] for p in payments if p["status"] == "completed")
        pending_amount = sum(p["amount"] for p in payments if p["status"] in ["pending", "processing"])
        
        return {
            "payments": payments,
            "total": len(payments),
            "total_completed": total_amount,
            "total_pending": pending_amount,
            "currency": "TZS"
        }
    
    # ===================== REVENUE ANALYTICS =====================
    
    @payment_router.get("/revenue/summary")
    async def get_revenue_summary(user: dict = Depends(get_current_user)):
        """Get revenue summary by service type"""
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Revenue by service type (all time)
        service_pipeline = [
            {"$match": {"advocate_id": user["id"], "status": "completed"}},
            {"$group": {
                "_id": "$service_type",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }}
        ]
        by_service = await db.payments.aggregate(service_pipeline).to_list(20)
        
        # Revenue by payment method
        method_pipeline = [
            {"$match": {"advocate_id": user["id"], "status": "completed"}},
            {"$group": {
                "_id": "$payment_method",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }}
        ]
        by_method = await db.payments.aggregate(method_pipeline).to_list(10)
        
        # Monthly revenue
        monthly_payments = await db.payments.find({
            "advocate_id": user["id"],
            "status": "completed",
            "completed_at": {"$gte": month_start.isoformat()}
        }, {"amount": 1}).to_list(1000)
        monthly_revenue = sum(p["amount"] for p in monthly_payments)
        
        # Yearly revenue
        yearly_payments = await db.payments.find({
            "advocate_id": user["id"],
            "status": "completed",
            "completed_at": {"$gte": year_start.isoformat()}
        }, {"amount": 1}).to_list(10000)
        yearly_revenue = sum(p["amount"] for p in yearly_payments)
        
        # Total revenue
        total_pipeline = [
            {"$match": {"advocate_id": user["id"], "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]
        total_result = await db.payments.aggregate(total_pipeline).to_list(1)
        total_revenue = total_result[0]["total"] if total_result else 0
        total_transactions = total_result[0]["count"] if total_result else 0
        
        return {
            "total_revenue": total_revenue,
            "monthly_revenue": monthly_revenue,
            "yearly_revenue": yearly_revenue,
            "total_transactions": total_transactions,
            "currency": "TZS",
            "by_service": {item["_id"]: {"total": item["total"], "count": item["count"]} for item in by_service},
            "by_method": {item["_id"]: {"total": item["total"], "count": item["count"]} for item in by_method}
        }
    
    @payment_router.get("/revenue/monthly")
    async def get_monthly_revenue(
        months: int = Query(default=12, le=24),
        user: dict = Depends(get_current_user)
    ):
        """Get monthly revenue breakdown"""
        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=months * 30)).isoformat()
        
        payments = await db.payments.find({
            "advocate_id": user["id"],
            "status": "completed",
            "completed_at": {"$gte": start_date}
        }, {"amount": 1, "completed_at": 1, "service_type": 1, "_id": 0}).to_list(10000)
        
        # Group by month
        monthly_data = {}
        for p in payments:
            if p.get("completed_at"):
                month_key = p["completed_at"][:7]  # YYYY-MM
                if month_key not in monthly_data:
                    monthly_data[month_key] = {"total": 0, "by_service": {}}
                monthly_data[month_key]["total"] += p["amount"]
                
                service = p.get("service_type", "other")
                if service not in monthly_data[month_key]["by_service"]:
                    monthly_data[month_key]["by_service"][service] = 0
                monthly_data[month_key]["by_service"][service] += p["amount"]
        
        return {
            "monthly_data": monthly_data,
            "currency": "TZS"
        }
    
    # ===================== REFUNDS =====================
    
    @payment_router.post("/refund")
    async def initiate_refund(data: RefundRequest, user: dict = Depends(get_current_user)):
        """Initiate a refund (MOCKED)"""
        payment = await db.payments.find_one({"id": data.payment_id, "advocate_id": user["id"]})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        if payment["status"] != PaymentStatus.COMPLETED.value:
            raise HTTPException(status_code=400, detail="Can only refund completed payments")
        
        refund_amount = data.amount or payment["amount"]
        if refund_amount > payment["amount"]:
            raise HTTPException(status_code=400, detail="Refund amount exceeds payment amount")
        
        now = datetime.now(timezone.utc).isoformat()
        refund_id = str(uuid.uuid4())
        
        # Create refund record
        refund = {
            "id": refund_id,
            "payment_id": data.payment_id,
            "advocate_id": user["id"],
            "amount": refund_amount,
            "reason": data.reason,
            "status": "completed",  # Mocked as instant
            "created_at": now
        }
        
        await db.refunds.insert_one(refund)
        
        # Update payment status
        new_status = PaymentStatus.REFUNDED.value if refund_amount == payment["amount"] else "partially_refunded"
        await db.payments.update_one(
            {"id": data.payment_id},
            {"$set": {"status": new_status, "refunded_amount": refund_amount, "updated_at": now}}
        )
        
        return {
            "refund_id": refund_id,
            "payment_id": data.payment_id,
            "refund_amount": refund_amount,
            "status": "completed",
            "message": "[MOCKED] Refund processed successfully"
        }
    
    # ===================== QR CODE GENERATION =====================
    
    @payment_router.post("/generate-qr")
    async def generate_payment_qr(
        amount: float,
        description: str,
        service_type: str = "other",
        user: dict = Depends(get_current_user)
    ):
        """Generate a QR code for quick payments"""
        payment_ref = generate_payment_reference()
        
        qr_payload = {
            "type": "kwikpay",
            "ref": payment_ref,
            "amount": amount,
            "currency": "TZS",
            "advocate": user.get("full_name", ""),
            "advocate_id": user["id"],
            "desc": description
        }
        
        qr_data = f"kwikpay://pay?ref={payment_ref}&amount={amount}&to={user['id']}"
        qr_code_base64 = generate_qr_code(qr_data)
        
        # Store pending QR payment
        now = datetime.now(timezone.utc).isoformat()
        await db.payments.insert_one({
            "id": str(uuid.uuid4()),
            "advocate_id": user["id"],
            "payment_reference": payment_ref,
            "amount": amount,
            "currency": "TZS",
            "payment_method": PaymentMethod.QR_CODE.value,
            "service_type": service_type,
            "description": description,
            "status": PaymentStatus.PENDING.value,
            "qr_data": qr_data,
            "created_at": now,
            "updated_at": now,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        })
        
        return {
            "payment_reference": payment_ref,
            "qr_code": qr_code_base64,
            "qr_data": qr_data,
            "amount": amount,
            "currency": "TZS",
            "expires_in": "24 hours",
            "instructions": "Display this QR code to your client for scanning with their KwikPay app"
        }
    
    return payment_router
