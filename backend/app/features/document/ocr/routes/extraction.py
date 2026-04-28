"""
PrintChakra Backend - OCR Extraction Routes

Text extraction endpoints using PaddleOCR.
"""

import os
import logging
import json
import time
from flask import jsonify, request, send_file
from werkzeug.utils import secure_filename
from app.features.document.ocr.routes import ocr_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), "data")
OCR_RESULTS_DIR = os.path.join(DATA_DIR, "processed_text")


def _as_ocr_response(filename: str, result: dict) -> dict:
    """Normalize OCR payload into frontend OCRResponse shape."""
    ocr_result = result.get("ocr_result")
    success = bool(result.get("success"))
    if not isinstance(ocr_result, dict):
        text = result.get("text", "") or ""
        ocr_result = {
            "raw_results": [],
            "structured_units": [],
            "full_text": text,
            "derived_title": text.splitlines()[0][:120] if text else "",
            "confidence_avg": 0.0,
            "word_count": len([w for w in text.replace("\n", " ").split(" ") if w.strip()]),
            "timestamp": "",
            "processing_time_ms": 0,
            "image_dimensions": [0, 0],
        }

    return {
        "success": success,
        "filename": filename,
        "ocr_result": ocr_result,
        "ocr_ready": bool(ocr_result.get("word_count", 0) > 0),
        "error": result.get("error"),
    }


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
        
        response_name = os.path.basename(document_path)
        return jsonify(_as_ocr_response(response_name, result))
    
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
        
        return jsonify(_as_ocr_response(filename, result))
    
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


@ocr_bp.route("/status/<doc_id>", methods=["GET", "OPTIONS"])
def get_ocr_status_by_file(doc_id):
    """Get OCR-ready status for a given document ID."""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        filename = secure_filename(doc_id)
        stem = os.path.splitext(filename)[0]
        candidates = [
            os.path.join(OCR_RESULTS_DIR, f"{stem}.txt"),
            os.path.join(OCR_RESULTS_DIR, f"processed_{stem}.txt"),
        ]
        ready = any(os.path.isfile(path) for path in candidates)
        return jsonify({"filename": filename, "ocr_ready": ready})
    except Exception:
        return jsonify({"filename": doc_id, "ocr_ready": False})


def _make_bbox(points: list) -> dict:
    """Convert PaddleOCR polygon points to bbox object."""
    if not points:
        return {"x": 0, "y": 0, "width": 0, "height": 0, "points": []}
    xs = [float(p[0]) for p in points]
    ys = [float(p[1]) for p in points]
    return {
        "x": min(xs),
        "y": min(ys),
        "width": max(xs) - min(xs),
        "height": max(ys) - min(ys),
        "points": points,
    }


def _extract_json_from_llm_response(content: str) -> dict | None:
    """Try to extract JSON object from model output."""
    if not content:
        return None
    content = content.strip()
    try:
        return json.loads(content)
    except Exception:
        pass

    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = content[start : end + 1]
        try:
            return json.loads(candidate)
        except Exception:
            return None
    return None


def parse_ocr_with_ollama(raw_text: str) -> dict:
    """Always attempt LLM parsing for structured OCR JSON."""
    model = os.getenv("OLLAMA_MODEL", "llama3.2")
    prompt = f"""You are an OCR post-processor.
Convert the OCR text below into STRICT JSON with this exact shape:
{{
  "derived_title": "short document title",
  "structured_units": [
    {{
      "text": "content",
      "type": "title|heading|paragraph|list_item|table_cell|footer|other"
    }}
  ],
  "full_text": "full cleaned text"
}}

Rules:
- Return ONLY valid JSON (no markdown, no explanation).
- Keep all important information from OCR text.
- If uncertain, still output best-effort JSON.

OCR text:
{raw_text}
"""
    try:
        import requests

        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=90,
        )
        if response.status_code != 200:
            return {"success": False, "error": f"Ollama returned {response.status_code}"}
        data = response.json()
        parsed = _extract_json_from_llm_response(data.get("response", ""))
        if not parsed:
            return {"success": False, "error": "LLM response was not valid JSON"}
        return {"success": True, "parsed": parsed, "model": model}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _fallback_structured_units(raw_lines: list[str]) -> list[dict]:
    """Fallback unit classification when LLM JSON parse fails."""
    units = []
    for idx, line in enumerate(raw_lines):
        cleaned = line.strip()
        if not cleaned:
            continue
        line_type = "paragraph"
        if idx == 0 and len(cleaned) < 80:
            line_type = "title"
        elif cleaned.endswith(":"):
            line_type = "heading"
        elif cleaned.startswith(("-", "*", "•")):
            line_type = "list_item"
        units.append({"text": cleaned, "type": line_type})
    return units


