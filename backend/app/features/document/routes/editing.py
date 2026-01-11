"""
PrintChakra Backend - Image Editing Routes

Crop, rotate, brightness/contrast adjustment endpoints for dashboard.
"""

import os
import logging
import uuid
from flask import jsonify, request
from werkzeug.utils import secure_filename
from app.features.document.routes import document_bp
from app.core.config import get_data_dirs
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


def _find_file(filename):
    """Find a file across data directories."""
    dirs = get_data_dirs()
    safe = secure_filename(filename)
    if not safe:
        return None

    for key in ["PROCESSED_DIR", "UPLOAD_DIR", "CONVERTED_DIR"]:
        d = dirs.get(key)
        if d:
            # Check root
            path = os.path.join(d, safe)
            if os.path.exists(path):
                return path
            # Check subfolders
            if os.path.exists(d):
                for entry in os.listdir(d):
                    sub = os.path.join(d, entry)
                    if os.path.isdir(sub):
                        path = os.path.join(sub, safe)
                        if os.path.exists(path):
                            return path
    return None


@document_bp.route("/edit/crop", methods=["POST", "OPTIONS"])
def crop_image():
    """Crop an image to specified rectangle. Expects JSON: {filename, x, y, width, height, save_as_new?}"""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        import cv2
        import numpy as np

        data = request.get_json()
        if not data or "filename" not in data:
            return jsonify({"success": False, "error": "filename required"}), 400

        path = _find_file(data["filename"])
        if not path:
            return jsonify({"success": False, "error": "File not found"}), 404

        x = int(data.get("x", 0))
        y = int(data.get("y", 0))
        w = int(data.get("width", 0))
        h = int(data.get("height", 0))

        if w <= 0 or h <= 0:
            return jsonify({"success": False, "error": "Invalid crop dimensions"}), 400

        img = cv2.imread(path)
        if img is None:
            return jsonify({"success": False, "error": "Could not read image"}), 400

        ih, iw = img.shape[:2]
        # Clamp to image bounds
        x = max(0, min(x, iw - 1))
        y = max(0, min(y, ih - 1))
        w = min(w, iw - x)
        h = min(h, ih - y)

        cropped = img[y:y+h, x:x+w]

        if data.get("save_as_new"):
            ext = os.path.splitext(path)[1]
            new_name = f"cropped_{uuid.uuid4().hex[:8]}{ext}"
            out_path = os.path.join(os.path.dirname(path), new_name)
            cv2.imwrite(out_path, cropped)
            logger.info(f"[OK] Image cropped as new file: {new_name}")
            return jsonify({"success": True, "filename": new_name})
        else:
            cv2.imwrite(path, cropped)
            logger.info(f"[OK] Image cropped in place: {data['filename']}")
            return jsonify({"success": True, "filename": data["filename"]})

    except Exception as e:
        logger.error(f"Crop error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/edit/rotate", methods=["POST", "OPTIONS"])
def rotate_image():
    """Rotate an image. Expects JSON: {filename, angle (90, 180, 270)}"""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        import cv2

        data = request.get_json()
        if not data or "filename" not in data:
            return jsonify({"success": False, "error": "filename required"}), 400

        path = _find_file(data["filename"])
        if not path:
            return jsonify({"success": False, "error": "File not found"}), 404

        angle = int(data.get("angle", 90))
        if angle not in [90, 180, 270]:
            return jsonify({"success": False, "error": "angle must be 90, 180, or 270"}), 400

        img = cv2.imread(path)
        if img is None:
            return jsonify({"success": False, "error": "Could not read image"}), 400

        rot_map = {90: cv2.ROTATE_90_CLOCKWISE, 180: cv2.ROTATE_180, 270: cv2.ROTATE_90_COUNTERCLOCKWISE}
        rotated = cv2.rotate(img, rot_map[angle])
        cv2.imwrite(path, rotated)

        logger.info(f"[OK] Image rotated {angle}°: {data['filename']}")
        return jsonify({"success": True, "filename": data["filename"], "angle": angle})

    except Exception as e:
        logger.error(f"Rotate error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/edit/adjust", methods=["POST", "OPTIONS"])
