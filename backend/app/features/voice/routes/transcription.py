"""
PrintChakra Backend - Voice Transcription Routes

Speech-to-text transcription endpoints.
"""

import logging
from flask import jsonify, request
from app.features.voice.routes import voice_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@voice_bp.route("/transcribe", methods=["POST", "OPTIONS"])
def transcribe_audio():
    """Transcribe audio to text using Whisper."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        if "audio" not in request.files:
            return jsonify({"success": False, "error": "No audio file provided"}), 400
        
        audio_file = request.files["audio"]
        
        if audio_file.filename == "":
            return jsonify({"success": False, "error": "No audio file selected"}), 400
        
        # Get audio data
        audio_data = audio_file.read()
        
        # Transcribe using voice AI orchestrator
        result = voice_ai_orchestrator.transcribe(audio_data)
        
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
        logger.error(f"Transcription error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@voice_bp.route("/transcribe/stream", methods=["POST", "OPTIONS"])
def transcribe_stream():
    """Stream transcription for real-time speech recognition."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        if not request.data:
            return jsonify({"success": False, "error": "No audio data provided"}), 400
        
        # Process streaming audio chunk
        result = voice_ai_orchestrator.process_audio_chunk(request.data)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Stream transcription error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
