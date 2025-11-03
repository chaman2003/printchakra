"""
PrintChakra Document Processing Modules
Complete document scanning, enhancement, OCR, and export system

Module Organization:
- ocr/           : OCR and AI-powered document recognition
- voice/         : Voice control and speech-to-text
- image/         : Image processing and enhancement
- document/      : Document detection, conversion, and management
- pipeline/      : Processing pipeline orchestration
"""

__version__ = "2.1.0"
__author__ = "Chaman S"

# Import from submodules
from .api_endpoints import create_enhanced_endpoints
from .ocr import OCRModule, AIEnhancer, DocumentClassifier
from .voice import VoiceAIOrchestrator, WhisperTranscriptionService, Smollm2ChatService
from .image import ImageProcessingModule, ImageEnhancer
from .document import (
    DocumentDetector,
    detect_and_serialize,
    ScanningModule,
    validate_image_file,
    StorageModule,
    ExportModule,
)

# Import pipeline with error handling (optional dependency)
try:
    from .pipeline import DocumentPipeline, create_default_pipeline, EnhancedDocumentPipeline
except ImportError as e:
    import logging
    logging.warning(f"Pipeline module not fully available: {e}")
    DocumentPipeline = None
    create_default_pipeline = None
    EnhancedDocumentPipeline = None

from .utility import *

__all__ = [
    # OCR & AI
    "OCRModule",
    "AIEnhancer",
    "DocumentClassifier",
    # Voice
    "VoiceAIOrchestrator",
    "WhisperTranscriptionService",
    "Smollm2ChatService",
    # Image Processing
    "ImageProcessingModule",
    "ImageEnhancer",
    # Document Management
    "DocumentDetector",
    "detect_and_serialize",
    "ScanningModule",
    "validate_image_file",
    "StorageModule",
    "ExportModule",
    # Pipeline
    "DocumentPipeline",
    "create_default_pipeline",
    "EnhancedDocumentPipeline",
    "create_enhanced_endpoints",
]
