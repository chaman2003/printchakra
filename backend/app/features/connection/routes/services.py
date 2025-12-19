"""
PrintChakra Backend - Services Connection Routes

Backend services status and health endpoints.
"""

import logging
from flask import jsonify, request
from app.features.connection.routes import connection_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@connection_bp.route("/services/status", methods=["GET", "OPTIONS"])
def get_services_status():
    """Get status of all backend services."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        services = {}
        
        # Check Flask/API status
        services["api"] = {
            "name": "API Server",
            "status": "running",
            "healthy": True
        }
        
        # Check OCR service
        try:
            from app.modules.ocr import ocr_service
            services["ocr"] = {
                "name": "OCR Service",
                "status": "available",
                "healthy": True
            }
        except ImportError:
            services["ocr"] = {
                "name": "OCR Service",
                "status": "not_available",
                "healthy": False
            }
        
        # Check Voice AI service
        try:
            from app.modules.voice import voice_ai_orchestrator
            services["voice"] = {
                "name": "Voice AI",
                "status": "available",
                "healthy": True,
                "session_active": getattr(voice_ai_orchestrator, 'session_active', False)
            }
        except ImportError:
            services["voice"] = {
                "name": "Voice AI",
                "status": "not_available",
                "healthy": False
            }
        
        # Check Ollama
        try:
            import requests
            ollama_response = requests.get("http://localhost:11434/api/tags", timeout=2)
            services["ollama"] = {
                "name": "Ollama LLM",
                "status": "running" if ollama_response.status_code == 200 else "error",
                "healthy": ollama_response.status_code == 200
            }
        except:
            services["ollama"] = {
                "name": "Ollama LLM",
                "status": "not_running",
                "healthy": False
            }
        
        # Check database/storage
        import os
        data_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            "data"
        )
        services["storage"] = {
            "name": "File Storage",
            "status": "available" if os.path.exists(data_dir) else "not_configured",
            "healthy": os.path.exists(data_dir),
            "path": data_dir
        }
        
        # Calculate overall health
        all_healthy = all(s.get("healthy", False) for s in services.values())
        critical_healthy = all(
            services.get(name, {}).get("healthy", False)
            for name in ["api", "storage"]
        )
        
        return jsonify({
            "success": True,
            "services": services,
            "overall_health": "healthy" if all_healthy else ("degraded" if critical_healthy else "unhealthy")
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@connection_bp.route("/services/ollama", methods=["GET", "OPTIONS"])
def check_ollama_status():
    """Check Ollama LLM service status."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        import requests
        
        # Check if Ollama is running
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            models = data.get("models", [])
            
            return jsonify({
                "success": True,
                "ollama": {
                    "running": True,
                    "models": [m.get("name") for m in models],
                    "total_models": len(models)
                }
            })
        else:
            return jsonify({
                "success": True,
                "ollama": {
                    "running": False,
                    "error": f"Status code: {response.status_code}"
                }
            })
    
    except requests.exceptions.ConnectionError:
        return jsonify({
            "success": True,
            "ollama": {
                "running": False,
                "error": "Connection refused - Ollama may not be running"
            }
        })
    
    except Exception as e:
        return jsonify({
            "success": True,
            "ollama": {
                "running": False,
                "error": str(e)
            }
        })


@connection_bp.route("/services/validate", methods=["POST", "OPTIONS"])
def validate_all_services():
    """Validate all services and return detailed status."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        validations = []
        
        # Validate API
        validations.append({
            "service": "API Server",
            "check": "endpoint_response",
            "passed": True,
            "message": "API is responding"
        })
        
        # Validate storage directories
        import os
        data_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            "data"
        )
        
        for folder in ["uploads", "pdfs", "processed", "converted"]:
            folder_path = os.path.join(data_dir, folder)
            exists = os.path.exists(folder_path)
            validations.append({
                "service": "Storage",
                "check": f"folder_{folder}",
                "passed": exists,
                "message": f"Folder '{folder}' {'exists' if exists else 'does not exist'}"
            })
        
        # Validate OCR
        try:
            from paddleocr import PaddleOCR
            validations.append({
                "service": "OCR",
                "check": "paddleocr_import",
                "passed": True,
                "message": "PaddleOCR is available"
            })
        except ImportError:
            validations.append({
                "service": "OCR",
                "check": "paddleocr_import",
                "passed": False,
                "message": "PaddleOCR not installed"
            })
        
        # Validate PIL/Pillow
        try:
            from PIL import Image
            validations.append({
                "service": "Image Processing",
                "check": "pillow_import",
                "passed": True,
                "message": "Pillow is available"
            })
        except ImportError:
            validations.append({
                "service": "Image Processing",
                "check": "pillow_import",
                "passed": False,
                "message": "Pillow not installed"
            })
        
        # Calculate results
        passed = sum(1 for v in validations if v["passed"])
        total = len(validations)
        
        return jsonify({
            "success": True,
            "validations": validations,
            "summary": {
                "passed": passed,
                "failed": total - passed,
                "total": total,
                "all_passed": passed == total
            }
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@connection_bp.route("/test", methods=["GET", "OPTIONS"])
def test_connection():
    """Simple connection test endpoint."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    return jsonify({
        "success": True,
        "message": "Connection successful",
        "timestamp": __import__("datetime").datetime.now().isoformat()
    })
