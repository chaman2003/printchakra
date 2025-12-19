"""
PrintChakra Backend - Document Routes

Routes for document management including file serving,
thumbnails, and document info.
"""

import os
import io
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory, send_file, current_app
from app.core.config import get_data_dirs
from app.core.middleware.cors import create_options_response, add_cors_headers

document_bp = Blueprint('document', __name__)


# =============================================================================
# FILE SERVING ENDPOINTS
# =============================================================================

@document_bp.route("/processed/<filename>", methods=["GET", "OPTIONS"])
def get_processed_file(filename):
    """Serve processed image file with CORS headers and caching support."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    
    try:
        file_path = os.path.join(PROCESSED_DIR, filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        
        response = send_from_directory(PROCESSED_DIR, filename)
        response = add_cors_headers(response)
        
        # Add cache headers
        response.headers["Cache-Control"] = "public, max-age=3600"
        
        return response
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_bp.route("/uploads/<filename>", methods=["GET", "OPTIONS"])
def get_upload_file(filename):
    """Serve uploaded (preview) image file with CORS headers."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        
        response = send_from_directory(UPLOAD_DIR, filename)
        response = add_cors_headers(response)
        
        return response
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# THUMBNAIL ENDPOINTS
# =============================================================================

@document_bp.route("/thumbnail/<path:filename>", methods=["GET", "OPTIONS"])
def get_thumbnail(filename):
    """Generate and serve thumbnail images for documents and PDFs."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    
    try:
        # Find the file
        file_path = None
        for search_dir in [PROCESSED_DIR, CONVERTED_DIR]:
            candidate = os.path.join(search_dir, filename)
            if os.path.exists(candidate):
                file_path = candidate
                break
        
        if not file_path:
            return jsonify({"error": "File not found"}), 404
        
        # Generate thumbnail
        from app.features.document.services.thumbnail_service import ThumbnailService
        
        service = ThumbnailService()
        thumbnail_data = service.generate_thumbnail(file_path)
        
        if thumbnail_data:
            response = send_file(
                io.BytesIO(thumbnail_data),
                mimetype='image/jpeg',
                as_attachment=False
            )
            response = add_cors_headers(response)
            response.headers["Cache-Control"] = "public, max-age=3600"
            return response
        else:
            return jsonify({"error": "Failed to generate thumbnail"}), 500
    
    except Exception as e:
        current_app.logger.error(f"Thumbnail error: {e}")
        return jsonify({"error": str(e)}), 500


# =============================================================================
# DOCUMENT INFO ENDPOINTS
# =============================================================================

@document_bp.route("/info/<path:filename>", methods=["GET", "OPTIONS"])
def get_document_info(filename):
    """Get document information including page count for PDFs."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    
    try:
        # Find the file
        file_path = None
        for search_dir in [PROCESSED_DIR, CONVERTED_DIR]:
            candidate = os.path.join(search_dir, filename)
            if os.path.exists(candidate):
                file_path = candidate
                break
        
        if not file_path:
            return jsonify({"error": "File not found"}), 404
        
        # Get file stats
        stat = os.stat(file_path)
        
        info = {
            "filename": filename,
            "size": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        }
        
        # If PDF, get page count
        if filename.lower().endswith('.pdf'):
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(file_path)
                info["page_count"] = len(reader.pages)
                info["type"] = "pdf"
            except Exception as e:
                current_app.logger.warning(f"Could not read PDF: {e}")
                info["type"] = "pdf"
                info["page_count"] = None
        else:
            info["type"] = "image"
            # Get image dimensions
            try:
                from PIL import Image
                with Image.open(file_path) as img:
                    info["width"] = img.width
                    info["height"] = img.height
            except:
                pass
        
        return jsonify(info)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_bp.route("/page/<path:filename>/<int:page_num>", methods=["GET", "OPTIONS"])
