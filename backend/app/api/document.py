"""
Document API endpoints for uploading, loading, listing, and managing documents.
"""

import os
import io
import uuid
import threading
import traceback
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from PIL import Image

# Create Blueprint
document_bp = Blueprint('document', __name__)


def get_dirs():
    """Get directory paths from app config"""
    from flask import current_app
    config = current_app.config
    return {
        'UPLOAD_DIR': config.get('UPLOAD_DIR'),
        'PROCESSED_DIR': config.get('PROCESSED_DIR'),
        'TEXT_DIR': config.get('TEXT_DIR'),
        'PDF_DIR': config.get('PDF_DIR'),
        'CONVERTED_DIR': config.get('CONVERTED_DIR'),
        'DATA_DIR': config.get('DATA_DIR'),
        'POPPLER_PATH': config.get('POPPLER_PATH'),
    }


def get_socketio():
    """Get socketio instance from app"""
    from flask import current_app
    return current_app.extensions.get('socketio')


def get_processing_funcs():
    """Get processing status functions from app"""
    from flask import current_app
    return {
        'update': current_app.config.get('update_processing_status'),
        'get': current_app.config.get('get_processing_status'),
        'clear': current_app.config.get('clear_processing_status'),
        'processing_status': current_app.config.get('processing_status'),
    }


def get_doc_pipeline():
    """Get document pipeline from app"""
    from flask import current_app
    return current_app.config.get('doc_pipeline')


def get_process_document_image():
    """Get process_document_image function from app"""
    from flask import current_app
    return current_app.config.get('process_document_image')


# ============================================================================
# DOCUMENT UPLOAD ENDPOINT
# ============================================================================

