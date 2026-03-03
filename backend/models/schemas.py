"""
Pydantic Models for TLS Practice Management Suite
All data models used across the application
"""
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime


# =============== AUTH MODELS ===============

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdvocateRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    roll_number: str
    phone: str
    region: str = "Dar es Salaam"


class AdvocateLogin(BaseModel):
    email: EmailStr
    password: str


# =============== PROFILE MODELS ===============

class AdvocateProfile(BaseModel):
    id: str
    email: str
    full_name: str
    roll_number: str
    tls_member_number: Optional[str] = None
    phone: str
    region: str
    court_jurisdiction: str = "High Court of Tanzania"
    firm_affiliation: Optional[str] = None
    admission_year: Optional[int] = None
    practicing_status: str = "Active"
    profile_photo: Optional[str] = None
    role: str = "advocate"
    verified: bool = False
    total_earnings: float = 0.0
    notification_preferences: Optional[dict] = None
    created_at: str
    updated_at: str


class AdvocateUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    region: Optional[str] = None
    court_jurisdiction: Optional[str] = None
    firm_affiliation: Optional[str] = None
    profile_photo: Optional[str] = None
    notification_preferences: Optional[dict] = None


# =============== NOTIFICATION MODELS ===============

# Default notification preferences - all ON by default
DEFAULT_NOTIFICATION_PREFERENCES = {
    "stamp_created": True,
    "stamp_downloaded": True,
    "stamp_verified": True,
    "verification_failed": True,
    "stamp_expiring_30days": True,
    "stamp_expiring_7days": True,
    "stamp_expiring_1day": True,
    "stamp_expired": True,
    "login_new_device": True,
    "password_changed": True,
    "profile_updated": True,
    "subscription_expiring": True,
    "payment_received": True,
    "payment_failed": True,
    "system_maintenance": True,
    "new_features": True,
    "security_alerts": True,
    "sync_completed": True,
    "sync_failed": True,
}


class NotificationPreferencesUpdate(BaseModel):
    stamp_created: Optional[bool] = None
    stamp_downloaded: Optional[bool] = None
    stamp_verified: Optional[bool] = None
    verification_failed: Optional[bool] = None
    stamp_expiring_30days: Optional[bool] = None
    stamp_expiring_7days: Optional[bool] = None
    stamp_expiring_1day: Optional[bool] = None
    stamp_expired: Optional[bool] = None
    login_new_device: Optional[bool] = None
    password_changed: Optional[bool] = None
    profile_updated: Optional[bool] = None
    subscription_expiring: Optional[bool] = None
    payment_received: Optional[bool] = None
    payment_failed: Optional[bool] = None
    system_maintenance: Optional[bool] = None
    new_features: Optional[bool] = None
    security_alerts: Optional[bool] = None
    sync_completed: Optional[bool] = None
    sync_failed: Optional[bool] = None


# =============== STAMP MODELS ===============

class StampType(BaseModel):
    id: str
    name: str
    description: str
    price: float
    currency: str = "TZS"


class DocumentStamp(BaseModel):
    id: str
    stamp_id: str
    advocate_id: str
    advocate_name: str
    advocate_roll_number: str
    document_name: str
    document_hash: str
    document_pages: int
    stamp_type: str
    stamp_position: dict
    hash_value: str
    qr_code_data: str
    status: str
    verification_count: int = 0
    total_earnings: float = 0.0
    created_at: str
    expires_at: str


class BatchStampPosition(BaseModel):
    anchor: str = "bottom_right"
    offset_x_pt: float = 12
    offset_y_pt: float = 12
    page_mode: str = "first"


class BatchStampResult(BaseModel):
    filename: str
    stamp_id: Optional[str] = None
    doc_hash: Optional[str] = None
    issued_at: Optional[str] = None
    pages_stamped: int = 0
    status: str
    error: Optional[str] = None


class BatchStampResponse(BaseModel):
    batch_id: str
    total_files: int
    success_count: int
    failed_count: int
    results: List[BatchStampResult]
    download_url: str


# =============== ORDER MODELS ===============

class StampOrderCreate(BaseModel):
    stamp_type_id: str
    quantity: int = 1
    customization: dict = {}
    delivery_address: str


