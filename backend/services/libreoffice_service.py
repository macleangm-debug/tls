"""
LibreOffice Service for document conversion
Direct local conversion using LibreOffice (soffice) command
Used when Gotenberg is not available
"""
import asyncio
import os
import tempfile
import shutil
import logging
import subprocess
from typing import Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Check if LibreOffice is available
LIBREOFFICE_PATH = shutil.which("libreoffice") or shutil.which("soffice")
LIBREOFFICE_AVAILABLE = LIBREOFFICE_PATH is not None


class LibreOfficeService:
    """Service for converting documents using local LibreOffice installation"""
    
    def __init__(self):
        self.timeout = 60  # seconds
        self._lock = asyncio.Lock()  # LibreOffice doesn't handle concurrent conversions well
    
    @property
    def is_available(self) -> bool:
        """Check if LibreOffice is installed"""
        return LIBREOFFICE_AVAILABLE
    
    async def convert_to_pdf(
        self,
        file_content: bytes,
        filename: str,
    ) -> Tuple[bool, bytes, Optional[str]]:
        """
        Convert Office document to PDF using LibreOffice
        
        Args:
            file_content: Raw file bytes
            filename: Original filename with extension
            
        Returns:
            Tuple of (success, pdf_bytes, error_message)
        """
        if not LIBREOFFICE_AVAILABLE:
            return False, b"", "LibreOffice not installed"
        
        # Use lock to prevent concurrent conversions
        async with self._lock:
            return await self._do_conversion(file_content, filename)
    
    async def _do_conversion(
        self,
        file_content: bytes,
        filename: str,
    ) -> Tuple[bool, bytes, Optional[str]]:
        """Internal conversion method"""
        temp_dir = None
        try:
            # Create temp directory for conversion
            temp_dir = tempfile.mkdtemp(prefix="lo_convert_")
            
            # Write input file
            input_path = Path(temp_dir) / filename
            input_path.write_bytes(file_content)
            
            # Get output filename (same name but .pdf extension)
            output_filename = Path(filename).stem + ".pdf"
            output_path = Path(temp_dir) / output_filename
            
            # Run LibreOffice conversion
            cmd = [
                LIBREOFFICE_PATH,
                "--headless",
                "--convert-to", "pdf",
                "--outdir", temp_dir,
                str(input_path)
            ]
            
            logger.info(f"Converting {filename} to PDF using LibreOffice")
            
            # Run in thread pool to not block event loop
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, "HOME": temp_dir}  # LibreOffice needs HOME
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return False, b"", "Conversion timed out"
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error(f"LibreOffice conversion failed: {error_msg}")
                return False, b"", f"Conversion failed: {error_msg[:200]}"
            
            # Read output PDF
            if not output_path.exists():
                # Sometimes LibreOffice uses different output names
                pdf_files = list(Path(temp_dir).glob("*.pdf"))
                if pdf_files:
                    output_path = pdf_files[0]
                else:
                    return False, b"", "PDF output not found"
            
            pdf_content = output_path.read_bytes()
            logger.info(f"Successfully converted {filename} to PDF ({len(pdf_content)} bytes)")
            
            return True, pdf_content, None
            
        except Exception as e:
            logger.error(f"LibreOffice conversion error: {e}")
            return False, b"", str(e)
        finally:
            # Cleanup temp directory
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp dir: {e}")
    
    def get_supported_formats(self) -> list:
        """Return list of supported input formats"""
        return [
            ".docx", ".doc", ".odt", ".rtf",  # Word processing
            ".xlsx", ".xls", ".ods",           # Spreadsheets
            ".pptx", ".ppt", ".odp",           # Presentations
            ".txt", ".html", ".htm"            # Text/HTML
        ]


# Singleton instance
libreoffice_service = LibreOfficeService()


async def convert_with_libreoffice(file_content: bytes, filename: str) -> Tuple[bool, bytes, Optional[str]]:
    """
    Convenience function to convert document using LibreOffice
    
    Returns:
        Tuple of (success, pdf_bytes, error_message)
    """
    return await libreoffice_service.convert_to_pdf(file_content, filename)
