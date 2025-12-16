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
├── backend/                       # Flask backend
│   ├── app.py                     # Main application entry point
│   ├── requirements.txt           # Python dependencies
│   ├── app/
│   │   ├── api/                   # REST API endpoints
│   │   │   └── document.py        # Document endpoints
│   │   ├── config/
│   │   │   ├── settings.py        # Configuration management
│   │   │   └── prompts/           # AI prompts
│   │   ├── models/                # Data models
│   │   ├── middleware/            # CORS, logging, error handling
│   │   ├── modules/               # Feature modules
│   │   │   ├── document/          # Document processing
│   │   │   ├── image/             # Image enhancement
│   │   │   ├── ocr/               # OCR pipeline
│   │   │   ├── voice/             # Voice processing
│   │   │   ├── orchestration/     # Workflow orchestration
│   │   │   └── pipeline/          # Processing pipeline
│   │   └── utils/                 # Utility functions
│   ├── data/                      # Data directories
│   │   ├── uploads/               # User uploads
│   │   ├── processed/             # Processed files
│   │   ├── converted/             # Converted files
│   │   ├── pdfs/                  # Generated PDFs
│   │   └── ocr_results/           # OCR output
│   ├── public/                    # Static files
│   └── logs/                      # Application logs
│
├── frontend/                      # React + TypeScript frontend
│   ├── package.json               # Node dependencies
│   ├── tsconfig.json              # TypeScript configuration
│   ├── craco.config.js            # Create React App config
│   ├── src/
│   │   ├── App.tsx                # Main app component
│   │   ├── index.tsx              # React entry point
│   │   ├── config.ts              # Frontend configuration
│   │   ├── types.ts               # TypeScript types
│   │   ├── apiClient.ts           # HTTP client
│   │   ├── ocrApi.ts              # OCR API interface
│   │   ├── components/
│   │   │   ├── dashboard/         # Dashboard components
│   │   │   ├── document/          # Document management
│   │   │   ├── layout/            # Layout components
│   │   │   ├── orchestration/     # Workflow UI
│   │   │   ├── voice/             # Voice control UI
│   │   │   └── common/            # Shared components
│   │   ├── pages/                 # Page components
│   │   ├── context/               # React context (Socket.IO, etc)
│   │   ├── utils/                 # Frontend utilities
│   │   ├── styles/                # Global styles
│   │   └── theme.ts               # Chakra theme config
│   ├── public/                    # Static assets
│   └── build/                     # Production build
│
├── scripts/                       # Automation scripts
│   ├── run-all.ps1                # Start all services
│   ├── backend.ps1                # Start backend
│   ├── frontend.ps1               # Start frontend
│   ├── cleanup.ps1                # Cleanup
│   ├── ngrok.ps1                  # Tunneling setup
│   └── install_cuda_pytorch.ps1   # GPU setup
│
├── docs/                          # Documentation
│   ├── outcome.txt                # Project outcomes
│   └── ENHANCEMENTS/              # Future enhancements
│
├── README.md                      # This file
├── error.txt                      # Error logs
└── prompt.txt                     # AI prompt specifications
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

### Common Commands

```bash
# Voice/Text Commands
"Print the first document"
"Scan a document to PDF"
"Convert all images to PDF"
"Show my print queue"
"Clear all print jobs"
"Check device connectivity"
"Select documents 1 to 5"
"Deselect document 3"
```

---

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
python print_scripts/print-file.py <file_path>
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
