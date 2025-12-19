"""
PrintChakra Backend - Orchestration Routes

Routes for workflow orchestration including print workflows,
scan workflows, and voice-guided processes.
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from app.core.middleware.cors import create_options_response

orchestration_bp = Blueprint('orchestration', __name__)
logger = logging.getLogger(__name__)

# Global orchestrator reference (initialized on first use)
_orchestrator = None


def get_orchestrator():
    """Get or initialize the orchestrator."""
    global _orchestrator
    
    if _orchestrator is None:
        try:
            from app.core.config import get_data_dirs
            from app.modules.orchestration import get_orchestrator as init_orchestrator
            
            dirs = get_data_dirs()
            _orchestrator = init_orchestrator(dirs.get('DATA_DIR', ''))
        except ImportError as e:
            logger.warning(f"Orchestration module not available: {e}")
            return None
    
    return _orchestrator


# =============================================================================
# COMMAND PROCESSING
# =============================================================================

@orchestration_bp.route("/command", methods=["POST", "OPTIONS"])
def orchestrate_command():
    """
    Process natural language orchestration command.
    
    Expects: JSON with { "command": "print this document" }
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({
            "success": False,
            "error": "Orchestration service not available"
        }), 503
    
    try:
        data = request.get_json() or {}
        command = data.get("command", "")
        
        if not command:
            return jsonify({"success": False, "error": "No command provided"}), 400
        
        logger.info(f"Orchestration command: {command}")
        
        result = orchestrator.process_command(command)
        
        # Emit Socket.IO event
        if result.get("success"):
            try:
                from app.core import socketio
                socketio.emit("orchestration_update", {
                    "type": "command_processed",
                    "result": result,
                    "timestamp": datetime.now().isoformat(),
                })
            except:
                pass
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Orchestration command error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/confirm", methods=["POST", "OPTIONS"])
def orchestrate_confirm():
    """Confirm pending orchestration action."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        result = orchestrator.confirm_action()
        
        try:
            from app.core import socketio
            socketio.emit("orchestration_update", {
                "type": "action_confirmed",
                "result": result,
                "timestamp": datetime.now().isoformat(),
            })
            
            # Handle redirects
            if result.get("success") and result.get("redirect_to"):
                socketio.emit("orchestration_redirect", {
                    "path": result["redirect_to"],
                    "message": result.get("message", "")
                })
        except:
            pass
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Orchestration confirm error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/cancel", methods=["POST", "OPTIONS"])
def orchestrate_cancel():
    """Cancel pending orchestration action."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        result = orchestrator.cancel_action()
        
        try:
            from app.core import socketio
            socketio.emit("orchestration_update", {
                "type": "action_cancelled",
                "result": result,
                "timestamp": datetime.now().isoformat(),
            })
        except:
            pass
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Orchestration cancel error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# STATUS & DOCUMENTS
# =============================================================================

@orchestration_bp.route("/status", methods=["GET", "OPTIONS"])
def orchestrate_status():
    """Get current orchestration status."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        result = orchestrator._handle_status_inquiry()
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Orchestration status error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/documents", methods=["GET", "OPTIONS"])
def orchestrate_documents():
    """Get available documents for orchestration."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        result = orchestrator._handle_list_documents()
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Orchestration documents error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/select", methods=["POST", "OPTIONS"])
def orchestrate_select():
    """
    Select a document for orchestration.
    
    Expects: JSON with { "filename": "doc.jpg" }
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        data = request.get_json() or {}
        filename = data.get("filename", "")
        
        if not filename:
            return jsonify({"success": False, "error": "No filename provided"}), 400
        
        result = orchestrator.select_document(filename)
        
        if result.get("success"):
            try:
                from app.core import socketio
                socketio.emit("orchestration_update", {
                    "type": "document_selected",
                    "document": result.get("document"),
                    "timestamp": datetime.now().isoformat(),
                })
            except:
                pass
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Orchestration select error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# CONFIGURATION
# =============================================================================

@orchestration_bp.route("/configure", methods=["POST", "OPTIONS"])
def orchestrate_configure():
    """
    Update orchestration configuration.
    
    Expects: JSON with { "type": "print|scan", "settings": {...} }
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        data = request.get_json() or {}
        action_type = data.get("type", "")
        settings = data.get("settings", {})
        
        if not action_type or not settings:
            return jsonify({"success": False, "error": "Missing type or settings"}), 400
        
        result = orchestrator.update_configuration(action_type, settings)
        
        if result.get("success"):
            try:
                from app.core import socketio
                socketio.emit("orchestration_update", {
                    "type": "configuration_updated",
                    "settings": settings,
                    "timestamp": datetime.now().isoformat(),
                })
            except:
                pass
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Orchestration configure error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/voice-config", methods=["POST", "OPTIONS"])
def orchestrate_voice_config():
    """
    Process voice-based configuration update.
    
    Expects: JSON with { "transcript": "make it black and white" }
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        data = request.get_json() or {}
        transcript = data.get("transcript", "")
        
        if not transcript:
            return jsonify({"success": False, "error": "No transcript provided"}), 400
        
        # Parse voice configuration
        action_type = orchestrator.pending_action.get("type") if orchestrator.pending_action else None
        
        if action_type:
            result = orchestrator.parse_voice_configuration(transcript, action_type)
            return jsonify(result)
        else:
            return jsonify({
                "success": False,
                "error": "No pending action to configure"
            }), 400
    
    except Exception as e:
        logger.error(f"Voice config error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# ACTIONS
# =============================================================================

@orchestration_bp.route("/print", methods=["POST", "OPTIONS"])
def orchestrate_print():
    """
    Execute print workflow.
    
    Expects: JSON with { "files": [...], "settings": {...} }
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        data = request.get_json() or {}
        files = data.get("files", [])
        settings = data.get("settings", {})
        
        if not files:
            return jsonify({"success": False, "error": "No files specified"}), 400
        
        result = orchestrator.execute_print(files, settings)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Orchestrate print error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/scan", methods=["POST", "OPTIONS"])
def orchestrate_scan():
    """
    Execute scan workflow.
    
    Expects: JSON with { "settings": {...} }
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        data = request.get_json() or {}
        settings = data.get("settings", {})
        
        result = orchestrator.execute_scan(settings)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Orchestrate scan error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# UTILITY
# =============================================================================

@orchestration_bp.route("/reset", methods=["POST", "OPTIONS"])
def orchestrate_reset():
    """Reset orchestration state."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        orchestrator.reset()
        
        try:
            from app.core import socketio
            socketio.emit("orchestration_update", {
                "type": "state_reset",
                "timestamp": datetime.now().isoformat(),
            })
        except:
            pass
        
        return jsonify({"success": True, "message": "Orchestration state reset"})
    
    except Exception as e:
        logger.error(f"Orchestration reset error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/history", methods=["GET", "OPTIONS"])
def orchestrate_history():
    """Get orchestration history."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    orchestrator = get_orchestrator()
    
    if not orchestrator:
        return jsonify({"success": False, "error": "Orchestration service not available"}), 503
    
    try:
        history = orchestrator.get_history()
        return jsonify({"success": True, "history": history})
    
    except Exception as e:
        logger.error(f"Orchestration history error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