def adjust_image():
    """Adjust brightness/contrast. Expects JSON: {filename, brightness (-100 to 100), contrast (0.5 to 3.0)}"""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        import cv2
        import numpy as np

        data = request.get_json()
        if not data or "filename" not in data:
            return jsonify({"success": False, "error": "filename required"}), 400

        path = _find_file(data["filename"])
        if not path:
            return jsonify({"success": False, "error": "File not found"}), 404

        brightness = float(data.get("brightness", 0))
        contrast = float(data.get("contrast", 1.0))

        brightness = max(-100, min(100, brightness))
        contrast = max(0.5, min(3.0, contrast))

        img = cv2.imread(path)
        if img is None:
            return jsonify({"success": False, "error": "Could not read image"}), 400

        adjusted = cv2.convertScaleAbs(img, alpha=contrast, beta=brightness)
        cv2.imwrite(path, adjusted)

        logger.info(f"[OK] Image adjusted (b={brightness}, c={contrast}): {data['filename']}")
        return jsonify({"success": True, "filename": data["filename"]})

    except Exception as e:
        logger.error(f"Adjust error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/edit/enhance", methods=["POST", "OPTIONS"])
def enhance_image():
    """Run the document enhancement pipeline (shadow removal + contrast). Matches notebook steps 8-11."""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        import cv2
        import numpy as np

        data = request.get_json()
        if not data or "filename" not in data:
            return jsonify({"success": False, "error": "filename required"}), 400

        path = _find_file(data["filename"])
        if not path:
            return jsonify({"success": False, "error": "File not found"}), 404

        img = cv2.imread(path)
        if img is None:
            return jsonify({"success": False, "error": "Could not read image"}), 400

        # Convert to grayscale for background estimation (notebook step 8)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # Downscale for background estimation
        max_dim = 800
        bg_scale = min(max_dim / max(h, w), 1.0)
        if bg_scale < 1.0:
            small = cv2.resize(gray, (int(w * bg_scale), int(h * bg_scale)))
        else:
            small = gray

        # Morphological background estimation (notebook step 9)
        sh, sw = small.shape
        k = max(sh, sw) // 8
        k = k if k % 2 == 1 else k + 1
        k = max(31, min(k, 127))

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
        bg_raw = cv2.morphologyEx(small, cv2.MORPH_CLOSE, kernel)

        # Smooth and upscale (notebook step 10)
        bg_smoothed = cv2.GaussianBlur(bg_raw, (k, k), 0)
        if bg_scale < 1.0:
            bg = cv2.resize(bg_smoothed, (w, h), interpolation=cv2.INTER_LINEAR)
            bg = cv2.GaussianBlur(bg, (31, 31), 0)
        else:
            bg = bg_smoothed

        # Shadow removal (notebook step 11)
        result = np.zeros_like(gray, dtype=np.float32)
        mask = bg > 10
        result[mask] = (gray[mask].astype(np.float32) / bg[mask].astype(np.float32)) * 255
        result = np.clip(result, 0, 255).astype(np.uint8)

        # Convert back to BGR for saving
        enhanced = cv2.cvtColor(result, cv2.COLOR_GRAY2BGR)

        if data.get("save_as_new"):
            ext = os.path.splitext(path)[1]
            new_name = f"enhanced_{uuid.uuid4().hex[:8]}{ext}"
            out_path = os.path.join(os.path.dirname(path), new_name)
            cv2.imwrite(out_path, enhanced)
            logger.info(f"[OK] Image enhanced as new: {new_name}")
            return jsonify({"success": True, "filename": new_name})
        else:
            cv2.imwrite(path, enhanced)
            logger.info(f"[OK] Image enhanced in place: {data['filename']}")
            return jsonify({"success": True, "filename": data["filename"]})

    except Exception as e:
        logger.error(f"Enhance error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
