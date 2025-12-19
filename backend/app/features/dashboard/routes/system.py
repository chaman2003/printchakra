"""
PrintChakra Backend - Dashboard System Routes

System information and printer status endpoints.
"""

from flask import jsonify, request
from app.features.dashboard.routes import dashboard_bp


@dashboard_bp.route("/system/info", methods=["GET"])
def get_system_info():
    """Get system information."""
    from app.features.dashboard.services.system_service import SystemService
    
    service = SystemService()
    info = service.get_system_info()
    
    return jsonify({"success": True, "system": info})


@dashboard_bp.route("/system/printers", methods=["GET"])
def get_printers():
    """Get available printers."""
    from app.features.dashboard.services.system_service import SystemService
    
    service = SystemService()
    printers = service.get_printers()
    
    return jsonify({"success": True, "printers": printers})


@dashboard_bp.route("/system/gpu", methods=["GET"])
def get_gpu_status():
    """Get GPU status for ML operations."""
    from app.features.dashboard.services.system_service import SystemService
    
    service = SystemService()
    gpu_info = service.get_gpu_info()
    
    return jsonify({"success": True, "gpu": gpu_info})


@dashboard_bp.route("/system/services", methods=["GET"])
def get_services_status():
    """Get status of external services (Ollama, etc.)."""
    from app.features.dashboard.services.system_service import SystemService
    
    service = SystemService()
    services = service.get_services_status()
    
    return jsonify({"success": True, "services": services})


@dashboard_bp.route("/system/storage", methods=["GET"])
def get_storage_info():
    """Get storage information."""
    from app.features.dashboard.services.system_service import SystemService
    
    service = SystemService()
    storage = service.get_storage_info()
    
    return jsonify({"success": True, "storage": storage})
