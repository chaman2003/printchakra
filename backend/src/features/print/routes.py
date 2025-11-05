"""Print feature API blueprint."""

from flask import Blueprint, jsonify, request

from models.print_config import PrintConfig
from src.features.files.service import FileService

from .service import PrintService


def create_blueprint(print_service: PrintService, file_service: FileService) -> Blueprint:
    """Create print blueprint with injected services."""

    bp = Blueprint("print", __name__)

    @bp.route("/printers", methods=["GET"])
    def get_printers():
        try:
            printers = print_service.get_available_printers()
            return jsonify({"printers": printers})
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/status/<printer_name>", methods=["GET"])
    def get_status(printer_name: str):
        try:
            result = print_service.get_printer_status(printer_name)
            if result["success"]:
                return jsonify(result["status"])
            return jsonify({"error": result.get("error")}), 500
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/execute", methods=["POST"])
    def execute_print():
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No configuration provided"}), 400

            filename = data.get("filename")
            if not filename:
                return jsonify({"error": "No filename provided"}), 400

            filepath = file_service.get_file_path(filename)
            if not filepath:
                return jsonify({"error": "File not found"}), 404

            config = PrintConfig.from_dict(data)
            result = print_service.print_document(filepath, config)
            if result["success"]:
                return jsonify({"success": True, "message": "Print job sent successfully"})
            return jsonify({"error": result.get("error")}), 500
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    return bp
