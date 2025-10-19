"""
PrintChakra Document Processing Modules
Complete document scanning, enhancement, OCR, and export system
"""

__version__ = '2.0.0'
__author__ = 'Chaman S'

from .scanning import ScanningModule, validate_image_file
from .image_processing import ImageProcessingModule
from .ocr_ai import OCRModule, DocumentClassifier, AIEnhancer
from .storage import StorageModule
from .export import ExportModule
from .pipeline import DocumentPipeline, create_default_pipeline
from .document_detection import DocumentDetector, detect_and_serialize

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
    'detect_and_serialize'
]
