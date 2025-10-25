"""
PrintChakra Document Processing Modules
Complete document scanning, enhancement, OCR, and export system
"""

__version__ = '2.1.0'
__author__ = 'Chaman S'

from .scanning import ScanningModule, validate_image_file
from .image_processing import ImageProcessingModule

# Lazy load OCR module to avoid sklearn import issues at startup
def _lazy_load_ocr():
    from .ocr_ai import OCRModule, DocumentClassifier, AIEnhancer
    return OCRModule, DocumentClassifier, AIEnhancer

# Provide a fallback until modules are actually used
class _LazyOCRModule:
    def __getattr__(self, name):
        OCRModule, _, _ = _lazy_load_ocr()
        return getattr(OCRModule, name)

OCRModule = None
DocumentClassifier = None
AIEnhancer = None

# Import them lazily when app.py first accesses them
try:
    from .ocr_ai import OCRModule, DocumentClassifier, AIEnhancer
except ImportError:
    pass

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
