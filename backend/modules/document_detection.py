"""
Real-time Document Detection Module
Detects document borders and corners in real-time using OpenCV
"""

import cv2
import numpy as np
from typing import Dict, Tuple, Optional, List
import json


class DocumentDetector:
    """
    Real-time document detection with border and corner point visualization
    """
    
    def __init__(self):
        """Initialize document detector"""
        self.min_area = 5000  # Minimum contour area to consider
        self.min_perimeter = 100
        
    def detect_document_borders(self, image: np.ndarray) -> Dict:
        """
        Detect document borders and corner points in real-time
        
        Args:
            image: Input image (BGR)
            
        Returns:
            Dict with border data and visualization info
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Edge detection
            edges = cv2.Canny(blurred, 50, 150)
            
            # Morphological operations to close gaps
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return {
                    'success': False,
                    'message': 'No document detected',
                    'corners': []
                }
            
            # Find the largest rectangular contour
            document_contour = self._find_document_contour(contours, image.shape)
            
            if document_contour is None:
                return {
                    'success': False,
                    'message': 'No document rectangle detected',
                    'corners': []
                }
            
            # Order corners
            corners = self._order_corners(document_contour)
            
            # Normalize corners to percentage coordinates (0-100)
            height, width = image.shape[:2]
            normalized_corners = self._normalize_corners(corners, width, height)
            
            return {
                'success': True,
                'message': 'Document detected',
                'corners': normalized_corners,  # Normalized [0-100]
                'pixel_corners': corners.tolist(),  # Pixel coordinates
                'contour_area': float(cv2.contourArea(document_contour)),
                'image_area': float(width * height),
                'coverage': float(cv2.contourArea(document_contour) / (width * height) * 100)
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Detection error: {str(e)}',
                'corners': []
            }
    
    def _find_document_contour(self, contours: List, image_shape: Tuple) -> Optional[np.ndarray]:
        """
        Find the most likely document contour
        
        Args:
            contours: List of contours
            image_shape: Image shape (height, width, channels)
            
        Returns:
            Document contour or None
        """
        height, width = image_shape[:2]
        image_area = width * height
        
        for contour in sorted(contours, key=cv2.contourArea, reverse=True):
            area = cv2.contourArea(contour)
            
            # Skip if too small or too large
            if area < self.min_area or area > image_area * 0.95:
                continue
            
            perimeter = cv2.arcLength(contour, True)
            if perimeter < self.min_perimeter:
                continue
            
            # Approximate contour
            epsilon = 0.02 * perimeter
            approx = cv2.approxPolyDP(contour, epsilon, True)
            
            # Check if it's a quadrilateral (4 corners)
            if len(approx) == 4:
                # Verify it's a reasonable rectangle
                if self._is_valid_rectangle(approx, width, height):
                    return approx
        
        return None
    
    def _is_valid_rectangle(self, contour: np.ndarray, width: int, height: int) -> bool:
        """
        Validate if contour is a reasonable rectangle
        
        Args:
            contour: Contour points
            width: Image width
            height: Image height
            
        Returns:
            True if valid rectangle
        """
        try:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Must be at least 20% of image
            if w * h < (width * height * 0.20):
                return False
            
            # Must be no more than 95% of image
            if w * h > (width * height * 0.95):
                return False
            
            # Aspect ratio should be reasonable (0.5 to 2.0)
            aspect_ratio = float(w) / h if h > 0 else 0
            if aspect_ratio < 0.5 or aspect_ratio > 2.0:
                return False
            
            return True
        except:
            return False
    
    def _order_corners(self, contour: np.ndarray) -> np.ndarray:
        """
        Order corners in consistent order: top-left, top-right, bottom-right, bottom-left
        
        Args:
            contour: Contour with 4 points
            
        Returns:
            Ordered corner points
        """
        pts = contour.reshape(4, 2).astype(float)
        
        # Calculate the center
        center = pts.mean(axis=0)
        
        # Sort points by angle from center
        angles = np.arctan2(pts[:, 1] - center[1], pts[:, 0] - center[0])
        sorted_indices = np.argsort(angles)
        
        return pts[sorted_indices].astype(int)
    
    def _normalize_corners(self, corners: np.ndarray, width: int, height: int) -> List[Dict]:
        """
        Convert pixel coordinates to normalized [0-100] coordinates
        
        Args:
            corners: Pixel coordinates
            width: Image width
            height: Image height
            
        Returns:
            List of normalized corner coordinates
        """
        normalized = []
        for i, corner in enumerate(corners):
            x_norm = (float(corner[0]) / width) * 100
            y_norm = (float(corner[1]) / height) * 100
            
            # Label corners
            corner_names = ['top-left', 'top-right', 'bottom-right', 'bottom-left']
            
            normalized.append({
                'id': i,
                'name': corner_names[i],
                'x': x_norm,
                'y': y_norm,
                'pixel_x': int(corner[0]),
                'pixel_y': int(corner[1])
            })
        
        return normalized
    
    def draw_detection_overlay(self, image: np.ndarray, detection_result: Dict) -> np.ndarray:
        """
        Draw detection overlay on image
        
        Args:
            image: Input image
            detection_result: Detection result from detect_document_borders
            
        Returns:
            Image with drawn overlay
        """
        overlay = image.copy()
        height, width = image.shape[:2]
        
        if not detection_result['success'] or not detection_result['corners']:
            return overlay
        
        # Draw border lines
        corners = detection_result['corners']
        pixel_corners = []
        
        for corner in corners:
            x = int((corner['x'] / 100) * width)
            y = int((corner['y'] / 100) * height)
            pixel_corners.append([x, y])
        
        pixel_corners = np.array(pixel_corners, dtype=np.int32)
        
        # Draw polygon border
        cv2.polylines(overlay, [pixel_corners], True, (0, 255, 0), 3)
        
        # Draw corner points with labels
        for i, corner in enumerate(corners):
            x = int((corner['x'] / 100) * width)
            y = int((corner['y'] / 100) * height)
            
            # Draw circle at corner
            cv2.circle(overlay, (x, y), 8, (0, 255, 0), -1)
            cv2.circle(overlay, (x, y), 8, (255, 255, 255), 2)
            
            # Draw corner label
            label_text = corner['name']
            cv2.putText(overlay, label_text, (x + 15, y - 15),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Draw coverage info
        coverage = detection_result.get('coverage', 0)
        coverage_text = f"Coverage: {coverage:.1f}%"
        cv2.putText(overlay, coverage_text, (20, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        return overlay


def detect_and_serialize(image_bytes: bytes) -> Dict:
    """
    Detect document in image and return serialized result
    
    Args:
        image_bytes: Image data as bytes
        
    Returns:
        Serializable detection result
    """
    import io
    from PIL import Image as PILImage
    
    try:
        # Decode image
        pil_image = PILImage.open(io.BytesIO(image_bytes))
        image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Detect
        detector = DocumentDetector()
        result = detector.detect_document_borders(image)
        
        return result
    except Exception as e:
        return {
            'success': False,
            'message': f'Error: {str(e)}',
            'corners': []
        }


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            print(f"Failed to read {image_path}")
            sys.exit(1)
        
        # Detect
        detector = DocumentDetector()
        result = detector.detect_document_borders(image)
        
        # Print result
        print(json.dumps(result, indent=2))
        
        # Display with overlay
        overlay = detector.draw_detection_overlay(image, result)
        cv2.imshow('Document Detection', overlay)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
