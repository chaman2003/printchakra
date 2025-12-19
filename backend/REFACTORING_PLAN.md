# PrintChakra Backend Refactoring Plan

## Overview

This document describes the modular architecture implemented for the PrintChakra backend.

## Directory Structure

```
backend/app/
├── __init__.py                    # App factory
├── core/                          # Core application infrastructure
│   ├── __init__.py
│   ├── config.py                  # Configuration classes
│   ├── extensions.py              # Flask extensions
│   ├── logging_config.py          # Logging setup
│   └── middleware/
│       ├── __init__.py
│       ├── cors.py                # CORS configuration
│       └── error_handler.py       # Error handling
│
├── features/                      # Feature modules
│   ├── dashboard/                 # Dashboard feature
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py        # Blueprint definition
│   │   │   ├── health.py          # Health check endpoints
│   │   │   ├── files.py           # File listing endpoints
│   │   │   └── system.py          # System info endpoints
│   │   └── services/
│   │       └── system_service.py
│   │
│   ├── phone/                     # Phone capture feature
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py        # Blueprint definition
│   │   │   ├── upload.py          # File upload endpoints
│   │   │   ├── capture.py         # Camera capture endpoints
│   │   │   └── quality.py         # Quality check endpoints
│   │   ├── upload/
│   │   │   ├── processor.py
│   │   │   └── storage.py
│   │   └── quality/
│   │       └── validator.py
│   │
│   ├── document/                  # Document management feature
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py        # Blueprint definition
│   │   │   ├── files.py           # Document file endpoints
│   │   │   ├── thumbnails.py      # Thumbnail endpoints
│   │   │   └── conversion.py      # Format conversion endpoints
│   │   ├── services/
│   │   │   ├── document_service.py
│   │   │   └── thumbnail_service.py
│   │   └── ocr/                   # OCR sub-feature
│   │       ├── __init__.py
│   │       ├── routes/
│   │       │   ├── __init__.py    # OCR Blueprint
│   │       │   ├── extraction.py  # Text extraction endpoints
│   │       │   ├── batch.py       # Batch OCR endpoints
│   │       │   └── status.py      # OCR status endpoints
│   │       └── services/
│   │           └── paddle_ocr_service.py
│   │
│   ├── print/                     # Print feature
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py        # Blueprint definition
│   │   │   ├── jobs.py            # Print job endpoints
│   │   │   ├── queue.py           # Queue management endpoints
│   │   │   └── config.py          # Printer config endpoints
│   │   └── services/
│   │       ├── printer_service.py
│   │       └── print_job_service.py
│   │
│   ├── voice/                     # Voice AI feature
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py        # Blueprint definition
│   │   │   ├── session.py         # Session management endpoints
│   │   │   ├── transcription.py   # Speech-to-text endpoints
│   │   │   ├── chat.py            # AI chat endpoints
│   │   │   └── tts.py             # Text-to-speech endpoints
│   │   └── services/
│   │       ├── whisper_service.py
│   │       ├── tts_service.py
│   │       └── chat_service.py
│   │
│   ├── connection/                # Connection validation feature
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py        # Blueprint definition
│   │   │   ├── wifi.py            # WiFi connection endpoints
│   │   │   ├── camera.py          # Camera connection endpoints
│   │   │   ├── printer.py         # Printer connection endpoints
│   │   │   └── services.py        # Service status endpoints
│   │   └── services/
│   │       └── connection_service.py
│   │
│   └── orchestration/             # Workflow orchestration feature
│       ├── __init__.py
│       ├── routes/
│       │   ├── __init__.py        # Blueprint definition
│       │   ├── command.py         # Command execution endpoints
│       │   ├── workflow.py        # Workflow management endpoints
│       │   └── config.py          # Orchestration config endpoints
│       └── services/
│           └── orchestration_service.py
│
├── sockets/                       # Socket.IO handlers
│   ├── __init__.py
│   └── handlers.py                # Event handlers
│
└── modules/                       # Shared modules (existing)
    ├── voice/
    ├── ocr/
    ├── document/
    └── image/
```

## Route Subfolders

Each feature now has a `routes/` subfolder containing:

1. **`__init__.py`** - Blueprint definition and route imports
2. **Domain-specific route files** - Grouped by functionality

