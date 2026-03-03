"""
Verification Routes - Public stamp and document verification
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import hashlib
import logging

logger = logging.getLogger(__name__)

verification_router = APIRouter(prefix="/verify", tags=["Verification"])


def get_verification_dependencies():
    """Import dependencies from main server module at runtime to avoid circular imports"""
    from server import (
        db, limiter, generate_document_hash, log_stamp_event,
        calculate_verification_revenue, crypto_service,
        DIGITAL_STAMP_PRICES, VerificationResult
    )
    return {
        "db": db,
        "limiter": limiter,
        "generate_document_hash": generate_document_hash,
        "log_stamp_event": log_stamp_event,
        "calculate_verification_revenue": calculate_verification_revenue,
        "crypto_service": crypto_service,
        "DIGITAL_STAMP_PRICES": DIGITAL_STAMP_PRICES,
        "VerificationResult": VerificationResult
    }


@verification_router.get("/stamp/{stamp_id}")
async def verify_stamp(stamp_id: str, request: Request):
    """
    Public verification endpoint - checks both document stamps and digital stamps.
    Returns full verification result including advocate info, stamp status, and crypto verification.
    """
    deps = get_verification_dependencies()
    db = deps["db"]
    log_stamp_event = deps["log_stamp_event"]
    calculate_verification_revenue = deps["calculate_verification_revenue"]
    crypto_service = deps["crypto_service"]
    DIGITAL_STAMP_PRICES = deps["DIGITAL_STAMP_PRICES"]
    VerificationResult = deps["VerificationResult"]
    
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
    
    # Log verification
    await db.verification_logs.insert_one({
        "id": str(uuid.uuid4()),
        "stamp_id": stamp_id,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "result": "valid" if not warning else "warning"
    })
    
    # Log stamp event (audit trail)
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


@verification_router.post("/document")
async def verify_document_by_hash(file: UploadFile = File(...), request: Request = None):
    """Verify document by uploading and checking hash"""
    deps = get_verification_dependencies()
    db = deps["db"]
    generate_document_hash = deps["generate_document_hash"]
    VerificationResult = deps["VerificationResult"]
    
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


@verification_router.post("/stamp/{stamp_id}/validate-document")
async def validate_document_against_stamp(
    stamp_id: str,
    file: UploadFile = File(...),
    request: Request = None
):
    """
    Validate an uploaded document matches the stored hash for a specific stamp.
    This is the tamper-proof verification - proves the document hasn't been modified.
    """
    deps = get_verification_dependencies()
    db = deps["db"]
    generate_document_hash = deps["generate_document_hash"]
    log_stamp_event = deps["log_stamp_event"]
    
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
