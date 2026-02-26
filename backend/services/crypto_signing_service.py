"""
Cryptographic Signing Service for TLS Stamps
Uses ECDSA P-256 with SHA-256 for non-forgeable stamp signatures

Features:
- Key rotation support (multiple keys, active key designation)
- Historical key lookup for verification
- Key rotation audit logging
"""
import os
import json
import base64
import hashlib
from typing import Optional, Tuple, Dict, List
from datetime import datetime, timezone
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature
import logging

logger = logging.getLogger(__name__)

# Signature algorithm identifier
SIG_ALG = "ECDSA_P256_SHA256"
SIGNING_VERSION = "TLS-STAMP-SIG-V1"


class CryptoSigningService:
    """
    Service for cryptographic signing and verification of TLS stamps.
    
    Supports CA-style key rotation:
    - Multiple keys can be loaded (active + historical)
    - New stamps use the ACTIVE key
    - Verification uses the key_id stored on the stamp
    - Key rotation events are logged
    """
    
    def __init__(self):
        # Active signing key
        self.active_key_id = None
        self.active_private_key = None
        self.active_public_key = None
        
        # Key registry: key_id -> {public_key, private_key (if available), activated_at}
        self.keys: Dict[str, dict] = {}
        
        # Key rotation history
        self.rotation_history: List[dict] = []
        
        self._load_keys()
    
    def _load_keys(self):
        """Load signing keys from environment variables"""
        try:
            # Load active key ID (defaults to current key)
            self.active_key_id = os.environ.get("TLS_ACTIVE_KEY_ID", "tls-key-2026-01")
            
            # Load primary private key (for signing)
            private_key_b64 = os.environ.get("TLS_PRIVATE_KEY_B64")
            if private_key_b64:
                private_pem = base64.b64decode(private_key_b64)
                private_key = serialization.load_pem_private_key(private_pem, password=None)
                public_key = private_key.public_key()
                
                # Get key ID from env or use default
                key_id = os.environ.get("TLS_SIGNING_KEY_ID", self.active_key_id)
                
                # Register the key
                self.keys[key_id] = {
                    "private_key": private_key,
                    "public_key": public_key,
                    "activated_at": os.environ.get("TLS_KEY_ACTIVATED_AT", "2026-01-01T00:00:00Z"),
                    "is_active": True
                }
                
                # Set as active key
                self.active_key_id = key_id
                self.active_private_key = private_key
                self.active_public_key = public_key
                
                logger.info(f"Loaded TLS signing key: {key_id} (ACTIVE)")
            else:
                logger.warning("TLS_PRIVATE_KEY_B64 not set - signing disabled")
            
            # Load additional historical public keys (for verification of old stamps)
            # Format: TLS_HISTORICAL_KEYS_JSON = '[{"key_id": "...", "public_key_b64": "..."}]'
            historical_keys_json = os.environ.get("TLS_HISTORICAL_KEYS_JSON")
            if historical_keys_json:
                try:
                    historical_keys = json.loads(historical_keys_json)
                    for key_data in historical_keys:
                        kid = key_data.get("key_id")
                        pub_b64 = key_data.get("public_key_b64")
                        if kid and pub_b64 and kid not in self.keys:
                            public_pem = base64.b64decode(pub_b64)
                            public_key = serialization.load_pem_public_key(public_pem)
                            self.keys[kid] = {
                                "public_key": public_key,
                                "activated_at": key_data.get("activated_at", "unknown"),
                                "deactivated_at": key_data.get("deactivated_at"),
                                "is_active": False
                            }
                            logger.info(f"Loaded historical TLS key: {kid}")
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse TLS_HISTORICAL_KEYS_JSON: {e}")
                    
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
    
    @staticmethod
    def generate_key_pair() -> Tuple[bytes, bytes]:
        """
        Generate a new ECDSA P-256 key pair.
        
        Returns:
            Tuple of (private_key_pem, public_key_pem) as bytes
        """
        private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        public_key = private_key.public_key()
        
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        return private_pem, public_pem
    
    def sign_stamp(
        self,
        stamp_id: str,
        doc_hash: str,
        issued_at: str,
        advocate_id: str,
        expires_at: Optional[str] = None
    ) -> Optional[dict]:
        """
        Sign a stamp record using the ACTIVE key.
        
        Returns:
            Dict with signature_b64, signature_alg, key_id, signed_payload_hash
            Or None if signing is not available
        """
        if not self.active_private_key:
            logger.warning("Cannot sign stamp - no active private key")
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
            
            # Sign the payload with ACTIVE key
            signature = self.active_private_key.sign(payload_bytes, ec.ECDSA(hashes.SHA256()))
            signature_b64 = base64.b64encode(signature).decode("utf-8")
            
            # Return signature metadata with key_id for verification
            return {
                "signature_b64": signature_b64,
                "signature_alg": SIG_ALG,
                "key_id": self.active_key_id,
                "signed_payload_hash": self.sha256_hex(payload_bytes)
            }
        except Exception as e:
            logger.error(f"Failed to sign stamp {stamp_id}: {e}")
            return None
    
    def get_public_key_for_key_id(self, key_id: str) -> Optional[object]:
        """Get the public key for a specific key_id (for verification)"""
        if key_id in self.keys:
            return self.keys[key_id].get("public_key")
        
        # Fallback to active key if key_id matches
        if key_id == self.active_key_id:
            return self.active_public_key
        
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
        
        Uses the key_id from the stamp record to find the correct public key.
        This allows verification of stamps signed with rotated/historical keys.
        
        Args:
            stamp_id: The stamp ID
            doc_hash: SHA-256 hash of the document
            issued_at: ISO8601 timestamp of issuance
            advocate_id: ID of the issuing advocate
            expires_at: ISO8601 timestamp of expiration (or None)
            signature_b64: Base64-encoded signature
            key_id: Key ID used for signing (for key rotation support)
        
        Returns:
            Tuple of (is_valid, message)
        """
        # Determine which public key to use
        verification_key_id = key_id or self.active_key_id
        public_key = self.get_public_key_for_key_id(verification_key_id)
        
        if not public_key:
            # Try active key as fallback
            if self.active_public_key:
                public_key = self.active_public_key
                logger.warning(f"Key ID {verification_key_id} not found, using active key")
            else:
                return False, f"Verification unavailable - public key not found for key_id: {verification_key_id}"
        
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
            public_key.verify(signature, payload_bytes, ec.ECDSA(hashes.SHA256()))
            
            return True, f"Signature verified with key {verification_key_id} - stamp is cryptographically authentic"
            
        except InvalidSignature:
            return False, "INVALID SIGNATURE - stamp may have been tampered with"
        except ValueError as e:
            return False, f"Signature format error: {e}"
        except Exception as e:
            logger.error(f"Signature verification error for {stamp_id}: {e}")
            return False, f"Verification error: {e}"
    
    def get_public_key_pem(self, key_id: Optional[str] = None) -> Optional[str]:
        """Get a public key in PEM format"""
        if key_id:
            key_data = self.keys.get(key_id)
            if key_data and key_data.get("public_key"):
                return key_data["public_key"].public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ).decode("utf-8")
        
        if self.active_public_key:
            return self.active_public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode("utf-8")
        
        return None
    
    def get_public_key_info(self) -> dict:
        """
        Get all public keys for the well-known endpoint.
        Returns both active and historical keys for verification.
        """
        keys_list = []
        
        for key_id, key_data in self.keys.items():
            if key_data.get("public_key"):
                public_pem = key_data["public_key"].public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ).decode("utf-8")
                
                keys_list.append({
                    "key_id": key_id,
                    "alg": SIG_ALG,
                    "public_key_pem": public_pem,
                    "active": key_id == self.active_key_id,
                    "activated_at": key_data.get("activated_at"),
                    "deactivated_at": key_data.get("deactivated_at")
                })
        
        return {
            "keys": keys_list,
            "active_key_id": self.active_key_id,
            "signing_available": self.is_signing_available()
        }
    
    def rotate_key(self, new_key_id: str, new_private_pem: bytes, new_public_pem: bytes) -> dict:
        """
        Rotate to a new signing key.
        
        The old key is retained for verification of existing stamps.
        New stamps will be signed with the new key.
        
        Args:
            new_key_id: Unique identifier for the new key
            new_private_pem: PEM-encoded private key
            new_public_pem: PEM-encoded public key
        
        Returns:
            Rotation event dict
        """
        old_key_id = self.active_key_id
        now = datetime.now(timezone.utc).isoformat()
        
        # Load new keys
        new_private_key = serialization.load_pem_private_key(new_private_pem, password=None)
        new_public_key = serialization.load_pem_public_key(new_public_pem)
        
        # Deactivate old key (keep for verification)
        if old_key_id and old_key_id in self.keys:
            self.keys[old_key_id]["is_active"] = False
            self.keys[old_key_id]["deactivated_at"] = now
        
        # Register new key
        self.keys[new_key_id] = {
            "private_key": new_private_key,
            "public_key": new_public_key,
            "activated_at": now,
            "is_active": True
        }
        
        # Update active key
        self.active_key_id = new_key_id
        self.active_private_key = new_private_key
        self.active_public_key = new_public_key
        
        # Record rotation event
        rotation_event = {
            "event_type": "KEY_ROTATED",
            "old_key_id": old_key_id,
            "new_key_id": new_key_id,
            "rotated_at": now
        }
        self.rotation_history.append(rotation_event)
        
        logger.info(f"Key rotated: {old_key_id} -> {new_key_id}")
        
        return rotation_event
    
    def get_key_status(self) -> dict:
        """Get current key status for admin monitoring"""
        return {
            "active_key_id": self.active_key_id,
            "signing_available": self.is_signing_available(),
            "verification_available": self.is_verification_available(),
            "total_keys": len(self.keys),
            "keys": [
                {
                    "key_id": kid,
                    "active": kdata.get("is_active", False),
                    "has_private_key": kdata.get("private_key") is not None,
                    "activated_at": kdata.get("activated_at"),
                    "deactivated_at": kdata.get("deactivated_at")
                }
                for kid, kdata in self.keys.items()
            ],
            "rotation_history_count": len(self.rotation_history)
        }
    
    def is_signing_available(self) -> bool:
        """Check if cryptographic signing is available"""
        return self.active_private_key is not None
    
    def is_verification_available(self) -> bool:
        """Check if cryptographic verification is available"""
        return len(self.keys) > 0 or self.active_public_key is not None


# Singleton instance
crypto_service = CryptoSigningService()
