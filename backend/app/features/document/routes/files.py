"""
PrintChakra Backend - Document File Routes

Document file management endpoints.
"""

import os
import logging
from flask import jsonify, request, send_file
from werkzeug.utils import secure_filename
from app.features.document.routes import document_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data")
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "doc", "docx", "txt", "rtf"}


def allowed_file(filename):
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@document_bp.route("/files", methods=["GET", "OPTIONS"])
def list_documents():
    """List all documents."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        documents = []
        
        # Scan uploads folder
        uploads_folder = os.path.join(DATA_DIR, "uploads")
        if os.path.exists(uploads_folder):
            for filename in os.listdir(uploads_folder):
                filepath = os.path.join(uploads_folder, filename)
                if os.path.isfile(filepath):
                    ext = os.path.splitext(filename)[1].lower()
                    documents.append({
                        "id": filename,
                        "name": filename,
                        "path": filepath,
                        "size": os.path.getsize(filepath),
                        "type": ext[1:] if ext else "unknown",
                        "modified": os.path.getmtime(filepath),
                        "folder": "uploads"
                    })
        
        # Sort by modified time, newest first
        documents.sort(key=lambda x: x["modified"], reverse=True)
        
        return jsonify({
            "success": True,
            "documents": documents,
            "total": len(documents)
        })
    
    except Exception as e:
        logger.error(f"List documents error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/files/<doc_id>", methods=["GET", "OPTIONS"])
def get_document(doc_id):
    """Get document details."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        filename = secure_filename(doc_id)
        
        # Search for document
        for folder in ["uploads", "pdfs", "processed"]:
            filepath = os.path.join(DATA_DIR, folder, filename)
            if os.path.exists(filepath):
                ext = os.path.splitext(filename)[1].lower()
                return jsonify({
                    "success": True,
                    "document": {
                        "id": filename,
                        "name": filename,
                        "path": filepath,
                        "size": os.path.getsize(filepath),
                        "type": ext[1:] if ext else "unknown",
                        "modified": os.path.getmtime(filepath),
                        "folder": folder
                    }
                })
        
        return jsonify({"success": False, "error": "Document not found"}), 404
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/files/<doc_id>/download", methods=["GET", "OPTIONS"])
def download_document(doc_id):
    """Download a document."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        filename = secure_filename(doc_id)
        
        # Search for document
        for folder in ["uploads", "pdfs", "processed", "converted"]:
            filepath = os.path.join(DATA_DIR, folder, filename)
            if os.path.exists(filepath):
                return send_file(
                    filepath,
                    as_attachment=True,
                    download_name=filename
                )
        
        return jsonify({"success": False, "error": "Document not found"}), 404
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/files/<doc_id>", methods=["DELETE", "OPTIONS"])
def delete_document(doc_id):
    """Delete a document."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        filename = secure_filename(doc_id)
        
        # Search and delete document
        for folder in ["uploads", "pdfs", "processed"]:
            filepath = os.path.join(DATA_DIR, folder, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info(f"[OK] Document deleted: {filename}")
                return jsonify({"success": True, "message": "Document deleted"})
        
        return jsonify({"success": False, "error": "Document not found"}), 404
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/upload", methods=["POST", "OPTIONS"])
def upload_document():
    """Upload a document."""
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
        
        filename = secure_filename(file.filename)
        
        # Generate unique filename
        import uuid
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        uploads_folder = os.path.join(DATA_DIR, "uploads")
        os.makedirs(uploads_folder, exist_ok=True)
        
        filepath = os.path.join(uploads_folder, unique_filename)
        file.save(filepath)
        
        file_size = os.path.getsize(filepath)
        
        logger.info(f"[OK] Document uploaded: {unique_filename}")
        
        return jsonify({
            "success": True,
            "document": {
                "id": unique_filename,
                "name": filename,
                "path": filepath,
                "size": file_size
            }
        })
    
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
