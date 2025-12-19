"""
PrintChakra Backend - WiFi Connection Routes

WiFi and network connection endpoints.
"""

import logging
from flask import jsonify, request
from app.features.connection.routes import connection_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@connection_bp.route("/wifi/status", methods=["GET", "OPTIONS"])
def get_wifi_status():
    """Get WiFi connection status."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        import subprocess
        
        # Get WiFi status on Windows
        result = subprocess.run(
            ["netsh", "wlan", "show", "interfaces"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        output = result.stdout
        
        # Parse output
        status = {
            "connected": "State" in output and "connected" in output.lower(),
            "ssid": None,
            "signal": None,
            "speed": None
        }
        
        for line in output.split("\n"):
            line = line.strip()
            if line.startswith("SSID"):
                parts = line.split(":", 1)
                if len(parts) > 1:
                    status["ssid"] = parts[1].strip()
            elif line.startswith("Signal"):
                parts = line.split(":", 1)
                if len(parts) > 1:
                    status["signal"] = parts[1].strip()
            elif "speed" in line.lower():
                parts = line.split(":", 1)
                if len(parts) > 1:
                    status["speed"] = parts[1].strip()
        
        return jsonify({
            "success": True,
            "wifi": status
        })
    
    except Exception as e:
        return jsonify({
            "success": True,
            "wifi": {
                "connected": False,
                "error": str(e)
            }
        })


@connection_bp.route("/wifi/networks", methods=["GET", "OPTIONS"])
def list_wifi_networks():
    """List available WiFi networks."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        import subprocess
        
        result = subprocess.run(
            ["netsh", "wlan", "show", "networks"],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        networks = []
        current_network = {}
        
        for line in result.stdout.split("\n"):
            line = line.strip()
            if line.startswith("SSID"):
                if current_network:
                    networks.append(current_network)
                parts = line.split(":", 1)
                ssid = parts[1].strip() if len(parts) > 1 else ""
                current_network = {"ssid": ssid}
            elif line.startswith("Signal"):
                parts = line.split(":", 1)
                if len(parts) > 1:
                    current_network["signal"] = parts[1].strip()
            elif line.startswith("Authentication"):
                parts = line.split(":", 1)
                if len(parts) > 1:
                    current_network["security"] = parts[1].strip()
        
        if current_network:
            networks.append(current_network)
        
        # Filter out empty SSIDs
        networks = [n for n in networks if n.get("ssid")]
        
        return jsonify({
            "success": True,
            "networks": networks,
            "total": len(networks)
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@connection_bp.route("/wifi/connect", methods=["POST", "OPTIONS"])
def connect_wifi():
    """Connect to a WiFi network."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        
        if not data or "ssid" not in data:
            return jsonify({"success": False, "error": "No SSID provided"}), 400
        
        ssid = data.get("ssid")
        password = data.get("password", "")
        
        import subprocess
        
        # Try to connect to existing profile first
        result = subprocess.run(
            ["netsh", "wlan", "connect", f"name={ssid}"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if "successfully" in result.stdout.lower():
            logger.info(f"[OK] Connected to WiFi: {ssid}")
            return jsonify({"success": True, "message": f"Connected to {ssid}"})
        
        return jsonify({
            "success": False,
            "error": "Failed to connect. Profile may not exist."
        }), 400
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@connection_bp.route("/wifi/disconnect", methods=["POST", "OPTIONS"])
def disconnect_wifi():
    """Disconnect from current WiFi network."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        import subprocess
        
        result = subprocess.run(
            ["netsh", "wlan", "disconnect"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        logger.info("[OK] WiFi disconnected")
        return jsonify({"success": True, "message": "Disconnected"})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