@document_bp.route("/upload", methods=["POST"])
def upload_file():
    """
    Handle image upload - returns immediately with upload info, processes in background
    Expects: multipart/form-data with 'file' or 'photo' field
    """
    dirs = get_dirs()
    socketio = get_socketio()
    funcs = get_processing_funcs()
    process_document_image = get_process_document_image()
    
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    TEXT_DIR = dirs['TEXT_DIR']
    update_processing_status = funcs['update']
    clear_processing_status = funcs['clear']
    
    try:
        # Accept both 'file' and 'photo' field names
        file = request.files.get("file") or request.files.get("photo")

        if not file:
            print("[ERROR] Upload error: No file in request")
            return jsonify({"error": "No file provided", "success": False}), 400

        if file.filename == "":
            print("[ERROR] Upload error: Empty filename")
            return jsonify({"error": "Empty filename", "success": False}), 400

        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        original_ext = os.path.splitext(file.filename)[1]
        if not original_ext:
            original_ext = ".jpg"
        filename = f"doc_{timestamp}_{unique_id}{original_ext}"
        processed_filename = f"processed_{filename}"

        print(f"\n{'='*70}")
        print(f"[UPLOAD] UPLOAD INITIATED")
        print(f"  Filename: {filename}")
        print(f"  Size: {len(file.read())} bytes")
        file.seek(0)  # Reset file pointer
        print(f"{'='*70}")

        # Step 1: Save uploaded file immediately
        print("\n[UPLOAD] Saving uploaded file...")
        upload_path = os.path.join(UPLOAD_DIR, filename)
        file.save(upload_path)
        print(f"  [OK] File saved: {upload_path}")

        # Validate file exists and is readable
        if not os.path.exists(upload_path):
            error_msg = "File upload failed - file not found on disk"
            print(f"  [ERROR] {error_msg}")
            return jsonify({"error": error_msg, "success": False}), 500

        file_size = os.path.getsize(upload_path)
        print(f"  ✓ Verified on disk: {file_size} bytes")

        # Initialize processing status
        if update_processing_status:
            update_processing_status(processed_filename, 0, 12, "Initializing", is_complete=False)

        # Return immediately with upload info
        response = {
            "status": "uploaded",
            "success": True,
            "message": "File uploaded successfully, processing started",
            "filename": processed_filename,
            "upload_filename": filename,
            "original": file.filename,
            "timestamp": timestamp,
            "processing": True,
        }

        # Emit Socket.IO event for instant display
        try:
            if socketio:
                socketio.emit(
                    "new_file",
                    {
                        "filename": processed_filename,
                        "upload_filename": filename,
                        "timestamp": timestamp,
                        "processing": True,
                        "has_text": False,
                    },
                )
                print(f"  ✓ Socket.IO notification sent for instant display")
        except Exception as socket_error:
            print(f"  [WARN] Warning: Socket.IO notification failed: {str(socket_error)}")

        # Start background processing
        def background_process():
            try:
                processed_path = os.path.join(PROCESSED_DIR, processed_filename)

                # Process image with progress tracking
                # Returns: (success, text, new_filename_or_none)
                if process_document_image:
                    result = process_document_image(
                        upload_path,
                        processed_path,
                        processed_filename,  # Pass filename for status tracking
                    )
                    # Handle both old (2-tuple) and new (3-tuple) return formats
                    if len(result) == 3:
                        success, text_or_error, new_filename = result
                    else:
                        success, text_or_error = result
                        new_filename = None
                else:
                    # Fallback: just copy file
                    import shutil
                    shutil.copy2(upload_path, processed_path)
                    success = True
                    text_or_error = ""
                    new_filename = None

                # Use renamed filename if available
                final_filename = new_filename if new_filename else processed_filename

                if not success:
                    if update_processing_status:
                        update_processing_status(
                            processed_filename, 12, 12, "Error", is_complete=True, error=text_or_error
                        )
                    if socketio:
                        socketio.emit(
                            "processing_error", {"filename": processed_filename, "error": text_or_error}
                        )
                    return

                # Save extracted text (only if not already saved by process_document_image)
                text_filename = f"{os.path.splitext(final_filename)[0]}.txt"
                text_path = os.path.join(TEXT_DIR, text_filename)

                if not os.path.exists(text_path) and text_or_error:
                    try:
                        with open(text_path, "w", encoding="utf-8") as f:
                            f.write(text_or_error)
                        print(f"  ✓ Text saved: {text_path}")
                    except Exception as text_error:
                        print(f"  [WARN] Warning: Failed to save text file: {str(text_error)}")

                # Mark as complete - clear the original filename's status
                if update_processing_status:
                    update_processing_status(processed_filename, 12, 12, "Complete", is_complete=True)
                
                # Clear the status immediately for renamed files to avoid confusion
                if new_filename and clear_processing_status:
                    clear_processing_status(processed_filename)

                # Notify completion with the final filename (might be OCR-renamed)
                if socketio:
                    socketio.emit(
                        "processing_complete",
                        {
                            "filename": final_filename,
                            "original_filename": processed_filename if new_filename else None,
                            "renamed": new_filename is not None,
                            "has_text": len(text_or_error) > 0 if isinstance(text_or_error, str) else False,
                            "text_length": len(text_or_error) if isinstance(text_or_error, str) else 0,
                        },
                    )

                print(f"\n[OK] Background processing completed for {final_filename}")
                if new_filename:
                    print(f"    (OCR-renamed from {processed_filename})")

                # Clear status after 60 seconds (for non-renamed files)
                if not new_filename and clear_processing_status:
                    threading.Timer(60.0, lambda: clear_processing_status(processed_filename)).start()

            except Exception as e:
                error_msg = f"Background processing error: {str(e)}"
                print(f"[ERROR] {error_msg}")
                if update_processing_status:
                    update_processing_status(
                        processed_filename, 12, 12, "Error", is_complete=True, error=error_msg
                    )
                if socketio:
                    socketio.emit(
                        "processing_error", {"filename": processed_filename, "error": error_msg}
                    )

        # Start processing in background thread
        thread = threading.Thread(target=background_process)
        thread.daemon = True
        thread.start()

        print(f"\n[OK] Upload response sent, processing started in background")
        return jsonify(response)

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"\n[ERROR] {error_msg}")
        traceback.print_exc()
        return jsonify({"error": error_msg, "success": False}), 500


# ============================================================================
# FILE LISTING ENDPOINT
# ============================================================================

