"""
Gotenberg Service for document conversion
Supports DOCX, DOC, and other Office formats to PDF conversion
"""
import httpx
import os
import logging
from typing import Optional, Tuple
from io import BytesIO

logger = logging.getLogger(__name__)

GOTENBERG_URL = os.environ.get("GOTENBERG_URL", "")

class GotenbergService:
    """Service for converting documents using Gotenberg"""
    
    def __init__(self, gotenberg_url: Optional[str] = None):
        self.base_url = gotenberg_url or GOTENBERG_URL
        self.timeout = 60.0  # 60 seconds for large documents
    
    @property
    def is_available(self) -> bool:
        """Check if Gotenberg is configured"""
        return bool(self.base_url)
    
    async def health_check(self) -> bool:
        """Check if Gotenberg is running and healthy"""
        if not self.base_url:
            return False
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/health")
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"Gotenberg health check failed: {e}")
            return False
    
    async def convert_office_to_pdf(
        self,
        file_content: bytes,
        filename: str,
        pdf_a: Optional[str] = None,  # e.g., "PDF/A-1b" for archival
        page_range: Optional[str] = None,  # e.g., "1-5"
    ) -> Tuple[bool, bytes, Optional[str]]:
        """
        Convert Office document (DOCX, DOC, XLSX, PPTX, etc.) to PDF using Gotenberg
        
        Args:
            file_content: Raw file bytes
            filename: Original filename with extension
            pdf_a: Optional PDF/A compliance level
            page_range: Optional page range (e.g., "1-5")
            
        Returns:
            Tuple of (success, pdf_bytes, error_message)
        """
        if not self.base_url:
            return False, b"", "Gotenberg not configured"
        
        try:
            # Prepare multipart form data
            files = {
                "files": (filename, file_content, self._get_content_type(filename))
            }
            
            data = {}
            if pdf_a:
                data["pdfa"] = pdf_a
            if page_range:
                data["nativePageRanges"] = page_range
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/forms/libreoffice/convert",
                    files=files,
                    data=data if data else None
                )
                
                if response.status_code == 200:
                    return True, response.content, None
                else:
                    error_msg = f"Gotenberg conversion failed: {response.status_code}"
                    try:
                        error_detail = response.json()
                        error_msg = f"{error_msg} - {error_detail}"
                    except Exception:
                        error_msg = f"{error_msg} - {response.text[:200]}"
                    logger.error(error_msg)
                    return False, b"", error_msg
                    
        except httpx.TimeoutException:
            logger.error("Gotenberg conversion timed out")
            return False, b"", "Document conversion timed out"
        except Exception as e:
            logger.error(f"Gotenberg conversion error: {e}")
            return False, b"", str(e)
    
    async def convert_html_to_pdf(
        self,
        html_content: str,
        filename: str = "document.html",
    ) -> Tuple[bool, bytes, Optional[str]]:
        """
        Convert HTML to PDF using Gotenberg's Chromium endpoint
        
        Args:
            html_content: HTML string
            filename: Optional filename
            
        Returns:
            Tuple of (success, pdf_bytes, error_message)
        """
        if not self.base_url:
            return False, b"", "Gotenberg not configured"
        
        try:
            files = {
                "files": (filename, html_content.encode('utf-8'), "text/html")
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/forms/chromium/convert/html",
                    files=files
                )
                
                if response.status_code == 200:
                    return True, response.content, None
                else:
                    return False, b"", f"HTML conversion failed: {response.status_code}"
                    
        except Exception as e:
            logger.error(f"HTML to PDF conversion error: {e}")
            return False, b"", str(e)
    
    @staticmethod
    def _get_content_type(filename: str) -> str:
        """Get MIME type based on file extension"""
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        content_types = {
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'ppt': 'application/vnd.ms-powerpoint',
            'odt': 'application/vnd.oasis.opendocument.text',
            'ods': 'application/vnd.oasis.opendocument.spreadsheet',
            'odp': 'application/vnd.oasis.opendocument.presentation',
            'rtf': 'application/rtf',
            'txt': 'text/plain',
        }
        return content_types.get(ext, 'application/octet-stream')


# Singleton instance
gotenberg_service = GotenbergService()


async def convert_with_gotenberg(file_content: bytes, filename: str) -> Tuple[bool, bytes, Optional[str]]:
    """
    Convenience function to convert document using Gotenberg
    
    Returns:
        Tuple of (success, pdf_bytes, error_message)
    """
    return await gotenberg_service.convert_office_to_pdf(file_content, filename)
