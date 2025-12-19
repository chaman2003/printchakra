"""
PrintChakra Backend - Voice Routes Package

Organizes voice routes by functionality.
"""

from flask import Blueprint

# Create main voice blueprint
voice_bp = Blueprint('voice', __name__)

# Import route modules to register routes
from app.features.voice.routes import session
from app.features.voice.routes import transcription
from app.features.voice.routes import chat
from app.features.voice.routes import tts

__all__ = ['voice_bp']
