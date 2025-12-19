"""
PrintChakra Backend - OCR Routes

Routes for OCR (Optical Character Recognition) operations.
"""

import os
import traceback
from flask import Blueprint, request, jsonify, current_app
from app.core.config import get_data_dirs
from app.core.middleware.cors import create_options_response

ocr_bp = Blueprint('ocr', __name__)


# =============================================================================
# SINGLE FILE OCR ENDPOINTS
# =============================================================================

@ocr_bp.route("/<path:filename>", methods=["POST", "OPTIONS"])
def run_ocr(filename):
    """
    Run PaddleOCR on a processed image.
    
    Returns structured OCR results with bounding boxes and derived title.
    Notifies frontend via Socket.IO on completion.
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    OCR_DATA_DIR = dirs['OCR_DATA_DIR']
    
    try:
        from app.features.document.ocr.paddle_ocr_service import PaddleOCRService
        
        # Security: prevent directory traversal
        if ".." in filename:
            return jsonify({"error": "Invalid filename"}), 400
        
        # Find the image file
        image_path = os.path.join(PROCESSED_DIR, filename)
        if not os.path.exists(image_path):
            # Try uploads directory
            image_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(image_path):
            return jsonify({"error": f"File not found: {filename}"}), 404
        
        current_app.logger.info(f"OCR PROCESSING: {filename}")
        
        # Get or create OCR service
        service = PaddleOCRService(OCR_DATA_DIR)
        
        # Run OCR
        result = service.process_image(image_path)
        
        # Save result
        service.save_result(filename, result)
        
        # Prepare response
        response_data = {
            "success": True,
            "filename": filename,
            "ocr_result": result.to_dict(),
            "ocr_ready": True,
        }
        
        current_app.logger.info(
            f"OCR complete: {result.word_count} words, "
            f"{len(result.raw_results)} regions, "
            f"{result.processing_time_ms:.0f}ms"
        )
        
        # Notify frontend via Socket.IO
        try:
            from app.core import socketio
            socketio.emit("ocr_complete", {
                "filename": filename,
                "success": True,
                "result": result.to_dict(),
                "derived_title": result.derived_title,
                "word_count": result.word_count,
                "confidence": result.confidence_avg,
                "has_text": result.word_count > 0,
            })
        except Exception as socket_error:
            current_app.logger.warning(f"Socket.IO emit failed: {socket_error}")
        
        return jsonify(response_data)
    
    except Exception as e:
        error_msg = f"OCR error: {str(e)}"
        current_app.logger.error(error_msg)
        traceback.print_exc()
        return jsonify({"success": False, "error": error_msg}), 500


@ocr_bp.route("/<path:filename>", methods=["GET"])
def get_ocr_result(filename):
    """
    Get existing OCR result for a file.
    Returns cached result if available.
    """
    dirs = get_data_dirs()
    OCR_DATA_DIR = dirs['OCR_DATA_DIR']
    
    try:
        from app.features.document.ocr.paddle_ocr_service import PaddleOCRService
        
        # Security: prevent directory traversal
        if ".." in filename:
            return jsonify({"error": "Invalid filename"}), 400
        
        # Get OCR service
        service = PaddleOCRService(OCR_DATA_DIR)
        
        # Check if OCR result exists
        result = service.load_result(filename)
        
        if result:
            return jsonify({
                "success": True,
                "filename": filename,
                "ocr_result": result,
                "ocr_ready": True,
            })
        else:
            return jsonify({
                "success": True,
                "filename": filename,
                "ocr_result": None,
                "ocr_ready": False,
            })
    
    except Exception as e:
        error_msg = f"Error fetching OCR result: {str(e)}"
        current_app.logger.error(error_msg)
        return jsonify({"success": False, "error": error_msg}), 500


# =============================================================================
# OCR STATUS ENDPOINTS
# =============================================================================

@ocr_bp.route("/status/<path:filename>", methods=["GET"])
def get_ocr_status(filename):
    """Quick check if OCR has been run on a file."""
    dirs = get_data_dirs()
    OCR_DATA_DIR = dirs['OCR_DATA_DIR']
    
    try:
        from app.features.document.ocr.paddle_ocr_service import PaddleOCRService
        
        if ".." in filename:
            return jsonify({"error": "Invalid filename"}), 400
        
        service = PaddleOCRService(OCR_DATA_DIR)
        has_ocr = service.has_ocr_result(filename)
        
        return jsonify({
            "filename": filename,
            "ocr_ready": has_ocr,
        })
    
    except Exception as e:
        return jsonify({"filename": filename, "ocr_ready": False})


@ocr_bp.route("/batch-status", methods=["POST", "OPTIONS"])
def get_batch_ocr_status():
    """Check OCR status for multiple files at once."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    OCR_DATA_DIR = dirs['OCR_DATA_DIR']
    
    try:
        from app.features.document.ocr.paddle_ocr_service import PaddleOCRService
        
        data = request.get_json() or {}
        filenames = data.get("filenames", [])
        
        service = PaddleOCRService(OCR_DATA_DIR)
        
        statuses = {}
        for filename in filenames:
            if ".." not in filename:
                has_ocr = service.has_ocr_result(filename)
                status_info = {"has_ocr": has_ocr}
                
                # If OCR exists, try to get the derived title
                if has_ocr:
                    try:
                        result = service.load_result(filename)
                        if result and isinstance(result, dict) and result.get("derived_title"):
                            status_info["derived_title"] = result["derived_title"]
                    except:
                        pass
                
                statuses[filename] = status_info
        
        return jsonify({"success": True, "statuses": statuses})
    
    except Exception as e:
        return jsonify({"success": False, "statuses": {}, "error": str(e)})