@document_bp.route("/files")
def list_files():
    """List all processed files with processing status"""
    dirs = get_dirs()
    funcs = get_processing_funcs()
    
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    TEXT_DIR = dirs['TEXT_DIR']
    get_processing_status = funcs['get']
    processing_status = funcs['processing_status'] or {}
    clear_processing_status = funcs['clear']
    
    try:
        files = []
        processed_files_set = set()

        # First, get list of all actual processed files on disk
        for filename in os.listdir(PROCESSED_DIR):
            if filename.lower().endswith((".png", ".jpg", ".jpeg")):
                processed_files_set.add(filename)

        # Add files that are currently being processed (uploaded but not yet in processed dir)
        # Only include if the file is NOT already in processed dir (handles rename case)
        for filename in list(processing_status.keys()):
            status = get_processing_status(filename) if get_processing_status else None
            if status and not status["is_complete"]:
                # Skip if a processed file already exists with this name
                if filename in processed_files_set:
                    # Clear stale processing status
                    if clear_processing_status:
                        clear_processing_status(filename)
                    continue
                    
                # Get the upload filename (without "processed_" prefix)
                upload_filename = filename.replace("processed_", "")
                upload_path = os.path.join(UPLOAD_DIR, upload_filename)

                if os.path.exists(upload_path):
                    file_stat = os.stat(upload_path)
                    files.append(
                        {
                            "filename": filename,
                            "size": file_stat.st_size,
                            "created": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                            "has_text": False,
                            "processing": True,
                            "processing_step": status["step"],
                            "processing_total": status["total_steps"],
                            "processing_stage": status["stage_name"],
                        }
                    )
                else:
                    # Upload file doesn't exist and processed file doesn't exist - stale status
                    if clear_processing_status:
                        clear_processing_status(filename)

        # Then add all processed files
        for filename in processed_files_set:
            file_path = os.path.join(PROCESSED_DIR, filename)
            # Verify file still exists (it may have been deleted)
            if not os.path.exists(file_path):
                print(f"[WARN] File listed but doesn't exist: {file_path}")
                continue
            file_stat = os.stat(file_path)

            # Check if text file exists
            text_filename = f"{os.path.splitext(filename)[0]}.txt"
            text_path = os.path.join(TEXT_DIR, text_filename)
            has_text = os.path.exists(text_path)

            # Processed files that exist on disk are NOT processing anymore
            # The only exception is if the file was just created and processing is still running
            # but in that case, the processing status should be marked complete
            file_info = {
                "filename": filename,
                "size": file_stat.st_size,
                "created": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                "has_text": has_text,
                "processing": False,  # File exists on disk = processing is done
            }

            files.append(file_info)

        # Sort by creation time (newest first)
        files.sort(key=lambda x: x["created"], reverse=True)

        return jsonify({"files": files, "count": len(files)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PROCESSING STATUS ENDPOINT
# ============================================================================

@document_bp.route("/processing-status/<filename>")
def get_file_processing_status(filename):
    """Get processing statu s for a specific file"""
    funcs = get_processing_funcs()
    get_processing_status = funcs['get']
    
    try:
        status = get_processing_status(filename) if get_processing_status else None
        if status:
            return jsonify(
                {
                    "processing": not status["is_complete"],
                    "step": status["step"],
                    "total_steps": status["total_steps"],
                    "stage_name": status["stage_name"],
                    "is_complete": status["is_complete"],
                    "error": status.get("error"),
                    "timestamp": status["timestamp"],
                }
            )
        else:
            # No processing status - file either complete or doesn't exist
            return jsonify({"processing": False, "is_complete": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# FILE SERVING ENDPOINTS
# ============================================================================

@document_bp.route("/processed/<filename>", methods=["GET", "OPTIONS"])
def get_processed_file(filename):
    """Serve processed image file with CORS headers and caching support"""
    dirs = get_dirs()
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    
    # Handle OPTIONS request
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, ngrok-skip-browser-warning"
        )
        response.headers["Access-Control-Max-Age"] = "3600"
        return response, 200

    try:
        # Security: prevent directory traversal
        if ".." in filename or "/" in filename:
            return jsonify({"error": "Invalid filename"}), 400

        # Check if file exists
        file_path = os.path.join(PROCESSED_DIR, filename)
        if not os.path.exists(file_path):
            print(f"[ERROR] File not found: {file_path}")
            return jsonify({"error": "File not found"}), 404

        print(f"[OK] Serving processed file: {filename}")
        response = send_from_directory(PROCESSED_DIR, filename)

        # Add comprehensive CORS and cache headers
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, ngrok-skip-browser-warning"
        )
        response.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Type"
        response.headers["Cache-Control"] = "public, max-age=3600"
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Detect image type from extension
        if filename.lower().endswith(".png"):
            response.headers["Content-Type"] = "image/png"
        elif filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
            response.headers["Content-Type"] = "image/jpeg"
        else:
            response.headers["Content-Type"] = "image/jpeg"  # Default to JPEG

        return response
    except Exception as e:
        print(f"[ERROR] File serving error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"File serving error: {str(e)}"}), 500


@document_bp.route("/uploads/<filename>", methods=["GET", "OPTIONS"])
def get_upload_file(filename):
    """Serve uploaded (preview) image file with CORS headers"""
    dirs = get_dirs()
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    
    # Handle OPTIONS request
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, ngrok-skip-browser-warning"
        )
        response.headers["Access-Control-Max-Age"] = "3600"
        return response, 200

    try:
        # Security: prevent directory traversal
        if ".." in filename or "/" in filename:
            return jsonify({"error": "Invalid filename"}), 400

        # Remove "processed_" prefix if present to get upload filename
        upload_filename = filename.replace("processed_", "")

        # Check if file exists
        file_path = os.path.join(UPLOAD_DIR, upload_filename)
        if not os.path.exists(file_path):
            print(f"[ERROR] Upload file not found: {file_path}")
            return jsonify({"error": "File not found"}), 404

        print(f"[OK] Serving upload file: {upload_filename}")
        response = send_from_directory(UPLOAD_DIR, upload_filename)

        # Add comprehensive CORS headers
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, ngrok-skip-browser-warning"
        )
        response.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Type"
        response.headers["Cache-Control"] = "public, max-age=300"  # 5 min cache for previews
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Detect image type from extension
        if upload_filename.lower().endswith(".png"):
            response.headers["Content-Type"] = "image/png"
        elif upload_filename.lower().endswith(".jpg") or upload_filename.lower().endswith(".jpeg"):
            response.headers["Content-Type"] = "image/jpeg"
        else:
            response.headers["Content-Type"] = "image/jpeg"  # Default to JPEG

        return response
    except Exception as e:
        print(f"[ERROR] Upload file serving error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"File serving error: {str(e)}"}), 500


# ============================================================================
# DOCUMENT INFO ENDPOINTS
# ============================================================================

@document_bp.route("/document/info/<path:filename>", methods=["GET", "OPTIONS"])
def get_document_info(filename):
    """Get document information including page count for PDFs"""
    dirs = get_dirs()
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, ngrok-skip-browser-warning"
        )
        response.headers["Access-Control-Max-Age"] = "3600"
        return response, 200

    try:
        # Security: prevent directory traversal
        if ".." in filename or "/" in filename.replace("\\", "/"):
            return jsonify({"error": "Invalid filename"}), 400

        # Check different directories for the file
        possible_paths = [
            os.path.join(PROCESSED_DIR, filename),
            os.path.join(CONVERTED_DIR, filename),
            os.path.join(UPLOAD_DIR, filename),
        ]

        file_path = None
        for path in possible_paths:
            if os.path.exists(path):
                file_path = path
                break

        if not file_path:
            return jsonify({"error": "File not found"}), 404

        file_ext = os.path.splitext(filename)[1].lower()
        doc_info = {
            "filename": filename,
            "file_type": file_ext[1:] if file_ext else "unknown",
            "pages": []
        }

        # Get page count and thumbnails for PDFs
        if file_ext == '.pdf':
            try:
                import PyPDF2
                with open(file_path, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    page_count = len(pdf_reader.pages)
                    
                    # Generate page info with thumbnail URLs
                    for page_num in range(1, page_count + 1):
                        doc_info["pages"].append({
                            "pageNumber": page_num,
                            "thumbnailUrl": f"/document/page/{filename}/{page_num}"
                        })
            except Exception as e:
                print(f"[WARN] Error reading PDF pages: {str(e)}")
                # Fallback: assume single page
                doc_info["pages"] = [{
                    "pageNumber": 1,
                    "thumbnailUrl": f"/thumbnail/{filename}"
                }]
        else:
            # For images, single page
            doc_info["pages"] = [{
                "pageNumber": 1,
                "thumbnailUrl": f"/thumbnail/{filename}"
            }]

        response = jsonify(doc_info)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Cache-Control"] = "public, max-age=3600"
        return response

    except Exception as e:
        print(f"[ERROR] Document info error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Document info error: {str(e)}"}), 500


@document_bp.route("/document/page/<path:filename>/<int:page_num>", methods=["GET", "OPTIONS"])
def get_pdf_page_thumbnail(filename, page_num):
    """Generate and serve thumbnail for a specific PDF page"""
    dirs = get_dirs()
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    POPPLER_PATH = dirs['POPPLER_PATH']
    
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, ngrok-skip-browser-warning"
        )
        response.headers["Access-Control-Max-Age"] = "3600"
        return response, 200

    try:
        # Security: prevent directory traversal
        if ".." in filename or "/" in filename.replace("\\", "/"):
            return jsonify({"error": "Invalid filename"}), 400

        # Check different directories for the file
        possible_paths = [
            os.path.join(PROCESSED_DIR, filename),
            os.path.join(CONVERTED_DIR, filename),
            os.path.join(UPLOAD_DIR, filename),
        ]

        file_path = None
        for path in possible_paths:
            if os.path.exists(path):
                file_path = path
                break

        if not file_path:
            return jsonify({"error": "File not found"}), 404

        file_ext = os.path.splitext(filename)[1].lower()
        
        if file_ext != '.pdf':
            return jsonify({"error": "Not a PDF file"}), 400

        # Generate thumbnail for specific page
        try:
            from pdf2image import convert_from_path
            images = convert_from_path(
                file_path, 
                first_page=page_num, 
                last_page=page_num, 
                dpi=150,  # Higher DPI for better quality
                poppler_path=POPPLER_PATH
            )
            
            if images:
                img = images[0]
                # Resize to larger thumbnail for preview
                img.thumbnail((800, 1132), Image.Resampling.LANCZOS)  # A4 ratio
                
                # Convert to bytes
                thumb_io = io.BytesIO()
                img.save(thumb_io, format='JPEG', quality=90)
                thumbnail_data = thumb_io.getvalue()
                
                response = current_app.response_class(
                    response=thumbnail_data,
                    status=200,
                    mimetype="image/jpeg"
                )
                response.headers["Access-Control-Allow-Origin"] = "*"
                response.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
                response.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Type"
                response.headers["Cache-Control"] = "public, max-age=86400"
                response.headers["Content-Type"] = "image/jpeg"
                return response
            else:
                return jsonify({"error": "Could not extract page"}), 500
                
        except ImportError:
            return jsonify({"error": "pdf2image not available"}), 500
        except Exception as e:
            print(f"[ERROR] PDF page extraction error: {str(e)}")
            return jsonify({"error": f"Page extraction error: {str(e)}"}), 500

    except Exception as e:
        print(f"[ERROR] PDF page thumbnail error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Page thumbnail error: {str(e)}"}), 500


