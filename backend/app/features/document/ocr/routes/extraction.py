"""
PrintChakra Backend - OCR Extraction Routes

Text extraction endpoints using PaddleOCR.
"""

import os
import logging
from flask import jsonify, request, send_file
from werkzeug.utils import secure_filename
from app.features.document.ocr.routes import ocr_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), "data")
OCR_RESULTS_DIR = os.path.join(DATA_DIR, "processed_text")


@ocr_bp.route("/extract", methods=["POST", "OPTIONS"])
def extract_text():
    """Extract text from a document using OCR."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        # Handle file upload or document ID
        if "file" in request.files:
            file = request.files["file"]
            if file.filename == "":
                return jsonify({"success": False, "error": "No file selected"}), 400
            
            # Save temporarily
            import uuid
            temp_filename = f"ocr_temp_{uuid.uuid4().hex}_{secure_filename(file.filename)}"
            temp_path = os.path.join(DATA_DIR, "uploads", temp_filename)
            os.makedirs(os.path.dirname(temp_path), exist_ok=True)
            file.save(temp_path)
            document_path = temp_path
        
        else:
            data = request.get_json() or {}
            document_id = data.get("document_id")
            
            if not document_id:
                return jsonify({"success": False, "error": "No document provided"}), 400
            
            # Find document
            filename = secure_filename(document_id)
            document_path = None
            
            for folder in ["uploads", "pdfs", "processed"]:
                filepath = os.path.join(DATA_DIR, folder, filename)
                if os.path.exists(filepath):
                    document_path = filepath
                    break
            
            if not document_path:
                return jsonify({"success": False, "error": "Document not found"}), 404
        
        # Get options
        language = request.form.get("language", "en") if "file" in request.files else (request.get_json() or {}).get("language", "en")
        use_ollama = request.form.get("use_ollama", "true").lower() == "true" if "file" in request.files else (request.get_json() or {}).get("use_ollama", True)
        
        # Perform OCR
        result = perform_ocr(document_path, language=language, use_ollama=use_ollama)
        
        if result.get("success"):
            # Save result
            os.makedirs(OCR_RESULTS_DIR, exist_ok=True)
            
            import uuid
            result_filename = f"ocr_{uuid.uuid4().hex}.txt"
            result_path = os.path.join(OCR_RESULTS_DIR, result_filename)
            
            with open(result_path, "w", encoding="utf-8") as f:
                f.write(result.get("text", ""))
            
            result["result_file"] = result_filename
            result["result_path"] = result_path
            
            logger.info(f"[OK] OCR completed for: {os.path.basename(document_path)}")
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"OCR extraction error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@ocr_bp.route("/extract/<doc_id>", methods=["GET", "OPTIONS"])
def extract_text_by_id(doc_id):
    """Extract text from a document by ID."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        filename = secure_filename(doc_id)
        
        # Find document
        document_path = None
        for folder in ["uploads", "pdfs", "processed"]:
            filepath = os.path.join(DATA_DIR, folder, filename)
            if os.path.exists(filepath):
                document_path = filepath
                break
        
        if not document_path:
            return jsonify({"success": False, "error": "Document not found"}), 404
        
        # Get options from query params
        language = request.args.get("language", "en")
        use_ollama = request.args.get("use_ollama", "true").lower() == "true"
        
        # Perform OCR
        result = perform_ocr(document_path, language=language, use_ollama=use_ollama)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"OCR extraction error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@ocr_bp.route("/result/<result_id>", methods=["GET", "OPTIONS"])
def get_ocr_result(result_id):
    """Get OCR result by ID."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        filename = secure_filename(result_id)
        result_path = os.path.join(OCR_RESULTS_DIR, filename)
        
        if not os.path.exists(result_path):
            return jsonify({"success": False, "error": "Result not found"}), 404
        
        with open(result_path, "r", encoding="utf-8") as f:
            text = f.read()
        
        return jsonify({
            "success": True,
            "result_id": result_id,
            "text": text
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@ocr_bp.route("/result/<result_id>/download", methods=["GET", "OPTIONS"])
def download_ocr_result(result_id):
    """Download OCR result as text file."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        filename = secure_filename(result_id)
        result_path = os.path.join(OCR_RESULTS_DIR, filename)
        
        if not os.path.exists(result_path):
            return jsonify({"success": False, "error": "Result not found"}), 404
        
        return send_file(
            result_path,
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def perform_ocr(image_path: str, language: str = "en", use_ollama: bool = True) -> dict:
    """Perform OCR on an image or PDF."""
    try:
        from paddleocr import PaddleOCR
        
        # Initialize PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang=language, use_gpu=False, show_log=False)
        
        # Check if PDF - convert to images first
        ext = os.path.splitext(image_path)[1].lower()
        
        if ext == ".pdf":
            # Convert PDF pages to images
            try:
                import fitz
                from PIL import Image
                import io
                
                doc = fitz.open(image_path)
                all_text = []
                
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
                    
                    # Convert to PIL Image
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    
                    # Save to temp file for OCR
                    import tempfile
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                        img.save(tmp.name)
                        result = ocr.ocr(tmp.name, cls=True)
                        os.unlink(tmp.name)
                    
                    # Extract text
                    if result and result[0]:
                        for line in result[0]:
                            text = line[1][0]
                            all_text.append(text)
                
                doc.close()
                raw_text = "\n".join(all_text)
            
            except ImportError:
                return {
                    "success": False,
                    "error": "PyMuPDF not available for PDF processing"
                }
        
        else:
            # Process image directly
            result = ocr.ocr(image_path, cls=True)
            
            if not result or not result[0]:
                return {
                    "success": True,
                    "text": "",
                    "message": "No text detected in image"
                }
            
            # Extract text
            all_text = []
            for line in result[0]:
                text = line[1][0]
                confidence = line[1][1]
                all_text.append(text)
            
            raw_text = "\n".join(all_text)
        
        # Optionally process with Ollama for better formatting
        if use_ollama and raw_text:
            processed_text = process_with_ollama(raw_text)
        else:
            processed_text = raw_text
        
        return {
            "success": True,
            "text": processed_text,
            "raw_text": raw_text,
            "character_count": len(processed_text),
            "line_count": len(processed_text.split("\n"))
        }
    
    except ImportError:
        return {
            "success": False,
            "error": "PaddleOCR not installed. Install with: pip install paddleocr paddlepaddle"
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def process_with_ollama(text: str) -> str:
    """Process OCR text with Ollama for better formatting."""
    try:
        import requests
        
        prompt = f"""Please clean up and format the following OCR-extracted text. 
Fix any obvious spelling errors, add proper punctuation, and organize paragraphs.
Only return the cleaned text, no explanations.

Text to clean:
{text}"""
        
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama2",
                "prompt": prompt,
                "stream": False
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get("response", text)
        
        return text
    
    except Exception:
        # Return original text if Ollama fails
        return text