class StampOrder(BaseModel):
    id: str
    advocate_id: str
    stamp_type_id: str
    stamp_type_name: str
    quantity: int
    customization: dict
    delivery_address: str
    total_price: float
    currency: str
    status: str
    payment_status: str
    payment_method: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: str
    updated_at: str


class PhysicalOrderItem(BaseModel):
    product_type: str
    stamp_type: Optional[str] = None
    format: Optional[str] = None
    name: str
    quantity: int
    unit_price: float
    total_price: float


class PhysicalOrderCreate(BaseModel):
    items: List[PhysicalOrderItem]
    delivery_address: str
    special_instructions: Optional[str] = ""
    customization: dict = {}


class PhysicalOrder(BaseModel):
    id: str
    advocate_id: str
    advocate_name: str
    items: List[dict]
    delivery_address: str
    special_instructions: str
    customization: dict
    total_price: float
    currency: str
    status: str
    payment_status: str
    payment_method: Optional[str] = None
    tracking_number: Optional[str] = None
    status_history: List[dict] = []
    notes: List[dict] = []
    created_at: str
    updated_at: str


# =============== VERIFICATION MODELS ===============

class VerificationResult(BaseModel):
    valid: bool
    stamp_id: Optional[str] = None
    advocate_name: Optional[str] = None
    advocate_roll_number: Optional[str] = None
    advocate_tls_number: Optional[str] = None
    advocate_status: Optional[str] = None
    advocate_photo: Optional[str] = None
    stamp_status: Optional[str] = None
    stamp_type: Optional[str] = None
    document_name: Optional[str] = None
    document_type: Optional[str] = None
    description: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_org: Optional[str] = None
    document_hash: Optional[str] = None
    created_at: Optional[str] = None
    expires_at: Optional[str] = None
    verification_count: Optional[int] = None
    warning: Optional[str] = None
    message: str
    crypto_verified: Optional[bool] = None
    crypto_signature_alg: Optional[str] = None
    crypto_key_id: Optional[str] = None
    crypto_message: Optional[str] = None


class VerificationPaymentStatus(BaseModel):
    verification_id: str
    stamp_id: str
    status: str
    fee_amount: float
    currency: str = "TZS"
    expires_at: str
    basic_info: dict
    full_info: Optional[dict] = None


class VerificationTier(BaseModel):
    id: str
    name: str
    credits: int
    price_per_unit: int
    total_price: int
    description: Optional[str] = ""
    popular: Optional[bool] = False
    active: Optional[bool] = True


class VerificationTierCreate(BaseModel):
    name: str
    credits: int
    price_per_unit: int
    description: Optional[str] = ""
    popular: Optional[bool] = False


# =============== PAYMENT MODELS ===============

class PaymentInitiate(BaseModel):
    order_id: str
    payment_method: str
    provider: str
    phone_number: Optional[str] = None


class CreditTopUp(BaseModel):
    tier_id: str
    payment_method: str = "bank_transfer"


# =============== SUBSCRIPTION MODELS ===============

SUBSCRIPTION_PACKAGES = {
    "monthly": {"name": "Monthly", "duration_days": 30, "price": 30000, "savings": 0},
    "quarterly": {"name": "Quarterly", "duration_days": 90, "price": 80000, "savings": 11},
    "semi_annual": {"name": "Semi-Annual", "duration_days": 180, "price": 155000, "savings": 14},
    "annual": {"name": "Annual", "duration_days": 365, "price": 300000, "savings": 17}
}

TRIAL_PERIOD_DAYS = 30
TRIAL_STAMP_LIMIT = 5
GRACE_PERIOD_DAYS = 7


class SubscriptionCreate(BaseModel):
    package: str
    payment_method: str = "mobile_money"


class SubscriptionStatus(BaseModel):
    id: str
    advocate_id: str
    package: str
    status: str
    is_trial: bool
    trial_started_at: Optional[str] = None
    trial_ends_at: Optional[str] = None
    subscription_started_at: Optional[str] = None
    subscription_ends_at: Optional[str] = None
    grace_ends_at: Optional[str] = None
    can_earn_revenue: bool
    total_stamps_created: int
    created_at: str


# =============== INSTITUTIONAL MODELS ===============

