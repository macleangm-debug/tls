"""
PDF Validation Service - Production-grade input validation for PDF documents
Ensures safe, predictable processing before stamping operations
"""
import io
import logging
import hashlib
from enum import Enum
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, Any
from PyPDF2 import PdfReader
from PyPDF2.errors import PdfReadError

logger = logging.getLogger(__name__)


class PDFErrorCode(str, Enum):
    """Standardized error codes for PDF validation failures"""
    PDF_VALID = "PDF_VALID"
    PDF_NOT_PDF = "PDF_NOT_PDF"
    PDF_ENCRYPTED = "PDF_ENCRYPTED"
    PDF_CORRUPT = "PDF_CORRUPT"
    PDF_TOO_LARGE = "PDF_TOO_LARGE"
    PDF_TOO_MANY_PAGES = "PDF_TOO_MANY_PAGES"
    PDF_EMPTY = "PDF_EMPTY"
    PDF_UNSUPPORTED_FEATURE = "PDF_UNSUPPORTED_FEATURE"
    PDF_PAGE_TOO_SMALL = "PDF_PAGE_TOO_SMALL"
    PDF_PAGE_TOO_LARGE = "PDF_PAGE_TOO_LARGE"
    PDF_READ_ERROR = "PDF_READ_ERROR"


# User-friendly error messages
ERROR_MESSAGES = {
    PDFErrorCode.PDF_NOT_PDF: "The uploaded file is not a valid PDF document.",
    PDFErrorCode.PDF_ENCRYPTED: "This PDF is password-protected. Please remove the password and try again.",
    PDFErrorCode.PDF_CORRUPT: "This PDF appears to be corrupted or malformed. Please try a different file.",
    PDFErrorCode.PDF_TOO_LARGE: "This PDF exceeds the maximum file size of {max_size_mb}MB.",
    PDFErrorCode.PDF_TOO_MANY_PAGES: "This PDF has too many pages ({page_count}). Maximum allowed is {max_pages} pages.",
    PDFErrorCode.PDF_EMPTY: "This PDF has no pages.",
    PDFErrorCode.PDF_UNSUPPORTED_FEATURE: "This PDF uses unsupported features: {feature}.",
    PDFErrorCode.PDF_PAGE_TOO_SMALL: "Page {page_num} is too small for stamping (minimum 72x72 points).",
    PDFErrorCode.PDF_PAGE_TOO_LARGE: "Page {page_num} is unusually large ({width}x{height} points). Please verify the document.",
    PDFErrorCode.PDF_READ_ERROR: "Unable to read this PDF. It may be damaged or use an unsupported format.",
}


@dataclass
class PDFValidationResult:
    """Result of PDF validation"""
    valid: bool
    error_code: PDFErrorCode
    error_message: str
    details: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "error_code": self.error_code.value,
            "error_message": self.error_message,
            "details": self.details
        }


@dataclass
class PDFMetadata:
    """Extracted PDF metadata after successful validation"""
    page_count: int
    file_size_bytes: int
    pages: list  # List of page info dicts
    is_linearized: bool
    has_annotations: bool
    has_forms: bool
    pdf_version: Optional[str]
    producer: Optional[str]
    document_hash: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_count": self.page_count,
            "file_size_bytes": self.file_size_bytes,
            "file_size_mb": round(self.file_size_bytes / (1024 * 1024), 2),
            "pages": self.pages,
            "is_linearized": self.is_linearized,
            "has_annotations": self.has_annotations,
            "has_forms": self.has_forms,
            "pdf_version": self.pdf_version,
            "producer": self.producer,
            "document_hash": self.document_hash
        }