# ============================================================================
# THUMBNAIL ENDPOINT
# ============================================================================

@document_bp.route("/thumbnail/<path:filename>", methods=["GET", "OPTIONS"])
def get_thumbnail(filename):
    """Generate and serve thumbnail images for documents and PDFs"""
    dirs = get_dirs()
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    POPPLER_PATH = dirs['POPPLER_PATH']
    
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, ngrok-skip-browser-warning"
        )
        response.headers["Access-Control-Max-Age"] = "3600"
        return response, 200

    try:
        # Security: prevent directory traversal
        if ".." in filename or "/" in filename.replace("\\", "/"):
            return jsonify({"error": "Invalid filename"}), 400

        # Check different directories for the file
        possible_paths = [
            os.path.join(PROCESSED_DIR, filename),  # Processed images
            os.path.join(CONVERTED_DIR, filename),  # Converted PDFs
            os.path.join(UPLOAD_DIR, filename),     # Uploaded files
        ]

        file_path = None
        for path in possible_paths:
            if os.path.exists(path):
                file_path = path
                break

        if not file_path:
            print(f"[ERROR] Thumbnail source file not found: {filename}")
            return jsonify({"error": "File not found"}), 404

        # Generate thumbnail based on file type
        file_ext = os.path.splitext(filename)[1].lower()
        thumbnail_data = None

        try:
            if file_ext in ['.pdf']:
                # For PDFs, try to convert first page to image using pdf2image or similar
                try:
                    from pdf2image import convert_from_path
                    images = convert_from_path(file_path, first_page=1, last_page=1, dpi=100, poppler_path=POPPLER_PATH)
                    if images:
                        img = images[0]
                        # Resize to thumbnail size
                        img.thumbnail((200, 250), Image.Resampling.LANCZOS)
                        # Convert to bytes
                        thumb_io = io.BytesIO()
                        img.save(thumb_io, format='JPEG', quality=85)
                        thumbnail_data = thumb_io.getvalue()
                except ImportError:
                    # Fallback: return a placeholder
                    print(f"[WARN] pdf2image not available, using placeholder for {filename}")
                    placeholder = Image.new('RGB', (200, 250), color=(100, 100, 100))
                    thumb_io = io.BytesIO()
                    placeholder.save(thumb_io, format='JPEG', quality=85)
                    thumbnail_data = thumb_io.getvalue()

            elif file_ext in ['.png', '.jpg', '.jpeg', '.bmp', '.gif']:
                # For image files, read and resize
                img = Image.open(file_path)
                # Convert RGBA to RGB if needed
                if img.mode == 'RGBA':
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    rgb_img.paste(img, mask=img.split()[3])
                    img = rgb_img
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Resize to thumbnail size while maintaining aspect ratio
                img.thumbnail((200, 250), Image.Resampling.LANCZOS)
                # Convert to bytes
                thumb_io = io.BytesIO()
                img.save(thumb_io, format='JPEG', quality=85)
                thumbnail_data = thumb_io.getvalue()

            elif file_ext in ['.txt']:
                # For text files, create a text-based thumbnail
                text_preview = Image.new('RGB', (200, 250), color=(255, 255, 255))
                thumb_io = io.BytesIO()
                text_preview.save(thumb_io, format='JPEG', quality=85)
                thumbnail_data = thumb_io.getvalue()

            else:
                # Unknown file type, return placeholder
                placeholder = Image.new('RGB', (200, 250), color=(200, 200, 200))
                thumb_io = io.BytesIO()
                placeholder.save(thumb_io, format='JPEG', quality=85)
                thumbnail_data = thumb_io.getvalue()

        except Exception as e:
            print(f"[WARN] Error generating thumbnail: {str(e)}")
            # Return a gray placeholder on error
            placeholder = Image.new('RGB', (200, 250), color=(180, 180, 180))
            thumb_io = io.BytesIO()
            placeholder.save(thumb_io, format='JPEG', quality=85)
            thumbnail_data = thumb_io.getvalue()

        if thumbnail_data:
            response = current_app.response_class(
                response=thumbnail_data,
                status=200,
                mimetype="image/jpeg"
            )
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
            response.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Type"
            response.headers["Cache-Control"] = "public, max-age=86400"
            response.headers["Content-Type"] = "image/jpeg"
            return response

        return jsonify({"error": "Failed to generate thumbnail"}), 500

    except Exception as e:
        print(f"[ERROR] Thumbnail generation error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Thumbnail generation error: {str(e)}"}), 500


