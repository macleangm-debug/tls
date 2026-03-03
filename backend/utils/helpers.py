"""
Utility functions for TLS Practice Management Suite
"""
import hashlib
import secrets
import uuid
import base64
import qrcode
from io import BytesIO
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from PIL import Image
import logging

logger = logging.getLogger(__name__)


# =============== PASSWORD UTILITIES ===============

def hash_password(password: str, pwd_context) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str, pwd_context) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


# =============== TOKEN UTILITIES ===============

def create_access_token(data: dict, secret_key: str, algorithm: str, expire_minutes: int) -> str:
    """Create a JWT access token"""
    import jwt
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


# =============== ID GENERATORS ===============

def generate_stamp_id() -> str:
    """Generate a unique stamp ID"""
    return f"TLS-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"


def generate_tls_member_number(roll_number: str) -> str:
    """Generate TLS member number from roll number"""
    return f"TLS/{roll_number}/{datetime.now().year}"


def generate_stamp_hash(stamp_id: str, advocate_id: str, document_hash: str, timestamp: str) -> str:
    """Generate a hash for stamp verification"""
    data = f"{stamp_id}:{advocate_id}:{document_hash}:{timestamp}:{secrets.token_hex(16)}"
    return hashlib.sha256(data.encode()).hexdigest()


def generate_document_hash(content: bytes) -> str:
    """Generate SHA-256 hash of document content"""
    return hashlib.sha256(content).hexdigest()


def generate_uuid() -> str:
    """Generate a UUID string"""
    return str(uuid.uuid4())


# =============== QR CODE UTILITIES ===============

def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def generate_qr_code(data: str, size: int = 200) -> str:
    """Generate a basic QR code as base64 string"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1B365D", back_color="white")
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()


def generate_branded_qr_code(data: str, size: int = 200, brand_color: str = "#10B981") -> str:
    """Generate a branded QR code with custom color"""
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    rgb_color = hex_to_rgb(brand_color)
    img = qr.make_image(fill_color=rgb_color, back_color="white")
    img = img.convert('RGBA')
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()


# =============== DATE UTILITIES ===============

def get_utc_now() -> datetime:
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)


def get_utc_now_iso() -> str:
    """Get current UTC datetime as ISO string"""
    return datetime.now(timezone.utc).isoformat()


def add_days(dt: datetime, days: int) -> datetime:
    """Add days to a datetime"""
    return dt + timedelta(days=days)


def add_years(dt: datetime, years: int) -> datetime:
    """Add years to a datetime"""
    return dt.replace(year=dt.year + years)


# =============== VALIDATION UTILITIES ===============

def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    """
    Validate password strength requirements.
    Returns (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False, "Password must contain at least one special character"
    return True, None


def validate_roll_number(roll_number: str) -> Tuple[bool, Optional[str]]:
    """
    Validate advocate roll number format.
    Returns (is_valid, error_message)
    """
    # Basic format validation - can be customized
    if not roll_number or len(roll_number) < 3:
        return False, "Roll number is required and must be at least 3 characters"
    return True, None


# =============== FILE UTILITIES ===============

def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return filename.lower().split('.')[-1] if '.' in filename else ''


def is_supported_image(content_type: str) -> bool:
    """Check if content type is a supported image format"""
    return content_type in ["image/png", "image/jpeg", "image/jpg"]


def is_supported_document(content_type: str) -> bool:
    """Check if content type is a supported document format"""
    supported = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/vnd.oasis.opendocument.text",
        "application/rtf",
        "text/rtf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint",
        "application/vnd.oasis.opendocument.presentation",
        "text/plain",
        "text/html",
    ]
    return content_type in supported


# =============== ACHIEVEMENT CALCULATIONS ===============

def calculate_achievements(stamp_count: int, total_verifications: int, profile_completion: int, percentile_rank: int) -> list:
    """Calculate earned achievements based on metrics"""
    achievements = [
        {
            "id": "first_stamp",
            "title": "First Stamp",
            "description": "Created your first digital stamp",
            "earned": stamp_count >= 1,
            "icon": "award"
        },
        {
            "id": "stamping_pro",
            "title": "Stamping Pro",
            "description": "Created 50+ digital stamps",
            "earned": stamp_count >= 50,
            "icon": "star"
        },
        {
            "id": "stamping_master",
            "title": "Stamping Master",
            "description": "Created 200+ digital stamps",
            "earned": stamp_count >= 200,
            "icon": "crown"
        },
        {
            "id": "verified_professional",
            "title": "Verified Professional",
            "description": "Had stamps verified 100+ times",
            "earned": total_verifications >= 100,
            "icon": "check-circle"
        },
        {
            "id": "trusted_advocate",
            "title": "Trusted Advocate",
            "description": "Had stamps verified 500+ times",
            "earned": total_verifications >= 500,
            "icon": "shield-check"
        },
        {
            "id": "complete_profile",
            "title": "Complete Profile",
            "description": "Filled out all profile information",
            "earned": profile_completion >= 100,
            "icon": "user-check"
        },
        {
            "id": "top_10_percent",
            "title": "Top 10%",
            "description": "Among the top 10% most verified advocates",
            "earned": percentile_rank <= 10,
            "icon": "trending-up"
        }
    ]
    return achievements
