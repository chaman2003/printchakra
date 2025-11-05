"""Conversion feature API blueprint."""

import os
from flask import Blueprint, jsonify, request, send_from_directory

from src.features.files.service import FileService

from .service import ConversionService


def create_blueprint(
    conversion_service: ConversionService,
    file_service: FileService,
) -> Blueprint:
    """Create conversion blueprint with provided services."""

    bp = Blueprint("conversion", __name__)

    @bp.route("/formats", methods=["GET"])
    def get_supported_formats():
        try:
            formats = conversion_service.get_supported_formats()
            return jsonify({"formats": formats})
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/execute", methods=["POST"])
    def convert_file():
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400

            filename = data.get("filename")
            output_format = data.get("format")
            if not filename or not output_format:
                return jsonify({"error": "Filename and format required"}), 400

            filepath = file_service.get_file_path(filename)
            if not filepath:
                return jsonify({"error": "File not found"}), 404

            result = conversion_service.convert_file(filepath, output_format)
            if result["success"]:
                return jsonify(
                    {
                        "success": True,
                        "output_filename": result["output_name"],
                        "message": "Conversion completed successfully",
                    }
                )
            return jsonify({"error": result.get("error")}), 500
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/batch", methods=["POST"])
    def batch_convert():
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No data provided"}), 400

            filenames = data.get("filenames", [])
            output_format = data.get("format")
            if not filenames or not output_format:
                return jsonify({"error": "Filenames and format required"}), 400

            input_paths = []
            for filename in filenames:
                filepath = file_service.get_file_path(filename)
                if filepath:
                    input_paths.append(filepath)

            if not input_paths:
                return jsonify({"error": "No valid files found"}), 404

            result = conversion_service.batch_convert(input_paths, output_format)
            return jsonify(result)
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/list", methods=["GET"])
    def list_converted():
        try:
            files = conversion_service.list_converted_files()
            return jsonify({"files": files})
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/download/<filename>", methods=["GET"])
    def download_converted(filename: str):
        try:
            filepath = os.path.join(conversion_service.converted_dir, filename)
            if os.path.exists(filepath):
                return send_from_directory(
                    conversion_service.converted_dir,
                    filename,
                    as_attachment=True,
                )
            return jsonify({"error": "File not found"}), 404
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    return bp
