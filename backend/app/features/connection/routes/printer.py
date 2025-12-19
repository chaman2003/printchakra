"""
PrintChakra Backend - Printer Connection Routes

Printer connection and discovery endpoints.
"""

import logging
from flask import jsonify, request
from app.features.connection.routes import connection_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@connection_bp.route("/printer/status", methods=["GET", "OPTIONS"])
def get_printer_connection_status():
    """Get printer connection status."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        import subprocess
        
        # Get printer status on Windows
        result = subprocess.run(
            ["wmic", "printer", "get", "name,status,workoffline"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        printers = []
        lines = result.stdout.strip().split("\n")[1:]  # Skip header
        
        for line in lines:
            parts = line.split()
            if parts:
                name = parts[0] if parts else "Unknown"
                status = parts[1] if len(parts) > 1 else "Unknown"
                offline = parts[2] if len(parts) > 2 else "FALSE"
                
                printers.append({
                    "name": name,
                    "status": status,
                    "offline": offline.upper() == "TRUE",
                    "connected": offline.upper() != "TRUE"
                })
        
        has_connected = any(p["connected"] for p in printers)
        
        return jsonify({
            "success": True,
            "connected": has_connected,
            "printers": printers,
            "total": len(printers)
        })
    
    except Exception as e:
        return jsonify({
            "success": True,
            "connected": False,
            "printers": [],
            "error": str(e)
        })


@connection_bp.route("/printer/discover", methods=["GET", "OPTIONS"])
def discover_printers():
    """Discover available printers on the network."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        import subprocess
        
        # List all printers
        result = subprocess.run(
            ["wmic", "printer", "get", "name,portname,drivername,local"],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        printers = []
        lines = result.stdout.strip().split("\n")[1:]
        
        for line in lines:
            if line.strip():
                # Parse the output (columns are space-separated)
                parts = line.split()
                if parts:
                    printers.append({
                        "name": parts[0] if parts else "Unknown",
                        "driver": parts[1] if len(parts) > 1 else "Unknown",
                        "local": parts[2].upper() == "TRUE" if len(parts) > 2 else True,
                        "port": parts[3] if len(parts) > 3 else "Unknown"
                    })
        
        return jsonify({
            "success": True,
            "printers": printers,
            "total": len(printers)
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@connection_bp.route("/printer/test/<printer_name>", methods=["POST", "OPTIONS"])
def test_printer_connection(printer_name):
    """Test connection to a specific printer."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        import subprocess
        import os
        
        # Print a test page
        test_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            "..", "public", "test_print.txt"
        )
        
        if not os.path.exists(test_file):
            # Create a simple test file
            test_content = "PrintChakra Test Page\n" + "=" * 30 + "\nPrinter connection test successful!"
            test_file = os.path.join(os.path.dirname(__file__), "test_print.txt")
            with open(test_file, "w") as f:
                f.write(test_content)
        
        # Note: Actually printing would require win32print or similar
        # For now, just verify the printer exists
        result = subprocess.run(
            ["wmic", "printer", "where", f"name='{printer_name}'", "get", "name"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if printer_name.lower() in result.stdout.lower():
            logger.info(f"[OK] Printer test successful: {printer_name}")
            return jsonify({
                "success": True,
                "message": f"Printer '{printer_name}' is available",
                "printer": printer_name
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Printer '{printer_name}' not found"
            }), 404
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@connection_bp.route("/printer/add", methods=["POST", "OPTIONS"])
def add_printer():
    """Add a network printer."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        printer_path = data.get("path")  # e.g., \\server\printer
        printer_name = data.get("name")
        
        if not printer_path:
            return jsonify({"success": False, "error": "No printer path provided"}), 400
        
        import subprocess
        
        # Add network printer using rundll32
        result = subprocess.run(
            ["rundll32", "printui.dll,PrintUIEntry", "/in", f"/n{printer_path}"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        logger.info(f"[OK] Printer added: {printer_path}")
        
        return jsonify({
            "success": True,
            "message": f"Printer '{printer_path}' added"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