# ============================================================================
# DELETE ENDPOINTS
# ============================================================================

@document_bp.route("/delete/<filename>", methods=["DELETE"])
def delete_file(filename):
    """Delete a processed file and its associated text"""
    dirs = get_dirs()
    socketio = get_socketio()
    
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    TEXT_DIR = dirs['TEXT_DIR']
    
    try:
        # Delete image file
        image_path = os.path.join(PROCESSED_DIR, filename)
        if os.path.exists(image_path):
            os.remove(image_path)

        # Delete text file
        text_filename = f"{os.path.splitext(filename)[0]}.txt"
        text_path = os.path.join(TEXT_DIR, text_filename)
        if os.path.exists(text_path):
            os.remove(text_path)

        # Delete original upload if exists
        original_filename = filename.replace("processed_", "")
        upload_path = os.path.join(UPLOAD_DIR, original_filename)
        if os.path.exists(upload_path):
            os.remove(upload_path)

        # Notify via Socket.IO
        if socketio:
            socketio.emit("file_deleted", {"filename": filename})

        return jsonify({"status": "success", "message": f"File {filename} deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# OCR TEXT ENDPOINT
# ============================================================================

@document_bp.route("/ocr/<filename>")
def get_ocr_text(filename):
    """Get extracted OCR text for a file"""
    dirs = get_dirs()
    TEXT_DIR = dirs['TEXT_DIR']
    
    try:
        text_filename = f"{os.path.splitext(filename)[0]}.txt"
        text_path = os.path.join(TEXT_DIR, text_filename)

        if os.path.exists(text_path):
            with open(text_path, "r", encoding="utf-8") as f:
                text = f.read()
            return jsonify({"filename": filename, "text": text, "length": len(text)})
        else:
            return jsonify({"filename": filename, "text": "", "message": "No text extracted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PDF EXPORT ENDPOINTS
# ============================================================================

@document_bp.route("/export/pdf", methods=["POST"])
def export_pdf():
    """
    Export processed images to PDF
    Expects: JSON with 'filenames' array and optional 'page_size'
    """
    dirs = get_dirs()
    doc_pipeline = get_doc_pipeline()
    
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    PDF_DIR = dirs['PDF_DIR']
    
    if doc_pipeline is None:
        return jsonify({"error": "PDF export not available"}), 503

    try:
        data = request.get_json()
        filenames = data.get("filenames", [])
        page_size = data.get("page_size", "A4")

        if not filenames:
            return jsonify({"error": "No filenames provided"}), 400

        # Build full paths
        image_paths = [os.path.join(PROCESSED_DIR, f) for f in filenames]

        # Validate all files exist
        for path in image_paths:
            if not os.path.exists(path):
                return jsonify({"error": f"File not found: {os.path.basename(path)}"}), 404

        # Generate PDF filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        pdf_filename = f"document_{timestamp}.pdf"
        pdf_path = os.path.join(PDF_DIR, pdf_filename)

        # Export to PDF
        success = doc_pipeline.exporter.export_to_pdf(image_paths, pdf_path, page_size=page_size)

        if success:
            return jsonify(
                {"success": True, "pdf_filename": pdf_filename, "pdf_url": f"/pdf/{pdf_filename}"}
            )
        else:
            return jsonify({"success": False, "error": "PDF generation failed"}), 500

    except Exception as e:
        print(f"PDF export error: {e}")
        return jsonify({"error": str(e)}), 500


@document_bp.route("/pdf/<filename>")
def serve_pdf(filename):
    """Serve generated PDF files"""
    dirs = get_dirs()
    PDF_DIR = dirs['PDF_DIR']
    return send_from_directory(PDF_DIR, filename)


# ============================================================================
# FILE CONVERSION ENDPOINTS
# ============================================================================

@document_bp.route("/convert", methods=["POST", "OPTIONS"])
def convert_files():
    """
    Convert files between formats (JPG, PNG, PDF, DOCX)
    Supports batch conversion
    """
    dirs = get_dirs()
    socketio = get_socketio()
    
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    DATA_DIR = dirs['DATA_DIR']
    
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, ngrok-skip-browser-warning"
        )
        response.headers["Access-Control-Max-Age"] = "3600"
        return response, 200

    try:
        from app.modules.document import ExportModule
        from app.modules.document.converter import FileConverter

        data = request.get_json()
        files = data.get("files", [])
        target_format = data.get("format", "pdf").lower()
        merge_pdf = data.get("merge_pdf", False)  # New option for merging PDFs
        custom_filename = data.get("filename", "").strip()  # New option for custom filename

        if not files:
            return jsonify({"success": False, "error": "No files provided"}), 400

        # Use FileConverter to validate supported formats
        if not FileConverter.is_supported_format(target_format):
            return (
                jsonify({"success": False, "error": f"Unsupported target format: {target_format}"}),
                400,
            )

        # Create converted directory if it doesn't exist
        converted_dir = os.path.join(DATA_DIR, "converted")
        os.makedirs(converted_dir, exist_ok=True)

        # Resolve full paths using the correct DATA_DIR
        input_paths = [os.path.join(PROCESSED_DIR, f) for f in files]

        # Validate files exist
        missing_files = [f for f, p in zip(files, input_paths) if not os.path.exists(p)]
        if missing_files:
            print(f"[ERROR] Missing files: {missing_files}")
            print(f"   Looking in: {PROCESSED_DIR}")
            return (
                jsonify(
                    {"success": False, "error": f'Files not found: {", ".join(missing_files)}'}
                ),
                404,
            )

        print(f"✓ Files validated successfully")
        print(f"✓ Processed dir: {PROCESSED_DIR}")

        print(f"\n{'='*70}")
        print(f"📁 FILE CONVERSION STARTED")
        print(f"{'='*70}")
        print(f"  Files: {len(files)}")
        print(f"  Target format: {target_format.upper()}")
        print(f"  Merge PDF: {merge_pdf}")

        # Check if merging to single PDF
        if merge_pdf and target_format == "pdf":
            # Generate merged PDF filename
            if custom_filename:
                # Sanitize filename - remove extension if provided, ensure .pdf extension
                base_name = os.path.splitext(custom_filename)[0]
                # Remove any potentially dangerous characters
                safe_name = "".join(c for c in base_name if c.isalnum() or c in " -_").strip()
                if not safe_name:
                    safe_name = "merged_document"
                merged_filename = f"{safe_name}.pdf"
            else:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                merged_filename = f"merged_document_{timestamp}.pdf"

            merged_path = os.path.join(converted_dir, merged_filename)

            # Merge all images into single PDF
            success, message = FileConverter.merge_images_to_pdf(input_paths, merged_path)

            print(f"\n{'='*70}")
            print(f"[OK] MERGE CONVERSION COMPLETED")
            print(f"  Status: {'Success' if success else 'Failed'}")
            print(f"{'='*70}\n")

            if success:
                results = [
                    {
                        "input": ", ".join([os.path.basename(f) for f in files]),
                        "output": merged_filename,
                        "success": True,
                        "message": message,
                    }
                ]

                # Emit Socket.IO event
                try:
                    if socketio:
                        socketio.emit(
                            "conversion_complete",
                            {"success_count": 1, "fail_count": 0, "total": len(files), "merged": True},
                        )
                except Exception as socket_error:
                    print(f"[WARN] Socket.IO emit failed: {socket_error}")

                return jsonify(
                    {
                        "success": True,
                        "results": results,
                        "success_count": 1,
                        "fail_count": 0,
                        "total": len(files),
                        "merged": True,
                        "merged_file": merged_filename,
                    }
                )
            else:
                return jsonify({"success": False, "error": message}), 500

        # Regular batch convert (separate files)
        success_count, fail_count, results = FileConverter.batch_convert(
            input_paths, converted_dir, target_format
        )

        print(f"\n{'='*70}")
        print(f"[OK] CONVERSION COMPLETED")
        print(f"  Success: {success_count}")
        print(f"  Failed: {fail_count}")
        print(f"{'='*70}\n")

        # Emit Socket.IO event for real-time update
        try:
            if socketio:
                socketio.emit(
                    "conversion_complete",
                    {"success_count": success_count, "fail_count": fail_count, "total": len(files)},
                )
        except Exception as socket_error:
            print(f"[WARN] Socket.IO emit failed: {socket_error}")

        return jsonify(
            {
                "success": True,
                "results": results,
                "success_count": success_count,
                "fail_count": fail_count,
                "total": len(files),
            }
        )

    except Exception as e:
        error_msg = f"Conversion error: {str(e)}"
        print(f"\n[ERROR] {error_msg}")
        traceback.print_exc()
        return (
            jsonify({"success": False, "error": error_msg, "traceback": traceback.format_exc()}),
            500,
        )


@document_bp.route("/converted/<path:filename>")
def serve_converted_file(filename):
    """Serve converted files"""
    dirs = get_dirs()
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    try:
        return send_from_directory(CONVERTED_DIR, filename)
    except Exception as e:
        print(f"Error serving converted file: {e}")
        return jsonify({"error": str(e)}), 404


@document_bp.route("/get-converted-files", methods=["GET"])
def get_converted_files():
    """Get list of converted files"""
    dirs = get_dirs()
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    
    try:
        if not os.path.exists(CONVERTED_DIR):
            return jsonify({"files": []})

        files = []
        for filename in os.listdir(CONVERTED_DIR):
            filepath = os.path.join(CONVERTED_DIR, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                files.append(
                    {
                        "filename": filename,
                        "size": stat.st_size,
                        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "url": f"/converted/{filename}",
                    }
                )

        # Sort by creation time (newest first)
        files.sort(key=lambda x: x["created"], reverse=True)

        return jsonify({"files": files})

    except Exception as e:
        print(f"Error listing converted files: {e}")
        return jsonify({"error": str(e)}), 500


@document_bp.route("/delete-converted/<filename>", methods=["DELETE", "OPTIONS"])
def delete_converted_file(filename):
    """Delete a converted file"""
    dirs = get_dirs()
    CONVERTED_DIR = dirs['CONVERTED_DIR']
    
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, ngrok-skip-browser-warning"
        )
        response.headers["Access-Control-Max-Age"] = "3600"
        return response, 200

    try:
        # Security: prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            return jsonify({"error": "Invalid filename"}), 400

        file_path = os.path.join(CONVERTED_DIR, filename)

        # Verify file exists and is in the converted directory
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404

        # Verify file is actually in CONVERTED_DIR (security check)
        if not os.path.abspath(file_path).startswith(os.path.abspath(CONVERTED_DIR)):
            return jsonify({"error": "Invalid file path"}), 400

        # Delete the file
        os.remove(file_path)
        print(f"[OK] Deleted converted file: {filename}")

        return jsonify({"success": True, "message": f"Successfully deleted {filename}"})

    except Exception as e:
        print(f"[ERROR] Error deleting converted file: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================================
# DOCUMENT CLASSIFICATION & DETECTION ENDPOINTS
# ============================================================================

@document_bp.route("/classify/document", methods=["POST"])
def classify_document():
    """
    Classify document type
    Expects: multipart/form-data with 'file'
    """
    dirs = get_dirs()
    doc_pipeline = get_doc_pipeline()
    
    UPLOAD_DIR = dirs['UPLOAD_DIR']
    
    if doc_pipeline is None:
        return jsonify({"error": "Document classification not available"}), 503

    if not doc_pipeline.classifier.is_trained:
        return (
            jsonify(
                {"error": "Classifier not trained", "message": "Please train the classifier first"}
            ),
            503,
        )

    try:
        import cv2
        
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file provided"}), 400

        # Save temporarily
        temp_path = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4()}.jpg")
        file.save(temp_path)

        # Read and classify
        image = cv2.imread(temp_path)
        doc_type, confidence = doc_pipeline.classifier.predict(image)

        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify(
            {
                "document_type": doc_type,
                "confidence": float(confidence),
                "all_types": doc_pipeline.classifier.DOCUMENT_TYPES,
            }
        )

    except Exception as e:
        print(f"Classification error: {e}")
        return jsonify({"error": str(e)}), 500


@document_bp.route("/detect/document", methods=["POST"])
def detect_document_borders():
    """
    Real-time document border detection
    Expects: multipart/form-data with 'file'
    Returns: Document corners in normalized coordinates [0-100]
    """
    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file provided", "success": False}), 400

        # Read file into memory
        file_bytes = file.read()

        # Check if detection is available
        try:
            from app.modules.document.detection import detect_and_serialize
            result = detect_and_serialize(file_bytes)
            return jsonify(result)
        except ImportError:
            print("[WARN] Detection not available - performing basic detection")
            return jsonify(
                {
                    "success": True,
                    "corners": [],
                    "message": "Detection service initializing",
                    "fallback": True,
                }
            )
        except Exception as detection_error:
            print(f"[ERROR] Detection error: {str(detection_error)}")
            return jsonify(
                {
                    "success": True,
                    "corners": [],
                    "message": f"Detection unavailable: {str(detection_error)}",
                    "fallback": True,
                }
            )

    except Exception as e:
        print(f"Document detection endpoint error: {str(e)}")
        return (
            jsonify({"success": True, "error": str(e), "corners": [], "fallback": True}),
            200,
        )
