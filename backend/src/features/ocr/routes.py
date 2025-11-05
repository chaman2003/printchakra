"""OCR feature API blueprint."""

from flask import Blueprint, jsonify, request

from src.features.files.service import FileService

from .service import OCRService


def create_blueprint(ocr_service: OCRService, file_service: FileService) -> Blueprint:
    """Create OCR blueprint with provided services."""

    bp = Blueprint("ocr", __name__)

    @bp.route("/<filename>", methods=["GET"])
    def get_ocr_text(filename: str):
        try:
            text = ocr_service.load_text(filename)
            if text is not None:
                return jsonify({
                    "filename": filename,
                    "text": text,
                    "has_text": len(text) > 0,
                })
            return jsonify({"error": "No OCR text found"}), 404
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/process", methods=["POST"])
    def process_ocr():
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400

            filename = data.get("filename")
            if not filename:
                return jsonify({"error": "No filename provided"}), 400

            filepath = file_service.get_file_path(filename)
            if not filepath:
                return jsonify({"error": "File not found"}), 404

            lang = data.get("language", "eng")
            result = ocr_service.process_file(filepath, filename, lang=lang)
            if result["success"]:
                return jsonify(
                    {
                        "success": True,
                        "text": result["text"],
                        "has_text": result["has_text"],
                        "message": "OCR completed successfully",
                    }
                )
            return jsonify({"error": result.get("error")}), 500
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/batch", methods=["POST"])
    def batch_ocr():
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400

            filenames = data.get("filenames", [])
            if not filenames:
                return jsonify({"error": "No filenames provided"}), 400

            lang = data.get("language", "eng")

            results = []
            errors = []

            for filename in filenames:
                filepath = file_service.get_file_path(filename)
                if not filepath:
                    errors.append({"filename": filename, "error": "File not found"})
                    continue

                result = ocr_service.process_file(filepath, filename, lang=lang)
                if result["success"]:
                    results.append({"filename": filename, "has_text": result["has_text"]})
                else:
                    errors.append({"filename": filename, "error": result.get("error", "Unknown error")})

            return jsonify(
                {
                    "success": len(errors) == 0,
                    "processed": len(results),
                    "failed": len(errors),
                    "results": results,
                    "errors": errors,
                }
            )
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    return bp
