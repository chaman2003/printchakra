"""
PrintChakra Backend - Voice Session Routes

Session management for voice AI.
"""

import logging
from flask import jsonify, request
from app.features.voice.routes import voice_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@voice_bp.route("/start", methods=["POST", "OPTIONS"])
def start_voice_session():
    """Start a new voice AI session."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        logger.info("Starting voice AI session...")
        result = voice_ai_orchestrator.start_session()
        
        if result.get("success"):
            logger.info("[OK] Voice AI session started")
            return jsonify(result), 200
        else:
            logger.error(f"Session start failed: {result.get('error')}")
            return jsonify(result), 503
    
    except ImportError as e:
        logger.error(f"Voice AI module import error: {e}")
        return jsonify({
            "success": False,
            "error": "Voice AI module not available"
        }), 503
    
    except Exception as e:
        logger.error(f"Voice session start error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@voice_bp.route("/end", methods=["POST", "OPTIONS"])
def end_voice_session():
    """End the current voice AI session."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        result = voice_ai_orchestrator.end_session()
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@voice_bp.route("/status", methods=["GET", "OPTIONS"])
def get_voice_status():
    """Get voice AI session status."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        return jsonify({
            "success": True,
            "session_active": voice_ai_orchestrator.session_active,
            "whisper_loaded": voice_ai_orchestrator.whisper_service.is_loaded() if voice_ai_orchestrator.whisper_service else False,
            "ollama_available": voice_ai_orchestrator.chat_service.is_available() if voice_ai_orchestrator.chat_service else False,
        })
    
    except ImportError:
        return jsonify({
            "success": True,
            "session_active": False,
            "whisper_loaded": False,
            "ollama_available": False,
            "message": "Voice AI module not available"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
