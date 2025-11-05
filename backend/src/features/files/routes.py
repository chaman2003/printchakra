"""REST API blueprint for file feature."""

import os
from flask import Blueprint, jsonify, request, send_from_directory

from .service import FileService


def create_blueprint(file_service: FileService) -> Blueprint:
    """Create blueprint wired to provided service instance."""

    bp = Blueprint("files", __name__)

    @bp.route("/", methods=["GET"])
    def list_files():
        try:
            files = file_service.list_files()
            return jsonify({"files": [f.to_dict() for f in files]})
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/upload", methods=["POST"])
    def upload_file():
        try:
            if "file" not in request.files:
                return jsonify({"error": "No file provided"}), 400

            uploaded = request.files["file"]
            if uploaded.filename == "":
                return jsonify({"error": "No file selected"}), 400

            filename = file_service.save_file(uploaded, uploaded.filename)
            return jsonify(
                {"success": True, "filename": filename, "message": "File uploaded successfully"}
            )
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/<filename>", methods=["DELETE"])
    def delete_file(filename: str):
        try:
            success = file_service.delete_file(filename)
            if success:
                return jsonify({"success": True, "message": "File deleted successfully"})
            return jsonify({"error": "File not found"}), 404
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/<filename>", methods=["GET"])
    def get_file(filename: str):
        try:
            filepath = file_service.get_file_path(filename)
            if filepath and os.path.exists(filepath):
                return send_from_directory(os.path.dirname(filepath), filename, as_attachment=True)
            return jsonify({"error": "File not found"}), 404
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/<filename>/exists", methods=["GET"])
    def check_file_exists(filename: str):
        try:
            exists = file_service.file_exists(filename)
            return jsonify({"exists": exists})
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    return bp
