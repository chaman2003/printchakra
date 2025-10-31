"""
PrintChakra Backend Configuration
Central configuration for all modules and settings
"""

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent.absolute()
DATA_DIR = BASE_DIR / 'data'

# Directory Configuration
UPLOAD_DIR = DATA_DIR / 'uploads'
PROCESSED_DIR = DATA_DIR / 'processed'
TEXT_DIR = DATA_DIR / 'processed_text'
PDF_DIR = DATA_DIR / 'pdfs'
CONVERTED_DIR = DATA_DIR / 'converted'
PRINT_DIR = BASE_DIR / 'print_scripts'
LOGS_DIR = BASE_DIR / 'logs'

# Ensure all directories exist
for directory in [DATA_DIR, UPLOAD_DIR, PROCESSED_DIR, TEXT_DIR, PDF_DIR, CONVERTED_DIR, PRINT_DIR, LOGS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Processing Configuration
PROCESSING_CONFIG = {
    'blur_threshold': 100.0,
    'focus_threshold': 50.0,
    'brightness_boost': 25,
    'equalization_strength': 0.4,
    'clahe_clip_limit': 2.0,
    'clahe_tile_size': 8,
    'corner_inset': 12,  # Pixels to move corners inward to avoid shadows
}

# OCR Configuration
OCR_CONFIG = {
    'language': 'eng',
    'psm': 3,  # Page segmentation mode
    'oem': 3,  # OCR engine mode
    'configs': [
        ('PSM 3 (Auto)', '--oem 3 --psm 3'),
        ('PSM 6 (Block)', '--oem 3 --psm 6'),
        ('PSM 4 (Column)', '--oem 3 --psm 4')
    ]
}

# Image Enhancement Configuration
ENHANCEMENT_CONFIG = {
    'bilateral_filter': {
        'd': 9,
        'sigma_color': 75,
        'sigma_space': 75
    },
    'adaptive_threshold': {
        'block_sizes': [11, 13, 15],
        'constants': [2, 3]
    },
    'clahe': {
        'clip_limits': [2.0, 3.0],
        'tile_grid_size': (8, 8)
    }
}

# Export Configuration
EXPORT_CONFIG = {
    'jpeg_quality': 95,
    'pdf_page_size': 'A4',
    'compression_quality': 85
}

# API Configuration
API_CONFIG = {
    'cors_origins': [
        "https://printchakra.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # Allow all as fallback
    ],
    'max_file_size': 10 * 1024 * 1024,  # 10 MB
    'allowed_extensions': {'.jpg', '.jpeg', '.png', '.pdf'},
    'socket_io': {
        'ping_timeout': 120,
        'ping_interval': 30,
        'max_http_buffer_size': 1e7
    }
}

# Logging Configuration
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        },
        'detailed': {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'INFO',
            'formatter': 'standard',
            'stream': 'ext://sys.stdout'
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'level': 'DEBUG',
            'formatter': 'detailed',
            'filename': str(LOGS_DIR / 'printchakra.log'),
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5
        }
    },
    'loggers': {
        '': {  # Root logger
            'handlers': ['console', 'file'],
            'level': 'INFO'
        },
        'werkzeug': {
            'level': 'WARNING'
        },
        'socketio': {
            'level': 'WARNING'
        },
        'engineio': {
            'level': 'WARNING'
        }
    }
}

# Feature Flags
FEATURES = {
    'advanced_pipeline': True,
    'document_detection': True,
    'corner_refinement': True,
    'multi_config_ocr': True,
    'ai_enhancement': False,  # Requires additional dependencies
    'cloud_storage': False,  # Not yet implemented
    'batch_processing': True,
    'pdf_export': True,
    'document_classification': False  # Requires training
}

# Version
VERSION = '2.1.0'


# Flask Configuration Class
class Config:
    """Flask configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Directory paths
    UPLOAD_FOLDER = str(UPLOAD_DIR)
    PROCESSED_FOLDER = str(PROCESSED_DIR)
    CONVERTED_FOLDER = str(CONVERTED_DIR)
    TEXT_FOLDER = str(TEXT_DIR)
    PDF_FOLDER = str(PDF_DIR)
    
    # File upload settings
    MAX_CONTENT_LENGTH = API_CONFIG['max_file_size']
    ALLOWED_EXTENSIONS = API_CONFIG['allowed_extensions']
    
    # CORS settings
    CORS_ORIGINS = API_CONFIG['cors_origins']


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
