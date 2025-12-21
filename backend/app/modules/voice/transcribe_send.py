"""
Simple Voice Transcription Service
Uses Whisper to transcribe speech and returns text only.
No command parsing or orchestration - just pure transcription.
"""

import os
import io
import tempfile
import logging
import torch

logger = logging.getLogger(__name__)

# Global model cache
_whisper_model = None
_model_loaded = False


def get_whisper_model():
    """Load Whisper model lazily (singleton pattern)."""
    global _whisper_model, _model_loaded
    
    if _model_loaded and _whisper_model is not None:
        return _whisper_model
    
    try:
        import whisper
        
        # Use smaller model for faster loading
        model_name = os.environ.get("WHISPER_MODEL", "base")
        logger.info(f"Loading Whisper model: {model_name}")
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")
        
        _whisper_model = whisper.load_model(model_name, device=device)
        _model_loaded = True
        
        logger.info(f"Whisper model '{model_name}' loaded successfully")
        return _whisper_model
        
    except Exception as e:
        logger.error(f"Failed to load Whisper model: {e}")
        raise


def transcribe_audio(audio_data: bytes) -> dict:
    """
    Transcribe audio data to text using Whisper.
    
    Args:
        audio_data: Raw audio bytes (WAV format)
        
    Returns:
        dict with 'success', 'text', and optional 'error'
    """
    try:
        model = get_whisper_model()
        
        # Save audio to temp file (Whisper needs file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            tmp_file.write(audio_data)
            tmp_path = tmp_file.name
        
        try:
            # Transcribe
            result = model.transcribe(
                tmp_path,
                language="en",
                fp16=torch.cuda.is_available(),
                verbose=False,
            )
            
            text = result.get("text", "").strip()
            
            if not text:
                return {
                    "success": True,
                    "text": "",
                    "no_speech": True,
                }
            
            logger.info(f"Transcribed: {text}")
            
            return {
                "success": True,
                "text": text,
            }
            
        finally:
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except:
                pass
                
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {
            "success": False,
            "text": "",
            "error": str(e),
        }


def is_model_loaded() -> bool:
    """Check if Whisper model is loaded."""
    return _model_loaded and _whisper_model is not None


def preload_model():
    """Preload the Whisper model (call during app startup)."""
    try:
        get_whisper_model()
        return True
    except:
        return False
