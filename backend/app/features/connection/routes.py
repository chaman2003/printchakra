"""
PrintChakra Backend - Connection Routes

Routes for connection validation including phone, camera,
printer, and service connectivity checks.
"""

import os
import sys
import subprocess
import logging
from flask import Blueprint, request, jsonify, current_app
from app.core.config import get_data_dirs
from app.core.middleware.cors import create_options_response

connection_bp = Blueprint('connection', __name__)
logger = logging.getLogger(__name__)


# =============================================================================
# WIFI/NETWORK VALIDATION
# =============================================================================

@connection_bp.route("/validate-wifi", methods=["POST", "OPTIONS"])
def validate_wifi_connection():
    """Validate phone to laptop WiFi connection via HTTP request."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        timestamp = data.get('timestamp', 0)
        
        # The fact that this endpoint is being called proves the connection exists
        try:
            from app.core import socketio
            connected_clients = len(socketio.server.manager.rooms.get("", {})) if hasattr(socketio.server, 'manager') else 0
        except:
            connected_clients = 0
        
        logger.info(f"WiFi validation successful - HTTP POST received | Clients: {connected_clients}")
        
        return jsonify({
            "connected": True,
            "message": "[OK] Phone and Laptop on same network",
            "ip": "Network established",
            "timestamp": timestamp,
            "clients": connected_clients
        }), 200
    
    except Exception as e:
        logger.error(f"WiFi validation error: {str(e)}")
        return jsonify({
            "connected": False,
            "message": f"[ERROR] WiFi check failed: {str(e)}"
        }), 200


@connection_bp.route("/phone-wifi", methods=["GET", "OPTIONS"])
def check_phone_wifi():
    """Check if phone is connected to the same Wi-Fi network."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        try:
            from app.core import socketio
            connected_clients = len(socketio.server.manager.rooms.get("", {}))
        except:
            connected_clients = 0
        
        if connected_clients > 0:
            return jsonify({
                "connected": True,
                "message": "Phone connected to Wi-Fi network",
                "ip": "Network active",
                "clients": connected_clients,
            })
        else:
            return jsonify({
                "connected": False,
                "message": "Phone not detected on network",
                "clients": 0
            }), 200
    
    except Exception as e:
        return jsonify({
            "connected": False,
            "message": f"Connection check failed: {str(e)}"
        }), 200


# =============================================================================
# CAMERA VALIDATION
# =============================================================================

@connection_bp.route("/validate-camera", methods=["POST", "OPTIONS"])
def validate_camera_capturing():
    """Validate phone camera is actively capturing frames."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        is_capturing = data.get('isCapturing', False)
        timestamp = data.get('timestamp', 0)
        
        camera_active = is_capturing
        
        logger.info(f"Camera validation - Capturing: {camera_active}")
        
        if camera_active:
            return jsonify({
                "capturing": True,
                "message": "[OK] Camera is actively capturing frames",
                "timestamp": timestamp,
                "frameRate": "30fps"
            }), 200
        else:
            return jsonify({
                "capturing": False,
                "message": "[ERROR] Camera not currently capturing"
            }), 200
    
    except Exception as e:
        logger.error(f"Camera validation error: {str(e)}")
        return jsonify({
            "capturing": False,
            "message": f"[ERROR] Camera check failed: {str(e)}"
        }), 200


@connection_bp.route("/camera-ready", methods=["GET", "OPTIONS"])
def check_camera_ready():
    """Check if phone camera session is active and ready."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    UPLOAD_DIR = dirs.get('UPLOAD_DIR', '')
    
    try:
        try:
            from app.core import socketio
            connected_clients = len(socketio.server.manager.rooms.get("", {}))
        except:
            connected_clients = 0
        
        # Check for recent uploads
        recent_activity = False
        if os.path.exists(UPLOAD_DIR):
            files = os.listdir(UPLOAD_DIR)
            if files:
                import time
                for f in files:
                    file_path = os.path.join(UPLOAD_DIR, f)
                    if os.path.isfile(file_path):
                        mtime = os.path.getmtime(file_path)
                        if time.time() - mtime < 300:  # 5 minutes
                            recent_activity = True
                            break
        
        if connected_clients > 0:
            return jsonify({
                "ready": True,
                "message": "Camera session active",
                "recentActivity": recent_activity,
                "clients": connected_clients,
            })
        else:
            return jsonify({
                "ready": False,
                "message": "Camera not connected",
                "recentActivity": recent_activity,
            }), 200
    
    except Exception as e:
        return jsonify({
            "ready": False,
            "message": f"Camera check failed: {str(e)}"
        }), 200


# =============================================================================
# PRINTER VALIDATION
# =============================================================================

