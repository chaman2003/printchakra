"""
Print routes
API endpoints for printing operations
"""

from flask import Blueprint, jsonify, request

from models.print_config import PrintConfig

print_bp = Blueprint("print", __name__)

# Service will be injected by app
print_service = None
file_service = None


def init_print_routes(print_svc, file_svc):
    """Initialize print routes with services"""
    global print_service, file_service
    print_service = print_svc
    file_service = file_svc


@print_bp.route("/printers", methods=["GET"])
def get_printers():
    """Get list of available printers"""
    try:
        printers = print_service.get_available_printers()
        return jsonify({"printers": printers})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@print_bp.route("/status/<printer_name>", methods=["GET"])
def get_printer_status(printer_name):
    """Get printer status"""
    try:
        result = print_service.get_printer_status(printer_name)

        if result["success"]:
            return jsonify(result["status"])
        else:
            return jsonify({"error": result.get("error")}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@print_bp.route("/execute", methods=["POST"])
def execute_print():
    """Execute print job"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No configuration provided"}), 400

        # Get filename
        filename = data.get("filename")
        if not filename:
            return jsonify({"error": "No filename provided"}), 400

        # Get file path
        filepath = file_service.get_file_path(filename)
        if not filepath:
            return jsonify({"error": "File not found"}), 404

        # Parse configuration
        config = PrintConfig.from_dict(data)

        # Execute print
        result = print_service.print_document(filepath, config)

        if result["success"]:
            return jsonify({"success": True, "message": "Print job sent successfully"})
        else:
            return jsonify({"error": result.get("error")}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
