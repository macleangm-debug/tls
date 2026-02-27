"""
CamScanner-style Scan Enhancement Service

Features:
- Auto-detect document edges (largest 4-point contour)
- Perspective warp -> flat "scanned page"
- Auto-orient using EXIF + optional rotation fix
- Enhance (Document gray default, configurable)
- Graceful fallback if detection fails
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Tuple
from io import BytesIO
import numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

# Try to import OpenCV (opencv-python-headless)
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    cv2 = None
    OPENCV_AVAILABLE = False


@dataclass
class CropResult:
    """Result of auto-crop attempt"""
    image: Image.Image
    used_perspective: bool
    confidence: float  # 0..1
    message: str


def _order_points(pts: np.ndarray) -> np.ndarray:
    """
    Order points in: top-left, top-right, bottom-right, bottom-left
    """
    rect = np.zeros((4, 2), dtype="float32")
    
    # Sum of coordinates: top-left has smallest, bottom-right has largest
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left
    rect[2] = pts[np.argmax(s)]  # bottom-right
    
    # Difference: top-right has smallest, bottom-left has largest
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left
    
    return rect


def _four_point_transform(image_bgr: np.ndarray, pts: np.ndarray, padding: int = 5) -> np.ndarray:
    """
    Perform perspective transform to get a top-down view of the document.
    Adds small padding to avoid cutting off edges.
    """
    rect = _order_points(pts)
    (tl, tr, br, bl) = rect
    
    # Compute width of new image
    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = int(max(widthA, widthB)) + (padding * 2)
    
    # Compute height of new image
    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = int(max(heightA, heightB)) + (padding * 2)
    
    # Destination points with padding
    dst = np.array([
        [padding, padding],
        [maxWidth - 1 - padding, padding],
        [maxWidth - 1 - padding, maxHeight - 1 - padding],
        [padding, maxHeight - 1 - padding]
    ], dtype="float32")
    
    # Compute perspective transform matrix and apply
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image_bgr, M, (maxWidth, maxHeight), 
                                  borderMode=cv2.BORDER_CONSTANT, 
                                  borderValue=(255, 255, 255))
    return warped


def _find_document_contour(gray: np.ndarray, original_shape: Tuple[int, int]) -> Tuple[Optional[np.ndarray], float]:
    """
    Find the largest 4-point contour that looks like a document.
    Returns (contour, confidence) or (None, 0.0) if not found.
    """
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Try multiple edge detection approaches
    edges = None
    
    # Approach 1: Canny edge detection
    edges1 = cv2.Canny(blurred, 50, 200)
    edges1 = cv2.dilate(edges1, None, iterations=2)
    edges1 = cv2.erode(edges1, None, iterations=1)
    
    # Approach 2: Adaptive threshold
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                    cv2.THRESH_BINARY_INV, 11, 2)
    thresh = cv2.dilate(thresh, None, iterations=1)
    
    # Try both approaches
    for edge_img in [edges1, thresh]:
        cnts, _ = cv2.findContours(edge_img.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:10]
        
        for c in cnts:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            
            if len(approx) == 4:
                # Check if contour is large enough (at least 15% of image area)
                area = cv2.contourArea(approx)
                img_area = original_shape[0] * original_shape[1]
                area_ratio = area / img_area
                
                if area_ratio >= 0.15:
                    # Confidence based on area ratio (larger = more confident)
                    confidence = min(1.0, area_ratio * 1.5)
                    return approx, confidence
    
    return None, 0.0


def auto_crop_perspective(pil_img: Image.Image, min_confidence: float = 0.25) -> CropResult:
    """
    Auto-detect document edges and perform perspective crop.
    
    Args:
        pil_img: Input PIL Image
        min_confidence: Minimum confidence threshold (0-1)
    
    Returns:
        CropResult with cropped image or original if detection fails
    """
    # Always fix EXIF orientation first
    pil_img = ImageOps.exif_transpose(pil_img)
    
    # Convert to RGB if needed
    if pil_img.mode != 'RGB':
        if pil_img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', pil_img.size, (255, 255, 255))
            if pil_img.mode == 'P':
                pil_img = pil_img.convert('RGBA')
            if pil_img.mode in ('RGBA', 'LA'):
                background.paste(pil_img, mask=pil_img.split()[-1])
            else:
                background.paste(pil_img)
            pil_img = background
        else:
            pil_img = pil_img.convert('RGB')
    
    # Check if OpenCV is available
    if not OPENCV_AVAILABLE:
        return CropResult(
            image=pil_img,
            used_perspective=False,
            confidence=0.0,
            message="OpenCV not available - using original"
        )
    
    # Convert PIL to OpenCV format (BGR)
    img_array = np.array(pil_img)
    bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    # Resize for faster processing (keep aspect ratio)
    h, w = bgr.shape[:2]
    target_width = 1200
    if w > target_width:
        scale = target_width / float(w)
        resized = cv2.resize(bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        scale = 1.0
        resized = bgr.copy()
    
    # Convert to grayscale for edge detection
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    
    # Find document contour
    doc_cnt, confidence = _find_document_contour(gray, resized.shape[:2])
    
    if doc_cnt is None or confidence < min_confidence:
        return CropResult(
            image=pil_img,
            used_perspective=False,
            confidence=confidence,
            message=f"No document edges found (confidence: {confidence:.2f})"
        )
    
    # Map contour points back to original image size
    pts = doc_cnt.reshape(4, 2).astype("float32") / scale
    
    # Perform perspective transform on original (full-resolution) image
    try:
        warped = _four_point_transform(bgr, pts, padding=10)
        
        # Convert back to RGB PIL Image
        warped_rgb = cv2.cvtColor(warped, cv2.COLOR_BGR2RGB)
        result_img = Image.fromarray(warped_rgb)
        
        return CropResult(
            image=result_img,
            used_perspective=True,
            confidence=confidence,
            message=f"Auto-cropped (confidence: {confidence:.2f})"
        )
    except Exception as e:
        return CropResult(
            image=pil_img,
            used_perspective=False,
            confidence=0.0,
            message=f"Perspective transform failed: {str(e)}"
        )


def enhance_scan(pil_img: Image.Image, mode: str = "document") -> Image.Image:
    """
    Apply CamScanner-style enhancement to image.
    
    Args:
        pil_img: Input PIL Image
        mode: "document" (gray), "color", or "bw"
    
    Returns:
        Enhanced PIL Image
    """
    # Ensure EXIF orientation is fixed
    pil_img = ImageOps.exif_transpose(pil_img)
    
    # Convert to RGB if needed
    if pil_img.mode not in ('RGB', 'L'):
        if pil_img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', pil_img.size, (255, 255, 255))
            if pil_img.mode == 'P':
                pil_img = pil_img.convert('RGBA')
            if pil_img.mode in ('RGBA', 'LA'):
                background.paste(pil_img, mask=pil_img.split()[-1])
            else:
                background.paste(pil_img)
            pil_img = background
        else:
            pil_img = pil_img.convert('RGB')
    
    # Light denoise
    pil_img = pil_img.filter(ImageFilter.MedianFilter(size=3))
    
    if mode == "document":
        # Document scan mode - grayscale with high contrast (like CamScanner)
        gray = ImageOps.grayscale(pil_img)
        gray = ImageOps.autocontrast(gray, cutoff=2)
        gray = ImageEnhance.Contrast(gray).enhance(1.5)
        gray = ImageEnhance.Sharpness(gray).enhance(1.5)
        return gray.convert("RGB")
    
    elif mode == "bw":
        # Black & white - smallest files, crispest text
        gray = ImageOps.grayscale(pil_img)
        gray = ImageOps.autocontrast(gray, cutoff=2)
        gray = ImageEnhance.Contrast(gray).enhance(1.8)
        # Threshold binarization
        bw = gray.point(lambda p: 255 if p > 160 else 0, mode="1")
        return bw.convert("RGB")
    
    else:  # color
        # Color mode - preserve colors but enhance
        enhanced = ImageEnhance.Contrast(pil_img).enhance(1.2)
        enhanced = ImageEnhance.Sharpness(enhanced).enhance(1.3)
        enhanced = ImageEnhance.Color(enhanced).enhance(1.05)
        return enhanced


def process_scan_image(
    content: bytes,
    auto_crop: bool = True,
    min_crop_confidence: float = 0.25,
    enhance_mode: str = "document",
    max_dimension: int = 2400
) -> Tuple[Image.Image, dict]:
    """
    Full CamScanner-style processing pipeline.
    
    Args:
        content: Raw image bytes
        auto_crop: Whether to attempt auto-crop
        min_crop_confidence: Minimum confidence for auto-crop
        enhance_mode: "document", "color", or "bw"
        max_dimension: Maximum dimension for output
    
    Returns:
        (processed_image, metadata_dict)
    """
    # Open image
    img = Image.open(BytesIO(content))
    
    metadata = {
        "original_size": img.size,
        "auto_cropped": False,
        "crop_confidence": 0.0,
        "crop_message": "",
        "enhance_mode": enhance_mode
    }
    
    # Step 1: Auto-crop if enabled
    if auto_crop:
        crop_result = auto_crop_perspective(img, min_crop_confidence)
        img = crop_result.image
        metadata["auto_cropped"] = crop_result.used_perspective
        metadata["crop_confidence"] = crop_result.confidence
        metadata["crop_message"] = crop_result.message
    else:
        # Still fix EXIF orientation
        img = ImageOps.exif_transpose(img)
        if img.mode != 'RGB':
            img = img.convert('RGB')
    
    # Step 2: Resize if too large
    w, h = img.size
    if max(w, h) > max_dimension:
        scale = max_dimension / float(max(w, h))
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    
    # Step 3: Enhance
    img = enhance_scan(img, mode=enhance_mode)
    
    metadata["final_size"] = img.size
    
    return img, metadata
