"""
PDF Overlay Service - Embeds stamps into PDF documents
Handles coordinate conversion and multi-page stamping
"""
from io import BytesIO
from typing import Dict, List, Optional, Tuple
from PIL import Image
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
import logging

logger = logging.getLogger(__name__)


class PDFOverlayService:
    """Service for embedding stamps into PDF documents"""
    
    # TLS Fixed stamp dimensions in PDF POINTS
    STAMP_WIDTH_PT = 240
    STAMP_HEIGHT_PT = 128
    EDGE_MARGIN_PT = 12
    
    # Position anchors for batch stamping
    ANCHORS = {
        "top_left": (0, 0),
        "top_center": (0.5, 0),
        "top_right": (1, 0),
        "center_left": (0, 0.5),
        "center": (0.5, 0.5),
        "center_right": (1, 0.5),
        "bottom_left": (0, 1),
        "bottom_center": (0.5, 1),
        "bottom_right": (1, 1),
    }
    
    @classmethod
    def calculate_anchor_position(
        cls,
        anchor: str,
        page_width: float,
        page_height: float,
        offset_x_pt: float = 12,
        offset_y_pt: float = 12
    ) -> Tuple[float, float]:
        """
        Calculate stamp position based on anchor point.
        Returns position in PDF points (top-left origin).
        """
        anchor_ratios = cls.ANCHORS.get(anchor, cls.ANCHORS["bottom_right"])
        
        # Calculate base position from anchor
        if anchor_ratios[0] == 0:  # Left
            x = offset_x_pt
        elif anchor_ratios[0] == 1:  # Right
            x = page_width - cls.STAMP_WIDTH_PT - offset_x_pt
        else:  # Center
            x = (page_width - cls.STAMP_WIDTH_PT) / 2
        
        if anchor_ratios[1] == 0:  # Top
            y = offset_y_pt
        elif anchor_ratios[1] == 1:  # Bottom
            y = page_height - cls.STAMP_HEIGHT_PT - offset_y_pt
        else:  # Center
            y = (page_height - cls.STAMP_HEIGHT_PT) / 2
        
        # Clamp to safe area
        x = max(cls.EDGE_MARGIN_PT, min(x, page_width - cls.STAMP_WIDTH_PT - cls.EDGE_MARGIN_PT))
        y = max(cls.EDGE_MARGIN_PT, min(y, page_height - cls.STAMP_HEIGHT_PT - cls.EDGE_MARGIN_PT))
        
        return (x, y)
    
    @classmethod
    def embed_stamp(
        cls,
        pdf_content: bytes,
        stamp_image: Image.Image,
        position: Dict,
        include_signature: bool = False,
        signature_data: Optional[str] = None,
        show_signature_placeholder: bool = False,
        brand_color: str = "#10B981"
    ) -> bytes:
        """
        Embed stamp image into PDF document.
        
        Args:
            pdf_content: Original PDF bytes
            stamp_image: PIL Image of the stamp
            position: Position config with either:
                - anchor, offset_x_pt, offset_y_pt (for anchor-based)
                - x, y in PDF points (for absolute positioning)
                - pages: list of page numbers (1-indexed)
                - page_mode: "first", "all", or "custom"
            include_signature: Whether to include digital signature
            signature_data: Base64 encoded signature image
            show_signature_placeholder: Show "Sign Here" box
            brand_color: Color for signature placeholder border
            
        Returns:
            Stamped PDF bytes
        """
        try:
            pdf_reader = PdfReader(BytesIO(pdf_content))
            pdf_writer = PdfWriter()
            
            total_pages = len(pdf_reader.pages)
            
            # Determine which pages to stamp
            page_mode = position.get("page_mode", "first")
            if page_mode == "all":
                pages_to_stamp = list(range(1, total_pages + 1))
            elif page_mode == "first":
                pages_to_stamp = [1]
            else:
                pages_to_stamp = position.get("pages", [1])
            
            # Get positioning method
            use_anchor = "anchor" in position
            anchor = position.get("anchor", "bottom_right")
            offset_x = position.get("offset_x_pt", 12)
            offset_y = position.get("offset_y_pt", 12)
            
            # Per-page positions for absolute positioning
            per_page_positions = position.get("positions", {})
            default_x = position.get("x", 400)
            default_y = position.get("y", 50)
            
            # Save stamp to buffer
            stamp_buffer = BytesIO()
            stamp_image.save(stamp_buffer, format='PNG')
            
            for page_num, page in enumerate(pdf_reader.pages):
                page_1indexed = page_num + 1
                
                if page_1indexed in pages_to_stamp:
                    # Get page dimensions
                    mediabox = page.mediabox
                    box_left = float(mediabox.left)
                    box_bottom = float(mediabox.bottom)
                    orig_width = float(mediabox.width)
                    orig_height = float(mediabox.height)
                    page_rotation = page.get('/Rotate', 0) or 0
                    
                    # Handle rotated pages
                    if page_rotation in [90, 270, -90, -270]:
                        page_width = orig_height
                        page_height = orig_width
                    else:
                        page_width = orig_width
                        page_height = orig_height
                    
                    # Calculate position
                    if use_anchor:
                        pos_x, pos_y = cls.calculate_anchor_position(
                            anchor, page_width, page_height, offset_x, offset_y
                        )
                    else:
                        page_key = str(page_1indexed)
                        if page_key in per_page_positions:
                            pos_x = per_page_positions[page_key].get("x", default_x)
                            pos_y = per_page_positions[page_key].get("y", default_y)
                        else:
                            pos_x = default_x
                            pos_y = default_y
                    
                    # Create overlay
                    packet = BytesIO()
                    page_size = (box_left + orig_width, box_bottom + orig_height)
                    c = canvas.Canvas(packet, pagesize=page_size)
                    
                    # Coordinate conversion based on rotation
                    target_width = cls.STAMP_WIDTH_PT
                    target_height = cls.STAMP_HEIGHT_PT
                    
                    if page_rotation in [90, -270]:
                        pdf_x = pos_y
                        pdf_y = orig_height - pos_x - target_width
                        draw_width = target_height
                        draw_height = target_width
                    elif page_rotation in [180, -180]:
                        pdf_x = orig_width - pos_x - target_width
                        pdf_y = pos_y
                        draw_width = target_width
                        draw_height = target_height
                    elif page_rotation in [270, -90]:
                        pdf_x = orig_height - pos_y - target_height
                        pdf_y = pos_x
                        draw_width = target_height
                        draw_height = target_width
                    else:
                        # No rotation: convert Y from top-left to bottom-left
                        pdf_x = pos_x
                        pdf_y = orig_height - pos_y - target_height
                        draw_width = target_width
                        draw_height = target_height
                    
                    # Apply edge margin clamping
                    pdf_x = max(cls.EDGE_MARGIN_PT, min(pdf_x, orig_width - draw_width - cls.EDGE_MARGIN_PT))
                    pdf_y = max(cls.EDGE_MARGIN_PT, min(pdf_y, orig_height - draw_height - cls.EDGE_MARGIN_PT))
                    
                    # Log for debugging
                    logger.info(f"Page {page_1indexed}: pos=({pdf_x:.1f}, {pdf_y:.1f}), size={draw_width}x{draw_height}")
                    
                    # Draw stamp
                    stamp_buffer.seek(0)
                    c.drawImage(ImageReader(stamp_buffer), pdf_x, pdf_y, width=draw_width, height=draw_height, mask='auto')
                    
                    # Draw signature area if needed
                    signature_height = 30
                    signature_y = pdf_y - signature_height - 5
                    
                    if include_signature and signature_data:
                        try:
                            import base64
                            sig_bytes = base64.b64decode(signature_data)
                            sig_img = Image.open(BytesIO(sig_bytes))
                            sig_buffer = BytesIO()
                            sig_img.save(sig_buffer, format='PNG')
                            sig_buffer.seek(0)
                            
                            sig_aspect = sig_img.width / sig_img.height
                            sig_width = min(draw_width, signature_height * sig_aspect)
                            sig_x = pdf_x + (draw_width - sig_width) / 2
                            
                            if signature_y > 10:
                                c.drawImage(ImageReader(sig_buffer), sig_x, signature_y, width=sig_width, height=signature_height, mask='auto')
                        except Exception as e:
                            logger.error(f"Error drawing signature: {e}")
                    
                    elif show_signature_placeholder and signature_y > 10:
                        box_width = draw_width
                        box_height = signature_height
                        box_x = pdf_x
                        box_y = signature_y
                        
                        c.setFillColor(colors.white)
                        c.roundRect(box_x, box_y, box_width, box_height, radius=3, fill=1, stroke=0)
                        
                        c.setStrokeColor(colors.HexColor(brand_color))
                        c.setLineWidth(1.5)
                        c.setDash([4, 3])
                        c.roundRect(box_x, box_y, box_width, box_height, radius=3, fill=0, stroke=1)
                        c.setDash([])
                        
                        c.setFillColor(colors.HexColor(brand_color))
                        c.setFont("Helvetica-Bold", 8)
                        c.drawCentredString(box_x + box_width/2, box_y + box_height/2 - 3, "Sign Here")
                    
                    c.save()
                    packet.seek(0)
                    
                    # Merge overlay
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
            return pdf_content
    
    @classmethod
    def get_pdf_info(cls, pdf_content: bytes) -> Dict:
        """Get PDF metadata (page count, dimensions)"""
        try:
            reader = PdfReader(BytesIO(pdf_content))
            pages = []
            for i, page in enumerate(reader.pages):
                mediabox = page.mediabox
                rotation = page.get('/Rotate', 0) or 0
                width = float(mediabox.width)
                height = float(mediabox.height)
                
                # Swap for rotated pages
                if rotation in [90, 270, -90, -270]:
                    width, height = height, width
                
                pages.append({
                    "page": i + 1,
                    "width_pt": width,
                    "height_pt": height,
                    "rotation": rotation
                })
            
            return {
                "page_count": len(reader.pages),
                "pages": pages
            }
        except Exception as e:
            logger.error(f"Error reading PDF info: {e}")
            return {"page_count": 0, "pages": []}
