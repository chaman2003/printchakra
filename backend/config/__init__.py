"""
Configuration module for PrintChakra backend
"""

from .settings import (
    BASE_DIR,
    UPLOAD_DIR,
    PROCESSED_DIR,
    TEXT_DIR,
    PDF_DIR,
    CONVERTED_DIR,
    PRINT_DIR,
    LOGS_DIR,
    PROCESSING_CONFIG,
    OCR_CONFIG,
    ENHANCEMENT_CONFIG,
    EXPORT_CONFIG,
    API_CONFIG,
    LOGGING_CONFIG,
    FEATURES,
    VERSION
)

__all__ = [
    'BASE_DIR',
    'UPLOAD_DIR',
    'PROCESSED_DIR',
    'TEXT_DIR',
    'PDF_DIR',
    'CONVERTED_DIR',
    'PRINT_DIR',
    'LOGS_DIR',
    'PROCESSING_CONFIG',
    'OCR_CONFIG',
    'ENHANCEMENT_CONFIG',
    'EXPORT_CONFIG',
    'API_CONFIG',
    'LOGGING_CONFIG',
    'FEATURES',
    'VERSION'
]
