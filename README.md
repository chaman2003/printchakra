<div align="center">

# 🪷 PrintChakra

### *AI-Powered Smart Print & Capture Solution*

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?style=for-the-badge)](https://github.com/chaman2003/printchakra)
[![Python](https://img.shields.io/badge/Python-3.8+-green.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000.svg?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Transform your documents with intelligent OCR processing and real-time automation**

[Features](#-key-features) • [Quick Start](#-quick-start) • [Architecture](#️-architecture) • [Documentation](#-documentation) • [API](#-api-reference)

---

</div>

## 💡 What is PrintChakra?

PrintChakra is a **complete automated document scanning system** that combines advanced OCR technology with seamless web and mobile interfaces. Print a blank page, and watch your phone automatically capture and process documents with AI-powered enhancement and intelligent text extraction.

Perfect for digitizing physical documents, extracting text from images, and building automated document workflows with real-time synchronization between desktop and mobile devices.

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🖥️ **Desktop Dashboard**
- 📊 Manage processed documents
- 📄 View extracted OCR text
- 📥 Download enhanced images
- 🗑️ Delete files with one click
- ⚡ Real-time auto-refresh
- 🎛️ Advanced processing options
- 🔧 Pipeline configuration display

</td>
<td width="50%">

### 📱 **Mobile Capture**
- 📷 Auto-trigger from desktop
- 🎯 Manual photo upload
- 🔄 Instant processing feedback
- 🌐 Socket.IO synchronization
- ✨ Seamless user experience
- ✅ **Real-time quality validation**
- 📊 Blur & focus score metrics

</td>
</tr>
<tr>
<td width="50%">

### 🤖 **AI Processing**
- 🔍 Tesseract OCR engine
- 🖼️ OpenCV enhancement
- ✂️ Edge detection & cropping
- 📐 Skew correction
- 💾 Automatic text extraction
- 📋 Document classification
- 🔄 Batch processing support

</td>
<td width="50%">

### 🚀 **Developer Experience**
- ⚡ One-command startup
- 🔧 PowerShell automation
- 🌍 ngrok public tunneling
- 📦 Pre-configured deployment
- 🛠️ Comprehensive logging
- 📚 Complete API documentation
- 🧪 Advanced testing tools

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         PrintChakra Ecosystem                          │
└────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
    │  Web Dashboard  │◄───────►│  Flask Backend   │◄───────►│    ngrok    │
    │   (React TS)    │         │  (Python 3.8+)   │         │   Tunnel    │
    │   Port: 3000    │         │   Port: 5000     │         │  (Public)   │
    └────────┬────────┘         └────────┬─────────┘         └─────────────┘
             │                           │
             │      Socket.IO            │
             │   ◄─────────────────────► │
             │      WebSocket            │
             │                           │
    ┌────────▼────────┐         ┌────────▼─────────┐
    │  Phone Camera   │         │  File Processing │
    │   Interface     │         │  ┌─────────────┐ │
    │  /phone route   │         │  │   OpenCV    │ │
    └─────────────────┘         │  │  Tesseract  │ │
                                │  │   Pillow    │ │
                                │  └─────────────┘ │
                                └──────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
            ┌───────▼─────┐    ┌────────▼──────┐    ┌───────▼────────┐
            │   uploads/   │    │  processed/   │    │ processed_text/│
            │  (Original)  │    │  (Enhanced)   │    │   (OCR Data)   │
            └──────────────┘    └───────────────┘    └────────────────┘
```

### 🔄 Processing Flow

```
📱 Upload Image  →  🔍 Edge Detection  →  ✂️ Crop & Enhance  →  📝 OCR Extract  →  💾 Save Results
```

> 📘 See **[doc/flow.txt](doc/flow.txt)** for detailed technology pipeline with 15 processing stages.

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

```powershell
# 1. Clone the repository
git clone https://github.com/chaman2003/printchakra.git
cd printchakra

# 2. Setup backend (automated - creates venv + installs dependencies)
.\setup-backend.ps1

# 3. Setup frontend
cd frontend
npm install
```

> 💡 **New!** The `setup-backend.ps1` script automatically creates a virtual environment and installs all Python dependencies. No manual setup needed!

### 🎯 Launch Application

**Option A: Start Everything (Recommended)**
```powershell
# Opens 3 terminal windows: Backend + Frontend + ngrok
.\fullstart.ps1
```

**Option B: Start Backend Only**
```powershell
# Backend + ngrok tunnel
.\backend.ps1
```

### 🌐 Access Points

| Interface | URL | Description |
|-----------|-----|-------------|
| 🖥️ **Dashboard** | http://localhost:3000 | Main document management |
| 📱 **Phone UI** | http://localhost:3000/phone | Mobile capture interface |
| 🔌 **API** | http://localhost:5000 | Backend REST endpoints |
| 🌍 **Public** | https://freezingly-nonsignificative-edison.ngrok-free.dev | Remote access via ngrok |

### ✅ Test the Workflow

1. **Open Dashboard** → http://localhost:3000
2. **Click "Print Blank"** → Triggers phone capture
3. **Upload/Capture Image** → Automatic processing
4. **View Results** → Enhanced image + extracted text
5. **Download/Delete** → Manage your files

**🎉 You're ready to go!**

---

## 📁 Project Structure

```
printchakra/
│
├── 🎛️ PowerShell Scripts
│   ├── setup-backend.ps1        # Setup backend venv + dependencies
│   ├── backend.ps1              # Start backend + ngrok
│   ├── fullstart.ps1            # Start all services
│   └── .gitignore               # Git ignore rules
│
├── 🐍 Backend (Flask)
│   ├── app.py                   # Main Flask application
│   ├── requirements.txt         # Python dependencies
│   ├── venv/                    # Virtual environment
│   ├── uploads/                 # Original uploaded files
│   ├── processed/               # Enhanced images
│   ├── processed_text/          # Extracted OCR text
│   └── print_scripts/
│       ├── print-file.py        # Windows printer integration
│       └── blank.pdf            # Test print file
│
├── ⚛️ Frontend (React + TypeScript)
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── App.tsx              # Main React component
│   │   ├── config.ts            # API configuration
│   │   ├── index.tsx            # Entry point
│   │   └── pages/
│   │       ├── Dashboard.tsx    # Document management UI
│   │       └── Phone.tsx        # Camera capture UI
│   ├── package.json             # Node dependencies
│   ├── tsconfig.json            # TypeScript config
│   └── vercel.json              # Vercel deployment config
│
└── 📚 Documentation
    ├── README.md                # This file
    ├── FIXES.md                 # Troubleshooting guide
    └── doc/
        ├── printchakra.txt      # Future work & scope
        └── flow.txt             # Processing pipeline
```

---

## 🛠️ Technology Stack

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| ![Flask](https://img.shields.io/badge/Flask-3.0.0-000000?logo=flask) | 3.0.0 | Web framework |
| ![Socket.IO](https://img.shields.io/badge/Socket.IO-5.3.5-010101?logo=socketdotio) | 5.3.5 | Real-time WebSocket |
| ![OpenCV](https://img.shields.io/badge/OpenCV-4.10.0-5C3EE8?logo=opencv) | 4.10.0 | Image processing |
| ![Tesseract](https://img.shields.io/badge/Tesseract-OCR-4285F4) | Latest | Text extraction |
| ![pywin32](https://img.shields.io/badge/pywin32-306-blue) | 306 | Windows printer API |
| ![fpdf2](https://img.shields.io/badge/fpdf2-2.7.9-red) | 2.7.9 | PDF generation |

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| ![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react) | 18.2.0 | UI framework |
| ![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-3178C6?logo=typescript) | 4.9.5 | Type safety |
| ![Socket.IO](https://img.shields.io/badge/Socket.IO_Client-4.8.1-010101) | 4.8.1 | WebSocket client |
| ![Axios](https://img.shields.io/badge/Axios-1.12.2-5A29E4) | 1.12.2 | HTTP requests |
| ![React Router](https://img.shields.io/badge/React_Router-6.28.0-CA4245) | 6.28.0 | Navigation |

### Infrastructure

- **ngrok** - Public tunneling service
- **Vercel** - Frontend deployment platform (optional)
- **PowerShell** - Windows automation scripts

---

### 📡 API Reference

### REST Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/health` | Server health check | `{ status: "ok" }` |
| `POST` | `/upload` | Upload & process image | `{ success: true, filename: "..." }` |
| `GET` | `/files` | List all processed files | `{ files: [...], count: n }` |
| `GET` | `/processed/<file>` | Get enhanced image | Image file |
| `GET` | `/ocr/<file>` | Get extracted text | `{ text: "..." }` |
| `DELETE` | `/delete/<file>` | Delete file | `{ success: true }` |
| `POST` | `/print` | Trigger phone capture | `{ success: true }` |
| `POST` | `/validate/quality` | Validate image quality before processing | `{ blur_score, focus_score, overall_acceptable, issues, recommendations }` |
| `POST` | `/process/advanced` | Advanced processing with custom options | `{ success, filename, metadata }` |
| `POST` | `/export/pdf` | Export text as PDF | `{ filename, filepath }` |
| `GET` | `/pdf/<filename>` | Download generated PDF | PDF file |
| `GET` | `/pipeline/info` | Get pipeline configuration & module status | `{ modules: {...}, features: [...] }` |
| `POST` | `/classify/document` | Classify document type | `{ document_type, confidence }` |
| `POST` | `/batch/process` | Process multiple files in batch | `{ batch_id, results: [...] }` |

### Socket.IO Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `upload_complete` | Server → Client | `{ filename, success }` | File uploaded successfully |
| `processing_complete` | Server → Client | `{ filename, text }` | OCR processing done |
| `file_deleted` | Server → Client | `{ filename }` | File deleted |
| `capture_now` | Server → Client | `{}` | Trigger phone camera |

---

## 🐛 Troubleshooting

<details>
<summary><b>Backend won't start</b></summary>

**Solutions:**
- Run setup script first: `.\setup-backend.ps1`
- Check Python version: `python --version` (need 3.8+)
- Check if venv exists: `Test-Path .\backend\venv`
- Manually activate venv: `.\backend\venv\Scripts\Activate.ps1`
- Reinstall dependencies: `pip install -r requirements.txt`
- Check port 5000: `netstat -ano | findstr :5000`
- Install Tesseract OCR and add to PATH

</details>

<details>
<summary><b>Frontend won't start</b></summary>

**Solutions:**
- Check Node.js version: `node --version` (need 16+)
- Install dependencies: `npm install` in frontend folder
- Check port 3000: `netstat -ano | findstr :3000`
- Clear cache: `npm cache clean --force`

</details>

<details>
<summary><b>WebSocket errors / 500 errors</b></summary>

**Solutions:**
- Check `app.py` - ensure no `broadcast=True` in `socketio.emit()`
- Verify Socket.IO versions match (backend 5.3.5, frontend 4.8.1)
- Check CORS settings in `app.py`
- Restart both servers

</details>

<details>
<summary><b>OCR not working / Tesseract not found</b></summary>

**Solutions:**
- Install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
- Add to PATH: `C:\Program Files\Tesseract-OCR`
- Update path in `app.py` if needed

</details>

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[README.md](README.md)** | This file - Quick start guide |
| **[FIXES.md](FIXES.md)** | WebSocket troubleshooting guide |
| **[QUICKSTART.md](QUICKSTART.md)** | Detailed setup & testing guide with quality validation |
| **[INTEGRATION_REPORT.md](INTEGRATION_REPORT.md)** | Technical architecture & new features documentation |
| **[COMPLETE.md](COMPLETE.md)** | Session summary & implementation details |
| **[doc/printchakra.txt](doc/printchakra.txt)** | Future work & long-term scope |
| **[doc/flow.txt](doc/flow.txt)** | Processing pipeline (15 stages) |

---

## 🗺️ Roadmap

### ✅ Completed Features

- [x] Flask backend with OCR processing
- [x] React TypeScript frontend
- [x] Socket.IO real-time updates
- [x] OpenCV image enhancement
- [x] Tesseract text extraction
- [x] Windows printer integration
- [x] PowerShell automation scripts
- [x] ngrok public tunneling
- [x] Comprehensive error handling
- [x] Dashboard file management
- [x] **Quality validation system** ✨ NEW
- [x] **Advanced processing options** ✨ NEW
- [x] **Document classification API** ✨ NEW
- [x] **Batch processing support** ✨ NEW
- [x] **PDF export functionality** ✨ NEW
- [x] **Pipeline info endpoint** ✨ NEW

### 🎯 Future Work

See **[doc/printchakra.txt](doc/printchakra.txt)** for complete roadmap including:
- 📊 Advanced logging & monitoring
- 🔐 User authentication system
- 💾 Automatic backup system
- 🎨 UI/UX improvements
- ☁️ Cloud storage integration
- 🤖 Advanced ML models

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Chaman S**

- 🐙 GitHub: [@chaman2003](https://github.com/chaman2003)
- 📧 Email: [chamans7952@gmail.com](mailto:chamans7952@gmail.com)

---

## 🙏 Acknowledgments

Special thanks to:

- **[Tesseract OCR](https://github.com/tesseract-ocr/tesseract)** - Google's OCR engine
- **[OpenCV](https://opencv.org/)** - Computer vision library
- **[Flask](https://flask.palletsprojects.com/)** - Python web framework
- **[React](https://reactjs.org/)** - JavaScript UI library
- **[Socket.IO](https://socket.io/)** - Real-time communication
- **[ngrok](https://ngrok.com/)** - Public tunneling service

---

<div align="center">

### 💫 Made with ❤️ for intelligent document processing

**PrintChakra v2.0.0** • October 2025

[⬆ Back to Top](#-printchakra)

</div>
