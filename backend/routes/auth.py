"""
Authentication Module for TLS Advocate Portal
Handles user registration, login, logout, email verification, and password management
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime, timezone, timedelta
import secrets
import re
import uuid
import logging
import asyncio
from jose import jwt, JWTError
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# Create router - routes will be prefixed with /api via api_router inclusion
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# =============== PYDANTIC MODELS ===============

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

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr


# =============== MODULE STATE (set during setup) ===============
_db = None
_get_current_user = None
_send_email = None
_limiter = None
_csrf_tokens = None
_config = {}


def setup_auth_routes(
    db,
    get_current_user,
    send_email_func,
    limiter,
    csrf_tokens: dict,
    config: dict
):
    """
    Setup auth routes with dependencies injected from main server.
    
    Args:
        db: MongoDB database instance
        get_current_user: Dependency function to get current authenticated user
        send_email_func: Async function to send emails
        limiter: Rate limiter instance
        csrf_tokens: Dictionary storing CSRF tokens
        config: Configuration dict containing:
            - SECRET_KEY
            - ALGORITHM
            - ACCESS_TOKEN_EXPIRE_MINUTES
            - PASSWORD_RESET_EXPIRE_MINUTES
            - EMAIL_VERIFICATION_EXPIRE_HOURS
            - FRONTEND_URL
            - COOKIE_NAME
            - COOKIE_MAX_AGE
            - COOKIE_SECURE
            - COOKIE_HTTPONLY
            - COOKIE_SAMESITE
    """
    global _db, _get_current_user, _send_email, _limiter, _csrf_tokens, _config
    _db = db
    _get_current_user = get_current_user
    _send_email = send_email_func
    _limiter = limiter
    _csrf_tokens = csrf_tokens
    _config = config
    
    return auth_router


# =============== PASSWORD UTILITIES ===============

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

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


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=_config.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _config['SECRET_KEY'], algorithm=_config['ALGORITHM'])


def generate_csrf_token() -> str:
    """Generate a secure CSRF token"""
    return secrets.token_urlsafe(32)


def generate_tls_member_number(roll_number: str) -> str:
    return f"TLS/{roll_number}/{datetime.now().year}"


# =============== EMAIL TEMPLATES ===============

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
                                <div style="background: #10b981; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                                    <span style="color: white; font-size: 28px; font-weight: bold;">TLS</span>
                                </div>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Verify Your Email</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #94a3b8; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
                                <p>Hello {user_name},</p>
                                <p>Welcome to TLS Verification! Please verify your email address to complete your registration and access all features.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center; padding-bottom: 24px;">
                                <a href="{verification_url}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; font-size: 16px;">Verify Email</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; font-size: 14px; line-height: 20px; padding-bottom: 24px;">
                                <p>This link will expire in <strong>24 hours</strong>.</p>
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


def generate_welcome_email(user_name: str, login_url: str) -> str:
    """Generate HTML email template for welcome message after verification"""
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
                                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Welcome to TLS Verification!</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #94a3b8; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
                                <p>Dear {user_name},</p>
                                <p>Congratulations! Your email has been verified and your TLS Verification account is now fully activated.</p>
                                <p>You can now:</p>
                                <ul style="color: #94a3b8; padding-left: 20px;">
                                    <li>Digitally stamp your legal documents</li>
                                    <li>Manage your practice efficiently</li>
                                    <li>Access verification services</li>
                                </ul>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center; padding-bottom: 24px;">
                                <a href="{login_url}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 8px; font-size: 16px;">Login to Your Account</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; font-size: 14px; line-height: 20px;">
                                <p>If you have any questions, please don't hesitate to contact our support team.</p>
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
                                <div style="background: #f59e0b; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                                    <span style="color: white; font-size: 28px; font-weight: bold;">!</span>
                                </div>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Password Changed</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #94a3b8; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
                                <p>Hello {user_name},</p>
                                <p>Your TLS Verification account password has been successfully changed.</p>
                                <p>If you made this change, you can safely ignore this email.</p>
                                <p style="color: #ef4444;"><strong>If you did NOT make this change</strong>, please contact our support team immediately as your account may have been compromised.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; font-size: 14px; line-height: 20px;">
                                <p>For security reasons, we recommend:</p>
                                <ul style="padding-left: 20px;">
                                    <li>Using a unique password for each account</li>
                                    <li>Enabling two-factor authentication when available</li>
                                    <li>Regularly reviewing your account activity</li>
                                </ul>
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
    """Generate HTML email template for new login alert"""
    current_time = datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M %p UTC")
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
                                <div style="background: #3b82f6; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                                    <span style="color: white; font-size: 28px; font-weight: bold;">i</span>
                                </div>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">New Login Detected</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #94a3b8; font-size: 16px; line-height: 24px; padding-bottom: 24px;">
                                <p>Hello {user_name},</p>
                                <p>We noticed a new login to your TLS Verification account. Here are the details:</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: rgba(59, 130, 246, 0.1); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                                <table width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="color: #64748b; font-size: 14px; padding-bottom: 8px;">Time:</td>
                                        <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px; text-align: right;">{current_time}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #64748b; font-size: 14px; padding-bottom: 8px;">IP Address:</td>
                                        <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px; text-align: right;">{ip_address}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #64748b; font-size: 14px; padding-bottom: 8px;">Location:</td>
                                        <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px; text-align: right;">{location}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #64748b; font-size: 14px;">Device:</td>
                                        <td style="color: #ffffff; font-size: 14px; text-align: right;">{user_agent[:50]}...</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; font-size: 14px; line-height: 20px; padding-top: 24px;">
                                <p>If this was you, you can safely ignore this email.</p>
                                <p style="color: #ef4444;"><strong>If this wasn't you</strong>, we recommend changing your password immediately and contacting support.</p>
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


# =============== HELPER FUNCTIONS ===============

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
    await _db.login_attempts.insert_one(log_entry)
    
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
    failed_from_ip = await _db.login_attempts.count_documents({
        "ip_address": ip_address,
        "success": False,
        "timestamp": {"$gte": one_hour_ago.isoformat()}
    })
    
    # Count failed attempts for this email in last hour
    failed_for_email = await _db.login_attempts.count_documents({
        "email": email,
        "success": False,
        "timestamp": {"$gte": one_hour_ago.isoformat()}
    })
    
    # Check if login from new IP for this user
    user_ips = await _db.login_attempts.distinct("ip_address", {
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


# =============== AUTH ENDPOINTS ===============

@auth_router.post("/register")
async def register(request: Request, data: AdvocateRegister):
    """Register a new advocate account"""
    # Apply rate limiting
    if _limiter:
        await _limiter._check_request_limit(request, None, "5/minute", "register")
    
    existing = await _db.advocates.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_roll = await _db.advocates.find_one({"roll_number": data.roll_number})
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
    verification_expires = (datetime.now(timezone.utc) + timedelta(hours=_config.get('EMAIL_VERIFICATION_EXPIRE_HOURS', 24))).isoformat()
    
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
        "email_verified": False,
        "verification_token": verification_token,
        "verification_token_expires": verification_expires,
        "total_earnings": 0.0,
        "created_at": now,
        "updated_at": now
    }
    
    await _db.advocates.insert_one(advocate)
    
    await _db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "advocate_registered",
        "user_id": advocate_id,
        "details": {"email": data.email, "roll_number": data.roll_number},
        "timestamp": now
    })
    
    # Send email verification email
    frontend_url = _config.get('FRONTEND_URL', '')
    verification_url = f"{frontend_url}/verify-email?token={verification_token}"
    try:
        if _send_email:
            await _send_email(
                to_email=data.email,
                subject="Verify Your Email - TLS Verification",
                html_content=generate_email_verification_email(verification_url, data.full_name)
            )
            logger.info(f"Verification email sent to {data.email}")
    except Exception as e:
        logger.warning(f"Failed to send verification email: {e}")
    
    return {
        "message": "Registration successful! Please check your email to verify your account.",
        "email": data.email,
        "requires_verification": True
    }


@auth_router.post("/login")
async def login(request: Request, data: AdvocateLogin):
    """Login to account"""
    # Apply rate limiting
    if _limiter:
        await _limiter._check_request_limit(request, None, "5/minute", "login")
    
    # Get request metadata for logging
    ip_address = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    if "," in ip_address:
        ip_address = ip_address.split(",")[0].strip()
    user_agent = request.headers.get("User-Agent", "unknown")
    
    # Inner function for logging (simplified version for login endpoint)
    async def log_attempt(email: str, success: bool, failure_reason: str = None, user_id: str = None):
        await log_login_attempt(email, success, ip_address, user_agent, failure_reason, user_id)
    
    # Find user in advocates or users collection
    user = await _db.advocates.find_one({"email": data.email})
    if not user:
        user = await _db.users.find_one({"email": data.email})
    
    if not user:
        logger.warning(f"Login attempt for non-existent email: {data.email}")
        await log_attempt(data.email, False, "user_not_found")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        logger.warning(f"Failed login attempt for: {data.email}")
        await log_attempt(data.email, False, "invalid_password", user.get("id"))
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if advocate is suspended
    if user.get("practicing_status") == "Suspended":
        await log_attempt(data.email, False, "account_suspended", user.get("id"))
        raise HTTPException(status_code=403, detail="Account suspended. Contact TLS administration.")
    
    # Check if email is verified (only for advocates, not admins)
    if user.get("role") == "advocate" and not user.get("email_verified", False):
        await log_attempt(data.email, False, "email_not_verified", user.get("id"))
        raise HTTPException(
            status_code=403, 
            detail="Please verify your email before logging in. Check your inbox for the verification link."
        )
    
    # Log successful login
    await log_attempt(data.email, True, None, user.get("id"))
    
    # Check if password reset is required (for default accounts)
    force_password_reset = user.get("force_password_reset", False)
    
    # Generate JWT with a unique ID for CSRF token binding
    jti = str(uuid.uuid4())
    token = create_access_token({"sub": user["id"], "role": user.get("role", "advocate"), "jti": jti})
    
    # Generate CSRF token and store it
    csrf_token = generate_csrf_token()
    _csrf_tokens[jti] = csrf_token
    
    # Clean up old CSRF tokens (keep last 1000 per simple cleanup)
    if len(_csrf_tokens) > 1000:
        keys_to_remove = list(_csrf_tokens.keys())[:-500]
        for key in keys_to_remove:
            _csrf_tokens.pop(key, None)
    
    # Return user info with token and CSRF token
    user_data = {k: v for k, v in user.items() if k not in ["_id", "password_hash", "verification_token", "verification_token_expires"]}
    user_data["force_password_reset"] = force_password_reset
    
    response_data = {
        "access_token": token,
        "token_type": "bearer", 
        "user": user_data,
        "csrf_token": csrf_token
    }
    
    response = JSONResponse(content=response_data)
    
    # Set HttpOnly cookie with JWT
    response.set_cookie(
        key=_config.get('COOKIE_NAME', 'tls_access_token'),
        value=token,
        max_age=_config.get('COOKIE_MAX_AGE', 86400),
        httponly=_config.get('COOKIE_HTTPONLY', True),
        secure=_config.get('COOKIE_SECURE', True),
        samesite=_config.get('COOKIE_SAMESITE', 'lax'),
        path="/"
    )
    
    return response


@auth_router.get("/me")
async def get_me(user: dict = Depends(lambda: _get_current_user)):
    """Get current authenticated user info"""
    current_user = await _get_current_user()
    return {k: v for k, v in current_user.items() if k not in ["_id", "password_hash", "verification_token", "verification_token_expires"]}


@auth_router.post("/logout")
async def logout(request: Request):
    """Logout user by clearing the HttpOnly cookie"""
    cookie_name = _config.get('COOKIE_NAME', 'tls_access_token')
    cookie_token = request.cookies.get(cookie_name)
    
    if cookie_token:
        try:
            payload = jwt.decode(cookie_token, _config['SECRET_KEY'], algorithms=[_config['ALGORITHM']])
            jti = payload.get("jti")
            if jti and jti in _csrf_tokens:
                del _csrf_tokens[jti]
        except JWTError:
            pass
    
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(
        key=cookie_name,
        path="/",
        secure=_config.get('COOKIE_SECURE', True),
        httponly=_config.get('COOKIE_HTTPONLY', True),
        samesite=_config.get('COOKIE_SAMESITE', 'lax')
    )
    
    return response


@auth_router.get("/verify-email/{token}")
async def verify_email(token: str):
    """Verify user's email address using the verification token"""
    user = await _db.advocates.find_one({"verification_token": token})
    
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
    await _db.advocates.update_one(
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
    await _db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "email_verified",
        "user_id": user["id"],
        "details": {"email": user["email"]},
        "timestamp": now
    })
    
    # Send welcome email now that they're verified
    try:
        frontend_url = _config.get('FRONTEND_URL', '')
        if _send_email:
            await _send_email(
                to_email=user["email"],
                subject="Welcome to TLS Verification",
                html_content=generate_welcome_email(user["full_name"], f"{frontend_url}/login")
            )
    except Exception as e:
        logger.warning(f"Failed to send welcome email after verification: {e}")
    
    logger.info(f"Email verified for user: {user['email']}")
    return {"message": "Email verified successfully! You can now log in.", "verified": True}


