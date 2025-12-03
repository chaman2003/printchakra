"""
Document Detection Module - Improved Detection with Geometric Scoring
Multi-method document boundary detection with corner refinement from notebook
"""

import json
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np


class DocumentDetector:
    """
    Advanced document detection with geometric scoring and corner refinement
    """

    def __init__(self):
        """Initialize document detector with improved parameters"""
        self.min_area = 8000  # Minimum contour area to consider
        self.min_perimeter = 100

    def score_contour(self, contour: np.ndarray, image_shape: Tuple[int, int]) -> Dict:
        """
        Score contour based on geometric criteria - improved to avoid background edges

        Args:
            contour: Contour to score
            image_shape: Image dimensions (height, width)

        Returns:
            Dictionary with scoring details
        """
        area = cv2.contourArea(contour)
        image_area = image_shape[0] * image_shape[1]
        area_ratio = area / image_area
        height, width = image_shape
        pts = contour.reshape(-1, 2)

        # Margin analysis - STRICT: penalize edges touching the image boundary
        min_x, min_y = np.min(pts[:, 0]), np.min(pts[:, 1])
        max_x, max_y = np.max(pts[:, 0]), np.max(pts[:, 1])

        # Calculate margins as percentage of image size
        left_margin = min_x / width
        right_margin = (width - max_x) / width
        top_margin = min_y / height
        bottom_margin = (height - max_y) / height
        min_margin = min(left_margin, right_margin, top_margin, bottom_margin)

        # CRITICAL: Heavy penalty if edges are too close to image boundary
        if min_margin < 0.04:
            margin_score = -600  # Very strong penalty
        elif min_margin < 0.06:
            margin_score = -300  # Strong penalty
        elif min_margin < 0.12:
            margin_score = -50  # Mild penalty
        else:
            margin_score = 100  # Good margin

        # Rectangularity check
        rect = cv2.minAreaRect(contour)
        box = cv2.boxPoints(rect)
        box_area = cv2.contourArea(box)

        if box_area > 0:
            rectangularity = area / box_area
        else:
            rectangularity = 0

        # Angle analysis - measure how close corners are to 90 degrees
        angles = []
        for i in range(len(pts)):
            p0, p1, p2 = pts[i], pts[(i + 1) % len(pts)], pts[(i + 2) % len(pts)]
            v1, v2 = p0 - p1, p2 - p1
            norm1, norm2 = np.linalg.norm(v1), np.linalg.norm(v2)
            if norm1 > 0 and norm2 > 0:
                angle = np.arccos(np.clip(np.dot(v1, v2) / (norm1 * norm2), -1, 1))
                angles.append(np.degrees(angle))

        if angles:
            angle_error = np.mean([abs(a - 90) for a in angles])
        else:
            angle_error = 180

        # Scoring for rectangularity
        if angle_error < 8:
            rect_score = 100
        elif angle_error < 12:
            rect_score = 60
        elif angle_error < 18:
            rect_score = 20
        else:
            rect_score = -100

        # Aspect ratio check (prefer close to 1:1.5 or similar)
        if rect[1][0] > 0 and rect[1][1] > 0:
            aspect = max(rect[1]) / min(rect[1])
            
            # A4 aspect ratio is approx 1.414
            # Letter aspect ratio is approx 1.29
            if 1.35 <= aspect <= 1.48:  # A4 sweet spot
                aspect_score = 80
            elif 1.25 <= aspect <= 1.55:  # General document range (A4/Letter)
                aspect_score = 50
            elif 1.2 <= aspect <= 2.5:  # Broad document-like aspect ratio
                aspect_score = 20
            elif aspect > 2.5 or aspect < 1.2:
                aspect_score = -80
            else:
                aspect_score = 10
        else:
            aspect_score = 0

        # Area ratio scoring
        if 0.10 <= area_ratio <= 0.70:
            area_score = 100
        elif 0.08 <= area_ratio < 0.10 or 0.70 < area_ratio <= 0.80:
            area_score = 30
        elif area_ratio > 0.80:
            area_score = -400  # Too large, definitely capturing background
        else:
            area_score = -100  # Too small

        # Convexity check
        hull_area = cv2.contourArea(cv2.convexHull(contour))
        if hull_area > 0:
            solidity = area / hull_area
            if solidity > 0.96:
                solidity_score = 50
            elif solidity > 0.90:
                solidity_score = 20
            else:
                solidity_score = -60
        else:
            solidity_score = 0

        # Total score
        score = margin_score + rect_score + aspect_score + area_score + solidity_score

        return {
            "score": score,
            "area_ratio": area_ratio,
            "angle_error": angle_error,
            "min_margin": min_margin,
            "rectangularity": rectangularity,
            "margin_score": margin_score,
            "rect_score": rect_score,
            "area_score": area_score,
        }

    def detect_document(self, image: np.ndarray, debug: bool = False) -> Optional[np.ndarray]:
        """
        Document detection with strict margin filtering and multi-method approach

        Args:
            image: Input image (BGR)
            debug: Print debug information

        Returns:
            Detected corners as numpy array (4, 1, 2) or None
        """
        candidates = []
        orig_shape = image.shape[:2]

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (7, 7), 0)

        # Method 1: Canny edge detection with strict filtering
        for low, high in [(45, 125), (55, 160), (70, 200)]:
            edges = cv2.Canny(blurred, low, high)
            # Dilate to close small gaps
            edges = cv2.dilate(edges, np.ones((5, 5)), iterations=2)
            edges = cv2.erode(edges, np.ones((2, 2)), iterations=1)

            contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

            for c in contours:
                area = cv2.contourArea(c)
                if self.min_area < area < image.shape[0] * image.shape[1] * 0.75:
                    peri = cv2.arcLength(c, True)
                    for epsilon in [0.015, 0.020, 0.028]:
                        approx = cv2.approxPolyDP(c, epsilon * peri, True)
                        if len(approx) == 4:
                            candidates.append((approx.reshape(4, 2), "Canny", area))

        # Method 2: Adaptive thresholding
        adaptive = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 17, 5
        )
        adaptive = cv2.morphologyEx(adaptive, cv2.MORPH_CLOSE, np.ones((7, 7)), iterations=2)

        contours, _ = cv2.findContours(adaptive, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            area = cv2.contourArea(c)
            if self.min_area < area < image.shape[0] * image.shape[1] * 0.75:
                peri = cv2.arcLength(c, True)
                for epsilon in [0.020, 0.028, 0.038]:
                    approx = cv2.approxPolyDP(c, epsilon * peri, True)
                    if len(approx) == 4:
                        candidates.append((approx.reshape(4, 2), "Adaptive", area))

        if not candidates:
            if debug:
                print("⚠️ No valid contours found")
            return None

        # Score all candidates
        scored = []
        for quad, method, area in candidates:
            scores = self.score_contour(quad.reshape(4, 1, 2), orig_shape)
            scored.append((quad, method, scores["score"], scores))

        # Sort by score
        scored.sort(key=lambda x: x[2], reverse=True)

        if debug and len(scored) > 0:
            best = scored[0]
            print(f"✅ Document detected (score: {best[2]:.1f})")
            print(f"   Margin: {best[3]['min_margin']:.3f}")
            print(f"   Area ratio: {best[3]['area_ratio']:.3f}")
            print(f"   Angle error: {best[3]['angle_error']:.1f}°")

        # Return best candidate if acceptable score
        if scored[0][2] > 50:
            return scored[0][0].astype("int32").reshape(4, 1, 2)

        return None

    def refine_document_corners(
        self, image: np.ndarray, corners: np.ndarray, inset_pixels: int = 15
    ) -> np.ndarray:
        """
        Refine detected corners by moving them inward to avoid shadow boundaries.
        This accounts for lighting gradients at document edges.

        Args:
            image: Input image
            corners: Detected corner points
            inset_pixels: Number of pixels to move corners inward

        Returns:
            Refined corner points
        """
        if corners is None or len(corners) != 4:
            return corners

        corners = corners.reshape(4, 2).astype(np.float32)

        # Calculate center of document
        center = corners.mean(axis=0)

        # Move each corner slightly toward center to account for shadows
        refined = corners.copy()
        for i in range(4):
            direction = center - corners[i]
            norm = np.linalg.norm(direction)
            if norm > 0:
                # Move inward by inset_pixels pixels
                direction = direction / norm
                refined[i] = corners[i] + direction * inset_pixels

        return refined.astype(np.int32)

    def detect_document_refined(
        self, image: np.ndarray, debug: bool = False, inset: int = 12
    ) -> Optional[np.ndarray]:
        """
        Document detection with corner refinement

        Args:
            image: Input image (BGR)
            debug: Print debug information
            inset: Inset pixels for corner refinement

        Returns:
            Refined corners as numpy array (4, 1, 2) or None
        """
        detected = self.detect_document(image, debug=debug)

        if detected is not None:
            detected_clean = detected.reshape(4, 2)
            refined = self.refine_document_corners(image, detected_clean, inset_pixels=inset)

            if debug:
                print(f"   Corners refined (inset: {inset}px)")

            return refined.reshape(4, 1, 2).astype("int32")

        return None

    def detect_document_borders(self, image: np.ndarray) -> Dict:
        """
        Detect document borders and corner points using improved detection

        Args:
            image: Input image (BGR)

        Returns:
            Dict with border data and visualization info
        """
        try:
            # Use improved detection with corner refinement
            document_contour = self.detect_document_refined(image, debug=False, inset=12)

            if document_contour is None:
                return {"success": False, "message": "No document detected", "corners": []}

            # Extract corners
            corners = document_contour.reshape(4, 2)

            # Order corners
            corners = self._order_corners(corners)

            # Normalize corners to percentage coordinates (0-100)
            height, width = image.shape[:2]
            normalized_corners = self._normalize_corners(corners, width, height)

            # Calculate area
            contour_area = cv2.contourArea(document_contour)

            return {
                "success": True,
                "message": "Document detected",
                "corners": normalized_corners,  # Normalized [0-100]
                "pixel_corners": corners.tolist(),  # Pixel coordinates
                "contour_area": float(contour_area),
                "image_area": float(width * height),
                "coverage": float(contour_area / (width * height) * 100),
            }

        except Exception as e:
            return {"success": False, "message": f"Detection error: {str(e)}", "corners": []}

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
            corner_names = ["top-left", "top-right", "bottom-right", "bottom-left"]

            normalized.append(
                {
                    "id": i,
                    "name": corner_names[i],
                    "x": x_norm,
                    "y": y_norm,
                    "pixel_x": int(corner[0]),
                    "pixel_y": int(corner[1]),
                }
            )

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

        if not detection_result["success"] or not detection_result["corners"]:
            return overlay

        # Draw border lines
        corners = detection_result["corners"]
        pixel_corners = []

        for corner in corners:
            x = int((corner["x"] / 100) * width)
            y = int((corner["y"] / 100) * height)
            pixel_corners.append([x, y])

        pixel_corners = np.array(pixel_corners, dtype=np.int32)

        # Draw polygon border
        cv2.polylines(overlay, [pixel_corners], True, (0, 255, 0), 3)

        # Draw corner points with labels
        for i, corner in enumerate(corners):
            x = int((corner["x"] / 100) * width)
            y = int((corner["y"] / 100) * height)

            # Draw circle at corner
            cv2.circle(overlay, (x, y), 8, (0, 255, 0), -1)
            cv2.circle(overlay, (x, y), 8, (255, 255, 255), 2)

            # Draw corner label
            label_text = corner["name"]
            cv2.putText(
                overlay, label_text, (x + 15, y - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2
            )

        # Draw coverage info
        coverage = detection_result.get("coverage", 0)
        coverage_text = f"Coverage: {coverage:.1f}%"
        cv2.putText(overlay, coverage_text, (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

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
        return {"success": False, "message": f"Error: {str(e)}", "corners": []}


if __name__ == "__main__":
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
        cv2.imshow("Document Detection", overlay)
        cv2.waitKey(0)
        cv2.destroyAllWindows()


print("✅ Document detection module loaded (improved v3)")
