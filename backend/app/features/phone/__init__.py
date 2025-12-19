"""
PrintChakra Backend - Phone Capture Feature

Provides phone camera capture functionality including:
- Image upload and processing
- Quality validation
- Document detection
"""

from app.features.phone.routes import phone_bp

__all__ = ['phone_bp']
