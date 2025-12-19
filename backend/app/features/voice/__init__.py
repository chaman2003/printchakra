"""
PrintChakra Backend - Voice Feature

Provides voice AI functionality including:
- Speech-to-text transcription (Vosk)
- Text-to-speech synthesis
- Voice command processing
- AI chat integration (Ollama)
"""

from app.features.voice.routes import voice_bp

__all__ = ['voice_bp']
