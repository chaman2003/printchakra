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
from .voice import VoiceAIModule
from .image import ImageProcessingModule, ImageEnhancer
from .document import (
    DocumentDetector,
    detect_and_serialize,
    ScanningModule,
    validate_image_file,
    StorageModule,
    ExportModule,
)
from .pipeline import DocumentPipeline, create_default_pipeline, EnhancedDocumentPipeline
from .utility import *

__all__ = [
    # OCR & AI
    "OCRModule",
    "AIEnhancer",
    "DocumentClassifier",
    # Voice
    "VoiceAIModule",
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
