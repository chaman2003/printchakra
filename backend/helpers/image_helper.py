"""
Simple Image Helper
------------------
Easy functions for basic image operations.
"""

import cv2
import numpy as np
from PIL import Image


def load_image(filepath):
    """
    Load an image from file.
    
    Args:
        filepath: Path to image file
    
    Returns:
        Image as numpy array or None if failed
    """
    try:
        img = cv2.imread(filepath)
        if img is not None:
            return img
        
        # Fallback to PIL if OpenCV fails
        pil_img = Image.open(filepath)
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception:
        return None


def save_image(image, filepath):
    """
    Save an image to file.
    
    Args:
        image: Image as numpy array
        filepath: Path to save to
    
    Returns:
        True if successful, False otherwise
    """
    try:
        cv2.imwrite(filepath, image)
        return True
    except Exception:
        return False


def resize_image(image, width=None, height=None, max_dimension=None):
    """
    Resize an image while maintaining aspect ratio.
    
    Args:
        image: Image as numpy array
        width: Target width (optional)
        height: Target height (optional)
        max_dimension: Maximum width or height (optional)
    
    Returns:
        Resized image
    """
    h, w = image.shape[:2]
    
    if max_dimension:
        if w > h:
            width = max_dimension
            height = int(h * (max_dimension / w))
        else:
            height = max_dimension
            width = int(w * (max_dimension / h))
    elif width and not height:
        height = int(h * (width / w))
    elif height and not width:
        width = int(w * (height / h))
    
    return cv2.resize(image, (width, height))


def convert_to_grayscale(image):
    """
    Convert image to grayscale.
    
    Args:
        image: Color image
    
    Returns:
        Grayscale image
    """
    if len(image.shape) == 2:
        return image  # Already grayscale
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def crop_image(image, x, y, width, height):
    """
    Crop an image to specified region.
    
    Args:
        image: Image to crop
        x, y: Top-left corner
        width, height: Size of crop
    
    Returns:
        Cropped image
    """
    return image[y:y+height, x:x+width]


def get_image_dimensions(image):
    """
    Get width and height of an image.
    
    Args:
        image: Image as numpy array
    
    Returns:
        Tuple of (width, height)
    """
    h, w = image.shape[:2]
    return (w, h)
