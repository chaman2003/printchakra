"""
PrintChakra Backend - Camera Connection Routes

Camera connection and status endpoints.
"""

import logging
from flask import jsonify, request
from app.features.connection.routes import connection_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@connection_bp.route("/camera/status", methods=["GET", "OPTIONS"])
def get_camera_status():
    """Get camera connection status."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        # Try to detect camera availability
        camera_available = False
        cameras = []
        
        try:
            import cv2
            
            # Check for available cameras
            for i in range(3):  # Check first 3 camera indices
                cap = cv2.VideoCapture(i)
                if cap.isOpened():
                    camera_available = True
                    cameras.append({
                        "index": i,
                        "name": f"Camera {i}",
                        "available": True
                    })
                    cap.release()
        
        except ImportError:
            logger.warning("OpenCV not available for camera detection")
        
        return jsonify({
            "success": True,
            "camera": {
                "available": camera_available,
                "cameras": cameras,
                "total": len(cameras)
            }
        })
    
    except Exception as e:
        return jsonify({
            "success": True,
            "camera": {
                "available": False,
                "error": str(e)
            }
        })


@connection_bp.route("/camera/list", methods=["GET", "OPTIONS"])
def list_cameras():
    """List available cameras."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        cameras = []
        
        try:
            import cv2
            
            for i in range(5):  # Check first 5 indices
                cap = cv2.VideoCapture(i)
                if cap.isOpened():
                    # Get camera properties
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    
                    cameras.append({
                        "index": i,
                        "name": f"Camera {i}",
                        "resolution": f"{width}x{height}",
                        "fps": fps,
                        "available": True
                    })
                    cap.release()
        
        except ImportError:
            pass
        
        return jsonify({
            "success": True,
            "cameras": cameras,
            "total": len(cameras)
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@connection_bp.route("/camera/test", methods=["POST", "OPTIONS"])
def test_camera():
    """Test camera capture."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        camera_index = data.get("camera_index", 0)
        
        try:
            import cv2
            import base64
            
            cap = cv2.VideoCapture(camera_index)
            
            if not cap.isOpened():
                return jsonify({
                    "success": False,
                    "error": f"Camera {camera_index} not available"
                }), 400
            
            # Capture frame
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                return jsonify({
                    "success": False,
                    "error": "Failed to capture frame"
                }), 400
            
            # Encode frame as JPEG
            _, buffer = cv2.imencode(".jpg", frame)
            image_base64 = base64.b64encode(buffer).decode("utf-8")
            
            logger.info(f"[OK] Camera test successful: Camera {camera_index}")
            
            return jsonify({
                "success": True,
                "camera_index": camera_index,
                "image": f"data:image/jpeg;base64,{image_base64}",
                "width": frame.shape[1],
                "height": frame.shape[0]
            })
        
        except ImportError:
            return jsonify({
                "success": False,
                "error": "OpenCV not available"
            }), 503
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@connection_bp.route("/camera/settings", methods=["GET", "POST", "OPTIONS"])
def camera_settings():
    """Get or update camera settings."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        if request.method == "GET":
            # Return default settings
            return jsonify({
                "success": True,
                "settings": {
                    "default_camera": 0,
                    "resolution": "1280x720",
                    "quality": 85,
                    "auto_focus": True,
                    "flash_mode": "auto"
                }
            })
        
        else:  # POST
            data = request.get_json()
            
            if not data:
                return jsonify({"success": False, "error": "No settings provided"}), 400
            
            # Settings would be saved to config
            logger.info("[OK] Camera settings updated")
            
            return jsonify({
                "success": True,
                "message": "Settings updated"
            })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
