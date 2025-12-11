"""
Utility Module - Helper Functions
Geometric transformations, image loading, and corner ordering from notebook
"""

import os
from typing import List, Optional, Tuple

import cv2
import numpy as np


def load_or_create_sample(image_path: str = "image.jpg") -> np.ndarray:
    """
    Load image or create synthetic sample for testing

    Args:
        image_path: Path to image file

    Returns:
        Loaded image as numpy array
    """
    if os.path.exists(image_path):
        img = cv2.imread(image_path)
        if img is not None:
            print(f"✅ Loaded: {image_path} ({img.shape[1]}x{img.shape[0]})")
            return img

    print("📝 Creating sample document...")
    sample = np.ones((800, 600, 3), dtype=np.uint8) * 240
    pts = np.array([[100, 150], [500, 120], [520, 650], [80, 680]], dtype=np.int32)
    cv2.fillPoly(sample, [pts], (255, 255, 255))

    for y in range(200, 400, 40):
        cv2.rectangle(sample, (150, y), (450, y + 15), (30, 30, 30), -1)

    cv2.polylines(sample, [pts], True, (0, 0, 0), 5)
    os.makedirs("backend", exist_ok=True)
    cv2.imwrite("backend/sample_doc.jpg", sample)
    return sample


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Sort quadrilateral corners in consistent order:
    top-left, top-right, bottom-right, bottom-left

    Args:
        pts: Array of 4 corner points

    Returns:
        Ordered points as float32 array
    """
    # Calculate center
    center = pts.mean(axis=0)

    # Calculate angles from center
    angles = np.arctan2(pts[:, 1] - center[1], pts[:, 0] - center[0])

    # Sort by angle (counter-clockwise from right)
    sorted_indices = np.argsort(angles)
    sorted_pts = pts[sorted_indices]

    # Reorder to start from top-left: find the point with minimum (x + y)
    sums = sorted_pts.sum(axis=1)
    min_sum_idx = np.argmin(sums)

    # Rotate array to start from top-left
    ordered = np.roll(sorted_pts, -min_sum_idx, axis=0)
    return ordered.astype("float32")


def four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """
    Apply perspective correction via homography (bird's-eye view transform)

    Args:
        image: Input image
        pts: Array of 4 corner points

    Returns:
        Perspective-corrected image
    """
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Calculate width of new image
    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = max(int(widthA), int(widthB))

    # Calculate height of new image
    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = max(int(heightA), int(heightB))

    # Destination points for perspective transform
    dst = np.array(
        [[0, 0], [maxWidth - 1, 0], [maxWidth - 1, maxHeight - 1], [0, maxHeight - 1]],
        dtype="float32",
    )

    # Calculate perspective transform matrix and apply it
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))

    return warped


def load_image(image_path: str) -> Optional[np.ndarray]:
    """
    Load image from file path

    Args:
        image_path: Path to image file

    Returns:
        Loaded image or None if failed
    """
    if not os.path.exists(image_path):
        print(f"⚠️ Image file not found: {image_path}")
        return None

    img = cv2.imread(image_path)
    if img is None:
        print(f"⚠️ Failed to load image: {image_path}")
        return None

    return img


def save_image(image: np.ndarray, output_path: str, quality: int = 95) -> bool:
    """
    Save image to file with specified quality

    Args:
        image: Image to save
        output_path: Output file path
        quality: JPEG quality (0-100)

    Returns:
        True if successful, False otherwise
    """
    try:
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Save with quality parameter
        success = cv2.imwrite(output_path, image, [cv2.IMWRITE_JPEG_QUALITY, quality])

        if success:
            file_size = os.path.getsize(output_path) / 1024
            print(f"✅ Saved: {output_path} ({file_size:.1f} KB)")

        return success
    except Exception as e:
        print(f"⚠️ Failed to save image: {str(e)}")
        return False


def get_image_info(image: np.ndarray) -> dict:
    """
    Get basic information about an image

    Args:
        image: Input image

    Returns:
        Dictionary with image info
    """
    if image is None:
        return {}

    info = {
        "shape": image.shape,
        "height": image.shape[0],
        "width": image.shape[1],
        "channels": image.shape[2] if len(image.shape) == 3 else 1,
        "dtype": str(image.dtype),
        "size_mb": image.nbytes / (1024 * 1024),
    }

    return info


print("[OK] Utility module loaded")
