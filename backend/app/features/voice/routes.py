"""
PrintChakra Backend - Voice Routes

Routes for voice AI functionality including transcription,
chat, text-to-speech, and voice session management.
"""

import logging
from flask import Blueprint, request, jsonify, current_app
from app.core.middleware.cors import create_options_response

voice_bp = Blueprint('voice', __name__)
logger = logging.getLogger(__name__)


# =============================================================================
# SESSION MANAGEMENT
# =============================================================================

@voice_bp.route("/start", methods=["POST", "OPTIONS"])
def start_voice_session():
    """
    Start a new voice AI session.
    Loads Whisper model and checks Ollama availability.
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        logger.info("Starting voice AI session...")
        result = voice_ai_orchestrator.start_session()
        
        if result.get("success"):
            logger.info("[OK] Voice AI session started successfully")
            return jsonify(result), 200
        else:
            logger.error(f"[ERROR] Voice AI session start failed: {result.get('error')}")
            return jsonify(result), 503
    
    except ImportError as e:
        logger.error(f"Voice AI module import error: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Voice AI module not available. Install dependencies."
        }), 503
    
    except Exception as e:
        logger.error(f"Voice session start error: {str(e)}")
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


# =============================================================================
# TRANSCRIPTION (SPEECH-TO-TEXT)
# =============================================================================

@voice_bp.route("/transcribe", methods=["POST", "OPTIONS"])
def transcribe_voice():
    """
    Transcribe audio to text using Whisper.
    
    Expects: multipart/form-data with 'audio' field (WAV format)
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        # Check if session is active
        if not voice_ai_orchestrator.session_active:
            return jsonify({
                "success": False,
                "error": "No active voice session. Start a session first."
            }), 400
        
        # Get audio file
        audio_file = request.files.get("audio")
        if not audio_file:
            return jsonify({"success": False, "error": "No audio file provided"}), 400
        
        # Read audio bytes
        audio_data = audio_file.read()
        
        logger.info(f"Received audio: {len(audio_data)} bytes")
        
        # Transcribe
        transcription = voice_ai_orchestrator.whisper_service.transcribe_audio(audio_data)
        
        if transcription.get("success"):
            logger.info(f"[OK] Transcription: {transcription.get('text')}")
            return jsonify(transcription), 200
        else:
            logger.error(f"[ERROR] Transcription failed: {transcription.get('error')}")
            return jsonify(transcription), 500
    
    except ImportError:
        return jsonify({"success": False, "error": "Voice AI module not available"}), 503
    
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# AI CHAT
# =============================================================================

@voice_bp.route("/chat", methods=["POST", "OPTIONS"])
def chat_with_ai():
    """
    Send text to the configured voice AI model and get a response.
    
    Expects: JSON with 'message' field
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        # Check if session is active
        if not voice_ai_orchestrator.session_active:
            return jsonify({
                "success": False,
                "error": "No active voice session. Start a session first."
            }), 400
        
        data = request.get_json() or {}
        user_message = data.get("message", "").strip()
        
        if not user_message:
            return jsonify({"success": False, "error": "No message provided"}), 400
        
        logger.info(f"User message: {user_message}")
        
        # Generate response
        response = voice_ai_orchestrator.chat_service.generate_response(user_message)
        
        if response.get("success"):
            ai_response = response.get("response", "")
            logger.info(f"AI response: {ai_response[:100]}...")
            
            # Process orchestration triggers if present
            response = _process_orchestration_triggers(response, user_message)
            
            return jsonify(response), 200
        else:
            logger.error(f"Chat failed: {response.get('error')}")
            return jsonify(response), 500
    
    except ImportError:
        return jsonify({"success": False, "error": "Voice AI module not available"}), 503
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# TEXT-TO-SPEECH
# =============================================================================

@voice_bp.route("/speak", methods=["POST", "OPTIONS"])
def speak_text():
    """
    Convert text to speech.
    
    Expects: JSON with 'text' field
    Returns: Audio data or URL
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        data = request.get_json() or {}
        text = data.get("text", "").strip()
        
        if not text:
            return jsonify({"success": False, "error": "No text provided"}), 400
        
        # Generate speech
        result = voice_ai_orchestrator.tts_service.speak(text)
        
        return jsonify(result)
    
    except ImportError:
        return jsonify({"success": False, "error": "TTS module not available"}), 503
    
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# FULL VOICE PROCESSING PIPELINE
# =============================================================================

@voice_bp.route("/process", methods=["POST", "OPTIONS"])
def process_voice():
    """
    Full voice processing pipeline:
    1. Transcribe audio
    2. Process command/chat
    3. Generate response
    4. Convert to speech (optional)
    
    Expects: multipart/form-data with 'audio' field
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        # Check if session is active
        if not voice_ai_orchestrator.session_active:
            return jsonify({
                "success": False,
                "error": "No active voice session. Start a session first."
            }), 400
        
        # Get audio file
        audio_file = request.files.get("audio")
        if not audio_file:
            return jsonify({"success": False, "error": "No audio file provided"}), 400
        
        audio_data = audio_file.read()
        
        # Process through pipeline
        result = voice_ai_orchestrator.process_voice_input(audio_data)
        
        return jsonify(result)
    
    except ImportError:
        return jsonify({"success": False, "error": "Voice AI module not available"}), 503
    
    except Exception as e:
        logger.error(f"Voice process error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _process_orchestration_triggers(response: dict, user_message: str) -> dict:
    """Process orchestration triggers from AI response."""
    ai_response = response.get("response", "")
    
    # Check for orchestration triggers
    orchestration_trigger = response.get("orchestration_trigger")
    orchestration_mode = response.get("orchestration_mode")
    
    if not orchestration_trigger and "TRIGGER_ORCHESTRATION:" in ai_response:
        trigger_start = ai_response.index("TRIGGER_ORCHESTRATION:")
        trigger_end = ai_response.find(" ", trigger_start)
        if trigger_end == -1:
            trigger_end = len(ai_response)
        
        trigger_text = ai_response[trigger_start:trigger_end]
        
        if "print" in trigger_text.lower():
            orchestration_mode = "print"
            orchestration_trigger = True
        elif "scan" in trigger_text.lower():
            orchestration_mode = "scan"
            orchestration_trigger = True
        
        # Remove trigger from response
        ai_response = ai_response.replace(trigger_text, "").strip()
        response["response"] = ai_response
        response["orchestration_trigger"] = orchestration_trigger
        response["orchestration_mode"] = orchestration_mode
    
    return response