@auth_router.post("/resend-verification")
async def resend_verification(request: Request, data: ResendVerificationRequest):
    """Resend email verification link"""
    # Apply rate limiting
    if _limiter:
        await _limiter._check_request_limit(request, None, "3/minute", "resend_verification")
    
    user = await _db.advocates.find_one({"email": data.email})
    
    if not user:
        return {"message": "If the email exists in our system, a verification link will be sent."}
    
    if user.get("email_verified", False):
        raise HTTPException(status_code=400, detail="Email is already verified. Please log in.")
    
    # Generate new verification token
    verification_token = secrets.token_urlsafe(32)
    verification_expires = (datetime.now(timezone.utc) + timedelta(hours=_config.get('EMAIL_VERIFICATION_EXPIRE_HOURS', 24))).isoformat()
    
    await _db.advocates.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "verification_token": verification_token,
                "verification_token_expires": verification_expires,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    frontend_url = _config.get('FRONTEND_URL', '')
    verification_url = f"{frontend_url}/verify-email?token={verification_token}"
    try:
        if _send_email:
            await _send_email(
                to_email=data.email,
                subject="Verify Your Email - TLS Verification",
                html_content=generate_email_verification_email(verification_url, user["full_name"])
            )
            logger.info(f"Verification email resent to {data.email}")
    except HTTPException as e:
        logger.warning(f"Email service error (resend verification): {e.detail}")
        return {"message": "Verification email requested. If you don't receive it, please contact support."}
    except Exception as e:
        logger.error(f"Failed to resend verification email: {e}")
        return {"message": "Verification email requested. If you don't receive it, please contact support."}
    
    return {"message": "Verification email sent. Please check your inbox."}


