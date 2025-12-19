"""
PrintChakra Backend - Voice Chat Routes

AI chat conversation endpoints.
"""

import logging
from flask import jsonify, request
from app.features.voice.routes import voice_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@voice_bp.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    """Send a message to the AI chat and get a response."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        data = request.get_json()
        
        if not data or "message" not in data:
            return jsonify({"success": False, "error": "No message provided"}), 400
        
        message = data.get("message", "")
        context = data.get("context", {})
        
        # Get AI response
        result = voice_ai_orchestrator.chat(message, context)
        
        if result.get("success"):
            return jsonify(result)
        else:
            return jsonify(result), 500
    
    except ImportError as e:
        logger.error(f"Voice AI module import error: {e}")
        return jsonify({
            "success": False,
            "error": "Voice AI module not available"
        }), 503
    
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@voice_bp.route("/chat/history", methods=["GET", "OPTIONS"])
def get_chat_history():
    """Get the chat conversation history."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        limit = request.args.get("limit", 50, type=int)
        
        history = voice_ai_orchestrator.get_history(limit)
        
        return jsonify({
            "success": True,
            "history": history
        })
    
    except Exception as e:
        logger.error(f"Get history error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@voice_bp.route("/chat/clear", methods=["POST", "OPTIONS"])
def clear_chat_history():
    """Clear the chat conversation history."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        voice_ai_orchestrator.clear_history()
        
        return jsonify({"success": True, "message": "History cleared"})
    
    except Exception as e:
        logger.error(f"Clear history error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@voice_bp.route("/chat/context", methods=["POST", "OPTIONS"])
def set_chat_context():
    """Set context for the AI conversation."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No context provided"}), 400
        
        voice_ai_orchestrator.set_context(data)
        
        return jsonify({"success": True, "message": "Context updated"})
    
    except Exception as e:
        logger.error(f"Set context error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
