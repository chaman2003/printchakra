"""
Scan routes
API endpoints for scanning operations
"""

import os

from flask import Blueprint, jsonify, request

from models.scan_config import ScanConfig

scan_bp = Blueprint("scan", __name__)

# Service will be injected by app
scan_service = None


def init_scan_routes(service):
    """Initialize scan routes with service"""
    global scan_service
    scan_service = service


@scan_bp.route("/scanners", methods=["GET"])
def get_scanners():
    """Get list of available scanners"""
    try:
        scanners = scan_service.get_available_scanners()
        return jsonify({"scanners": scanners})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@scan_bp.route("/preview", methods=["POST"])
def scan_preview():
    """Get scan preview"""
    try:
        data = request.json or {}
        scanner_name = data.get("scanner")

        result = scan_service.preview_scan(scanner_name)

        if result["success"]:
            return jsonify(result)
        else:
            return jsonify({"error": result.get("error")}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@scan_bp.route("/execute", methods=["POST"])
def execute_scan():
    """Execute scan with configuration"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No configuration provided"}), 400

        # Parse configuration
        config = ScanConfig.from_dict(data)

        # Get output path
        output_filename = data.get("outputFilename", "scan.pdf")
        output_path = os.path.join(file_service.upload_dir, output_filename)

        # Execute scan
        result = scan_service.scan_document(config, output_path)

        if result["success"]:
            return jsonify(
                {"success": True, "filename": output_filename, "filepath": result["filepath"]}
            )
        else:
            return jsonify({"error": result.get("error")}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