@auth_router.post("/change-password")
async def change_password(request: Request, data: PasswordChange):
    """Change user password with strict validation"""
    # Apply rate limiting
    if _limiter:
        await _limiter._check_request_limit(request, None, "3/minute", "change_password")
    
    user = await _get_current_user(request)
    
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
    
    result = await _db.advocates.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": new_hash, "force_password_reset": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        await _db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password_hash": new_hash, "force_password_reset": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    logger.info(f"Password changed for user: {user.get('email')}")
    
    # Send password changed notification email
    try:
        if _send_email:
            await _send_email(
                to_email=user.get('email'),
                subject="TLS Verification - Password Changed",
                html_content=generate_password_changed_email(user.get('full_name', 'User'))
            )
    except Exception as e:
        logger.warning(f"Failed to send password change notification: {e}")
    
    return {"message": "Password changed successfully"}


@auth_router.post("/forgot-password")
async def forgot_password(request: Request, data: PasswordResetRequest):
    """Request password reset email"""
    # Apply rate limiting
    if _limiter:
        await _limiter._check_request_limit(request, None, "3/minute", "forgot_password")
    
    user = await _db.advocates.find_one({"email": data.email}, {"_id": 0})
    if not user:
        user = await _db.users.find_one({"email": data.email}, {"_id": 0})
    
    if not user:
        logger.warning(f"Password reset requested for non-existent email: {data.email}")
        return {"message": "If an account exists with this email, you will receive a password reset link"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    reset_expiry = datetime.now(timezone.utc) + timedelta(minutes=_config.get('PASSWORD_RESET_EXPIRE_MINUTES', 30))
    
    await _db.password_reset_tokens.delete_many({"email": data.email})
    await _db.password_reset_tokens.insert_one({
        "email": data.email,
        "token": reset_token,
        "expires_at": reset_expiry.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    frontend_url = _config.get('FRONTEND_URL', '')
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"
    
    try:
        if _send_email:
            await _send_email(
                to_email=data.email,
                subject="TLS Verification - Password Reset",
                html_content=generate_password_reset_email(reset_url, user.get('full_name', 'User'))
            )
            logger.info(f"Password reset email sent to: {data.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
    
    return {"message": "If an account exists with this email, you will receive a password reset link"}


@auth_router.post("/reset-password")
async def reset_password(request: Request, data: PasswordResetConfirm):
    """Reset password using token from email"""
    # Apply rate limiting
    if _limiter:
        await _limiter._check_request_limit(request, None, "3/minute", "reset_password")
    
    token_doc = await _db.password_reset_tokens.find_one({"token": data.token}, {"_id": 0})
    
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    expiry = datetime.fromisoformat(token_doc["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expiry:
        await _db.password_reset_tokens.delete_one({"token": data.token})
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one")
    
    is_valid, error_message = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    email = token_doc["email"]
    
    user = await _db.advocates.find_one({"email": email}, {"_id": 0})
    collection = "advocates"
    if not user:
        user = await _db.users.find_one({"email": email}, {"_id": 0})
        collection = "users"
    
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    if verify_password(data.new_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="New password must be different from your previous password")
    
    new_hash = hash_password(data.new_password)
    if collection == "advocates":
        await _db.advocates.update_one(
            {"email": email},
            {"$set": {"password_hash": new_hash, "force_password_reset": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await _db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": new_hash, "force_password_reset": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    await _db.password_reset_tokens.delete_one({"token": data.token})
    
    logger.info(f"Password reset successfully for: {email}")
    
    try:
        if _send_email:
            await _send_email(
                to_email=email,
                subject="TLS Verification - Password Reset Successful",
                html_content=generate_password_changed_email(user.get('full_name', 'User'))
            )
    except Exception as e:
        logger.warning(f"Failed to send password reset confirmation: {e}")
    
    return {"message": "Password has been reset successfully. You can now login with your new password"}


@auth_router.get("/password-rules")
async def get_password_rules():
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


# Export helper functions for use by other modules
auth_router.hash_password = hash_password
auth_router.verify_password = verify_password
auth_router.validate_password_strength = validate_password_strength
auth_router.create_access_token = create_access_token
auth_router.generate_csrf_token = generate_csrf_token
auth_router.log_login_attempt = log_login_attempt
auth_router.check_suspicious_activity = check_suspicious_activity