def get_pdf_page(filename, page_num):
    """Generate and serve thumbnail for a specific PDF page."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    
    try:
        # Find the file
        file_path = None
        for search_dir in [PROCESSED_DIR, CONVERTED_DIR]:
            candidate = os.path.join(search_dir, filename)
            if os.path.exists(candidate):
                file_path = candidate
                break
        
        if not file_path or not filename.lower().endswith('.pdf'):
            return jsonify({"error": "PDF not found"}), 404
        
        # Generate page thumbnail
        from app.features.document.services.thumbnail_service import ThumbnailService
        
        service = ThumbnailService()
        page_data = service.generate_pdf_page_thumbnail(file_path, page_num)
        
        if page_data:
            response = send_file(
                io.BytesIO(page_data),
                mimetype='image/jpeg',
                as_attachment=False
            )
            response = add_cors_headers(response)
            return response
        else:
            return jsonify({"error": "Failed to generate page thumbnail"}), 500
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# DELETE ENDPOINTS
# =============================================================================

@document_bp.route("/delete/<filename>", methods=["DELETE", "OPTIONS"])
def delete_file(filename):
    """Delete a processed file and its associated text."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    TEXT_DIR = dirs['TEXT_DIR']
    OCR_DATA_DIR = dirs['OCR_DATA_DIR']
    
    try:
        deleted_files = []
        
        # Delete processed file
        processed_path = os.path.join(PROCESSED_DIR, filename)
        if os.path.exists(processed_path):
            os.remove(processed_path)
            deleted_files.append(f"processed/{filename}")
        
        # Delete associated text file
        text_filename = f"{os.path.splitext(filename)[0]}.txt"
        text_path = os.path.join(TEXT_DIR, text_filename)
        if os.path.exists(text_path):
            os.remove(text_path)
            deleted_files.append(f"text/{text_filename}")
        
        # Delete OCR result
        ocr_filename = f"{os.path.splitext(filename)[0]}.json"
        ocr_path = os.path.join(OCR_DATA_DIR, ocr_filename)
        if os.path.exists(ocr_path):
            os.remove(ocr_path)
            deleted_files.append(f"ocr/{ocr_filename}")
        
        # Emit socket event
        try:
            from app.core import socketio
            socketio.emit("file_deleted", {"filename": filename})
        except:
            pass
        
        return jsonify({
            "success": True,
            "message": f"Deleted {len(deleted_files)} file(s)",
            "deleted": deleted_files,
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# CONVERSION ENDPOINTS
# =============================================================================

@document_bp.route("/convert", methods=["POST", "OPTIONS"])
def convert_files():
    """Convert files to different formats (PDF, etc.)."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        filenames = data.get("files", [])
        target_format = data.get("format", "pdf")
        merge = data.get("merge", True)
        output_name = data.get("output_name", "converted")
        
        if not filenames:
            return jsonify({"error": "No files specified"}), 400
        
        from app.features.document.services.conversion_service import ConversionService
        
        service = ConversionService()
        result = service.convert_files(
            filenames=filenames,
            target_format=target_format,
            merge=merge,
            output_name=output_name
        )
        
        return jsonify(result)
    
    except Exception as e:
        current_app.logger.error(f"Conversion error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/converted/<path:filename>", methods=["GET", "OPTIONS"])
def serve_converted(filename):
    """Serve converted files."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    
    try:
        response = send_from_directory(CONVERTED_DIR, filename)
        response = add_cors_headers(response)
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 404


@document_bp.route("/converted", methods=["GET", "OPTIONS"])
def list_converted():
    """List converted files."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    
    try:
        files = []
        if os.path.exists(CONVERTED_DIR):
            for filename in os.listdir(CONVERTED_DIR):
                file_path = os.path.join(CONVERTED_DIR, filename)
                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    files.append({
                        "filename": filename,
                        "size": stat.st_size,
                        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    })
        
        files.sort(key=lambda x: x["created"], reverse=True)
        
        return jsonify({"files": files, "count": len(files)})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
