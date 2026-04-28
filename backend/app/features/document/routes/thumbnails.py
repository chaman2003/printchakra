"""
PrintChakra Backend - Document Thumbnail Routes

Document thumbnail generation and retrieval endpoints.
"""

import os
import logging
import json
import time
from flask import jsonify, request, send_file
from werkzeug.utils import secure_filename
from app.features.document.routes import document_bp
from app.core.middleware.cors import create_options_response
from app.core.config import get_data_dirs

logger = logging.getLogger(__name__)
DEBUG_LOG_PATH = "C:/Users/chama/OneDrive/Desktop/printchakra-new/debug-68db5a.log"


def _debug_log(run_id, hypothesis_id, location, message, data):
    # region agent log
    try:
        payload = {
            "sessionId": "68db5a",
            "runId": run_id,
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data,
            "timestamp": int(time.time() * 1000),
        }
        with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=True) + "\n")
    except Exception:
        pass
    # endregion


@document_bp.route("/thumbnails/<doc_id>", methods=["GET", "OPTIONS"])
def get_thumbnail(doc_id):
    """Get or generate thumbnail for a document."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        filename = secure_filename(doc_id)
        dirs = get_data_dirs()
        thumbnail_dir = os.path.join(dirs["DATA_DIR"], "thumbnails")
        folder = request.args.get("folder", "").strip() or None
        
        # Get thumbnail size from query params
        size = request.args.get("size", 200, type=int)
        size = min(max(size, 50), 800)  # Clamp between 50 and 800
        
        # Check if thumbnail exists
        thumb_filename = f"{os.path.splitext(filename)[0]}_{size}.jpg"
        thumb_path = os.path.join(thumbnail_dir, thumb_filename)

        # Strict pipeline-only source: processed outputs only.
        source_candidates = []
        if folder:
            safe_folder = secure_filename(folder)
            if safe_folder:
                source_candidates.append(os.path.join(dirs["PROCESSED_DIR"], safe_folder, filename))
        source_candidates.extend(
            [
                os.path.join(dirs["PROCESSED_DIR"], filename),
            ]
        )

        source_path = next((path for path in source_candidates if os.path.exists(path)), None)
        if not source_path and os.path.isdir(dirs["PROCESSED_DIR"]):
            for entry in os.listdir(dirs["PROCESSED_DIR"]):
                subdir = os.path.join(dirs["PROCESSED_DIR"], entry)
                if not os.path.isdir(subdir):
                    continue
                nested = os.path.join(subdir, filename)
                if os.path.exists(nested):
                    source_path = nested
                    break
        
        if not source_path:
            _debug_log(
                "run1",
                "H2",
                "backend/app/features/document/routes/thumbnails.py:get_thumbnail:not_found",
                "thumbnail_source_not_found",
                {"filename": filename},
            )
            return jsonify({"success": False, "error": "Document not found"}), 404

        # Return cached thumbnail only if it is at least as new as source.
        if os.path.exists(thumb_path) and os.path.getmtime(thumb_path) >= os.path.getmtime(source_path):
            _debug_log(
                "run1",
                "H2",
                "backend/app/features/document/routes/thumbnails.py:get_thumbnail:cache_hit",
                "thumbnail_cache_hit",
                {"filename": filename, "thumb_path": thumb_path, "source_path": source_path},
            )
            return send_file(thumb_path, mimetype="image/jpeg")

        source_bucket = "processed"
        _debug_log(
            "run1",
            "H2",
            "backend/app/features/document/routes/thumbnails.py:get_thumbnail:source_select",
            "thumbnail_source_selected",
            {"filename": filename, "source_bucket": source_bucket, "source_path": source_path},
        )
        
        # Generate thumbnail
        os.makedirs(thumbnail_dir, exist_ok=True)
        
        ext = os.path.splitext(filename)[1].lower()
        
        try:
            if ext == ".pdf":
                # Generate PDF thumbnail
                thumb_data = generate_pdf_thumbnail(source_path, size)
            elif ext in [".png", ".jpg", ".jpeg", ".gif"]:
                # Generate image thumbnail
                thumb_data = generate_image_thumbnail(source_path, size)
            else:
                # Generate placeholder thumbnail
                thumb_data = generate_placeholder_thumbnail(ext, size)
            
            # Save thumbnail
            with open(thumb_path, "wb") as f:
                f.write(thumb_data)
            
            return send_file(thumb_path, mimetype="image/jpeg")
        
        except Exception as e:
            logger.error(f"Thumbnail generation error: {e}")
            # Return placeholder on error
            thumb_data = generate_placeholder_thumbnail(ext, size)
            return send_file(
                __import__("io").BytesIO(thumb_data),
                mimetype="image/jpeg"
            )
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/thumbnails/batch", methods=["POST", "OPTIONS"])
def generate_batch_thumbnails():
    """Generate thumbnails for multiple documents."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        dirs = get_data_dirs()
        thumbnail_dir = os.path.join(dirs["DATA_DIR"], "thumbnails")
        
        if not data or "documents" not in data:
            return jsonify({"success": False, "error": "No documents provided"}), 400
        
        documents = data.get("documents", [])
        size = data.get("size", 200)
        
        results = []
        
        for doc_id in documents:
            filename = secure_filename(doc_id)
            thumb_filename = f"{os.path.splitext(filename)[0]}_{size}.jpg"
            thumb_path = os.path.join(thumbnail_dir, thumb_filename)
            
            if os.path.exists(thumb_path):
                results.append({
                    "document": doc_id,
                    "success": True,
                    "thumbnail": thumb_filename
                })
            else:
                # Strict pipeline-only source for batch thumbnails.
                source_path = next(
                    (
                        path
                        for path in [
                            os.path.join(dirs["PROCESSED_DIR"], filename),
                        ]
                        if os.path.exists(path)
                    ),
                    None,
                )
                
                if source_path:
                    try:
                        ext = os.path.splitext(filename)[1].lower()
                        
                        if ext == ".pdf":
                            thumb_data = generate_pdf_thumbnail(source_path, size)
                        elif ext in [".png", ".jpg", ".jpeg", ".gif"]:
                            thumb_data = generate_image_thumbnail(source_path, size)
                        else:
                            thumb_data = generate_placeholder_thumbnail(ext, size)
                        
                        os.makedirs(thumbnail_dir, exist_ok=True)
                        with open(thumb_path, "wb") as f:
                            f.write(thumb_data)
                        
                        results.append({
                            "document": doc_id,
                            "success": True,
                            "thumbnail": thumb_filename
                        })
                    
                    except Exception as e:
                        results.append({
                            "document": doc_id,
                            "success": False,
                            "error": str(e)
                        })
                else:
                    results.append({
                        "document": doc_id,
                        "success": False,
                        "error": "Document not found"
                    })
        
        return jsonify({
            "success": True,
            "results": results,
            "generated": len([r for r in results if r["success"]])
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def generate_pdf_thumbnail(pdf_path, size):
    """Generate thumbnail from PDF file."""
    try:
        import fitz  # PyMuPDF
        
        doc = fitz.open(pdf_path)
        page = doc.load_page(0)
        
        # Calculate zoom factor
        zoom = size / max(page.rect.width, page.rect.height)
        mat = fitz.Matrix(zoom, zoom)
        
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to JPEG
        from PIL import Image
        import io
        
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=85)
        
        doc.close()
        return output.getvalue()
    
    except ImportError:
        return generate_placeholder_thumbnail(".pdf", size)


def generate_image_thumbnail(image_path, size):
    """Generate thumbnail from image file."""
    try:
        from PIL import Image
        import io
        
        img = Image.open(image_path)
        img.thumbnail((size, size), Image.Resampling.LANCZOS)
        
        # Convert to RGB if necessary
        if img.mode != "RGB":
            img = img.convert("RGB")
        
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=85)
        
        return output.getvalue()
    
    except ImportError:
        return generate_placeholder_thumbnail(".img", size)


def generate_placeholder_thumbnail(ext, size):
    """Generate placeholder thumbnail for unsupported file types."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import io
        
        # Create a simple placeholder image
        img = Image.new("RGB", (size, size), color=(240, 240, 240))
        draw = ImageDraw.Draw(img)
        
        # Draw file extension
        text = ext.upper() if ext else "FILE"
        text = text[1:] if text.startswith(".") else text
        
        # Center text
        try:
            font = ImageFont.truetype("arial.ttf", size // 4)
        except:
            font = ImageFont.load_default()
        
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (size - text_width) // 2
        y = (size - text_height) // 2
        
        draw.text((x, y), text, fill=(128, 128, 128), font=font)
        
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=85)
        
        return output.getvalue()
    
    except:
        # Minimal fallback
        return b""
