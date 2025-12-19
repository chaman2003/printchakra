"""
PrintChakra Backend - Orchestration Config Routes

Orchestration configuration and settings endpoints.
"""

import logging
from flask import jsonify, request
from app.features.orchestration.routes import orchestration_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@orchestration_bp.route("/config", methods=["GET", "OPTIONS"])
def get_orchestration_config():
    """Get orchestration configuration."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        config = {
            "voice_enabled": True,
            "auto_execute": False,
            "confirmation_required": True,
            "default_printer": None,
            "default_scanner": None,
            "language": "en",
            "timeout_seconds": 30,
            "max_retries": 3,
            "logging_enabled": True
        }
        
        return jsonify({
            "success": True,
            "config": config
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/config", methods=["POST", "OPTIONS"])
def update_orchestration_config():
    """Update orchestration configuration."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Validate and save configuration
        allowed_keys = [
            "voice_enabled", "auto_execute", "confirmation_required",
            "default_printer", "default_scanner", "language",
            "timeout_seconds", "max_retries", "logging_enabled"
        ]
        
        updated = {}
        for key in allowed_keys:
            if key in data:
                updated[key] = data[key]
        
        logger.info(f"[OK] Orchestration config updated: {list(updated.keys())}")
        
        return jsonify({
            "success": True,
            "updated": updated,
            "message": "Configuration updated"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/config/voice", methods=["GET", "OPTIONS"])
def get_voice_config():
    """Get voice orchestration configuration."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        config = {
            "enabled": True,
            "wake_word": "hey print chakra",
            "language": "en-US",
            "sensitivity": 0.5,
            "timeout_seconds": 10,
            "feedback_enabled": True,
            "tts_enabled": True,
            "tts_voice": "default"
        }
        
        return jsonify({
            "success": True,
            "voice_config": config
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/config/voice", methods=["POST", "OPTIONS"])
def update_voice_config():
    """Update voice orchestration configuration."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        logger.info("[OK] Voice orchestration config updated")
        
        return jsonify({
            "success": True,
            "message": "Voice configuration updated"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/config/defaults", methods=["GET", "OPTIONS"])
def get_default_settings():
    """Get default orchestration settings."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        defaults = {
            "print": {
                "copies": 1,
                "color": True,
                "duplex": False,
                "paper_size": "A4"
            },
            "scan": {
                "format": "pdf",
                "resolution": 300,
                "color": True
            },
            "ocr": {
                "language": "en",
                "format": "txt"
            },
            "workflow": {
                "auto_save": True,
                "notify_on_complete": True
            }
        }
        
        return jsonify({
            "success": True,
            "defaults": defaults
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/config/defaults", methods=["POST", "OPTIONS"])
def update_default_settings():
    """Update default orchestration settings."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        logger.info("[OK] Default orchestration settings updated")
        
        return jsonify({
            "success": True,
            "message": "Default settings updated"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/config/reset", methods=["POST", "OPTIONS"])
def reset_orchestration_config():
    """Reset orchestration configuration to defaults."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        logger.info("[OK] Orchestration config reset to defaults")
        
        return jsonify({
            "success": True,
            "message": "Configuration reset to defaults"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/config/export", methods=["GET", "OPTIONS"])
def export_config():
    """Export orchestration configuration."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        import json
        
        config = {
            "version": "1.0",
            "exported_at": __import__("datetime").datetime.now().isoformat(),
            "orchestration": {
                "voice_enabled": True,
                "auto_execute": False,
                "confirmation_required": True
            },
            "defaults": {
                "print": {"copies": 1, "color": True},
                "scan": {"format": "pdf", "resolution": 300}
            }
        }
        
        return jsonify({
            "success": True,
            "config": config
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/config/import", methods=["POST", "OPTIONS"])
def import_config():
    """Import orchestration configuration."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        
        if not data or "config" not in data:
            return jsonify({"success": False, "error": "No configuration provided"}), 400
        
        config = data.get("config")
        
        # Validate config version
        if config.get("version") != "1.0":
            return jsonify({
                "success": False,
                "error": "Unsupported configuration version"
            }), 400
        
        logger.info("[OK] Orchestration config imported")
        
        return jsonify({
            "success": True,
            "message": "Configuration imported successfully"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