# =============================================================================
# BATCH OCR PROCESSING
# =============================================================================

@ocr_bp.route("/batch", methods=["POST", "OPTIONS"])
def run_batch_ocr():
    """
    Run OCR on multiple files.
    Processes files sequentially and emits progress updates.
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    OCR_DATA_DIR = dirs['OCR_DATA_DIR']
    
    try:
        from app.features.document.ocr.paddle_ocr_service import PaddleOCRService
        
        data = request.get_json() or {}
        filenames = data.get("filenames", [])
        force = data.get("force", False)  # Force re-run even if exists
        
        if not filenames:
            return jsonify({"error": "No filenames provided"}), 400
        
        service = PaddleOCRService(OCR_DATA_DIR)
        
        results = {
            "success": True,
            "processed": [],
            "skipped": [],
            "errors": [],
            "total": len(filenames)
        }
        
        for i, filename in enumerate(filenames):
            try:
                # Check for existing result
                if not force and service.has_ocr_result(filename):
                    results["skipped"].append(filename)
                    continue
                
                # Find file
                image_path = os.path.join(PROCESSED_DIR, filename)
                if not os.path.exists(image_path):
                    image_path = os.path.join(UPLOAD_DIR, filename)
                
                if not os.path.exists(image_path):
                    results["errors"].append({
                        "filename": filename,
                        "error": "File not found"
                    })
                    continue
                
                # Process OCR
                result = service.process_image(image_path)
                service.save_result(filename, result)
                
                results["processed"].append({
                    "filename": filename,
                    "word_count": result.word_count,
                    "derived_title": result.derived_title
                })
                
                # Emit progress
                try:
                    from app.core import socketio
                    socketio.emit("ocr_batch_progress", {
                        "current": i + 1,
                        "total": len(filenames),
                        "filename": filename,
                        "success": True
                    })
                except:
                    pass
            
            except Exception as e:
                results["errors"].append({
                    "filename": filename,
                    "error": str(e)
                })
        
        # Emit completion
        try:
            from app.core import socketio
            socketio.emit("ocr_batch_complete", {
                "processed": len(results["processed"]),
                "skipped": len(results["skipped"]),
                "errors": len(results["errors"]),
                "total": len(filenames)
            })
        except:
            pass
        
        return jsonify(results)
    
    except Exception as e:
        current_app.logger.error(f"Batch OCR error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# OCR TEXT ENDPOINTS
# =============================================================================

@ocr_bp.route("/text/<path:filename>", methods=["GET"])
def get_ocr_text(filename):
    """Get plain text extracted by OCR."""
    dirs = get_data_dirs()
    OCR_DATA_DIR = dirs['OCR_DATA_DIR']
    
    try:
        from app.features.document.ocr.paddle_ocr_service import PaddleOCRService
        
        if ".." in filename:
            return jsonify({"error": "Invalid filename"}), 400
        
        service = PaddleOCRService(OCR_DATA_DIR)
        result = service.load_result(filename)
        
        if result:
            # Extract text from result
            text = result.get("full_text", "") if isinstance(result, dict) else ""
            return jsonify({
                "success": True,
                "filename": filename,
                "text": text,
                "word_count": len(text.split()) if text else 0
            })
        else:
            return jsonify({
                "success": False,
                "filename": filename,
                "text": "",
                "error": "No OCR result found"
            })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
