"""
PrintChakra Backend - Image Processor

Handles image processing for uploaded phone captures.
"""

import os
import logging
import cv2
import numpy as np
from PIL import Image
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)


class ImageProcessor:
    """
    Processor for phone camera captures.
    
    Handles:
    - Image loading and validation
    - Document detection and cropping
    - Quality enhancement
    - Format conversion
    """
    
    def __init__(self):
        self.default_quality = 95
        self.max_dimension = 4000  # Max dimension for processed images
    
    def process_upload(
        self,
        input_path: str,
        output_path: str,
        auto_crop: bool = True,
        ai_enhance: bool = True,
        strict_quality: bool = True
    ) -> Dict[str, Any]:
        """
        Process an uploaded image.
        
        Args:
            input_path: Path to uploaded image
            output_path: Path for processed output
            auto_crop: Whether to auto-detect and crop document
            ai_enhance: Whether to apply AI enhancement
            strict_quality: Whether to apply strict quality checks
            
        Returns:
            Dictionary with processing result
        """
        try:
            # Load image
            image = self._load_image(input_path)
            if image is None:
                return {"success": False, "error": "Failed to load image"}
            
            processing_info = {
                "original_size": image.shape[:2],
                "steps_applied": [],
            }
            
            # Auto-crop document if enabled
            if auto_crop:
                cropped, crop_applied = self._auto_crop_document(image)
                if crop_applied:
                    image = cropped
                    processing_info["steps_applied"].append("auto_crop")
                    processing_info["cropped_size"] = image.shape[:2]
            
            # Apply AI enhancement if enabled
            if ai_enhance:
                enhanced, enhance_applied = self._enhance_image(image)
                if enhance_applied:
                    image = enhanced
                    processing_info["steps_applied"].append("ai_enhance")
            
            # Resize if too large
            if max(image.shape[:2]) > self.max_dimension:
                image = self._resize_image(image, self.max_dimension)
                processing_info["steps_applied"].append("resize")
                processing_info["final_size"] = image.shape[:2]
            
            # Save processed image
            success = self._save_image(image, output_path)
            
            if success:
                return {
                    "success": True,
                    "processing_info": processing_info,
                }
            else:
                return {"success": False, "error": "Failed to save processed image"}
        
        except Exception as e:
            logger.error(f"Processing error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _load_image(self, path: str) -> Optional[np.ndarray]:
        """Load image from file."""
        try:
            # Try OpenCV first
            image = cv2.imread(path)
            if image is not None:
                return image
            
            # Fallback to PIL for other formats
            pil_image = Image.open(path)
            if pil_image.mode == 'RGBA':
                pil_image = pil_image.convert('RGB')
            return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        except Exception as e:
            logger.error(f"Failed to load image: {e}")
            return None
    
    def _auto_crop_document(self, image: np.ndarray) -> Tuple[np.ndarray, bool]:
        """
        Attempt to detect and crop document from image.
        
        Returns:
            Tuple of (processed_image, was_cropped)
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Edge detection
            edges = cv2.Canny(blurred, 75, 200)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
            
            # Sort by area, largest first
            contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
            
            # Find document contour (4-sided polygon)
            for contour in contours:
                peri = cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
                
                if len(approx) == 4:
                    # Check if this is a significant portion of the image
                    area_ratio = cv2.contourArea(approx) / (image.shape[0] * image.shape[1])
                    if area_ratio > 0.1:  # At least 10% of image
                        # Apply perspective transform
                        warped = self._four_point_transform(image, approx.reshape(4, 2))
                        return warped, True
            
            return image, False
        
        except Exception as e:
            logger.warning(f"Auto-crop failed: {e}")
            return image, False
    
    def _four_point_transform(self, image: np.ndarray, pts: np.ndarray) -> np.ndarray:
        """Apply perspective transform to get bird's-eye view."""
        # Order points: top-left, top-right, bottom-right, bottom-left
        rect = self._order_points(pts)
        (tl, tr, br, bl) = rect
        
        # Compute width and height
        widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        maxWidth = max(int(widthA), int(widthB))
        
        heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        maxHeight = max(int(heightA), int(heightB))
        
        # Destination points
        dst = np.array([
            [0, 0],
            [maxWidth - 1, 0],
            [maxWidth - 1, maxHeight - 1],
            [0, maxHeight - 1]
        ], dtype="float32")
        
        # Compute perspective transform and apply
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
        
        return warped
    
    def _order_points(self, pts: np.ndarray) -> np.ndarray:
        """Order points in clockwise order starting from top-left."""
        rect = np.zeros((4, 2), dtype="float32")
        
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]  # top-left
        rect[2] = pts[np.argmax(s)]  # bottom-right
        
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]  # top-right
        rect[3] = pts[np.argmax(diff)]  # bottom-left
        
        return rect
    
    def _enhance_image(self, image: np.ndarray) -> Tuple[np.ndarray, bool]:
        """
        Apply enhancement to improve document readability.
        
        Returns:
            Tuple of (enhanced_image, was_enhanced)
        """
        try:
            # Convert to LAB color space
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE to L channel
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            # Merge and convert back
            enhanced_lab = cv2.merge([l, a, b])
            enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
            
            # Slight sharpening
            kernel = np.array([[-1, -1, -1],
                               [-1,  9, -1],
                               [-1, -1, -1]])
            enhanced = cv2.filter2D(enhanced, -1, kernel * 0.3 + np.eye(3) * 0.7)
            
            return enhanced, True
        
        except Exception as e:
            logger.warning(f"Enhancement failed: {e}")
            return image, False
    
    def _resize_image(self, image: np.ndarray, max_dim: int) -> np.ndarray:
        """Resize image to fit within max dimension while preserving aspect ratio."""
        h, w = image.shape[:2]
        
        if max(h, w) <= max_dim:
            return image
        
        if h > w:
            new_h = max_dim
            new_w = int(w * (max_dim / h))
        else:
            new_w = max_dim
            new_h = int(h * (max_dim / w))
        
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    def _save_image(self, image: np.ndarray, path: str) -> bool:
        """Save image to file."""
        try:
            # Determine output format from extension
            ext = os.path.splitext(path)[1].lower()
            
            if ext in ['.jpg', '.jpeg']:
                params = [cv2.IMWRITE_JPEG_QUALITY, self.default_quality]
            elif ext == '.png':
                params = [cv2.IMWRITE_PNG_COMPRESSION, 6]
            else:
                params = []
            
            return cv2.imwrite(path, image, params)
        
        except Exception as e:
            logger.error(f"Failed to save image: {e}")
            return False
