"""
PrintChakra Backend - Phone Upload Routes

File upload endpoints from phone.
"""

import os
import logging
from flask import jsonify, request
from werkzeug.utils import secure_filename
from app.features.phone.routes import phone_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)

# Configure upload settings
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf", "doc", "docx", "txt"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def allowed_file(filename):
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


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
        
        # Secure the filename
        filename = secure_filename(file.filename)
        
        # Ensure upload folder exists
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Generate unique filename
        import uuid
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        # Save file
        file.save(filepath)
        
        # Get file info
        file_size = os.path.getsize(filepath)
        
        logger.info(f"[OK] File uploaded: {unique_filename} ({file_size} bytes)")
        
        return jsonify({
            "success": True,
            "filename": unique_filename,
            "original_name": filename,
            "size": file_size,
            "path": filepath
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
        
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
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
                filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
                
                file.save(filepath)
                file_size = os.path.getsize(filepath)
                
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
        filepath = os.path.join(UPLOAD_FOLDER, secure_filename(filename))
        
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
