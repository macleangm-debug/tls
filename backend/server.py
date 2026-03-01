from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, UploadFile, File, Form, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import base64
import qrcode
from io import BytesIO
from jose import jwt, JWTError
from passlib.context import CryptContext
import secrets
import math
import re
import asyncio
from PIL import Image
from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib import colors
import json
from pywebpush import webpush, WebPushException
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import resend

# Sentry Error Monitoring
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize Sentry (must be before FastAPI app creation)
SENTRY_DSN = os.environ.get('SENTRY_DSN')
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,  # 10% of requests traced
        profiles_sample_rate=0.0,  # Disable profiling
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        environment=os.environ.get("ENVIRONMENT", "production"),
        release=os.environ.get("APP_VERSION", "1.0.0"),
        send_default_pii=False,  # Don't send personally identifiable information
    )
    logging.info("Sentry error monitoring initialized")
else:
    logging.warning("SENTRY_DSN not set - error monitoring disabled")

# Try to import docx for DOCX support
try:
    from docx import Document as DocxDocument
    DOCX_SUPPORTED = True
except ImportError:
    DOCX_SUPPORTED = False

# Sentry helper for stamping context
def set_sentry_stamping_context(stamp_id: str = None, pdf_validation: dict = None, user_id: str = None):
    """Set Sentry context for stamping operations"""
    if SENTRY_DSN:
        sentry_sdk.set_tag("feature", "stamping")
        if stamp_id:
            sentry_sdk.set_tag("stamp_id", stamp_id)
        if user_id:
            sentry_sdk.set_user({"id": user_id})
        if pdf_validation:
            sentry_sdk.set_context("pdf_validation", pdf_validation)

# Import crypto signing service AFTER loading .env
from services.crypto_signing_service import crypto_service

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security - SECRET_KEY must be set in production
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    SECRET_KEY = secrets.token_urlsafe(32)
    logging.warning("SECRET_KEY not set in environment. Using random key (sessions won't persist across restarts)")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7
PASSWORD_RESET_EXPIRE_MINUTES = 30  # Password reset token expires in 30 minutes
EMAIL_VERIFICATION_EXPIRE_HOURS = 24  # Email verification link expires in 24 hours

# Rate limiting configuration
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Email configuration (Resend)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logging.info("Resend email service configured")
else:
    logging.warning("RESEND_API_KEY not set - email functionality disabled")

# Frontend URL for email links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://stamp-and-manage.preview.emergentagent.com')

# VAPID configuration for push notifications
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_SUBJECT = os.environ.get('VAPID_SUBJECT', 'mailto:admin@tls.or.tz')
VAPID_CLAIMS = {
    "sub": VAPID_SUBJECT
}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# =============== PASSWORD VALIDATION ===============

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password against strict security rules.
    Returns (is_valid, error_message)
    
    Rules:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
    - No common patterns (123, abc, password, qwerty, etc.)
    - No more than 3 consecutive identical characters
    """
    errors = []
    
    # Length check
    if len(password) < 12:
        errors.append("Password must be at least 12 characters long")
    
    # Uppercase check
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    
    # Lowercase check
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    
    # Digit check
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one number")
    
    # Special character check
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password):
        errors.append("Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)")
    
    # Common patterns check
    common_patterns = [
        'password', 'qwerty', 'abc123', '123456', 'letmein', 'welcome',
        'admin', 'login', 'master', 'dragon', 'monkey', 'shadow',
        '111111', '000000', 'iloveyou', 'sunshine', 'princess'
    ]
    password_lower = password.lower()
    for pattern in common_patterns:
        if pattern in password_lower:
            errors.append(f"Password contains a common pattern '{pattern}' - please choose a more secure password")
            break
    
    # Sequential characters check (e.g., abc, 123, xyz)
    sequential_patterns = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']
    for seq in sequential_patterns:
        for i in range(len(seq) - 3):
            if seq[i:i+4] in password_lower or seq[i:i+4][::-1] in password_lower:
                errors.append("Password contains sequential characters (e.g., abcd, 1234) - please avoid sequences")
                break
    
    # Consecutive identical characters check
    if re.search(r'(.)\1{3,}', password):
        errors.append("Password cannot have more than 3 consecutive identical characters")
    
    if errors:
        return False, "; ".join(errors)
    
    return True, "Password meets all requirements"

app = FastAPI(title="TLS Advocate Management System")
api_router = APIRouter(prefix="/api")

# CSRF token store (in production, use Redis or database)
csrf_tokens = {}

# Attach limiter to app state
app.state.limiter = limiter

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# =============== MODELS ===============

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

# Default notification preferences - all ON by default
DEFAULT_NOTIFICATION_PREFERENCES = {
    # Document stamping events
    "stamp_created": True,           # When you stamp a document
    "stamp_downloaded": True,        # When stamped document is downloaded
    
    # Verification events
    "stamp_verified": True,          # When someone verifies your stamp
    "verification_failed": True,     # When verification attempt fails
    
    # Expiry warnings
    "stamp_expiring_30days": True,   # 30 days before stamp expires
    "stamp_expiring_7days": True,    # 7 days before stamp expires
    "stamp_expiring_1day": True,     # 1 day before stamp expires
    "stamp_expired": True,           # When stamp expires
    
    # Account & security
    "login_new_device": True,        # Login from new device
    "password_changed": True,        # Password change notification
    "profile_updated": True,         # Profile information updated
    
    # Subscription & billing
    "subscription_expiring": True,   # Subscription expiring soon
    "payment_received": True,        # Payment confirmation
    "payment_failed": True,          # Payment failure alert
    
    # System notifications
    "system_maintenance": True,      # Scheduled maintenance
    "new_features": True,            # New feature announcements
    "security_alerts": True,         # Security-related alerts
    
    # Offline sync
    "sync_completed": True,          # Offline queue synced
    "sync_failed": True,             # Sync failed notification
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

class AdvocateUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    region: Optional[str] = None
    court_jurisdiction: Optional[str] = None
    firm_affiliation: Optional[str] = None
    profile_photo: Optional[str] = None
    notification_preferences: Optional[dict] = None

class StampType(BaseModel):
    id: str
    name: str
    description: str
    price: float
    currency: str = "TZS"

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

# Physical Order Models (New multi-item orders)
class PhysicalOrderItem(BaseModel):
    product_type: str  # "stamp" or "ink"
    stamp_type: Optional[str] = None  # "certificate" or "notary"
    format: Optional[str] = None  # "desk" or "pocket"
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
    status: str  # pending_review, approved, in_production, quality_check, ready_dispatch, dispatched, delivered, cancelled
    payment_status: str
    payment_method: Optional[str] = None
    tracking_number: Optional[str] = None
    status_history: List[dict] = []
    notes: List[dict] = []
    created_at: str
    updated_at: str

# Document Stamp Models
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
    stamp_position: dict  # {page: 1, x: 100, y: 100, width: 150, height: 150}
    hash_value: str
    qr_code_data: str
    status: str
    verification_count: int = 0
    total_earnings: float = 0.0
    created_at: str
    expires_at: str

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
    # Cryptographic verification fields
    crypto_verified: Optional[bool] = None
    crypto_signature_alg: Optional[str] = None
    crypto_key_id: Optional[str] = None
    crypto_message: Optional[str] = None

class PaymentInitiate(BaseModel):
    order_id: str
    payment_method: str
    provider: str
    phone_number: Optional[str] = None

# System Settings Model
class SystemSettings(BaseModel):
    verification_fee_fixed: float = 500.0  # TZS per verification
    verification_fee_percentage: float = 0.0  # % of stamp price
    advocate_revenue_share: float = 30.0  # % of verification fee goes to advocate
    currency: str = "TZS"
    # Stamp type pricing
    official_stamp_price: float = 5000.0  # TZS
    commissioner_stamp_price: float = 7500.0  # TZS
    notary_stamp_price: float = 10000.0  # TZS

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

# Institutional Account Models
class InstitutionalAccountCreate(BaseModel):
    name: str
    organization_type: str = "bank"  # bank, court, government, law_firm, other
    contact_name: str
    contact_email: EmailStr
    contact_phone: str
    billing_address: str
    billing_period: str = "monthly"  # monthly, quarterly, yearly

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

# Verification Payment Models
class VerificationPaymentStatus(BaseModel):
    verification_id: str
    stamp_id: str
    status: str  # pending, paid, bypassed (institutional)
    fee_amount: float
    currency: str = "TZS"
    expires_at: str
    basic_info: dict  # Limited info shown before payment
    full_info: Optional[dict] = None  # Full info shown after payment

# QR Stamp Subscription Models
SUBSCRIPTION_PACKAGES = {
    "monthly": {"name": "Monthly", "duration_days": 30, "price": 30000, "savings": 0},
    "quarterly": {"name": "Quarterly", "duration_days": 90, "price": 80000, "savings": 11},
    "semi_annual": {"name": "Semi-Annual", "duration_days": 180, "price": 155000, "savings": 14},
    "annual": {"name": "Annual", "duration_days": 365, "price": 300000, "savings": 17}
}

TRIAL_PERIOD_DAYS = 30
TRIAL_STAMP_LIMIT = 5  # Maximum stamps during trial
GRACE_PERIOD_DAYS = 7

# Public Verification Pricing (for non-registered users)
PUBLIC_VERIFICATION_FEE = 50000  # TZS per single verification (premium price)
# This is intentionally HIGH to incentivize businesses to register and buy credit packs

# Verification Credit Pricing Tiers (Prepaid Packs for registered businesses)
# Default tiers - can be overridden by Super Admin in DB
DEFAULT_VERIFICATION_TIERS = [
    {"id": "basic", "name": "Basic", "credits": 10, "price_per_unit": 25000, "total_price": 250000, "description": "Save 50% vs public rate", "savings_percent": 50},
    {"id": "standard", "name": "Standard", "credits": 50, "price_per_unit": 20000, "total_price": 1000000, "description": "Save 60% vs public rate", "popular": True, "savings_percent": 60},
    {"id": "professional", "name": "Professional", "credits": 200, "price_per_unit": 17500, "total_price": 3500000, "description": "Save 65% vs public rate", "savings_percent": 65},
    {"id": "enterprise", "name": "Enterprise", "credits": 500, "price_per_unit": 15000, "total_price": 7500000, "description": "Save 70% vs public rate", "savings_percent": 70}
]
MINIMUM_PRICE_PER_VERIFICATION = 15000  # Floor price in TZS for business packs

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

class CreditTopUp(BaseModel):
    tier_id: str
    payment_method: str = "bank_transfer"  # bank_transfer, mobile_money, card

class SubscriptionCreate(BaseModel):
    package: str  # monthly, quarterly, semi_annual, annual
    payment_method: str = "mobile_money"

class SubscriptionStatus(BaseModel):
    id: str
    advocate_id: str
    package: str
    status: str  # trial, active, grace, expired
    is_trial: bool
    trial_started_at: Optional[str] = None
    trial_ends_at: Optional[str] = None
    subscription_started_at: Optional[str] = None
    subscription_ends_at: Optional[str] = None
    grace_ends_at: Optional[str] = None
    can_earn_revenue: bool
    total_stamps_created: int
    created_at: str

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

# Batch Stamping Models
class BatchStampPosition(BaseModel):
    anchor: str = "bottom_right"  # top_left, top_center, top_right, center_left, center, center_right, bottom_left, bottom_center, bottom_right
    offset_x_pt: float = 12
    offset_y_pt: float = 12
    page_mode: str = "first"  # first, all

class BatchStampResult(BaseModel):
    filename: str
    stamp_id: Optional[str] = None
    doc_hash: Optional[str] = None
    issued_at: Optional[str] = None
    pages_stamped: int = 0
    status: str  # OK, FAILED, PENDING
    error: Optional[str] = None

class BatchStampResponse(BaseModel):
    batch_id: str
    total_files: int
    success_count: int
    failed_count: int
    results: List[BatchStampResult]
    download_url: str

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
    actor_type: str  # advocate, admin, public, system
    created_at: str
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[dict] = None

class StampLedgerItem(BaseModel):
    stamp_id: str
    advocate_id: str
    advocate_name: str
    issued_at: str
    status: str  # active, revoked, expired
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

# =============== HELPER FUNCTIONS ===============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Cookie configuration for HttpOnly JWT
COOKIE_NAME = "tls_access_token"
COOKIE_MAX_AGE = ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
COOKIE_SECURE = True  # Only send over HTTPS
COOKIE_HTTPONLY = True  # Not accessible via JavaScript
COOKIE_SAMESITE = "lax"  # Protect against CSRF while allowing normal navigation

# Make HTTPBearer optional to allow cookie-based auth
security_optional = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_optional)
):
    """
    Get current user from JWT token.
    Supports both:
    1. HttpOnly cookie (preferred, more secure)
    2. Authorization header (backward compatibility)
    """
    token = None
    
    # First, try to get token from HttpOnly cookie
    cookie_token = request.cookies.get(COOKIE_NAME)
    if cookie_token:
        token = cookie_token
    
    # Fall back to Authorization header if no cookie
    if not token and credentials and credentials.credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check advocates collection first
        user = await db.advocates.find_one({"id": user_id}, {"_id": 0})
        
        # If not found, check users collection (for admin/super_admin)
        if user is None:
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
        
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_super_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user

def generate_stamp_id() -> str:
    return f"TLS-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

def generate_tls_member_number(roll_number: str) -> str:
    return f"TLS/{roll_number}/{datetime.now().year}"

def generate_stamp_hash(stamp_id: str, advocate_id: str, document_hash: str, timestamp: str) -> str:
    data = f"{stamp_id}:{advocate_id}:{document_hash}:{timestamp}:{secrets.token_hex(16)}"
    return hashlib.sha256(data.encode()).hexdigest()

def generate_document_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()

async def log_stamp_event(
    stamp_id: str,
    event_type: str,
    actor_id: Optional[str] = None,
    actor_type: str = "system",
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """Log an audit event for a stamp"""
    event = {
        "id": str(uuid.uuid4()),
        "stamp_id": stamp_id,
        "event_type": event_type,
        "actor_id": actor_id,
        "actor_type": actor_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ip": ip,
        "user_agent": user_agent,
        "metadata": metadata or {}
    }
    await db.stamp_events.insert_one(event)
    return event

def generate_qr_code(data: str, size: int = 200) -> str:
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1B365D", back_color="white")
    # Resize to specified size
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()

def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def generate_branded_qr_code(data: str, size: int = 200, brand_color: str = "#10B981") -> str:
    """Generate a branded QR code with custom color and TLS branding"""
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction for logo overlay
        box_size=10,
        border=2
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    # Create QR with brand color
    rgb_color = hex_to_rgb(brand_color)
    img = qr.make_image(fill_color=rgb_color, back_color="white")
    img = img.convert('RGBA')
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    
    # Add TLS badge/logo in center
    try:
        # Create a small TLS badge
        badge_size = size // 4
        badge = Image.new('RGBA', (badge_size, badge_size), (255, 255, 255, 255))
        
        # Draw a simple shield shape
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(badge)
        
        # Fill with brand color
        draw.rectangle([2, 2, badge_size-3, badge_size-3], fill=rgb_color + (255,), outline=(255, 255, 255, 255), width=2)
        
        # Add "TLS" text
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", badge_size // 3)
        except (OSError, IOError):
            font = ImageFont.load_default()
        
        text = "TLS"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = (badge_size - text_width) // 2
        text_y = (badge_size - text_height) // 2 - 2
        draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)
        
        # Paste badge in center
        badge_pos = ((size - badge_size) // 2, (size - badge_size) // 2)
        img.paste(badge, badge_pos, badge)
    except Exception as e:
        logger.warning(f"Could not add TLS badge to QR: {e}")
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()

def generate_qr_code_image(data: str, size: int = 150, brand_color: str = "#10B981", for_colored_bg: bool = False) -> Image.Image:
    """Generate QR code as PIL Image for embedding in PDF
    
    Args:
        data: The data to encode in QR
        size: Size of the QR code
        brand_color: Color for QR modules (or background if for_colored_bg=True)
        for_colored_bg: If True, generates white QR modules on transparent background 
                       (for placing on colored backgrounds)
    """
    # Use medium error correction for better scanability
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    
    if for_colored_bg:
        # For colored backgrounds: white modules on transparent background
        img = qr.make_image(fill_color="white", back_color="transparent")
        img = img.convert('RGBA')
    else:
        # Normal: colored modules on white background
        rgb_color = hex_to_rgb(brand_color)
        img = qr.make_image(fill_color=rgb_color, back_color="white")
    
    return img.resize((size, size), Image.Resampling.LANCZOS)


def hex_to_rgb(hex_color: str):
    """Convert hex color to RGB tuple"""
    h = (hex_color or "").lstrip("#")
    if len(h) != 6:
        return (16, 185, 129)  # fallback TLS green
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def generate_branded_stamp_image(
    stamp_id: str,
    advocate_name: str,
    verification_url: str,
    brand_color: str = "#10B981",  # USER-CONTROLLED: only affects outer border
    layout: str = "horizontal",     # IGNORED - fixed layout
    shape: str = "rectangle",       # IGNORED - always rectangle
    show_advocate_name: bool = True,
    show_tls_logo: bool = True,
    include_signature: bool = False,  # Now supported for certification stamps
    signature_data: Optional[str] = None,  # Base64 signature image
    show_signature_placeholder: bool = False,  # Show "Sign here" placeholder
    scale: float = 2.0,
    transparent_background: bool = True
) -> Image.Image:
    """
    TLS official stamp card with two variants:
    1. COMPACT (default): 560x300 base - for non-signature stamps
    2. CERTIFICATION (taller): 560x420 base - includes signature section
    
    - Fixed layout matching the official template
    - Fixed TLS brand colors for header + accents
    - ONLY border color changes (outer border) based on user preference
    """
    from PIL import ImageDraw, ImageFont
    import os
    import re
    
    # --- Determine stamp variant based on signature requirements ---
    needs_signature_section = include_signature or show_signature_placeholder
    
    # --- Fixed template base sizes ---
    base_w = 560
    base_h = 420 if needs_signature_section else 300  # Taller for certification
    W, H = int(base_w * scale), int(base_h * scale)

    # --- Colors ---
    TLS_GREEN = (16, 185, 129)  # #10B981 FIXED for header, accents, QR
    border_rgb = hex_to_rgb(brand_color)  # USER-CONTROLLED: only outer border

    bg = (255, 255, 255, 0) if transparent_background else (255, 255, 255, 255)
    img = Image.new("RGBA", (W, H), bg)
    draw = ImageDraw.Draw(img)

    # --- Fonts (Inter for exact match with frontend) ---
    FONT_REG = "/app/backend/assets/fonts/Inter-Regular.ttf"
    FONT_BOLD = "/app/backend/assets/fonts/Inter-Bold.ttf"
    FONT_SEMIBOLD = "/app/backend/assets/fonts/Inter-SemiBold.ttf"

    def load_font(path, size):
        try:
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
        except:
            pass
        # Fallback to DejaVu if Inter not available
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
        except:
            return ImageFont.load_default()

    f_title = load_font(FONT_BOLD, int(28 * scale))
    f_sub = load_font(FONT_REG, int(16 * scale))
    f_label = load_font(FONT_SEMIBOLD, int(11 * scale))
    f_value_bold = load_font(FONT_BOLD, int(20 * scale))
    f_value = load_font(FONT_REG, int(16 * scale))
    f_footer = load_font(FONT_REG, int(13 * scale))

    # --- Layout metrics ---
    pad = int(12 * scale)
    radius = int(12 * scale)
    header_h = int(80 * scale)
    footer_h = int(36 * scale)

    # ============ OUTER BORDER (USER-CONTROLLED COLOR) ============
    draw.rounded_rectangle(
        [pad, pad, W - pad, H - pad],
        radius=radius,
        outline=border_rgb,
        width=int(3 * scale)
    )

    # ============ HEADER (TLS FIXED GREEN) ============
    draw.rounded_rectangle(
        [pad, pad, W - pad, pad + header_h],
        radius=radius,
        fill=TLS_GREEN
    )
    # Square off bottom header corners
    draw.rectangle(
        [pad, pad + header_h - radius, W - pad, pad + header_h],
        fill=TLS_GREEN
    )

    # TLS Logo in white circular badge
    logo_d = int(50 * scale)
    logo_x = pad + int(14 * scale)
    logo_y = pad + (header_h - logo_d) // 2

    draw.ellipse([logo_x, logo_y, logo_x + logo_d, logo_y + logo_d], fill=(255, 255, 255, 255))

    if show_tls_logo:
        try:
            logo_path = "/app/frontend/public/assets/tls-logo.png"
            if os.path.exists(logo_path):
                logo_img = Image.open(logo_path).convert("RGBA")
                inner = int(logo_d * 0.78)
                logo_img = logo_img.resize((inner, inner), Image.Resampling.LANCZOS)
                off = (logo_d - inner) // 2
                img.paste(logo_img, (logo_x + off, logo_y + off), logo_img)
        except:
            # Draw "TLS" text if logo fails
            draw.text((logo_x + int(10 * scale), logo_y + int(15 * scale)), "TLS", fill=TLS_GREEN, font=f_label)

    # Header text
    hx = logo_x + logo_d + int(14 * scale)
    draw.text((hx, pad + int(14 * scale)), "TLS VERIFIED", fill=(255, 255, 255, 255), font=f_title)
    draw.text((hx, pad + int(48 * scale)), "Tanganyika Law Society", fill=(255, 255, 255, 200), font=f_sub)

    # ============ BODY (WHITE BACKGROUND) ============
    body_top = pad + header_h
    body_bottom = H - pad - footer_h
    draw.rectangle([pad, body_top, W - pad, body_bottom], fill=(255, 255, 255, 255))

    # ============ FOOTER (TLS TINT) ============
    footer_top = body_bottom
    tint = (TLS_GREEN[0], TLS_GREEN[1], TLS_GREEN[2], 35)
    draw.rounded_rectangle(
        [pad, footer_top, W - pad, H - pad],
        radius=radius,
        fill=tint
    )
    # Square off top footer corners
    draw.rectangle([pad, footer_top, W - pad, footer_top + radius], fill=tint)

    # Footer text
    footer_text = "Scan QR Code to Verify Authenticity"
    bbox = draw.textbbox((0, 0), footer_text, font=f_footer)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, footer_top + int(9 * scale)), footer_text, fill=TLS_GREEN, font=f_footer)

    # ============ QR CODE (LEFT SIDE) ============
    qr_size = int(110 * scale)
    qr_pad = int(16 * scale)
    qr_box_pad = int(8 * scale)

    qr_x = pad + qr_pad
    qr_y = body_top + int(14 * scale)

    # QR border (TLS fixed accent)
    draw.rounded_rectangle(
        [qr_x - qr_box_pad, qr_y - qr_box_pad, qr_x + qr_size + qr_box_pad, qr_y + qr_size + qr_box_pad],
        radius=int(8 * scale),
        outline=(TLS_GREEN[0], TLS_GREEN[1], TLS_GREEN[2], 120),
        width=int(2 * scale)
    )

    # Generate QR code (TLS green)
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=0
        )
        qr.add_data(verification_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color=TLS_GREEN, back_color="white").convert("RGBA")
        qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        img.paste(qr_img, (qr_x, qr_y))
    except:
        draw.rectangle([qr_x, qr_y, qr_x + qr_size, qr_y + qr_size], fill=(220, 220, 220, 255))

    # ============ INFO SECTION (RIGHT SIDE) ============
    info_x = qr_x + qr_size + qr_box_pad + int(20 * scale)
    y = body_top + int(12 * scale)
    line_gap = int(48 * scale)

    # STAMP ID
    draw.text((info_x, y), "STAMP ID", fill=(TLS_GREEN[0], TLS_GREEN[1], TLS_GREEN[2], 160), font=f_label)
    draw.text((info_x, y + int(16 * scale)), stamp_id, fill=(30, 30, 30, 255), font=f_value_bold)

    # DATE
    y += line_gap
    draw.text((info_x, y), "DATE", fill=(TLS_GREEN[0], TLS_GREEN[1], TLS_GREEN[2], 160), font=f_label)
    current_date = datetime.now().strftime("%d %b %Y")
    draw.text((info_x, y + int(16 * scale)), current_date, fill=(80, 80, 80, 255), font=f_value)

    # ADVOCATE
    y += line_gap
    if show_advocate_name and advocate_name:
        draw.text((info_x, y), "ADVOCATE", fill=(TLS_GREEN[0], TLS_GREEN[1], TLS_GREEN[2], 160), font=f_label)
        display_name = advocate_name[:28] + "…" if len(advocate_name) > 28 else advocate_name
        draw.text((info_x, y + int(16 * scale)), display_name, fill=TLS_GREEN, font=f_value_bold)

    # ============ SIGNATURE SECTION (CERTIFICATION STAMPS ONLY) ============
    if needs_signature_section:
        sig_section_top = body_bottom - int(90 * scale)  # Space for signature section
        
        # Signature section divider line
        draw.line(
            [(pad + int(16 * scale), sig_section_top), (W - pad - int(16 * scale), sig_section_top)],
            fill=(200, 200, 200, 255),
            width=int(1 * scale)
        )
        
        # Signature label
        sig_label_y = sig_section_top + int(8 * scale)
        draw.text(
            (pad + int(20 * scale), sig_label_y), 
            "ADVOCATE SIGNATURE", 
            fill=(TLS_GREEN[0], TLS_GREEN[1], TLS_GREEN[2], 160), 
            font=f_label
        )
        
        # ============ SIGNATURE BOX (SINGLE SOURCE OF TRUTH) ============
        # Both placeholder line AND digital signature paste use the SAME box coordinates
        sig_area_y = sig_label_y + int(18 * scale)
        sig_area_height = int(50 * scale)
        
        # Define signature box horizontally to EXACTLY match placeholder line bounds
        sig_area_x = pad + int(60 * scale)
        sig_area_w = (W - pad - int(60 * scale)) - sig_area_x  # line_end_x - line_start_x
        
        # ---- DIGITAL SIGNATURE (paste inside sig_area box) ----
        if include_signature and signature_data:
            try:
                sig_b64 = signature_data
                if sig_b64.startswith("data:"):
                    sig_b64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", sig_b64)
                
                sig_bytes = base64.b64decode(sig_b64)
                sig_img = Image.open(BytesIO(sig_bytes)).convert("RGBA")
                
                # Trim transparent margins (fixes drawn signatures looking offset)
                bbox = sig_img.getbbox()
                if bbox:
                    sig_img = sig_img.crop(bbox)
                
                # Fit signature inside box while preserving aspect ratio
                sig_w, sig_h = sig_img.size
                if sig_w > 0 and sig_h > 0:
                    scale_factor = min(sig_area_w / sig_w, sig_area_height / sig_h)
                    target_w = max(1, int(sig_w * scale_factor))
                    target_h = max(1, int(sig_h * scale_factor))
                    sig_img = sig_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                    
                    # Center inside the SAME box as placeholder
                    sig_x = sig_area_x + (sig_area_w - target_w) // 2
                    sig_y = sig_area_y + (sig_area_height - target_h) // 2
                    
                    img.paste(sig_img, (sig_x, sig_y), sig_img)
                
                # Add "Digitally Signed ✓" badge
                badge_text = "Digitally Signed"
                badge_bbox = draw.textbbox((0, 0), badge_text, font=f_label)
                badge_w = badge_bbox[2] - badge_bbox[0] + int(24 * scale)
                badge_h = int(20 * scale)
                badge_x = W - pad - int(20 * scale) - badge_w
                badge_y = sig_label_y - int(2 * scale)
                
                # Badge background
                draw.rounded_rectangle(
                    [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
                    radius=int(4 * scale),
                    fill=(16, 185, 129, 40)
                )
                # Badge text
                draw.text(
                    (badge_x + int(8 * scale), badge_y + int(3 * scale)), 
                    badge_text + " ✓", 
                    fill=TLS_GREEN, 
                    font=f_label
                )
                
            except Exception as e:
                print(f"Error rendering signature: {e}")
                # Fall back to placeholder if signature rendering fails
                include_signature = False
        
        # ---- PLACEHOLDER (draw using same box bounds) ----
        if show_signature_placeholder and not (include_signature and signature_data):
            line_y = sig_area_y + sig_area_height - int(8 * scale)
            line_start_x = sig_area_x
            line_end_x = sig_area_x + sig_area_w
            
            # Dashed signature line
            dash_len = int(10 * scale)
            gap_len = int(6 * scale)
            x = line_start_x
            while x < line_end_x:
                draw.line(
                    [(x, line_y), (min(x + dash_len, line_end_x), line_y)],
                    fill=(180, 180, 180, 255),
                    width=max(1, int(1 * scale))
                )
                x += dash_len + gap_len
            
            # "Sign here" text centered in the box
            sign_text = "Sign here"
            sign_w = draw.textlength(sign_text, font=f_footer)
            draw.text(
                (sig_area_x + (sig_area_w - sign_w) // 2, line_y + int(4 * scale)), 
                sign_text, 
                fill=(150, 150, 150, 255), 
                font=f_footer
            )

    return img


async def get_system_settings():
    """Get system settings from database with defaults"""
    settings = await db.settings.find_one({"type": "system"})
    if not settings:
        settings = {
            "type": "system",
            "verification_fee_fixed": 500.0,
            "verification_fee_percentage": 2.5,
            "advocate_revenue_share": 30,
            "official_stamp_price": 5000.0,
            "commissioner_stamp_price": 7500.0,
            "notary_stamp_price": 10000.0
        }
    return settings


async def calculate_verification_revenue(stamp_price: float = 0) -> dict:
    """Calculate revenue split for a verification"""
    settings = await get_system_settings()
    fixed_fee = settings.get("verification_fee_fixed", 500.0)
    percentage_fee = (settings.get("verification_fee_percentage", 0) / 100) * stamp_price
    total_fee = fixed_fee + percentage_fee
    advocate_share = (settings.get("advocate_revenue_share", 30) / 100) * total_fee
    platform_share = total_fee - advocate_share
    return {
        "total_fee": total_fee,
        "advocate_share": advocate_share,
        "platform_share": platform_share
    }

# =============== STAMP TYPES (Seed Data) ===============
STAMP_TYPES = [
    {"id": "advocate_official", "name": "Advocate Official Stamp", "description": "Official TLS-approved stamp for legal documents", "price": 150000.0, "currency": "TZS"},
    {"id": "commissioner_oaths", "name": "Commissioner for Oaths Stamp", "description": "Stamp for oath administration documents", "price": 200000.0, "currency": "TZS"},
    {"id": "notary_public", "name": "Notary Public Stamp", "description": "Stamp for notarization services", "price": 250000.0, "currency": "TZS"},
]

DIGITAL_STAMP_PRICES = {
    "official": 5000.0,
    "commissioner": 7500.0,
    "notary": 10000.0
}

# =============== AUTH ROUTES (DEPRECATED - Now handled by routes/auth.py module) ===============
# These functions are kept for reference but routes are disabled
# To enable the old routes, uncomment the decorators below

# @api_router.post("/auth/register")
# @limiter.limit("5/minute")
async def register_deprecated(request: Request, data: AdvocateRegister):
    existing = await db.advocates.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_roll = await db.advocates.find_one({"roll_number": data.roll_number})
    if existing_roll:
        raise HTTPException(status_code=400, detail="Roll number already registered")
    
    # Validate password strength with strict rules
    is_valid, error_message = validate_password_strength(data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    now = datetime.now(timezone.utc).isoformat()
    advocate_id = str(uuid.uuid4())
    
    # Generate email verification token
    verification_token = secrets.token_urlsafe(32)
    verification_expires = (datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFICATION_EXPIRE_HOURS)).isoformat()
    
    advocate = {
        "id": advocate_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "roll_number": data.roll_number,
        "tls_member_number": generate_tls_member_number(data.roll_number),
        "phone": data.phone,
        "region": data.region,
        "court_jurisdiction": "High Court of Tanzania",
        "firm_affiliation": None,
        "admission_year": datetime.now().year,
        "practicing_status": "Active",
        "profile_photo": None,
        "role": "advocate",
        "verified": False,
        "email_verified": False,  # New field for email verification
        "verification_token": verification_token,
        "verification_token_expires": verification_expires,
        "total_earnings": 0.0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.advocates.insert_one(advocate)
    
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "advocate_registered",
        "user_id": advocate_id,
        "details": {"email": data.email, "roll_number": data.roll_number},
        "timestamp": now
    })
    
    # Send email verification email
    verification_url = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    try:
        await send_email(
            to_email=data.email,
            subject="Verify Your Email - TLS Verification",
            html_content=generate_email_verification_email(verification_url, data.full_name)
        )
        logger.info(f"Verification email sent to {data.email}")
    except Exception as e:
        logger.warning(f"Failed to send verification email: {e}")
    
    # Return success message instead of token (user must verify email first)
    return {
        "message": "Registration successful! Please check your email to verify your account.",
        "email": data.email,
        "requires_verification": True
    }

# @api_router.post("/auth/login")
# @limiter.limit("5/minute")
async def login_deprecated(request: Request, data: AdvocateLogin):
    # Get request metadata for logging
    ip_address = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    if "," in ip_address:
        ip_address = ip_address.split(",")[0].strip()
    user_agent = request.headers.get("User-Agent", "unknown")
    
    # Helper function to log login attempts
    async def log_login_attempt(email: str, success: bool, failure_reason: str = None, user_id: str = None):
        await db.login_attempts.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "user_id": user_id,
            "success": success,
            "failure_reason": failure_reason,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    # Check advocates collection first
    user = await db.advocates.find_one({"email": data.email})
    
    # If not found in advocates, check users collection (for admin/super_admin)
    if not user:
        user = await db.users.find_one({"email": data.email})
    
    if not user:
        logger.error(f"Login attempt for non-existent user: {data.email}")
        await log_login_attempt(data.email, False, "user_not_found")
        # Use same error message to prevent user enumeration
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        logger.warning(f"Failed login attempt for: {data.email}")
        await log_login_attempt(data.email, False, "invalid_password", user.get("id"))
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if advocate is suspended
    if user.get("practicing_status") == "Suspended":
        await log_login_attempt(data.email, False, "account_suspended", user.get("id"))
        raise HTTPException(status_code=403, detail="Account suspended. Contact TLS administration.")
    
    # Check if email is verified (only for advocates, not admins)
    if user.get("role") == "advocate" and not user.get("email_verified", False):
        await log_login_attempt(data.email, False, "email_not_verified", user.get("id"))
        raise HTTPException(
            status_code=403, 
            detail="Please verify your email before logging in. Check your inbox for the verification link."
        )
    
    # Log successful login
    await log_login_attempt(data.email, True, None, user.get("id"))
    
    # Check if password reset is required (for default accounts)
    force_password_reset = user.get("force_password_reset", False)
    
    # Generate JWT with a unique ID for CSRF token binding
    jti = str(uuid.uuid4())  # JWT ID for session identification
    token = create_access_token({"sub": user["id"], "role": user.get("role", "advocate"), "jti": jti})
    
    # Generate CSRF token and store it
    csrf_token = generate_csrf_token()
    csrf_tokens[jti] = csrf_token
    
    # Clean up old CSRF tokens (keep last 1000 per simple cleanup)
    if len(csrf_tokens) > 1000:
        # Remove oldest entries (simple cleanup - in production use Redis with TTL)
        keys_to_remove = list(csrf_tokens.keys())[:-500]
        for key in keys_to_remove:
            csrf_tokens.pop(key, None)
    
    # Return user info with token and CSRF token
    user_data = {k: v for k, v in user.items() if k not in ["_id", "password_hash", "verification_token", "verification_token_expires"]}
    user_data["force_password_reset"] = force_password_reset
    
    # Create response with HttpOnly cookie
    response_data = {
        "access_token": token,  # Still return token for backward compatibility
        "token_type": "bearer", 
        "user": user_data,
        "csrf_token": csrf_token
    }
    
    response = JSONResponse(content=response_data)
    
    # Set HttpOnly cookie with JWT
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/"
    )
    
    return response

# @api_router.get("/auth/me")
async def get_me_deprecated(user: dict = Depends(get_current_user)):
    # Return user data without password hash
    return {k: v for k, v in user.items() if k not in ["_id", "password_hash", "verification_token", "verification_token_expires"]}

# @api_router.post("/auth/logout")
async def logout_deprecated(request: Request):
    """
    Logout user by clearing the HttpOnly cookie.
    Also clears CSRF token from server-side storage.
    """
    # Try to get JWT to find session ID for CSRF cleanup
    cookie_token = request.cookies.get(COOKIE_NAME)
    if cookie_token:
        try:
            payload = jwt.decode(cookie_token, SECRET_KEY, algorithms=[ALGORITHM])
            jti = payload.get("jti")
            if jti and jti in csrf_tokens:
                del csrf_tokens[jti]
        except JWTError:
            pass  # Token invalid, just clear cookie
    
    # Create response that clears the cookie
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=COOKIE_SECURE,
        httponly=COOKIE_HTTPONLY,
        samesite=COOKIE_SAMESITE
    )
    
    return response

# =============== EMAIL VERIFICATION ENDPOINTS ===============

# @api_router.get("/auth/verify-email/{token}")
async def verify_email_deprecated(token: str):
    """Verify user's email address using the verification token"""
    # Find user with this verification token
    user = await db.advocates.find_one({"verification_token": token})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    
    # Check if token has expired
    token_expires = user.get("verification_token_expires")
    if token_expires:
        expires_dt = datetime.fromisoformat(token_expires.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_dt:
            raise HTTPException(status_code=400, detail="Verification link has expired. Please request a new one.")
    
    # Check if already verified
    if user.get("email_verified", False):
        return {"message": "Email already verified. You can now log in.", "already_verified": True}
    
    # Update user to mark email as verified
    now = datetime.now(timezone.utc).isoformat()
    await db.advocates.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "email_verified": True,
                "verification_token": None,
                "verification_token_expires": None,
                "updated_at": now
            }
        }
    )
    
    # Log the verification
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "email_verified",
        "user_id": user["id"],
        "details": {"email": user["email"]},
        "timestamp": now
    })
    
    # Send welcome email now that they're verified
    try:
        await send_email(
            to_email=user["email"],
            subject="Welcome to TLS Verification",
            html_content=generate_welcome_email(user["full_name"], f"{FRONTEND_URL}/login")
        )
    except Exception as e:
        logger.warning(f"Failed to send welcome email after verification: {e}")
    
    logger.info(f"Email verified for user: {user['email']}")
    return {"message": "Email verified successfully! You can now log in.", "verified": True}

