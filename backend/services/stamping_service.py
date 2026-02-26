"""
Stamping Service - Orchestrates the complete document stamping workflow
Handles single document and batch stamping operations
"""
import os
import hashlib
import uuid
import base64
import zipfile
import csv
import tempfile
from io import BytesIO
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, BinaryIO
from PIL import Image
import logging

from .stamp_image_service import StampImageService
from .pdf_overlay_service import PDFOverlayService
from .crypto_signing_service import crypto_service
from .pdf_validation_service import PDFValidationService, PDFErrorCode, pdf_validator

logger = logging.getLogger(__name__)


class StampingService:
    """Service for orchestrating document stamping operations"""
    
    # Batch limits
    MAX_BATCH_FILES = 25
    MAX_FILE_SIZE_MB = 10
    MAX_TOTAL_BATCH_SIZE_MB = 200
    MAX_PAGES_PER_PDF = 200  # Increased for real legal bundles
    
    # Stamp validity
    STAMP_VALIDITY_DAYS = 365
    
    def __init__(self, db, frontend_url: str):
        """
        Initialize stamping service.
        
        Args:
            db: MongoDB database instance
            frontend_url: Base URL for verification links
        """
        self.db = db
        self.frontend_url = frontend_url
        # Initialize PDF validator with service limits
        self.pdf_validator = PDFValidationService(
            max_file_size_mb=self.MAX_FILE_SIZE_MB,
            max_pages=self.MAX_PAGES_PER_PDF
        )
    
    @staticmethod
    def generate_stamp_id() -> str:
        """Generate unique TLS stamp ID"""
        date_part = datetime.now().strftime("%Y%m%d")
        unique_part = uuid.uuid4().hex[:8].upper()
        return f"TLS-{date_part}-{unique_part}"
    
    @staticmethod
    def calculate_document_hash(content: bytes) -> str:
        """Calculate SHA256 hash of document content"""
        return hashlib.sha256(content).hexdigest()
    
    def create_verification_url(self, stamp_id: str) -> str:
        """Create verification URL for stamp"""
        return f"{self.frontend_url}/verify?id={stamp_id}"
    
    async def create_stamp_record(
        self,
        stamp_id: str,
        user: Dict,
        document_name: str,
        document_hash: str,
        document_type: str = "other",
        recipient_name: str = "",
        recipient_org: str = "",
        description: str = "",
        border_color: str = "#10B981",
        stamp_type: str = "certification",
        batch_id: Optional[str] = None
    ) -> Dict:
        """
        Create and store a stamp record in the database.
        
        Returns:
            The created stamp record
        """
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(days=self.STAMP_VALIDITY_DAYS)).isoformat()
        
        stamp_record = {
            "stamp_id": stamp_id,
            "advocate_id": str(user.get("_id", user.get("id", ""))),
            "advocate_name": user.get("full_name", ""),
            "advocate_email": user.get("email", ""),
            "document_name": document_name,
            "document_type": document_type,
            "document_hash": document_hash,
            "recipient_name": recipient_name,
            "recipient_org": recipient_org,
            "description": description,
            "stamp_type": stamp_type,
            "branding": {
                "color": border_color,
                "show_advocate_name": True,
                "show_tls_logo": True,
            },
            "status": "active",
            "created_at": now.isoformat(),
            "expires_at": expires_at,
            "verification_url": self.create_verification_url(stamp_id),
            "batch_id": batch_id,
        }
        
        # Add cryptographic signature
        if crypto_service.is_signing_available():
            crypto_sig = crypto_service.sign_stamp(
                stamp_id=stamp_id,
                doc_hash=document_hash,
                issued_at=now.isoformat(),
                advocate_id=str(user.get("_id", user.get("id", ""))),
                expires_at=expires_at
            )
            if crypto_sig:
                stamp_record["crypto_signature"] = crypto_sig
                logger.info(f"Cryptographically signed batch stamp: {stamp_id}")
        
        # Store in database (use document_stamps collection for consistency)
        await self.db.document_stamps.insert_one(stamp_record)
        
        # Log stamp event
        await self.db.stamp_events.insert_one({
            "id": str(uuid.uuid4()),
            "stamp_id": stamp_id,
            "event_type": "STAMP_ISSUED",
            "actor_id": str(user.get("_id", user.get("id", ""))),
            "actor_type": "advocate",
            "created_at": now.isoformat(),
            "metadata": {
                "document_type": document_type,
                "mode": "batch",
                "batch_id": batch_id
            }
        })
        
        return stamp_record
    
    async def stamp_single_document(
        self,
        content: bytes,
        filename: str,
        user: Dict,
        position: Dict,
        document_type: str = "other",
        recipient_name: str = "",
        recipient_org: str = "",
        description: str = "",
        border_color: str = "#10B981",
        stamp_type: str = "certification",
        include_signature: bool = False,
        signature_data: Optional[str] = None,
        show_signature_placeholder: bool = False,
    ) -> Dict:
        """
        Stamp a single document.
        
        Returns:
            Dict with stamp_id, stamped_document (base64), and metadata
            
        Raises:
            ValueError: If PDF validation fails
        """
        # Validate PDF before processing
        validation_result, pdf_metadata = self.pdf_validator.validate(content, filename)
        if not validation_result.valid:
            logger.warning(f"PDF validation failed for {filename}: {validation_result.error_code}")
            raise ValueError(f"{validation_result.error_message} (Code: {validation_result.error_code.value})")
        
        # Use hash from validation (already calculated)
        doc_hash = pdf_metadata.document_hash
        
        # Generate identifiers
        stamp_id = self.generate_stamp_id()
        verification_url = self.create_verification_url(stamp_id)
        
        # Generate stamp image
        stamp_image = StampImageService.generate_stamp_image(
            stamp_id=stamp_id,
            advocate_name=user.get("full_name", ""),
            verification_url=verification_url,
            border_color=border_color,
            show_advocate_name=True,
            show_tls_logo=True,
            scale=2.0,
            transparent_background=True
        )
        
        # Embed stamp in PDF
        stamped_content = PDFOverlayService.embed_stamp(
            pdf_content=content,
            stamp_image=stamp_image,
            position=position,
            include_signature=include_signature,
            signature_data=signature_data,
            show_signature_placeholder=show_signature_placeholder,
            brand_color=border_color
        )
        
        # Create stamp record
        stamp_record = await self.create_stamp_record(
            stamp_id=stamp_id,
            user=user,
            document_name=filename,
            document_hash=doc_hash,
            document_type=document_type,
            recipient_name=recipient_name,
            recipient_org=recipient_org,
            description=description,
            border_color=border_color,
            stamp_type=stamp_type
        )
        
        return {
            "stamp_id": stamp_id,
            "document_name": filename,
            "document_hash": doc_hash,
            "verification_url": verification_url,
            "status": "active",
            "created_at": stamp_record["created_at"],
            "expires_at": stamp_record["expires_at"],
            "stamped_document": base64.b64encode(stamped_content).decode(),
            "content_type": "application/pdf",
            "pdf_metadata": {
                "page_count": pdf_metadata.page_count,
                "has_rotated_pages": any(p.get("rotation", 0) != 0 for p in pdf_metadata.pages),
                "file_size_mb": round(pdf_metadata.file_size_bytes / (1024 * 1024), 2)
            }
        }
    
    async def stamp_batch_documents(
        self,
        files: List[Tuple[str, bytes]],  # List of (filename, content)
        user: Dict,
        position: Dict,
        document_type: str = "other",
        recipient_name: str = "",
        recipient_org: str = "",
        description: str = "",
        border_color: str = "#10B981",
        stamp_type: str = "certification",
        batch_request_id: Optional[str] = None,
    ) -> Tuple[bytes, List[Dict]]:
        """
        Stamp multiple documents in a batch.
        
        Args:
            files: List of (filename, content) tuples
            user: Authenticated user dict
            position: Position config (anchor-based recommended)
            document_type: Type of documents
            recipient_name: Recipient name
            recipient_org: Recipient organization
            description: Batch description
            border_color: Stamp border color
            stamp_type: Type of stamp
            batch_request_id: Optional idempotency key
            
        Returns:
            Tuple of (zip_bytes, results_list)
        """
        # Check for duplicate batch request
        if batch_request_id:
            existing = await self.db.batch_stamps.find_one({"batch_request_id": batch_request_id})
            if existing:
                raise ValueError(f"Batch request {batch_request_id} already processed")
        
        # Validate limits
        if len(files) > self.MAX_BATCH_FILES:
            raise ValueError(f"Maximum {self.MAX_BATCH_FILES} files allowed per batch")
        
        total_size = sum(len(content) for _, content in files)
        if total_size > self.MAX_TOTAL_BATCH_SIZE_MB * 1024 * 1024:
            raise ValueError(f"Total batch size exceeds {self.MAX_TOTAL_BATCH_SIZE_MB}MB limit")
        
        # Generate batch ID
        batch_id = f"BATCH-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
        results = []
        stamped_files = []
        
        for filename, content in files:
            result = {
                "filename": filename,
                "stamp_id": None,
                "doc_hash": None,
                "issued_at": None,
                "pages_stamped": 0,
                "status": "PENDING",
                "error": None,
                "error_code": None
            }
            
            try:
                # Validate PDF using the validation service
                validation_result, pdf_metadata = self.pdf_validator.validate(content, filename)
                if not validation_result.valid:
                    result["status"] = "FAILED"
                    result["error"] = validation_result.error_message
                    result["error_code"] = validation_result.error_code.value
                    results.append(result)
                    continue
                
                # Use hash from validation
                doc_hash = pdf_metadata.document_hash
                
                # Generate identifiers
                stamp_id = self.generate_stamp_id()
                verification_url = self.create_verification_url(stamp_id)
                
                # Generate stamp image
                stamp_image = StampImageService.generate_stamp_image(
                    stamp_id=stamp_id,
                    advocate_name=user.get("full_name", ""),
                    verification_url=verification_url,
                    border_color=border_color,
                    show_advocate_name=True,
                    show_tls_logo=True,
                    scale=2.0,
                    transparent_background=True
                )
                
                # Embed stamp
                stamped_content = PDFOverlayService.embed_stamp(
                    pdf_content=content,
                    stamp_image=stamp_image,
                    position=position,
                    include_signature=False,
                    signature_data=None,
                    show_signature_placeholder=False,
                    brand_color=border_color
                )
                
                # Determine pages stamped using validated metadata
                page_mode = position.get("page_mode", "first")
                if page_mode == "all":
                    pages_stamped = pdf_metadata.page_count
                elif page_mode == "first":
                    pages_stamped = 1
                else:
                    pages_stamped = len(position.get("pages", [1]))
                
                # Create stamp record
                await self.create_stamp_record(
                    stamp_id=stamp_id,
                    user=user,
                    document_name=filename,
                    document_hash=doc_hash,
                    document_type=document_type,
                    recipient_name=recipient_name,
                    recipient_org=recipient_org,
                    description=description,
                    border_color=border_color,
                    stamp_type=stamp_type,
                    batch_id=batch_id
                )
                
                # Update result
                result["stamp_id"] = stamp_id
                result["doc_hash"] = doc_hash
                result["issued_at"] = datetime.now(timezone.utc).isoformat()
                result["pages_stamped"] = pages_stamped
                result["status"] = "OK"
                
                # Add to stamped files
                stamped_filename = self._get_stamped_filename(filename)
                stamped_files.append((stamped_filename, stamped_content))
                
            except Exception as e:
                logger.error(f"Error stamping {filename}: {e}")
                result["status"] = "FAILED"
                result["error"] = str(e)
            
            results.append(result)
        
        # Store batch record
        batch_record = {
            "batch_id": batch_id,
            "batch_request_id": batch_request_id,
            "advocate_id": str(user.get("_id", user.get("id", ""))),
            "advocate_name": user.get("full_name", ""),
            "file_count": len(files),
            "success_count": sum(1 for r in results if r["status"] == "OK"),
            "failed_count": sum(1 for r in results if r["status"] == "FAILED"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "position": position,
            "results": results
        }
        await self.db.batch_stamps.insert_one(batch_record)
        
        # Create ZIP file
        zip_buffer = self._create_zip_with_summary(stamped_files, results, batch_id)
        
        return zip_buffer.getvalue(), results
    
    @staticmethod
    def _get_stamped_filename(original: str) -> str:
        """Generate stamped filename"""
        if original.lower().endswith('.pdf'):
            return original[:-4] + '_stamped.pdf'
        return original + '_stamped.pdf'
    
    @staticmethod
    def _create_zip_with_summary(
        files: List[Tuple[str, bytes]],
        results: List[Dict],
        batch_id: str
    ) -> BytesIO:
        """Create ZIP file with stamped documents and summary CSV"""
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add stamped PDFs
            for filename, content in files:
                zf.writestr(filename, content)
            
            # Create summary CSV
            csv_buffer = BytesIO()
            csv_writer = csv.writer(csv_buffer.getvalue().decode() if False else csv_buffer, lineterminator='\n')
            
            # Write CSV manually to avoid encoding issues
            csv_content = "filename,stamp_id,doc_hash,issued_at,pages_stamped,status,error\n"
            for r in results:
                csv_content += f"{r['filename']},{r['stamp_id'] or ''},{r['doc_hash'] or ''},{r['issued_at'] or ''},{r['pages_stamped']},{r['status']},{r['error'] or ''}\n"
            
            zf.writestr(f"batch_summary_{batch_id}.csv", csv_content)
        
        zip_buffer.seek(0)
        return zip_buffer
    
    async def verify_stamp(self, stamp_id: str, document_content: Optional[bytes] = None) -> Dict:
        """
        Verify a stamp and optionally check document hash.
        
        Args:
            stamp_id: The stamp ID to verify
            document_content: Optional document bytes to verify hash
            
        Returns:
            Verification result dict
        """
        stamp = await self.db.stamps.find_one({"stamp_id": stamp_id})
        
        if not stamp:
            return {
                "valid": False,
                "status": "NOT_FOUND",
                "message": "Stamp not found"
            }
        
        # Check expiration
        expires_at = datetime.fromisoformat(stamp["expires_at"].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        
        if stamp["status"] == "revoked":
            return {
                "valid": False,
                "status": "REVOKED",
                "message": "Stamp has been revoked",
                "stamp_id": stamp_id,
                "advocate_name": stamp.get("advocate_name"),
                "document_name": stamp.get("document_name"),
                "revoked_at": stamp.get("revoked_at")
            }
        
        if now > expires_at:
            return {
                "valid": False,
                "status": "EXPIRED",
                "message": "Stamp has expired",
                "stamp_id": stamp_id,
                "advocate_name": stamp.get("advocate_name"),
                "document_name": stamp.get("document_name"),
                "expired_at": stamp["expires_at"]
            }
        
        # Optionally verify document hash
        hash_match = None
        if document_content:
            provided_hash = self.calculate_document_hash(document_content)
            hash_match = provided_hash == stamp.get("document_hash")
        
        return {
            "valid": True,
            "status": "VALID",
            "message": "Stamp is valid",
            "stamp_id": stamp_id,
            "advocate_name": stamp.get("advocate_name"),
            "advocate_email": stamp.get("advocate_email"),
            "document_name": stamp.get("document_name"),
            "document_type": stamp.get("document_type"),
            "recipient_name": stamp.get("recipient_name"),
            "recipient_org": stamp.get("recipient_org"),
            "created_at": stamp.get("created_at"),
            "expires_at": stamp["expires_at"],
            "hash_match": hash_match,
            "batch_id": stamp.get("batch_id")
        }
