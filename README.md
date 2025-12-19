# PrintChakra

<div align="center">

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/chaman2003/printchakra)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**AI-Powered Document Processing & Intelligent Print Automation**

*Transform how you handle documents with voice-controlled, AI-assisted printing and scanning workflows*

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [System Architecture](#-system-architecture)
- [Configuration](#-configuration)
- [Usage Guide](#-usage-guide)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License & Author](#-license--author)

---

## 🎯 Overview

PrintChakra is a comprehensive, full-stack document processing platform that revolutionizes printing and scanning workflows. It seamlessly integrates advanced OCR technology, AI-assisted document understanding, voice-enabled interaction, and intelligent printer management into a unified system.

### Why PrintChakra?

- **🎤 Hands-Free Voice Control** – Speak commands to configure print/scan jobs, manage queues, and control devices
- **🧠 AI-Powered Intent Detection** – Automatically configures workflows from natural language commands
- **📸 Advanced OCR Pipeline** – 12-stage image enhancement and text extraction for maximum accuracy
- **⚡ Real-Time Synchronization** – WebSocket-powered instant updates across all interfaces
- **🔧 Modular Architecture** – Easy to extend with custom integrations and workflows

---

## ✨ Key Features

### Document Management
- **Multi-Format Support** – Process PDFs, images, Word documents, and scanned files
- **Intelligent OCR Pipeline** – Extract text with 12-stage image enhancement and quality scoring
- **Batch Processing** – Handle dozens or hundreds of documents with single commands
- **Format Conversion** – Automatic conversion between PDF, images, and text formats

### Printing & Scanning
- **Smart Print Configuration** – Paper size, orientation, color mode, quality, copy count, collation, stapling
- **Advanced Scan Configuration** – DPI, color mode, file format, batch scanning, automatic document detection
- **Multi-Printer Support** – Manage multiple printers simultaneously from unified interface
- **Print Queue Management** – Real-time monitoring and control of active print jobs

### Voice & AI
- **Continuous Voice Listening** – 10-15x faster Whisper transcription with local processing
- **Natural Language Commands** – Control all functions with voice or text input
- **Contextual AI Analysis** – Intelligent document understanding and metadata extraction
- **Customizable Prompts** – Configure AI behavior through simple config files

### Real-Time Monitoring
- **Live Dashboard** – Real-time document upload and processing status
- **Device Status** – Printer connectivity, driver availability, system resources
- **Connectivity Verification** – Backend API health, device connectivity, link establishment
- **Process Tracking** – Pipeline visualization showing document processing stages

---

## 🛠 Tech Stack

### Backend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Flask 3.0 | REST API & real-time coordination |
| Real-Time | Socket.IO 5.3 | WebSocket synchronization |
| OCR | PaddleOCR 2.7 | Advanced text extraction |
| Voice | OpenAI Whisper | Speech-to-text transcription |
| PDF | PyMuPDF, Poppler | Document processing |
| Image | OpenCV, Pillow | Image enhancement |
| Printing | pywin32 | Windows printer communication |
| AI | Ollama Integration | Local LLM for intent detection |

### Frontend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 19 | UI framework |
| Language | TypeScript 4.9 | Type-safe development |
| UI Library | Chakra UI 2.10 | Accessible components |
| Styling | Emotion | CSS-in-JS styling |
| Communication | Socket.IO Client | Real-time updates |
| HTTP | Axios | API requests |
| Routing | React Router 7 | Page navigation |
| Icons | Iconify, React Icons | Icon system |
| Animations | Framer Motion | Smooth animations |

### DevOps & Deployment
- **Containerization** – Docker support for consistent deployments
- **Frontend Deployment** – Vercel configuration included
- **Environment Management** – Python dotenv for configuration
- **Automation Scripts** – PowerShell scripts for setup and management

---

## 🚀 Quick Start

### Prerequisites
- **Windows 10/11** (due to printer integration)
- **Python 3.8+**
- **Node.js 18+**
- **npm or yarn**
- **Git** (for version control)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/chaman2003/printchakra.git
cd printchakra
```

#### 2. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
# or
yarn install
```

#### 4. Environment Configuration
Create `.env` file in `backend/` directory:
```env
FRONTEND_URL=http://localhost:3000
BACKEND_PUBLIC_URL=http://localhost:5000
API_CORS_ORIGINS=http://localhost:3000

# Ollama Configuration (optional)
OLLAMA_BASE_URL=http://localhost:11434
VOICE_AI_MODEL=smollm2:135m

# Voice Settings
VOICE_SYSTEM_PROMPT_FILE=backend/config/prompts/system_prompt.txt
VOICE_COMMAND_MAPPINGS_FILE=backend/config/prompts/command_mappings.json
```

### Running the Application

#### Option 1: Using PowerShell Scripts (Recommended)
```powershell
# Start all services
.\scripts\run-all.ps1

# Or start individually
.\scripts\backend.ps1
.\scripts\frontend.ps1
```

#### Option 2: Manual Start
```bash
# Terminal 1 - Backend
cd backend
.\venv\Scripts\activate
python app.py

# Terminal 2 - Frontend
cd frontend
npm start
```

**Access the Application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/docs (if available)

---

## 📁 Project Structure

```
printchakra/
│
├── backend/                       # Flask backend application
│   ├── app.py                     # Main application entry point
│   ├── requirements.txt           # Python dependencies
│   ├── REFACTORING_PLAN.md        # Refactoring documentation
│   ├── app/                       # Core application module
│   │   ├── __init__.py
│   │   ├── api/                   # REST API endpoints
│   │   │   ├── __init__.py
│   │   │   └── document.py        # Document management endpoints
│   │   ├── config/                # Configuration module
│   │   │   ├── __init__.py
│   │   │   ├── settings.py        # Configuration management
│   │   │   └── prompts/           # AI system prompts
│   │   ├── core/                  # Core utilities
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── extensions.py      # Flask extensions
│   │   │   ├── logging_config.py  # Logging configuration
│   │   │   └── middleware/        # Middleware modules
│   │   ├── models/                # Data models
│   │   │   ├── __init__.py
│   │   │   ├── document.py        # Document model
│   │   │   ├── file_info.py       # File information model
│   │   │   ├── print_config.py    # Print configuration model
│   │   │   └── scan_config.py     # Scan configuration model
│   │   ├── middleware/            # Middleware handlers
│   │   │   ├── __init__.py
│   │   │   ├── cors_config.py     # CORS configuration
│   │   │   ├── error_handler.py   # Error handling
│   │   │   └── request_logger.py  # Request logging
│   │   ├── features/              # Feature modules
│   │   │   ├── __init__.py
│   │   │   ├── connection/        # Connection management
│   │   │   ├── dashboard/         # Dashboard services
│   │   │   ├── document/          # Document features
│   │   │   ├── orchestration/     # Workflow orchestration
│   │   │   ├── phone/             # Phone integration
│   │   │   ├── print/             # Printing features
│   │   │   └── voice/             # Voice features
│   │   ├── modules/               # Processing modules
│   │   │   ├── __init__.py
│   │   │   ├── api_endpoints.py   # API endpoint definitions
│   │   │   ├── utility.py         # Utility functions
│   │   │   ├── document/          # Document processing
│   │   │   ├── image/             # Image enhancement
│   │   │   ├── ocr/               # OCR pipeline
│   │   │   ├── orchestration/     # Orchestration logic
│   │   │   ├── pipeline/          # Processing pipeline
│   │   │   └── voice/             # Voice processing
│   │   ├── sockets/               # WebSocket handlers
│   │   │   ├── __init__.py
│   │   │   └── handlers.py        # Socket.IO event handlers
│   │   └── utils/                 # Utility functions
│   │       ├── __init__.py
│   │       ├── file_utils.py      # File operations
│   │       ├── image_utils.py     # Image utilities
│   │       └── logger.py          # Logging utilities
│   │   ├── print_scripts/             # Printing utility scripts
│   │   │   ├── print-file.py          # File printing script
│   │   │   ├── printer_test.py        # Printer testing utility
│   │   │   └── README.md              # Printing scripts documentation
│   ├── data/                      # Data storage directories
│   │   ├── uploads/               # User uploaded files
│   │   ├── processed/             # Processed files
│   │   ├── converted/             # Format-converted files
│   │   ├── pdfs/                  # Generated PDFs
│   │   ├── processed_text/        # Extracted text files
│   │   ├── models/                # Model files
│   │   └── ocr_results/           # OCR output
│   ├── public/                    # Static files and resources
│   │   ├── blank.pcl              # Printer control language file
│   │   ├── test_print.txt         # Test print file
│   │   ├── data/                  # Data subdirectories
│   │   │   ├── converted/
│   │   │   ├── models/
│   │   │   ├── ocr_results/
│   │   │   ├── pdfs/
│   │   │   ├── processed/
│   │   │   ├── processed_text/
│   │   │   └── uploads/
│   │   └── poppler/               # Poppler binary for PDF processing
│   │       └── poppler-24.08.0/   # Poppler version
│   ├── logs/                      # Application logs
│   └── __pycache__/               # Python cache files
│
├── frontend/                      # React + TypeScript frontend
│   ├── package.json               # Node.js dependencies
│   ├── tsconfig.json              # TypeScript configuration
│   ├── craco.config.js            # Create React App config
│   ├── vercel.json                # Vercel deployment config
│   ├── src/                       # Source code
│   │   ├── App.tsx                # Main app component
│   │   ├── App.css                # App styles
│   │   ├── index.tsx              # React entry point
│   │   ├── index.css              # Global styles
│   │   ├── config.ts              # Frontend configuration
│   │   ├── types.ts               # TypeScript types
│   │   ├── theme.ts               # Chakra theme configuration
│   │   ├── apiClient.ts           # HTTP API client
│   │   ├── ocrApi.ts              # OCR API interface
│   │   ├── react-app-env.d.ts     # React environment types
│   │   ├── reportWebVitals.ts     # Performance metrics
│   │   ├── setupWarnings.js       # Console warnings setup
│   │   ├── aiassist/              # AI assistance features
│   │   │   ├── actionHandler.ts   # Action handling
│   │   │   ├── commandParser.ts   # Command parsing
│   │   │   └── ...                # Other AI features
│   │   ├── components/            # React components
│   │   │   ├── dashboard/         # Dashboard components
│   │   │   ├── document/          # Document management UI
│   │   │   ├── layout/            # Layout components
│   │   │   ├── orchestration/     # Workflow UI
│   │   │   ├── voice/             # Voice control UI
│   │   │   └── common/            # Shared components
│   │   ├── pages/                 # Page components
│   │   ├── context/               # React context (Socket.IO, etc)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── utils/                 # Frontend utilities
│   │   ├── styles/                # Global styles
│   │   └── ui/                    # UI utilities
│   ├── public/                    # Static assets
│   │   ├── index.html             # HTML entry point
│   │   ├── manifest.json          # PWA manifest
│   │   └── robots.txt             # SEO robots file
│   ├── build/                     # Production build output
│   │   ├── index.html
│   │   ├── asset-manifest.json
│   │   ├── manifest.json
│   │   ├── robots.txt
│   │   └── static/                # Built assets
│   │       ├── css/
│   │       ├── js/
│   │       └── media/
│   └── node_modules/              # Node dependencies (git-ignored)
│
├── scripts/                       # Automation scripts
│   ├── backend.ps1                # Backend startup script
│   ├── frontend.ps1               # Frontend startup script
│   ├── run-all.ps1                # Run all services script
│   ├── cleanup.ps1                # Cleanup script
│   ├── ngrok.ps1                  # Ngrok tunneling script
│   └── install_cuda_pytorch.ps1   # CUDA/PyTorch installation
│
├── docs/                          # Documentation
│   ├── outcome.txt                # Outcome documentation
│   ├── ENHANCEMENTS/              # Enhancement proposals
│   └── pics/                      # Documentation images
│       └── TECHNOLOGY_STACK.txt   # Technology stack details
│
├── README.md                      # This file
├── prompt.txt                     # Project prompt
└── error.txt                      # Error log
```

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
├──────────────────┬──────────────────┬───────────────────────┤
│  Web Dashboard   │  Mobile Capture  │  Voice Control Panel  │
│  (React + TS)    │  (Responsive)    │  (Real-time)          │
└────────────┬─────┴────────┬─────────┴──────────┬────────────┘
             │              │                    │
             └──────────────┼────────────────────┘
                   Socket.IO / WebSocket
                            │
        ┌───────────────────▼───────────────────┐
        │    COMMUNICATION LAYER                │
        │  - Real-time Updates                  │
        │  - Event Broadcasting                 │
        │  - Connection Management              │
        └───────────────────┬───────────────────┘
                            │
        ┌───────────────────▼───────────────────┐
        │    API LAYER (Flask + REST)           │
        │  - Document endpoints                 │
        │  - Print/Scan configuration           │
        │  - File conversion                    │
        │  - Device management                  │
        └───────────────────┬───────────────────┘
                            │
        ┌───────────────────▼───────────────────┐
        │    BUSINESS LOGIC LAYER               │
        ├─────────────────────────────────────┤
        │ ┌──────────┐ ┌──────────┐            │
        │ │ Document │ │  Voice   │            │
        │ │Processing│ │ AI/Whisper            │
        │ └──────────┘ └──────────┘            │
        │ ┌──────────┐ ┌──────────┐            │
        │ │   OCR    │ │ Printing │            │
        │ │ Pipeline │ │ Scanning │            │
        │ └──────────┘ └──────────┘            │
        │ ┌──────────┐ ┌──────────┐            │
        │ │  Image   │ │Orchestr. │            │
        │ │Enhancement           │            │
        │ └──────────┘ └──────────┘            │
        └───────────────────┬───────────────────┘
                            │
        ┌───────────────────▼───────────────────┐
        │    DATA LAYER                         │
        ├─────────────────────────────────────┤
        │ ┌──────────┐ ┌──────────┐            │
        │ │   File   │ │  Model   │            │
        │ │ Storage  │ │ Management            │
        │ └──────────┘ └──────────┘            │
        │ ┌──────────────────────┐             │
        │ │   Logging & Metrics  │             │
        │ └──────────────────────┘             │
        └───────────────────┬───────────────────┘
                            │
        ┌───────────────────▼───────────────────┐
        │    EXTERNAL INTEGRATIONS              │
        ├─────────────────────────────────────┤
        │ ┌──────────┐ ┌──────────┐            │
        │ │ Printers │ │ Scanners │            │
        │ │ (Windows)│ │(pywin32) │            │
        │ └──────────┘ └──────────┘            │
        │ ┌──────────┐ ┌──────────┐            │
        │ │  Ollama  │ │ Poppler  │            │
        │ │  (LLM)   │ │(PDF Util)│            │
        │ └──────────┘ └──────────┘            │
        └───────────────────────────────────────┘
```

---

## ⚙️ Configuration

### Environment Variables (`backend/.env`)

```env
# Application
DEBUG=false
ENV=production

# Frontend & CORS
FRONTEND_URL=http://localhost:3000
BACKEND_PUBLIC_URL=http://localhost:5000
API_CORS_ORIGINS=http://localhost:3000,https://yourapp.com

# Ollama Configuration (Local LLM)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_ENDPOINT=/api/chat
OLLAMA_TAGS_ENDPOINT=/api/tags
OLLAMA_TIMEOUT=60
OLLAMA_VERIFY_SSL=true

# Voice AI Model
VOICE_AI_MODEL=smollm2:135m
VOICE_SYSTEM_PROMPT_FILE=backend/config/prompts/system_prompt.txt
VOICE_COMMAND_MAPPINGS_FILE=backend/config/prompts/command_mappings.json

# Logging
LOG_LEVEL=INFO
LOGS_DIR=backend/logs
```

### Prompt Configuration (`backend/config/prompts/`)

#### system_prompt.txt
- Core behavior definition for AI assistant
- Configured with command patterns and response templates
- Plain text format for easy editing

#### command_mappings.json
```json
{
  "wake_words": [...],
  "command_patterns": {...},
  "responses": {...},
  "ollama_sampling": {...}
}
```

---

## 📖 Usage Guide

### Dashboard Features

1. **Document Management**
   - Upload and monitor document processing
   - View OCR results in real-time
   - Browse converted and processed files
   - Select and batch process multiple documents

2. **Print Configuration**
   - Choose printer from available devices
   - Set paper size, orientation, color mode
   - Configure quality, copies, collation
   - Preview print layout before sending

3. **Scan Configuration**
   - Customize scan resolution and quality
   - Select file format (image/PDF)
   - Enable automatic document detection
   - Batch scan multiple pages

4. **Device Management**
   - View all connected printers
   - Monitor printer status and health
   - Access driver downloads
   - View system resources and performance

5. **Voice Control**
   - Activate continuous listening
   - Issue commands in natural language
   - Configure jobs via voice
   - Receive voice feedback and confirmations

## PrintChakra AI Workflow Documentation

This document outlines the AI-driven workflow and command structure for PrintChakra. It serves as a reference for both developers and users to understand how the AI assistant interacts with the system across different states and workflows.

---

## 🧠 AI Workflow Architecture

PrintChakra uses a strict state-machine-based AI assistant that ensures users follow a logical progression for printing and scanning tasks. The assistant supports both voice and text inputs with identical behavior.

### Workflow States

| State | Description | Valid Entry Commands |
|-------|-------------|----------------------|
| **DASHBOARD** | The default state. AI is ready to start a new workflow. | `print`, `scan`, `help`, `status` |
| **PRINT_WORKFLOW** | Active when a user is preparing a print job. | `sorry, print` (if in Scan mode) |
| **SCAN_WORKFLOW** | Active when a user is preparing a scan job. | `sorry, scan` (if in Print mode) |

---

## 🔄 Mode Switching (The "Sorry" Protocol)

To prevent accidental workflow interruptions, switching between Print and Scan modes while one is active requires the "sorry" keyword.

| Action | Command Example | AI Response |
|--------|-----------------|-------------|
| Switch to Scan from Print | `sorry, scan` | `Scan mode.` |
| Switch to Print from Scan | `sorry, print` | `Print mode.` |
| Attempt switch without "sorry" | `scan` (while in Print) | `Say "sorry" first to switch to scan.` |

---

## 🖨️ Print Workflow Commands

The print workflow follows a 4-step progression: **Select -> Configure -> Review -> Execute**.

### Step 1: Document Selection
*State: `PRINT_WORKFLOW` | Step: `SELECT_DOCUMENT`*

| Command Type | Patterns | Example | AI Response |
|--------------|----------|---------|-------------|
| **Select** | `select`, `choose`, `pick` | `select document 1` | `Got it, document 1.` |
| **Section** | `converted`, `uploaded`, `originals` | `switch to converted` | `Converted.` |
| **Navigation** | `next`, `previous`, `back` | `next document` | `Next.` |
| **Continue** | `confirm`, `proceed`, `next step` | `confirm selection` | `Ready. Confirm?` |

### Step 2: Configuration
*State: `PRINT_WORKFLOW` | Step: `CONFIGURATION`*

| Setting | Patterns | Example | AI Response |
|---------|----------|---------|-------------|
| **Layout** | `portrait`, `landscape` | `set landscape` | `Landscape.` |
| **Color** | `color`, `grayscale`, `bw` | `color mode` | `Color.` |
| **Copies** | `copies`, `copy` | `3 copies` | `3 copies.` |
| **Paper Size** | `A4`, `Letter`, `Legal` | `A4 size` | `A4.` |
| **Quality** | `draft`, `normal`, `high` | `high quality` | `High quality.` |
| **Duplex** | `duplex`, `double sided` | `double sided` | `Double-sided.` |

### Step 3: Review & Step 4: Execution
*State: `PRINT_WORKFLOW` | Step: `REVIEW` / `EXECUTING`*

| Action | Patterns | Example | AI Response |
|--------|----------|---------|-------------|
| **Execute** | `confirm`, `start`, `print` | `confirm print` | `Printing now!` |
| **Cancel** | `cancel`, `stop`, `abort` | `cancel print` | `Cancelled.` |
| **Status** | `status`, `progress` | `what's the status?` | `Printing...` |

---

## 📸 Scan Workflow Commands

The scan workflow follows a 5-step progression: **Source -> Select -> Configure -> Review -> Execute**.

### Step 1: Source Selection
*State: `SCAN_WORKFLOW` | Step: `SOURCE_SELECTION`*

| Action | Patterns | Example | AI Response |
|--------|----------|---------|-------------|
| **Feed Tray** | `feed`, `tray`, `insert` | `use feed tray` | `Feeding documents.` |
| **Manual Select** | `select`, `manual` | `select from files` | `Opening selection.` |

### Step 2 & 3: Selection & Configuration
*State: `SCAN_WORKFLOW` | Step: `SELECT_DOCUMENT` / `CONFIGURATION`*

| Setting | Patterns | Example | AI Response |
|---------|----------|---------|-------------|
| **OCR** | `ocr`, `text mode`, `recognize` | `enable ocr` | `OCR on.` |
| **Format** | `pdf`, `jpeg`, `png` | `save as pdf` | `PDF.` |
| **Resolution** | `dpi`, `resolution` | `300 dpi` | `300 DPI.` |
| **Mode** | `single`, `multi`, `batch` | `multi page scan` | `Multi page.` |

---

## 🌐 Global & UI Commands

These commands are available across most states to control the interface and get information.

| Category | Command | Example | Action |
|----------|---------|---------|--------|
| **Help** | `help`, `commands` | `what can you do?` | Shows help dialog |
| **Status** | `status`, `where are we` | `current status` | Reports current mode/step |
| **Navigation** | `scroll up`, `scroll down` | `scroll down` | Scrolls the active panel |
| **UI Control** | `close`, `exit`, `back` | `close panel` | Closes modals or goes back |
| **System** | `connectivity`, `device info` | `check printer` | Shows device status toast |

---

## 🔄 Command Flow Example: Full Print Job

1.  **User**: "print" -> **AI**: "Print mode." (Enters `PRINT_WORKFLOW`)
2.  **User**: "select document 3" -> **AI**: "Got it, document 3."
3.  **User**: "landscape, 2 copies" -> **AI**: "Landscape. 2 copies."
4.  **User**: "confirm" -> **AI**: "Ready. Confirm?" (Moves to `REVIEW`)
5.  **User**: "yes" -> **AI**: "Printing now!" (Moves to `EXECUTING`)

---

## 🛠 Technical Implementation Details

- **Command Parsing**: Handled by `commandParser.ts` using regex and keyword matching.
- **State Validation**: Enforced by `stateManager.ts` to ensure commands are contextually valid.
- **Action Execution**: Dispatched via `actionHandler.ts` to the UI and backend.
- **Voice Bridge**: `useVoiceCommandBridge.ts` synchronizes backend voice intents with frontend state.


## 👨‍💻 Development

### Setting Up Development Environment

```bash
# Clone and setup
git clone https://github.com/chaman2003/printchakra.git
cd printchakra

# Backend development
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
pip install -e .  # For development mode

# Frontend development
cd ../frontend
npm install
npm run dev  # Start with hot reload
```

### Running Tests

```bash
# Backend tests
cd backend
python -m pytest tests/

# Frontend tests
cd ../frontend
npm test

# Conversion validation
python backend/app/print_scripts/print-file.py <file_path>
```

### Code Structure Guidelines

- **Modular Design** – Each feature in its own module
- **Separation of Concerns** – Routes → Services → Utilities
- **Error Handling** – Comprehensive logging and user feedback
- **Type Safety** – Full TypeScript coverage in frontend

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build containers
docker build -t printchakra-backend ./backend
docker build -t printchakra-frontend ./frontend

# Run services
docker-compose up -d
```

### Vercel Deployment (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel deploy --prod
```

### Environment-Specific Configuration

- **Development** – Local services, verbose logging
- **Staging** – Pre-production environment
- **Production** – Hardened security, performance optimized

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** with clear messages (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request with detailed description

### Code Standards
- Follow PEP 8 (Python)
- Use ESLint + Prettier (TypeScript/React)
- Include tests with 80%+ coverage
- Update documentation for new features

---

## 📄 License & Author

**License:** MIT License

**Author:** Chaman S ([GitHub: @chaman2003](https://github.com/chaman2003))

This project is open source and available under the MIT License. See [LICENSE](LICENSE) file for details.

---

## 📞 Support & Feedback

- **Issues** – Report bugs on [GitHub Issues](https://github.com/chaman2003/printchakra/issues)
- **Discussions** – Join conversations on [GitHub Discussions](https://github.com/chaman2003/printchakra/discussions)
- **Documentation** – Read detailed docs in `docs/` folder

---

## 🎓 Learning Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [Socket.IO Guide](https://socket.io/)
- [PaddleOCR Documentation](https://github.com/PaddlePaddle/PaddleOCR)
- [Chakra UI Components](https://chakra-ui.com/)

---

<div align="center">

**Made with ❤️ by Chaman S**

If you find this project helpful, please consider giving it a ⭐ on GitHub!

[⬆ Back to top](#-table-of-contents)

</div>