### Dashboard Routes
- `health.py` - `/`, `/health`, `/ping`
- `files.py` - `/files`, `/files/stats`, `/files/recent`
- `system.py` - `/system/info`, `/system/printers`, `/system/storage`

### Phone Routes
- `upload.py` - `/upload`, `/upload/multiple`, `/upload/status/<filename>`
- `capture.py` - `/capture`, `/capture/scan`, `/captures`, `/capture/<filename>`
- `quality.py` - `/quality/check`, `/quality/enhance`, `/quality/resize`

### Document Routes
- `files.py` - `/files`, `/files/<doc_id>`, `/upload`
- `thumbnails.py` - `/thumbnails/<doc_id>`, `/thumbnails/batch`
- `conversion.py` - `/convert`, `/convert/pdf-to-images`, `/convert/images-to-pdf`

### OCR Routes (Document Sub-feature)
- `extraction.py` - `/extract`, `/extract/<doc_id>`, `/result/<result_id>`
- `batch.py` - `/batch`, `/batch/<batch_id>`, `/batch/<batch_id>/cancel`
- `status.py` - `/status`, `/languages`, `/config`, `/health`

### Print Routes
- `jobs.py` - `/job`, `/job/<job_id>`, `/jobs`, `/job/<job_id>/cancel`
- `queue.py` - `/queue`, `/queue/clear`, `/queue/pause`, `/queue/resume`
- `config.py` - `/printers`, `/printers/default`, `/settings`

### Voice Routes
- `session.py` - `/start`, `/end`, `/status`
- `transcription.py` - `/transcribe`, `/transcribe/stream`
- `chat.py` - `/chat`, `/chat/history`, `/chat/clear`
- `tts.py` - `/speak`, `/process`, `/voices`, `/tts/settings`

### Connection Routes
- `wifi.py` - `/wifi/status`, `/wifi/networks`, `/wifi/connect`
- `camera.py` - `/camera/status`, `/camera/list`, `/camera/test`
- `printer.py` - `/printer/status`, `/printer/discover`, `/printer/test`
- `services.py` - `/services/status`, `/services/ollama`, `/services/validate`

### Orchestration Routes
- `command.py` - `/command`, `/command/parse`, `/commands`, `/command/history`
- `workflow.py` - `/workflow`, `/workflow/<id>/run`, `/workflows`
- `config.py` - `/config`, `/config/voice`, `/config/defaults`

## Blueprint Registration

All blueprints are registered in the main app factory:

```python
# app/__init__.py
from app.features.dashboard import dashboard_bp
from app.features.phone import phone_bp
from app.features.document import document_bp, ocr_bp
from app.features.print import print_bp
from app.features.voice import voice_bp
from app.features.connection import connection_bp
from app.features.orchestration import orchestration_bp

def create_app():
    app = Flask(__name__)
    
    app.register_blueprint(dashboard_bp, url_prefix='/api')
    app.register_blueprint(phone_bp, url_prefix='/api/phone')
    app.register_blueprint(document_bp, url_prefix='/api/document')
    app.register_blueprint(ocr_bp, url_prefix='/api/ocr')
    app.register_blueprint(print_bp, url_prefix='/api/print')
    app.register_blueprint(voice_bp, url_prefix='/api/voice')
    app.register_blueprint(connection_bp, url_prefix='/api/connection')
    app.register_blueprint(orchestration_bp, url_prefix='/api/orchestration')
    
    return app
```

## Benefits of This Structure

1. **Separation of Concerns** - Each feature is self-contained
2. **Scalability** - Easy to add new features or routes
3. **Maintainability** - Clear file organization
4. **Testability** - Each module can be tested independently
5. **Team Collaboration** - Different developers can work on different features

## Migration Notes

- The original `app.py` (6248 lines) has been split across all these modules
- All routes maintain the same API endpoints for backward compatibility
- Services extract business logic from route handlers
- Socket handlers are consolidated in `sockets/handlers.py`

## Status

✅ Core infrastructure created
✅ All 7 feature modules created
✅ Route subfolders implemented for all features
✅ OCR routes fully modularized
✅ Socket handlers consolidated
⏳ Service layer implementation (ongoing)
⏳ Migration of existing app.py code (ongoing)
