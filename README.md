<div align="center">

# 🪷 PrintChakra

### *AI-Powered Smart Print & Scan Solution with Voice Control*

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg?style=for-the-badge)](https://github.com/chaman2003/printchakra)
[![Python](https://img.shields.io/badge/Python-3.8+-green.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000.svg?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Transform your documents with intelligent OCR processing, real-time automation, and complete hands-free voice control**

---

## 📑 Table of Contents

**Core Documentation**
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Quick Start Guide](#-quick-start-guide)
- [Architecture](#️-architecture)
- [Technology Stack](#-technology-stack)
- [API Reference](#-api-reference)

**Voice AI System** 🎤
- [Voice Control Overview](#-voice-control-with-ai-assistant)
- [Voice Commands](#-voice-command-examples)

**Modularization & Structure**
- [Modular Architecture](#-modular-architecture)
- [Project Structure](#-project-structure)
- [Backend Architecture](#-backend-architecture-modular)
- [Frontend Architecture](#-frontend-architecture-modular)

**Configuration & Setup**
- [AI Models Setup](#-ai-models-setup)
- [Environment Configuration](#-environment-configuration)
- [Preview Size Adjustment](#-preview-size-adjustment)

**Additional Resources**
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License & Author](#-license)

---

</div>

## 💡 Overview

PrintChakra is a **complete automated document processing system** with **AI-powered hands-free orchestration** that combines advanced OCR technology, voice control, and seamless web/mobile interfaces. Simply speak commands like "print this document" or "scan in high quality" and watch the AI intelligently handle the entire workflow.

### What Makes PrintChakra Unique?

- 🎤 **Voice-Controlled Operations** - Complete hands-free print and scan control with AI chat
- 📱 **Mobile-First Design** - Auto-triggered phone capture with real-time processing
- 🔍 **Advanced OCR Pipeline** - 12-stage sequential processing with multi-strategy document detection
- ⚡ **Real-Time Synchronization** - Socket.IO WebSocket communication for instant updates
- 🏗️ **Modular Architecture** - Clean, maintainable codebase with separation of concerns

Perfect for digitizing physical documents, extracting text from images, and building automated document workflows with voice control and real-time synchronization.

---

## ✨ Key Features
<table>
<tr>
<td width="50%">

### 🖥️ **Desktop Dashboard**
- 📊 Manage processed documents
- 📄 View extracted OCR text
- 📥 Download enhanced images
- ⚡ Real-time auto-refresh
- 🎛️ Advanced processing options
- 🔧 Pipeline configuration display
- 📦 Batch file operations
- 🔄 Socket.IO synchronization

<td width="50%">

### 📱 **Mobile Capture**
- 📷 Auto-trigger from desktop
- 🎯 Manual photo upload
- 🔄 Instant processing feedback
- 🌐 Socket.IO synchronization
- ✨ Seamless user experience
- ✅ **Real-time quality validation**
- 📊 Blur & focus score metrics
- 🎯 Document border detection

</td>
</tr>
<tr>
<td width="50%">

### 🤖 **AI Processing Pipeline**
- 🔍 Multi-strategy document detection
- ✂️ Perspective correction & cropping
- � 12-stage sequential processing
- 📐 Corner refinement algorithms
- 🖼️ 4-stage image enhancement
- 📝 Multi-configuration OCR (15 attempts)
- � Automatic best-result selection
- 📋 Document classification (optional)

</td>
<td width="50%">

### 🚀 **Developer Experience**
- ⚡ One-command startup scripts
- 🔧 PowerShell automation
- 🌍 ngrok public tunneling
- 📦 Pre-configured deployment
- 🛠️ Comprehensive logging
- 📚 Complete API documentation
- 🧪 Advanced testing tools
- 🔄 File conversion (PDF, DOCX)

</td>
</tr>
</table>

---

## 🎤 Voice Control with AI Assistant

PrintChakra features a **hands-free voice assistant** for document operations powered by Whisper, Smollm2, and Microsoft Ravi TTS.

---


###  Key Features

- **Wake Word System**: Start commands with 'Hey', 'Hi', 'Hello', or 'Okay'
- **Speech Recognition**: Whisper Large-v3 Turbo (local, offline)
- **Text-to-Speech**: Microsoft Ravi (Indian English)
- **Conversational AI**: Smollm2:135m via Ollama
- **Contextual Memory**: Maintains conversation history

###  How to Use

1. Click **'Talk with PrintChakra AI'** button
2. Click **'Start Voice Session'**
3. Wait for 'Voice AI Ready!'
4. Speak your command with wake word: 'Hey, print this document'
5. AI responds with voice and text
6. Say 'bye printchakra' to end session

###  Voice Command Examples

| Command | Result |
|---------|--------|
| 'Hey, print this document' | Start print workflow |
| 'Hi, scan a document' | Start scan workflow |
| 'Hello, what can you do?' | Show capabilities |
| 'Okay, show status' | Current system status |
| 'Hey, bye printchakra' | End voice session |


---

## 🚀 Quick Start

### 📋 Prerequisites

| Requirement | Version | Download Link |
|-------------|---------|---------------|
| 🐍 Python | 3.8+ | [python.org](https://www.python.org/downloads/) |
| 📦 Node.js | 16+ | [nodejs.org](https://nodejs.org/) |
| 🔍 Tesseract OCR | Latest | [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) |
| 🔧 Git | Latest | [git-scm.com](https://git-scm.com/) |

### ⚡ Installation

```bash
# 1. Clone the repository
git clone https://github.com/chaman2003/printchakra.git
cd printchakra

# 2. Setup backend (automated - creates venv + installs dependencies)
.\scripts\setup-backend.ps1

# 3. Setup frontend
cd frontend
npm install
```

> 💡 **New!** The `setup-backend.ps1` script automatically creates a virtual environment and installs all Python dependencies. No manual setup needed!

### 🎯 Launch Application

**Option A: Start Everything (Recommended)**
```powershell
# From project root
.\scripts\start-full-online.ps1    # With ngrok tunneling
# OR
.\scripts\start-full-offline.ps1   # Local only
```

**Option B: Start Components Separately**
```powershell
# Backend only
.\scripts\backend.ps1

# Frontend only (in new terminal)
cd frontend
npm start
```

**Access URLs:**
- 🔌 **Backend API**: http://localhost:5000
- 🖥️ **Frontend Dashboard**: http://localhost:3000
- 📱 **Mobile Capture**: http://localhost:3000/phone
- 🌐 **Public URL**: Check ngrok console for tunnel URL

### 🧪 Testing

```bash
# Run backend tests
cd backend
.\venv\Scripts\Activate.ps1
python -m pytest tests/ -v

# Run frontend tests
cd frontend
npm test
```

---

## 📁 Project Structure

```
printchakra/
│
├── 🔧 PowerShell Scripts (scripts/)
│   ├── setup-backend.ps1        # Automated backend setup + venv
│   ├── backend.ps1              # Start Flask backend only
│   ├── ngrok.ps1                # Start ngrok tunneling
│   ├── start-full-online.ps1    # Start all services + ngrok
│   ├── start-full-offline.ps1   # Start all services locally
│   ├── cleanup-data.ps1         # Clean data directories
│   ├── backup-data.ps1          # Backup processed files
│   └── restart-all.ps1          # Restart all services
│
├── 🐍 Backend (Flask + Python)
│   ├── app.py                   # Main Flask application (2074 lines)
│   ├── run.py                   # Alternative entry point
│   ├── requirements.txt         # Python dependencies (25+ packages)
│   ├── config/
│   │   ├── settings.py          # Centralized configuration
│   │   ├── __init__.py
│   │   └── __pycache__/
│   ├── modules/                 # Core processing modules
│   │   ├── pipeline.py          # Main processing pipeline
│   │   ├── document_detection.py # Multi-strategy detection
│   │   ├── image_enhancement.py # 4-stage enhancement
│   │   ├── ocr_ai.py           # Multi-config OCR (15 attempts)
│   │   ├── utility.py           # Helper functions
│   │   ├── api_endpoints.py     # API endpoint handlers
│   │   ├── export.py            # PDF/Export functionality
│   │   ├── file_converter.py    # File format conversion
│   │   ├── scanning.py          # Scanning utilities
│   │   ├── storage.py           # File storage management
│   │   ├── enhanced_pipeline.py # Advanced pipeline
│   │   └── __init__.py
│   ├── data/                   # Consolidated data directory
│   │   ├── uploads/            # Original uploaded files
│   │   ├── processed/          # Enhanced images
│   │   ├── processed_text/     # Extracted OCR text
│   │   ├── pdfs/               # Generated PDFs
│   │   └── converted/          # Converted files
│   ├── print_scripts/          # Windows printing
│   │   ├── create_blank_pdf.py # PDF generation
│   │   └── print-file.py       # Print automation
│   ├── logs/                   # Application logs
│   ├── tests/                  # Unit tests
│   │   ├── test_api.py
│   │   ├── test_conversion.py
│   │   └── test_sequential_processing.py
│   ├── static/                 # Static assets
│   └── __pycache__/
│
├── ⚛️ Frontend (React + TypeScript)
│   ├── package.json             # Node dependencies
│   ├── tsconfig.json            # TypeScript config
│   ├── vercel.json              # Vercel deployment
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── src/
│   │   ├── App.tsx              # Main app component
│   │   ├── index.tsx            # React entry point
│   │   ├── config.ts            # API configuration (18 endpoints)
│   │   ├── theme.ts             # Chakra UI theme
│   │   ├── components/
│   │   │   └── Iconify.tsx      # Icon component
│   │   └── pages/
│   │       ├── Dashboard.tsx    # Document management (1076 lines)
│   │       ├── Phone.tsx        # Mobile capture interface
│   │       ├── Dashboard.css
│   │       └── Phone.css
│   ├── build/                   # Production build
│   └── node_modules/
│
├── 📚 Documentation & Notebooks
│   ├── README.md                # This file
│   ├── printchakra_clean.ipynb  # Original processing notebook
│   └── processing.ipynb         # Additional processing examples
│
├── 🔧 Configuration Files
│   ├── .gitignore               # Git ignore rules
│   ├── .env.example             # Environment variables
│   └── .env.local               # Local environment
│
└── 📦 Additional Files
    ├── input.jpg                # Test input image
    ├── output.jpg               # Test output image
    └── restart-all.ps1          # Service restart script
```

---

## 🏛️ Modular Architecture

PrintChakra features a **clean, modular architecture** with complete separation of concerns for both backend and frontend.

### Backend Modular Structure

```
backend/
├── app_modular.py              # ⭐ NEW modular entry point
├── models/                     # Data models & schemas
│   ├── document.py
│   ├── file_info.py
│   ├── scan_config.py
│   └── print_config.py
├── routes/                     # API route blueprints
│   ├── file_routes.py
│   ├── scan_routes.py
│   ├── print_routes.py
│   ├── ocr_routes.py
│   └── conversion_routes.py
├── services/                   # Business logic layer
│   ├── file_service.py
│   ├── scan_service.py
│   ├── print_service.py
│   ├── ocr_service.py
│   ├── conversion_service.py
│   └── orchestration_service.py  # 🤖 AI Orchestration
├── middleware/                 # Request/response middleware
│   ├── error_handler.py
│   ├── cors_config.py
│   └── request_logger.py
├── utils/                      # Utility functions
│   ├── logger.py
│   ├── file_utils.py
│   └── image_utils.py
├── models_ai/                  # 🤖 AI Models storage
│   ├── whisper/               # Speech-to-text models
│   ├── ollama/                # Language models cache
│   └── tts/                   # Text-to-speech configs
└── config/                    # Configuration management
    └── settings.py
```

### Frontend Modular Structure

```
frontend/src/
├── features/                   # Feature-based modules
│   └── dashboard/
│       ├── components/        # Feature-specific components
│       ├── hooks/            # Custom React hooks
│       └── types/            # TypeScript definitions
├── shared/                    # Shared across features
│   ├── components/           # Reusable components
│   └── ui/                   # UI primitives
├── services/                  # API service classes
│   ├── index.ts             # FileService, ScanService, etc.
│   └── orchestration.ts     # 🤖 Orchestration API
├── components/               # Global components
│   └── OrchestrationOverlay.tsx  # 🤖 Orchestration UI
└── lib/                      # Utilities & helpers
    └── utils.ts
```

### Benefits of Modular Architecture

| ✨ **Aspect** | 🎯 **Benefit** |
|---------------|---------------|
| **Separation of Concerns** | Routes handle HTTP, Services handle logic, Models define data |
| **Maintainability** | Smaller focused files, clear organization |
| **Reusability** | Services shared across routes, utilities everywhere |
| **Scalability** | Add features independently without breaking existing code |
| **Testability** | Test components in isolation, mock dependencies easily |
| **Type Safety** | Full TypeScript coverage with strong typing |

### Using Modular Services

**Backend**:
```python
# Run modular backend
python backend/app_modular.py

# Or legacy backend (both work)
python backend/app.py
```

**Frontend**:
```typescript
import { FileService, ScanService } from '@/services';
import { formatFileSize, debounce } from '@/lib/utils';

// List files with type safety
const files = await FileService.listFiles();

// Format file size
const size = formatFileSize(1024); // "1 KB"

// Debounce function
const debouncedSearch = debounce(searchFunction, 300);
```

### Available Services

**Backend**:
- `FileService` - File operations
- `ScanService` - Scanner operations
- `PrintService` - Printer operations
- `OCRService` - OCR processing
- `ConversionService` - File conversions
- `OrchestrationService` - 🤖 AI workflow management

**Frontend**:
- `FileService` - File API calls
- `ScanService` - Scanner API calls
- `PrintService` - Printer API calls
- `OCRService` - OCR API calls
- `ConversionService` - Conversion API calls

### Migration Timeline

✅ **Phase 1: Setup** - COMPLETE
- Modular structure created
- Services implemented
- Both apps working side-by-side

⏳ **Phase 2: Adoption** - Gradual
- Start using new services
- Add type definitions
- Test thoroughly

⏳ **Phase 3: Complete** - Future
- Full migration to modular architecture
- Legacy code archived

---

## 🤖 AI Models Setup

PrintChakra uses multiple AI models for voice, language, and document processing. All models are organized in the `backend/models_ai/` directory.

### Directory Structure

```
backend/models_ai/
├── whisper/          # Speech-to-text models
│   ├── base/         # Base model (244MB) - Default
│   ├── tiny/         # Tiny model (75MB) - Fastest
│   └── ggml/         # Quantized models (optional)
├── ollama/           # Language model cache
│   └── smollm2/      # Smollm2:135m cache
└── tts/              # Text-to-speech configs
    └── voices/       # Voice configurations
```

### Model Downloads

#### 1. Whisper Models (Automatic)

Whisper models download automatically on first use.

**Recommended**: `base` model (244MB, best speed/quality balance)

```python
# Models auto-download when first used
# No manual setup required
```

Available models:
- `tiny` - 75MB - Fastest, lower accuracy
- `base` - 244MB - **Recommended** ⭐
- `small` - 466MB - Better accuracy
- `medium` - 1.5GB - High accuracy
- `large-v3` - 3.1GB - Best accuracy

#### 2. Ollama Models (Manual Setup)

```bash
# Install Ollama from https://ollama.ai

# Pull Smollm2 model (135M parameters - very fast)
ollama pull smollm2:135m

# Verify installation
ollama list
```

#### 3. TTS (No Download Required)

PrintChakra uses system TTS (pyttsx3) - no downloads needed:
- **Windows**: Microsoft SAPI voices (built-in)
- **macOS**: NSSpeechSynthesizer
- **Linux**: espeak

### Configuration

**Change Whisper Model** (`modules/voice_ai.py`):
```python
self.model = whisper.load_model("base")  # Change to "tiny", "small", etc.
```

**Change Ollama Model** (`modules/voice_ai.py`):
```python
def __init__(self, model_name: str = "smollm2:135m"):  # Change model name
```

### Model Storage Locations

- **Whisper**: `~/.cache/whisper/` or `C:\Users\<username>\.cache\whisper\`
- **Ollama**: `~/.ollama/models/`
- **TTS**: System voices (no storage)

### GPU Acceleration

For 2-3x faster transcription:

```bash
# Install CUDA Toolkit
# Install PyTorch with CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

Models automatically use GPU if available.

### Disk Space Requirements

| Component | Size | Notes |
|-----------|------|-------|
| Whisper base | 244 MB | Recommended |
| Smollm2:135m | ~100 MB | Via Ollama |
| **Total** | **~350 MB** | Minimal setup |

### Performance Tips

- **Fast transcription**: Use `tiny` model + GPU
- **High accuracy**: Use `base` or `small` model
- **Low memory**: Use `tiny` model, close other apps
- **GPU**: 2-3x faster than CPU

---

## 📐 Preview Size Adjustment

Customize document preview and modal dimensions to fit your screen.

### Document Preview Size

**File**: `frontend/src/components/DocumentPreview.tsx` (Lines 22-32)

```typescript
const PREVIEW_SIZE = {
  portrait: {
    width: 28,   // vw units - increase for wider preview
    height: 48,  // vh units - increase for taller preview
  },
  landscape: {
    width: 42,   // vw units
    height: 32,  // vh units
  },
  containerMinHeight: '50vh',  // Increase if cut off
};
```

### Modal & Container Size

**File**: `frontend/src/pages/Dashboard.tsx` (Lines 1-20)

```typescript
const MODAL_CONFIG = {
  modal: {
    maxHeight: '90vh',      // Maximum modal height
    maxWidth: '95vw',       // Maximum modal width
  },
  previewBox: {
    maxHeight: '90vh - 12rem',  // Preview box max height
  },
};
```

### Common Adjustments

**Preview too small?**
- Increase `portrait.height` from `48` to `55` or `60`
- Increase `portrait.width` from `28` to `32` or `35`

**Preview cut off at bottom?**
- Increase `containerMinHeight` from `'50vh'` to `'60vh'`
- Increase `previewBox.maxHeight` from `'90vh - 12rem'` to `'90vh - 10rem'`

**Modal too cramped?**
- Change `modal.maxHeight` from `'90vh'` to `'95vh'`
- Change `modal.maxWidth` from `'95vw'` to `'98vw'`

### Units Explained

- **vh** = Viewport Height (1vh = 1% of screen height)
- **vw** = Viewport Width (1vw = 1% of screen width)
- **rem** = Relative to root font size (usually 16px)

---

## 🛠️ Technology Stack

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| ![Flask](https://img.shields.io/badge/Flask-3.0.0-000000?logo=flask) | 3.0.0 | Web framework & API |
| ![Socket.IO](https://img.shields.io/badge/Socket.IO-5.3.5-010101?logo=socketdotio) | 5.3.5 | Real-time WebSocket |
| ![OpenCV](https://img.shields.io/badge/OpenCV-4.10.0-5C3EE8?logo=opencv) | 4.10.0 | Computer vision & image processing |
| ![Tesseract](https://img.shields.io/badge/Tesseract-OCR-4285F4) | Latest | Text extraction & OCR |
| ![NumPy](https://img.shields.io/badge/NumPy-2.1.1-013243) | 2.1.1 | Numerical computing |
| ![Pillow](https://img.shields.io/badge/Pillow-11.0+-blue) | 11.0+ | Image manipulation |
| ![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3+-F7931E) | 1.3+ | Machine learning (classification) |
| ![pywin32](https://img.shields.io/badge/pywin32-307-blue) | 307 | Windows printing API |
| ![fpdf2](https://img.shields.io/badge/fpdf2-2.7.9-red) | 2.7.9 | PDF generation |
| ![PyMuPDF](https://img.shields.io/badge/PyMuPDF-1.23+-red) | 1.23+ | PDF manipulation |

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| ![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react) | 19.2.0 | UI framework |
| ![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-3178C6?logo=typescript) | 4.9.5 | Type safety |
| ![Chakra UI](https://img.shields.io/badge/Chakra_UI-2.10.3-319795) | 2.10.3 | Component library |
| ![Socket.IO](https://img.shields.io/badge/Socket.IO_Client-4.8.1-010101) | 4.8.1 | WebSocket client |
| ![Axios](https://img.shields.io/badge/Axios-1.12.2-5A29E4) | 1.12.2 | HTTP requests |
| ![React Router](https://img.shields.io/badge/React_Router-7.9.4-CA4245) | 7.9.4 | Navigation |
| ![Framer Motion](https://img.shields.io/badge/Framer_Motion-11.11.17-0055FF) | 11.11.17 | Animations |

### Infrastructure & Tools

- **ngrok** - Public tunneling service
- **Vercel** - Frontend deployment platform
- **PowerShell** - Windows automation scripts
- **Git** - Version control
- **Jupyter** - Development notebooks

---

## 📡 API Reference

### Core REST Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/` | Server info & health check | Service metadata |
| `GET` | `/health` | Detailed health check | System status & features |
| `POST` | `/upload` | Upload & process image | Processing result |
| `GET` | `/files` | List processed files | File list with metadata |
| `GET` | `/processed/<file>` | Get enhanced image | Image file |
| `GET` | `/uploads/<file>` | Get original image | Image file |
| `DELETE` | `/delete/<file>` | Delete file & text | Success confirmation |
| `GET` | `/ocr/<file>` | Get extracted text | OCR text content |
| `POST` | `/print` | Trigger phone capture | Print command result |
| `GET` | `/processing-status/<file>` | Get processing status | Real-time progress |

### Advanced Processing Endpoints

| Method | Endpoint | Description | Features |
|--------|----------|-------------|----------|
| `POST` | `/process/advanced` | Advanced processing pipeline | Custom options, AI enhancement |
| `POST` | `/validate/quality` | Image quality validation | Blur/focus scoring |
| `POST` | `/detect/document` | Document border detection | Real-time corner detection |
| `POST` | `/export/pdf` | Export to PDF | Batch PDF generation |
| `GET` | `/pdf/<filename>` | Download PDF | Generated PDF files |
| `GET` | `/pipeline/info` | Pipeline configuration | Module status & features |
| `POST` | `/classify/document` | Document classification | ML-based categorization |
| `POST` | `/batch/process` | Batch file processing | Sequential processing |

### File Conversion Endpoints

| Method | Endpoint | Description | Formats |
|--------|----------|-------------|----------|
| `POST` | `/convert` | Convert file formats | JPG, PNG, PDF, DOCX |
| `GET` | `/converted/<file>` | Download converted file | Converted files |
| `GET` | `/get-converted-files` | List converted files | File metadata |

### Socket.IO Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connect` | Client → Server | - | Client connection established |
| `disconnect` | Client → Server | - | Client disconnected |
| `upload_complete` | Server → Client | `{filename, success}` | File upload completed |
| `processing_complete` | Server → Client | `{filename, text, ...}` | OCR processing done |
| `processing_progress` | Server → Client | `{step, total, stage}` | Real-time progress updates |
| `file_deleted` | Server → Client | `{filename}` | File deletion notification |
| `capture_now` | Server → Client | `{message, timestamp}` | Trigger phone camera |
| `detection_result` | Server → Client | `{corners, success}` | Document detection result |
| `conversion_complete` | Server → Client | `{success_count, fail_count}` | File conversion completed |

---

## � Troubleshooting

### Backend Issues

<details>
<summary><b>Backend won't start</b></summary>

**Solutions:**
- Run setup script first: `.\scripts\setup-backend.ps1`
- Check Python version: `python --version` (need 3.8+)
- Check if venv exists: `Test-Path .\backend\venv`
- Manually activate venv: `.\backend\venv\Scripts\Activate.ps1`
- Reinstall dependencies: `pip install -r requirements.txt`
- Check port 5000: `netstat -ano | findstr :5000`
- Install Tesseract OCR and add to PATH

</details>

<details>
<summary><b>Socket.IO connection errors</b></summary>

**Solutions:**
- Check `frontend/src/config.ts` - ensure correct API_BASE_URL
- Verify Socket.IO versions match (backend 5.3.5, frontend 4.8.1)
- Check CORS settings in `backend/config/settings.py`
- Restart both backend and frontend servers
- Check browser console for WebSocket errors
- Use polling fallback: `transports: ['polling']`

</details>

<details>
<summary><b>OCR not working / Tesseract errors</b></summary>

**Solutions:**
- Install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
- Add to PATH: `C:\Program Files\Tesseract-OCR`
- Update path in `backend/app.py` if needed
- Test with: `tesseract --version`
- Check language data: `tesseract --list-langs`

</details>

### Frontend Issues

<details>
<summary><b>Frontend won't start</b></summary>

**Solutions:**
- Check Node.js version: `node --version` (need 16+)
- Install dependencies: `npm install` in frontend folder
- Check port 3000: `netstat -ano | findstr :3000`
- Clear cache: `npm cache clean --force`
- Check TypeScript errors: `npm run build`

</details>

<details>
<summary><b>Images not loading</b></summary>

**Solutions:**
- Check ngrok bypass header in `frontend/src/config.ts`
- Verify API_BASE_URL configuration
- Check browser network tab for CORS errors
- Use blob URLs for image loading (implemented)
- Check backend CORS settings

</details>

### Processing Issues

<details>
<summary><b>Document detection failing</b></summary>

**Solutions:**
- Ensure good lighting and contrast
- Hold camera steady for focus
- Check image quality scores in logs
- Adjust detection parameters in `backend/config/settings.py`
- Use manual upload if auto-detection fails

</details>

<details>
<summary><b>OCR quality poor</b></summary>

**Solutions:**
- Ensure clear, well-lit images
- Check image enhancement settings
- Try different PSM modes (3, 6, 4)
- Verify Tesseract language data
- Use preprocessing options

</details>

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[README.md](README.md)** | Complete setup & usage guide |
| **[printchakra_clean.ipynb](printchakra_clean.ipynb)** | Original processing algorithm notebook |
| **[processing.ipynb](processing.ipynb)** | Additional processing examples |
| **[backend/README.md](backend/README.md)** | Backend-specific documentation |
| **[frontend/README.md](frontend/README.md)** | Frontend development guide |

---

## 🗺️ Roadmap

### ✅ Completed Features (v2.1.0)

- [x] **Core Processing Pipeline**
  - Multi-strategy document detection (8 scoring factors)
  - 12-stage sequential processing with progress tracking
  - 4-stage image enhancement (brightness, contrast, CLAHE, denoising)
  - Multi-configuration OCR (15 attempts with best selection)

- [x] **Backend Architecture**
  - Flask 3.0 with Socket.IO 5.3.5 real-time communication
  - Modular architecture with 12 core modules
  - Centralized configuration system
  - Comprehensive error handling and logging

- [x] **Frontend Interface**
  - React 19 with TypeScript and Chakra UI
  - Real-time Socket.IO synchronization
  - Mobile-responsive design with camera integration
  - Advanced file management with batch operations

- [x] **Advanced Features**
  - Quality validation with blur/focus scoring
  - Document border detection with corner refinement
  - File conversion (PDF, DOCX, multiple formats)
  - Batch processing with sequential execution
  - PDF export and generation
  - Windows printing automation

- [x] **Developer Experience**
  - PowerShell automation scripts (8 scripts)
  - One-command setup and deployment
  - Comprehensive testing suite
  - ngrok public tunneling integration
  - Environment-based configuration

### 🎯 Future Enhancements

- [ ] **AI/ML Improvements**
  - Custom document classification models
  - Advanced OCR with transformer models
  - Auto-cropping optimization
  - Quality enhancement AI

- [ ] **Cloud Integration**
  - AWS S3 storage integration
  - Google Cloud Vision API
  - Multi-region deployment
  - Backup and sync features

- [ ] **Advanced Processing**
  - Multi-page document handling
  - Form recognition and extraction
  - Signature detection and verification
  - Table and structure recognition

- [ ] **User Experience**
  - Progressive Web App (PWA)
  - Offline processing capabilities
  - Advanced batch operations UI
  - Custom processing profiles

- [ ] **Enterprise Features**
  - User authentication and authorization
  - Team collaboration features
  - Audit logging and compliance
  - API rate limiting and quotas

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

**Development Setup:**
```bash
# Backend development
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py

# Frontend development
cd frontend
npm install
npm start
```

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Chaman S**

- 🐙 GitHub: [@chaman2003](https://github.com/chaman2003)
- 📧 Email: [chamans7952@gmail.com](mailto:chamans7952@gmail.com)
- 📱 LinkedIn: [chaman2003](https://www.linkedin.com/in/chaman2003/)

---

## 🙏 Acknowledgments

Special thanks to:

- **[Tesseract OCR](https://github.com/tesseract-ocr/tesseract)** - Google's OCR engine
- **[OpenCV](https://opencv.org/)** - Computer vision library
- **[Flask](https://flask.palletsprojects.com/)** - Python web framework
- **[React](https://reactjs.org/)** - JavaScript UI library
- **[Socket.IO](https://socket.io/)** - Real-time communication
- **[Chakra UI](https://chakra-ui.com/)** - React component library
- **[ngrok](https://ngrok.com/)** - Public tunneling service
- **[NumPy](https://numpy.org/)** - Scientific computing
- **[scikit-learn](https://scikit-learn.org/)** - Machine learning

---

## 📊 System Requirements

### Minimum Requirements
- **OS**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 18.04+)
- **RAM**: 4GB
- **Storage**: 2GB free space
- **Network**: Stable internet for ngrok tunneling

### Recommended Requirements
- **OS**: Windows 11, macOS 12+, Linux (Ubuntu 20.04+)
- **RAM**: 8GB
- **Storage**: 5GB free space
- **CPU**: Multi-core processor
- **Network**: High-speed internet

---

## 📚 Complete Documentation Index

### Core Documentation
- **README.md** (This file) - Complete comprehensive guide
- **QUICK_START.md** - Quick setup and basic usage
- **ARCHITECTURE_DIAGRAMS.md** - Visual system diagrams

### AI Orchestration
- **ORCHESTRATION_GUIDE.md** - Technical orchestration documentation
- **ORCHESTRATION_QUICKSTART.md** - 5-minute orchestration setup
- **ORCHESTRATION_SUMMARY.md** - Implementation overview
- **ARCHITECTURE_ORCHESTRATION.md** - Orchestration system architecture

### Modularization
- **MODULARIZATION_COMPLETE.md** - Modular architecture summary
- **backend/ARCHITECTURE.md** - Backend modular architecture guide
- **frontend/ARCHITECTURE.md** - Frontend modular architecture guide

### Configuration
- **PREVIEW_SIZE_GUIDE.md** - UI sizing customization
- **backend/models_ai/README.md** - AI models setup guide
- **backend/config/settings.py** - Backend configuration
- **frontend/src/config.ts** - Frontend API configuration

### Testing
- **backend/tests/README.md** - Backend testing guide
- **backend/tests/test_orchestration.py** - Orchestration tests

---

## 🎓 Getting Started Paths

### 🚀 For Quick Setup
1. Read [Quick Start](#-quick-start-guide)
2. Try [AI Orchestration Quick Start](#-ai-orchestration-quick-start)
3. Review [Voice Command Examples](#-voice-command-examples)

### 🏗️ For Developers
1. Study [Modular Architecture](#-modular-architecture)
2. Review `backend/ARCHITECTURE.md`
3. Check `frontend/ARCHITECTURE.md`
4. Explore service classes in `backend/services/`

### 🤖 For AI Features
1. Setup [AI Models](#-ai-models-setup)
2. Read [Orchestration Guide](ORCHESTRATION_GUIDE.md)
3. Test voice commands
4. Customize workflows

### 🎨 For UI Customization
1. Read [Preview Size Guide](#-preview-size-adjustment)
2. Modify `PREVIEW_SIZE` constants
3. Adjust `MODAL_CONFIG` settings
4. Test at different screen sizes

---

## 🆘 Support & Resources

### Documentation
- 📖 Full Documentation: See [Documentation Index](#-complete-documentation-index)
- 🤖 AI Orchestration: [ORCHESTRATION_GUIDE.md](ORCHESTRATION_GUIDE.md)
- 🏗️ Architecture: [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)
- 🧪 Testing: [backend/tests/README.md](backend/tests/README.md)

### Community
- 💬 Issues: [GitHub Issues](https://github.com/chaman2003/printchakra/issues)
- 📧 Email: [chamans7952@gmail.com](mailto:chamans7952@gmail.com)
- 💼 LinkedIn: [chaman2003](https://www.linkedin.com/in/chaman2003/)

### Quick Links
- 🔧 [Troubleshooting](#-troubleshooting)
- 📊 [API Reference](#-api-reference)
- 🗺️ [Roadmap](#-roadmap)
- 🤝 [Contributing](#-contributing)

---

## 🎯 Version Information

**Current Version**: 2.1.0  
**Release Date**: October 31, 2025  
**Status**: ✅ Production Ready

### Latest Features
- ✅ Complete AI Orchestration System with voice control
- ✅ Hands-free print and scan operations
- ✅ Modular backend and frontend architecture
- ✅ Real-time WebSocket synchronization
- ✅ Natural language command processing
- ✅ Intelligent workflow management
- ✅ Comprehensive documentation suite

### System Requirements
- Python 3.8+ with virtual environment
- Node.js 16+ with npm
- Tesseract OCR
- Ollama (for AI features)
- 350MB+ disk space for AI models
- 4GB+ RAM (8GB recommended)

---

<div align="center">

### 💫 Made with ❤️ for intelligent document processing

**PrintChakra v2.1.0** • Complete AI-Powered Document Processing Solution

[⬆ Back to Top](#-printchakra)

---

**Key Highlights**:  
🤖 AI Orchestration • 🎤 Voice Control • 📱 Mobile-First • 🔍 Advanced OCR  
⚡ Real-Time Sync • 🏗️ Modular Architecture • 📚 Complete Documentation

---

</div>
