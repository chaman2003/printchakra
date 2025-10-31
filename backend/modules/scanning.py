"""
Section 1: Scanning & Capture Module
Handles image capture, blur detection, and focus measurement
"""

from typing import Dict, Tuple

import cv2
import numpy as np


class ScanningModule:
    """
    Handles document scanning and image quality validation
    """

    def __init__(self, blur_threshold: float = 100.0, focus_threshold: float = 50.0):
        """
        Initialize scanning module

        Args:
            blur_threshold: Minimum variance of Laplacian (higher = sharper)
            focus_threshold: Minimum gradient magnitude (higher = better focus)
        """
        self.blur_threshold = blur_threshold
        self.focus_threshold = focus_threshold

    def detect_blur(self, image: np.ndarray) -> Dict[str, any]:
        """
        Detect if image is blurry using Variance of Laplacian

        Args:
            image: Input image (BGR or grayscale)

        Returns:
            Dict with blur score and is_blurry flag
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Calculate Variance of Laplacian
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        blur_score = laplacian.var()

        is_blurry = blur_score < self.blur_threshold

        return {
            "blur_score": float(blur_score),
            "is_blurry": is_blurry,
            "threshold": self.blur_threshold,
            "quality": "poor" if is_blurry else "good",
        }

    def measure_focus(self, image: np.ndarray) -> Dict[str, any]:
        """
        Measure image focus using gradient magnitude

        Args:
            image: Input image (BGR or grayscale)

        Returns:
            Dict with focus score and is_focused flag
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Calculate gradients using Sobel operators
        grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)

        # Calculate gradient magnitude
        gradient_magnitude = np.sqrt(grad_x**2 + grad_y**2)
        focus_score = gradient_magnitude.mean()

        is_focused = focus_score >= self.focus_threshold

        return {
            "focus_score": float(focus_score),
            "is_focused": is_focused,
            "threshold": self.focus_threshold,
            "quality": "sharp" if is_focused else "blurry",
        }

    def validate_image_quality(self, image: np.ndarray) -> Dict[str, any]:
        """
        Comprehensive image quality validation

        Args:
            image: Input image

        Returns:
            Dict with all quality metrics
        """
        blur_result = self.detect_blur(image)
        focus_result = self.measure_focus(image)

        # Overall quality assessment
        is_acceptable = not blur_result["is_blurry"] and focus_result["is_focused"]

        return {
            "blur": blur_result,
            "focus": focus_result,
            "is_acceptable": is_acceptable,
            "overall_quality": "excellent" if is_acceptable else "needs_improvement",
            "recommendations": self._get_recommendations(blur_result, focus_result),
        }

    def _get_recommendations(self, blur_result: Dict, focus_result: Dict) -> list:
        """Generate improvement recommendations"""
        recommendations = []

        if blur_result["is_blurry"]:
            recommendations.append("Image is blurry - hold camera steady or use tripod")

        if not focus_result["is_focused"]:
            recommendations.append("Image is out of focus - tap to focus or adjust distance")

        if not recommendations:
            recommendations.append("Image quality is good - ready for processing")

        return recommendations

    def capture_from_webcam(self, camera_index: int = 0) -> Tuple[bool, np.ndarray]:
        """
        Capture single frame from webcam

        Args:
            camera_index: Camera device index (0 for default)

        Returns:
            Tuple of (success, image)
        """
        cap = cv2.VideoCapture(camera_index)

        if not cap.isOpened():
            return False, None

        # Warm up camera
        for _ in range(5):
            cap.read()

        # Capture frame
        ret, frame = cap.read()
        cap.release()

        return ret, frame

    def auto_capture_best_frame(
        self, camera_index: int = 0, max_attempts: int = 10
    ) -> Tuple[bool, np.ndarray, Dict]:
        """
        Automatically capture the best quality frame

        Args:
            camera_index: Camera device index
            max_attempts: Maximum frames to evaluate

        Returns:
            Tuple of (success, best_frame, quality_metrics)
        """
        cap = cv2.VideoCapture(camera_index)

        if not cap.isOpened():
            return False, None, {}

        best_score = 0
        best_frame = None
        best_metrics = {}

        for i in range(max_attempts):
            ret, frame = cap.read()
            if not ret:
                continue

            # Evaluate quality
            quality = self.validate_image_quality(frame)

            # Calculate combined score
            score = quality["blur"]["blur_score"] + quality["focus"]["focus_score"]

            if score > best_score:
                best_score = score
                best_frame = frame.copy()
                best_metrics = quality

        cap.release()

        return best_frame is not None, best_frame, best_metrics


# Utility functions for web integration
def validate_image_file(file_path: str) -> Dict[str, any]:
    """
    Validate uploaded image file quality

    Args:
        file_path: Path to image file

    Returns:
        Quality validation results
    """
    scanner = ScanningModule()
    image = cv2.imread(file_path)

    if image is None:
        return {"success": False, "error": "Could not read image file"}

    quality = scanner.validate_image_quality(image)
    quality["success"] = True
    quality["image_shape"] = image.shape

    return quality