class PDFValidationService:
    """
    Production-grade PDF validation service.
    
    Validates PDFs before stamping to ensure:
    - File is actually a PDF
    - File is not encrypted
    - File is not corrupted
    - File size is within limits
    - Page count is within limits
    - Pages are stampable (not too small/large)
    """
    
    # Configuration defaults
    DEFAULT_MAX_FILE_SIZE_MB = 10
    DEFAULT_MAX_PAGES = 200
    DEFAULT_MIN_PAGE_SIZE_PT = 72  # 1 inch minimum
    DEFAULT_MAX_PAGE_SIZE_PT = 14400  # 200 inches maximum (very large format)
    
    # PDF magic bytes
    PDF_HEADER = b'%PDF-'
    
    def __init__(
        self,
        max_file_size_mb: int = DEFAULT_MAX_FILE_SIZE_MB,
        max_pages: int = DEFAULT_MAX_PAGES,
        min_page_size_pt: float = DEFAULT_MIN_PAGE_SIZE_PT,
        max_page_size_pt: float = DEFAULT_MAX_PAGE_SIZE_PT,
        allow_encrypted: bool = False,
        allow_forms: bool = True,
        allow_annotations: bool = True
    ):
        self.max_file_size_bytes = max_file_size_mb * 1024 * 1024
        self.max_file_size_mb = max_file_size_mb
        self.max_pages = max_pages
        self.min_page_size_pt = min_page_size_pt
        self.max_page_size_pt = max_page_size_pt
        self.allow_encrypted = allow_encrypted
        self.allow_forms = allow_forms
        self.allow_annotations = allow_annotations
    
    def validate(self, content: bytes, filename: str = "document.pdf") -> Tuple[PDFValidationResult, Optional[PDFMetadata]]:
        """
        Validate a PDF document for stamping.
        
        Args:
            content: Raw PDF bytes
            filename: Original filename (for logging)
            
        Returns:
            Tuple of (validation_result, metadata_if_valid)
        """
        details = {"filename": filename}
        
        # 1. Check file size first (fast check)
        file_size = len(content)
        details["file_size_bytes"] = file_size
        details["file_size_mb"] = round(file_size / (1024 * 1024), 2)
        
        if file_size > self.max_file_size_bytes:
            return self._error(
                PDFErrorCode.PDF_TOO_LARGE,
                details,
                max_size_mb=self.max_file_size_mb
            ), None
        
        if file_size == 0:
            return self._error(PDFErrorCode.PDF_EMPTY, details), None
        
        # 2. Check PDF header (magic bytes)
        if not content.startswith(self.PDF_HEADER):
            # Try to find PDF header within first 1024 bytes (some PDFs have garbage prefix)
            header_pos = content[:1024].find(self.PDF_HEADER)
            if header_pos == -1:
                logger.warning(f"File {filename} does not have PDF header")
                return self._error(PDFErrorCode.PDF_NOT_PDF, details), None
            details["header_offset"] = header_pos
        
        # 3. Try to parse PDF
        try:
            reader = PdfReader(io.BytesIO(content))
        except PdfReadError as e:
            logger.error(f"PDF read error for {filename}: {e}")
            details["parse_error"] = str(e)
            return self._error(PDFErrorCode.PDF_CORRUPT, details), None
        except Exception as e:
            logger.error(f"Unexpected error reading PDF {filename}: {e}")
            details["parse_error"] = str(e)
            return self._error(PDFErrorCode.PDF_READ_ERROR, details), None
        
        # 4. Check encryption
        if reader.is_encrypted:
            if not self.allow_encrypted:
                logger.warning(f"Encrypted PDF rejected: {filename}")
                return self._error(PDFErrorCode.PDF_ENCRYPTED, details), None
            # Try to decrypt with empty password (some PDFs are "encrypted" with empty password)
            try:
                if not reader.decrypt(""):
                    return self._error(PDFErrorCode.PDF_ENCRYPTED, details), None
            except Exception:
                return self._error(PDFErrorCode.PDF_ENCRYPTED, details), None
        
        # 5. Check page count
        page_count = len(reader.pages)
        details["page_count"] = page_count
        
        if page_count == 0:
            return self._error(PDFErrorCode.PDF_EMPTY, details), None
        
        if page_count > self.max_pages:
            return self._error(
                PDFErrorCode.PDF_TOO_MANY_PAGES,
                details,
                page_count=page_count,
                max_pages=self.max_pages
            ), None
        
        # 6. Analyze each page
        pages_info = []
        has_annotations = False
        has_forms = False
        
        for i, page in enumerate(reader.pages):
            page_num = i + 1
            try:
                # Get page dimensions
                mediabox = page.mediabox
                width = float(mediabox.width)
                height = float(mediabox.height)
                rotation = page.get('/Rotate', 0) or 0
                
                # Handle rotation for effective dimensions
                if rotation in [90, 270, -90, -270]:
                    effective_width, effective_height = height, width
                else:
                    effective_width, effective_height = width, height
                
                page_info = {
                    "page": page_num,
                    "width_pt": round(width, 2),
                    "height_pt": round(height, 2),
                    "effective_width_pt": round(effective_width, 2),
                    "effective_height_pt": round(effective_height, 2),
                    "rotation": rotation
                }
                
                # Check page size limits
                if effective_width < self.min_page_size_pt or effective_height < self.min_page_size_pt:
                    details["problem_page"] = page_info
                    return self._error(
                        PDFErrorCode.PDF_PAGE_TOO_SMALL,
                        details,
                        page_num=page_num
                    ), None
                
                if effective_width > self.max_page_size_pt or effective_height > self.max_page_size_pt:
                    details["problem_page"] = page_info
                    return self._error(
                        PDFErrorCode.PDF_PAGE_TOO_LARGE,
                        details,
                        page_num=page_num,
                        width=round(effective_width),
                        height=round(effective_height)
                    ), None
                
                # Check for annotations
                if '/Annots' in page:
                    has_annotations = True
                    page_info["has_annotations"] = True
                
                pages_info.append(page_info)
                
            except Exception as e:
                logger.error(f"Error analyzing page {page_num} of {filename}: {e}")
                details["problem_page"] = {"page": page_num, "error": str(e)}
                return self._error(PDFErrorCode.PDF_CORRUPT, details), None
        
        # 7. Check for forms (AcroForm)
        if '/AcroForm' in reader.trailer.get('/Root', {}):
            has_forms = True
        
        # 8. Check linearization
        is_linearized = self._check_linearized(content)
        
        # 9. Extract metadata
        pdf_version = None
        producer = None
        try:
            if reader.metadata:
                producer = reader.metadata.get('/Producer', None)
            # Extract version from header
            version_line = content[:20].decode('latin-1', errors='ignore')
            if version_line.startswith('%PDF-'):
                pdf_version = version_line[5:8]
        except Exception:
            pass
        
        # 10. Calculate document hash
        document_hash = hashlib.sha256(content).hexdigest()
        
        # Build metadata
        metadata = PDFMetadata(
            page_count=page_count,
            file_size_bytes=file_size,
            pages=pages_info,
            is_linearized=is_linearized,
            has_annotations=has_annotations,
            has_forms=has_forms,
            pdf_version=pdf_version,
            producer=producer,
            document_hash=document_hash
        )
        
        # Validation passed
        logger.info(f"PDF validation passed: {filename} ({page_count} pages, {details['file_size_mb']}MB)")
        
        result = PDFValidationResult(
            valid=True,
            error_code=PDFErrorCode.PDF_VALID,
            error_message="PDF is valid and ready for stamping.",
            details={
                "filename": filename,
                "page_count": page_count,
                "file_size_mb": details["file_size_mb"],
                "has_rotated_pages": any(p.get("rotation", 0) != 0 for p in pages_info),
                "has_annotations": has_annotations,
                "has_forms": has_forms,
                "is_linearized": is_linearized
            }
        )
        
        return result, metadata
    
    def _error(
        self,
        code: PDFErrorCode,
        details: Dict[str, Any],
        **format_args
    ) -> PDFValidationResult:
        """Create an error result with formatted message"""
        message_template = ERROR_MESSAGES.get(code, "PDF validation failed.")
        try:
            message = message_template.format(**format_args)
        except KeyError:
            message = message_template
        
        return PDFValidationResult(
            valid=False,
            error_code=code,
            error_message=message,
            details=details
        )
    
    def _check_linearized(self, content: bytes) -> bool:
        """Check if PDF is linearized (web-optimized)"""
        # Linearized PDFs have a Linearized dictionary near the start
        # Look for /Linearized in first 1024 bytes
        try:
            header = content[:1024].decode('latin-1', errors='ignore')
            return '/Linearized' in header
        except Exception:
            return False
    
    @classmethod
    def quick_validate(cls, content: bytes) -> bool:
        """
        Quick validation check - returns True/False only.
        Use for batch processing pre-checks.
        """
        service = cls()
        result, _ = service.validate(content)
        return result.valid


# Singleton instance for common use
pdf_validator = PDFValidationService()
