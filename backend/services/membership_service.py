"""
Membership Billing Service
Handles TLS membership billing policy, status computation, and enforcement.

Features:
- Central billing policy configuration (IDC control)
- Dynamic membership status computation
- Enforcement modes: warn_only, block_stamping, block_all
- Grace period handling
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import uuid


class MembershipService:
    """Service for managing membership billing and enforcement."""
    
    POLICY_ID = "TLS_MEMBERSHIP_POLICY"
    
    def __init__(self, db):
        self.db = db
    
    async def get_policy(self) -> Dict[str, Any]:
        """Get the current membership billing policy."""
        policy = await self.db.membership_billing_settings.find_one(
            {"_id": self.POLICY_ID},
            {"_id": 0}
        )
        
        if not policy:
            # Return default disabled policy
            return {
                "enabled": False,
                "mode": "fixed",
                "period": "annual",
                "currency": "TZS",
                "subscription_tier_id": None,
                "fixed_price": 50000,
                "grace_days": 7,
                "enforcement": "warn_only",
                "updated_by": None,
                "updated_at": None
            }
        
        return policy
    
    async def update_policy(self, updates: Dict[str, Any], admin_id: str) -> Dict[str, Any]:
        """Update the membership billing policy."""
        now = datetime.now(timezone.utc).isoformat()
        
        updates["updated_by"] = admin_id
        updates["updated_at"] = now
        
        # Upsert the policy document
        await self.db.membership_billing_settings.update_one(
            {"_id": self.POLICY_ID},
            {"$set": updates},
            upsert=True
        )
        
        # Get updated policy
        policy = await self.get_policy()
        
        return policy
    
    async def get_member_status(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute the membership status for a user.
        Returns whether they can use the platform based on billing policy.
        """
        policy = await self.get_policy()
        
        # If billing is disabled, everyone has full access
        if not policy.get("enabled", False):
            return {
                "billing_enabled": False,
                "is_paid": True,
                "is_active": True,
                "is_blocked": False,
                "enforcement": "none",
                "message": "Membership billing is not enabled",
                "expires_at": None,
                "grace_until": None,
                "days_remaining": None,
                "policy": policy
            }
        
        user_id = user.get("id")
        
        # Look up member's payment status
        # Check membership_payments or verification_transactions for membership fees
        payment_record = await self._get_latest_membership_payment(user_id)
        
        now = datetime.now(timezone.utc)
        grace_days = policy.get("grace_days", 7)
        enforcement = policy.get("enforcement", "warn_only")
        period = policy.get("period", "annual")
        
        # Compute expiry based on payment record
        if payment_record and payment_record.get("expires_at"):
            expires_at = payment_record["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            
            grace_until = expires_at + timedelta(days=grace_days)
            is_paid = now < expires_at
            is_in_grace = not is_paid and now < grace_until
            is_active = is_paid or is_in_grace
            
            days_remaining = (expires_at - now).days if is_paid else (grace_until - now).days if is_in_grace else 0
        else:
            # No payment record - check if user has a grace period from registration
            # For new members, give them a trial/grace period
            user_created = user.get("created_at")
            if user_created:
                if isinstance(user_created, str):
                    user_created = datetime.fromisoformat(user_created.replace("Z", "+00:00"))
                trial_until = user_created + timedelta(days=30)  # 30-day trial for new members
                
                is_paid = False
                is_in_grace = now < trial_until
                is_active = is_in_grace
                expires_at = None
                grace_until = trial_until
                days_remaining = (trial_until - now).days if is_in_grace else 0
            else:
                is_paid = False
                is_in_grace = False
                is_active = False
                expires_at = None
                grace_until = None
                days_remaining = 0
        
        # Determine if blocked based on enforcement
        is_blocked = False
        block_message = None
        
        if not is_active:
            if enforcement == "block_stamping":
                is_blocked = True
                block_message = "Your TLS membership has expired. Document stamping is disabled until you renew."
            elif enforcement == "block_all":
                is_blocked = True
                block_message = "Your TLS membership has expired. Access is restricted until you renew."
            else:  # warn_only
                is_blocked = False
                block_message = "Your TLS membership has expired. Please renew to continue using all features."
        elif is_in_grace and not is_paid:
            block_message = f"Your TLS membership has expired. You have {days_remaining} days remaining in your grace period."
        
        return {
            "billing_enabled": True,
            "is_paid": is_paid,
            "is_active": is_active,
            "is_in_grace": is_in_grace if 'is_in_grace' in dir() else False,
            "is_blocked": is_blocked,
            "enforcement": enforcement,
            "message": block_message,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "grace_until": grace_until.isoformat() if grace_until else None,
            "days_remaining": days_remaining,
            "mode": policy.get("mode"),
            "period": period,
            "fixed_price": policy.get("fixed_price") if policy.get("mode") == "fixed" else None,
            "currency": policy.get("currency", "TZS")
        }
    
    async def _get_latest_membership_payment(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get the latest membership payment for a user."""
        # Check membership_payments collection first
        payment = await self.db.membership_payments.find_one(
            {"user_id": user_id, "status": "paid"},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        if payment:
            return payment
        
        # Fallback: check verification_transactions for membership type
        transaction = await self.db.verification_transactions.find_one(
            {"user_id": user_id, "type": "membership", "status": "completed"},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        return transaction
    
    async def check_enforcement(self, user: Dict[str, Any], action: str = "stamp") -> Dict[str, Any]:
        """
        Check if an action should be blocked based on membership status.
        Returns enforcement decision.
        
        Actions:
        - "stamp": Document stamping
        - "batch_stamp": Batch stamping
        - "practice": Practice management access
        - "full": Full platform access
        """
        status = await self.get_member_status(user)
        
        if not status.get("billing_enabled"):
            return {"allowed": True, "reason": None}
        
        if status.get("is_active"):
            return {"allowed": True, "reason": None}
        
        enforcement = status.get("enforcement", "warn_only")
        
        # Define what's blocked per enforcement level
        if enforcement == "warn_only":
            return {"allowed": True, "reason": status.get("message"), "warn": True}
        
        if enforcement == "block_stamping":
            if action in ["stamp", "batch_stamp"]:
                return {"allowed": False, "reason": status.get("message"), "code": "MEMBERSHIP_REQUIRED"}
            return {"allowed": True, "reason": status.get("message"), "warn": True}
        
        if enforcement == "block_all":
            if action in ["stamp", "batch_stamp", "practice", "full"]:
                return {"allowed": False, "reason": status.get("message"), "code": "MEMBERSHIP_REQUIRED"}
            return {"allowed": True, "reason": status.get("message"), "warn": True}
        
        return {"allowed": True, "reason": None}
    
    async def create_membership_payment(
        self, 
        user_id: str, 
        amount: float, 
        period: str,
        payment_method: str = "manual",
        reference: str = None
    ) -> Dict[str, Any]:
        """Create a membership payment record."""
        policy = await self.get_policy()
        now = datetime.now(timezone.utc)
        
        # Calculate expiry based on period
        if period == "monthly":
            expires_at = now + timedelta(days=30)
        elif period == "annual":
            expires_at = now + timedelta(days=365)
        else:
            expires_at = now + timedelta(days=365)  # Default to annual
        
        payment = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": amount,
            "currency": policy.get("currency", "TZS"),
            "period": period,
            "status": "paid",
            "payment_method": payment_method,
            "reference": reference,
            "expires_at": expires_at.isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await self.db.membership_payments.insert_one(payment)
        payment.pop("_id", None)
        
        return payment


# Singleton factory
_membership_service = None

def get_membership_service(db):
    global _membership_service
    if _membership_service is None:
        _membership_service = MembershipService(db)
    return _membership_service
