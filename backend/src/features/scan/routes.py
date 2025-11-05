"""Scan feature API blueprint."""

import os
from flask import Blueprint, jsonify, request

from models.scan_config import ScanConfig
from src.features.files.service import FileService

from .service import ScanService


def create_blueprint(scan_service: ScanService, file_service: FileService) -> Blueprint:
    """Create scan blueprint with injected services."""

    bp = Blueprint("scan", __name__)

    @bp.route("/scanners", methods=["GET"])
    def get_scanners():
        try:
            scanners = scan_service.get_available_scanners()
            return jsonify({"scanners": scanners})
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/preview", methods=["POST"])
    def scan_preview():
        try:
            data = request.json or {}
            scanner_name = data.get("scanner")

            result = scan_service.preview_scan(scanner_name)
            if result["success"]:
                return jsonify(result)
            return jsonify({"error": result.get("error")}), 500
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    @bp.route("/execute", methods=["POST"])
    def execute_scan():
        try:
            data = request.json
            if not data:
                return jsonify({"error": "No configuration provided"}), 400

            config = ScanConfig.from_dict(data)
            output_filename = data.get("outputFilename", "scan.pdf")
            output_path = os.path.join(file_service.upload_dir, output_filename)

            result = scan_service.scan_document(config, output_path)
            if result["success"]:
                return jsonify(
                    {
                        "success": True,
                        "filename": output_filename,
                        "filepath": result["filepath"],
                    }
                )
            return jsonify({"error": result.get("error")}), 500
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": str(exc)}), 500

    return bp
