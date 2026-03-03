"""
Utils package for TLS Practice Management Suite
"""
from utils.helpers import (
    # ID generators
    generate_stamp_id,
    generate_tls_member_number,
    generate_stamp_hash,
    generate_document_hash,
    generate_uuid,
    
    # QR code utilities
    hex_to_rgb,
    generate_qr_code,
    generate_branded_qr_code,
    
    # Date utilities
    get_utc_now,
    get_utc_now_iso,
    add_days,
    add_years,
    
    # Validation utilities
    validate_password_strength,
    validate_roll_number,
    
    # File utilities
    get_file_extension,
    is_supported_image,
    is_supported_document,
    
    # Achievement calculations
    calculate_achievements,
)

__all__ = [
    "generate_stamp_id",
    "generate_tls_member_number",
    "generate_stamp_hash",
    "generate_document_hash",
    "generate_uuid",
    "hex_to_rgb",
    "generate_qr_code",
    "generate_branded_qr_code",
    "get_utc_now",
    "get_utc_now_iso",
    "add_days",
    "add_years",
    "validate_password_strength",
    "validate_roll_number",
    "get_file_extension",
    "is_supported_image",
    "is_supported_document",
    "calculate_achievements",
]