def perform_ocr(image_path: str, language: str = "en", use_ollama: bool = True) -> dict:
    """Perform OCR and always post-process into structured JSON."""
    try:
        from paddleocr import PaddleOCR

        # Initialize PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang=language, use_gpu=False, show_log=False)

        started = time.time()
        raw_results = []

        # Check if PDF - convert to images first
        ext = os.path.splitext(image_path)[1].lower()

        if ext == ".pdf":
            # Convert PDF pages to images
            try:
                import fitz
                from PIL import Image

                doc = fitz.open(image_path)
                all_text = []
                image_dimensions = [0, 0]

                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
                    image_dimensions = [pix.width, pix.height]

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
                            confidence = float(line[1][1])
                            points = line[0] if isinstance(line[0], list) else []
                            raw_results.append(
                                {
                                    "text": text,
                                    "confidence": confidence,
                                    "bbox": _make_bbox(points),
                                }
                            )
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
                    "message": "No text detected in image",
                    "ocr_result": {
                        "raw_results": [],
                        "structured_units": [],
                        "full_text": "",
                        "derived_title": "",
                        "confidence_avg": 0.0,
                        "word_count": 0,
                        "timestamp": "",
                        "processing_time_ms": (time.time() - started) * 1000,
                        "image_dimensions": [0, 0],
                    },
                }

            # Extract text
            all_text = []
            image_dimensions = [0, 0]
            for line in result[0]:
                text = line[1][0]
                confidence = float(line[1][1])
                points = line[0] if isinstance(line[0], list) else []
                bbox = _make_bbox(points)
                raw_results.append(
                    {
                        "text": text,
                        "confidence": confidence,
                        "bbox": bbox,
                    }
                )
                if bbox["width"] > 0 and bbox["height"] > 0:
                    image_dimensions = [
                        int(max(image_dimensions[0], bbox["x"] + bbox["width"])),
                        int(max(image_dimensions[1], bbox["y"] + bbox["height"])),
                    ]
                all_text.append(text)

            raw_text = "\n".join(all_text)

        raw_lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        llm_meta = {"used": False, "success": False, "error": None, "model": None}

        # Always attempt LLM JSON parsing when text exists.
        structured_units = []
        derived_title = raw_lines[0][:120] if raw_lines else ""
        full_text = raw_text
        if raw_text and use_ollama:
            llm_meta["used"] = True
            parsed = parse_ocr_with_ollama(raw_text)
            llm_meta["success"] = bool(parsed.get("success"))
            llm_meta["error"] = parsed.get("error")
            llm_meta["model"] = parsed.get("model")
            if parsed.get("success") and parsed.get("parsed"):
                parsed_obj = parsed["parsed"]
                structured_units = parsed_obj.get("structured_units") or []
                derived_title = (parsed_obj.get("derived_title") or derived_title)[:120]
                full_text = parsed_obj.get("full_text") or raw_text

        if not structured_units:
            structured_units = _fallback_structured_units(raw_lines)

        confidence_avg = (
            sum(float(r.get("confidence", 0)) for r in raw_results) / len(raw_results)
            if raw_results
            else 0.0
        )
        words = [w for w in full_text.replace("\n", " ").split(" ") if w.strip()]

        processing_time_ms = (time.time() - started) * 1000
        ocr_result = {
            "raw_results": raw_results,
            "structured_units": [
                {
                    "text": u.get("text", ""),
                    "type": u.get("type", "other"),
                    "bbox": u.get("bbox", {"x": 0, "y": 0, "width": 0, "height": 0}),
                    "confidence": float(u.get("confidence", confidence_avg or 0.75)),
                    "word_indices": u.get("word_indices", []),
                }
                for u in structured_units
                if isinstance(u, dict)
            ],
            "full_text": full_text,
            "derived_title": derived_title,
            "confidence_avg": confidence_avg,
            "word_count": len(words),
            "timestamp": "",
            "processing_time_ms": processing_time_ms,
            "image_dimensions": image_dimensions,
        }

        return {
            "success": True,
            "text": full_text,
            "raw_text": raw_text,
            "character_count": len(full_text),
            "line_count": len(full_text.split("\n")),
            "ocr_result": ocr_result,
            "llm": llm_meta,
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
