"""Compatibility exports for voice module."""

from .core import *  # noqa: F401,F403
from .core import WhisperTranscriptionService


def load_whisper_model() -> bool:
    """Compatibility helper used by backend startup preload."""
    transcriber = WhisperTranscriptionService()
    return transcriber.load_model()