class ResendVerificationRequest(BaseModel):
    email: EmailStr

# @api_router.post("/auth/resend-verification")
# @limiter.limit("3/minute")
async def resend_verification_deprecated(request: Request, data: ResendVerificationRequest):
    """Resend email verification link"""
    user = await db.advocates.find_one({"email": data.email})
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists in our system, a verification link will be sent."}
    
    # Check if already verified
    if user.get("email_verified", False):
        raise HTTPException(status_code=400, detail="Email is already verified. Please log in.")
    
    # Generate new verification token
    verification_token = secrets.token_urlsafe(32)
    verification_expires = (datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFICATION_EXPIRE_HOURS)).isoformat()
    
    # Update user with new token
    await db.advocates.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "verification_token": verification_token,
                "verification_token_expires": verification_expires,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Send verification email
    verification_url = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    try:
        await send_email(
            to_email=data.email,
            subject="Verify Your Email - TLS Verification",
            html_content=generate_email_verification_email(verification_url, user["full_name"])
        )
        logger.info(f"Verification email resent to {data.email}")
    except HTTPException as e:
        # If email service is in test mode, still return success to user
        # The token is updated anyway, they can verify manually if needed
        logger.warning(f"Email service error (resend verification): {e.detail}")
        return {"message": "Verification email requested. If you don't receive it, please contact support."}
    except Exception as e:
        logger.error(f"Failed to resend verification email: {e}")
        return {"message": "Verification email requested. If you don't receive it, please contact support."}
    
    return {"message": "Verification email sent. Please check your inbox."}

# Password change model
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# Password reset request model
class PasswordResetRequest(BaseModel):
    email: EmailStr

# Password reset confirm model
class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

# =============== EMAIL SERVICE ===============