class InstitutionalAccountCreate(BaseModel):
    name: str
    organization_type: str = "bank"
    contact_name: str
    contact_email: EmailStr
    contact_phone: str
    billing_address: str
    billing_period: str = "monthly"


class InstitutionalAccount(BaseModel):
    id: str
    name: str
    organization_type: str
    api_key: str
    contact_name: str
    contact_email: str
    contact_phone: str
    billing_address: str
    billing_period: str
    verification_count: int = 0
    total_verifications: int = 0
    last_billed_at: Optional[str] = None
    status: str = "active"
    created_at: str
    updated_at: str


class InstitutionalSubscription(BaseModel):
    id: str
    institution_name: str
    organization_type: str
    api_key: str
    package: str
    status: str
    verification_limit: int
    verifications_used: int
    subscription_ends_at: str
    contact_email: str
    contact_phone: str


# =============== ADMIN MODELS ===============

class SystemSettings(BaseModel):
    verification_fee_fixed: float = 500.0
    verification_fee_percentage: float = 0.0
    advocate_revenue_share: float = 30.0
    currency: str = "TZS"
    official_stamp_price: float = 5000.0
    commissioner_stamp_price: float = 7500.0
    notary_stamp_price: float = 10000.0


class AdminStats(BaseModel):
    total_advocates: int
    active_advocates: int
    suspended_advocates: int
    total_stamps_issued: int
    active_stamps: int
    total_orders: int
    pending_orders: int
    total_revenue: float
    monthly_revenue: float
    total_verifications: int
    fraud_alerts: int


# =============== STAMP LEDGER MODELS ===============

class StampEventType(str):
    ISSUED = "STAMP_ISSUED"
    VERIFIED = "STAMP_VERIFIED"
    REVOKED = "STAMP_REVOKED"
    EXPIRED = "STAMP_EXPIRED"


class StampEvent(BaseModel):
    id: str
    stamp_id: str
    event_type: str
    actor_id: Optional[str] = None
    actor_type: str
    created_at: str
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[dict] = None


class StampLedgerItem(BaseModel):
    stamp_id: str
    advocate_id: str
    advocate_name: str
    issued_at: str
    status: str
    doc_hash: str
    doc_filename: Optional[str] = None
    document_type: Optional[str] = None
    recipient_name: Optional[str] = None
    border_color: Optional[str] = None
    pages_stamped: Optional[int] = None
    verification_count: int = 0
    expires_at: Optional[str] = None
    revoked_at: Optional[str] = None
    revoke_reason: Optional[str] = None


class StampLedgerDetail(StampLedgerItem):
    advocate_roll_number: Optional[str] = None
    advocate_tls_number: Optional[str] = None
    recipient_org: Optional[str] = None
    description: Optional[str] = None
    verification_url: str
    qr_code_data: Optional[str] = None
    hash_value: Optional[str] = None
    total_earnings: float = 0.0
    batch_id: Optional[str] = None


class StampLedgerListResponse(BaseModel):
    items: List[StampLedgerItem]
    page: int
    page_size: int
    total: int


class RevokeStampRequest(BaseModel):
    reason: str


# =============== CONSTANTS ===============

# Public Verification Pricing
PUBLIC_VERIFICATION_FEE = 50000  # TZS per single verification

# Default Verification Tiers
DEFAULT_VERIFICATION_TIERS = [
    {"id": "basic", "name": "Basic", "credits": 10, "price_per_unit": 25000, "total_price": 250000, "description": "Save 50% vs public rate", "savings_percent": 50},
    {"id": "standard", "name": "Standard", "credits": 50, "price_per_unit": 20000, "total_price": 1000000, "description": "Save 60% vs public rate", "popular": True, "savings_percent": 60},
    {"id": "professional", "name": "Professional", "credits": 200, "price_per_unit": 17500, "total_price": 3500000, "description": "Save 65% vs public rate", "savings_percent": 65},
    {"id": "enterprise", "name": "Enterprise", "credits": 500, "price_per_unit": 15000, "total_price": 7500000, "description": "Save 70% vs public rate", "savings_percent": 70}
]

MINIMUM_PRICE_PER_VERIFICATION = 15000  # Floor price in TZS
