"""
PrintChakra Backend - Voice TTS Routes

Text-to-speech synthesis endpoints.
"""

import logging
from flask import jsonify, request, Response
from app.features.voice.routes import voice_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@voice_bp.route("/speak", methods=["POST", "OPTIONS"])
def text_to_speech():
    """Convert text to speech audio."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        data = request.get_json()
        
        if not data or "text" not in data:
            return jsonify({"success": False, "error": "No text provided"}), 400
        
        text = data.get("text", "")
        voice = data.get("voice", "default")
        speed = data.get("speed", 1.0)
        
        # Generate speech
        result = voice_ai_orchestrator.speak(text, voice=voice, speed=speed)
        
        if result.get("success"):
            # Return audio data
            audio_data = result.get("audio")
            if audio_data:
                return Response(
                    audio_data,
                    mimetype="audio/wav",
                    headers={
                        "Content-Disposition": "attachment; filename=speech.wav"
                    }
                )
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
        logger.error(f"TTS error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@voice_bp.route("/process", methods=["POST", "OPTIONS"])
def process_voice():
    """Process a full voice interaction: transcribe, chat, and speak response."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        if "audio" not in request.files:
            return jsonify({"success": False, "error": "No audio file provided"}), 400
        
        audio_file = request.files["audio"]
        audio_data = audio_file.read()
        
        # Get optional parameters
        speak_response = request.form.get("speak_response", "true").lower() == "true"
        context = request.form.get("context", "{}")
        
        try:
            import json
            context = json.loads(context)
        except:
            context = {}
        
        # Process full voice interaction
        result = voice_ai_orchestrator.process_voice_interaction(
            audio_data,
            speak_response=speak_response,
            context=context
        )
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Voice process error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@voice_bp.route("/voices", methods=["GET", "OPTIONS"])
def get_available_voices():
    """Get list of available TTS voices."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        voices = voice_ai_orchestrator.get_available_voices()
        
        return jsonify({
            "success": True,
            "voices": voices
        })
    
    except Exception as e:
        logger.error(f"Get voices error: {e}")
        return jsonify({
            "success": True,
            "voices": ["default"]
        })


@voice_bp.route("/tts/settings", methods=["GET", "POST", "OPTIONS"])
def tts_settings():
    """Get or update TTS settings."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        if request.method == "GET":
            settings = voice_ai_orchestrator.get_tts_settings()
            return jsonify({"success": True, "settings": settings})
        
        else:  # POST
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "No settings provided"}), 400
            
            voice_ai_orchestrator.update_tts_settings(data)
            return jsonify({"success": True, "message": "Settings updated"})
    
    except Exception as e:
        logger.error(f"TTS settings error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
