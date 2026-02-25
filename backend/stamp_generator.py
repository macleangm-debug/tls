def generate_branded_stamp_image(
    stamp_id: str,
    advocate_name: str,
    verification_url: str,
    brand_color: str = "#10B981",
    layout: str = "horizontal",  # Kept for compatibility but ignored
    shape: str = "rectangle",    # Kept for compatibility but ignored - always rectangle
    show_advocate_name: bool = True,
    show_tls_logo: bool = True,
    include_signature: bool = False,
    signature_data: Optional[str] = None,
    show_signature_placeholder: bool = False,
    scale: float = 1.0,
    transparent_background: bool = False  # Solid background by default for clean look
) -> Image.Image:
    """
    Generate a clean, professional TLS Verified stamp image.
    
    Design matches the official TLS stamp format:
    - Green header with TLS logo and "TLS VERIFIED"
    - White body with QR code on left, stamp details on right
    - Light green footer with "Scan QR Code to Verify Authenticity"
    - Rounded corners with green border
    
    Customizable:
    - brand_color: Color of header, QR code, and accents
    - scale: Size multiplier
    """
    from PIL import ImageDraw, ImageFont
    import os
    
    # Convert hex color to RGB
    rgb_color = hex_to_rgb(brand_color)
    
    # Define colors
    white = (255, 255, 255)
    dark_text = (30, 30, 30)
    light_gray_text = (120, 120, 120)
    
    # Lighter version of brand color for footer background (20% opacity effect)
    footer_bg = (
        min(255, rgb_color[0] + int((255 - rgb_color[0]) * 0.85)),
        min(255, rgb_color[1] + int((255 - rgb_color[1]) * 0.85)),
        min(255, rgb_color[2] + int((255 - rgb_color[2]) * 0.85))
    )
    
    # Dimensions (matching the reference image proportions)
    base_width = 320
    header_height = 60
    body_height = 140
    footer_height = 35
    total_height = header_height + body_height + footer_height
    
    # Apply scale
    width = int(base_width * scale)
    header_h = int(header_height * scale)
    body_h = int(body_height * scale)
    footer_h = int(footer_height * scale)
    height = int(total_height * scale)
    
    border_width = int(3 * scale)
    corner_radius = int(12 * scale)
    padding = int(15 * scale)
    
    # Create image with white background
    img = Image.new('RGBA', (width, height), white)
    draw = ImageDraw.Draw(img)
    
    # Load fonts
    try:
        font_header_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(18 * scale))
        font_header_subtitle = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(11 * scale))
        font_label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(9 * scale))
        font_stamp_id = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(14 * scale))
        font_date = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(12 * scale))
        font_advocate = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(13 * scale))
        font_footer = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(10 * scale))
    except (OSError, IOError):
        font_header_title = font_header_subtitle = font_label = font_stamp_id = font_date = font_advocate = font_footer = ImageFont.load_default()
    
    # Draw outer border (rounded rectangle)
    draw.rounded_rectangle(
        [0, 0, width - 1, height - 1],
        radius=corner_radius,
        outline=rgb_color,
        width=border_width
    )
    
    # ============ HEADER SECTION ============
    # Green header background
    header_rect = [border_width, border_width, width - border_width, header_h]
    # Fill header with rounded top corners
    draw.rounded_rectangle(
        [border_width, border_width, width - border_width, header_h + corner_radius],
        radius=corner_radius,
        fill=rgb_color
    )
    # Square off bottom of header
    draw.rectangle(
        [border_width, header_h - corner_radius, width - border_width, header_h],
        fill=rgb_color
    )
    
    # Load and place TLS logo
    tls_logo = None
    logo_paths = [
        os.path.join(os.path.dirname(__file__), 'assets', 'tls-logo.png'),
        "/app/frontend/public/assets/tls-logo.png",
        "/app/backend/assets/tls-logo.png"
    ]
    for logo_path in logo_paths:
        if os.path.exists(logo_path):
            try:
                tls_logo = Image.open(logo_path).convert('RGBA')
                break
            except Exception:
                continue
    
    logo_size = int(40 * scale)
    logo_x = padding
    logo_y = border_width + (header_h - border_width - logo_size) // 2
    
    if tls_logo and show_tls_logo:
        # Create circular white background for logo
        logo_bg_size = logo_size + int(4 * scale)
        logo_bg_x = logo_x - int(2 * scale)
        logo_bg_y = logo_y - int(2 * scale)
        draw.ellipse(
            [logo_bg_x, logo_bg_y, logo_bg_x + logo_bg_size, logo_bg_y + logo_bg_size],
            fill=white
        )
        # Resize and paste logo
        logo_resized = tls_logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        img.paste(logo_resized, (logo_x, logo_y), logo_resized)
    
    # Header text - "TLS VERIFIED" and "Tanganyika Law Society"
    text_x = logo_x + logo_size + int(15 * scale)
    header_center_y = border_width + (header_h - border_width) // 2
    
    draw.text(
        (text_x, header_center_y - int(8 * scale)),
        "TLS VERIFIED",
        fill=white,
        font=font_header_title
    )
    draw.text(
        (text_x, header_center_y + int(10 * scale)),
        "Tanganyika Law Society",
        fill=white,
        font=font_header_subtitle
    )
    
    # ============ BODY SECTION ============
    body_top = header_h
    body_bottom = header_h + body_h
    
    # White background for body (already white from base image)
    # Add subtle inner border for body area
    inner_padding = int(10 * scale)
    
    # QR Code section (left side)
    qr_box_size = int(80 * scale)
    qr_padding = int(8 * scale)
    qr_x = padding
    qr_y = body_top + (body_h - qr_box_size) // 2
    
    # QR code container with rounded border
    draw.rounded_rectangle(
        [qr_x, qr_y, qr_x + qr_box_size, qr_y + qr_box_size],
        radius=int(8 * scale),
        outline=rgb_color,
        width=int(2 * scale)
    )
    
    # Generate and place QR code
    qr_inner_size = qr_box_size - (qr_padding * 2)
    qr_img = generate_qr_code_image(verification_url, qr_inner_size, brand_color)
    qr_img = qr_img.convert('RGBA')
    img.paste(qr_img, (qr_x + qr_padding, qr_y + qr_padding), qr_img)
    
    # Info section (right side)
    info_x = qr_x + qr_box_size + int(20 * scale)
    info_y = body_top + int(15 * scale)
    
    # STAMP ID label and value
    draw.text((info_x, info_y), "STAMP ID", fill=rgb_color, font=font_label)
    draw.text((info_x, info_y + int(14 * scale)), stamp_id, fill=dark_text, font=font_stamp_id)
    
    # DATE label and value
    current_date = datetime.now().strftime("%d %b %Y")
    date_y = info_y + int(45 * scale)
    draw.text((info_x, date_y), "DATE", fill=rgb_color, font=font_label)
    draw.text((info_x, date_y + int(14 * scale)), current_date, fill=dark_text, font=font_date)
    
    # ADVOCATE label and value
    if show_advocate_name and advocate_name:
        advocate_y = date_y + int(40 * scale)
        draw.text((info_x, advocate_y), "ADVOCATE", fill=rgb_color, font=font_label)
        draw.text((info_x, advocate_y + int(14 * scale)), advocate_name, fill=rgb_color, font=font_advocate)
    
    # ============ FOOTER SECTION ============
    footer_top = body_bottom
    footer_bottom = height - border_width
    
    # Light green footer background
    # Round bottom corners
    draw.rounded_rectangle(
        [border_width, footer_top - corner_radius, width - border_width, footer_bottom],
        radius=corner_radius,
        fill=footer_bg
    )
    # Square off top of footer
    draw.rectangle(
        [border_width, footer_top, width - border_width, footer_top + corner_radius],
        fill=footer_bg
    )
    
    # Footer text
    footer_text = "Scan QR Code to Verify Authenticity"
    draw.text(
        (width // 2, footer_top + footer_h // 2),
        footer_text,
        fill=rgb_color,
        font=font_footer,
        anchor="mm"
    )
    
    return img
