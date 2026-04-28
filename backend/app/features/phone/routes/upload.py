"""Phone upload routes wired to standalone phone->dashboard flow."""

import logging
import os

from flask import jsonify, request
from werkzeug.utils import secure_filename

from app.core.config import get_data_dirs
from app.core.middleware.cors import create_options_response
from app.features.phone.routes import phone_bp
from app.features.phone.upload.phone_to_dashboard_flow import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    PhoneToDashboardFlow,
    allowed_file,
    parse_enhancement_params,
)

logger = logging.getLogger(__name__)


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
        
        flow = PhoneToDashboardFlow(source="phone")
        artifact = flow.store_upload(file)
        flow.emit_new_file(artifact, processing=True)
        processing_mode = flow.start_processing(artifact, parse_enhancement_params(request.form))

        logger.info("[OK] File uploaded: %s (%s bytes)", artifact.filename, artifact.size)
        return jsonify(
            {
                "success": True,
                "filename": artifact.filename,
                "original_name": artifact.original_name,
                "size": artifact.size,
                "path": artifact.upload_path,
                "processed_path": artifact.processed_path,
                "processing": True,
                "pipeline": processing_mode,
            }
        )
    
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
        flow = PhoneToDashboardFlow(source="phone")
        
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
                artifact = flow.store_upload(file)
                flow.emit_new_file(artifact, processing=True)
                flow.start_processing(artifact, {})
                uploaded.append(
                    {
                        "filename": artifact.filename,
                        "original_name": artifact.original_name,
                        "size": artifact.size,
                        "processing": artifact.is_image,
                    }
                )
            
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
