# PrintChakra

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/chaman2003/printchakra)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

AI-powered print and scan automation with modular architecture, hands-free voice control, and a production-ready OCR pipeline.

---

## Highlights

- Continuous voice listening with 10-15x faster Whisper transcription
- AI intent detection configures print and scan flows from natural language
- 12-stage OCR pipeline with image enhancement and quality scoring
- Modular Flask backend, React + TypeScript frontend, Socket.IO real-time sync
- One-command PowerShell scripts for setup, startup, and deployment

---

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Tesseract OCR (add to PATH on Windows)
- Git

### Installation (Windows PowerShell)

```powershell
git clone https://github.com/chaman2003/printchakra.git
cd printchakra

# Backend: creates venv, installs requirements
.\scripts\setup-backend.ps1

# Frontend: install dependencies
cd frontend
npm install
cd ..
```

### Launch

```powershell
# Option A: everything (backend + frontend + ngrok)
.\scripts\start-full-online.ps1

# Option B: manual control
.\scripts\backend.ps1
cd frontend
npm start
```

**Access**

- Dashboard: http://localhost:3000
- Mobile Capture: http://localhost:3000/phone
- REST API: http://localhost:5000

---

## Core Features

| Area | Capabilities |
|------|--------------|
| Voice Automation | Continuous listening, silence detection, automatic restart |
| AI Orchestration | Intent parsing, configuration extraction, confirmation loop |
| OCR Pipeline | 12-stage image enhancement, multi-pass OCR, quality validation |
| Real-Time Sync | Socket.IO status updates, capture triggers, orchestration events |
| Developer UX | PowerShell automation scripts, modular services, comprehensive logging |

---

## Architecture Overview

```
React (TypeScript, Chakra UI)
  -> Socket.IO / REST
Flask (Blueprint routes -> Service layer -> Models -> Utils)
  -> Processing pipeline (OpenCV, Tesseract, NumPy)
      -> Storage (uploads, processed, converted, PDFs)
```

- Backend entrypoints: `backend/app.py` (legacy) and `backend/app_modular.py`
- Services: file, scan, print, OCR, conversion, orchestration
- Middleware: CORS, request logging, error handling
- Frontend features: dashboard, voice AI chat, mobile capture, AI chat components

---

## Voice Orchestration

1. User speaks -> browser MediaRecorder streams audio
2. Frontend voice activity detection filters background noise
3. Backend Whisper transcription (beam_size=1, best_of=1) generates text in 0.3-0.5 s
4. AI intent engine (Smollm2 via Ollama) extracts mode, copies, layout, color, DPI, duplex, ranges
5. Orchestration service emits Socket.IO events to pre-configure UI and confirm execution

**Example Commands**

- "Print 3 copies in landscape with color"
- "Scan at 600 DPI as searchable PDF"
- "Reprint the last upload, double sided"

---

## API Overview (selected)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Runtime and model health check |
| POST | `/upload` | Upload and process a document |
| GET | `/files` | List processed documents and metadata |
| POST | `/convert` | Convert files (PDF, DOCX, images) |
| POST | `/voice/process` | Transcribe audio + AI orchestration response |

Real-time events (Socket.IO): `processing_progress`, `capture_now`, `orchestration_update`, `voice_detected`, `conversion_complete`.

---

## Project Structure (abridged)

```
printfchakra/
 backend/
   app.py
   app_modular.py
   config/
   models/
   routes/
   services/
   modules/voice/
   data/ (uploads, processed, converted, pdfs)
 frontend/
   src/
     features/
     components/
     pages/
     utils/
   public/
 scripts/ (setup-backend.ps1, start-full-online.ps1, backend.ps1, etc.)
 README.md
```

---

## Technology Stack

- Backend: Flask 3.x, Socket.IO 5.x, OpenCV 4.10, Tesseract OCR, Whisper, NumPy, PyMuPDF, FPDF2
- Frontend: React 19, TypeScript, Chakra UI, React Router, Socket.IO Client, Axios, Framer Motion
- AI / Voice: Whisper base model, Smollm2:135m via Ollama, pyttsx3 (Microsoft Ravi TTS)
- Tooling: PowerShell automation, ngrok tunneling, pytest, npm test

---

## Roadmap

- v2.2: continuous listening, noise filtering, modular service layer
- v2.3 (planned): cloud storage integration, document classification, multi-page workflows
- Future: PWA mode, advanced form recognition, team collaboration features

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-update`
3. Commit changes: `git commit -m "Describe update"`
4. Push: `git push origin feature/my-update`
5. Open a Pull Request with context and testing notes

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Author

**Chaman S**
GitHub: [@chaman2003](https://github.com/chaman2003)
Email: [chamans7952@gmail.com](mailto:chamans7952@gmail.com)
LinkedIn: [chaman2003](https://www.linkedin.com/in/chaman2003/)
