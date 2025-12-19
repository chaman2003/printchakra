"""
PrintChakra Backend - Quality Validator

Validates image quality for document capture.
"""

import cv2
import numpy as np
import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger(__name__)


class QualityValidator:
    """
    Validates image quality for document capture.
    
    Checks for:
    - Blur/focus issues
    - Lighting conditions
    - Document visibility
    - Image resolution
    """
    
    def __init__(self):
        # Quality thresholds
        self.blur_threshold = 100  # Laplacian variance threshold
        self.min_resolution = (640, 480)
        self.brightness_range = (30, 220)  # Min and max average brightness
    
    def validate_image(self, image_path: str) -> Dict[str, Any]:
        """
        Validate image quality.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Dictionary with quality metrics and recommendations
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {
                    "success": False,
                    "error": "Failed to load image",
                    "quality": {"overall_acceptable": False}
                }
            
            # Run all quality checks
            blur_result = self._check_blur(image)
            brightness_result = self._check_brightness(image)
            resolution_result = self._check_resolution(image)
            document_result = self._check_document_visibility(image)
            
            # Aggregate issues and recommendations
            issues = []
            recommendations = []
            
            if blur_result["is_blurry"]:
                issues.append("Image is blurry")
                recommendations.append("Hold camera steady or tap to focus")
            
            if brightness_result["too_dark"]:
                issues.append("Image is too dark")
                recommendations.append("Move to better lighting")
            elif brightness_result["too_bright"]:
                issues.append("Image is overexposed")
                recommendations.append("Reduce direct lighting or move camera")
            
            if not resolution_result["acceptable"]:
                issues.append("Resolution too low")
                recommendations.append("Move camera closer or use higher quality setting")
            
            if not document_result["document_visible"]:
                issues.append("Document edges not detected")
                recommendations.append("Ensure document is fully visible with clear background")
            
            # Calculate overall quality
            overall_acceptable = (
                not blur_result["is_blurry"] and
                not brightness_result["too_dark"] and
                not brightness_result["too_bright"] and
                resolution_result["acceptable"]
            )
            
            return {
                "success": True,
                "blur_score": blur_result["score"],
                "is_blurry": blur_result["is_blurry"],
                "focus_score": blur_result["focus_score"],
                "is_focused": not blur_result["is_blurry"],
                "brightness": brightness_result,
                "resolution": resolution_result,
                "document_detection": document_result,
                "quality": {
                    "overall_acceptable": overall_acceptable,
                    "issues": issues,
                    "recommendations": recommendations,
                }
            }
        
        except Exception as e:
            logger.error(f"Quality validation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "quality": {"overall_acceptable": False}
            }
    
    def _check_blur(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Check image blur using Laplacian variance.
        
        Higher variance = sharper image.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Normalize focus score (0-100)
        focus_score = min(100, (laplacian_var / self.blur_threshold) * 100)
        
        return {
            "score": float(laplacian_var),
            "focus_score": float(focus_score),
            "is_blurry": laplacian_var < self.blur_threshold,
            "threshold": self.blur_threshold,
        }
    
    def _check_brightness(self, image: np.ndarray) -> Dict[str, Any]:
        """Check image brightness levels."""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Calculate average brightness
        avg_brightness = np.mean(gray)
        
        # Check histogram distribution
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist.flatten() / hist.sum()
        
        # Calculate contrast (standard deviation of brightness)
        contrast = np.std(gray)
        
        return {
            "average": float(avg_brightness),
            "contrast": float(contrast),
            "too_dark": avg_brightness < self.brightness_range[0],
            "too_bright": avg_brightness > self.brightness_range[1],
            "acceptable_range": self.brightness_range,
        }
    
    def _check_resolution(self, image: np.ndarray) -> Dict[str, Any]:
        """Check image resolution."""
        h, w = image.shape[:2]
        
        acceptable = (
            w >= self.min_resolution[0] and
            h >= self.min_resolution[1]
        )
        
        return {
            "width": w,
            "height": h,
            "acceptable": acceptable,
            "min_required": self.min_resolution,
        }
    
    def _check_document_visibility(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Check if a document is visible in the image.
        
        Uses edge detection to find rectangular contours.
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blurred, 50, 150)
            
            contours, _ = cv2.findContours(
                edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
            )
            
            # Sort by area
            contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
            
            document_found = False
            document_area_ratio = 0
            
            for contour in contours:
                peri = cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
                
                if len(approx) == 4:  # Quadrilateral found
                    area = cv2.contourArea(approx)
                    image_area = image.shape[0] * image.shape[1]
                    ratio = area / image_area
                    
                    if ratio > 0.1:  # At least 10% of image
                        document_found = True
                        document_area_ratio = ratio
                        break
            
            return {
                "document_visible": document_found,
                "area_ratio": float(document_area_ratio) if document_found else 0,
                "confidence": float(min(document_area_ratio * 2, 1.0)) if document_found else 0,
            }
        
        except Exception as e:
            logger.warning(f"Document detection error: {e}")
            return {
                "document_visible": False,
                "area_ratio": 0,
                "confidence": 0,
                "error": str(e),
            }
    
    def validate_frame_data(self, frame_data: bytes) -> Dict[str, Any]:
        """
        Validate quality from raw frame data (e.g., base64 decoded).
        
        Args:
            frame_data: Raw image bytes
            
        Returns:
            Quality validation result
        """
        import tempfile
        import os
        
        # Write to temp file and validate
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(frame_data)
            tmp.flush()
            result = self.validate_image(tmp.name)
            os.unlink(tmp.name)
        
        return result
