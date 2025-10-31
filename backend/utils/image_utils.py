"""
Image utilities
Common image processing operations
"""

import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional


def resize_image(image: np.ndarray, max_width: int = None, max_height: int = None) -> np.ndarray:
    """
    Resize image maintaining aspect ratio
    
    Args:
        image: Input image
        max_width: Maximum width
        max_height: Maximum height
        
    Returns:
        Resized image
    """
    h, w = image.shape[:2]
    
    if max_width is None and max_height is None:
        return image
    
    # Calculate scaling factor
    scale = 1.0
    if max_width and w > max_width:
        scale = min(scale, max_width / w)
    if max_height and h > max_height:
        scale = min(scale, max_height / h)
    
    if scale < 1.0:
        new_w = int(w * scale)
        new_h = int(h * scale)
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    return image


def convert_to_grayscale(image: np.ndarray) -> np.ndarray:
    """
    Convert image to grayscale
    
    Args:
        image: Input image
        
    Returns:
        Grayscale image
    """
    if len(image.shape) == 3:
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return image


def enhance_contrast(image: np.ndarray, clip_limit: float = 2.0, tile_size: int = 8) -> np.ndarray:
    """
    Enhance image contrast using CLAHE
    
    Args:
        image: Input image
        clip_limit: Contrast limit
        tile_size: Size of grid for histogram equalization
        
    Returns:
        Enhanced image
    """
    # Convert to grayscale if needed
    is_color = len(image.shape) == 3
    if is_color:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    # Apply CLAHE
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_size, tile_size))
    enhanced = clahe.apply(gray)
    
    # Convert back to color if needed
    if is_color:
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
    
    return enhanced


def rotate_image(image: np.ndarray, angle: int) -> np.ndarray:
    """
    Rotate image by angle (90, 180, 270 degrees)
    
    Args:
        image: Input image
        angle: Rotation angle
        
    Returns:
        Rotated image
    """
    if angle == 90:
        return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    elif angle == 180:
        return cv2.rotate(image, cv2.ROTATE_180)
    elif angle == 270:
        return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return image


def crop_image(image: np.ndarray, x: int, y: int, width: int, height: int) -> np.ndarray:
    """
    Crop image to specified region
    
    Args:
        image: Input image
        x: X coordinate
        y: Y coordinate
        width: Crop width
        height: Crop height
        
    Returns:
        Cropped image
    """
    h, w = image.shape[:2]
    x = max(0, min(x, w))
    y = max(0, min(y, h))
    x2 = min(x + width, w)
    y2 = min(y + height, h)
    return image[y:y2, x:x2]


def convert_pil_to_cv2(pil_image: Image.Image) -> np.ndarray:
    """
    Convert PIL Image to OpenCV format
    
    Args:
        pil_image: PIL Image
        
    Returns:
        OpenCV image (numpy array)
    """
    return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)


def convert_cv2_to_pil(cv2_image: np.ndarray) -> Image.Image:
    """
    Convert OpenCV image to PIL format
    
    Args:
        cv2_image: OpenCV image (numpy array)
        
    Returns:
        PIL Image
    """
    return Image.fromarray(cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB))
