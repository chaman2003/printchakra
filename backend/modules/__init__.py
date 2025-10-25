"""
PrintChakra Document Processing Modules
Complete document scanning, enhancement, OCR, and export system
"""

__version__ = '2.1.0'
__author__ = 'Chaman S'

from .scanning import ScanningModule, validate_image_file
from .image_processing import ImageProcessingModule
from .ocr_ai import OCRModule, DocumentClassifier, AIEnhancer
from .storage import StorageModule
from .export import ExportModule
from .pipeline import DocumentPipeline, create_default_pipeline
from .document_detection import DocumentDetector, detect_and_serialize

# Enhanced pipeline modules (new)
from .image_enhancement import ImageEnhancer
from .enhanced_pipeline import EnhancedDocumentPipeline
from .api_endpoints import create_enhanced_endpoints

__all__ = [
    'ScanningModule',
    'ImageProcessingModule',
    'OCRModule',
    'DocumentClassifier',
    'AIEnhancer',
    'StorageModule',
    'ExportModule',
    'DocumentPipeline',
    'create_default_pipeline',
    'validate_image_file',
    'DocumentDetector',
    'detect_and_serialize',
    'ImageEnhancer',
    'EnhancedDocumentPipeline',
    'create_enhanced_endpoints'
]
