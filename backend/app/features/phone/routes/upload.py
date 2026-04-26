"""
PrintChakra Backend - Phone Upload Routes

File upload endpoints from phone.
"""

import os
import logging
import shutil
import threading
from datetime import datetime
from flask import jsonify, request
from werkzeug.utils import secure_filename
from app.features.phone.routes import phone_bp
from app.core.middleware.cors import create_options_response
from app.core.config import get_data_dirs
from app.core import socketio

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf", "doc", "docx", "txt"}
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "bmp", "tiff", "webp"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def allowed_file(filename):
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _emit_progress_with_filename(filename, progress_data):
    """Emit processing progress and always include filename."""
    payload = {
        "filename": filename,
        **progress_data,
    }
    socketio.emit("processing_progress", payload)


def _run_pipeline_async(
    filename,
    upload_path,
    processed_path,
    text_path,
    enhancement_params,
):
    """Run 12-step processing pipeline + OCR in background and emit live events."""
    try:
        from app.modules.pipeline.enhanced import EnhancedDocumentPipeline

        pipeline = EnhancedDocumentPipeline(
            storage_dir=os.path.dirname(processed_path),
            emit_callback=lambda data: _emit_progress_with_filename(filename, data),
        )

        success, extracted_text, stats = pipeline.process_complete_pipeline(
            input_path=upload_path,
            output_path=processed_path,
            enhancement_params=enhancement_params,
        )

        if not success:
            error_msg = extracted_text or "Pipeline failed"
            socketio.emit("processing_error", {"filename": filename, "error": error_msg})
            logger.error(f"Pipeline failed for {filename}: {error_msg}")
            return

        has_text = bool(extracted_text and extracted_text.strip())
        if has_text:
            os.makedirs(os.path.dirname(text_path), exist_ok=True)
            with open(text_path, "w", encoding="utf-8") as f:
                f.write(extracted_text)

        socketio.emit(
            "processing_complete",
            {
                "filename": filename,
                "has_text": has_text,
                "source": "phone",
                "pipeline": "enhanced_12_step",
                "stats": {
                    "total_steps": stats.get("total_steps", 12),
                    "success": stats.get("success", True),
                },
            },
        )

        logger.info(f"[OK] 12-step processing complete for {filename} (has_text={has_text})")

    except Exception as e:
        logger.error(f"Background pipeline error for {filename}: {e}")
        socketio.emit("processing_error", {"filename": filename, "error": str(e)})