@connection_bp.route("/validate-printer", methods=["POST", "OPTIONS"])
def validate_printer_connection():
    """Validate laptop to printer connection by auto-printing blank.pdf."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    
    try:
        data = request.get_json() or {}
        test_print = data.get('testPrint', False)
        timestamp = data.get('timestamp', 0)
        
        printer_ready = False
        printer_model = "Unknown"
        print_success = False
        print_error_msg = ""
        
        try:
            import win32print
            
            printer_name = win32print.GetDefaultPrinter()
            
            if not printer_name:
                return jsonify({
                    "connected": False,
                    "message": "[ERROR] No default printer configured"
                }), 200
            
            printer_model = printer_name
            
            if test_print:
                # Find blank.pdf
                possible_paths = [
                    os.path.join(dirs.get('PRINT_DIR', ''), "blank.pdf"),
                    os.path.join(dirs.get('PUBLIC_DIR', ''), "blank.pdf"),
                ]
                
                blank_pdf_path = None
                for path in possible_paths:
                    if os.path.exists(path):
                        blank_pdf_path = path
                        break
                
                if not blank_pdf_path:
                    return jsonify({
                        "connected": False,
                        "message": "[ERROR] blank.pdf not found"
                    }), 200
                
                # Try to print
                try:
                    import win32api
                    
                    win32api.ShellExecute(
                        0, "print", blank_pdf_path, None,
                        os.path.dirname(blank_pdf_path), 0
                    )
                    print_success = True
                    printer_ready = True
                    
                except Exception as shell_err:
                    logger.warning(f"ShellExecute print failed: {shell_err}")
                    
                    try:
                        ps_cmd = f'Start-Process -FilePath "{blank_pdf_path}" -Verb Print -WindowStyle Hidden'
                        result = subprocess.run(
                            ["powershell", "-Command", ps_cmd],
                            capture_output=True,
                            timeout=30
                        )
                        
                        if result.returncode == 0:
                            print_success = True
                            printer_ready = True
                    except Exception as ps_err:
                        print_error_msg = str(ps_err)
                        printer_ready = True
            else:
                printer_ready = True
                print_success = True
        
        except ImportError:
            return jsonify({
                "connected": False,
                "message": "[ERROR] win32print module not installed"
            }), 200
        
        except Exception as printer_err:
            return jsonify({
                "connected": False,
                "message": f"[ERROR] Printer check failed: {str(printer_err)}"
            }), 200
        
        if printer_ready and (print_success or not test_print):
            return jsonify({
                "connected": True,
                "message": f"[OK] Printer ready: {printer_model}",
                "model": printer_model,
                "timestamp": timestamp,
                "testPrintSent": test_print and print_success
            }), 200
        else:
            return jsonify({
                "connected": False,
                "message": f"[ERROR] {print_error_msg or 'Printer not responding'}"
            }), 200
    
    except Exception as e:
        return jsonify({
            "connected": False,
            "message": f"[ERROR] Printer check failed: {str(e)}"
        }), 200


@connection_bp.route("/printer-status", methods=["GET", "OPTIONS"])
def check_printer_status():
    """Check printer connectivity status."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        if sys.platform.startswith("win"):
            try:
                import win32print
                printer_name = win32print.GetDefaultPrinter()
                
                if printer_name:
                    return jsonify({
                        "connected": True,
                        "message": "Printer ready",
                        "model": printer_name,
                        "status": "online",
                    })
            except:
                pass
        
        # Fallback check
        try:
            result = subprocess.run(
                ["lpstat", "-p"] if not sys.platform.startswith("win") else ["wmic", "printer", "list", "brief"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                return jsonify({
                    "connected": True,
                    "message": "Printer services active",
                    "model": "System Printer",
                    "status": "ready",
                })
        except:
            pass
        
        return jsonify({
            "connected": False,
            "message": "Printer not responding",
            "status": "offline"
        }), 200
    
    except Exception as e:
        return jsonify({
            "connected": False,
            "message": f"Printer check failed: {str(e)}",
            "status": "error",
        }), 200


# =============================================================================
# SERVICE VALIDATION
# =============================================================================

@connection_bp.route("/validate-ollama", methods=["GET", "POST", "OPTIONS"])
def validate_ollama():
    """Validate Ollama AI service availability."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        import requests
        
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            models = data.get("models", [])
            
            return jsonify({
                "available": True,
                "message": "Ollama is running",
                "models": [m.get("name") for m in models],
                "model_count": len(models)
            })
        else:
            return jsonify({
                "available": False,
                "message": "Ollama not responding"
            })
    
    except requests.exceptions.ConnectionError:
        return jsonify({
            "available": False,
            "message": "Ollama not running. Start with 'ollama serve'"
        })
    
    except Exception as e:
        return jsonify({
            "available": False,
            "message": f"Ollama check failed: {str(e)}"
        })


@connection_bp.route("/status", methods=["GET", "OPTIONS"])
def get_connection_status():
    """Get overall connection status summary."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    status = {
        "wifi": False,
        "camera": False,
        "printer": False,
        "ollama": False,
    }
    
    # Check socket connections
    try:
        from app.core import socketio
        clients = len(socketio.server.manager.rooms.get("", {}))
        status["wifi"] = clients > 0
    except:
        pass
    
    # Check printer
    try:
        if sys.platform.startswith("win"):
            import win32print
            if win32print.GetDefaultPrinter():
                status["printer"] = True
    except:
        pass
    
    # Check Ollama
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        status["ollama"] = response.status_code == 200
    except:
        pass
    
    return jsonify({
        "success": True,
        "status": status,
        "all_connected": all(status.values())
    })