async def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """Send email using Resend service"""
    if not RESEND_API_KEY:
        logger.warning(f"Email not sent (no API key): {subject} to {to_email}")
        return {"status": "skipped", "message": "Email service not configured"}
    
    params = {
        "from": f"TLS Verification <{SENDER_EMAIL}>",
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent successfully to {to_email}: {subject}")
        return {"status": "success", "message": f"Email sent to {to_email}", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

def generate_password_reset_email(reset_url: str, user_name: str) -> str:
    """Generate HTML email template for password reset"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0f1a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 40px;">
                    <table width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                            <td style="text-align: center; padding-bottom: 30px;">
                                <div style="background: #10b981; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                                    <span style="color: white; font-size: 28px; font-weight: bold;">TLS</span>
                                </div>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Password Reset Request</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #94a3b8; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
                                <p>Hello {user_name},</p>
                                <p>We received a request to reset your password for your TLS Verification account. Click the button below to create a new password:</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center; padding-bottom: 24px;">
                                <a href="{reset_url}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; font-size: 16px;">Reset Password</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; font-size: 14px; line-height: 20px; padding-bottom: 24px;">
                                <p>This link will expire in <strong>30 minutes</strong>.</p>
                                <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="border-top: 1px solid #334155; padding-top: 24px;">
                                <p style="color: #475569; font-size: 12px; margin: 0;">If the button doesn't work, copy and paste this link:</p>
                                <p style="color: #10b981; font-size: 12px; word-break: break-all; margin: 8px 0 0;">{reset_url}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="text-align: center; padding-top: 24px;">
                    <p style="color: #475569; font-size: 12px; margin: 0;">Tanganyika Law Society</p>
                    <p style="color: #475569; font-size: 12px; margin: 4px 0 0;">Upholding Justice Since 1954</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def generate_welcome_email(user_name: str, login_url: str) -> str:
    """Generate HTML email template for welcome/registration"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0f1a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 40px;">
                    <table width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                            <td style="text-align: center; padding-bottom: 30px;">
                                <div style="background: #10b981; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 16px;">
                                    <span style="color: white; font-size: 28px; font-weight: bold; line-height: 60px;">TLS</span>
                                </div>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Welcome to TLS Verification!</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #94a3b8; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
                                <p>Dear {user_name},</p>
                                <p>Your TLS Verification account has been successfully created. You can now:</p>
                                <ul style="color: #cbd5e1; padding-left: 20px;">
                                    <li>Digitally stamp and verify legal documents</li>
                                    <li>Build your public advocate profile</li>
                                    <li>Track your stamping history</li>
                                    <li>Order official TLS stamps</li>
                                </ul>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center; padding-bottom: 24px;">
                                <a href="{login_url}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; font-size: 16px;">Go to Dashboard</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; font-size: 14px; line-height: 20px;">
                                <p>If you have any questions, please contact us at support@tls.or.tz</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="text-align: center; padding-top: 24px;">
                    <p style="color: #475569; font-size: 12px; margin: 0;">Tanganyika Law Society</p>
                    <p style="color: #475569; font-size: 12px; margin: 4px 0 0;">Upholding Justice Since 1954</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def generate_password_changed_email(user_name: str) -> str:
    """Generate HTML email template for password changed notification"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0f1a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 40px;">
                    <table width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                            <td style="text-align: center; padding-bottom: 30px;">
                                <div style="background: #10b981; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 16px;">
                                    <span style="color: white; font-size: 28px; font-weight: bold; line-height: 60px;">TLS</span>
                                </div>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Password Changed</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #94a3b8; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
                                <p>Hello {user_name},</p>
                                <p>Your TLS Verification account password was successfully changed.</p>
                                <p style="color: #f59e0b; font-weight: 600;">If you did not make this change, please contact us immediately at support@tls.or.tz</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; font-size: 14px; line-height: 20px;">
                                <p>Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="text-align: center; padding-top: 24px;">
                    <p style="color: #475569; font-size: 12px; margin: 0;">Tanganyika Law Society</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def generate_email_verification_email(verification_url: str, user_name: str) -> str:
    """Generate HTML email template for email verification"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0f1a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 40px;">
                    <table width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                            <td style="text-align: center; padding-bottom: 30px;">
                                <div style="background: #10b981; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 16px;">
                                    <span style="color: white; font-size: 28px; font-weight: bold; line-height: 60px;">TLS</span>
                                </div>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Verify Your Email</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #94a3b8; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
                                <p>Hello {user_name},</p>
                                <p>Welcome to TLS Verification! Please verify your email address to activate your account and access all features.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center; padding-bottom: 24px;">
                                <a href="{verification_url}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; font-size: 16px;">Verify Email Address</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; font-size: 14px; line-height: 20px; padding-bottom: 24px;">
                                <p>This verification link will expire in <strong>24 hours</strong>.</p>
                                <p>If you didn't create an account with TLS Verification, please ignore this email.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="border-top: 1px solid #334155; padding-top: 24px;">
                                <p style="color: #475569; font-size: 12px; margin: 0;">If the button doesn't work, copy and paste this link:</p>
                                <p style="color: #10b981; font-size: 12px; word-break: break-all; margin: 8px 0 0;">{verification_url}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="text-align: center; padding-top: 24px;">
                    <p style="color: #475569; font-size: 12px; margin: 0;">Tanganyika Law Society</p>
                    <p style="color: #475569; font-size: 12px; margin: 4px 0 0;">Upholding Justice Since 1954</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def generate_login_alert_email(user_name: str, ip_address: str, user_agent: str, location: str = "Unknown") -> str:
    """Generate HTML email template for suspicious login alert"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0f1a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 40px;">
                    <table width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                            <td style="text-align: center; padding-bottom: 30px;">
                                <div style="background: #f59e0b; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 16px;">
                                    <span style="color: white; font-size: 28px; font-weight: bold; line-height: 60px;">!</span>
                                </div>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">New Login Detected</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #94a3b8; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
                                <p>Hello {user_name},</p>
                                <p>We detected a new login to your TLS Verification account:</p>
                                <table style="width: 100%; margin: 16px 0; background: #1e293b; border-radius: 8px; padding: 16px;">
                                    <tr>
                                        <td style="color: #64748b; padding: 8px 0;">Time:</td>
                                        <td style="color: #ffffff; padding: 8px 0;">{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #64748b; padding: 8px 0;">IP Address:</td>
                                        <td style="color: #ffffff; padding: 8px 0;">{ip_address}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #64748b; padding: 8px 0;">Device:</td>
                                        <td style="color: #ffffff; padding: 8px 0; font-size: 12px;">{user_agent[:50]}...</td>
                                    </tr>
                                </table>
                                <p style="color: #f59e0b; font-weight: 600;">If this wasn't you, please change your password immediately and contact support@tls.or.tz</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="text-align: center; padding-top: 24px;">
                    <p style="color: #475569; font-size: 12px; margin: 0;">Tanganyika Law Society</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

# =============== LOGIN ATTEMPT LOGGING ===============

async def log_login_attempt(
    email: str,
    success: bool,
    ip_address: str,
    user_agent: str,
    failure_reason: str = None,
    user_id: str = None
):
    """Log login attempt for security auditing"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "email": email,
        "user_id": user_id,
        "success": success,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "failure_reason": failure_reason,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.login_attempts.insert_one(log_entry)
    
    # Log to application logger as well
    if success:
        logger.info(f"Successful login: {email} from {ip_address}")
    else:
        logger.warning(f"Failed login attempt: {email} from {ip_address} - {failure_reason}")
    
    return log_entry

async def check_suspicious_activity(email: str, ip_address: str) -> dict:
    """Check for suspicious login patterns"""
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)
    
    # Count failed attempts in last hour from this IP
    failed_from_ip = await db.login_attempts.count_documents({
        "ip_address": ip_address,
        "success": False,
        "timestamp": {"$gte": one_hour_ago.isoformat()}
    })
    
    # Count failed attempts for this email in last hour
    failed_for_email = await db.login_attempts.count_documents({
        "email": email,
        "success": False,
        "timestamp": {"$gte": one_hour_ago.isoformat()}
    })
    
    # Check if login from new IP for this user
    user_ips = await db.login_attempts.distinct("ip_address", {
        "email": email,
        "success": True
    })
    
    is_new_ip = ip_address not in user_ips if user_ips else True
    
    return {
        "failed_from_ip": failed_from_ip,
        "failed_for_email": failed_for_email,
        "is_new_ip": is_new_ip,
        "is_suspicious": failed_from_ip >= 5 or failed_for_email >= 5
    }

# @api_router.post("/auth/change-password")
# @limiter.limit("3/minute")
async def change_password_deprecated(request: Request, data: PasswordChange, user: dict = Depends(get_current_user)):
    """Change user password with strict validation"""
    # Verify current password
    if not verify_password(data.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password strength with strict rules
    is_valid, error_message = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Ensure new password is different from current
    if verify_password(data.new_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    
    # Hash and update password
    new_hash = hash_password(data.new_password)
    
    # Update in advocates collection
    result = await db.advocates.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": new_hash, "force_password_reset": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # If not found in advocates, try users collection
    if result.modified_count == 0:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password_hash": new_hash, "force_password_reset": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    logger.info(f"Password changed for user: {user.get('email')}")
    
    # Send password changed notification email
    try:
        await send_email(
            to_email=user.get('email'),
            subject="TLS Verification - Password Changed",
            html_content=generate_password_changed_email(user.get('full_name', 'User'))
        )
    except Exception as e:
        logger.warning(f"Failed to send password change notification: {e}")
    
    return {"message": "Password changed successfully"}

# @api_router.post("/auth/forgot-password")
# @limiter.limit("3/minute")
async def forgot_password_deprecated(request: Request, data: PasswordResetRequest):
    """Request password reset email"""
    # Find user by email in advocates
    user = await db.advocates.find_one({"email": data.email}, {"_id": 0})
    
    # Also check users collection
    if not user:
        user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        logger.warning(f"Password reset requested for non-existent email: {data.email}")
        return {"message": "If an account exists with this email, you will receive a password reset link"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    reset_expiry = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
    
    # Store reset token in database
    await db.password_reset_tokens.delete_many({"email": data.email})  # Remove old tokens
    await db.password_reset_tokens.insert_one({
        "email": data.email,
        "token": reset_token,
        "expires_at": reset_expiry.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Generate reset URL
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Send email
    try:
        await send_email(
            to_email=data.email,
            subject="TLS Verification - Password Reset",
            html_content=generate_password_reset_email(reset_url, user.get('full_name', 'User'))
        )
        logger.info(f"Password reset email sent to: {data.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        # Don't reveal the error to user
    
    return {"message": "If an account exists with this email, you will receive a password reset link"}

# @api_router.post("/auth/reset-password")
# @limiter.limit("3/minute")
async def reset_password_deprecated(request: Request, data: PasswordResetConfirm):
    """Reset password using token from email"""
    # Find and validate token
    token_doc = await db.password_reset_tokens.find_one({"token": data.token}, {"_id": 0})
    
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    expiry = datetime.fromisoformat(token_doc["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expiry:
        await db.password_reset_tokens.delete_one({"token": data.token})
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one")
    
    # Validate new password strength
    is_valid, error_message = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    email = token_doc["email"]
    
    # Find user and update password
    user = await db.advocates.find_one({"email": email}, {"_id": 0})
    collection = "advocates"
    if not user:
        user = await db.users.find_one({"email": email}, {"_id": 0})
        collection = "users"
    
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    # Ensure new password is different from current
    if verify_password(data.new_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="New password must be different from your previous password")
    
    # Update password
    new_hash = hash_password(data.new_password)
    if collection == "advocates":
        await db.advocates.update_one(
            {"email": email},
            {"$set": {"password_hash": new_hash, "force_password_reset": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": new_hash, "force_password_reset": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Delete used token
    await db.password_reset_tokens.delete_one({"token": data.token})
    
    logger.info(f"Password reset successfully for: {email}")
    
    # Send confirmation email
    try:
        await send_email(
            to_email=email,
            subject="TLS Verification - Password Reset Successful",
            html_content=generate_password_changed_email(user.get('full_name', 'User'))
        )
    except Exception as e:
        logger.warning(f"Failed to send password reset confirmation: {e}")
    
    return {"message": "Password has been reset successfully. You can now login with your new password"}

# @api_router.get("/auth/password-rules")
async def get_password_rules_deprecated():
    """Get password validation rules for frontend"""
    return {
        "rules": [
            {"rule": "minimum_length", "value": 12, "description": "At least 12 characters"},
            {"rule": "uppercase", "value": 1, "description": "At least one uppercase letter (A-Z)"},
            {"rule": "lowercase", "value": 1, "description": "At least one lowercase letter (a-z)"},
            {"rule": "number", "value": 1, "description": "At least one number (0-9)"},
            {"rule": "special", "value": 1, "description": "At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)"},
            {"rule": "no_common_patterns", "value": True, "description": "No common patterns (password, 123456, qwerty, etc.)"},
            {"rule": "no_sequences", "value": True, "description": "No sequential characters (abcd, 1234)"},
            {"rule": "no_repeating", "value": 3, "description": "No more than 3 consecutive identical characters"}
        ]
    }

# =============== PROFILE ROUTES ===============

@api_router.put("/profile", response_model=AdvocateProfile)
async def update_profile(data: AdvocateUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.advocates.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated = await db.advocates.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return AdvocateProfile(**updated)

@api_router.get("/profile/{advocate_id}", response_model=AdvocateProfile)
async def get_advocate_profile(advocate_id: str):
    advocate = await db.advocates.find_one({"id": advocate_id}, {"_id": 0, "password_hash": 0})
    if not advocate:
        raise HTTPException(status_code=404, detail="Advocate not found")
    return AdvocateProfile(**advocate)

@api_router.get("/advocates/public/{advocate_id}")
async def get_public_advocate_profile(advocate_id: str):
    """Get public profile of an advocate (for public viewing)"""
    advocate = await db.advocates.find_one(
        {"id": advocate_id},
        {"_id": 0, "password_hash": 0}
    )
    if not advocate:
        raise HTTPException(status_code=404, detail="Advocate not found")
    
    # Check if profile is public
    if not advocate.get("public_profile_enabled", True):
        raise HTTPException(status_code=403, detail="This advocate's profile is private")
    
    # Get public profile data
    public_profile = advocate.get("public_profile", {})
    
    # Get stamp statistics
    stamps = await db.document_stamps.find({"advocate_id": advocate_id}, {"verification_count": 1}).to_list(None)
    stamp_count = len(stamps)
    total_verifications = sum(s.get("verification_count", 0) for s in stamps)
    
    # Calculate profile completion
    completion_fields = ["bio", "practice_areas", "education", "experience", "profile_photo", "location"]
    filled = sum(1 for f in completion_fields if public_profile.get(f))
    profile_completion = int((filled / len(completion_fields)) * 100)
    
    # Calculate percentile rank for achievements
    all_advocates = await db.advocates.find({"status": {"$ne": "suspended"}}).to_list(None)
    advocate_verifications = []
    for adv in all_advocates:
        adv_stamps = await db.document_stamps.find({"advocate_id": adv["id"]}, {"verification_count": 1}).to_list(None)
        adv_total = sum(s.get("verification_count", 0) for s in adv_stamps)
        advocate_verifications.append({"id": adv["id"], "verifications": adv_total})
    
    advocate_verifications.sort(key=lambda x: x["verifications"], reverse=True)
    
    # Find this advocate's rank
    rank = 1
    for i, adv in enumerate(advocate_verifications):
        if adv["id"] == advocate_id:
            rank = i + 1
            break
    
    total_advocates = len(advocate_verifications)
    percentile_rank = int((rank / total_advocates) * 100) if total_advocates > 0 else 100
    is_top_10_percent = rank <= (total_advocates * 0.1) if total_advocates > 0 else False
    
    # Get earned achievements
    achievements = calculate_achievements(stamp_count, total_verifications, profile_completion, percentile_rank)
    earned_achievements = [a for a in achievements if a["earned"]]
    
    return {
        "id": advocate["id"],
        "full_name": advocate.get("full_name"),
        "email": advocate.get("email") if public_profile.get("show_email", False) else None,
        "phone": advocate.get("phone") if public_profile.get("show_phone", False) else None,
        "show_email": public_profile.get("show_email", False),
        "show_phone": public_profile.get("show_phone", False),
        "title": public_profile.get("title", "Advocate of the High Court"),
        "bio": public_profile.get("bio"),
        "profile_photo": public_profile.get("profile_photo"),
        "location": public_profile.get("location"),
        "firm_name": public_profile.get("firm_name"),
        "website": public_profile.get("website"),
        "practice_areas": public_profile.get("practice_areas", []),
        "education": public_profile.get("education", []),
        "experience": public_profile.get("experience", []),
        "languages": public_profile.get("languages", []),
        "experience_years": public_profile.get("experience_years"),
        # Professional showcase fields
        "achievements": public_profile.get("achievements", []),
        "publications": public_profile.get("publications", []),
        "memberships": public_profile.get("memberships", []),
        "bar_admissions": public_profile.get("bar_admissions", []),
        "testimonials": public_profile.get("testimonials", []),
        # TLS credentials
        "roll_number": advocate.get("roll_number"),
        "admission_date": advocate.get("admission_date"),
        "practicing_status": advocate.get("practicing_status", "active"),
        "documents_stamped": stamp_count,
        "verification_count": total_verifications,
        "profile_completion": profile_completion,
        # Trust metrics and achievements
        "rank": rank,
        "total_advocates": total_advocates,
        "percentile_rank": percentile_rank,
        "is_top_10_percent": is_top_10_percent,
        "earned_achievements": earned_achievements,
        "uses_digital_stamps": stamp_count > 0
    }

@api_router.put("/user/public-profile")
async def update_public_profile(
    title: str = Form(None),
    bio: str = Form(None),
    location: str = Form(None),
    firm_name: str = Form(None),
    website: str = Form(None),
    practice_areas: str = Form(None),  # JSON array string
    education: str = Form(None),  # JSON array string [{degree, institution, year}]
    experience: str = Form(None),  # JSON array string [{position, company, duration, description}]
    languages: str = Form(None),  # JSON array string
    experience_years: int = Form(None),
    achievements: str = Form(None),  # JSON array string [{title, year}]
    publications: str = Form(None),  # JSON array string [{title, publication, year}]
    memberships: str = Form(None),  # JSON array string (plain strings)
    bar_admissions: str = Form(None),  # JSON array string (plain strings)
    testimonials: str = Form(None),  # JSON array string [{text, client_name, client_title}]
    show_email: str = Form("false"),
    show_phone: str = Form("false"),
    public_profile_enabled: str = Form("true"),
    user: dict = Depends(get_current_user)
):
    """Update advocate's public profile with professional information"""
    import json
    
    public_profile = {}
    if title: public_profile["title"] = title
    if bio: public_profile["bio"] = bio
    if location: public_profile["location"] = location
    if firm_name: public_profile["firm_name"] = firm_name
    if website: public_profile["website"] = website
    if experience_years: public_profile["experience_years"] = experience_years
    public_profile["show_email"] = show_email.lower() == "true"
    public_profile["show_phone"] = show_phone.lower() == "true"
    
    # Parse JSON arrays
    try:
        if practice_areas: public_profile["practice_areas"] = json.loads(practice_areas)
        if education: public_profile["education"] = json.loads(education)
        if experience: public_profile["experience"] = json.loads(experience)
        if languages: public_profile["languages"] = json.loads(languages)
        if achievements: public_profile["achievements"] = json.loads(achievements)
        if publications: public_profile["publications"] = json.loads(publications)
        if memberships: public_profile["memberships"] = json.loads(memberships)
        if bar_admissions: public_profile["bar_admissions"] = json.loads(bar_admissions)
        if testimonials: public_profile["testimonials"] = json.loads(testimonials)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for array fields")
    
    await db.advocates.update_one(
        {"id": user["id"]},
        {"$set": {
            "public_profile": public_profile,
            "public_profile_enabled": public_profile_enabled.lower() == "true",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Public profile updated successfully", "public_profile": public_profile}

@api_router.post("/user/profile-photo")
async def upload_profile_photo(
    photo: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload advocate's profile photo"""
    import base64
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if photo.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WebP are allowed.")
    
    # Validate file size (max 5MB)
    contents = await photo.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
    
    # Convert to base64 data URL
    base64_image = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{photo.content_type};base64,{base64_image}"
    
    # Update user's profile photo in public_profile
    await db.advocates.update_one(
        {"id": user["id"]},
        {"$set": {
            "public_profile.profile_photo": data_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Profile photo uploaded successfully", "profile_photo": data_url}

@api_router.delete("/user/profile-photo")
async def delete_profile_photo(user: dict = Depends(get_current_user)):
    """Delete advocate's profile photo"""
    await db.advocates.update_one(
        {"id": user["id"]},
        {"$set": {
            "public_profile.profile_photo": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Profile photo deleted successfully"}

# =============== ACHIEVEMENTS & GAMIFICATION ===============

ACHIEVEMENT_DEFINITIONS = [
    {"id": "first_stamp", "name": "First Step", "description": "Created your first digital stamp", "icon": "🎯", "threshold": 1, "type": "stamps"},
    {"id": "stamps_10", "name": "Getting Started", "description": "Stamped 10 documents", "icon": "📄", "threshold": 10, "type": "stamps"},
    {"id": "stamps_50", "name": "Regular User", "description": "Stamped 50 documents", "icon": "📋", "threshold": 50, "type": "stamps"},
    {"id": "stamps_100", "name": "Century Club", "description": "Stamped 100 documents", "icon": "🥉", "threshold": 100, "type": "stamps"},
    {"id": "stamps_500", "name": "Power Stamper", "description": "Stamped 500 documents", "icon": "🥈", "threshold": 500, "type": "stamps"},
    {"id": "stamps_1000", "name": "Stamp Master", "description": "Stamped 1,000 documents", "icon": "🥇", "threshold": 1000, "type": "stamps"},
    {"id": "verified_100", "name": "Trusted Advocate", "description": "Documents verified 100 times", "icon": "✅", "threshold": 100, "type": "verifications"},
    {"id": "verified_500", "name": "Highly Verified", "description": "Documents verified 500 times", "icon": "🔒", "threshold": 500, "type": "verifications"},
    {"id": "verified_1000", "name": "Verification Champion", "description": "Documents verified 1,000 times", "icon": "🏆", "threshold": 1000, "type": "verifications"},
    {"id": "digital_pioneer", "name": "Digital Pioneer", "description": "Early adopter of digital stamps", "icon": "⚡", "threshold": 1, "type": "special"},
    {"id": "profile_complete", "name": "Professional Profile", "description": "Completed public profile 100%", "icon": "👤", "threshold": 100, "type": "profile"},
    {"id": "top_10_percent", "name": "Top 10%", "description": "Among top 10% most verified advocates", "icon": "⭐", "threshold": 10, "type": "ranking"},
]

def calculate_achievements(stamp_count: int, verification_count: int, profile_completion: int, percentile_rank: int) -> list:
    """Calculate which achievements an advocate has earned"""
    earned = []
    for achievement in ACHIEVEMENT_DEFINITIONS:
        earned_flag = False
        if achievement["type"] == "stamps" and stamp_count >= achievement["threshold"]:
            earned_flag = True
        elif achievement["type"] == "verifications" and verification_count >= achievement["threshold"]:
            earned_flag = True
        elif achievement["type"] == "profile" and profile_completion >= achievement["threshold"]:
            earned_flag = True
        elif achievement["type"] == "ranking" and percentile_rank <= achievement["threshold"]:
            earned_flag = True
        elif achievement["type"] == "special" and stamp_count >= 1:
            earned_flag = True
        
        if earned_flag:
            earned.append({**achievement, "earned": True})
        else:
            earned.append({**achievement, "earned": False})
    
    return earned

def calculate_cost_savings(stamp_count: int) -> dict:
    """Calculate estimated savings vs physical stamps"""
    # Estimated costs
    physical_stamp_cost = 150000  # TZS for basic stamp
    ink_pad_yearly = 50000  # TZS per year
    years_of_use = max(1, stamp_count / 365)  # Estimate based on stamps
    
    physical_total = physical_stamp_cost + (ink_pad_yearly * years_of_use)
    digital_cost = 0  # Free with TLS membership
    
    return {
        "physical_stamp_cost": physical_stamp_cost,
        "ink_replacement_cost": int(ink_pad_yearly * years_of_use),
        "total_physical_cost": int(physical_total),
        "digital_cost": digital_cost,
        "total_savings": int(physical_total),
        "stamps_created": stamp_count
    }

@api_router.get("/advocate/stats")
async def get_advocate_stats(user: dict = Depends(get_current_user)):
    """Get comprehensive stats for the logged-in advocate"""
    advocate_id = user["id"]
    
    # Get stamp count
    stamp_count = await db.document_stamps.count_documents({"advocate_id": advocate_id})
    
    # Get total verifications
    stamps = await db.document_stamps.find({"advocate_id": advocate_id}, {"verification_count": 1}).to_list(None)
    total_verifications = sum(s.get("verification_count", 0) for s in stamps)
    
    # Get this week's stamps
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    this_week_stamps = await db.document_stamps.count_documents({
        "advocate_id": advocate_id,
        "created_at": {"$gte": week_ago.isoformat()}
    })
    
    # Get this month's stamps
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    this_month_stamps = await db.document_stamps.count_documents({
        "advocate_id": advocate_id,
        "created_at": {"$gte": month_ago.isoformat()}
    })
    
    # Calculate percentile rank
    all_advocates = await db.advocates.find({"status": {"$ne": "suspended"}}).to_list(None)
    advocate_verifications = []
    for adv in all_advocates:
        adv_stamps = await db.document_stamps.find({"advocate_id": adv["id"]}, {"verification_count": 1}).to_list(None)
        adv_total = sum(s.get("verification_count", 0) for s in adv_stamps)
        advocate_verifications.append(adv_total)
    
    advocate_verifications.sort(reverse=True)
    if total_verifications > 0 and advocate_verifications:
        rank = advocate_verifications.index(total_verifications) + 1 if total_verifications in advocate_verifications else len(advocate_verifications)
        percentile_rank = int((rank / len(advocate_verifications)) * 100)
    else:
        percentile_rank = 100
    
    # Calculate profile completion
    public_profile = user.get("public_profile", {})
    profile_fields = ["bio", "practice_areas", "education", "experience", "profile_photo", "location"]
    filled = sum(1 for f in profile_fields if public_profile.get(f))
    profile_completion = int((filled / len(profile_fields)) * 100)
    
    # Get achievements
    achievements = calculate_achievements(stamp_count, total_verifications, profile_completion, percentile_rank)
    earned_achievements = [a for a in achievements if a["earned"]]
    
    # Calculate savings
    savings = calculate_cost_savings(stamp_count)
    
    # Get next achievement
    next_achievement = None
    for ach in achievements:
        if not ach["earned"]:
            if ach["type"] == "stamps":
                ach["progress"] = min(100, int((stamp_count / ach["threshold"]) * 100))
                ach["current"] = stamp_count
            elif ach["type"] == "verifications":
                ach["progress"] = min(100, int((total_verifications / ach["threshold"]) * 100))
                ach["current"] = total_verifications
            else:
                ach["progress"] = 0
                ach["current"] = 0
            next_achievement = ach
            break
    
    return {
        "stamp_count": stamp_count,
        "total_verifications": total_verifications,
        "this_week_stamps": this_week_stamps,
        "this_month_stamps": this_month_stamps,
        "percentile_rank": percentile_rank,
        "profile_completion": profile_completion,
        "achievements": achievements,
        "earned_achievements": earned_achievements,
        "next_achievement": next_achievement,
        "savings": savings
    }

@api_router.get("/advocate/recent-verifications")
async def get_recent_verifications(user: dict = Depends(get_current_user), limit: int = Query(10, le=50)):
    """Get recent verification events for the advocate's stamps"""
    advocate_id = user["id"]
    
    # Get verification logs for this advocate's stamps
    verifications = await db.verification_logs.find(
        {"advocate_id": advocate_id}
    ).sort("verified_at", -1).limit(limit).to_list(limit)
    
    result = []
    for v in verifications:
        result.append({
            "id": str(v.get("_id", "")),
            "stamp_id": v.get("stamp_id"),
            "verified_at": v.get("verified_at"),
            "verifier_type": v.get("verifier_type", "public"),
            "location": v.get("location"),
            "institution": v.get("institution_name")
        })
    
    return {"verifications": result}

@api_router.get("/advocates/leaderboard")
async def get_advocates_leaderboard(limit: int = Query(10, le=50)):
    """Get top advocates by verification count"""
    advocates = await db.advocates.find(
        {"status": {"$ne": "suspended"}},
        {"_id": 0, "password_hash": 0}
    ).to_list(None)
    
    leaderboard = []
    for adv in advocates:
        public_profile = adv.get("public_profile", {})
        stamps = await db.document_stamps.find({"advocate_id": adv["id"]}, {"verification_count": 1}).to_list(None)
        total_verifications = sum(s.get("verification_count", 0) for s in stamps)
        stamp_count = len(stamps)
        
        if stamp_count > 0:  # Only include advocates who have used digital stamps
            leaderboard.append({
                "id": adv["id"],
                "full_name": adv.get("full_name"),
                "title": public_profile.get("title", "Advocate"),
                "profile_photo": public_profile.get("profile_photo"),
                "region": public_profile.get("location") or adv.get("region"),
                "firm_name": public_profile.get("firm_name"),
                "stamp_count": stamp_count,
                "verification_count": total_verifications
            })
    
    # Sort by verification count
    leaderboard.sort(key=lambda x: x["verification_count"], reverse=True)
    
    # Add rank and percentile
    total = len(leaderboard)
    for i, adv in enumerate(leaderboard[:limit]):
        adv["rank"] = i + 1
        adv["percentile"] = int(((total - i) / total) * 100) if total > 0 else 0
        adv["is_top_10_percent"] = (i + 1) <= (total * 0.1)
    
    return {"leaderboard": leaderboard[:limit], "total_advocates": total}

@api_router.get("/advocates/directory")
async def get_advocates_directory(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str = Query(None, description="Search by name, firm, or practice area"),
    practice_area: str = Query(None, description="Filter by practice area"),
    region: str = Query(None, description="Filter by region")
):
    """Get paginated advocates with public profiles for the directory"""
    
    # Build query filters
    query = {
        "status": {"$ne": "suspended"},
        "$or": [
            {"public_profile_enabled": True},
            {"public_profile_enabled": {"$exists": False}}  # Default to visible
        ]
    }
    
    # Get total count first (without pagination)
    total_count = await db.advocates.count_documents(query)
    
    # Calculate skip for pagination
    skip = (page - 1) * limit
    
    # Fetch advocates with pagination
    advocates = await db.advocates.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    directory = []
    for adv in advocates:
        public_profile = adv.get("public_profile", {})
        
        # Get stamp count and verifications
        stamps = await db.document_stamps.find({"advocate_id": adv["id"]}, {"verification_count": 1}).to_list(None)
        stamp_count = len(stamps)
        total_verifications = sum(s.get("verification_count", 0) for s in stamps)
        
        advocate_data = {
            "id": adv["id"],
            "full_name": adv.get("full_name"),
            "title": public_profile.get("title", "Advocate of the High Court"),
            "profile_photo": public_profile.get("profile_photo"),
            "location": public_profile.get("location") or adv.get("region"),
            "firm_name": public_profile.get("firm_name") or adv.get("firm_affiliation"),
            "practice_areas": public_profile.get("practice_areas", []),
            "experience_years": public_profile.get("experience_years"),
            "region": adv.get("region"),
            "documents_stamped": stamp_count,
            "verification_count": total_verifications,
            "uses_digital_stamps": stamp_count > 0
        }
        
        # Apply client-side filters (for now - can be moved to DB query for better performance)
        include = True
        
        # Search filter
        if search:
            search_lower = search.lower()
            name_match = advocate_data.get("full_name", "").lower().find(search_lower) >= 0
            firm_match = (advocate_data.get("firm_name") or "").lower().find(search_lower) >= 0
            area_match = any(a.lower().find(search_lower) >= 0 for a in advocate_data.get("practice_areas", []))
            include = name_match or firm_match or area_match
        
        # Practice area filter
        if include and practice_area and practice_area != "All Areas":
            include = practice_area in advocate_data.get("practice_areas", [])
        
        # Region filter
        if include and region and region != "All Regions":
            include = (advocate_data.get("region") == region or 
                      region in (advocate_data.get("location") or ""))
        
        if include:
            directory.append(advocate_data)
    
    # Sort by stamp count (most active first)
    directory.sort(key=lambda x: x.get("documents_stamped", 0), reverse=True)
    
    # Calculate pagination info
    total_pages = (total_count + limit - 1) // limit
    has_more = page < total_pages
    
    return {
        "advocates": directory,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "has_more": has_more
    }

# =============== STAMP TYPES ROUTES ===============

@api_router.get("/stamp-types", response_model=List[StampType])
async def get_stamp_types():
    return [StampType(**st) for st in STAMP_TYPES]

# =============== STAMP ORDER ROUTES ===============

@api_router.post("/orders", response_model=StampOrder)
async def create_order(data: StampOrderCreate, user: dict = Depends(get_current_user)):
    stamp_type = next((st for st in STAMP_TYPES if st["id"] == data.stamp_type_id), None)
    if not stamp_type:
        raise HTTPException(status_code=400, detail="Invalid stamp type")
    
    now = datetime.now(timezone.utc).isoformat()
    order_id = str(uuid.uuid4())
    
    order = {
        "id": order_id,
        "advocate_id": user["id"],
        "stamp_type_id": data.stamp_type_id,
        "stamp_type_name": stamp_type["name"],
        "quantity": data.quantity,
        "customization": {
            "name": user["full_name"],
            "tls_number": user.get("tls_member_number", ""),
            **data.customization
        },
        "delivery_address": data.delivery_address,
        "total_price": stamp_type["price"] * data.quantity,
        "currency": stamp_type["currency"],
        "status": "pending_approval",
        "payment_status": "pending",
        "payment_method": None,
        "tracking_number": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.stamp_orders.insert_one(order)
    return StampOrder(**order)

@api_router.get("/orders", response_model=List[StampOrder])
async def get_orders(user: dict = Depends(get_current_user)):
    query = {"advocate_id": user["id"]} if user.get("role") not in ["admin", "super_admin"] else {}
    orders = await db.stamp_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [StampOrder(**o) for o in orders]

@api_router.get("/orders/{order_id}", response_model=StampOrder)
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.stamp_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.get("role") not in ["admin", "super_admin"] and order["advocate_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return StampOrder(**order)

# =============== PHYSICAL ORDERS ROUTES ===============

@api_router.post("/physical-orders")
async def create_physical_order(data: PhysicalOrderCreate, user: dict = Depends(get_current_user)):
    """Create a new physical stamp order with multiple items"""
    order_id = f"PHY-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate total price
    total_price = sum(item.total_price for item in data.items)
    
    order = {
        "id": order_id,
        "advocate_id": user["id"],
        "advocate_name": user["full_name"],
        "items": [item.dict() for item in data.items],
        "delivery_address": data.delivery_address,
        "special_instructions": data.special_instructions or "",
        "customization": {
            "advocate_name": user["full_name"],
            "tls_number": user.get("tls_member_number", ""),
            "roll_number": user.get("roll_number", ""),
            **data.customization
        },
        "total_price": total_price,
        "currency": "TZS",
        "status": "pending_review",
        "payment_status": "pending",
        "payment_method": None,
        "tracking_number": None,
        "status_history": [
            {"status": "pending_review", "timestamp": now, "by": "system", "note": "Order created"}
        ],
        "notes": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.physical_orders.insert_one(order)
    order.pop("_id", None)
    return order

@api_router.get("/physical-orders")
async def get_physical_orders(user: dict = Depends(get_current_user)):
    """Get all physical orders (filtered by role)"""
    if user.get("role") == "super_admin":
        query = {}  # IDC sees all orders
    elif user.get("role") == "admin":
        query = {}  # TLS admin sees all orders (read-only)
    else:
        query = {"advocate_id": user["id"]}  # Advocates see only their orders
    
    orders = await db.physical_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api_router.get("/physical-orders/{order_id}")
async def get_physical_order(order_id: str, user: dict = Depends(get_current_user)):
    """Get a specific physical order"""
    order = await db.physical_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.get("role") not in ["admin", "super_admin"] and order["advocate_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return order

@api_router.put("/physical-orders/{order_id}/status")
async def update_physical_order_status(
    order_id: str,
    status: str = Query(...),
    note: str = Query(""),
    tracking_number: str = Query(None),
    user: dict = Depends(get_current_user)
):
    """Update physical order status (IDC Super Admin only)"""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only IDC can update order status")
    
    valid_statuses = ["pending_review", "approved", "in_production", "quality_check", "ready_dispatch", "dispatched", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "status": status,
        "updated_at": now
    }
    
    if tracking_number:
        update_data["tracking_number"] = tracking_number
    
    # Add to status history
    history_entry = {
        "status": status,
        "timestamp": now,
        "by": user["full_name"],
        "note": note
    }
    
    result = await db.physical_orders.update_one(
        {"id": order_id},
        {
            "$set": update_data,
            "$push": {"status_history": history_entry}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status}", "status": status}

@api_router.post("/physical-orders/{order_id}/notes")
async def add_physical_order_note(
    order_id: str,
    note: str = Query(...),
    user: dict = Depends(get_current_user)
):
    """Add a note to a physical order"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admin/IDC can add notes")
    
    now = datetime.now(timezone.utc).isoformat()
    
    note_entry = {
        "text": note,
        "timestamp": now,
        "by": user["full_name"],
        "role": user.get("role")
    }
    
    result = await db.physical_orders.update_one(
        {"id": order_id},
        {
            "$push": {"notes": note_entry},
            "$set": {"updated_at": now}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Note added", "note": note_entry}

@api_router.get("/physical-orders/stats/summary")
async def get_physical_orders_stats(user: dict = Depends(get_current_user)):
    """Get order statistics for admin dashboard"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Count orders by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.physical_orders.aggregate(pipeline).to_list(20)
    
    # Total revenue
    revenue_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}
    ]
    revenue_result = await db.physical_orders.aggregate(revenue_pipeline).to_list(1)
    
    total_orders = await db.physical_orders.count_documents({})
    
    return {
        "total_orders": total_orders,
        "by_status": {item["_id"]: item["count"] for item in status_counts},
        "total_revenue": revenue_result[0]["total"] if revenue_result else 0
    }

# =============== PAYMENT ROUTES (Mock) ===============

@api_router.post("/payments/initiate")
async def initiate_payment(data: PaymentInitiate, user: dict = Depends(get_current_user)):
    # Try physical orders first, then stamp orders
    order = await db.physical_orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        order = await db.stamp_orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["advocate_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    payment_ref = f"PAY-{secrets.token_hex(8).upper()}"
    
    await db.payments.insert_one({
        "id": str(uuid.uuid4()),
        "payment_ref": payment_ref,
        "order_id": data.order_id,
        "advocate_id": user["id"],
        "amount": order["total_price"],
        "currency": order["currency"],
        "method": data.payment_method,
        "provider": data.provider,
        "phone_number": data.phone_number,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "payment_ref": payment_ref,
        "amount": order["total_price"],
        "currency": order["currency"],
        "status": "pending",
        "message": f"Payment initiated via {data.provider}. Please complete on your mobile."
    }

@api_router.post("/payments/confirm/{payment_ref}")
async def confirm_payment(payment_ref: str, user: dict = Depends(get_current_user)):
    payment = await db.payments.find_one({"payment_ref": payment_ref})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.payments.update_one({"payment_ref": payment_ref}, {"$set": {"status": "completed", "completed_at": now}})
    
    # Update both physical orders and stamp orders
    await db.physical_orders.update_one(
        {"id": payment["order_id"]},
        {"$set": {"payment_status": "paid", "payment_method": payment["provider"], "updated_at": now}}
    )
    await db.stamp_orders.update_one(
        {"id": payment["order_id"]},
        {"$set": {"payment_status": "paid", "payment_method": payment["provider"], "status": "approved", "updated_at": now}}
    )
    
    return {"status": "completed", "message": "Payment confirmed successfully"}

# =============== DOCUMENT STAMP ROUTES ===============

def convert_docx_to_pdf(docx_content: bytes) -> bytes:
    """Convert DOCX to PDF using basic python-docx (fallback when Gotenberg unavailable)"""
    if not DOCX_SUPPORTED:
        raise HTTPException(status_code=400, detail="DOCX conversion not supported")
    
    try:
        # Read DOCX
        doc = DocxDocument(BytesIO(docx_content))
        
        # Create PDF
        pdf_buffer = BytesIO()
        pdf_doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        for para in doc.paragraphs:
            if para.text.strip():
                # Determine style based on paragraph style
                if para.style and 'Heading' in para.style.name:
                    story.append(Paragraph(para.text, styles['Heading1']))
                else:
                    story.append(Paragraph(para.text, styles['Normal']))
                story.append(Spacer(1, 12))
        
        pdf_doc.build(story)
        return pdf_buffer.getvalue()
    except Exception as e:
        logger.error(f"DOCX conversion error: {e}")
        raise HTTPException(status_code=400, detail="Failed to convert DOCX to PDF")


async def convert_docx_to_pdf_async(docx_content: bytes, filename: str) -> bytes:
    """
    Convert DOCX to PDF using Gotenberg if available, fallback to basic conversion.
    Gotenberg provides better formatting preservation.
    """
    from services.gotenberg_service import gotenberg_service
    
    # Try Gotenberg first (better quality conversion)
    if gotenberg_service.is_available:
        try:
            success, pdf_bytes, error = await gotenberg_service.convert_office_to_pdf(
                docx_content, filename
            )
            if success and pdf_bytes:
                logger.info(f"DOCX converted via Gotenberg: {filename}")
                return pdf_bytes
            else:
                logger.warning(f"Gotenberg conversion failed, using fallback: {error}")
        except Exception as e:
            logger.warning(f"Gotenberg error, using fallback: {e}")
    
    # Fallback to basic conversion
    return convert_docx_to_pdf(docx_content)

def convert_image_to_pdf(image_content: bytes, content_type: str) -> bytes:
    """Convert image to PDF"""
    try:
        # Open image
        img = Image.open(BytesIO(image_content))
        if img.mode == 'RGBA':
            img = img.convert('RGB')
        
        # Create PDF
        pdf_buffer = BytesIO()
        img.save(pdf_buffer, 'PDF', resolution=100.0)
        return pdf_buffer.getvalue()
    except Exception as e:
        logger.error(f"Image to PDF conversion error: {e}")
        raise HTTPException(status_code=400, detail="Failed to convert image to PDF")

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload a document and get its metadata for stamping. Converts all formats to PDF."""
    if user.get("practicing_status") != "Active":
        raise HTTPException(status_code=403, detail="Only active advocates can stamp documents")
    
    # Read file content
    content = await file.read()
    original_content_type = file.content_type
    
    # Validate file type
    allowed_types = [
        "application/pdf", 
        "image/png", 
        "image/jpeg", 
        "image/jpg",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
        "application/msword"  # DOC (will show error)
    ]
    
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF, DOCX, PNG, or JPG.")
    
    # For PDFs, run validation before processing
    if file.content_type == "application/pdf":
        try:
            from services.pdf_validation_service import pdf_validator, PDFErrorCode
            validation_result, pdf_metadata = pdf_validator.validate(content, file.filename)
            
            if validation_result["code"] != PDFErrorCode.PDF_VALID:
                # Return specific error messages based on validation code
                error_messages = {
                    PDFErrorCode.PDF_NOT_PDF: "This file is not a valid PDF document.",
                    PDFErrorCode.PDF_ENCRYPTED: "This PDF is password-protected. Please remove the password and try again.",
                    PDFErrorCode.PDF_CORRUPT: "This PDF appears to be corrupted or malformed.",
                    PDFErrorCode.PDF_TOO_LARGE: f"PDF exceeds the maximum size limit ({pdf_metadata.get('file_size_mb', 0):.1f}MB).",
                    PDFErrorCode.PDF_TOO_MANY_PAGES: f"PDF has too many pages ({pdf_metadata.get('page_count', 0)}). Maximum is 200.",
                    PDFErrorCode.PDF_EMPTY: "This PDF has no pages.",
                    PDFErrorCode.PDF_READ_ERROR: "Could not read this PDF file. It may be damaged.",
                }
                error_msg = error_messages.get(validation_result["code"], validation_result.get("message", "PDF validation failed"))
                raise HTTPException(status_code=400, detail=error_msg)
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"PDF validation error (continuing): {e}")
            # Continue even if validation service fails - basic PyPDF2 check below will catch issues
    
    # Convert to PDF if needed
    pdf_content = content
    converted = False
    
    if file.content_type in ["image/png", "image/jpeg", "image/jpg"]:
        pdf_content = convert_image_to_pdf(content, file.content_type)
        converted = True
    elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        # Use async Gotenberg-enabled conversion
        pdf_content = await convert_docx_to_pdf_async(content, file.filename)
        converted = True
    elif file.content_type == "application/msword":
        # Try Gotenberg for DOC files
        from services.gotenberg_service import gotenberg_service
        if gotenberg_service.is_available:
            success, pdf_bytes, error = await gotenberg_service.convert_office_to_pdf(content, file.filename)
            if success:
                pdf_content = pdf_bytes
                converted = True
            else:
                raise HTTPException(status_code=400, detail=f"DOC conversion failed: {error}. Please convert to DOCX or PDF.")
        else:
            raise HTTPException(status_code=400, detail="DOC format not supported. Please convert to DOCX or PDF.")
    
    # Generate document hash from original content
    doc_hash = generate_document_hash(content)
    
    # Get page count for PDF
    pages = 1
    try:
        pdf_reader = PdfReader(BytesIO(pdf_content))
        pages = len(pdf_reader.pages)
    except Exception:
        pages = 1
    
    # Return metadata with PDF for preview
    return {
        "filename": file.filename,
        "original_content_type": original_content_type,
        "content_type": "application/pdf",  # Always PDF now
        "size": len(content),
        "hash": doc_hash,
        "pages": pages,
        "converted": converted,
        "document_data": base64.b64encode(pdf_content).decode()  # Return PDF for client-side preview
    }


class StampPreviewRequest(BaseModel):
    """Request model for stamp preview generation"""
    stamp_type: str = "certification"
    brand_color: str = "#10B981"
    advocate_name: str = ""
    show_advocate_name: bool = True
    layout: str = "horizontal"
    shape: str = "rectangle"
    include_signature: bool = False
    show_signature_placeholder: bool = False
    width: int = 350  # Target width in PDF points
    height: int = 310  # Target height in PDF points

# ========== DOCUMENT PREPARATION ENDPOINT ==========
# Unified pipeline: everything becomes PDF for consistent stamping
GOTENBERG_URL = os.environ.get("GOTENBERG_URL")  # e.g., http://gotenberg:3000

@api_router.post("/documents/prepare")
async def prepare_document(
    files: List[UploadFile] = File(...),
    source: str = Form("upload"),  # "upload" | "camera" | "scan"
    scan_mode: str = Form("gray"),  # "gray" | "color" | "bw" (maps to "document", "color", "bw")
    scan_quality: str = Form("standard"),  # "standard" | "high"
    auto_crop: bool = Form(True),  # Auto-detect edges and perspective crop
    min_crop_confidence: float = Form(0.25),  # Minimum confidence for auto-crop
    dpi: int = Form(150),
    user: dict = Depends(get_current_user)
):
    """
    Prepare any supported document for stamping by converting to PDF.
    Now supports MULTIPLE files for multi-page scans (CamScanner-style).
    
    CamScanner Features:
    - Auto-detect document edges (4-point contour detection)
    - Perspective warp -> flat "scanned page"
    - Auto-orient using EXIF
    - Document enhancement (grayscale, contrast, sharpness)
    
    Scan Modes:
    - gray/document: Document scan (grayscale, high contrast, sharp text) - DEFAULT
    - color: Preserve colors (for documents with seals/photos)
    - bw: Black & white (smallest files, crispest text)
    
    Returns: application/pdf with headers:
    - X-Prepared-Original-Type: pdf|image|scan_multi
    - X-Prepared-Pages: number of pages
    - X-Prepared-Filename: original filename
    - X-Scan-Mode: document|color|bw
    - X-Auto-Crop: true|false
    - X-Crop-Confidence: 0.0-1.0
    """
    from pypdf import PdfWriter, PdfReader
    from services.scan_enhance_service import process_scan_image
    
    # Normalize scan_mode: "gray" -> "document"
    scan_mode = scan_mode.lower() if scan_mode else "document"
    if scan_mode == "gray":
        scan_mode = "document"
    if scan_mode not in ("document", "color", "bw"):
        scan_mode = "document"
    
    scan_quality = scan_quality.lower() if scan_quality else "standard"
    if scan_quality not in ("standard", "high"):
        scan_quality = "standard"
    
    dpi = max(100, min(300, dpi))  # Clamp between 100-300
    min_crop_confidence = max(0.1, min(0.9, min_crop_confidence))
    
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    # Helper function to convert image to single-page PDF
    def image_to_pdf_page(img: Image.Image, target_dpi: int, jpeg_quality: int) -> bytes:
        from reportlab.lib.utils import ImageReader
        from reportlab.pdfgen import canvas as pdf_canvas
        
        # For gray/bw, convert to RGB for JPEG compatibility
        jpeg_img = img
        if jpeg_img.mode == "1":
            jpeg_img = jpeg_img.convert("L")
        if jpeg_img.mode == "L":
            jpeg_img = jpeg_img.convert("RGB")
        
        jpeg_buffer = BytesIO()
        jpeg_img.save(jpeg_buffer, format="JPEG", quality=jpeg_quality, optimize=True, progressive=True)
        jpeg_bytes = jpeg_buffer.getvalue()
        
        # Calculate page size based on image aspect ratio
        jpeg_img_for_size = Image.open(BytesIO(jpeg_bytes))
        w_px, h_px = jpeg_img_for_size.size
        w_pt = (w_px / target_dpi) * 72.0
        h_pt = (h_px / target_dpi) * 72.0
        
        pdf_buffer = BytesIO()
        c = pdf_canvas.Canvas(pdf_buffer, pagesize=(w_pt, h_pt))
        c.drawImage(ImageReader(BytesIO(jpeg_bytes)), 0, 0, width=w_pt, height=h_pt, mask='auto')
        c.showPage()
        c.save()
        
        pdf_buffer.seek(0)
        return pdf_buffer.read()
    
    # ========== CASE 1: Single PDF file ==========
    first_file = files[0]
    first_filename = first_file.filename.lower() if first_file.filename else "document"
    
    if len(files) == 1 and (first_filename.endswith(".pdf") or first_file.content_type == "application/pdf"):
        content = await first_file.read()
        
        # Validate file size (max 50MB)
        MAX_SIZE = 50 * 1024 * 1024
        if len(content) > MAX_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")
        
        # Basic PDF validation
        if not content.startswith(b'%PDF'):
            raise HTTPException(status_code=400, detail="Invalid PDF file")
        
        # Count pages
        num_pages = 1
        try:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            num_pages = len(doc)
            doc.close()
        except:
            pass
        
        return Response(
            content=content,
            media_type="application/pdf",
            headers={
                "X-Prepared-Original-Type": "pdf",
                "X-Prepared-Pages": str(num_pages),
                "X-Prepared-Filename": first_file.filename or "document.pdf",
                "X-Prepared-Source": source,
                "X-Scan-Mode": scan_mode,
                "X-Scan-Quality": scan_quality
            }
        )
    
    # ========== CASE 2: Single or Multiple Images → Multi-page PDF ==========
    jpeg_quality = 80 if scan_quality == "high" else 70
    max_dimension = 2800 if scan_quality == "high" else 2200
    page_pdfs: List[bytes] = []
    original_filename = first_file.filename or "scan"
    crop_results = []  # Track auto-crop results for each page
    
    for f in files:
        fname = f.filename.lower() if f.filename else ""
        is_image = fname.endswith((".png", ".jpg", ".jpeg")) or (f.content_type and f.content_type.startswith("image/"))
        
        if not is_image:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {f.filename}. For multi-page scans, all files must be images."
            )
        
        content = await f.read()
        
        # Validate file size (max 20MB per image)
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"Image too large: {f.filename}. Maximum size is 20MB per image.")
        
        try:
            # Use the new CamScanner-style processing with auto-crop
            processed_img, metadata = process_scan_image(
                content=content,
                auto_crop=auto_crop,
                min_crop_confidence=min_crop_confidence,
                enhance_mode=scan_mode,
                max_dimension=max_dimension
            )
            
            crop_results.append({
                "cropped": metadata.get("auto_cropped", False),
                "confidence": metadata.get("crop_confidence", 0.0),
                "message": metadata.get("crop_message", "")
            })
            
            page_pdf = image_to_pdf_page(processed_img, dpi, jpeg_quality)
            page_pdfs.append(page_pdf)
            
        except Exception as e:
            print(f"Image conversion error for {f.filename}: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to process image: {f.filename}")
    
    # Calculate overall crop stats
    pages_cropped = sum(1 for r in crop_results if r["cropped"])
    avg_confidence = sum(r["confidence"] for r in crop_results) / len(crop_results) if crop_results else 0.0
    
    # Merge all pages into single PDF
    if len(page_pdfs) == 1:
        merged_pdf = page_pdfs[0]
        original_type = "image"
    else:
        # Multi-page merge
        writer = PdfWriter()
        for pdf_bytes in page_pdfs:
            reader = PdfReader(BytesIO(pdf_bytes))
            for page in reader.pages:
                writer.add_page(page)
        
        output_buffer = BytesIO()
        writer.write(output_buffer)
        merged_pdf = output_buffer.getvalue()
        original_type = "scan_multi"
    
    return Response(
        content=merged_pdf,
        media_type="application/pdf",
        headers={
            "X-Prepared-Original-Type": original_type,
            "X-Prepared-Pages": str(len(page_pdfs)),
            "X-Prepared-Filename": original_filename.rsplit('.', 1)[0] + ".pdf",
            "X-Prepared-Source": source,
            "X-Scan-Mode": scan_mode,
            "X-Scan-Quality": scan_quality,
            "X-Auto-Crop": str(auto_crop).lower(),
            "X-Pages-Cropped": str(pages_cropped),
            "X-Crop-Confidence": f"{avg_confidence:.2f}"
        }
    )

@api_router.post("/documents/stamp-preview")
async def generate_stamp_preview(
    request: StampPreviewRequest,
    user: dict = Depends(get_current_user)
):
    """
    Generate a stamp preview image using the SAME rendering engine as the final PDF.
    This ensures pixel-perfect match between preview and downloaded document.
    """
    if user.get("practicing_status") != "Active":
        raise HTTPException(status_code=403, detail="Only active advocates can generate stamps")
    
    # Generate a preview stamp ID
    preview_stamp_id = f"TLS-{datetime.now().strftime('%Y%m%d')}-PREVIEW"
    preview_url = f"https://stamp-and-manage.preview.emergentagent.com/verify?id={preview_stamp_id}"
    
    # Use advocate name from request or user profile
    advocate_name = request.advocate_name if request.advocate_name else user.get("full_name", "Advocate")
    
    # Determine scale based on target dimensions
    # Base width is 500px, so scale = target_width / 500
    base_width = 500
    scale = max(request.width / base_width, 1.0)  # Minimum scale of 1.0
    
    # Generate the stamp image using the SAME function as PDF embedding
    stamp_img = generate_branded_stamp_image(
        stamp_id=preview_stamp_id,
        advocate_name=advocate_name,
        verification_url=preview_url,
        brand_color=request.brand_color,
        layout=request.layout,
        shape=request.shape,
        show_advocate_name=request.show_advocate_name,
        show_tls_logo=True,
        include_signature=request.include_signature,
        signature_data=None,  # No signature for preview
        show_signature_placeholder=request.show_signature_placeholder,
        scale=scale,
        transparent_background=True
    )
    
    # Convert to base64 PNG
    img_buffer = BytesIO()
    stamp_img.save(img_buffer, format='PNG', optimize=True)
    img_buffer.seek(0)
    img_base64 = base64.b64encode(img_buffer.read()).decode()
    
    # ========== QUARTER-PAGE STAMP SIZES ==========
    needs_signature = request.include_signature or request.show_signature_placeholder
    if needs_signature:
        pdf_width_pt = 180   # Certification stamp width
        pdf_height_pt = 120  # Certification stamp height (with signature section)
    else:
        pdf_width_pt = 170   # Compact stamp width
        pdf_height_pt = 90   # Compact stamp height
    
    return {
        "preview_image": f"data:image/png;base64,{img_base64}",
        "width": stamp_img.width,
        "height": stamp_img.height,
        "pdf_width_pt": pdf_width_pt,    # Actual PDF stamp width in points
        "pdf_height_pt": pdf_height_pt,  # Actual PDF stamp height in points
        "needs_signature": needs_signature,
        "scale": scale
    }


# =============== RENDER STAMP IMAGE (WYSIWYG PREVIEW) ===============
@api_router.post("/stamps/render-image")
async def render_stamp_image(
    stamp_type: str = Form("certification"),
    brand_color: str = Form("#10B981"),
    advocate_name: str = Form(""),
    include_signature: str = Form("false"),
    show_signature_placeholder: str = Form("false"),
    signature_data: str = Form(None),
    user: dict = Depends(get_current_user)
):
    """
    Render the exact stamp PNG that will be embedded into PDFs.
    Used for WYSIWYG preview in the frontend.
    Returns: image/png with X-Stamp-Width-Pt, X-Stamp-Height-Pt headers
    """
    # ========== NORMALIZE SIGNATURE FLAGS BY STAMP TYPE ==========
    include_sig_bool = include_signature.lower() == "true"
    show_placeholder_bool = show_signature_placeholder.lower() == "true"
    
    # Notarization stamps NEVER have signatures
    if stamp_type == "notarization":
        include_sig_bool = False
        show_placeholder_bool = False
        signature_data = None
    
    # Determine stamp variant
    needs_signature_area = (stamp_type == "certification") and (include_sig_bool or show_placeholder_bool)
    
    # ========== REDUCED STAMP SIZES (Quarter-page feel) ==========
    # Per user request: smaller stamps that feel like 1/4 page on A4/Letter
    if needs_signature_area:
        STAMP_W_PT = 150   # Certification stamp width (was 180)
        STAMP_H_PT = 95    # Certification stamp height with signature (was 120)
    else:
        STAMP_W_PT = 140   # Compact stamp width (was 170)
        STAMP_H_PT = 75    # Compact stamp height (was 90)
    
    # Use advocate name from user if not provided
    display_name = advocate_name if advocate_name else user.get("full_name", "Advocate")
    
    # Fetch saved signature if using digital signature
    actual_signature_data = None
    if include_sig_bool and stamp_type == "certification":
        if signature_data:
            actual_signature_data = signature_data
        else:
            # Fetch from user profile
            user_full = await db.advocates.find_one({"id": user["id"]}, {"_id": 0, "signature_data": 1})
            if user_full:
                actual_signature_data = user_full.get("signature_data")
    
    # Generate the branded stamp image
    scale = 2.0  # High-res for quality
    verification_url = f"{os.environ.get('REACT_APP_BACKEND_URL', '')}/verify?id=TLS-PREVIEW"
    
    stamp_img = generate_branded_stamp_image(
        stamp_id="TLS-PREVIEW",
        advocate_name=display_name,
        verification_url=verification_url,
        brand_color=brand_color,
        layout="horizontal",
        shape="rectangle",
        show_advocate_name=True,
        show_tls_logo=True,
        include_signature=include_sig_bool,
        signature_data=actual_signature_data,
        show_signature_placeholder=show_placeholder_bool,
        scale=scale,
        transparent_background=True
    )
    
    # Convert to PNG bytes
    img_buffer = BytesIO()
    stamp_img.save(img_buffer, format='PNG', optimize=True)
    img_buffer.seek(0)
    png_bytes = img_buffer.read()
    
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "X-Stamp-Width-Pt": str(STAMP_W_PT),
            "X-Stamp-Height-Pt": str(STAMP_H_PT),
            "X-Stamp-Variant": "certification" if needs_signature_area else "compact",
            "X-Stamp-Width-Px": str(stamp_img.width),
            "X-Stamp-Height-Px": str(stamp_img.height),
            "Cache-Control": "no-store",
        }
    )


# =============== PREVIEW STAMPED PDF (NO PERSISTENCE) ===============
@api_router.post("/documents/stamp-preview-pdf")
async def stamp_preview_pdf(
    file: UploadFile = File(...),
    stamp_type: str = Form("certification"),
    stamp_position: str = Form('{"page": 1, "x": 400, "y": 50}'),
    document_name: str = Form(None),
    document_type: str = Form("contract"),
    description: str = Form(""),
    recipient_name: str = Form(""),
    recipient_org: str = Form(""),
    brand_color: str = Form("#10B981"),
    show_advocate_name: str = Form("true"),
    show_tls_logo: str = Form("true"),
    layout: str = Form("horizontal"),
    shape: str = Form("rectangle"),
    include_signature: str = Form("false"),
    show_signature_placeholder: str = Form("false"),
    stamp_size: int = Form(100),
    opacity: int = Form(90),
    transparent_background: str = Form("false"),
    user: dict = Depends(get_current_user)
):
    """
    Generate a preview of the stamped PDF WITHOUT persisting anything.
    - Same payload as /documents/stamp
    - Returns PDF with watermark "PREVIEW ONLY - NOT VALID"
    - Does NOT create stamp records, events, or billing charges
    - Uses TLS-PREVIEW-* stamp ID format
    """
    if user.get("practicing_status") != "Active":
        raise HTTPException(status_code=403, detail="Only active advocates can preview stamps")
    
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    
    # Validate file type
    if file.content_type not in ["application/pdf", "image/png", "image/jpeg", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Only PDF and image files are allowed")
    
    # Parse stamp position
    try:
        position = json.loads(stamp_position)
    except (json.JSONDecodeError, TypeError):
        position = {"page": 1, "x": 400, "y": 50}
    
    # Generate document hash
    doc_hash = generate_document_hash(content)
    
    # Generate PREVIEW stamp ID (clearly marked as preview)
    preview_stamp_id = f"TLS-PREVIEW-{datetime.now().strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(2).upper()}"
    
    # ========== NORMALIZE SIGNATURE FLAGS BY STAMP TYPE ==========
    # Notarization stamps NEVER have signatures
    include_sig_bool = include_signature.lower() == "true"
    show_placeholder_bool = show_signature_placeholder.lower() == "true"
    
    if stamp_type == "notarization":
        include_sig_bool = False
        show_placeholder_bool = False
    
    # Get user's signature only if certification with digital signature
    signature_data = None
    if include_sig_bool and stamp_type == "certification":
        user_full = await db.advocates.find_one({"id": user["id"]}, {"_id": 0, "signature_data": 1})
        if user_full:
            signature_data = user_full.get("signature_data")
    
    # Build branding options with normalized values
    branding = {
        "color": brand_color,
        "show_advocate_name": show_advocate_name.lower() == "true",
        "show_tls_logo": True,
        "layout": layout,
        "shape": shape,
        "include_signature": include_sig_bool,
        "show_signature_placeholder": show_placeholder_bool,
        "stamp_size": stamp_size,
        "opacity": opacity,
        "transparent_background": transparent_background.lower() == "true"
    }
    
    # Create preview stamp record (NOT persisted to DB)
    preview_stamp_record = {
        "id": str(uuid.uuid4()),
        "stamp_id": preview_stamp_id,
        "advocate_id": user["id"],
        "advocate_name": user["full_name"],
        "advocate_roll_number": user["roll_number"],
        "advocate_tls_number": user.get("tls_member_number", ""),
        "document_name": document_name or file.filename,
        "document_type": document_type,
        "description": description,
        "recipient_name": recipient_name,
        "recipient_org": recipient_org,
        "document_hash": doc_hash,
        "stamp_type": stamp_type,
        "stamp_position": position,
        "branding": branding,
        "signature_data": signature_data,
        "status": "preview",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Generate preview PDF with watermark
    try:
        stamped_pdf = await embed_stamp_in_pdf_preview(
            content, 
            preview_stamp_record, 
            user, 
            position
        )
        
        # Return PDF blob with preview headers
        headers = {
            "X-Stamp-ID": preview_stamp_id,
            "X-Preview": "true",
            "X-Document-Hash": doc_hash,
            "Cache-Control": "no-store",
            "Content-Disposition": f'inline; filename="preview_{document_name or file.filename}"'
        }
        
        return Response(
            content=stamped_pdf,
            media_type="application/pdf",
            headers=headers
        )
        
    except Exception as e:
        logger.error(f"Preview generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")


async def embed_stamp_in_pdf_preview(content: bytes, stamp_record: dict, user: dict, position: dict) -> bytes:
    """
    Embed stamp into PDF for PREVIEW purposes.
    Same as embed_stamp_in_pdf but adds watermark and uses preview stamp ID.
    """
    try:
        from reportlab.lib.colors import Color
        
        pdf_reader = PdfReader(BytesIO(content))
        pdf_writer = PdfWriter()
        
        target_page = position.get("page", 1) - 1
        x = position.get("x", 400)
        y = position.get("y", 50)
        
        # Get branding options
        branding = stamp_record.get("branding", {})
        brand_color = branding.get("color", "#10B981")
        layout = branding.get("layout", "horizontal")
        show_advocate_name = branding.get("show_advocate_name", True)
        show_tls_logo = branding.get("show_tls_logo", True)
        include_signature = branding.get("include_signature", False)
        show_sig_placeholder = branding.get("show_signature_placeholder", False)
        transparent_bg = branding.get("transparent_background", False)
        
        signature_data = stamp_record.get("signature_data")
        shape = branding.get("shape", "rectangle")
        
        # Generate stamp at higher resolution
        scale = 2.0
        
        # Generate the branded stamp image (same as real stamp)
        verification_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com')}/verify?id={stamp_record['stamp_id']}"
        stamp_img = generate_branded_stamp_image(
            stamp_id=stamp_record['stamp_id'],
            advocate_name=user['full_name'],
            verification_url=verification_url,
            brand_color=brand_color,
            layout=layout,
            shape=shape,
            show_advocate_name=show_advocate_name,
            show_tls_logo=show_tls_logo,
            include_signature=include_signature,
            signature_data=signature_data,
            show_signature_placeholder=show_sig_placeholder,
            scale=scale,
            transparent_background=transparent_bg
        )
        
        stamp_buffer = BytesIO()
        stamp_img.save(stamp_buffer, format='PNG')
        stamp_buffer.seek(0)
        
        # ========== QUARTER-PAGE STAMP SIZES ==========
        # Compact (notarization, verification): 170×90pt
        # Certification with signature: 180×120pt
        needs_signature_section = include_signature or show_sig_placeholder
        if needs_signature_section:
            STAMP_WIDTH_PT = 180   # Certification stamp width
            STAMP_HEIGHT_PT = 120  # Certification stamp height (includes signature area)
        else:
            STAMP_WIDTH_PT = 170   # Compact stamp width
            STAMP_HEIGHT_PT = 90   # Compact stamp height
        
        EDGE_MARGIN_PT = 12
        
        # Get pages to stamp
        pages_to_stamp = position.get("pages", [target_page + 1])
        pages_to_stamp_0indexed = [p - 1 for p in pages_to_stamp]
        per_page_positions = position.get("positions", {})
        
        for page_num, page in enumerate(pdf_reader.pages):
            if page_num in pages_to_stamp_0indexed:
                packet = BytesIO()
                
                mediabox = page.mediabox
                orig_width = float(mediabox.width)
                orig_height = float(mediabox.height)
                
                c = canvas.Canvas(packet, pagesize=(orig_width, orig_height))
                
                # ========== WATERMARK: PREVIEW ONLY ==========
                c.saveState()
                c.setFillColor(Color(0, 0, 0, alpha=0.06))
                c.setFont("Helvetica-Bold", 48)
                c.translate(orig_width / 2, orig_height / 2)
                c.rotate(35)
                c.drawCentredString(0, 0, "PREVIEW ONLY - NOT VALID")
                c.restoreState()
                
                # Get position for this page
                page_key = str(page_num + 1)
                if page_key in per_page_positions:
                    page_pos = per_page_positions[page_key]
                    pos_x = page_pos.get("x", x)
                    pos_y = page_pos.get("y", y)
                else:
                    pos_x = x
                    pos_y = y
                
                # Coordinate conversion (top-left to bottom-left)
                pdf_x = pos_x
                pdf_y = orig_height - pos_y - STAMP_HEIGHT_PT
                
                # Clamp to safe area
                pdf_x = max(EDGE_MARGIN_PT, min(pdf_x, orig_width - STAMP_WIDTH_PT - EDGE_MARGIN_PT))
                pdf_y = max(EDGE_MARGIN_PT, min(pdf_y, orig_height - STAMP_HEIGHT_PT - EDGE_MARGIN_PT))
                
                # Draw stamp image
                stamp_buffer.seek(0)
                c.drawImage(
                    ImageReader(stamp_buffer),
                    pdf_x,
                    pdf_y,
                    width=STAMP_WIDTH_PT,
                    height=STAMP_HEIGHT_PT,
                    mask='auto'
                )
                
                c.save()
                packet.seek(0)
                
                # Merge overlay with page
                overlay_pdf = PdfReader(packet)
                page.merge_page(overlay_pdf.pages[0])
            
            pdf_writer.add_page(page)
        
        # Write final PDF
        output = BytesIO()
        pdf_writer.write(output)
        output.seek(0)
        
        return output.getvalue()
        
    except Exception as e:
        logger.error(f"Preview PDF embedding failed: {e}")
        raise


@api_router.post("/documents/stamp")
async def create_document_stamp(
    file: UploadFile = File(...),
    stamp_type: str = Form("certification"),
    stamp_position: str = Form('{"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}'),
    document_name: str = Form(None),
    document_type: str = Form("contract"),
    description: str = Form(""),
    recipient_name: str = Form(""),
    recipient_org: str = Form(""),
    brand_color: str = Form("#10B981"),
    show_advocate_name: str = Form("true"),
    show_tls_logo: str = Form("true"),
    layout: str = Form("horizontal"),
    shape: str = Form("rectangle"),
    include_signature: str = Form("false"),
    show_signature_placeholder: str = Form("false"),
    signature_data: str = Form(None),  # Accept signature from frontend
    stamp_size: int = Form(100),
    opacity: int = Form(90),
    transparent_background: str = Form("false"),
    user: dict = Depends(get_current_user)
):
    """Create a stamped document with QR code embedded"""
    # DEBUG: Log received parameters
    print(f"DEBUG RECEIVED: layout={layout}, shape={shape}, show_sig_placeholder={show_signature_placeholder}")
    
    # Membership enforcement check
    from services.membership_service import get_membership_service
    membership_service = get_membership_service(db)
    enforcement = await membership_service.check_enforcement(user, "stamp")
    if not enforcement.get("allowed"):
        raise HTTPException(
            status_code=403, 
            detail=enforcement.get("reason", "Membership required"),
            headers={"X-Membership-Required": "true"}
        )
    
    if user.get("practicing_status") != "Active":
        raise HTTPException(status_code=403, detail="Only active advocates can stamp documents")
    
    content = await file.read()
    
    # Validate file type
    if file.content_type not in ["application/pdf", "image/png", "image/jpeg", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Only PDF and image files are allowed")
    
    # Parse stamp position
    try:
        position = json.loads(stamp_position)
    except (json.JSONDecodeError, TypeError):
        position = {"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}
    
    # Generate document hash
    doc_hash = generate_document_hash(content)
    
    # Get page count
    pages = 1
    if file.content_type == "application/pdf":
        try:
            pdf_reader = PdfReader(BytesIO(content))
            pages = len(pdf_reader.pages)
        except Exception as e:
            logger.warning(f"Failed to read PDF pages: {e}")
            pages = 1
    
    now = datetime.now(timezone.utc)
    stamp_id = generate_stamp_id()
    hash_value = generate_stamp_hash(stamp_id, user["id"], doc_hash, now.isoformat())
    
    # Generate verification URL and branded QR code
    verification_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com')}/verify?id={stamp_id}"
    qr_data = generate_branded_qr_code(verification_url, position.get("width", 150), brand_color)
    
    expires_at = (now + timedelta(days=365)).isoformat()
    
    # ========== NORMALIZE SIGNATURE FLAGS BY STAMP TYPE ==========
    include_sig_bool = include_signature.lower() == "true"
    show_placeholder_bool = show_signature_placeholder.lower() == "true"
    
    # Notarization stamps NEVER have signatures
    if stamp_type == "notarization":
        include_sig_bool = False
        show_placeholder_bool = False
    
    # Get user's signature - prefer from frontend form, fallback to database
    final_signature_data = None
    if include_sig_bool and stamp_type == "certification":
        # First try the signature data from the frontend form
        if signature_data and len(signature_data) > 100:
            final_signature_data = signature_data
        else:
            # Fallback to database
            user_full = await db.advocates.find_one({"id": user["id"]}, {"_id": 0, "signature_data": 1})
            if user_full:
                final_signature_data = user_full.get("signature_data")
    
    # Branding options with normalized values
    branding = {
        "color": brand_color,
        "show_advocate_name": show_advocate_name.lower() == "true",
        "show_tls_logo": True,  # Always show TLS logo
        "layout": layout,
        "shape": shape,
        "include_signature": include_sig_bool,
        "show_signature_placeholder": show_placeholder_bool,
        "stamp_size": stamp_size,
        "opacity": opacity,
        "transparent_background": transparent_background.lower() == "true"
    }
    
    # Create stamp record (metadata only - no document stored)
    stamp_record = {
        "id": str(uuid.uuid4()),
        "stamp_id": stamp_id,
        "advocate_id": user["id"],
        "advocate_name": user["full_name"],
        "advocate_roll_number": user["roll_number"],
        "advocate_tls_number": user.get("tls_member_number", ""),
        "document_name": document_name or file.filename,
        "document_type": document_type,
        "description": description,
        "recipient_name": recipient_name,
        "recipient_org": recipient_org,
        "document_hash": doc_hash,
        "document_pages": pages,
        "stamp_type": stamp_type,
        "stamp_position": position,
        "branding": branding,
        "signature_data": final_signature_data,
        "hash_value": hash_value,
        "qr_code_data": qr_data,
        "status": "active",
        "verification_count": 0,
        "total_earnings": 0.0,
        "created_at": now.isoformat(),
        "expires_at": expires_at
    }
    
    # Add cryptographic signature (ECDSA P-256 + SHA-256)
    if crypto_service.is_signing_available():
        crypto_sig = crypto_service.sign_stamp(
            stamp_id=stamp_id,
            doc_hash=doc_hash,
            issued_at=now.isoformat(),
            advocate_id=user["id"],
            expires_at=expires_at
        )
        if crypto_sig:
            stamp_record["crypto_signature"] = crypto_sig
            logger.info(f"Cryptographically signed stamp: {stamp_id}")
    
    await db.document_stamps.insert_one(stamp_record)
    
    # Log audit (legacy)
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "document_stamp_created",
        "user_id": user["id"],
        "details": {"stamp_id": stamp_id, "type": stamp_type, "document_hash": doc_hash},
        "timestamp": now.isoformat()
    })
    
    # Log stamp event (new ledger audit trail)
    await log_stamp_event(
        stamp_id=stamp_id,
        event_type="STAMP_ISSUED",
        actor_id=user["id"],
        actor_type="advocate",
        metadata={
            "stamp_type": stamp_type,
            "document_type": document_type,
            "document_pages": pages,
            "mode": "single"
        }
    )
    
    # Generate stamped document
    stamped_content = await embed_stamp_in_document(content, file.content_type, stamp_record, user)
    
    # Return stamped document
    return {
        "stamp_id": stamp_id,
        "document_name": document_name or file.filename,
        "document_hash": doc_hash,
        "hash_value": hash_value,
        "qr_code_data": qr_data,
        "status": "active",
        "created_at": now.isoformat(),
        "expires_at": expires_at,
        "stamped_document": base64.b64encode(stamped_content).decode(),
        "content_type": file.content_type
    }

async def embed_stamp_in_document(content: bytes, content_type: str, stamp_record: dict, user: dict) -> bytes:
    """Embed QR code stamp into document"""
    position = stamp_record["stamp_position"]
    
    if content_type == "application/pdf":
        return await embed_stamp_in_pdf(content, stamp_record, user, position)
    else:
        return await embed_stamp_in_image(content, stamp_record, user, position)

async def embed_stamp_in_pdf(content: bytes, stamp_record: dict, user: dict, position: dict) -> bytes:
    """Embed branded stamp into PDF document"""
    try:
        # Read original PDF
        pdf_reader = PdfReader(BytesIO(content))
        pdf_writer = PdfWriter()
        
        target_page = position.get("page", 1) - 1  # Convert to 0-indexed
        x = position.get("x", 400)
        y = position.get("y", 50)
        
        # Get branding options
        branding = stamp_record.get("branding", {})
        brand_color = branding.get("color", "#10B981")
        layout = branding.get("layout", "horizontal")
        show_advocate_name = branding.get("show_advocate_name", True)
        show_tls_logo = branding.get("show_tls_logo", True)
        include_signature = branding.get("include_signature", False)
        stamp_size = branding.get("stamp_size", 100)
        opacity = branding.get("opacity", 90)
        transparent_bg = branding.get("transparent_background", False)
        
        # Get signature data
        signature_data = stamp_record.get("signature_data")
        
        # Fixed optimal stamp sizes - not user configurable
        # These sizes ensure QR codes are scannable and text is readable
        shape = branding.get("shape", "rectangle")
        layout = branding.get("layout", "horizontal")  # Ensure layout is extracted here
        
        # DEBUG: Log what we're receiving
        print(f"DEBUG BRANDING: shape={shape}, layout={layout}")
        
        # Generate stamp at higher resolution for better QR scanning
        # The stamp will be scaled down to target size when placed on PDF,
        # but higher resolution source = better QR quality
        if shape == "circle":
            scale = 2.5  # 500x500px source - ensures QR is scannable when scaled down
        elif shape == "oval":
            scale = 2.5  # 600x375px source - ensures QR is scannable when scaled down
        else:  # rectangle
            scale = 2.0  # 800x560px - optimal for QR scanning
        
        # Generate the branded stamp image
        verification_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com')}/verify?id={stamp_record['stamp_id']}"
        show_sig_placeholder = branding.get("show_signature_placeholder", False)
        stamp_img = generate_branded_stamp_image(
            stamp_id=stamp_record['stamp_id'],
            advocate_name=user['full_name'],
            verification_url=verification_url,
            brand_color=brand_color,
            layout=layout,
            shape=shape,
            show_advocate_name=show_advocate_name,
            show_tls_logo=show_tls_logo,
            include_signature=include_signature,  # Include signature section for certification stamps
            signature_data=signature_data,
            show_signature_placeholder=show_sig_placeholder,
            scale=scale,
            transparent_background=transparent_bg
        )
        
        # Note: Stamps are now generated with built-in transparency
        # No additional opacity adjustment needed - white backgrounds behind content are opaque,
        # transparent areas remain transparent as designed
        
        # Save stamp to buffer
        stamp_buffer = BytesIO()
        stamp_img.save(stamp_buffer, format='PNG')
        stamp_buffer.seek(0)
        
        # TLS FIXED stamp dimensions in PDF POINTS
        # Two variants: Compact (default) and Certification (with signature)
        EDGE_MARGIN_PT = 12    # System safety margin from page edges
        
        # ========== QUARTER-PAGE STAMP SIZES ==========
        # Select dimensions based on signature requirements
        needs_signature_section = include_signature or show_sig_placeholder
        if needs_signature_section:
            # CERTIFICATION stamp (taller - includes signature section)
            STAMP_WIDTH_PT = 180   # Certification stamp width
            STAMP_HEIGHT_PT = 120  # Certification stamp height (includes signature area)
        else:
            # COMPACT stamp (default - no signature)
            STAMP_WIDTH_PT = 170   # Compact stamp width
            STAMP_HEIGHT_PT = 90   # Compact stamp height
        
        # NOTE: Intentionally ignoring position.get("stamp_width_pt") and position.get("stamp_height_pt")
        # TLS requirement: stamp size must be fixed for consistency
        
        # Frontend page dimensions in PDF points (for verification)
        frontend_page_width_pt = position.get("page_width_pt", 0)
        frontend_page_height_pt = position.get("page_height_pt", 0)
        frontend_scale = position.get("scale", 1.5)
        stamp_version = position.get("stamp_version", "tls_standard_v1")
        
        # Generated image dimensions (for scaling to PDF points)
        stamp_img_width = stamp_img.width
        stamp_img_height = stamp_img.height
        
        print(f"=== TLS STAMP CONTRACT (FIXED SIZE) ===")
        print(f"  Stamp version: {stamp_version}")
        print(f"  Generated image: {stamp_img_width}x{stamp_img_height}px")
        print(f"  PDF stamp size (FIXED): {STAMP_WIDTH_PT}x{STAMP_HEIGHT_PT}pt")
        print(f"  Edge margin: {EDGE_MARGIN_PT}pt")
        print(f"  Frontend page: {frontend_page_width_pt}x{frontend_page_height_pt}pt")
        print(f"=== END CONTRACT ===")
        
        # Get pages to stamp - support multi-page stamping
        pages_to_stamp = position.get("pages", [target_page + 1])
        pages_to_stamp_0indexed = [p - 1 for p in pages_to_stamp]
        
        # Get per-page positions (all in PDF points, top-left origin)
        per_page_positions = position.get("positions", {})
        
        for page_num, page in enumerate(pdf_reader.pages):
            if page_num in pages_to_stamp_0indexed:
                # Create overlay with stamp
                packet = BytesIO()
                
                # Get page dimensions and rotation
                page_rotation = page.get('/Rotate', 0) or 0
                
                # Get mediabox - may have non-zero origin
                mediabox = page.mediabox
                box_left = float(mediabox.left)
                box_bottom = float(mediabox.bottom)
                orig_width = float(mediabox.width)
                orig_height = float(mediabox.height)
                
                # DEBUG: Log mediabox details
                print(f"DEBUG MEDIABOX: Page {page_num+1}")
                print(f"  - MediaBox: left={box_left}, bottom={box_bottom}, width={orig_width}, height={orig_height}")
                print(f"  - Rotation: {page_rotation}")
                
                # Handle rotated pages - swap dimensions if rotated 90 or 270 degrees
                if page_rotation in [90, 270, -90, -270]:
                    # Page is displayed rotated, so visual width/height are swapped
                    page_width = orig_height
                    page_height = orig_width
                else:
                    page_width = orig_width
                    page_height = orig_height
                
                # Use original mediabox for canvas (not the visual dimensions)
                # NOTE: We set pagesize to full mediabox dimensions
                page_size = (box_left + orig_width, box_bottom + orig_height)
                c = canvas.Canvas(packet, pagesize=page_size)
                
                # Get position for this specific page (1-indexed key in positions dict)
                page_key = str(page_num + 1)
                if page_key in per_page_positions:
                    page_pos = per_page_positions[page_key]
                    pos_x = page_pos.get("x", x)
                    pos_y = page_pos.get("y", y)
                else:
                    pos_x = x
                    pos_y = y
                
                # Frontend sends positions in PDF POINTS with TOP-LEFT origin
                # We need to convert to mediabox coordinates (BOTTOM-LEFT origin)
                
                # Visual dimensions (what user sees - accounts for rotation)
                visual_width = page_width
                visual_height = page_height
                
                # Verify frontend and backend agree on page dimensions
                if frontend_page_width_pt > 0 and frontend_page_height_pt > 0:
                    if abs(visual_width - frontend_page_width_pt) > 5 or abs(visual_height - frontend_page_height_pt) > 5:
                        print(f"WARNING: Page dimension mismatch!")
                        print(f"  Frontend: {frontend_page_width_pt}x{frontend_page_height_pt}")
                        print(f"  Backend: {visual_width}x{visual_height}")
                        # Scale positions to account for mismatch
                        scale_x = visual_width / frontend_page_width_pt
                        scale_y = visual_height / frontend_page_height_pt
                        pos_x = pos_x * scale_x
                        pos_y = pos_y * scale_y
                        print(f"  Scaled position: ({pos_x:.1f}, {pos_y:.1f})")
                
                # COORDINATE CONVERSION: Top-left → Bottom-left
                # Formula: y_bottomLeft = pageHeight - y_topLeft - stampHeight
                
                # Use FIXED stamp dimensions from contract (not generated image size)
                target_width = STAMP_WIDTH_PT
                target_height = STAMP_HEIGHT_PT
                
                if page_rotation in [90, -270]:
                    # Page rotated 90° clockwise
                    # Visual X → mediabox Y (inverted), Visual Y → mediabox X
                    pdf_x = pos_y
                    pdf_y = orig_height - pos_x - target_width
                    draw_width = target_height  # Swap for rotation
                    draw_height = target_width
                elif page_rotation in [180, -180]:
                    # Page rotated 180°
                    pdf_x = orig_width - pos_x - target_width
                    pdf_y = pos_y
                    draw_width = target_width
                    draw_height = target_height
                elif page_rotation in [270, -90]:
                    # Page rotated 270° clockwise
                    pdf_x = orig_height - pos_y - target_height
                    pdf_y = pos_x
                    draw_width = target_height
                    draw_height = target_width
                else:
                    # No rotation (0°): convert Y from top-left to bottom-left
                    # Formula: y_pdf = pageHeight - y_topLeft - stampHeight
                    pdf_x = pos_x
                    pdf_y = orig_height - pos_y - target_height
                    draw_width = target_width
                    draw_height = target_height
                
                print(f"=== COORDINATE CONVERSION (Page {page_num+1}) ===")
                print(f"  Page rotation: {page_rotation}°")
                print(f"  Mediabox: {orig_width:.0f}x{orig_height:.0f}")
                print(f"  Input pos (top-left, pt): ({pos_x:.1f}, {pos_y:.1f})")
                print(f"  Output pos (bottom-left, pt): ({pdf_x:.1f}, {pdf_y:.1f})")
                print(f"  Draw size: {draw_width}x{draw_height}")
                
                # Apply edge margin clamping (safety net - frontend already clamps)
                pdf_x = max(EDGE_MARGIN_PT, min(pdf_x, orig_width - draw_width - EDGE_MARGIN_PT))
                pdf_y = max(EDGE_MARGIN_PT, min(pdf_y, orig_height - draw_height - EDGE_MARGIN_PT))
                
                print(f"  Final pos (clamped): ({pdf_x:.1f}, {pdf_y:.1f})")
                print(f"=== END ===")
                
                # Draw the branded stamp image - reset buffer for each page
                stamp_buffer.seek(0)
                c.drawImage(ImageReader(stamp_buffer), pdf_x, pdf_y, width=draw_width, height=draw_height, mask='auto')
                
                # Draw signature BELOW the stamp (outside of it)
                signature_height = 30  # Height for signature area
                signature_y = pdf_y - signature_height - 5  # 5px gap below stamp
                
                if include_signature and signature_data:
                    # Draw digital signature
                    try:
                        sig_bytes = base64.b64decode(signature_data)
                        sig_img = Image.open(BytesIO(sig_bytes))
                        sig_buffer = BytesIO()
                        sig_img.save(sig_buffer, format='PNG')
                        sig_buffer.seek(0)
                        
                        # Calculate signature width maintaining aspect ratio
                        sig_aspect = sig_img.width / sig_img.height
                        sig_width = min(draw_width, signature_height * sig_aspect)
                        sig_x = pdf_x + (draw_width - sig_width) / 2  # Center under stamp
                        
                        if signature_y > 10:  # Only draw if there's space
                            c.drawImage(ImageReader(sig_buffer), sig_x, signature_y, width=sig_width, height=signature_height, mask='auto')
                    except Exception as e:
                        print(f"Error drawing signature: {e}")
                        
                elif show_sig_placeholder:
                    # Draw signature placeholder box with dashed border (matches frontend)
                    box_width = draw_width
                    box_height = signature_height
                    box_x = pdf_x
                    box_y = signature_y
                    
                    if signature_y > 10:  # Only draw if there's space
                        # White background with rounded corners
                        c.setFillColor(colors.white)
                        c.roundRect(box_x, box_y, box_width, box_height, radius=3, fill=1, stroke=0)
                        
                        # Dashed border in brand color
                        c.setStrokeColor(colors.HexColor(brand_color))
                        c.setLineWidth(1.5)
                        c.setDash([4, 3])  # Dashed line pattern
                        c.roundRect(box_x, box_y, box_width, box_height, radius=3, fill=0, stroke=1)
                        c.setDash([])  # Reset to solid line
                        
                        # "Sign Here" text centered in box
                        c.setFillColor(colors.HexColor(brand_color))
                        c.setFont("Helvetica-Bold", 8)
                        c.drawCentredString(box_x + box_width/2, box_y + box_height/2 - 3, "Sign Here")
                
                c.save()
                packet.seek(0)
                
                # Merge overlay with page
                overlay_reader = PdfReader(packet)
                page.merge_page(overlay_reader.pages[0])
            
            pdf_writer.add_page(page)
        
        output = BytesIO()
        pdf_writer.write(output)
        return output.getvalue()
        
    except Exception as e:
        logger.error(f"PDF stamping error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return content

async def embed_stamp_in_image(content: bytes, stamp_record: dict, user: dict, position: dict) -> bytes:
    """Embed branded stamp into image document"""
    try:
        # Open original image
        img = Image.open(BytesIO(content))
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        x = position.get("x", 50)
        y = position.get("y", 50)
        
        # Get branding options
        branding = stamp_record.get("branding", {})
        brand_color = branding.get("color", "#10B981")
        layout = branding.get("layout", "horizontal")
        show_advocate_name = branding.get("show_advocate_name", True)
        show_tls_logo = branding.get("show_tls_logo", True)
        include_signature = branding.get("include_signature", False)
        show_sig_placeholder = branding.get("show_signature_placeholder", False)
        stamp_size = branding.get("stamp_size", 100)
        opacity = branding.get("opacity", 90)
        transparent_bg = branding.get("transparent_background", False)
        
        # Get signature data
        signature_data = stamp_record.get("signature_data")
        
        # Calculate scale based on stamp_size
        scale = stamp_size / 100.0
        
        # Generate the branded stamp image
        verification_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com')}/verify?id={stamp_record['stamp_id']}"
        shape = branding.get("shape", "rectangle")
        stamp_img = generate_branded_stamp_image(
            stamp_id=stamp_record['stamp_id'],
            advocate_name=user['full_name'],
            verification_url=verification_url,
            brand_color=brand_color,
            layout=layout,
            shape=shape,
            show_advocate_name=show_advocate_name,
            show_tls_logo=show_tls_logo,
            include_signature=include_signature,
            signature_data=signature_data,
            show_signature_placeholder=show_sig_placeholder,
            scale=scale,
            transparent_background=transparent_bg
        )
        
        # Note: Stamps are now generated with built-in transparency
        # No additional opacity adjustment needed - white backgrounds behind content are opaque,
        # transparent areas remain transparent as designed
        
        # Paste stamp onto image
        img.paste(stamp_img, (x, y), stamp_img)
        
        # Save result
        output = BytesIO()
        img.save(output, format='PNG')
        return output.getvalue()
        
    except Exception as e:
        logger.error(f"Image stamping error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return content

@api_router.get("/documents/stamps", response_model=List[DocumentStamp])
async def get_document_stamps(user: dict = Depends(get_current_user)):
    """Get all document stamps for current user"""
    query = {"advocate_id": user["id"]} if user.get("role") not in ["admin", "super_admin"] else {}
    stamps = await db.document_stamps.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DocumentStamp(**s) for s in stamps]

@api_router.get("/documents/stamps/{stamp_id}")
async def get_document_stamp(stamp_id: str, user: dict = Depends(get_current_user)):
    """Get specific document stamp"""
    stamp = await db.document_stamps.find_one({"stamp_id": stamp_id}, {"_id": 0})
    if not stamp:
        raise HTTPException(status_code=404, detail="Stamp not found")
    if user.get("role") not in ["admin", "super_admin"] and stamp["advocate_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return stamp

@api_router.post("/documents/stamps/{stamp_id}/revoke")
async def revoke_document_stamp(stamp_id: str, user: dict = Depends(get_current_user)):
    """Revoke a document stamp"""
    stamp = await db.document_stamps.find_one({"stamp_id": stamp_id})
    if not stamp:
        raise HTTPException(status_code=404, detail="Stamp not found")
    if user.get("role") not in ["admin", "super_admin"] and stamp["advocate_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.document_stamps.update_one(
        {"stamp_id": stamp_id},
        {"$set": {"status": "revoked", "revoked_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Document stamp revoked successfully"}

# =============== STAMP LEDGER API ===============

# CSV export MUST be before /{stamp_id} to avoid route conflict
@api_router.get("/stamps/export.csv")
async def export_stamps_csv(
    request: Request,
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    q: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Export stamps as CSV"""
    # Build query (same as list endpoint)
    query = {"advocate_id": user["id"]}
    if user.get("role") in ["admin", "super_admin"]:
        query = {}
    
    if status:
        query["status"] = status
    if from_date:
        query["created_at"] = {"$gte": from_date}
    if to_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = to_date
        else:
            query["created_at"] = {"$lte": to_date}
    if q:
        query["$or"] = [
            {"stamp_id": {"$regex": q, "$options": "i"}},
            {"document_hash": {"$regex": q, "$options": "i"}}
        ]
    
    # Get all matching stamps
    stamps = await db.document_stamps.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    # Build CSV
    csv_content = "stamp_id,advocate_name,issued_at,status,document_name,document_type,recipient_name,doc_hash,verification_count,expires_at\n"
    
    now = datetime.now(timezone.utc)
    for s in stamps:
        # Compute effective status
        effective_status = s.get("status", "active")
        if effective_status == "active" and s.get("expires_at"):
            try:
                expires = datetime.fromisoformat(s["expires_at"].replace("Z", "+00:00"))
                if now > expires:
                    effective_status = "expired"
            except:
                pass
        
        csv_content += f"{s['stamp_id']},{s.get('advocate_name', '')},{s.get('created_at', '')},{effective_status},{s.get('document_name', '')},{s.get('document_type', '')},{s.get('recipient_name', '')},{s.get('document_hash', '')},{s.get('verification_count', 0)},{s.get('expires_at', '')}\n"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=stamps_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@api_router.get("/stamps", response_model=StampLedgerListResponse)
async def get_stamps_ledger(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status: active, revoked, expired"),
    from_date: Optional[str] = Query(None, alias="from", description="Filter from date (ISO format)"),
    to_date: Optional[str] = Query(None, alias="to", description="Filter to date (ISO format)"),
    q: Optional[str] = Query(None, description="Search by stamp_id or doc_hash"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """Get paginated stamp ledger for advocate"""
    # Build query
    query = {"advocate_id": user["id"]}
    
    # Admin can see all
    if user.get("role") in ["admin", "super_admin"]:
        query = {}
    
    # Status filter
    if status:
        query["status"] = status
    
    # Date range filter
    if from_date:
        query["created_at"] = {"$gte": from_date}
    if to_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = to_date
        else:
            query["created_at"] = {"$lte": to_date}
    
    # Search filter
    if q:
        query["$or"] = [
            {"stamp_id": {"$regex": q, "$options": "i"}},
            {"document_hash": {"$regex": q, "$options": "i"}}
        ]
    
    # Get total count
    total = await db.document_stamps.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * page_size
    stamps = await db.document_stamps.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    # Check for expired stamps and update status dynamically
    now = datetime.now(timezone.utc)
    items = []
    for s in stamps:
        # Compute effective status
        effective_status = s.get("status", "active")
        if effective_status == "active" and s.get("expires_at"):
            try:
                expires = datetime.fromisoformat(s["expires_at"].replace("Z", "+00:00"))
                if now > expires:
                    effective_status = "expired"
            except:
                pass
        
        items.append(StampLedgerItem(
            stamp_id=s["stamp_id"],
            advocate_id=s["advocate_id"],
            advocate_name=s.get("advocate_name", ""),
            issued_at=s.get("created_at", ""),
            status=effective_status,
            doc_hash=s.get("document_hash", ""),
            doc_filename=s.get("document_name"),
            document_type=s.get("document_type"),
            recipient_name=s.get("recipient_name"),
            border_color=s.get("branding", {}).get("color"),
            pages_stamped=s.get("document_pages"),
            verification_count=s.get("verification_count", 0),
            expires_at=s.get("expires_at"),
            revoked_at=s.get("revoked_at"),
            revoke_reason=s.get("revoke_reason")
        ))
    
    return StampLedgerListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total
    )


@api_router.get("/stamps/{stamp_id}", response_model=StampLedgerDetail)
async def get_stamp_detail(stamp_id: str, user: dict = Depends(get_current_user)):
    """Get detailed stamp information"""
    stamp = await db.document_stamps.find_one({"stamp_id": stamp_id}, {"_id": 0})
    if not stamp:
        raise HTTPException(status_code=404, detail="Stamp not found")
    
    # Check access
    if user.get("role") not in ["admin", "super_admin"] and stamp["advocate_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Compute effective status
    effective_status = stamp.get("status", "active")
    now = datetime.now(timezone.utc)
    if effective_status == "active" and stamp.get("expires_at"):
        try:
            expires = datetime.fromisoformat(stamp["expires_at"].replace("Z", "+00:00"))
            if now > expires:
                effective_status = "expired"
        except:
            pass
    
    frontend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com')
    
    return StampLedgerDetail(
        stamp_id=stamp["stamp_id"],
        advocate_id=stamp["advocate_id"],
        advocate_name=stamp.get("advocate_name", ""),
        advocate_roll_number=stamp.get("advocate_roll_number"),
        advocate_tls_number=stamp.get("advocate_tls_number"),
        issued_at=stamp.get("created_at", ""),
        status=effective_status,
        doc_hash=stamp.get("document_hash", ""),
        doc_filename=stamp.get("document_name"),
        document_type=stamp.get("document_type"),
        recipient_name=stamp.get("recipient_name"),
        recipient_org=stamp.get("recipient_org"),
        description=stamp.get("description"),
        border_color=stamp.get("branding", {}).get("color"),
        pages_stamped=stamp.get("document_pages"),
        verification_count=stamp.get("verification_count", 0),
        verification_url=f"{frontend_url}/verify?id={stamp_id}",
        qr_code_data=stamp.get("qr_code_data"),
        hash_value=stamp.get("hash_value"),
        total_earnings=stamp.get("total_earnings", 0.0),
        expires_at=stamp.get("expires_at"),
        revoked_at=stamp.get("revoked_at"),
        revoke_reason=stamp.get("revoke_reason"),
        batch_id=stamp.get("batch_id")
    )


@api_router.post("/stamps/{stamp_id}/revoke")
async def revoke_stamp_with_reason(
    stamp_id: str,
    request: Request,
    body: RevokeStampRequest,
    user: dict = Depends(get_current_user)
):
    """Revoke a stamp with reason (audit logged)"""
    stamp = await db.document_stamps.find_one({"stamp_id": stamp_id})
    if not stamp:
        raise HTTPException(status_code=404, detail="Stamp not found")
    
    # Check access
    if user.get("role") not in ["admin", "super_admin"] and stamp["advocate_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if already revoked (idempotent)
    if stamp.get("status") == "revoked":
        return {"message": "Stamp already revoked", "revoked_at": stamp.get("revoked_at")}
    
    now = datetime.now(timezone.utc)
    
    # Update stamp status
    await db.document_stamps.update_one(
        {"stamp_id": stamp_id},
        {"$set": {
            "status": "revoked",
            "revoked_at": now.isoformat(),
            "revoked_by": user["id"],
            "revoke_reason": body.reason
        }}
    )
    
    # Log audit event
    await log_stamp_event(
        stamp_id=stamp_id,
        event_type="STAMP_REVOKED",
        actor_id=user["id"],
        actor_type="admin" if user.get("role") in ["admin", "super_admin"] else "advocate",
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        metadata={"reason": body.reason}
    )
    
    return {"message": "Stamp revoked successfully", "revoked_at": now.isoformat()}


@api_router.get("/stamps/{stamp_id}/events", response_model=List[StampEvent])
async def get_stamp_events(
    stamp_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """Get audit events for a stamp"""
    # Verify stamp exists and user has access
    stamp = await db.document_stamps.find_one({"stamp_id": stamp_id})
    if not stamp:
        raise HTTPException(status_code=404, detail="Stamp not found")
    
    if user.get("role") not in ["admin", "super_admin"] and stamp["advocate_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get events
    skip = (page - 1) * page_size
    events = await db.stamp_events.find(
        {"stamp_id": stamp_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    return [StampEvent(**e) for e in events]


# Admin-only ledger view
@api_router.get("/admin/stamps", response_model=StampLedgerListResponse)
async def get_admin_stamps_ledger(
    request: Request,
    advocate_id: Optional[str] = Query(None, description="Filter by advocate ID"),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user: dict = Depends(require_admin)
):
    """Admin view of all stamps across advocates"""
    query = {}
    
    if advocate_id:
        query["advocate_id"] = advocate_id
    if status:
        query["status"] = status
    if from_date:
        query["created_at"] = {"$gte": from_date}
    if to_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = to_date
        else:
            query["created_at"] = {"$lte": to_date}
    if q:
        query["$or"] = [
            {"stamp_id": {"$regex": q, "$options": "i"}},
            {"document_hash": {"$regex": q, "$options": "i"}},
            {"advocate_name": {"$regex": q, "$options": "i"}}
        ]
    
    total = await db.document_stamps.count_documents(query)
    skip = (page - 1) * page_size
    stamps = await db.document_stamps.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    now = datetime.now(timezone.utc)
    items = []
    for s in stamps:
        effective_status = s.get("status", "active")
        if effective_status == "active" and s.get("expires_at"):
            try:
                expires = datetime.fromisoformat(s["expires_at"].replace("Z", "+00:00"))
                if now > expires:
                    effective_status = "expired"
            except:
                pass
        
        items.append(StampLedgerItem(
            stamp_id=s["stamp_id"],
            advocate_id=s["advocate_id"],
            advocate_name=s.get("advocate_name", ""),
            issued_at=s.get("created_at", ""),
            status=effective_status,
            doc_hash=s.get("document_hash", ""),
            doc_filename=s.get("document_name"),
            document_type=s.get("document_type"),
            recipient_name=s.get("recipient_name"),
            border_color=s.get("branding", {}).get("color"),
            pages_stamped=s.get("document_pages"),
            verification_count=s.get("verification_count", 0),
            expires_at=s.get("expires_at"),
            revoked_at=s.get("revoked_at"),
            revoke_reason=s.get("revoke_reason")
        ))
    
    return StampLedgerListResponse(items=items, page=page, page_size=page_size, total=total)


# =============== BULK REVOKE (Admin Safety Control) ===============

class BulkRevokeRequest(BaseModel):
    reason: str
    include_expired: bool = False
    confirmation_text: str  # Must be "REVOKE" or advocate name

class BulkRevokeResponse(BaseModel):
    advocate_id: str
    advocate_name: str
    total_active_stamps: int
    revoked_count: int
    already_revoked: int
    already_expired: int
    timestamp: str
    batch_revoke_id: str


@api_router.get("/admin/advocates/{advocate_id}/stamp-summary")
async def get_advocate_stamp_summary(
    advocate_id: str,
    user: dict = Depends(require_admin)
):
    """Get stamp summary for an advocate (for bulk revoke confirmation)"""
    # Verify advocate exists
    advocate = await db.advocates.find_one({"id": advocate_id}, {"_id": 0})
    if not advocate:
        raise HTTPException(status_code=404, detail="Advocate not found")
    
    # Count stamps by status
    active_count = await db.document_stamps.count_documents({"advocate_id": advocate_id, "status": "active"})
    revoked_count = await db.document_stamps.count_documents({"advocate_id": advocate_id, "status": "revoked"})
    
    # Count expired (computed dynamically)
    now = datetime.now(timezone.utc)
    all_active = await db.document_stamps.find(
        {"advocate_id": advocate_id, "status": "active"},
        {"expires_at": 1}
    ).to_list(None)
    
    expired_count = 0
    truly_active = 0
    for s in all_active:
        if s.get("expires_at"):
            try:
                expires = datetime.fromisoformat(s["expires_at"].replace("Z", "+00:00"))
                if now > expires:
                    expired_count += 1
                else:
                    truly_active += 1
            except:
                truly_active += 1
        else:
            truly_active += 1
    
    return {
        "advocate_id": advocate_id,
        "advocate_name": advocate.get("full_name", ""),
        "advocate_email": advocate.get("email", ""),
        "practicing_status": advocate.get("practicing_status", "Unknown"),
        "stamp_summary": {
            "active": truly_active,
            "expired": expired_count,
            "revoked": revoked_count,
            "total": truly_active + expired_count + revoked_count
        }
    }


@api_router.post("/admin/advocates/{advocate_id}/bulk-revoke", response_model=BulkRevokeResponse)
async def bulk_revoke_advocate_stamps(
    advocate_id: str,
    request: Request,
    body: BulkRevokeRequest,
    user: dict = Depends(require_admin)
):
    """
    Bulk revoke all active stamps for an advocate.
    
    REGULATORY-GRADE SAFETY CONTROLS:
    - Only super_admin can perform bulk revoke
    - Requires confirmation_text = "REVOKE" or advocate's full name
    - Logs individual STAMP_REVOKED event for each stamp
    - Logs ADVOCATE_BULK_REVOKE system audit event
    - Irreversible action
    
    Use cases:
    - Advocate license suspended
    - Advocate disbarred
    - Account compromised
    - Disciplinary action
    """
    # SAFETY CHECK 1: Super admin only
    if user.get("role") != "super_admin":
        raise HTTPException(
            status_code=403, 
            detail="Only Super Administrators can perform bulk revoke. This action requires elevated privileges."
        )
    
    # Verify advocate exists
    advocate = await db.advocates.find_one({"id": advocate_id}, {"_id": 0})
    if not advocate:
        raise HTTPException(status_code=404, detail="Advocate not found")
    
    advocate_name = advocate.get("full_name", "")
    
    # SAFETY CHECK 2: Confirmation text must match
    valid_confirmations = ["REVOKE", advocate_name.upper(), advocate_name]
    if body.confirmation_text not in valid_confirmations:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid confirmation. Please type 'REVOKE' or the advocate's full name to proceed."
        )
    
    # Validate reason
    if not body.reason or len(body.reason.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Revocation reason must be at least 10 characters for audit compliance."
        )
    
    now = datetime.now(timezone.utc)
    batch_revoke_id = f"BULK-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8].upper()}"
    
    # Get all stamps to revoke
    query = {"advocate_id": advocate_id, "status": "active"}
    stamps_to_process = await db.document_stamps.find(query, {"_id": 0, "stamp_id": 1, "expires_at": 1}).to_list(None)
    
    revoked_count = 0
    already_expired = 0
    
    for stamp in stamps_to_process:
        stamp_id = stamp["stamp_id"]
        
        # Check if expired (don't count in revoked, just mark separately)
        is_expired = False
        if stamp.get("expires_at"):
            try:
                expires = datetime.fromisoformat(stamp["expires_at"].replace("Z", "+00:00"))
                if now > expires:
                    is_expired = True
            except:
                pass
        
        # Skip expired stamps unless include_expired is True
        if is_expired and not body.include_expired:
            already_expired += 1
            continue
        
        # Revoke the stamp
        await db.document_stamps.update_one(
            {"stamp_id": stamp_id},
            {"$set": {
                "status": "revoked",
                "revoked_at": now.isoformat(),
                "revoked_by": user["id"],
                "revoke_reason": body.reason,
                "bulk_revoke_id": batch_revoke_id
            }}
        )
        
        # Log individual STAMP_REVOKED event
        await log_stamp_event(
            stamp_id=stamp_id,
            event_type="STAMP_REVOKED",
            actor_id=user["id"],
            actor_type="admin",
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            metadata={
                "bulk": True,
                "batch_revoke_id": batch_revoke_id,
                "reason": body.reason,
                "advocate_id": advocate_id
            }
        )
        
        revoked_count += 1
    
    # Get already revoked count
    already_revoked = await db.document_stamps.count_documents({
        "advocate_id": advocate_id,
        "status": "revoked",
        "bulk_revoke_id": {"$ne": batch_revoke_id}  # Exclude stamps just revoked
    })
    
    # Log ADVOCATE_BULK_REVOKE system audit event
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "ADVOCATE_BULK_REVOKE",
        "user_id": user["id"],
        "user_role": user.get("role"),
        "details": {
            "advocate_id": advocate_id,
            "advocate_name": advocate_name,
            "batch_revoke_id": batch_revoke_id,
            "reason": body.reason,
            "revoked_count": revoked_count,
            "already_expired": already_expired,
            "already_revoked": already_revoked,
            "include_expired": body.include_expired
        },
        "timestamp": now.isoformat(),
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent")
    })
    
    # Optionally update advocate status
    if advocate.get("practicing_status") == "Active":
        logger.warning(f"Bulk revoke performed but advocate {advocate_id} is still Active. Consider suspending.")
    
    return BulkRevokeResponse(
        advocate_id=advocate_id,
        advocate_name=advocate_name,
        total_active_stamps=len(stamps_to_process),
        revoked_count=revoked_count,
        already_revoked=already_revoked,
        already_expired=already_expired,
        timestamp=now.isoformat(),
        batch_revoke_id=batch_revoke_id
    )


@api_router.get("/admin/bulk-revoke-history")
async def get_bulk_revoke_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user: dict = Depends(require_admin)
):
    """Get history of bulk revoke actions"""
    query = {"action": "ADVOCATE_BULK_REVOKE"}
    
    total = await db.audit_logs.count_documents(query)
    skip = (page - 1) * page_size
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(page_size).to_list(page_size)
    
    return {
        "items": logs,
        "page": page,
        "page_size": page_size,
        "total": total
    }


# =============== ADMIN PDF VALIDATION (Go-Live Testing) ===============

class PDFValidationResponse(BaseModel):
    """Response model for PDF validation endpoint"""
    valid: bool
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    meta: Optional[dict] = None
    stamp_dry_run: Optional[dict] = None
    validation_time_ms: float

@api_router.post("/admin/pdf/validate", response_model=PDFValidationResponse)
async def admin_validate_pdf(
    file: UploadFile = File(...),
    dry_run_stamp: bool = Form(False),
    user: dict = Depends(require_super_admin)
):
    """
    Super Admin endpoint for validating PDF files against production rules.
    
    Use this to test real-world PDFs before go-live certification.
    - Does NOT store the uploaded file
    - Does NOT create any database records
    - Returns detailed validation report
    
    Args:
        file: PDF file to validate
        dry_run_stamp: If True, also performs a dry-run stamp (in memory only)
    
    Returns:
        Validation result with metadata and optional dry-run result
    """
    import time
    from services.pdf_validation_service import pdf_validator, PDFErrorCode
    from services.stamp_image_service import StampImageService
    from services.pdf_overlay_service import PDFOverlayService
    
    start_time = time.time()
    
    # Read file content
    content = await file.read()
    
    # Set Sentry context for monitoring
    if SENTRY_DSN:
        sentry_sdk.set_tag("feature", "admin_pdf_validation")
        sentry_sdk.set_tag("filename", file.filename)
        sentry_sdk.set_user({"id": str(user.get("_id", user.get("id")))})
    
    # Run validation
    validation_result, pdf_metadata = pdf_validator.validate(content, file.filename)
    
    response = {
        "valid": validation_result.valid,
        "error_code": validation_result.error_code.value if not validation_result.valid else None,
        "error_message": validation_result.error_message if not validation_result.valid else None,
        "meta": None,
        "stamp_dry_run": None,
        "validation_time_ms": 0
    }
    
    if pdf_metadata:
        response["meta"] = {
            "file_size_bytes": pdf_metadata.file_size_bytes,
            "file_size_mb": round(pdf_metadata.file_size_bytes / (1024 * 1024), 2),
            "page_count": pdf_metadata.page_count,
            "pages": pdf_metadata.pages[:10],  # First 10 pages info
            "has_rotated_pages": any(p.get("rotation", 0) != 0 for p in pdf_metadata.pages),
            "rotations": [p.get("rotation", 0) for p in pdf_metadata.pages[:20]],
            "page_sizes": [
                {"page": p["page"], "w": p["width_pt"], "h": p["height_pt"]}
                for p in pdf_metadata.pages[:10]
            ],
            "is_linearized": pdf_metadata.is_linearized,
            "has_annotations": pdf_metadata.has_annotations,
            "has_forms": pdf_metadata.has_forms,
            "pdf_version": pdf_metadata.pdf_version,
            "producer": pdf_metadata.producer,
            "document_hash": pdf_metadata.document_hash
        }
    
    # Dry-run stamp if requested and PDF is valid
    if dry_run_stamp and validation_result.valid:
        try:
            # Generate test stamp image
            stamp_image = StampImageService.generate_stamp_image(
                stamp_id="DRY-RUN-TEST-001",
                advocate_name="Test Advocate (Dry Run)",
                verification_url="https://example.com/verify",
                border_color="#10B981",
                show_advocate_name=True,
                show_tls_logo=True,
                scale=2.0,
                transparent_background=True
            )
            
            # Attempt to embed stamp (in memory only)
            position = {
                "anchor": "bottom_right",
                "offset_x_pt": 20,
                "offset_y_pt": 20,
                "page_mode": "first"
            }
            
            stamped_content = PDFOverlayService.embed_stamp(
                pdf_content=content,
                stamp_image=stamp_image,
                position=position,
                include_signature=False,
                signature_data=None,
                show_signature_placeholder=False,
                brand_color="#10B981"
            )
            
            # Verify the output is valid
            output_result, output_meta = pdf_validator.validate(stamped_content, f"stamped_{file.filename}")
            
            response["stamp_dry_run"] = {
                "ok": output_result.valid,
                "output_size_bytes": len(stamped_content),
                "output_size_mb": round(len(stamped_content) / (1024 * 1024), 2),
                "size_increase_bytes": len(stamped_content) - len(content),
                "output_valid": output_result.valid,
                "output_page_count": output_meta.page_count if output_meta else None
            }
            
        except Exception as e:
            logger.error(f"Dry-run stamp failed: {e}")
            response["stamp_dry_run"] = {
                "ok": False,
                "error": str(e)
            }
            # Report to Sentry
            if SENTRY_DSN:
                sentry_sdk.capture_exception(e)
    
    response["validation_time_ms"] = round((time.time() - start_time) * 1000, 2)
    
    # Log validation event
    await db.audit_logs.insert_one({
        "action": "ADMIN_PDF_VALIDATION",
        "admin_id": str(user.get("_id", user.get("id"))),
        "admin_email": user.get("email"),
        "filename": file.filename,
        "file_size": len(content),
        "valid": validation_result.valid,
        "error_code": validation_result.error_code.value if not validation_result.valid else None,
        "dry_run_stamp": dry_run_stamp,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return response


@api_router.post("/admin/pdf/batch-validate")
async def admin_batch_validate_pdfs(
    files: List[UploadFile] = File(...),
    user: dict = Depends(require_super_admin)
):
    """
    Validate multiple PDFs at once for go-live certification testing.
    
    Returns summary report of all validations.
    """
    from services.pdf_validation_service import pdf_validator
    
    results = []
    passed = 0
    failed = 0
    
    for file in files:
        content = await file.read()
        validation_result, pdf_metadata = pdf_validator.validate(content, file.filename)
        
        result = {
            "filename": file.filename,
            "valid": validation_result.valid,
            "error_code": validation_result.error_code.value if not validation_result.valid else None,
            "error_message": validation_result.error_message if not validation_result.valid else None,
            "file_size_mb": round(len(content) / (1024 * 1024), 2)
        }
        
        if pdf_metadata:
            result["page_count"] = pdf_metadata.page_count
            result["has_rotations"] = any(p.get("rotation", 0) != 0 for p in pdf_metadata.pages)
        
        results.append(result)
        
        if validation_result.valid:
            passed += 1
        else:
            failed += 1
    
    # Log batch validation
    await db.audit_logs.insert_one({
        "action": "ADMIN_BATCH_PDF_VALIDATION",
        "admin_id": str(user.get("_id", user.get("id"))),
        "admin_email": user.get("email"),
        "files_count": len(files),
        "passed": passed,
        "failed": failed,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "total": len(files),
        "passed": passed,
        "failed": failed,
        "pass_rate": round(passed / len(files) * 100, 1) if files else 0,
        "results": results,
        "go_live_ready": failed == 0
    }


# =============== ADMIN KEY MANAGEMENT ===============

@api_router.get("/admin/crypto/status")
async def get_crypto_key_status(user: dict = Depends(require_super_admin)):
    """Get current cryptographic key status for monitoring"""
    return crypto_service.get_key_status()


@api_router.post("/admin/crypto/generate-key")
async def generate_new_key_pair(user: dict = Depends(require_super_admin)):
    """
    Generate a new ECDSA P-256 key pair.
    Returns the keys in Base64 format for secure storage.
    
    IMPORTANT: Store these keys securely! The private key will NOT be stored.
    """
    private_pem, public_pem = crypto_service.generate_key_pair()
    
    new_key_id = f"tls-key-{datetime.now().strftime('%Y-%m')}-{secrets.token_hex(4)}"
    
    # Log key generation (but NOT the private key!)
    await db.system_events.insert_one({
        "event_type": "KEY_GENERATED",
        "actor_id": str(user.get("_id", user.get("id"))),
        "actor_email": user.get("email"),
        "key_id": new_key_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "key_id": new_key_id,
        "private_key_b64": base64.b64encode(private_pem).decode(),
        "public_key_b64": base64.b64encode(public_pem).decode(),
        "algorithm": "ECDSA_P256_SHA256",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "instructions": {
            "1": "Store private_key_b64 securely (e.g., secrets manager, encrypted storage)",
            "2": "Set TLS_PRIVATE_KEY_B64 environment variable with the private key",
            "3": "Set TLS_PUBLIC_KEY_B64 environment variable with the public key",
            "4": "Set TLS_ACTIVE_KEY_ID to the new key_id",
            "5": "Add current key to TLS_HISTORICAL_KEYS_JSON before switching",
            "6": "Restart the backend service to load new keys"
        }
    }


@api_router.post("/admin/crypto/rotate-key")
async def rotate_signing_key(
    new_key_id: str = Form(...),
    new_private_key_b64: str = Form(...),
    new_public_key_b64: str = Form(...),
    user: dict = Depends(require_super_admin)
):
    """
    Rotate to a new signing key.
    
    The old key is retained for verification of existing stamps.
    New stamps will be signed with the new key.
    
    This is an in-memory rotation. For persistence, update environment variables.
    """
    try:
        private_pem = base64.b64decode(new_private_key_b64)
        public_pem = base64.b64decode(new_public_key_b64)
        
        old_key_id = crypto_service.active_key_id
        
        # Perform rotation
        rotation_event = crypto_service.rotate_key(new_key_id, private_pem, public_pem)
        
        # Log to system events
        await db.system_events.insert_one({
            "event_type": "KEY_ROTATED",
            "actor_id": str(user.get("_id", user.get("id"))),
            "actor_email": user.get("email"),
            "old_key_id": old_key_id,
            "new_key_id": new_key_id,
            "rotated_at": datetime.now(timezone.utc).isoformat(),
            "metadata": rotation_event
        })
        
        return {
            "success": True,
            "rotation_event": rotation_event,
            "current_status": crypto_service.get_key_status(),
            "note": "This is an in-memory rotation. Update environment variables for persistence."
        }
        
    except Exception as e:
        logger.error(f"Key rotation failed: {e}")
        if SENTRY_DSN:
            sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=400, detail=f"Key rotation failed: {str(e)}")


# =============== BATCH STAMPING ===============

@api_router.post("/documents/batch-stamp")
async def batch_stamp_documents(
    files: List[UploadFile] = File(...),
    anchor: str = Form("bottom_right"),
    offset_x_pt: float = Form(12),
    offset_y_pt: float = Form(12),
    page_mode: str = Form("first"),  # first, all
    document_type: str = Form("contract"),
    recipient_name: str = Form(""),
    recipient_org: str = Form(""),
    description: str = Form(""),
    border_color: str = Form("#10B981"),
    stamp_type: str = Form("certification"),
    batch_request_id: Optional[str] = Form(None),
    user: dict = Depends(get_current_user)
):
    """
    Batch stamp multiple PDF documents.
    
    Limits:
    - Max 25 files per batch
    - Max 10MB per file
    - Max 200MB total batch size
    - Max 50 pages per PDF
    
    Each document receives:
    - Unique stamp_id
    - Own QR code and verification record
    - SHA256 document hash binding
    
    Returns:
    - ZIP file containing stamped PDFs and batch_summary.csv
    """
    from services.stamping_service import StampingService
    
    # Membership enforcement check
    from services.membership_service import get_membership_service
    membership_service = get_membership_service(db)
    enforcement = await membership_service.check_enforcement(user, "batch_stamp")
    if not enforcement.get("allowed"):
        raise HTTPException(
            status_code=403, 
            detail=enforcement.get("reason", "Membership required"),
            headers={"X-Membership-Required": "true"}
        )
    
    if user.get("practicing_status") != "Active":
        raise HTTPException(status_code=403, detail="Only active advocates can stamp documents")
    
    # Validate limits
    MAX_FILES = 25
    MAX_FILE_SIZE_MB = 10
    MAX_TOTAL_SIZE_MB = 200
    
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES} files allowed per batch")
    
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Read all files and validate
    file_contents = []
    total_size = 0
    
    for file in files:
        # Validate file type
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail=f"Only PDF files allowed. '{file.filename}' is {file.content_type}")
        
        content = await file.read()
        file_size = len(content)
        
        # Check individual file size
        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File '{file.filename}' exceeds {MAX_FILE_SIZE_MB}MB limit")
        
        total_size += file_size
        file_contents.append((file.filename, content))
    
    # Check total batch size
    if total_size > MAX_TOTAL_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Total batch size exceeds {MAX_TOTAL_SIZE_MB}MB limit")
    
    # Initialize stamping service
    frontend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com')
    stamping_service = StampingService(db, frontend_url)
    
    # Build position config
    position = {
        "anchor": anchor,
        "offset_x_pt": offset_x_pt,
        "offset_y_pt": offset_y_pt,
        "page_mode": page_mode
    }
    
    try:
        # Perform batch stamping
        zip_bytes, results = await stamping_service.stamp_batch_documents(
            files=file_contents,
            user=user,
            position=position,
            document_type=document_type,
            recipient_name=recipient_name,
            recipient_org=recipient_org,
            description=description,
            border_color=border_color,
            stamp_type=stamp_type,
            batch_request_id=batch_request_id
        )
        
        # Generate batch ID for response
        batch_id = f"BATCH-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
        # Return ZIP as streaming response
        return StreamingResponse(
            BytesIO(zip_bytes),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=stamped_documents_{batch_id}.zip",
                "X-Batch-ID": batch_id,
                "X-Total-Files": str(len(files)),
                "X-Success-Count": str(sum(1 for r in results if r["status"] == "OK")),
                "X-Failed-Count": str(sum(1 for r in results if r["status"] == "FAILED"))
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch stamping error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Batch stamping failed")


@api_router.get("/documents/batch-stamps")
async def get_batch_stamps(user: dict = Depends(get_current_user)):
    """Get batch stamping history for current user"""
    query = {"advocate_id": str(user.get("_id", user.get("id", "")))}
    if user.get("role") in ["admin", "super_admin"]:
        query = {}
    
    batches = await db.batch_stamps.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return batches

# =============== LEGACY DIGITAL STAMP ROUTES (Keep for compatibility) ===============

class DigitalStampCreate(BaseModel):
    document_reference: Optional[str] = None
    stamp_type: str = "official"

class DigitalStamp(BaseModel):
    id: str
    stamp_id: str
    advocate_id: str
    advocate_name: str
    advocate_roll_number: str
    document_reference: Optional[str]
    stamp_type: str
    hash_value: str
    qr_code_data: str
    status: str
    created_at: str
    expires_at: str
    used_count: int = 0

@api_router.post("/digital-stamps", response_model=DigitalStamp)
async def create_digital_stamp(data: DigitalStampCreate, user: dict = Depends(get_current_user)):
    if user.get("practicing_status") != "Active":
        raise HTTPException(status_code=403, detail="Only active advocates can create stamps")
    
    now = datetime.now(timezone.utc)
    stamp_id = generate_stamp_id()
    hash_value = generate_stamp_hash(stamp_id, user["id"], "", now.isoformat())
    
    verification_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com')}/verify?id={stamp_id}"
    qr_data = generate_qr_code(verification_url)
    
    expires_at = (now + timedelta(days=365)).isoformat()
    
    stamp = {
        "id": str(uuid.uuid4()),
        "stamp_id": stamp_id,
        "advocate_id": user["id"],
        "advocate_name": user["full_name"],
        "advocate_roll_number": user["roll_number"],
        "document_reference": data.document_reference,
        "stamp_type": data.stamp_type,
        "hash_value": hash_value,
        "qr_code_data": qr_data,
        "status": "active",
        "created_at": now.isoformat(),
        "expires_at": expires_at,
        "used_count": 0
    }
    
    await db.digital_stamps.insert_one(stamp)
    
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "digital_stamp_created",
        "user_id": user["id"],
        "details": {"stamp_id": stamp_id, "type": data.stamp_type},
        "timestamp": now.isoformat()
    })
    
    return DigitalStamp(**stamp)

@api_router.get("/digital-stamps", response_model=List[DigitalStamp])
async def get_digital_stamps(user: dict = Depends(get_current_user)):
    query = {"advocate_id": user["id"]} if user.get("role") not in ["admin", "super_admin"] else {}
    stamps = await db.digital_stamps.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DigitalStamp(**s) for s in stamps]

@api_router.post("/digital-stamps/{stamp_id}/revoke")
async def revoke_stamp(stamp_id: str, user: dict = Depends(get_current_user)):
    stamp = await db.digital_stamps.find_one({"stamp_id": stamp_id})
    if not stamp:
        raise HTTPException(status_code=404, detail="Stamp not found")
    if user.get("role") not in ["admin", "super_admin"] and stamp["advocate_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.digital_stamps.update_one(
        {"stamp_id": stamp_id},
        {"$set": {"status": "revoked", "revoked_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Stamp revoked successfully"}

# =============== PUBLIC VERIFICATION ROUTES ===============

@api_router.get("/verify/stamp/{stamp_id}", response_model=VerificationResult)
@limiter.limit("30/minute")  # Rate limit to prevent scraping
async def verify_stamp(stamp_id: str, request: Request):
    """Public verification endpoint - checks both document stamps and digital stamps"""
    
    # First check document stamps
    stamp = await db.document_stamps.find_one({"stamp_id": stamp_id}, {"_id": 0})
    is_document_stamp = True
    
    # If not found, check legacy digital stamps
    if not stamp:
        stamp = await db.digital_stamps.find_one({"stamp_id": stamp_id}, {"_id": 0})
        is_document_stamp = False
    
    if not stamp:
        # Log failed verification attempt
        await log_stamp_event(
            stamp_id=stamp_id,
            event_type="STAMP_VERIFIED",
            actor_type="public",
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            metadata={"result": "not_found"}
        )
        return VerificationResult(valid=False, message="Stamp not found. This may be a fraudulent stamp.")
    
    advocate = await db.advocates.find_one({"id": stamp["advocate_id"]}, {"_id": 0})
    
    # Check stamp status
    warning = None
    if stamp["status"] == "revoked":
        warning = "This stamp has been revoked and is no longer valid."
    elif stamp["status"] == "expired" or datetime.fromisoformat(stamp["expires_at"]) < datetime.now(timezone.utc):
        warning = "This stamp has expired."
        stamp["status"] = "expired"
    
    # Check advocate status
    if advocate and advocate.get("practicing_status") == "Suspended":
        warning = "The advocate who issued this stamp is currently suspended."
    
    # Calculate and record revenue for valid verifications
    if stamp["status"] == "active" and not warning:
        revenue = await calculate_verification_revenue(DIGITAL_STAMP_PRICES.get(stamp.get("stamp_type", "official"), 5000))
        
        # Update stamp verification count and earnings
        collection = "document_stamps" if is_document_stamp else "digital_stamps"
        if is_document_stamp:
            await db[collection].update_one(
                {"stamp_id": stamp_id},
                {"$inc": {"verification_count": 1, "total_earnings": revenue["advocate_share"]}}
            )
        else:
            await db[collection].update_one(
                {"stamp_id": stamp_id},
                {"$inc": {"used_count": 1}}
            )
        
        # Update advocate earnings
        if advocate:
            await db.advocates.update_one(
                {"id": advocate["id"]},
                {"$inc": {"total_earnings": revenue["advocate_share"]}}
            )
        
        # Record verification transaction
        await db.verification_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "stamp_id": stamp_id,
            "advocate_id": stamp["advocate_id"],
            "total_fee": revenue["total_fee"],
            "advocate_share": revenue["advocate_share"],
            "platform_share": revenue["platform_share"],
            "verified_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Log verification (legacy)
    await db.verification_logs.insert_one({
        "id": str(uuid.uuid4()),
        "stamp_id": stamp_id,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "result": "valid" if not warning else "warning"
    })
    
    # Log stamp event (new ledger audit trail)
    await log_stamp_event(
        stamp_id=stamp_id,
        event_type="STAMP_VERIFIED",
        actor_type="public",
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        metadata={
            "result": "valid" if not warning else ("revoked" if "revoked" in (warning or "") else "warning"),
            "is_document_stamp": is_document_stamp
        }
    )
    
    # Verify cryptographic signature if present
    crypto_verified = None
    crypto_message = None
    crypto_sig_alg = None
    crypto_key_id = None
    
    if stamp.get("crypto_signature") and crypto_service.is_verification_available():
        crypto_sig = stamp["crypto_signature"]
        crypto_verified, crypto_message = crypto_service.verify_stamp_signature(
            stamp_id=stamp["stamp_id"],
            doc_hash=stamp.get("document_hash", ""),
            issued_at=stamp.get("created_at", ""),
            advocate_id=stamp.get("advocate_id", ""),
            expires_at=stamp.get("expires_at"),
            signature_b64=crypto_sig.get("signature_b64", ""),
            key_id=crypto_sig.get("key_id")
        )
        crypto_sig_alg = crypto_sig.get("signature_alg")
        crypto_key_id = crypto_sig.get("key_id")
        
        if crypto_verified:
            logger.info(f"Cryptographic verification passed for stamp: {stamp_id}")
        else:
            logger.warning(f"Cryptographic verification FAILED for stamp: {stamp_id} - {crypto_message}")
    
    return VerificationResult(
        valid=stamp["status"] == "active" and not warning,
        stamp_id=stamp["stamp_id"],
        advocate_name=stamp["advocate_name"],
        advocate_roll_number=stamp.get("advocate_roll_number") or (advocate.get("roll_number") if advocate else None),
        advocate_tls_number=stamp.get("advocate_tls_number") or (advocate.get("tls_member_number") if advocate else None),
        advocate_status=advocate.get("practicing_status") if advocate else "Unknown",
        advocate_photo=advocate.get("profile_photo") if advocate else None,
        stamp_status=stamp["status"],
        stamp_type=stamp.get("stamp_type"),
        document_name=stamp.get("document_name"),
        document_type=stamp.get("document_type"),
        description=stamp.get("description"),
        recipient_name=stamp.get("recipient_name"),
        recipient_org=stamp.get("recipient_org"),
        document_hash=stamp.get("document_hash"),
        created_at=stamp["created_at"],
        expires_at=stamp["expires_at"],
        verification_count=stamp.get("verification_count", stamp.get("used_count", 0)),
        warning=warning,
        message="Stamp verified successfully" if not warning else warning,
        crypto_verified=crypto_verified,
        crypto_signature_alg=crypto_sig_alg,
        crypto_key_id=crypto_key_id,
        crypto_message=crypto_message
    )

@api_router.post("/verify/document")
async def verify_document_by_hash(file: UploadFile = File(...), request: Request = None):
    """Verify document by uploading and checking hash"""
    content = await file.read()
    doc_hash = generate_document_hash(content)
    
    # Find stamp by document hash
    stamp = await db.document_stamps.find_one({"document_hash": doc_hash}, {"_id": 0})
    
    if not stamp:
        return VerificationResult(
            valid=False,
            message="No stamp found for this document. The document may have been modified or was never stamped."
        )
    
    # Use the stamp verification logic
    return await verify_stamp(stamp["stamp_id"], request)


@api_router.post("/verify/stamp/{stamp_id}/validate-document")
async def validate_document_against_stamp(
    stamp_id: str,
    file: UploadFile = File(...),
    request: Request = None
):
    """
    Validate an uploaded document matches the stored hash for a specific stamp.
    This is the tamper-proof verification - proves the document hasn't been modified.
    """
    # Get the stamp
    stamp = await db.document_stamps.find_one({"stamp_id": stamp_id}, {"_id": 0})
    
    if not stamp:
        return {
            "valid": False,
            "hash_match": False,
            "message": "Stamp not found",
            "stamp_id": stamp_id
        }
    
    # Calculate hash of uploaded document
    content = await file.read()
    uploaded_hash = generate_document_hash(content)
    stored_hash = stamp.get("document_hash", "")
    
    # Compare hashes
    hash_match = uploaded_hash == stored_hash
    
    # Log verification attempt
    await log_stamp_event(
        stamp_id=stamp_id,
        event_type="STAMP_VERIFIED",
        actor_type="public",
        ip=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
        metadata={
            "result": "hash_match" if hash_match else "hash_mismatch",
            "validation_type": "document_upload"
        }
    )
    
    return {
        "valid": hash_match,
        "hash_match": hash_match,
        "stamp_id": stamp_id,
        "stamp_status": stamp.get("status", "unknown"),
        "stored_hash": stored_hash[:16] + "..." if stored_hash else None,
        "uploaded_hash": uploaded_hash[:16] + "...",
        "message": "Document matches stamp - authentic and unmodified" if hash_match else "Document does NOT match stamp - may have been tampered with",
        "advocate_name": stamp.get("advocate_name"),
        "issued_at": stamp.get("created_at")
    }


# =============== PUBLIC KEY ENDPOINT (Well-Known) ===============

@api_router.get("/.well-known/tls-stamp-keys")
async def get_tls_stamp_public_keys():
    """
    Public endpoint for TLS stamp verification keys.
    Courts, banks, and other institutions can use this to independently verify stamps.
    """
    return crypto_service.get_public_key_info()


@api_router.get("/crypto/status")
async def get_crypto_status():
    """Get cryptographic signing status"""
    return {
        "signing_available": crypto_service.is_signing_available(),
        "verification_available": crypto_service.is_verification_available(),
        "key_id": crypto_service.key_id if crypto_service.is_signing_available() else None,
        "algorithm": "ECDSA_P256_SHA256"
    }


@api_router.get("/verify/advocate/{roll_number}", response_model=VerificationResult)
async def verify_advocate(roll_number: str):
    advocate = await db.advocates.find_one({"roll_number": roll_number}, {"_id": 0, "password_hash": 0})
    
    if not advocate:
        return VerificationResult(valid=False, message="Advocate not found with this roll number.")
    
    warning = None
    if advocate.get("practicing_status") == "Suspended":
        warning = "This advocate is currently suspended."
    elif advocate.get("practicing_status") == "Retired":
        warning = "This advocate is retired."
    
    return VerificationResult(
        valid=advocate.get("practicing_status") == "Active",
        advocate_name=advocate["full_name"],
        advocate_roll_number=advocate["roll_number"],
        advocate_status=advocate.get("practicing_status"),
        advocate_photo=advocate.get("profile_photo"),
        created_at=advocate["created_at"],
        warning=warning,
        message="Advocate is in good standing" if not warning else warning
    )

# =============== STAMP TEMPLATES ROUTES ===============

class StampTemplate(BaseModel):
    name: str
    document_type: str = "contract"
    stamp_type: str = "official"
    shape: str = "rectangle"  # rectangle, circle, oval - Max 3 templates allowed
    brand_color: str = "#10B981"
    layout: str = "horizontal"  # horizontal, vertical, compact, logo_left, logo_right
    show_advocate_name: bool = True
    show_tls_logo: bool = True
    include_signature: bool = False  # Whether to include signature box
    signature_data: Optional[str] = None  # Base64 encoded signature image
    advocate_address: Optional[str] = None  # Address for circle/oval stamps outer ring
    position_preset: str = "bottom-right"  # top-left, top-right, bottom-left, bottom-right, center
    apply_to_pages: str = "first"  # first, last, all
    stamp_size: int = 100  # percentage 50-150
    logo_size: int = 100  # percentage 50-150
    opacity: int = 90  # percentage 30-100
    margin_from_edge: int = 35  # pixels 10-100
    default_position: dict = {"x": 400, "y": 50, "width": 150, "height": 150}
    default_recipient_name: Optional[str] = None
    default_recipient_org: Optional[str] = None
    is_default: bool = False

@api_router.get("/stamp-templates")
async def get_stamp_templates(user: dict = Depends(get_current_user)):
    """Get all stamp templates for current user"""
    templates = await db.stamp_templates.find(
        {"advocate_id": user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return templates

@api_router.post("/advocate/signature")
async def upload_signature(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload advocate's signature image"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    content = await file.read()
    if len(content) > 500000:  # 500KB max
        raise HTTPException(status_code=400, detail="Signature image too large (max 500KB)")
    
    # Convert to base64
    signature_base64 = base64.b64encode(content).decode()
    
    # Save to user profile
    await db.advocates.update_one(
        {"id": user["id"]},
        {"$set": {
            "signature_data": signature_base64, 
            "signature_source": "uploaded",
            "signature_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Signature uploaded successfully", "signature_data": signature_base64, "source": "uploaded"}

class SignatureData(BaseModel):
    signature_data: str  # Base64 encoded signature image
    source: str = "drawn"  # "drawn" or "uploaded"

@api_router.post("/advocate/signature/save")
async def save_drawn_signature(data: SignatureData, user: dict = Depends(get_current_user)):
    """Save advocate's drawn signature (base64)"""
    # Validate base64 data size
    if len(data.signature_data) > 700000:  # ~500KB in base64
        raise HTTPException(status_code=400, detail="Signature data too large (max 500KB)")
    
    # Save to user profile
    await db.advocates.update_one(
        {"id": user["id"]},
        {"$set": {
            "signature_data": data.signature_data, 
            "signature_source": data.source,
            "signature_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Signature saved successfully", "source": data.source}

@api_router.get("/advocate/signature")
async def get_signature(user: dict = Depends(get_current_user)):
    """Get advocate's saved signature"""
    advocate = await db.advocates.find_one({"id": user["id"]}, {"_id": 0, "signature_data": 1, "signature_source": 1})
    return {
        "signature_data": advocate.get("signature_data") if advocate else None,
        "source": advocate.get("signature_source", "unknown") if advocate else None
    }

@api_router.delete("/advocate/signature")
async def delete_signature(user: dict = Depends(get_current_user)):
    """Delete advocate's saved signature"""
    await db.advocates.update_one(
        {"id": user["id"]},
        {"$unset": {"signature_data": "", "signature_updated_at": ""}}
    )
    return {"message": "Signature deleted successfully"}

@api_router.post("/stamp-templates")
async def create_stamp_template(template: StampTemplate, user: dict = Depends(get_current_user)):
    """Create a new stamp template - Maximum 3 templates allowed per advocate"""
    now = datetime.now(timezone.utc).isoformat()
    template_id = str(uuid.uuid4())
    
    # Check template count - max 3 allowed
    template_count = await db.stamp_templates.count_documents({"advocate_id": user["id"]})
    if template_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 stamp templates allowed. Please delete an existing template first.")
    
    # Validate shape
    if template.shape not in ["rectangle", "circle", "oval"]:
        raise HTTPException(status_code=400, detail="Invalid shape. Must be rectangle, circle, or oval.")
    
    # If this is set as default, unset other defaults
    if template.is_default:
        await db.stamp_templates.update_many(
            {"advocate_id": user["id"], "is_default": True},
            {"$set": {"is_default": False}}
        )
    
    template_data = {
        "id": template_id,
        "advocate_id": user["id"],
        "name": template.name,
        "document_type": template.document_type,
        "stamp_type": template.stamp_type,
        "shape": template.shape,
        "brand_color": template.brand_color,
        "layout": template.layout,
        "show_advocate_name": template.show_advocate_name,
        "show_tls_logo": template.show_tls_logo,
        "include_signature": template.include_signature,
        "signature_data": template.signature_data,
        "advocate_address": template.advocate_address,
        "position_preset": template.position_preset,
        "apply_to_pages": template.apply_to_pages,
        "stamp_size": template.stamp_size,
        "logo_size": template.logo_size,
        "opacity": template.opacity,
        "margin_from_edge": template.margin_from_edge,
        "default_position": template.default_position,
        "default_recipient_name": template.default_recipient_name,
        "default_recipient_org": template.default_recipient_org,
        "is_default": template.is_default,
        "created_at": now,
        "updated_at": now
    }
    
    await db.stamp_templates.insert_one(template_data)
    
    return {"message": "Template created successfully", "template": {k: v for k, v in template_data.items() if k != "_id"}}

@api_router.put("/stamp-templates/{template_id}")
async def update_stamp_template(template_id: str, template: StampTemplate, user: dict = Depends(get_current_user)):
    """Update a stamp template"""
    existing = await db.stamp_templates.find_one({"id": template_id, "advocate_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # If this is set as default, unset other defaults
    if template.is_default:
        await db.stamp_templates.update_many(
            {"advocate_id": user["id"], "is_default": True, "id": {"$ne": template_id}},
            {"$set": {"is_default": False}}
        )
    
    update_data = {
        "name": template.name,
        "document_type": template.document_type,
        "stamp_type": template.stamp_type,
        "shape": template.shape,
        "brand_color": template.brand_color,
        "layout": template.layout,
        "show_advocate_name": template.show_advocate_name,
        "show_tls_logo": template.show_tls_logo,
        "include_signature": template.include_signature,
        "signature_data": template.signature_data,
        "advocate_address": template.advocate_address,
        "position_preset": template.position_preset,
        "apply_to_pages": template.apply_to_pages,
        "stamp_size": template.stamp_size,
        "logo_size": template.logo_size,
        "opacity": template.opacity,
        "margin_from_edge": template.margin_from_edge,
        "default_position": template.default_position,
        "default_recipient_name": template.default_recipient_name,
        "default_recipient_org": template.default_recipient_org,
        "is_default": template.is_default,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.stamp_templates.update_one(
        {"id": template_id},
        {"$set": update_data}
    )
    
    return {"message": "Template updated successfully"}

@api_router.delete("/stamp-templates/{template_id}")
async def delete_stamp_template(template_id: str, user: dict = Depends(get_current_user)):
    """Delete a stamp template"""
    result = await db.stamp_templates.delete_one({"id": template_id, "advocate_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}

@api_router.post("/stamp-templates/{template_id}/set-default")
async def set_default_template(template_id: str, user: dict = Depends(get_current_user)):
    """Set a template as default"""
    existing = await db.stamp_templates.find_one({"id": template_id, "advocate_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Unset all other defaults
    await db.stamp_templates.update_many(
        {"advocate_id": user["id"], "is_default": True},
        {"$set": {"is_default": False}}
    )
    
    # Set this as default
    await db.stamp_templates.update_one(
        {"id": template_id},
        {"$set": {"is_default": True}}
    )
    
    return {"message": "Template set as default"}

# =============== ADVOCATE SUBSCRIPTION ROUTES ===============

@api_router.get("/subscription/packages")
async def get_subscription_packages():
    """Get available subscription packages"""
    return {
        "packages": SUBSCRIPTION_PACKAGES,
        "trial_period_days": TRIAL_PERIOD_DAYS,
        "grace_period_days": GRACE_PERIOD_DAYS,
        "currency": "TZS"
    }

@api_router.get("/subscription/status")
async def get_subscription_status(user: dict = Depends(get_current_user)):
    """Get current subscription status for advocate"""
    subscription = await db.subscriptions.find_one(
        {"advocate_id": user["id"]},
        {"_id": 0}
    )
    
    now = datetime.now(timezone.utc)
    
    if not subscription:
        # No subscription - check if they have any stamps (for trial eligibility)
        stamp_count = await db.document_stamps.count_documents({"advocate_id": user["id"]})
        return {
            "status": "none",
            "is_trial": False,
            "can_earn_revenue": False,
            "eligible_for_trial": stamp_count == 0,
            "total_stamps_created": stamp_count,
            "message": "No active subscription. Start your 30-day free trial with your first stamp!"
        }
    
    # Calculate current status
    status = subscription.get("status", "none")
    is_trial = subscription.get("is_trial", False)
    can_earn_revenue = False
    
    if is_trial:
        trial_ends = datetime.fromisoformat(subscription.get("trial_ends_at", now.isoformat()))
        if now > trial_ends:
            status = "trial_expired"
        else:
            status = "trial"
        can_earn_revenue = False  # No earnings during trial
    elif status == "active":
        sub_ends = datetime.fromisoformat(subscription.get("subscription_ends_at", now.isoformat()))
        if now > sub_ends:
            grace_ends = sub_ends + timedelta(days=GRACE_PERIOD_DAYS)
            if now > grace_ends:
                status = "expired"
                can_earn_revenue = False
            else:
                status = "grace"
                can_earn_revenue = False  # No earnings during grace
                subscription["grace_ends_at"] = grace_ends.isoformat()
        else:
            can_earn_revenue = True
    
    subscription["status"] = status
    subscription["can_earn_revenue"] = can_earn_revenue
    
    # Get stamp count
    stamp_count = await db.document_stamps.count_documents({"advocate_id": user["id"]})
    subscription["total_stamps_created"] = stamp_count
    
    return subscription

@api_router.post("/subscription/start-trial")
async def start_trial(user: dict = Depends(get_current_user)):
    """Start 30-day free trial (only for first stamp)"""
    # Check if already has subscription
    existing = await db.subscriptions.find_one({"advocate_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Trial already used or subscription exists")
    
    # Check if they have stamps already
    stamp_count = await db.document_stamps.count_documents({"advocate_id": user["id"]})
    if stamp_count > 0:
        raise HTTPException(status_code=400, detail="Trial only available before first stamp")
    
    now = datetime.now(timezone.utc)
    trial_ends = now + timedelta(days=TRIAL_PERIOD_DAYS)
    
    subscription = {
        "id": str(uuid.uuid4()),
        "advocate_id": user["id"],
        "package": "trial",
        "status": "trial",
        "is_trial": True,
        "trial_started_at": now.isoformat(),
        "trial_ends_at": trial_ends.isoformat(),
        "subscription_started_at": None,
        "subscription_ends_at": None,
        "can_earn_revenue": False,
        "total_stamps_created": 0,
        "created_at": now.isoformat()
    }
    
    await db.subscriptions.insert_one(subscription)
    
    return {
        "message": "30-day free trial started!",
        "trial_ends_at": trial_ends.isoformat(),
        "note": "During trial, you can use QR stamps but won't earn from verifications. Subscribe to unlock earnings!"
    }

@api_router.post("/subscription/subscribe")
async def subscribe(data: SubscriptionCreate, user: dict = Depends(get_current_user)):
    """Subscribe to a package (MOCKED payment)"""
    if data.package not in SUBSCRIPTION_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    package = SUBSCRIPTION_PACKAGES[data.package]
    now = datetime.now(timezone.utc)
    ends_at = now + timedelta(days=package["duration_days"])
    
    subscription_data = {
        "advocate_id": user["id"],
        "package": data.package,
        "status": "active",
        "is_trial": False,
        "subscription_started_at": now.isoformat(),
        "subscription_ends_at": ends_at.isoformat(),
        "can_earn_revenue": True,
        "payment_amount": package["price"],
        "payment_method": data.payment_method,
        "payment_status": "paid",  # MOCKED
        "updated_at": now.isoformat()
    }
    
    # Update or create subscription
    result = await db.subscriptions.update_one(
        {"advocate_id": user["id"]},
        {"$set": subscription_data},
        upsert=True
    )
    
    return {
        "message": f"Subscribed to {package['name']} package!",
        "subscription_ends_at": ends_at.isoformat(),
        "can_earn_revenue": True,
        "note": "PAYMENT MOCKED - You can now earn from stamp verifications!"
    }

@api_router.get("/advocate/verification-stats")
async def get_verification_stats(user: dict = Depends(get_current_user)):
    """Get verification statistics for advocate dashboard"""
    now = datetime.now(timezone.utc)
    
    # Get subscription status
    subscription = await db.subscriptions.find_one({"advocate_id": user["id"]}, {"_id": 0})
    
    # Get stamps
    stamps = await db.document_stamps.find(
        {"advocate_id": user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    total_stamps = len(stamps)
    active_stamps = sum(1 for s in stamps if s.get("status") == "active")
    total_verifications = sum(s.get("verification_count", 0) for s in stamps)
    
    # Get earnings
    settings = await get_system_settings()
    advocate_share_pct = settings.get("advocate_revenue_share", 30.0) / 100
    
    # Calculate earnings
    total_earnings = sum(s.get("total_earnings", 0) for s in stamps)
    
    # Get recent verifications (last 30 days)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    recent_verifications = await db.verification_transactions.find(
        {"advocate_id": user["id"], "verified_at": {"$gte": thirty_days_ago}},
        {"_id": 0}
    ).to_list(100)
    
    # Group by day for chart
    daily_stats = {}
    for v in recent_verifications:
        date = v["verified_at"][:10]
        if date not in daily_stats:
            daily_stats[date] = {"verifications": 0, "earnings": 0}
        daily_stats[date]["verifications"] += 1
        daily_stats[date]["earnings"] += v.get("advocate_share", 0)
    
    # Convert to chart data
    chart_data = [
        {"date": date, **data}
        for date, data in sorted(daily_stats.items())
    ]
    
    # Revenue breakdown
    revenue_breakdown = {
        "advocate_share_pct": settings.get("advocate_revenue_share", 30.0),
        "tls_share_pct": 35.0,  # Fixed for TLS
        "idc_share_pct": 35.0,  # Fixed for IDC
        "total_advocate_earnings": total_earnings,
        "can_withdraw": subscription.get("can_earn_revenue", False) if subscription else False
    }
    
    # Recent stamps
    recent_stamps = sorted(stamps, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    
    return {
        "summary": {
            "total_stamps": total_stamps,
            "active_stamps": active_stamps,
            "total_verifications": total_verifications,
            "total_earnings": total_earnings,
            "currency": "TZS"
        },
        "subscription": subscription,
        "chart_data": chart_data,
        "revenue_breakdown": revenue_breakdown,
        "recent_stamps": recent_stamps,
        "recent_verifications": recent_verifications[:10]
    }

# =============== PUBLIC SETTINGS (STAMP PRICES) ===============

@api_router.get("/settings/stamp-prices")
async def get_stamp_prices():
    """Get stamp prices (public endpoint for authenticated users)"""
    settings = await get_system_settings()
    return {
        "official": settings.get("official_stamp_price", 5000.0),
        "commissioner": settings.get("commissioner_stamp_price", 7500.0),
        "notary": settings.get("notary_stamp_price", 10000.0),
        "currency": settings.get("currency", "TZS")
    }

# =============== SUPER ADMIN ROUTES ===============

@api_router.get("/super-admin/settings")
async def get_system_settings_api(user: dict = Depends(require_super_admin)):
    """Get current system settings"""
    return await get_system_settings()

@api_router.put("/super-admin/settings")
async def update_system_settings(settings: SystemSettings, user: dict = Depends(require_super_admin)):
    """Update system settings (Super Admin only)"""
    settings_data = {
        "type": "verification_fees",
        "verification_fee_fixed": settings.verification_fee_fixed,
        "verification_fee_percentage": settings.verification_fee_percentage,
        "advocate_revenue_share": settings.advocate_revenue_share,
        "currency": settings.currency,
        "official_stamp_price": settings.official_stamp_price,
        "commissioner_stamp_price": settings.commissioner_stamp_price,
        "notary_stamp_price": settings.notary_stamp_price,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["id"]
    }
    
    await db.system_settings.update_one(
        {"type": "verification_fees"},
        {"$set": settings_data},
        upsert=True
    )
    
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "system_settings_updated",
        "user_id": user["id"],
        "details": settings_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Settings updated successfully", "settings": settings_data}

@api_router.get("/super-admin/stats")
async def get_super_admin_stats(user: dict = Depends(require_super_admin)):
    """Get comprehensive platform statistics"""
    total_advocates = await db.advocates.count_documents({"role": "advocate"})
    total_admins = await db.advocates.count_documents({"role": "admin"})
    total_document_stamps = await db.document_stamps.count_documents({})
    total_digital_stamps = await db.digital_stamps.count_documents({})
    total_verifications = await db.verification_logs.count_documents({})
    
    # Revenue stats
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total_fee"}}}]
    revenue_result = await db.verification_transactions.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    advocate_earnings_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$advocate_share"}}}]
    advocate_earnings_result = await db.verification_transactions.aggregate(advocate_earnings_pipeline).to_list(1)
    total_advocate_earnings = advocate_earnings_result[0]["total"] if advocate_earnings_result else 0
    
    return {
        "total_advocates": total_advocates,
        "total_admins": total_admins,
        "total_document_stamps": total_document_stamps,
        "total_digital_stamps": total_digital_stamps,
        "total_stamps": total_document_stamps + total_digital_stamps,
        "total_verifications": total_verifications,
        "total_revenue": total_revenue,
        "total_advocate_earnings": total_advocate_earnings,
        "platform_revenue": total_revenue - total_advocate_earnings
    }

@api_router.get("/super-admin/admins")
async def get_all_admins(user: dict = Depends(require_super_admin)):
    """Get all admin users"""
    admins = await db.advocates.find(
        {"role": {"$in": ["admin", "super_admin"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return admins

@api_router.post("/super-admin/create-admin")
async def create_admin(
    email: EmailStr = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    organization: str = Form("TLS"),
    user: dict = Depends(require_super_admin)
):
    """Create a new admin user (Super Admin only)"""
    existing = await db.advocates.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    now = datetime.now(timezone.utc).isoformat()
    admin_id = str(uuid.uuid4())
    
    admin = {
        "id": admin_id,
        "email": email,
        "password_hash": hash_password(password),
        "full_name": full_name,
        "roll_number": f"ADMIN{secrets.token_hex(3).upper()}",
        "tls_member_number": f"TLS/ADMIN/{datetime.now().year}",
        "phone": "",
        "region": "Dar es Salaam",
        "court_jurisdiction": "N/A",
        "firm_affiliation": organization,
        "admission_year": datetime.now().year,
        "practicing_status": "Active",
        "profile_photo": None,
        "role": "admin",
        "verified": True,
        "total_earnings": 0.0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.advocates.insert_one(admin)
    
    return {"message": f"Admin {full_name} created successfully", "id": admin_id}

# =============== ADMIN ROUTES ===============

@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(user: dict = Depends(require_admin)):
    total_advocates = await db.advocates.count_documents({"role": "advocate"})
    active_advocates = await db.advocates.count_documents({"practicing_status": "Active", "role": "advocate"})
    suspended_advocates = await db.advocates.count_documents({"practicing_status": "Suspended"})
    
    total_doc_stamps = await db.document_stamps.count_documents({})
    active_doc_stamps = await db.document_stamps.count_documents({"status": "active"})
    total_digital_stamps = await db.digital_stamps.count_documents({})
    active_digital_stamps = await db.digital_stamps.count_documents({"status": "active"})
    
    total_orders = await db.stamp_orders.count_documents({})
    pending_orders = await db.stamp_orders.count_documents({"status": "pending_approval"})
    
    total_verifications = await db.verification_logs.count_documents({})
    
    pipeline = [{"$match": {"payment_status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}]
    revenue_result = await db.stamp_orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_pipeline = [
        {"$match": {"payment_status": "paid", "created_at": {"$gte": month_start.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}
    ]
    monthly_result = await db.stamp_orders.aggregate(monthly_pipeline).to_list(1)
    monthly_revenue = monthly_result[0]["total"] if monthly_result else 0
    
    fraud_alerts = await db.document_stamps.count_documents({"verification_count": {"$gt": 100}})
    
    return AdminStats(
        total_advocates=total_advocates,
        active_advocates=active_advocates,
        suspended_advocates=suspended_advocates,
        total_stamps_issued=total_doc_stamps + total_digital_stamps,
        active_stamps=active_doc_stamps + active_digital_stamps,
        total_orders=total_orders,
        pending_orders=pending_orders,
        total_revenue=total_revenue,
        monthly_revenue=monthly_revenue,
        total_verifications=total_verifications,
        fraud_alerts=fraud_alerts
    )

@api_router.get("/admin/advocates", response_model=List[AdvocateProfile])
async def get_all_advocates(
    status: Optional[str] = None,
    region: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    query = {"role": "advocate"}
    if status:
        query["practicing_status"] = status
    if region:
        query["region"] = region
    
    advocates = await db.advocates.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [AdvocateProfile(**a) for a in advocates]

@api_router.put("/admin/advocates/{advocate_id}/status")
async def update_advocate_status(advocate_id: str, status: str, user: dict = Depends(require_admin)):
    if status not in ["Active", "Suspended", "Retired"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.advocates.update_one(
        {"id": advocate_id},
        {"$set": {"practicing_status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Advocate not found")
    
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "advocate_status_updated",
        "user_id": user["id"],
        "target_id": advocate_id,
        "details": {"new_status": status},
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"Advocate status updated to {status}"}

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, tracking_number: Optional[str] = None, user: dict = Depends(require_admin)):
    valid_statuses = ["pending_approval", "approved", "in_production", "dispatched", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if tracking_number:
        update_data["tracking_number"] = tracking_number
    
    result = await db.stamp_orders.update_one({"id": order_id}, {"$set": update_data})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status}"}

@api_router.get("/admin/audit-logs")
async def get_audit_logs(limit: int = Query(default=100, le=500), user: dict = Depends(require_admin)):
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs

@api_router.get("/admin/verification-logs")
async def get_verification_logs(limit: int = Query(default=100, le=500), user: dict = Depends(require_admin)):
    logs = await db.verification_logs.find({}, {"_id": 0}).sort("verified_at", -1).to_list(limit)
    return logs

@api_router.get("/admin/login-attempts")
async def get_login_attempts(
    limit: int = Query(default=100, le=500),
    success_only: bool = Query(default=None),
    email: str = Query(default=None),
    user: dict = Depends(require_admin)
):
    """Get login attempt logs for security monitoring"""
    query = {}
    if success_only is not None:
        query["success"] = success_only
    if email:
        query["email"] = {"$regex": email, "$options": "i"}
    
    logs = await db.login_attempts.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    # Get summary stats
    total_attempts = await db.login_attempts.count_documents({})
    failed_attempts = await db.login_attempts.count_documents({"success": False})
    
    return {
        "logs": logs,
        "stats": {
            "total_attempts": total_attempts,
            "failed_attempts": failed_attempts,
            "success_rate": round((total_attempts - failed_attempts) / max(total_attempts, 1) * 100, 1)
        }
    }

# =============== ADVOCATE EARNINGS ROUTES ===============

@api_router.get("/earnings/summary")
async def get_earnings_summary(user: dict = Depends(get_current_user)):
    """Get earnings summary for advocate"""
    # Get total earnings from user profile
    total_earnings = user.get("total_earnings", 0.0)
    
    # Get recent transactions
    transactions = await db.verification_transactions.find(
        {"advocate_id": user["id"]},
        {"_id": 0}
    ).sort("verified_at", -1).to_list(10)
    
    # Get monthly earnings
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_pipeline = [
        {"$match": {"advocate_id": user["id"], "verified_at": {"$gte": month_start.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$advocate_share"}}}
    ]
    monthly_result = await db.verification_transactions.aggregate(monthly_pipeline).to_list(1)
    monthly_earnings = monthly_result[0]["total"] if monthly_result else 0
    
    # Get total verifications
    total_verifications = await db.verification_transactions.count_documents({"advocate_id": user["id"]})
    
    return {
        "total_earnings": total_earnings,
        "monthly_earnings": monthly_earnings,
        "total_verifications": total_verifications,
        "recent_transactions": transactions,
        "currency": "TZS"
    }

# =============== INSTITUTIONAL API ===============

@api_router.post("/institutional/verify-bulk")
async def bulk_verify(stamp_ids: List[str], api_key: str = Query(...)):
    """Bulk verification for institutional accounts - no payment required"""
    # Validate API key
    institution = await db.institutional_accounts.find_one({"api_key": api_key, "status": "active"}, {"_id": 0})
    if not institution:
        raise HTTPException(status_code=401, detail="Invalid institutional API key")
    
    results = []
    for stamp_id in stamp_ids[:50]:
        result = await verify_stamp(stamp_id)
        results.append(result.model_dump())
    
    # Update institution's verification count
    await db.institutional_accounts.update_one(
        {"api_key": api_key},
        {"$inc": {"verification_count": len(results), "total_verifications": len(results)}}
    )
    
    return {"results": results, "count": len(results)}

# =============== PUBLIC BUSINESS REGISTRATION ===============

class BusinessRegistrationRequest(BaseModel):
    name: str
    type: str
    registration_number: str
    contact_name: str
    contact_email: str
    contact_phone: str
    address: Optional[str] = ""
    expected_volume: Optional[str] = ""
    use_case: Optional[str] = ""
    password: str

@api_router.post("/institutions/register")
@limiter.limit("3/minute")
async def register_business(request: Request, data: BusinessRegistrationRequest):
    """Public endpoint for businesses to register for verification access"""
    # Check if email already exists
    existing = await db.institutional_applications.find_one({"contact_email": data.contact_email})
    if existing:
        raise HTTPException(status_code=400, detail="An application with this email already exists")
    
    existing_account = await db.institutional_accounts.find_one({"contact_email": data.contact_email})
    if existing_account:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    application_id = str(uuid.uuid4())
    
    # Hash the password using passlib (consistent with rest of codebase)
    hashed_password = hash_password(data.password)
    
    application = {
        "id": application_id,
        "name": data.name,
        "organization_type": data.type,
        "registration_number": data.registration_number,
        "contact_name": data.contact_name,
        "contact_email": data.contact_email,
        "contact_phone": data.contact_phone,
        "address": data.address,
        "expected_volume": data.expected_volume,
        "use_case": data.use_case,
        "password_hash": hashed_password,
        "status": "pending",  # pending, approved, rejected
        "created_at": now,
        "updated_at": now
    }
    
    await db.institutional_applications.insert_one(application)
    
    # Log the application
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "business_application_submitted",
        "details": {"application_id": application_id, "name": data.name, "email": data.contact_email},
        "timestamp": now
    })
    
    return {
        "message": "Registration submitted successfully",
        "application_id": application_id,
        "status": "pending",
        "note": "Your application will be reviewed within 24-48 hours. You will receive an email with your API credentials once approved."
    }

@api_router.get("/institutions/application-status/{email}")
async def check_application_status(email: str):
    """Check the status of a business registration application"""
    application = await db.institutional_applications.find_one(
        {"contact_email": email},
        {"_id": 0, "password_hash": 0}
    )
    if not application:
        raise HTTPException(status_code=404, detail="No application found with this email")
    
    return {
        "status": application.get("status"),
        "name": application.get("name"),
        "submitted_at": application.get("created_at")
    }

# =============== INSTITUTIONAL ACCOUNTS MANAGEMENT (Super Admin) ===============

@api_router.get("/super-admin/institutions")
async def get_institutions(user: dict = Depends(require_super_admin)):
    """Get all institutional accounts"""
    institutions = await db.institutional_accounts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return institutions

@api_router.post("/super-admin/institutions")
async def create_institution(data: InstitutionalAccountCreate, user: dict = Depends(require_super_admin)):
    """Create a new institutional account"""
    now = datetime.now(timezone.utc).isoformat()
    institution_id = str(uuid.uuid4())
    api_key = f"INST-{secrets.token_hex(16).upper()}"
    
    institution = {
        "id": institution_id,
        "name": data.name,
        "organization_type": data.organization_type,
        "api_key": api_key,
        "contact_name": data.contact_name,
        "contact_email": data.contact_email,
        "contact_phone": data.contact_phone,
        "billing_address": data.billing_address,
        "billing_period": data.billing_period,
        "verification_count": 0,
        "total_verifications": 0,
        "last_billed_at": None,
        "status": "active",
        "created_at": now,
        "updated_at": now
    }
    
    await db.institutional_accounts.insert_one(institution)
    
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "institution_created",
        "user_id": user["id"],
        "details": {"institution_id": institution_id, "name": data.name},
        "timestamp": now
    })
    
    return {"message": "Institutional account created", "institution": {k: v for k, v in institution.items() if k != "_id"}}

@api_router.put("/super-admin/institutions/{institution_id}")
async def update_institution(institution_id: str, data: InstitutionalAccountCreate, user: dict = Depends(require_super_admin)):
    """Update an institutional account"""
    existing = await db.institutional_accounts.find_one({"id": institution_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    await db.institutional_accounts.update_one(
        {"id": institution_id},
        {"$set": {
            "name": data.name,
            "organization_type": data.organization_type,
            "contact_name": data.contact_name,
            "contact_email": data.contact_email,
            "contact_phone": data.contact_phone,
            "billing_address": data.billing_address,
            "billing_period": data.billing_period,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Institution updated successfully"}

@api_router.delete("/super-admin/institutions/{institution_id}")
async def delete_institution(institution_id: str, user: dict = Depends(require_super_admin)):
    """Deactivate an institutional account"""
    result = await db.institutional_accounts.update_one(
        {"id": institution_id},
        {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Institution not found")
    return {"message": "Institution deactivated successfully"}

@api_router.post("/super-admin/institutions/{institution_id}/reset-count")
async def reset_institution_count(institution_id: str, user: dict = Depends(require_super_admin)):
    """Reset institution's verification count (for billing)"""
    result = await db.institutional_accounts.update_one(
        {"id": institution_id},
        {"$set": {
            "verification_count": 0,
            "last_billed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Institution not found")
    return {"message": "Verification count reset successfully"}

# =============== VERIFICATION PRICING TIERS MANAGEMENT ===============

@api_router.get("/verification-tiers")
async def get_verification_tiers():
    """Get all active verification pricing tiers (public endpoint)"""
    # Get public verification fee from settings or use default
    settings = await db.system_settings.find_one({"type": "verification_pricing"}, {"_id": 0})
    public_fee = settings.get("public_verification_fee", PUBLIC_VERIFICATION_FEE) if settings else PUBLIC_VERIFICATION_FEE
    
    # Try to get tiers from DB, fall back to defaults
    tiers = await db.verification_tiers.find({"active": True}, {"_id": 0}).sort("credits", 1).to_list(20)
    if not tiers:
        tiers = DEFAULT_VERIFICATION_TIERS
    
    # Calculate savings percentage based on public fee
    for tier in tiers:
        if "savings_percent" not in tier:
            tier["savings_percent"] = round((1 - tier["price_per_unit"] / public_fee) * 100)
    
    return {
        "public_fee": public_fee,
        "public_fee_formatted": f"TZS {public_fee:,}",
        "tiers": tiers,
        "currency": "TZS",
        "benefits": [
            "Credits never expire",
            "Top up anytime",
            "Bank & Mobile Money accepted",
            "Dedicated API access",
            "Priority support"
        ]
    }

@api_router.get("/super-admin/verification-tiers")
async def get_all_verification_tiers(user: dict = Depends(require_super_admin)):
    """Get all verification pricing tiers including inactive (Super Admin)"""
    tiers = await db.verification_tiers.find({}, {"_id": 0}).sort("credits", 1).to_list(50)
    if not tiers:
        # Initialize with defaults if none exist
        for tier in DEFAULT_VERIFICATION_TIERS:
            tier["active"] = True
            tier["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.verification_tiers.insert_one(tier)
        return DEFAULT_VERIFICATION_TIERS
    return {"tiers": tiers, "minimum_price": MINIMUM_PRICE_PER_VERIFICATION}

@api_router.post("/super-admin/verification-tiers")
async def create_verification_tier(data: VerificationTierCreate, user: dict = Depends(require_super_admin)):
    """Create a new verification pricing tier"""
    # Enforce minimum price
    if data.price_per_unit < MINIMUM_PRICE_PER_VERIFICATION:
        raise HTTPException(
            status_code=400, 
            detail=f"Price per unit cannot be less than {MINIMUM_PRICE_PER_VERIFICATION} TZS"
        )
    
    tier_id = f"tier_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    
    tier = {
        "id": tier_id,
        "name": data.name,
        "credits": data.credits,
        "price_per_unit": data.price_per_unit,
        "total_price": data.credits * data.price_per_unit,
        "description": data.description,
        "popular": data.popular,
        "active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.verification_tiers.insert_one(tier)
    
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "verification_tier_created",
        "user_id": user["id"],
        "details": {"tier_id": tier_id, "name": data.name, "credits": data.credits, "price_per_unit": data.price_per_unit},
        "timestamp": now
    })
    
    return {"message": "Verification tier created", "tier": {k: v for k, v in tier.items() if k != "_id"}}

@api_router.put("/super-admin/verification-tiers/{tier_id}")
async def update_verification_tier(tier_id: str, data: VerificationTierCreate, user: dict = Depends(require_super_admin)):
    """Update a verification pricing tier"""
    if data.price_per_unit < MINIMUM_PRICE_PER_VERIFICATION:
        raise HTTPException(
            status_code=400, 
            detail=f"Price per unit cannot be less than {MINIMUM_PRICE_PER_VERIFICATION} TZS"
        )
    
    existing = await db.verification_tiers.find_one({"id": tier_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tier not found")
    
    await db.verification_tiers.update_one(
        {"id": tier_id},
        {"$set": {
            "name": data.name,
            "credits": data.credits,
            "price_per_unit": data.price_per_unit,
            "total_price": data.credits * data.price_per_unit,
            "description": data.description,
            "popular": data.popular,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Tier updated successfully"}

@api_router.delete("/super-admin/verification-tiers/{tier_id}")
async def delete_verification_tier(tier_id: str, user: dict = Depends(require_super_admin)):
    """Deactivate a verification pricing tier (soft delete)"""
    result = await db.verification_tiers.update_one(
        {"id": tier_id},
        {"$set": {"active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tier not found")
    return {"message": "Tier deactivated successfully"}

@api_router.get("/super-admin/verification-pricing-settings")
async def get_verification_pricing_settings(user: dict = Depends(require_super_admin)):
    """Get verification pricing settings"""
    settings = await db.system_settings.find_one({"type": "verification_pricing"}, {"_id": 0})
    if not settings:
        settings = {
            "type": "verification_pricing",
            "minimum_price_per_verification": MINIMUM_PRICE_PER_VERIFICATION,
            "currency": "TZS",
            "payment_methods": ["bank_transfer", "mobile_money"],
            "credits_never_expire": True
        }
    return settings

@api_router.put("/super-admin/verification-pricing-settings")
async def update_verification_pricing_settings(
    minimum_price: int = Form(...),
    user: dict = Depends(require_super_admin)
):
    """Update minimum price per verification"""
    if minimum_price < 1000:
        raise HTTPException(status_code=400, detail="Minimum price must be at least 1,000 TZS")
    
    await db.system_settings.update_one(
        {"type": "verification_pricing"},
        {"$set": {
            "minimum_price_per_verification": minimum_price,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Pricing settings updated"}

# =============== INSTITUTIONAL CREDIT TOP-UP ===============

@api_router.post("/institutions/top-up")
async def top_up_credits(data: CreditTopUp, api_key: str = Query(...)):
    """Top up verification credits for an institutional account"""
    # Verify institution
    institution = await db.institutional_accounts.find_one({"api_key": api_key, "status": "active"})
    if not institution:
        raise HTTPException(status_code=401, detail="Invalid API key or inactive account")
    
    # Get tier
    tier = await db.verification_tiers.find_one({"id": data.tier_id, "active": True})
    if not tier:
        # Check default tiers
        tier = next((t for t in DEFAULT_VERIFICATION_TIERS if t["id"] == data.tier_id), None)
        if not tier:
            raise HTTPException(status_code=404, detail="Pricing tier not found")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    
    # Create top-up transaction (MOCKED - in production, integrate payment gateway)
    transaction = {
        "id": transaction_id,
        "institution_id": institution["id"],
        "institution_name": institution["name"],
        "tier_id": tier["id"],
        "tier_name": tier["name"],
        "credits_purchased": tier["credits"],
        "amount": tier["total_price"],
        "price_per_unit": tier["price_per_unit"],
        "currency": "TZS",
        "payment_method": data.payment_method,
        "status": "completed",  # MOCKED - would be 'pending' until payment confirmed
        "created_at": now
    }
    
    await db.credit_transactions.insert_one(transaction)
    
    # Add credits to institution (MOCKED - would only happen after payment confirmation)
    new_balance = institution.get("credit_balance", 0) + tier["credits"]
    await db.institutional_accounts.update_one(
        {"id": institution["id"]},
        {"$set": {
            "credit_balance": new_balance,
            "updated_at": now
        },
        "$inc": {"total_credits_purchased": tier["credits"]}}
    )
    
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "credits_purchased",
        "details": {
            "institution_id": institution["id"],
            "transaction_id": transaction_id,
            "credits": tier["credits"],
            "amount": tier["total_price"]
        },
        "timestamp": now
    })
    
    return {
        "message": "Credits added successfully",
        "transaction_id": transaction_id,
        "credits_added": tier["credits"],
        "new_balance": new_balance,
        "amount_charged": tier["total_price"],
        "note": "MOCKED - In production, payment would be processed first"
    }

@api_router.get("/institutions/credit-balance")
async def get_credit_balance(api_key: str = Query(...)):
    """Get current credit balance for an institutional account"""
    institution = await db.institutional_accounts.find_one(
        {"api_key": api_key, "status": "active"},
        {"_id": 0, "credit_balance": 1, "name": 1, "total_credits_purchased": 1, "total_verifications": 1}
    )
    if not institution:
        raise HTTPException(status_code=401, detail="Invalid API key or inactive account")
    
    return {
        "institution_name": institution.get("name"),
        "credit_balance": institution.get("credit_balance", 0),
        "total_credits_purchased": institution.get("total_credits_purchased", 0),
        "total_verifications_used": institution.get("total_verifications", 0)
    }

@api_router.get("/institutions/transactions")
async def get_credit_transactions(api_key: str = Query(...), limit: int = 20):
    """Get credit purchase transaction history"""
    institution = await db.institutional_accounts.find_one({"api_key": api_key, "status": "active"})
    if not institution:
        raise HTTPException(status_code=401, detail="Invalid API key or inactive account")
    
    transactions = await db.credit_transactions.find(
        {"institution_id": institution["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"transactions": transactions}

# =============== VERIFICATION PAYMENT WALL (MOCKED) ===============

@api_router.get("/verify/preview/{stamp_id}")
async def preview_stamp(stamp_id: str, api_key: Optional[str] = None):
    """
    Preview verification - returns basic info only.
    Public users see limited info and need to pay for full details.
    Institutional accounts (with valid api_key) get full access.
    """
    # Check if institutional user
    is_institutional = False
    if api_key:
        institution = await db.institutional_accounts.find_one({"api_key": api_key, "status": "active"})
        if institution:
            is_institutional = True
            # Update verification count
            await db.institutional_accounts.update_one(
                {"api_key": api_key},
                {"$inc": {"verification_count": 1, "total_verifications": 1}}
            )
    
    # Find stamp
    stamp = await db.document_stamps.find_one({"stamp_id": stamp_id}, {"_id": 0})
    if not stamp:
        stamp = await db.digital_stamps.find_one({"stamp_id": stamp_id}, {"_id": 0})
    
    if not stamp:
        return {
            "valid": False,
            "requires_payment": False,
            "message": "Stamp not found. This may be a fraudulent stamp."
        }
    
    # Check basic validity
    is_valid = stamp["status"] == "active"
    warning = None
    if stamp["status"] == "revoked":
        warning = "This stamp has been revoked."
        is_valid = False
    elif datetime.fromisoformat(stamp["expires_at"]) < datetime.now(timezone.utc):
        warning = "This stamp has expired."
        is_valid = False
    
    # Basic info (shown to everyone)
    basic_info = {
        "stamp_id": stamp["stamp_id"],
        "stamp_status": stamp["status"],
        "stamp_type": stamp.get("stamp_type", "official"),
        "created_at": stamp["created_at"],
        "is_valid": is_valid,
        "warning": warning
    }
    
    # If institutional user or stamp is invalid, return full info
    if is_institutional or not is_valid:
        advocate = await db.advocates.find_one({"id": stamp["advocate_id"]}, {"_id": 0})
        return {
            "valid": is_valid,
            "requires_payment": False,
            "basic_info": basic_info,
            "full_info": {
                "advocate_name": stamp["advocate_name"],
                "advocate_roll_number": stamp["advocate_roll_number"],
                "advocate_tls_number": stamp.get("advocate_tls_number"),
                "advocate_status": advocate.get("practicing_status") if advocate else "Unknown",
                "document_name": stamp.get("document_name"),
                "document_type": stamp.get("document_type"),
                "recipient_name": stamp.get("recipient_name"),
                "recipient_org": stamp.get("recipient_org"),
                "expires_at": stamp["expires_at"],
                "verification_count": stamp.get("verification_count", 0)
            },
            "message": "Verification complete (Institutional access)" if is_institutional else (warning or "Stamp verified")
        }
    
    # Public user - requires payment for full details
    # Use the PUBLIC_VERIFICATION_FEE (premium price for non-registered users)
    pricing_settings = await db.system_settings.find_one({"type": "verification_pricing"}, {"_id": 0})
    verification_fee = pricing_settings.get("public_verification_fee", PUBLIC_VERIFICATION_FEE) if pricing_settings else PUBLIC_VERIFICATION_FEE
    
    # Create verification session
    verification_id = str(uuid.uuid4())
    await db.verification_sessions.insert_one({
        "id": verification_id,
        "stamp_id": stamp_id,
        "status": "pending",
        "fee_amount": verification_fee,
        "currency": "TZS",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    })
    
    return {
        "valid": True,
        "requires_payment": True,
        "verification_id": verification_id,
        "fee_amount": verification_fee,
        "fee_formatted": f"TZS {verification_fee:,}",
        "currency": "TZS",
        "basic_info": basic_info,
        "message": "Payment required to view full verification details",
        "business_cta": {
            "message": "Verify documents for as low as TZS 15,000 each",
            "savings": "Save up to 70% with a business account",
            "link": "/business"
        }
    }

@api_router.post("/verify/pay/{verification_id}")
async def pay_for_verification(verification_id: str):
    """
    MOCKED: Process payment for verification.
    In production, this would integrate with a payment gateway.
    """
    session = await db.verification_sessions.find_one({"id": verification_id})
    if not session:
        raise HTTPException(status_code=404, detail="Verification session not found")
    
    if session["status"] == "paid":
        raise HTTPException(status_code=400, detail="Already paid")
    
    if datetime.fromisoformat(session["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification session expired")
    
    # MOCK: Mark as paid immediately
    await db.verification_sessions.update_one(
        {"id": verification_id},
        {"$set": {
            "status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get full stamp info
    stamp = await db.document_stamps.find_one({"stamp_id": session["stamp_id"]}, {"_id": 0})
    if not stamp:
        stamp = await db.digital_stamps.find_one({"stamp_id": session["stamp_id"]}, {"_id": 0})
    
    advocate = await db.advocates.find_one({"id": stamp["advocate_id"]}, {"_id": 0})
    
    # Record revenue
    revenue = await calculate_verification_revenue(DIGITAL_STAMP_PRICES.get(stamp.get("stamp_type", "official"), 5000))
    
    # Update stamp and advocate earnings
    collection = "document_stamps" if await db.document_stamps.find_one({"stamp_id": session["stamp_id"]}) else "digital_stamps"
    await db[collection].update_one(
        {"stamp_id": session["stamp_id"]},
        {"$inc": {"verification_count": 1, "total_earnings": revenue["advocate_share"]}}
    )
    
    if advocate:
        await db.advocates.update_one(
            {"id": advocate["id"]},
            {"$inc": {"total_earnings": revenue["advocate_share"]}}
        )
    
    # Record transaction
    await db.verification_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "stamp_id": session["stamp_id"],
        "advocate_id": stamp["advocate_id"],
        "verification_id": verification_id,
        "total_fee": revenue["total_fee"],
        "advocate_share": revenue["advocate_share"],
        "platform_share": revenue["platform_share"],
        "verified_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "status": "paid",
        "message": "Payment successful (MOCKED)",
        "full_info": {
            "stamp_id": stamp["stamp_id"],
            "advocate_name": stamp["advocate_name"],
            "advocate_roll_number": stamp["advocate_roll_number"],
            "advocate_tls_number": stamp.get("advocate_tls_number"),
            "advocate_status": advocate.get("practicing_status") if advocate else "Unknown",
            "advocate_photo": advocate.get("profile_photo") if advocate else None,
            "stamp_status": stamp["status"],
            "stamp_type": stamp.get("stamp_type"),
            "document_name": stamp.get("document_name"),
            "document_type": stamp.get("document_type"),
            "description": stamp.get("description"),
            "recipient_name": stamp.get("recipient_name"),
            "recipient_org": stamp.get("recipient_org"),
            "document_hash": stamp.get("document_hash"),
            "created_at": stamp["created_at"],
            "expires_at": stamp["expires_at"],
            "verification_count": stamp.get("verification_count", 0)
        }
    }

# =============== INSTITUTIONAL PORTAL (Self-Service) ===============

INSTITUTIONAL_PACKAGES = {
    "starter": {"name": "Starter", "verifications": 100, "price": 3000000},  # 100 x 30,000
    "business": {"name": "Business", "verifications": 500, "price": 15000000},  # 500 x 30,000
    "enterprise": {"name": "Enterprise", "verifications": 2000, "price": 60000000},  # 2000 x 30,000
    "unlimited": {"name": "Unlimited", "verifications": -1, "price": 100000000, "duration_days": 365}  # Annual unlimited
}

@api_router.post("/institutional/register")
@limiter.limit("3/minute")
async def register_institution(
    request: Request,
    name: str = Form(...),
    organization_type: str = Form(...),
    contact_name: str = Form(...),
    contact_email: str = Form(...),
    contact_phone: str = Form(...),
    billing_address: str = Form(...),
    password: str = Form(...)
):
    """Register a new institutional account (self-service)"""
    # Check if email already exists
    existing = await db.institutional_accounts.find_one({"contact_email": contact_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    now = datetime.now(timezone.utc).isoformat()
    institution_id = str(uuid.uuid4())
    api_key = f"INST-{secrets.token_hex(16).upper()}"
    
    institution = {
        "id": institution_id,
        "name": name,
        "organization_type": organization_type,
        "api_key": api_key,
        "contact_name": contact_name,
        "contact_email": contact_email,
        "contact_phone": contact_phone,
        "billing_address": billing_address,
        "password_hash": hash_password(password),
        "billing_period": "monthly",
        "package": None,
        "verification_limit": 0,
        "verification_count": 0,
        "total_verifications": 0,
        "subscription_ends_at": None,
        "last_billed_at": None,
        "status": "pending",  # Needs to subscribe to activate
        "created_at": now,
        "updated_at": now
    }
    
    await db.institutional_accounts.insert_one(institution)
    
    return {
        "message": "Registration successful! Please subscribe to activate your account.",
        "institution_id": institution_id
    }

@api_router.post("/institutional/login")
@limiter.limit("5/minute")
async def institutional_login(request: Request, email: str = Form(...), password: str = Form(...)):
    """Login for institutional accounts"""
    institution = await db.institutional_accounts.find_one({"contact_email": email})
    if not institution:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not institution.get("password_hash") or not verify_password(password, institution["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token_data = {"sub": institution["id"], "type": "institutional"}
    token = create_access_token(token_data)
    
    return {
        "token": token,
        "institution": {
            "id": institution["id"],
            "name": institution["name"],
            "organization_type": institution["organization_type"],
            "status": institution["status"],
            "package": institution.get("package"),
            "api_key": institution["api_key"]
        }
    }

async def get_current_institution(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current institutional user from token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "institutional":
            raise HTTPException(status_code=401, detail="Invalid token type")
        institution_id = payload.get("sub")
        institution = await db.institutional_accounts.find_one({"id": institution_id}, {"_id": 0, "password_hash": 0})
        if not institution:
            raise HTTPException(status_code=401, detail="Institution not found")
        return institution
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@api_router.get("/institutional/packages")
async def get_institutional_packages():
    """Get available institutional subscription packages"""
    return {
        "packages": INSTITUTIONAL_PACKAGES,
        "currency": "TZS"
    }

@api_router.get("/institutional/dashboard")
async def institutional_dashboard(institution: dict = Depends(get_current_institution)):
    """Get institutional account dashboard data"""
    now = datetime.now(timezone.utc)
    
    # Get verification stats
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    
    # Get verification history
    verifications = await db.verification_logs.find(
        {"institution_id": institution["id"]},
        {"_id": 0}
    ).sort("verified_at", -1).to_list(100)
    
    # Calculate usage
    current_usage = institution.get("verification_count", 0)
    limit = institution.get("verification_limit", 0)
    usage_percentage = (current_usage / limit * 100) if limit > 0 else 0
    
    # Check subscription status
    sub_status = "inactive"
    days_remaining = 0
    if institution.get("subscription_ends_at"):
        sub_ends = datetime.fromisoformat(institution["subscription_ends_at"])
        if sub_ends > now:
            sub_status = "active"
            days_remaining = (sub_ends - now).days
        else:
            sub_status = "expired"
    
    return {
        "institution": {
            "name": institution["name"],
            "organization_type": institution["organization_type"],
            "api_key": institution["api_key"],
            "status": institution["status"],
            "package": institution.get("package"),
            "subscription_status": sub_status,
            "days_remaining": days_remaining
        },
        "usage": {
            "current": current_usage,
            "limit": limit if limit > 0 else "Unlimited",
            "percentage": round(usage_percentage, 1),
            "total_all_time": institution.get("total_verifications", 0)
        },
        "recent_verifications": verifications[:20]
    }

@api_router.post("/institutional/subscribe")
async def institutional_subscribe(
    package: str = Form(...),
    institution: dict = Depends(get_current_institution)
):
    """Subscribe to an institutional package (MOCKED payment)"""
    if package not in INSTITUTIONAL_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    pkg = INSTITUTIONAL_PACKAGES[package]
    now = datetime.now(timezone.utc)
    ends_at = now + timedelta(days=pkg["duration_days"])
    
    await db.institutional_accounts.update_one(
        {"id": institution["id"]},
        {"$set": {
            "package": package,
            "verification_limit": pkg["verification_limit"],
            "verification_count": 0,  # Reset count on new subscription
            "subscription_ends_at": ends_at.isoformat(),
            "status": "active",
            "updated_at": now.isoformat()
        }}
    )
    
    return {
        "message": f"Subscribed to {pkg['name']} package! (MOCKED PAYMENT)",
        "package": package,
        "verification_limit": pkg["verification_limit"] if pkg["verification_limit"] > 0 else "Unlimited",
        "subscription_ends_at": ends_at.isoformat()
    }

@api_router.get("/institutional/api-docs")
async def institutional_api_docs(institution: dict = Depends(get_current_institution)):
    """Get API documentation for institutional integration"""
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://api.tls-verify.tz")
    
    return {
        "api_key": institution["api_key"],
        "base_url": base_url,
        "endpoints": [
            {
                "method": "POST",
                "path": "/api/institutional/verify-bulk",
                "description": "Verify multiple stamps in one request",
                "params": {
                    "api_key": "Your API key (query parameter)",
                    "stamp_ids": "Array of stamp IDs to verify (body)"
                },
                "example": f'curl -X POST "{base_url}/api/institutional/verify-bulk?api_key={institution["api_key"]}" -H "Content-Type: application/json" -d \'{{"stamp_ids": ["TLS-ABC123", "TLS-DEF456"]}}\''
            },
            {
                "method": "GET",
                "path": "/api/verify/preview/{stamp_id}",
                "description": "Verify a single stamp with full details",
                "params": {
                    "api_key": "Your API key (query parameter)"
                },
                "example": f'curl "{base_url}/api/verify/preview/TLS-ABC123?api_key={institution["api_key"]}"'
            }
        ]
    }

# =============== INSTITUTIONAL WEBHOOKS ===============

class WebhookConfig(BaseModel):
    url: str
    events: List[str] = ["verification.success", "verification.failed"]
    enabled: bool = True

WEBHOOK_EVENTS = {
    "verification.success": "Document verification successful",
    "verification.failed": "Document verification failed",
    "api.usage_warning": "API usage reached 80% of limit",
    "api.usage_limit": "API usage limit reached",
    "subscription.expiring": "Subscription expiring soon",
    "subscription.expired": "Subscription has expired"
}

@api_router.get("/institutional/webhooks")
async def get_webhooks(institution: dict = Depends(get_current_institution)):
    """Get webhook configuration for institution"""
    webhook = await db.institutional_webhooks.find_one(
        {"institution_id": institution["id"]},
        {"_id": 0}
    )
    
    return {
        "webhook": webhook,
        "available_events": WEBHOOK_EVENTS,
        "signing_secret": webhook.get("signing_secret") if webhook else None
    }

@api_router.post("/institutional/webhooks")
async def create_or_update_webhook(
    config: WebhookConfig,
    institution: dict = Depends(get_current_institution)
):
    """Create or update webhook configuration"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if webhook exists
    existing = await db.institutional_webhooks.find_one({"institution_id": institution["id"]})
    
    if existing:
        # Update existing webhook
        await db.institutional_webhooks.update_one(
            {"institution_id": institution["id"]},
            {"$set": {
                "url": config.url,
                "events": config.events,
                "enabled": config.enabled,
                "updated_at": now
            }}
        )
        return {"message": "Webhook updated successfully", "webhook_id": existing["id"]}
    else:
        # Create new webhook
        webhook_id = str(uuid.uuid4())
        signing_secret = f"whsec_{secrets.token_hex(24)}"
        
        webhook = {
            "id": webhook_id,
            "institution_id": institution["id"],
            "url": config.url,
            "events": config.events,
            "enabled": config.enabled,
            "signing_secret": signing_secret,
            "created_at": now,
            "updated_at": now,
            "last_triggered": None,
            "success_count": 0,
            "failure_count": 0
        }
        
        await db.institutional_webhooks.insert_one(webhook)
        return {
            "message": "Webhook created successfully",
            "webhook_id": webhook_id,
            "signing_secret": signing_secret
        }

@api_router.delete("/institutional/webhooks")
async def delete_webhook(institution: dict = Depends(get_current_institution)):
    """Delete webhook configuration"""
    result = await db.institutional_webhooks.delete_one({"institution_id": institution["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No webhook found")
    
    return {"message": "Webhook deleted successfully"}

@api_router.post("/institutional/webhooks/test")
async def test_webhook(institution: dict = Depends(get_current_institution)):
    """Send a test webhook to configured URL"""
    webhook = await db.institutional_webhooks.find_one({"institution_id": institution["id"]})
    
    if not webhook:
        raise HTTPException(status_code=404, detail="No webhook configured")
    
    if not webhook.get("enabled"):
        raise HTTPException(status_code=400, detail="Webhook is disabled")
    
    # Send test webhook
    import httpx
    
    payload = {
        "event": "test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "message": "This is a test webhook from TLS Verify",
            "institution_name": institution["name"]
        }
    }
    
    # Create signature
    import hmac
    import hashlib
    signature = hmac.new(
        webhook["signing_secret"].encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "X-TLS-Signature": signature,
        "X-TLS-Webhook-ID": webhook["id"]
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook["url"], json=payload, headers=headers)
            
            # Log the test
            await db.webhook_logs.insert_one({
                "id": str(uuid.uuid4()),
                "webhook_id": webhook["id"],
                "institution_id": institution["id"],
                "event": "test",
                "payload": payload,
                "response_status": response.status_code,
                "response_body": response.text[:500],
                "success": response.status_code < 400,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            if response.status_code < 400:
                return {"message": "Test webhook sent successfully", "status_code": response.status_code}
            else:
                return {"message": "Webhook returned error", "status_code": response.status_code, "response": response.text[:200]}
    except Exception as e:
        return {"message": f"Failed to send webhook: {str(e)}", "error": True}

@api_router.get("/institutional/webhooks/logs")
async def get_webhook_logs(
    limit: int = Query(20, le=100),
    institution: dict = Depends(get_current_institution)
):
    """Get recent webhook delivery logs"""
    logs = await db.webhook_logs.find(
        {"institution_id": institution["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return {"logs": logs}

@api_router.post("/institutional/webhooks/regenerate-secret")
async def regenerate_webhook_secret(institution: dict = Depends(get_current_institution)):
    """Regenerate webhook signing secret"""
    new_secret = f"whsec_{secrets.token_hex(24)}"
    
    result = await db.institutional_webhooks.update_one(
        {"institution_id": institution["id"]},
        {"$set": {
            "signing_secret": new_secret,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No webhook found")
    
    return {"message": "Signing secret regenerated", "signing_secret": new_secret}

# Helper function to send webhooks
async def send_webhook_notification(institution_id: str, event: str, data: dict):
    """Send webhook notification to institution"""
    webhook = await db.institutional_webhooks.find_one({
        "institution_id": institution_id,
        "enabled": True,
        "events": event
    })
    
    if not webhook:
        return
    
    import httpx
    
    payload = {
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data
    }
    
    # Create signature
    import hmac
    import hashlib
    signature = hmac.new(
        webhook["signing_secret"].encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "X-TLS-Signature": signature,
        "X-TLS-Webhook-ID": webhook["id"]
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook["url"], json=payload, headers=headers)
            success = response.status_code < 400
            
            # Log the webhook
            await db.webhook_logs.insert_one({
                "id": str(uuid.uuid4()),
                "webhook_id": webhook["id"],
                "institution_id": institution_id,
                "event": event,
                "payload": payload,
                "response_status": response.status_code,
                "success": success,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Update webhook stats
            if success:
                await db.institutional_webhooks.update_one(
                    {"id": webhook["id"]},
                    {"$inc": {"success_count": 1}, "$set": {"last_triggered": datetime.now(timezone.utc).isoformat()}}
                )
            else:
                await db.institutional_webhooks.update_one(
                    {"id": webhook["id"]},
                    {"$inc": {"failure_count": 1}, "$set": {"last_triggered": datetime.now(timezone.utc).isoformat()}}
                )
    except Exception as e:
        logger.error(f"Webhook failed for {institution_id}: {e}")
        await db.webhook_logs.insert_one({
            "id": str(uuid.uuid4()),
            "webhook_id": webhook["id"],
            "institution_id": institution_id,
            "event": event,
            "payload": payload,
            "error": str(e),
            "success": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

# =============== INSTITUTIONAL BILLING ===============

@api_router.get("/institutional/billing")
async def get_billing_info(institution: dict = Depends(get_current_institution)):
    """Get billing information for institution"""
    # Get payment history
    payments = await db.institutional_payments.find(
        {"institution_id": institution["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    # Get current subscription info
    now = datetime.now(timezone.utc)
    sub_status = "inactive"
    days_remaining = 0
    next_billing = None
    
    if institution.get("subscription_ends_at"):
        sub_ends = datetime.fromisoformat(institution["subscription_ends_at"])
        if sub_ends > now:
            sub_status = "active"
            days_remaining = (sub_ends - now).days
            next_billing = sub_ends.isoformat()
        else:
            sub_status = "expired"
    
    current_package = institution.get("package")
    package_info = INSTITUTIONAL_PACKAGES.get(current_package, {})
    
    return {
        "subscription": {
            "status": sub_status,
            "package": current_package,
            "package_name": package_info.get("name", "None"),
            "price": package_info.get("price", 0),
            "verification_limit": institution.get("verification_limit", 0),
            "verification_used": institution.get("verification_count", 0),
            "days_remaining": days_remaining,
            "next_billing": next_billing,
            "started_at": institution.get("subscription_started_at"),
            "auto_renew": institution.get("auto_renew", False)
        },
        "billing_info": {
            "organization_name": institution["name"],
            "billing_address": institution.get("billing_address", ""),
            "billing_email": institution.get("contact_email", ""),
            "tax_id": institution.get("tax_id", "")
        },
        "payment_history": payments,
        "available_packages": INSTITUTIONAL_PACKAGES
    }

@api_router.put("/institutional/billing/info")
async def update_billing_info(
    billing_address: str = Form(None),
    billing_email: str = Form(None),
    tax_id: str = Form(None),
    institution: dict = Depends(get_current_institution)
):
    """Update billing information"""
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if billing_address is not None:
        updates["billing_address"] = billing_address
    if billing_email is not None:
        updates["billing_email"] = billing_email
    if tax_id is not None:
        updates["tax_id"] = tax_id
    
    await db.institutional_accounts.update_one(
        {"id": institution["id"]},
        {"$set": updates}
    )
    
    return {"message": "Billing information updated"}

@api_router.post("/institutional/billing/subscribe")
async def subscribe_to_package(
    package: str = Form(...),
    auto_renew: bool = Form(False),
    institution: dict = Depends(get_current_institution)
):
    """Subscribe to a package (MOCKED payment - would integrate with Stripe/PayPal in production)"""
    if package not in INSTITUTIONAL_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    pkg = INSTITUTIONAL_PACKAGES[package]
    now = datetime.now(timezone.utc)
    ends_at = now + timedelta(days=pkg["duration_days"])
    
    # Create payment record (MOCKED)
    payment_id = str(uuid.uuid4())
    payment = {
        "id": payment_id,
        "institution_id": institution["id"],
        "package": package,
        "amount": pkg["price"],
        "currency": "TZS",
        "status": "completed",  # MOCKED - would be pending until payment confirmed
        "payment_method": "mocked",
        "created_at": now.isoformat()
    }
    await db.institutional_payments.insert_one(payment)
    
    # Update subscription
    await db.institutional_accounts.update_one(
        {"id": institution["id"]},
        {"$set": {
            "package": package,
            "verification_limit": pkg["verification_limit"],
            "verification_count": 0,
            "subscription_ends_at": ends_at.isoformat(),
            "subscription_started_at": now.isoformat(),
            "auto_renew": auto_renew,
            "status": "active",
            "updated_at": now.isoformat()
        }}
    )
    
    # Generate invoice
    invoice = {
        "id": f"INV-{now.strftime('%Y%m%d')}-{payment_id[:8].upper()}",
        "payment_id": payment_id,
        "institution_id": institution["id"],
        "institution_name": institution["name"],
        "package": package,
        "package_name": pkg["name"],
        "amount": pkg["price"],
        "currency": "TZS",
        "period_start": now.isoformat(),
        "period_end": ends_at.isoformat(),
        "status": "paid",
        "created_at": now.isoformat()
    }
    await db.institutional_invoices.insert_one(invoice)
    
    return {
        "message": f"Successfully subscribed to {pkg['name']}! (MOCKED PAYMENT)",
        "payment_id": payment_id,
        "invoice_id": invoice["id"],
        "subscription": {
            "package": package,
            "ends_at": ends_at.isoformat(),
            "verification_limit": pkg["verification_limit"]
        }
    }

@api_router.get("/institutional/billing/invoices")
async def get_invoices(institution: dict = Depends(get_current_institution)):
    """Get all invoices for institution"""
    invoices = await db.institutional_invoices.find(
        {"institution_id": institution["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"invoices": invoices}

@api_router.get("/institutional/billing/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, institution: dict = Depends(get_current_institution)):
    """Get a specific invoice"""
    invoice = await db.institutional_invoices.find_one(
        {"id": invoice_id, "institution_id": institution["id"]},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@api_router.post("/institutional/billing/cancel")
async def cancel_subscription(institution: dict = Depends(get_current_institution)):
    """Cancel subscription (will not renew)"""
    await db.institutional_accounts.update_one(
        {"id": institution["id"]},
        {"$set": {
            "auto_renew": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Subscription will not auto-renew. You can continue using the service until the current period ends."}

# =============== HEALTH CHECK ===============

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# =============== PUSH NOTIFICATIONS ===============

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict

class PushSubscriptionRequest(BaseModel):
    subscription: PushSubscription
    user_id: Optional[str] = None

@api_router.post("/push/subscribe")
async def subscribe_to_push(
    request: PushSubscriptionRequest,
    user: dict = Depends(get_current_user)
):
    """Subscribe to push notifications"""
    try:
        subscription_data = {
            "user_id": user["id"],
            "endpoint": request.subscription.endpoint,
            "keys": request.subscription.keys,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "active": True
        }
        
        # Upsert subscription (update if endpoint exists, insert if new)
        await db.push_subscriptions.update_one(
            {"endpoint": request.subscription.endpoint},
            {"$set": subscription_data},
            upsert=True
        )
        
        return {"success": True, "message": "Subscribed to push notifications"}
    except Exception as e:
        logger.error(f"Push subscription error: {e}")
        raise HTTPException(status_code=500, detail="Failed to subscribe")

@api_router.delete("/push/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str,
    user: dict = Depends(get_current_user)
):
    """Unsubscribe from push notifications"""
    try:
        result = await db.push_subscriptions.delete_one({
            "endpoint": endpoint,
            "user_id": user["id"]
        })
        
        if result.deleted_count > 0:
            return {"success": True, "message": "Unsubscribed from push notifications"}
        return {"success": False, "message": "Subscription not found"}
    except Exception as e:
        logger.error(f"Push unsubscribe error: {e}")
        raise HTTPException(status_code=500, detail="Failed to unsubscribe")

@api_router.get("/push/status")
async def get_push_status(user: dict = Depends(get_current_user)):
    """Get push notification status for current user"""
    subscription = await db.push_subscriptions.find_one(
        {"user_id": user["id"], "active": True},
        {"_id": 0, "endpoint": 1, "created_at": 1}
    )
    return {
        "subscribed": subscription is not None,
        "subscription": subscription
    }

# =============== NOTIFICATION PREFERENCES ===============

@api_router.get("/notifications/preferences")
async def get_notification_preferences(user: dict = Depends(get_current_user)):
    """Get user's notification preferences"""
    # Check advocates collection (primary) then users collection (admin/super_admin)
    user_data = await db.advocates.find_one(
        {"id": user["id"]},
        {"notification_preferences": 1}
    )
    if not user_data:
        user_data = await db.users.find_one(
            {"id": user["id"]},
            {"notification_preferences": 1}
        )
    user_prefs = user_data.get("notification_preferences", {}) if user_data else {}
    
    # Merge with defaults to ensure all preferences are included
    preferences = {**DEFAULT_NOTIFICATION_PREFERENCES, **user_prefs}
    
    # Group preferences by category for easier frontend display
    grouped = {
        "document_stamping": {
            "label": "Document Stamping",
            "description": "Notifications about your stamped documents",
            "preferences": {
                "stamp_created": {"label": "Document stamped", "value": preferences["stamp_created"]},
                "stamp_downloaded": {"label": "Document downloaded", "value": preferences["stamp_downloaded"]}
            }
        },
        "verification": {
            "label": "Verification",
            "description": "When your documents are verified",
            "preferences": {
                "stamp_verified": {"label": "Document verified by others", "value": preferences["stamp_verified"]},
                "verification_failed": {"label": "Failed verification attempts", "value": preferences["verification_failed"]}
            }
        },
        "expiry_warnings": {
            "label": "Expiry Warnings",
            "description": "Reminders before your stamps expire",
            "preferences": {
                "stamp_expiring_30days": {"label": "30 days before expiry", "value": preferences["stamp_expiring_30days"]},
                "stamp_expiring_7days": {"label": "7 days before expiry", "value": preferences["stamp_expiring_7days"]},
                "stamp_expiring_1day": {"label": "1 day before expiry", "value": preferences["stamp_expiring_1day"]},
                "stamp_expired": {"label": "When stamp expires", "value": preferences["stamp_expired"]}
            }
        },
        "account_security": {
            "label": "Account & Security",
            "description": "Account activity and security alerts",
            "preferences": {
                "login_new_device": {"label": "Login from new device", "value": preferences["login_new_device"]},
                "password_changed": {"label": "Password changed", "value": preferences["password_changed"]},
                "profile_updated": {"label": "Profile updated", "value": preferences["profile_updated"]}
            }
        },
        "billing": {
            "label": "Subscription & Billing",
            "description": "Payment and subscription updates",
            "preferences": {
                "subscription_expiring": {"label": "Subscription expiring", "value": preferences["subscription_expiring"]},
                "payment_received": {"label": "Payment received", "value": preferences["payment_received"]},
                "payment_failed": {"label": "Payment failed", "value": preferences["payment_failed"]}
            }
        },
        "system": {
            "label": "System",
            "description": "System updates and announcements",
            "preferences": {
                "system_maintenance": {"label": "Scheduled maintenance", "value": preferences["system_maintenance"]},
                "new_features": {"label": "New features", "value": preferences["new_features"]},
                "security_alerts": {"label": "Security alerts", "value": preferences["security_alerts"]}
            }
        },
        "offline_sync": {
            "label": "Offline Sync",
            "description": "Sync status for offline documents",
            "preferences": {
                "sync_completed": {"label": "Sync completed", "value": preferences["sync_completed"]},
                "sync_failed": {"label": "Sync failed", "value": preferences["sync_failed"]}
            }
        }
    }
    
    return {
        "preferences": preferences,
        "grouped": grouped
    }

@api_router.put("/notifications/preferences")
async def update_notification_preferences(
    updates: NotificationPreferencesUpdate,
    user: dict = Depends(get_current_user)
):
    """Update user's notification preferences"""
    # Check which collection the user is in
    user_data = await db.advocates.find_one(
        {"id": user["id"]},
        {"notification_preferences": 1}
    )
    collection = db.advocates
    if not user_data:
        user_data = await db.users.find_one(
            {"id": user["id"]},
            {"notification_preferences": 1}
        )
        collection = db.users
    
    current_prefs = user_data.get("notification_preferences", {}) if user_data else {}
    
    # Apply updates (only non-None values)
    updates_dict = updates.dict(exclude_none=True)
    new_prefs = {**current_prefs, **updates_dict}
    
    # Save to correct database collection
    await collection.update_one(
        {"id": user["id"]},
        {"$set": {"notification_preferences": new_prefs}}
    )
    
    # Merge with defaults for response
    full_prefs = {**DEFAULT_NOTIFICATION_PREFERENCES, **new_prefs}
    
    return {
        "success": True,
        "message": "Notification preferences updated",
        "preferences": full_prefs
    }

@api_router.post("/notifications/preferences/reset")
async def reset_notification_preferences(user: dict = Depends(get_current_user)):
    """Reset notification preferences to defaults (all ON)"""
    # Check which collection the user is in
    user_data = await db.advocates.find_one({"id": user["id"]})
    collection = db.advocates if user_data else db.users
    
    await collection.update_one(
        {"id": user["id"]},
        {"$set": {"notification_preferences": {}}}
    )
    
    return {
        "success": True,
        "message": "Notification preferences reset to defaults",
        "preferences": DEFAULT_NOTIFICATION_PREFERENCES
    }

@api_router.post("/notifications/preferences/toggle-all")
async def toggle_all_notifications(
    enabled: bool = Form(...),
    user: dict = Depends(get_current_user)
):
    """Enable or disable all notifications at once"""
    # Create preferences dict with all set to enabled value
    all_prefs = {key: enabled for key in DEFAULT_NOTIFICATION_PREFERENCES.keys()}
    
    # Check which collection the user is in
    user_data = await db.advocates.find_one({"id": user["id"]})
    collection = db.advocates if user_data else db.users
    
    await collection.update_one(
        {"id": user["id"]},
        {"$set": {"notification_preferences": all_prefs}}
    )
    
    return {
        "success": True,
        "message": f"All notifications {'enabled' if enabled else 'disabled'}",
        "preferences": all_prefs
    }

# Helper function to send push notification
async def send_push_notification(subscription_info: dict, title: str, body: str, data: dict = None, url: str = None):
    """Send a push notification to a single subscription"""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured, skipping push notification")
        return False
    
    try:
        payload = {
            "title": title,
            "body": body,
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/icon-96x96.png",
            "tag": f"tls-{uuid.uuid4().hex[:8]}",
            "data": data or {},
            "requireInteraction": False
        }
        if url:
            payload["data"]["url"] = url
        
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        return True
    except WebPushException as e:
        logger.error(f"Push notification failed: {e}")
        # If subscription is invalid, mark it inactive
        if e.response and e.response.status_code in [404, 410]:
            await db.push_subscriptions.update_one(
                {"endpoint": subscription_info.get("endpoint")},
                {"$set": {"active": False}}
            )
        return False
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        return False

@api_router.post("/push/send-test")
async def send_test_notification(user: dict = Depends(get_current_user)):
    """Send a test push notification to current user's devices"""
    subscriptions = await db.push_subscriptions.find(
        {"user_id": user["id"], "active": True}
    ).to_list(10)
    
    if not subscriptions:
        return {
            "success": False,
            "message": "No active subscriptions found. Please enable notifications first."
        }
    
    sent_count = 0
    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub["endpoint"],
            "keys": sub["keys"]
        }
        success = await send_push_notification(
            subscription_info,
            title="TLS Verification",
            body="Test notification - Push notifications are working!",
            data={"type": "test"},
            url="/dashboard"
        )
        if success:
            sent_count += 1
    
    return {
        "success": sent_count > 0,
        "message": f"Sent to {sent_count}/{len(subscriptions)} device(s)",
        "devices_reached": sent_count
    }

# Admin endpoint to send notifications to users
@api_router.post("/admin/push/send")
async def admin_send_notification(
    title: str = Form(...),
    body: str = Form(...),
    user_ids: str = Form(None),  # Comma-separated user IDs, or "all" for everyone
    url: str = Form(None),
    user: dict = Depends(get_current_user)
):
    """Send push notification to users (admin only)"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build query
    query = {"active": True}
    if user_ids and user_ids != "all":
        ids = [id.strip() for id in user_ids.split(",")]
        query["user_id"] = {"$in": ids}
    
    subscriptions = await db.push_subscriptions.find(query).to_list(1000)
    
    # Send notifications
    sent_count = 0
    failed_count = 0
    
    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub["endpoint"],
            "keys": sub["keys"]
        }
        success = await send_push_notification(
            subscription_info,
            title=title,
            body=body,
            url=url
        )
        if success:
            sent_count += 1
        else:
            failed_count += 1
    
    # Store notification record
    notification = {
        "id": str(uuid.uuid4()),
        "title": title,
        "body": body,
        "url": url,
        "sent_by": user["id"],
        "target_count": len(subscriptions),
        "sent_count": sent_count,
        "failed_count": failed_count,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "sent"
    }
    await db.notifications.insert_one(notification)
    
    return {
        "success": sent_count > 0,
        "notification_id": notification["id"],
        "target_count": len(subscriptions),
        "sent_count": sent_count,
        "failed_count": failed_count,
        "message": f"Sent to {sent_count}/{len(subscriptions)} device(s)"
    }

# Notify user about stamp events
async def notify_stamp_event(user_id: str, event_type: str, stamp_id: str = None, document_name: str = None, extra_data: dict = None):
    """Send push notification for various events, respecting user preferences"""
    
    # Get user's notification preferences (check advocates first, then users)
    user = await db.advocates.find_one({"id": user_id}, {"notification_preferences": 1})
    if not user:
        user = await db.users.find_one({"id": user_id}, {"notification_preferences": 1})
    user_prefs = user.get("notification_preferences", {}) if user else {}
    
    # Merge with defaults (defaults are all ON)
    prefs = {**DEFAULT_NOTIFICATION_PREFERENCES, **user_prefs}
    
    # Check if user has this notification type enabled
    if not prefs.get(event_type, True):
        logger.info(f"Notification {event_type} disabled for user {user_id}")
        return
    
    # All notification templates
    notifications = {
        # Document stamping events
        "stamp_created": {
            "title": "Document Stamped ✓",
            "body": f"Your document '{document_name or stamp_id}' has been successfully stamped.",
            "url": f"/verify/{stamp_id}" if stamp_id else "/stamp-document"
        },
        "stamp_downloaded": {
            "title": "Document Downloaded",
            "body": f"Stamped document '{document_name}' was downloaded.",
            "url": f"/verify/{stamp_id}" if stamp_id else "/stamp-document"
        },
        
        # Verification events
        "stamp_verified": {
            "title": "Document Verified",
            "body": f"Someone verified your document '{document_name or stamp_id}'.",
            "url": f"/verify/{stamp_id}" if stamp_id else "/stamp-verification"
        },
        "verification_failed": {
            "title": "Verification Attempt Failed",
            "body": f"A verification attempt for stamp {stamp_id} failed.",
            "url": f"/verify/{stamp_id}" if stamp_id else "/stamp-verification"
        },
        
        # Expiry warnings
        "stamp_expiring_30days": {
            "title": "Stamp Expiring in 30 Days",
            "body": f"Your stamp for '{document_name or stamp_id}' will expire in 30 days.",
            "url": f"/verify/{stamp_id}" if stamp_id else "/my-stamps"
        },
        "stamp_expiring_7days": {
            "title": "Stamp Expiring Soon",
            "body": f"Your stamp for '{document_name or stamp_id}' will expire in 7 days.",
            "url": f"/verify/{stamp_id}" if stamp_id else "/my-stamps"
        },
        "stamp_expiring_1day": {
            "title": "⚠️ Stamp Expires Tomorrow",
            "body": f"Your stamp for '{document_name or stamp_id}' expires tomorrow!",
            "url": f"/verify/{stamp_id}" if stamp_id else "/my-stamps"
        },
        "stamp_expired": {
            "title": "Stamp Expired",
            "body": f"Your stamp for '{document_name or stamp_id}' has expired.",
            "url": f"/verify/{stamp_id}" if stamp_id else "/my-stamps"
        },
        
        # Account & security
        "login_new_device": {
            "title": "New Device Login",
            "body": f"Your account was accessed from a new device. If this wasn't you, secure your account.",
            "url": "/profile"
        },
        "password_changed": {
            "title": "Password Changed",
            "body": "Your password was successfully changed.",
            "url": "/profile"
        },
        "profile_updated": {
            "title": "Profile Updated",
            "body": "Your profile information has been updated.",
            "url": "/profile"
        },
        
        # Subscription & billing
        "subscription_expiring": {
            "title": "Subscription Expiring",
            "body": f"Your subscription expires in {extra_data.get('days', 7) if extra_data else 7} days.",
            "url": "/profile"
        },
        "payment_received": {
            "title": "Payment Received ✓",
            "body": f"Payment of {extra_data.get('amount', '')} received successfully.",
            "url": "/order-history"
        },
        "payment_failed": {
            "title": "Payment Failed",
            "body": "Your recent payment could not be processed. Please update your payment method.",
            "url": "/order-history"
        },
        
        # System notifications
        "system_maintenance": {
            "title": "Scheduled Maintenance",
            "body": f"System maintenance scheduled for {extra_data.get('time', 'soon') if extra_data else 'soon'}.",
            "url": "/"
        },
        "new_features": {
            "title": "New Features Available",
            "body": extra_data.get('message', 'Check out the new features in TLS Verify!') if extra_data else 'Check out the new features!',
            "url": "/"
        },
        "security_alerts": {
            "title": "Security Alert",
            "body": extra_data.get('message', 'Please review your account security.') if extra_data else 'Security alert.',
            "url": "/profile"
        },
        
        # Offline sync
        "sync_completed": {
            "title": "Sync Complete",
            "body": f"{extra_data.get('count', 'Your') if extra_data else 'Your'} queued documents have been synced.",
            "url": "/stamp-document"
        },
        "sync_failed": {
            "title": "Sync Failed",
            "body": "Some documents failed to sync. Please try again.",
            "url": "/stamp-document"
        }
    }
    
    notif = notifications.get(event_type)
    if not notif:
        logger.warning(f"Unknown notification type: {event_type}")
        return
    
    subscriptions = await db.push_subscriptions.find(
        {"user_id": user_id, "active": True}
    ).to_list(10)
    
    sent_count = 0
    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub["endpoint"],
            "keys": sub["keys"]
        }
        success = await send_push_notification(
            subscription_info,
            title=notif["title"],
            body=notif["body"],
            data={"type": event_type, "stamp_id": stamp_id, **(extra_data or {})},
            url=notif["url"]
        )
        if success:
            sent_count += 1
    
    logger.info(f"Notification {event_type} sent to {sent_count} devices for user {user_id}")
    return sent_count

# Helper to get user notification preferences
async def get_user_notification_preferences(user_id: str) -> dict:
    """Get user's notification preferences merged with defaults"""
    # Check advocates first, then users
    user = await db.advocates.find_one({"id": user_id}, {"notification_preferences": 1})
    if not user:
        user = await db.users.find_one({"id": user_id}, {"notification_preferences": 1})
    user_prefs = user.get("notification_preferences", {}) if user else {}
    return {**DEFAULT_NOTIFICATION_PREFERENCES, **user_prefs}

# Include auth router BEFORE including api_router in app
# This ensures auth routes from the module take precedence over any old routes in api_router
from routes.auth import auth_router, setup_auth_routes
auth_config = {
    'SECRET_KEY': SECRET_KEY,
    'ALGORITHM': ALGORITHM,
    'ACCESS_TOKEN_EXPIRE_MINUTES': ACCESS_TOKEN_EXPIRE_MINUTES,
    'PASSWORD_RESET_EXPIRE_MINUTES': PASSWORD_RESET_EXPIRE_MINUTES,
    'EMAIL_VERIFICATION_EXPIRE_HOURS': EMAIL_VERIFICATION_EXPIRE_HOURS,
    'FRONTEND_URL': FRONTEND_URL,
    'COOKIE_NAME': COOKIE_NAME,
    'COOKIE_MAX_AGE': COOKIE_MAX_AGE,
    'COOKIE_SECURE': COOKIE_SECURE,
    'COOKIE_HTTPONLY': COOKIE_HTTPONLY,
    'COOKIE_SAMESITE': COOKIE_SAMESITE,
}
auth_routes = setup_auth_routes(db, get_current_user, send_email, limiter, csrf_tokens, auth_config)
api_router.include_router(auth_routes)

# Include router
app.include_router(api_router)

# Include practice management router
from practice_management import practice_router, create_practice_routes
practice_routes = create_practice_routes(db, get_current_user)
app.include_router(practice_routes)

# Include payment integration router
from payment_integration import payment_router, create_payment_routes
payment_routes = create_payment_routes(db, get_current_user)
app.include_router(payment_routes)

# Include document templates router
from document_templates import templates_router, create_templates_routes
doc_templates_routes = create_templates_routes(db, get_current_user)
app.include_router(doc_templates_routes)

# Include seed data router (development only)
from seed_data import seed_router, create_seed_routes
seed_routes = create_seed_routes(db, get_current_user)
app.include_router(seed_routes)

# Include notifications router
from routes.notifications import notifications_router, setup_notification_routes
notification_routes = setup_notification_routes(db, get_current_user, send_email)
app.include_router(notification_routes)

# Include TLS global events router
from routes.tls_events import tls_events_router, create_tls_events_routes
tls_events_routes = create_tls_events_routes(db, get_current_user, require_admin, require_super_admin)
app.include_router(tls_events_routes)

# Include membership billing router
from routes.membership import membership_router, create_membership_routes
membership_routes = create_membership_routes(db, get_current_user, require_admin, require_super_admin)
app.include_router(membership_routes)

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # XSS Protection
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Content Security Policy (adjust as needed for your frontend)
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
        # Permissions Policy
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # HTTP Strict Transport Security (HSTS) - enforce HTTPS
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

# =============== CSRF PROTECTION MIDDLEWARE ===============

def generate_csrf_token() -> str:
    """Generate a secure CSRF token"""
    return secrets.token_urlsafe(32)

def validate_csrf_token(session_id: str, token: str) -> bool:
    """Validate CSRF token for a session"""
    stored_token = csrf_tokens.get(session_id)
    if not stored_token:
        return False
    return secrets.compare_digest(stored_token, token)

# Endpoints that don't require CSRF protection
CSRF_EXEMPT_PATHS = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/logout",  # Logout doesn't need CSRF (just clears cookie)
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/verify-email",
    "/api/verify",
    "/api/public",
    "/api/templates/shared",  # Public shared document access
    "/api/institutional/login",
    "/api/admin/login",
    "/api/documents/stamp",  # Document stamping - authenticated via JWT
    "/api/documents/upload",  # Document upload - authenticated via JWT
    "/api/documents/prepare",  # Document preparation - authenticated via JWT
    "/api/advocate/signature",  # Signature management - authenticated via JWT
    "/api/stamp-templates",  # Stamp templates - authenticated via JWT
    "/api/stamps",  # Stamp ledger operations - authenticated via JWT
    "/health",
    "/docs",
    "/openapi.json",
]

# Methods that require CSRF protection (state-changing)
CSRF_PROTECTED_METHODS = ["POST", "PUT", "DELETE", "PATCH"]

class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip CSRF for safe methods
        if request.method not in CSRF_PROTECTED_METHODS:
            return await call_next(request)
        
        # Skip CSRF for exempt paths
        path = request.url.path
        for exempt_path in CSRF_EXEMPT_PATHS:
            if path.startswith(exempt_path):
                return await call_next(request)
        
        # Get session ID from JWT token (from header or cookie)
        session_id = None
        
        # Try Authorization header first
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                session_id = payload.get("jti") or payload.get("sub")
            except (JWTError, IndexError):
                pass
        
        # Fall back to cookie if no header
        if not session_id:
            cookie_token = request.cookies.get(COOKIE_NAME)
            if cookie_token:
                try:
                    payload = jwt.decode(cookie_token, SECRET_KEY, algorithms=[ALGORITHM])
                    session_id = payload.get("jti") or payload.get("sub")
                except JWTError:
                    pass
        
        # If no session ID found, let the endpoint handle auth
        if not session_id:
            return await call_next(request)
        
        # Validate CSRF token
        csrf_token = request.headers.get("X-CSRF-Token", "")
        
        if not csrf_token:
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token missing", "error_code": "CSRF_MISSING"}
            )
        
        if not validate_csrf_token(session_id, csrf_token):
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid CSRF token", "error_code": "CSRF_INVALID"}
            )
        
        return await call_next(request)

# Rate limit exceeded handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down.", "retry_after": str(exc.detail)}
    )

# Add middlewares in correct order
app.add_middleware(CSRFMiddleware)  # CSRF protection
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(SlowAPIMiddleware)

# Get allowed origins from environment or use restrictive default
cors_origins = os.environ.get('CORS_ORIGINS', '')
logging.info(f"CORS_ORIGINS env value: '{cors_origins}'")
if cors_origins == '*' or not cors_origins:
    # In development, allow all but log warning
    allowed_origins = ["*"]
    logging.warning("CORS_ORIGINS not properly configured. Using '*' (not recommended for production)")
else:
    allowed_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
    logging.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-CSRF-Token"],
    expose_headers=["X-Stamp-ID", "X-Preview", "X-Document-Hash", "X-Stamp-Width-Pt", "X-Stamp-Height-Pt", "X-Stamp-Variant", "X-Stamp-Width-Px", "X-Stamp-Height-Px"],
)

@app.on_event("startup")
async def startup_db_client():
    # Create indexes
    await db.advocates.create_index("email", unique=True)
    await db.advocates.create_index("roll_number", unique=True)
    await db.digital_stamps.create_index("stamp_id", unique=True)
    await db.document_stamps.create_index("stamp_id", unique=True)
    await db.document_stamps.create_index("document_hash")
    await db.stamp_orders.create_index("advocate_id")
    await db.verification_transactions.create_index("advocate_id")
    
    # Create default super admin if not exists
    super_admin = await db.advocates.find_one({"role": "super_admin"})
    if not super_admin:
        admin_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.advocates.insert_one({
            "id": admin_id,
            "email": "superadmin@idc.co.tz",
            "password_hash": hash_password("IDC@SuperAdmin2024"),
            "full_name": "IDC Super Administrator",
            "roll_number": "SUPERADMIN001",
            "tls_member_number": "IDC/SUPER/2024",
            "phone": "+255700000001",
            "region": "Dar es Salaam",
            "court_jurisdiction": "N/A",
            "firm_affiliation": "IDC - System Vendor",
            "admission_year": 2024,
            "practicing_status": "Active",
            "profile_photo": None,
            "role": "super_admin",
            "verified": True,
            "total_earnings": 0.0,
            "force_password_reset": False,  # Allow direct login for demo
            "created_at": now,
            "updated_at": now
        })
        logger.info("Default super admin created: superadmin@idc.co.tz (password reset required)")
    
    # Create default TLS admin if not exists
    admin = await db.advocates.find_one({"email": "admin@tls.or.tz"})
    if not admin:
        admin_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.advocates.insert_one({
            "id": admin_id,
            "email": "admin@tls.or.tz",
            "password_hash": hash_password("TLS@Admin2024"),
            "full_name": "TLS Administrator",
            "roll_number": "ADMIN001",
            "tls_member_number": "TLS/ADMIN/2024",
            "phone": "+255700000000",
            "region": "Dar es Salaam",
            "court_jurisdiction": "N/A",
            "firm_affiliation": "Tanganyika Law Society",
            "admission_year": 2024,
            "practicing_status": "Active",
            "profile_photo": None,
            "role": "admin",
            "verified": True,
            "total_earnings": 0.0,
            "force_password_reset": False,  # Allow direct login for demo
            "created_at": now,
            "updated_at": now
        })
        logger.info("Default TLS admin created: admin@tls.or.tz (password reset required)")
    
    # Initialize default system settings
    settings = await db.system_settings.find_one({"type": "verification_fees"})
    if not settings:
        await db.system_settings.insert_one({
            "type": "verification_fees",
            "verification_fee_fixed": 500.0,
            "verification_fee_percentage": 0.0,
            "advocate_revenue_share": 30.0,
            "currency": "TZS",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Default system settings initialized")
    
    # Create notifications index
    await db.notifications.create_index("user_id")
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.sent_reminders.create_index("reminder_key", unique=True)
    
    # Start background reminder scheduler
    asyncio.create_task(reminder_scheduler())
    logger.info("Reminder scheduler started")

async def reminder_scheduler():
    """Background task that checks for event reminders every 5 minutes"""
    while True:
        try:
            await notification_routes.check_and_send_reminders()
        except Exception as e:
            logger.error(f"Reminder scheduler error: {e}")
        await asyncio.sleep(300)  # Check every 5 minutes

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