@phone_bp.route("/upload", methods=["POST", "OPTIONS"])
def upload_file():
    """Upload a file from phone."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        if "file" not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        
        file = request.files["file"]
        
        if file.filename == "":
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "error": f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400

        content_length = request.content_length or 0
        if content_length > MAX_FILE_SIZE:
            return jsonify({"success": False, "error": "File too large (max 50MB)"}), 413
        
        # Secure the filename
        filename = secure_filename(file.filename)
        ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
        
        dirs = get_data_dirs()
        upload_folder = dirs["UPLOAD_DIR"]
        processed_folder = dirs["PROCESSED_DIR"]

        # Ensure folders exist
        os.makedirs(upload_folder, exist_ok=True)
        os.makedirs(processed_folder, exist_ok=True)
        
        # Generate unique filename
        import uuid
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(upload_folder, unique_filename)
        processed_path = os.path.join(processed_folder, unique_filename)
        text_path = os.path.join(dirs["TEXT_DIR"], f"{os.path.splitext(unique_filename)[0]}.txt")
        
        # Save file
        file.save(filepath)
        file_size = os.path.getsize(filepath)

        # Notify dashboard immediately that a new file started processing.
        socketio.emit("new_file", {
            "filename": unique_filename,
            "timestamp": datetime.now().isoformat(),
            "processing": True,
            "source": "phone"
        })

        if ext in IMAGE_EXTENSIONS:
            _emit_progress_with_filename(
                unique_filename,
                {
                    "step": 0,
                    "total_steps": 12,
                    "stage_name": "Queued",
                    "message": "Starting 12-step processing",
                },
            )

            enhancement_params = {
                "brightness_boost": int(request.form.get("brightness_boost", 25)),
                "equalization_strength": float(request.form.get("equalization_strength", 0.4)),
                "clahe_clip_limit": float(request.form.get("clahe_clip_limit", 2.0)),
                "clahe_tile_size": int(request.form.get("clahe_tile_size", 8)),
            }

            thread = threading.Thread(
                target=_run_pipeline_async,
                args=(
                    unique_filename,
                    filepath,
                    processed_path,
                    text_path,
                    enhancement_params,
                ),
                daemon=True,
            )
            thread.start()
            processing_mode = "enhanced_12_step"
        else:
            # Non-image files are copied directly so they still appear in dashboard.
            shutil.copy2(filepath, processed_path)
            socketio.emit(
                "processing_complete",
                {
                    "filename": unique_filename,
                    "has_text": False,
                    "source": "phone",
                    "pipeline": "direct_copy",
                },
            )
            processing_mode = "direct_copy"
        
        logger.info(f"[OK] File uploaded: {unique_filename} ({file_size} bytes)")
        
        return jsonify({
            "success": True,
            "filename": unique_filename,
            "original_name": filename,
            "size": file_size,
            "path": filepath,
            "processed_path": processed_path,
            "processing": True,
            "pipeline": processing_mode
        })
    
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@phone_bp.route("/upload/multiple", methods=["POST", "OPTIONS"])
def upload_multiple_files():
    """Upload multiple files from phone."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        if "files" not in request.files:
            return jsonify({"success": False, "error": "No files provided"}), 400
        
        files = request.files.getlist("files")
        
        if not files:
            return jsonify({"success": False, "error": "No files selected"}), 400
        
        uploaded = []
        errors = []
        
        dirs = get_data_dirs()
        upload_folder = dirs["UPLOAD_DIR"]
        processed_folder = dirs["PROCESSED_DIR"]

        os.makedirs(upload_folder, exist_ok=True)
        os.makedirs(processed_folder, exist_ok=True)
        
        import uuid
        
        for file in files:
            if file.filename == "":
                continue
            
            if not allowed_file(file.filename):
                errors.append({
                    "filename": file.filename,
                    "error": "File type not allowed"
                })
                continue
            
            try:
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                filepath = os.path.join(upload_folder, unique_filename)
                
                file.save(filepath)
                file_size = os.path.getsize(filepath)

                processed_path = os.path.join(processed_folder, unique_filename)
                shutil.copy2(filepath, processed_path)

                socketio.emit("new_file", {
                    "filename": unique_filename,
                    "processing": False,
                    "source": "phone"
                })

                socketio.emit("processing_complete", {
                    "filename": unique_filename,
                    "has_text": False,
                    "source": "phone"
                })
                
                uploaded.append({
                    "filename": unique_filename,
                    "original_name": filename,
                    "size": file_size
                })
            
            except Exception as e:
                errors.append({
                    "filename": file.filename,
                    "error": str(e)
                })
        
        logger.info(f"[OK] Uploaded {len(uploaded)} files, {len(errors)} errors")
        
        return jsonify({
            "success": True,
            "uploaded": uploaded,
            "errors": errors,
            "total_uploaded": len(uploaded),
            "total_errors": len(errors)
        })
    
    except Exception as e:
        logger.error(f"Multiple upload error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@phone_bp.route("/upload/status/<filename>", methods=["GET", "OPTIONS"])
def get_upload_status(filename):
    """Get status of an uploaded file."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        dirs = get_data_dirs()
        filepath = os.path.join(dirs["UPLOAD_DIR"], secure_filename(filename))
        
        if not os.path.exists(filepath):
            return jsonify({
                "success": False,
                "error": "File not found"
            }), 404
        
        return jsonify({
            "success": True,
            "filename": filename,
            "exists": True,
            "size": os.path.getsize(filepath),
            "modified": os.path.getmtime(filepath)
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
