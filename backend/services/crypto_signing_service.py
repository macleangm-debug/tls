"""
Cryptographic Signing Service for TLS Stamps
Uses ECDSA P-256 with SHA-256 for non-forgeable stamp signatures
"""
import os
import json
import base64
import hashlib
from typing import Optional, Tuple
from datetime import datetime, timezone
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature
import logging

logger = logging.getLogger(__name__)

# Signature algorithm identifier
SIG_ALG = "ECDSA_P256_SHA256"
SIGNING_VERSION = "TLS-STAMP-SIG-V1"


class CryptoSigningService:
    """Service for cryptographic signing and verification of TLS stamps"""
    
    def __init__(self):
        self.private_key = None
        self.public_key = None
        self.key_id = os.environ.get("TLS_SIGNING_KEY_ID", "tls-key-2026-01")
        self._load_keys()
    
    def _load_keys(self):
        """Load signing keys from environment variables"""
        try:
            # Load private key (for signing)
            private_key_b64 = os.environ.get("TLS_PRIVATE_KEY_B64")
            if private_key_b64:
                private_pem = base64.b64decode(private_key_b64)
                self.private_key = serialization.load_pem_private_key(private_pem, password=None)
                logger.info(f"Loaded TLS signing private key: {self.key_id}")
            else:
                logger.warning("TLS_PRIVATE_KEY_B64 not set - signing disabled")
            
            # Load public key (for verification)
            public_key_b64 = os.environ.get("TLS_PUBLIC_KEY_B64")
            if public_key_b64:
                public_pem = base64.b64decode(public_key_b64)
                self.public_key = serialization.load_pem_public_key(public_pem)
                logger.info(f"Loaded TLS signing public key: {self.key_id}")
            elif self.private_key:
                # Derive public key from private key
                self.public_key = self.private_key.public_key()
        except Exception as e:
            logger.error(f"Failed to load TLS signing keys: {e}")
    
    @staticmethod
    def canonical_stamp_payload(
        stamp_id: str,
        doc_hash: str,
        issued_at: str,
        advocate_id: str,
        expires_at: Optional[str] = None
    ) -> bytes:
        """
        Create canonical payload bytes for signing.
        - Stable JSON with sorted keys
        - No extra whitespace
        - Deterministic ordering
        """
        payload = {
            "v": SIGNING_VERSION,
            "stamp_id": stamp_id,
            "doc_hash_sha256": doc_hash,
            "issued_at": issued_at,
            "advocate_id": str(advocate_id),
            "expires_at": expires_at or ""
        }
        return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    
    @staticmethod
    def sha256_hex(data: bytes) -> str:
        """Compute SHA-256 hash of data and return as hex string"""
        return hashlib.sha256(data).hexdigest()
    
    def sign_stamp(
        self,
        stamp_id: str,
        doc_hash: str,
        issued_at: str,
        advocate_id: str,
        expires_at: Optional[str] = None
    ) -> Optional[dict]:
        """
        Sign a stamp record and return signature metadata.
        
        Returns:
            Dict with signature_b64, signature_alg, key_id, signed_payload_hash
            Or None if signing is not available
        """
        if not self.private_key:
            logger.warning("Cannot sign stamp - private key not loaded")
            return None
        
        try:
            # Build canonical payload
            payload_bytes = self.canonical_stamp_payload(
                stamp_id=stamp_id,
                doc_hash=doc_hash,
                issued_at=issued_at,
                advocate_id=advocate_id,
                expires_at=expires_at
            )
            
            # Sign the payload
            signature = self.private_key.sign(payload_bytes, ec.ECDSA(hashes.SHA256()))
            signature_b64 = base64.b64encode(signature).decode("utf-8")
            
            # Return signature metadata
            return {
                "signature_b64": signature_b64,
                "signature_alg": SIG_ALG,
                "key_id": self.key_id,
                "signed_payload_hash": self.sha256_hex(payload_bytes)
            }
        except Exception as e:
            logger.error(f"Failed to sign stamp {stamp_id}: {e}")
            return None
    
    def verify_stamp_signature(
        self,
        stamp_id: str,
        doc_hash: str,
        issued_at: str,
        advocate_id: str,
        expires_at: Optional[str],
        signature_b64: str,
        key_id: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Verify a stamp's cryptographic signature.
        
        Args:
            stamp_id: The stamp ID
            doc_hash: SHA-256 hash of the document
            issued_at: ISO8601 timestamp of issuance
            advocate_id: ID of the issuing advocate
            expires_at: ISO8601 timestamp of expiration (or None)
            signature_b64: Base64-encoded signature
            key_id: Key ID used for signing (for key rotation)
        
        Returns:
            Tuple of (is_valid, message)
        """
        if not self.public_key:
            return False, "Verification unavailable - public key not loaded"
        
        # Check key_id if provided (for future key rotation)
        if key_id and key_id != self.key_id:
            logger.warning(f"Key ID mismatch: expected {self.key_id}, got {key_id}")
            # In production with key rotation, you'd load the historical key here
        
        try:
            # Rebuild canonical payload
            payload_bytes = self.canonical_stamp_payload(
                stamp_id=stamp_id,
                doc_hash=doc_hash,
                issued_at=issued_at,
                advocate_id=advocate_id,
                expires_at=expires_at
            )
            
            # Decode signature
            signature = base64.b64decode(signature_b64)
            
            # Verify signature
            self.public_key.verify(signature, payload_bytes, ec.ECDSA(hashes.SHA256()))
            
            return True, "Signature verified - stamp is cryptographically authentic"
            
        except InvalidSignature:
            return False, "INVALID SIGNATURE - stamp may have been tampered with"
        except ValueError as e:
            return False, f"Signature format error: {e}"
        except Exception as e:
            logger.error(f"Signature verification error for {stamp_id}: {e}")
            return False, f"Verification error: {e}"
    
    def get_public_key_pem(self) -> Optional[str]:
        """Get the public key in PEM format for publishing"""
        if not self.public_key:
            return None
        
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode("utf-8")
    
    def get_public_key_info(self) -> dict:
        """Get public key info for the well-known endpoint"""
        public_pem = self.get_public_key_pem()
        return {
            "keys": [
                {
                    "key_id": self.key_id,
                    "alg": SIG_ALG,
                    "public_key_pem": public_pem,
                    "active": True
                }
            ] if public_pem else []
        }
    
    def is_signing_available(self) -> bool:
        """Check if cryptographic signing is available"""
        return self.private_key is not None
    
    def is_verification_available(self) -> bool:
        """Check if cryptographic verification is available"""
        return self.public_key is not None


# Singleton instance
crypto_service = CryptoSigningService()
