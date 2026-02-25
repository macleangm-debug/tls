"""
Stamp Image Service - Generates TLS official stamp images using PIL
Single Source of Truth for stamp visual rendering
"""
from PIL import Image, ImageDraw, ImageFont
import qrcode
import os
from typing import Optional, Tuple
from datetime import datetime


class StampImageService:
    """Service for generating TLS official stamp images"""
    
    # TLS Official Brand Colors (FIXED - not user configurable)
    TLS_GREEN = (16, 185, 129)  # #10B981
    
    # Fixed stamp dimensions
    BASE_WIDTH = 560
    BASE_HEIGHT = 300
    
    # PDF point dimensions (for consistent sizing)
    STAMP_WIDTH_PT = 240
    STAMP_HEIGHT_PT = 128
    
    # Font paths
    FONT_DIR = "/app/backend/assets/fonts"
    FONT_REG = f"{FONT_DIR}/Inter-Regular.ttf"
    FONT_BOLD = f"{FONT_DIR}/Inter-Bold.ttf"
    FONT_SEMIBOLD = f"{FONT_DIR}/Inter-SemiBold.ttf"
    
    @staticmethod
    def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB tuple"""
        h = (hex_color or "").lstrip("#")
        if len(h) != 6:
            return StampImageService.TLS_GREEN  # fallback
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    
    @staticmethod
    def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
        """Load font with fallback"""
        try:
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
        except:
            pass
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
        except:
            return ImageFont.load_default()
    
    @classmethod
    def generate_stamp_image(
        cls,
        stamp_id: str,
        advocate_name: str,
        verification_url: str,
        border_color: str = "#10B981",
        show_advocate_name: bool = True,
        show_tls_logo: bool = True,
        scale: float = 2.0,
        transparent_background: bool = True
    ) -> Image.Image:
        """
        Generate TLS official COMPACT stamp card.
        
        - Fixed layout matching official template
        - Fixed TLS brand colors for header + accents
        - ONLY border_color changes (outer border) based on user preference
        """
        W = int(cls.BASE_WIDTH * scale)
        H = int(cls.BASE_HEIGHT * scale)
        
        # Colors
        border_rgb = cls.hex_to_rgb(border_color)
        bg = (255, 255, 255, 0) if transparent_background else (255, 255, 255, 255)
        
        img = Image.new("RGBA", (W, H), bg)
        draw = ImageDraw.Draw(img)
        
        # Load fonts
        f_title = cls.load_font(cls.FONT_BOLD, int(28 * scale))
        f_sub = cls.load_font(cls.FONT_REG, int(16 * scale))
        f_label = cls.load_font(cls.FONT_SEMIBOLD, int(11 * scale))
        f_value_bold = cls.load_font(cls.FONT_BOLD, int(20 * scale))
        f_value = cls.load_font(cls.FONT_REG, int(16 * scale))
        f_footer = cls.load_font(cls.FONT_REG, int(13 * scale))
        
        # Layout metrics
        pad = int(12 * scale)
        radius = int(12 * scale)
        header_h = int(80 * scale)
        footer_h = int(36 * scale)
        
        # OUTER BORDER (USER-CONTROLLED COLOR)
        draw.rounded_rectangle(
            [pad, pad, W - pad, H - pad],
            radius=radius,
            outline=border_rgb,
            width=int(3 * scale)
        )
        
        # HEADER (TLS FIXED GREEN)
        draw.rounded_rectangle(
            [pad, pad, W - pad, pad + header_h],
            radius=radius,
            fill=cls.TLS_GREEN
        )
        draw.rectangle(
            [pad, pad + header_h - radius, W - pad, pad + header_h],
            fill=cls.TLS_GREEN
        )
        
        # TLS Logo circle
        logo_d = int(50 * scale)
        logo_x = pad + int(14 * scale)
        logo_y = pad + (header_h - logo_d) // 2
        draw.ellipse([logo_x, logo_y, logo_x + logo_d, logo_y + logo_d], fill=(255, 255, 255, 255))
        
        if show_tls_logo:
            try:
                logo_path = "/app/frontend/public/assets/tls-logo.png"
                if os.path.exists(logo_path):
                    logo_img = Image.open(logo_path).convert("RGBA")
                    inner = int(logo_d * 0.78)
                    logo_img = logo_img.resize((inner, inner), Image.Resampling.LANCZOS)
                    off = (logo_d - inner) // 2
                    img.paste(logo_img, (logo_x + off, logo_y + off), logo_img)
            except:
                draw.text((logo_x + int(10 * scale), logo_y + int(15 * scale)), "TLS", fill=cls.TLS_GREEN, font=f_label)
        
        # Header text
        hx = logo_x + logo_d + int(14 * scale)
        draw.text((hx, pad + int(14 * scale)), "TLS VERIFIED", fill=(255, 255, 255, 255), font=f_title)
        draw.text((hx, pad + int(48 * scale)), "Tanganyika Law Society", fill=(255, 255, 255, 200), font=f_sub)
        
        # BODY (WHITE)
        body_top = pad + header_h
        body_bottom = H - pad - footer_h
        draw.rectangle([pad, body_top, W - pad, body_bottom], fill=(255, 255, 255, 255))
        
        # FOOTER (TLS TINT)
        footer_top = body_bottom
        tint = (cls.TLS_GREEN[0], cls.TLS_GREEN[1], cls.TLS_GREEN[2], 35)
        draw.rounded_rectangle(
            [pad, footer_top, W - pad, H - pad],
            radius=radius,
            fill=tint
        )
        draw.rectangle([pad, footer_top, W - pad, footer_top + radius], fill=tint)
        
        footer_text = "Scan QR Code to Verify Authenticity"
        bbox = draw.textbbox((0, 0), footer_text, font=f_footer)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, footer_top + int(9 * scale)), footer_text, fill=cls.TLS_GREEN, font=f_footer)
        
        # QR CODE (LEFT SIDE)
        qr_size = int(110 * scale)
        qr_pad = int(16 * scale)
        qr_box_pad = int(8 * scale)
        qr_x = pad + qr_pad
        qr_y = body_top + int(14 * scale)
        
        draw.rounded_rectangle(
            [qr_x - qr_box_pad, qr_y - qr_box_pad, qr_x + qr_size + qr_box_pad, qr_y + qr_size + qr_box_pad],
            radius=int(8 * scale),
            outline=(cls.TLS_GREEN[0], cls.TLS_GREEN[1], cls.TLS_GREEN[2], 120),
            width=int(2 * scale)
        )
        
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=0
            )
            qr.add_data(verification_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color=cls.TLS_GREEN, back_color="white").convert("RGBA")
            qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
            img.paste(qr_img, (qr_x, qr_y))
        except:
            draw.rectangle([qr_x, qr_y, qr_x + qr_size, qr_y + qr_size], fill=(220, 220, 220, 255))
        
        # INFO SECTION (RIGHT SIDE)
        info_x = qr_x + qr_size + qr_box_pad + int(20 * scale)
        y = body_top + int(12 * scale)
        line_gap = int(48 * scale)
        
        # STAMP ID
        draw.text((info_x, y), "STAMP ID", fill=(cls.TLS_GREEN[0], cls.TLS_GREEN[1], cls.TLS_GREEN[2], 160), font=f_label)
        draw.text((info_x, y + int(16 * scale)), stamp_id, fill=(30, 30, 30, 255), font=f_value_bold)
        
        # DATE
        y += line_gap
        draw.text((info_x, y), "DATE", fill=(cls.TLS_GREEN[0], cls.TLS_GREEN[1], cls.TLS_GREEN[2], 160), font=f_label)
        current_date = datetime.now().strftime("%d %b %Y")
        draw.text((info_x, y + int(16 * scale)), current_date, fill=(80, 80, 80, 255), font=f_value)
        
        # ADVOCATE
        y += line_gap
        if show_advocate_name and advocate_name:
            draw.text((info_x, y), "ADVOCATE", fill=(cls.TLS_GREEN[0], cls.TLS_GREEN[1], cls.TLS_GREEN[2], 160), font=f_label)
            display_name = advocate_name[:28] + "…" if len(advocate_name) > 28 else advocate_name
            draw.text((info_x, y + int(16 * scale)), display_name, fill=cls.TLS_GREEN, font=f_value_bold)
        
        return img
