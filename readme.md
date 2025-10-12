# PrintChakra 📄🤖# PrintChakra: AI-Powered Smart Print and Capture Solution# PrintChakra: AI-Powered Smart Print and Capture Solution



[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/chaman2003/printchakra)

[![Python](https://img.shields.io/badge/Python-3.8+-green.svg)](https://www.python.org/)

[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)![PrintChakra Logo](https://img.shields.io/badge/PrintChakra-v1.0.0-blue.svg)![PrintChakra Logo](https://img.shields.io/badge/PrintChakra-v1.0.0-blue.svg)

[![Flask](https://img.shields.io/badge/Flask-2.3+-red.svg)](https://flask.palletsprojects.com/)

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)![Python](https://img.shields.io/badge/Python-3.8+-green.svg)![Python](https://img.shields.io/badge/Python-3.8+-green.svg)



> **AI-Powered Smart Print & Capture Solution** - Transform your documents with intelligent OCR processing and real-time automation.![React](https://img.shields.io/badge/React-18.2.0-blue.svg)![React](https://img.shields.io/badge/React-18.2.0-blue.svg)



PrintChakra is a complete automated document scanning system that combines advanced OCR technology with seamless web and mobile interfaces. Print a blank page, and watch your phone automatically capture and process documents with AI-powered enhancement.![License](https://img.shields.io/badge/License-MIT-yellow.svg)![License](https://img.shields.io/badge/License-MIT-yellow.svg)



## ✨ Key Features



- 📱 **Web Dashboard** - Manage, view, and download processed documentsPrintChakra is an **AI-powered smart print and capture solution** that combines advanced OCR technology with intelligent document processing. This system features a React web interface for document scanning and management, with a Flask backend providing OCR processing, Socket.IO real-time updates, and secure file handling.PrintChakra is an **AI-powered smart print and capture solution** that combines advanced OCR technology with intelligent document processing. This system features a React web interface for document scanning and management, with a Flask backend providing OCR processing, Socket.IO real-time updates, and secure file handling.

- 📷 **Mobile Capture** - Automatic camera triggering via Socket.IO

- 🔍 **AI OCR Processing** - Tesseract-powered text extraction with OpenCV enhancement

- ⚡ **Real-time Updates** - Live processing status with WebSocket communication

- 🌐 **Cloud Ready** - Pre-configured for Vercel + ngrok deployment## 🌟 Key Features## 🌟 Key Features

- 🔒 **Secure Storage** - Local file system with organized directory structure

- 📊 **Export Options** - Multiple formats (PDF, Text, JSON)

- 🚀 **One-Click Start** - PowerShell scripts for instant setup

- **📱 Web Document Scanning**: React-based interface for capturing documents via camera or file upload- **📱 Web Document Scanning**: React-based interface for capturing documents via camera or file upload

## 🏗️ Architecture

- **🔍 Advanced OCR Processing**: Text extraction using Tesseract OCR with OpenCV image preprocessing- **🔍 Advanced OCR Processing**: Text extraction using Tesseract OCR with OpenCV image preprocessing

```

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐- **💾 Secure File Storage**: Local file system storage with organized directory structure- **💾 Secure File Storage**: Local file system storage with organized directory structure

│   Web Frontend  │◄──►│   Flask Backend  │◄──►│     ngrok        │

│     (React)     │    │  (Python + OCR)  │    │   (Public URL)   │- **🌐 Real-time Updates**: Socket.IO integration for live processing status- **🌐 Real-time Updates**: Socket.IO integration for live processing status

└─────────────────┘    └──────────────────┘    └─────────────────┘

         │                        │                        │- **🔒 Secure Authentication**: JWT-based user authentication system- **🔒 Secure Authentication**: JWT-based user authentication system

         └──────────┬─────────────┘                        │

                    │                                      │- **🔎 Full-Text Search**: Search through extracted document content- **🔎 Full-Text Search**: Search through extracted document content

         ┌──────────▼────────────┐                         │

         │   File Processing     │◄────────────────────────┘- **📊 Export Options**: Multiple export formats (PDF, Text, JSON)- **📊 Export Options**: Multiple export formats (PDF, Text, JSON)

         │   (OpenCV + Tesseract)│

         └───────────────────────┘- **⚡ Fast Processing**: Optimized image processing with OpenCV- **⚡ Fast Processing**: Optimized image processing with OpenCV

```

- **🚀 Vercel Deployment**: Cloud-ready frontend deployment- **🚀 Vercel Deployment**: Cloud-ready frontend deployment

## 🚀 Quick Start (60 Seconds)

- **🌍 Public Access**: Instatunnel integration for remote access- **🌍 Public Access**: Instatunnel integration for remote access

### Prerequisites

- ✅ Python 3.8+ with pip

- ✅ Node.js 16+ with npm

- ✅ Tesseract OCR ([Download](https://github.com/UB-Mannheim/tesseract/wiki))## 🏗️ System Architecture## 🏗️ System Architecture



### 1. Start All Services

```powershell

# One command to rule them all!``````

.\fullstart.ps1

```┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐



This opens **3 PowerShell windows**:│   Web Frontend  │◄──►│   Flask Backend  │◄──►│   Instatunnel   ││   Web Frontend  │◄──►│   Flask Backend  │◄──►│   Instatunnel   │

- 🖥️ **Backend** - Flask server with OCR processing

- 🌐 **Frontend** - React dashboard on port 3000│     (React)     │    │  (Python Flask)  │    │   (Public URL)  ││     (React)     │    │  (Python Flask)  │    │   (Public URL)  │

- 🚀 **ngrok** - Public tunnel for remote access

└─────────────────┘    └──────────────────┘    └─────────────────┘└─────────────────┘    └──────────────────┘    └─────────────────┘

### 2. Access Your App

- **Dashboard**: http://localhost:3000         │                        │         │                        │

- **Phone Interface**: http://localhost:3000/phone

- **Backend API**: http://localhost:5000         └──────────┬─────────────┘         └──────────┬─────────────┘

- **Public URL**: https://freezingly-nonsignificative-edison.ngrok-free.dev

                    │                    │

### 3. Test the Workflow

1. Click "Print Blank" in dashboard         ┌──────────▼────────────┐         ┌──────────▼────────────┐

2. Phone auto-captures document

3. AI processes with OCR         │   File System Storage │         │   File System Storage │

4. View results instantly!

         │   (processed/, uploads/) │         │   (processed/, uploads/) │

## 📁 Project Structure

         └─────────────────────────┘         └─────────────────────────┘

```

printchakra/``````

├── backend/              # Flask Python server

│   ├── app.py           # Main application with Socket.IO

│   ├── requirements.txt # Python dependencies

│   ├── venv/            # Virtual environment## 🚀 Quick Start## 🚀 Quick Start

│   └── uploads/         # File storage

├── frontend/            # React TypeScript app

│   ├── src/

│   │   ├── App.tsx      # Main component### Prerequisites### Prerequisites

│   │   ├── pages/       # Dashboard & Phone interfaces

│   │   └── config.ts    # API configuration

│   └── package.json     # Node dependencies

├── backend.ps1          # Start backend + ngrok- **Python 3.8+**- **Python 3.8+**

├── fullstart.ps1        # Start all services

└── README.md           # This file- **Node.js 16+**- **Node.js 16+**

```

- **Tesseract OCR**- **Tesseract OCR**

## 🛠️ Technology Stack

- **Git**- **Git**

### Backend

- **Flask 2.3+** - Web framework with CORS- **PowerShell** (Windows)- **PowerShell** (Windows)

- **OpenCV 4.8+** - Image processing & enhancement

- **Tesseract** - OCR text extraction

- **Socket.IO** - Real-time communication

- **Pillow** - Image manipulation### 1. Clone the Repository### 1. Clone the Repository



### Frontend

- **React 18+** - UI framework

- **TypeScript** - Type safety```bash```bash

- **Axios** - HTTP client

- **React Router** - Navigationgit clone https://github.com/chaman2003/printchakra.gitgit clone https://github.com/chaman2003/printchakra.git

- **Socket.IO Client** - WebSocket connection

cd printchakra-latest(phase)cd printchakra-latest(phase)

### Infrastructure

- **ngrok** - Public tunneling``````

- **Vercel** - Frontend deployment

- **PowerShell** - Windows automation



## 📡 API Endpoints### 2. One-Command Setup### 2. One-Command Setup



| Method | Endpoint | Description |

|--------|----------|-------------|

| GET | `/health` | Server status check |The easiest way to start all services:The easiest way to start all services:

| POST | `/upload` | Upload & process image |

| GET | `/files` | List processed files |

| GET | `/processed/<file>` | Get enhanced image |

| GET | `/ocr/<file>` | Get extracted text |```powershell```powershell

| DELETE | `/delete/<file>` | Delete file |

| POST | `/print` | Trigger phone capture |# Start backend, frontend, and Instatunnel tunnel# Start backend, frontend, and Instatunnel tunnel



## 🔧 Configuration.\start-all.ps1.\start-all.ps1



### Local Development``````

Frontend automatically connects to `http://localhost:5000`



### Production (Vercel)

Set environment variable: `REACT_APP_API_URL=https://freezingly-nonsignificative-edison.ngrok-free.dev`This will open three PowerShell windows:This will open three PowerShell windows:



## 🌐 Deployment- Backend server (Flask on port 5000)- Backend server (Flask on port 5000)



### Vercel Deployment- Instatunnel tunnel (public access)- Instatunnel tunnel (public access)

```powershell

# Deploy frontend to Vercel- Frontend development server (React on port 3000)- Frontend development server (React on port 3000)

cd frontend

vercel --prod



# Set environment variable in Vercel dashboard:### 3. Manual Setup (Alternative)### 3. Manual Setup (Alternative)

# REACT_APP_API_URL = https://freezingly-nonsignificative-edison.ngrok-free.dev

```



### Backend DeploymentIf you prefer manual setup:If you prefer manual setup:

Backend runs locally with ngrok tunnel for public access.



## 🐛 Troubleshooting

#### Backend Setup#### Backend Setup

**Backend won't start?**

- Install Tesseract OCR and add to PATH

- Check Python virtual environment: `backend\venv\Scripts\activate`

- Verify port 5000 is available```bash```bash



**Frontend won't start?**cd printchakra-servercd printchakra-server

- Run `npm install` in frontend directory

- Check Node.js version: `node --version`

- Ensure port 3000 is free

# Install Python dependencies# Install Python dependencies

**ngrok issues?**

- Free tier doesn't support custom subdomainspip install -r requirements.txtpip install -r requirements.txt

- Check internet connection

- Update ngrok auth token if needed



## 🤝 Contributing# Start backend server# Start backend server



1. Fork the repositorypython server.jspython server.js

2. Create feature branch: `git checkout -b feature/amazing-feature`

3. Commit changes: `git commit -m 'Add amazing feature'```````

4. Push to branch: `git push origin feature/amazing-feature`

5. Open Pull Request



## 📝 LicenseBackend will start at `http://localhost:5000`Backend will start at `http://localhost:5000`



MIT License - see [LICENSE](LICENSE) file for details.



## 👨‍💻 Author#### Frontend Setup#### Frontend Setup



**Chaman S** - [GitHub](https://github.com/chaman2003) | [Email](mailto:chamans7952@gmail.com)



---```bash```bash



**Made with ❤️ for intelligent document processing** 🚀cd frontendcd frontend



*PrintChakra v2.0.0 - October 2025*

# Install dependencies# Install dependencies

npm installnpm install



# Start development server# Start development server

npm startnpm start

``````



Frontend will be available at `http://localhost:3000`Frontend will be available at `http://localhost:3000`



### 4. Access URLs### 4. Access URLs



- **Local Backend**: `http://localhost:5000`- **Local Backend**: `http://localhost:5000`

- **Local Frontend**: `http://localhost:3000`- **Local Frontend**: `http://localhost:3000`

- **Public Backend**: `https://printchakra-backend-chama.instatunnel.my` (via Instatunnel)- **Public Backend**: `https://printchakra-backend-chama.instatunnel.my` (via Instatunnel)



## 📁 Project Structure## 📁 Project Structure



``````

printchakra-latest(phase)/printchakra-latest(phase)/

├── printchakra-server/        # Python Flask backend├── printchakra-server/        # Python Flask backend

│   ├── server.js             # Main Flask application│   ├── server.js             # Main Flask application

│   ├── print_scripts/        # Printing utilities│   ├── print_scripts/        # Printing utilities

│   │   ├── blank.pdf         # Test PDF file│   │   ├── blank.pdf         # Test PDF file

│   │   └── print_file.py     # Windows printing script│   │   └── print_file.py     # Windows printing script

│   ├── processed/            # Processed document storage│   ├── processed/            # Processed document storage

│   ├── static/               # Static file serving│   ├── static/               # Static file serving

│   ├── uploads/              # Uploaded file storage│   ├── uploads/              # Uploaded file storage

│   └── package.json          # Backend dependencies│   └── package.json          # Backend dependencies

├── frontend/                  # React web application├── frontend/                  # React web application

│   ├── src/│   ├── src/

│   │   ├── components/       # React components│   │   ├── components/       # React components

│   │   ├── pages/           # Application pages│   │   ├── pages/           # Application pages

│   │   ├── services/        # API services│   │   ├── services/        # API services

│   │   └── config.ts        # Configuration│   │   └── config.ts        # Configuration

│   ├── public/              # Static assets│   ├── public/              # Static assets

│   ├── package.json         # Frontend dependencies│   ├── package.json         # Frontend dependencies

│   └── vercel.json          # Vercel deployment config│   └── vercel.json          # Vercel deployment config

├── start-all.ps1            # One-command startup script├── start-all.ps1            # One-command startup script

├── start-backend.ps1        # Backend startup script├── start-backend.ps1        # Backend startup script

├── start-frontend.ps1       # Frontend startup script├── start-frontend.ps1       # Frontend startup script

├── deploy-vercel.ps1        # Vercel deployment script├── deploy-vercel.ps1        # Vercel deployment script

├── workflow/                # Development workflow files├── workflow/                # Development workflow files

├── docs/                    # Documentation├── docs/                    # Documentation

└── README.md               # This file└── README.md               # This file

``````



## 🔧 Technology Stack## 🔧 Technology Stack



### Backend (Python Flask)### Backend (Python Flask)

- **Flask 2.3.3**: Web framework- **Flask 2.3.3**: Web framework

- **Flask-SocketIO 5.3.6**: Real-time communication- **Flask-SocketIO 5.3.6**: Real-time communication

- **OpenCV 4.8.1**: Image processing and optimization- **OpenCV 4.8.1**: Image processing and optimization

- **Tesseract 0.3.10**: OCR engine for text extraction- **Tesseract 0.3.10**: OCR engine for text extraction

- **Pillow 10.0.1**: Image manipulation- **Pillow 10.0.1**: Image manipulation

- **PyJWT 2.8.0**: Authentication tokens- **PyJWT 2.8.0**: Authentication tokens



### Frontend (React)### Frontend (React)

- **React 18.2.0**: UI framework- **React 18.2.0**: UI framework

- **TypeScript 4.9.5**: Type-safe JavaScript- **TypeScript 4.9.5**: Type-safe JavaScript

- **Axios 1.5.1**: HTTP client for API calls- **Axios 1.5.1**: HTTP client for API calls

- **React Router 6.15.0**: Client-side routing- **React Router 6.15.0**: Client-side routing

- **Socket.IO Client**: Real-time updates- **Socket.IO Client**: Real-time updates

- **Bootstrap 5.3.2**: CSS framework- **Bootstrap 5.3.2**: CSS framework



### Infrastructure### Infrastructure

- **Vercel**: Frontend deployment platform- **Vercel**: Frontend deployment platform

- **Instatunnel**: Public tunneling service- **Instatunnel**: Public tunneling service

- **PowerShell**: Windows automation scripts- **PowerShell**: Windows automation scripts



## 📱 Web Application Features## 📱 Web Application Features



- **Document Upload**: Drag-and-drop file upload or camera capture- **Document Upload**: Drag-and-drop file upload or camera capture

- **Real-time Processing**: Live updates on OCR processing status- **Real-time Processing**: Live updates on OCR processing status

- **Document Management**: View, download, and organize processed documents- **Document Management**: View, download, and organize processed documents

- **Text Extraction**: High-accuracy OCR with image preprocessing- **Text Extraction**: High-accuracy OCR with image preprocessing

- **Export Options**: Download processed documents in multiple formats- **Export Options**: Download processed documents in multiple formats

- **Responsive Design**: Works on desktop and mobile browsers- **Responsive Design**: Works on desktop and mobile browsers



## 🌐 Backend Features## 🌐 Backend Features



- **OCR Processing**: Advanced text extraction with Tesseract- **OCR Processing**: Advanced text extraction with Tesseract

- **Image Optimization**: OpenCV preprocessing for better OCR accuracy- **Image Optimization**: OpenCV preprocessing for better OCR accuracy

- **Socket.IO Integration**: Real-time communication with frontend- **Socket.IO Integration**: Real-time communication with frontend

- **File Management**: Secure upload and storage handling- **File Management**: Secure upload and storage handling

- **RESTful API**: Clean API endpoints for all operations- **RESTful API**: Clean API endpoints for all operations



## 🔐 Security Features## 🔐 Security Features



- **JWT Authentication**: Secure token-based authentication- **JWT Authentication**: Secure token-based authentication

- **File Validation**: Secure file upload with type checking- **File Validation**: Secure file upload with type checking

- **CORS Protection**: Cross-origin resource sharing controls- **CORS Protection**: Cross-origin resource sharing controls

- **Input Sanitization**: Safe handling of user inputs- **Input Sanitization**: Safe handling of user inputs



## 📊 API Endpoints## 📊 API Endpoints



### Document Processing### Document Processing

- `POST /api/upload` - Upload and process document- `POST /api/upload` - Upload and process document

- `GET /api/documents` - Get processed documents- `GET /api/documents` - Get processed documents

- `GET /api/download/<filename>` - Download processed file- `GET /api/download/<filename>` - Download processed file

- `GET /api/health` - System health check- `GET /api/health` - System health check



### Real-time Events (Socket.IO)### Real-time Events (Socket.IO)

- `processing_start` - Document processing initiated- `processing_start` - Document processing initiated

- `processing_progress` - OCR processing progress updates- `processing_progress` - OCR processing progress updates

- `processing_complete` - Document processing finished- `processing_complete` - Document processing finished

- `error` - Processing error notifications- `error` - Processing error notifications



## 🖨️ Printing Integration## 🖨️ Printing Integration



PrintChakra includes Windows printing capabilities:PrintChakra includes Windows printing capabilities:



```powershell```powershell

# Run printing test# Run printing test

python print_scripts/print_file.pypython print_scripts/print_file.py

``````



**Features:****Features:**

- Direct Windows printing API integration- Direct Windows printing API integration

- Support for PDF and image printing- Support for PDF and image printing

- Error handling and status reporting- Error handling and status reporting



## 🚀 Deployment## 🚀 Deployment



### Vercel Deployment### Vercel Deployment



Deploy the frontend to Vercel for production:Deploy the frontend to Vercel for production:



```powershell```powershell

# Run deployment script# Run deployment script

.\deploy-vercel.ps1.\deploy-vercel.ps1

``````



This script will:This script will:

1. Check Vercel CLI installation1. Check Vercel CLI installation

2. Guide through authentication2. Guide through authentication

3. Deploy frontend with proper environment variables3. Deploy frontend with proper environment variables

4. Provide production URL4. Provide production URL



### Environment Variables### Environment Variables



**Frontend (.env.local):****Frontend (.env.local):**

```env```env

REACT_APP_API_URL=https://printchakra-backend-chama.instatunnel.myREACT_APP_API_URL=https://printchakra-backend-chama.instatunnel.my

``````



**Vercel Environment Variables:****Vercel Environment Variables:**

- `REACT_APP_API_URL`: Backend API URL (set during deployment)- `REACT_APP_API_URL`: Backend API URL (set during deployment)



## 🛠️ Development## �️ Development



### Running Individual Services### Running Individual Services



```powershell```powershell

# Start only backend# Start only backend

.\start-backend.ps1.\start-backend.ps1



# Start only frontend# Start only frontend

.\start-frontend.ps1.\start-frontend.ps1

``````



### Building for Production### Building for Production



```bash```bash

# Build frontend for production# Build frontend for production

cd frontendcd frontend

npm run buildnpm run build

``````



## 📝 Configuration## 📝 Configuration



### Backend Configuration### Backend Configuration



The backend uses default configuration optimized for development. For production deployment, consider:The backend uses default configuration optimized for development. For production deployment, consider:



- Setting up proper logging- Setting up proper logging

- Configuring CORS origins- Configuring CORS origins

- Setting up file storage limits- Setting up file storage limits

- Adding authentication middleware- Adding authentication middleware



### Frontend Configuration### Frontend Configuration



Update `frontend/src/config.ts` for different environments:Update `frontend/src/config.ts` for different environments:



```typescript```typescript

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

``````



## 🐛 Troubleshooting## 🐛 Troubleshooting



### Common Issues### Common Issues



1. **Tesseract not found**1. **Tesseract not found**

   - Install Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/wiki   - Install Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/wiki

   - Ensure it's added to system PATH   - Ensure it's added to system PATH



2. **Port already in use**2. **Port already in use**

   - Check if ports 3000 or 5000 are occupied   - Check if ports 3000 or 5000 are occupied

   - Kill processes using those ports   - Kill processes using those ports



3. **Instatunnel connection failed**3. **Instatunnel connection failed**

   - Ensure Instatunnel CLI is installed   - Ensure Instatunnel CLI is installed

   - Check internet connectivity   - Check internet connectivity

   - Try a different subdomain if "already taken"   - Try a different subdomain if "already taken"



4. **Vercel deployment issues**4. **Vercel deployment issues**

   - Ensure Vercel CLI is installed and authenticated   - Ensure Vercel CLI is installed and authenticated

   - Check environment variables are set correctly   - Check environment variables are set correctly



### Getting Help### Getting Help



- 📖 Check the workflow documentation in `workflow/` folder- 📖 Check the workflow documentation in `workflow/` folder

- 📋 Review inline code comments for API details- 📋 Review inline code comments for API details

- 🔍 Search existing [Issues](https://github.com/chaman2003/printchakra/issues)- 🔍 Search existing [Issues](https://github.com/chaman2003/printchakra/issues)

- 💬 Create a new issue for bugs or feature requests- 💬 Create a new issue for bugs or feature requests



## 📄 License## 📄 License



This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.



## 🤝 Contributing## 🤝 Contributing



We welcome contributions! Please follow these steps:We welcome contributions! Please follow these steps:



1. Fork the repository1. Fork the repository

2. Create a feature branch (`git checkout -b feature/amazing-feature`)2. Create a feature branch (`git checkout -b feature/amazing-feature`)

3. Commit your changes (`git commit -m 'Add amazing feature'`)3. Commit your changes (`git commit -m 'Add amazing feature'`)

4. Push to the branch (`git push origin feature/amazing-feature`)4. Push to the branch (`git push origin feature/amazing-feature`)

5. Open a Pull Request5. Open a Pull Request



### Contribution Guidelines### Contribution Guidelines



- Follow existing code style and conventions- Follow existing code style and conventions

- Test changes with the startup scripts- Test changes with the startup scripts

- Update documentation as needed- Update documentation as needed

- Ensure all services start correctly- Ensure all services start correctly



## 👥 Team## 👥 Team



- **Chaman S** - [@chaman2003](https://github.com/chaman2003) - Lead Developer- **Chaman S** - [@chaman2003](https://github.com/chaman2003) - Lead Developer



## 🙏 Acknowledgments## 🙏 Acknowledgments



- **Tesseract OCR** - Google's OCR engine- **Tesseract OCR** - Google's OCR engine

- **OpenCV** - Computer vision library- **OpenCV** - Computer vision library

- **React** - Frontend framework- **React** - Frontend framework

- **Flask** - Python web framework- **Flask** - Python web framework

- **Socket.IO** - Real-time communication- **Socket.IO** - Real-time communication

- **Vercel** - Deployment platform- **Vercel** - Deployment platform

- **Instatunnel** - Tunneling service- **Instatunnel** - Tunneling service



## 📞 Support## 📞 Support



For support and questions:For support and questions:



- 📧 Email: [chamans7952@gmail.com](mailto:chamans7952@gmail.com)- 📧 Email: [chamans7952@gmail.com](mailto:chamans7952@gmail.com)

- 🐙 GitHub: [PrintChakra Repository](https://github.com/chaman2003/printchakra)- 🐙 GitHub: [PrintChakra Repository](https://github.com/chaman2003/printchakra)

- 📱 Issues: [Report a Bug](https://github.com/chaman2003/printchakra/issues/new)- 📱 Issues: [Report a Bug](https://github.com/chaman2003/printchakra/issues/new)



------



**PrintChakra** - *Transforming documents through AI based intelligent processing* 🚀**PrintChakra** - *Transforming documents through AI based intelligent processing* 🚀

### Access Application

.\start-all.ps1

- **Dashboard**: http://localhost:3000

- **Phone Interface**: http://localhost:3000/phone```

- **Backend (Local)**: http://localhost:5000

- **Backend (Public)**: https://printchakra-backend.instatunnel.my



## 🌐 Vercel Deployment**Or Start Separately:**### Prerequisites- **📊 Dashboard**: Manage, view, and download processed documents



Deploy frontend to Vercel with backend running locally via Instatunnel:```powershell



### Quick Deploy# Terminal 1 - Backend



```powershell.\start-backend.ps1

# First, start backend and Instatunnel

.\start-all.ps11. **Python 3.8+** - https://www.python.org/downloads/- **🔍 OCR Processing**: Automatic text extraction from images using Tesseract## 🎯 What is PrintChakra?



# Then deploy frontend# Terminal 2 - Frontend

.\deploy-vercel.ps1

```.\start-frontend.ps12. **Node.js 16+** - https://nodejs.org/



### Manual Steps```



1. **Ensure services are running:**3. **Tesseract OCR** - https://github.com/UB-Mannheim/tesseract/wiki- **🖼️ Image Enhancement**: OpenCV-powered image processing for better quality

   ```powershell

   .\start-all.ps1### Access Application

   ```



2. **Deploy to Vercel:**

   ```bash- **Dashboard**: http://localhost:3000

   cd frontend

   vercel --prod- **Phone Interface**: http://localhost:3000/phone### Start Application- **⚡ Real-time Updates**: Socket.IO for instant file synchronizationPrintChakra is a complete automated document scanning system that turns your desktop and smartphone into a professional document digitization solution. Print a blank page, and your phone automatically captures and processes the document with AI-powered enhancement and OCR text extraction.

   ```

- **Backend API**: http://localhost:5000

3. **Set environment variable in Vercel:**

   - Go to: https://vercel.com/dashboard

   - Select your project → Settings → Environment Variables

   - Add: `REACT_APP_API_URL` = `https://printchakra-backend.instatunnel.my`## 🌐 Vercel Deployment

   - Redeploy

**Option 1: Start Both Servers**- **🌐 Cloud Ready**: Pre-configured for Instatunnel deployment

**For detailed instructions, see:** [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)

Deploy frontend to Vercel with backend running locally via Instatunnel:

## 📁 Project Structure

```powershell

```

printchakra-latest(phase)/### Quick Deploy

├── backend/              # Flask Python server

│   ├── app.py           # Main application.\start-all.ps1### Key Features:

│   ├── requirements.txt # Dependencies

│   └── .env            # Configuration```powershell

├── frontend/            # React TypeScript app

│   ├── src/.\deploy-vercel.ps1```

│   │   ├── pages/      # Dashboard & Phone

│   │   └── config.ts   # API settings (uses env vars)```

│   ├── .env.production # Production config

│   └── vercel.json     # Vercel configuration## 🏗️ Architecture- 📱 **Automatic Capture** - Phone triggers automatically when you print

├── start-all.ps1        # Start ALL services (Backend + Instatunnel + Frontend)

├── start-backend.ps1    # Start backend only### Manual Steps

├── start-frontend.ps1   # Start frontend only

├── deploy-vercel.ps1    # Deploy to Vercel**Option 2: Start Separately**

└── VERCEL_DEPLOYMENT.md # Deployment guide

```1. **Start backend with Instatunnel:**



## 🔧 Configuration   ```powershell```powershell- 🤖 **AI Processing** - Edge detection, cropping, and enhancement



### Local Development   # Terminal 1



Frontend automatically uses `http://localhost:5000` for local development.   .\start-backend.ps1# Terminal 1 - Backend



### Production (Vercel)   



Frontend uses environment variable `REACT_APP_API_URL` from Vercel settings.   # Terminal 2.\start-backend.ps1```- 📝 **OCR Text Extraction** - Convert images to searchable text



**Backend URL:** `https://printchakra-backend.instatunnel.my`   instatunnel http 5000 --subdomain printchakra-backend



## 📡 API Endpoints   ```



| Method | Endpoint | Description |

|--------|----------|-------------|

| GET | `/health` | Server status |2. **Deploy to Vercel:**# Terminal 2 - Frontend  printchakra-latest(phase)/- 🖥️ **Web Dashboard** - View, download, and manage scanned files

| POST | `/upload` | Upload & process image |

| GET | `/files` | List all files |   ```bash

| GET | `/processed/<file>` | Get processed image |

| DELETE | `/delete/<file>` | Delete file |   cd frontend.\start-frontend.ps1

| GET | `/ocr/<file>` | Get extracted text |

| POST | `/print` | Trigger capture |   vercel --prod



## 🛠️ Technology Stack   ``````├── frontend/           # React TypeScript application- ⚡ **Real-time Updates** - Socket.IO for instant communication



**Backend**: Flask • OpenCV • Tesseract • Socket.IO  

**Frontend**: React • TypeScript • React Router • Axios  

**Deployment**: Vercel (Frontend) • Instatunnel (Backend Tunnel)  3. **Set environment variable in Vercel:**

**Tunnel**: Instatunnel (Automatic public access)

   - Go to: https://vercel.com/dashboard

## 🆘 Troubleshooting

   - Select your project → Settings → Environment Variables### Access Application│   ├── src/- 🔄 **Hands-free Workflow** - Print → Capture → Process → View

**Backend won't start?**

- Check Python is installed: `python --version`   - Add: `REACT_APP_API_URL` = `https://printchakra-backend.instatunnel.my`

- Install Tesseract OCR

- Check port 5000 is available   - Redeploy



**Frontend won't start?**

- Check Node.js is installed: `node --version`

- Run: `cd frontend; npm install`**For detailed instructions, see:** [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)- **Dashboard**: http://localhost:3000│   │   ├── pages/      # Dashboard & Phone interfaces



**Instatunnel not found?**

- Install from: https://instatunnel.com

- Or skip by starting backend and frontend separately## 📁 Project Structure- **Phone Interface**: http://localhost:3000/phone



**Vercel deployment issues?**

- Ensure environment variable `REACT_APP_API_URL` is set

- Verify Instatunnel is running: `https://printchakra-backend.instatunnel.my/health````- **Backend API**: http://localhost:5000│   │   ├── config.ts   # API configuration---

- Redeploy after adding environment variables

printchakra-latest(phase)/

## 🎯 What Happens When You Run `start-all.ps1`

├── backend/              # Flask Python server

1. **Checks for Instatunnel** - Warns if not installed

2. **Starts Backend** - Opens new window, runs Flask server│   ├── app.py           # Main application

3. **Starts Instatunnel** - Opens new window, creates tunnel

4. **Starts Frontend** - Opens new window, runs React dev server│   ├── requirements.txt # Dependencies## Project Structure│   │   └── App.tsx     # Main app component

5. **Shows URLs** - Displays all access points

│   └── .env            # Configuration

**Result:** Three terminal windows running all services!

├── frontend/            # React TypeScript app

## 📚 Documentation

│   ├── src/

- **README.md** (this file) - Quick start guide

- **VERCEL_DEPLOYMENT.md** - Complete Vercel deployment guide│   │   ├── pages/      # Dashboard & Phone```│   └── package.json## 🚀 Quick Start (60 Seconds)

- **DEPLOY_STATUS.md** - Deployment checklist

- **STATUS.md** - Current project status│   │   └── config.ts   # API settings (uses env vars)



## 📝 License│   ├── .env.production # Production configprintchakra-latest(phase)/



MIT License│   └── vercel.json     # Vercel configuration



---├── start-all.ps1        # Start both servers├── backend/              # Flask Python server│



**Made with ❤️ for seamless document processing**├── deploy-vercel.ps1    # Deploy to Vercel



**One Command Start:** `.\start-all.ps1` 🚀  └── VERCEL_DEPLOYMENT.md # Deployment guide│   ├── app.py           # Main application

**Deploy to Vercel:** `.\deploy-vercel.ps1` 🌐

```

│   ├── requirements.txt # Dependencies├── backend/            # Flask Python server### 1. Start All Services

## 🔧 Configuration

│   └── .env            # Configuration

### Local Development

├── frontend/            # React TypeScript app│   ├── app.py          # Main Flask application**Double-click** `START_PRINTCHAKRA.bat`

Frontend automatically uses `http://localhost:5000` for local development.

│   └── src/

### Production (Vercel)

│       ├── pages/      # Dashboard & Phone│   ├── requirements.txt

Frontend uses environment variable `REACT_APP_API_URL` from Vercel settings.

│       └── config.ts   # API settings

**Backend URL:** `https://printchakra-backend.instatunnel.my`

└── old/                # Previous project backup│   ├── .env            # Environment configurationOr run in PowerShell:

## 📡 API Endpoints

```

| Method | Endpoint | Description |

|--------|----------|-------------|│   ├── uploads/        # Original uploaded files```powershell

| GET | `/health` | Server status |

| POST | `/upload` | Upload & process image |## Configuration

| GET | `/files` | List all files |

| GET | `/processed/<file>` | Get processed image |│   ├── processed/      # Processed images.\start_services.ps1

| DELETE | `/delete/<file>` | Delete file |

| GET | `/ocr/<file>` | Get extracted text |### Local Development

| POST | `/print` | Trigger capture |

│   ├── processed_text/ # Extracted OCR text```

## 🛠️ Technology Stack

**frontend/src/config.ts**:

**Backend**: Flask • OpenCV • Tesseract • Socket.IO  

**Frontend**: React • TypeScript • React Router • Axios  ```typescript│   └── print_scripts/  # Print utilities

**Deployment**: Vercel (Frontend) • Instatunnel (Backend)

export const API_BASE_URL = 'http://localhost:5000';

## 🆘 Troubleshooting

```│### 2. Open Dashboard

**Backend won't start?**

- Check Python is installed: `python --version`

- Install Tesseract OCR

- Check port 5000 is available### Instatunnel Deployment└── old/                # Previous project files (backup)Open browser: **http://localhost:3000**



**Frontend won't start?**

- Check Node.js is installed: `node --version`

- Run: `cd frontend; npm install`**frontend/src/config.ts**:```



**Vercel deployment issues?**```typescript

- Ensure environment variable `REACT_APP_API_URL` is set

- Verify Instatunnel is running: `https://printchakra-backend.instatunnel.my/health`export const API_BASE_URL = 'https://printchakra-backend.instatunnel.my';### 3. Connect Phone (Optional)

- Redeploy after adding environment variables

```

## 📚 Documentation

## 🚀 Quick Start```powershell

- **README.md** (this file) - Quick start guide

- **VERCEL_DEPLOYMENT.md** - Complete Vercel deployment guide## API Endpoints

- **STATUS.md** - Current project status

cd PrintChakraPhone

## 📝 License

| Method | Endpoint | Description |

MIT License

|--------|----------|-------------|### Prerequisitesnpm start

---

| GET | `/health` | Server status |

**Made with ❤️ for seamless document processing**

| POST | `/upload` | Upload & process image |```

**Deploy to Vercel:** `.\deploy-vercel.ps1` 🚀

| GET | `/files` | List all files |

| GET | `/processed/<file>` | Get processed image |- **Python 3.8+** with pipScan QR code with Expo Go app.

| DELETE | `/delete/<file>` | Delete file |

| GET | `/ocr/<file>` | Get extracted text |- **Node.js 16+** with npm

| POST | `/print` | Trigger capture |

- **Tesseract OCR** ([Download](https://github.com/UB-Mannheim/tesseract/wiki))### 4. Test System

## Technology Stack

**Double-click** `RUN_TESTS.bat`

**Backend**: Flask • OpenCV • Tesseract • Socket.IO  

**Frontend**: React • TypeScript • React Router • Axios### Installation



## TroubleshootingOr run:



**Backend won't start?**1. **Install Tesseract OCR**:```powershell

- Check Python is installed: `python --version`

- Install Tesseract OCR   - Download from: https://github.com/UB-Mannheim/tesseract/wiki.\test_suite.ps1

- Check port 5000 is available

   - Add to PATH or update `pytesseract.pytesseract.tesseract_cmd` in `backend/app.py````

**Frontend won't start?**

- Check Node.js is installed: `node --version`

- Run: `cd frontend; npm install`

- Check port 3000 is available2. **Start the Backend**:---



**Tesseract not found?**   ```powershell

- Install from: https://github.com/UB-Mannheim/tesseract/wiki

- Update path in `backend/app.py` line 42 if needed   .\start-backend.ps1## 📋 System Requirements



## License   ```



MIT License### Required:



---3. **Start the Frontend** (in a new terminal):- ✅ Windows 10/11



**Made with ❤️ for seamless document processing**   ```powershell- ✅ Node.js v16+


   .\start-frontend.ps1- ✅ Python 3.8+

   ```- ✅ 4GB RAM minimum



4. **Or start both together**:### Optional:

   ```powershell- ⚠️ Tesseract OCR (for text extraction)

   .\start-all.ps1- ⚠️ Smartphone with Expo Go (for camera capture)

   ```- ⚠️ PM2 (for production deployment)



5. **Open your browser**: http://localhost:3000---



## 🔧 Configuration## 📁 Project Structure



### Backend (.env)```

printchakra-latest(phase)/

```env│

BACKEND_URL=https://printchakra-backend.instatunnel.my├── 🚀 START_PRINTCHAKRA.bat      # Double-click to start

PORT=5000├── 🧪 RUN_TESTS.bat              # Double-click to test

```├── ⚙️ start_services.ps1         # PowerShell startup script

├── 🛑 stop_services.ps1          # PowerShell stop script

### Frontend (src/config.ts)├── 📊 test_suite.ps1             # Comprehensive tests

├── 🔄 test_e2e.ps1               # End-to-end tests

For local development:│

```typescript├── 📚 Documentation/

export const API_BASE_URL = 'http://localhost:5000';│   ├── DEPLOYMENT.md             # Complete deployment guide

```│   ├── TESSERACT_SETUP.md        # OCR installation

│   ├── PHASE_7_COMPLETE.md       # Phase 7 report

For Instatunnel:│   ├── PHASE_6_PROGRESS.md       # Phase 6 features

```typescript│   └── README_PHASE6.md          # OCR quick start

export const API_BASE_URL = 'https://printchakra-backend.instatunnel.my';│

```├── 🖥️ printchakra-server/       # Node.js Backend

│   ├── server.js                 # Express server

## 📡 API Endpoints│   ├── package.json              # Dependencies

│   ├── uploads/                  # Uploaded images

| Method | Endpoint | Description |│   ├── processed/                # Enhanced images

|--------|----------|-------------|│   ├── processed_text/           # OCR text files

| GET | `/` | Health check |│   └── static/                   # Dashboard UI

| GET | `/health` | Server status |│

| POST | `/upload` | Upload and process image |├── 🤖 image_proc/                # Flask AI Service

| GET | `/files` | List all files |│   ├── app.py                    # Image processing

| GET | `/processed/<filename>` | Get processed image |│   ├── requirements.txt          # Python packages

| DELETE | `/delete/<filename>` | Delete file |│   └── venv/                     # Virtual environment

| GET | `/ocr/<filename>` | Get extracted text |│

| POST | `/print` | Trigger capture event |├── 📱 PrintChakraPhone/          # React Native App

│   ├── App.js                    # Main entry

## 🖥️ Usage│   ├── components/               # Camera component

│   └── package.json              # Dependencies

### Dashboard (http://localhost:3000)│

└── 📝 workflow/                  # Phase documentation

- View all processed documents    ├── phase-1.txt → phase-7.txt

- View extracted OCR text    └── Project roadmap

- Download images```

- Delete files

- Trigger remote camera capture---



### Phone Interface (http://localhost:3000/phone)## 🎮 How to Use



- Choose file upload or camera capture### Desktop User:

- Auto-upload and process images

- Receive remote capture triggers1. **Start the system**

   ```powershell

## 🌐 Deployment with Instatunnel   .\start_services.ps1

   ```

1. Start backend:

   ```powershell2. **Open dashboard**

   .\start-backend.ps1   ```

   ```   http://localhost:3000

   ```

2. Create Instatunnel:

   ```bash3. **Scan a document**

   instatunnel http 5000 --subdomain printchakra-backend   - Click "Print Blank" button

   ```   - Phone auto-captures (if connected)

   - Or upload image manually

3. Update `frontend/src/config.ts` with Instatunnel URL   - View processed result



4. Deploy frontend to Vercel/Netlify:4. **Manage files**

   ```bash   - Click file to view full size

   cd frontend   - Download processed images

   npm run build   - Delete unwanted files

   vercel   - Auto-refresh every 10 seconds

   ```

### Phone User:

## 🛠️ Technology Stack

1. **Install Expo Go** from app store

### Backend

- Flask 3.0.0 - Web framework2. **Start Expo**

- OpenCV 4.8.1 - Image processing   ```powershell

- Tesseract - OCR engine   cd PrintChakraPhone

- Socket.IO - Real-time communication   npm start

   ```

### Frontend

- React 18 + TypeScript3. **Scan QR code** with Expo Go

- React Router - Navigation

- Socket.IO Client - WebSocket4. **Grant camera permissions**

- Axios - HTTP client

5. **Position phone** above document

## 🔍 Troubleshooting

6. **Wait for trigger** from desktop (automatic)

**Tesseract not found:**

- Install Tesseract and add to PATH7. **Image uploads** automatically

- Or update path in `backend/app.py`

---

**Port already in use:**

- Change PORT in `backend/.env`## 🧪 Testing

- Or kill process using the port

### Automated Tests:

**CORS errors:**

- Verify CORS_ORIGINS in `backend/.env````powershell

- Check API_BASE_URL in `frontend/src/config.ts`# Run all tests (21 tests, ~30 seconds)

.\test_suite.ps1

## 📝 License

# Run end-to-end workflow test

MIT License.\test_e2e.ps1

```

---

### Test Coverage:

**Made with ❤️ for seamless document processing**- ✅ Service availability (Node.js, Flask)

- ✅ All API endpoints
- ✅ File system structure
- ✅ Dashboard functionality
- ✅ Socket.IO connectivity
- ✅ Performance metrics
- ✅ Configuration files

### Expected Results:
```
Tests Passed:  21
Tests Failed:  0
Tests Skipped: 1
Pass Rate:     95.45%
Result:        ALL TESTS PASSED!
```

---

## 🔧 Configuration

### Desktop IP Address (for phone connection)
Find your IP:
```powershell
ipconfig | findstr "IPv4"
```

Update in `PrintChakraPhone/App.js`:
```javascript
const backendUrl = 'http://YOUR_DESKTOP_IP:3000';
```

### Ports Used:
- **3000** - Node.js backend + dashboard
- **5001** - Flask image processing
- **8081** - Expo Metro bundler (optional)

---

## 🚀 Production Deployment

### Option 1: PM2 (Recommended)

```powershell
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.json

# Save configuration
pm2 save

# Enable auto-startup
pm2 startup
```

### Option 2: Windows Service

See `DEPLOYMENT.md` for NSSM configuration.

### Option 3: Manual

Start each service in separate terminals.

---

## 📊 System Status

### Current Status: ✅ All Systems Operational

```
✅ Node.js Backend    - Port 3000
✅ Flask Processing   - Port 5001
✅ Dashboard          - http://localhost:3000
✅ Test Suite         - 95.45% pass rate
```

### API Endpoints:
```
GET  /api/files                   - List processed files
POST /api/print                   - Trigger capture (Socket.IO)
POST /upload                      - Upload & process image
DELETE /api/delete?file=name.jpg  - Delete file

GET  /health                      - Flask health check
GET  /test                        - Directory verification
POST /process                     - AI image processing
GET  /ocr?file=name.txt          - Get OCR text
```

---

## 🛠️ Troubleshooting

### Services not starting?
```powershell
# Check if ports are in use
netstat -ano | findstr :3000
netstat -ano | findstr :5001

# Kill conflicting processes
taskkill /PID <PID> /F

# Restart services
.\start_services.ps1
```

### Phone not connecting?
1. Check desktop IP: `ipconfig`
2. Update `App.js` with correct IP
3. Ensure both on same WiFi network
4. Check firewall allows port 3000

### OCR not working?
Install Tesseract OCR:
- See `TESSERACT_SETUP.md`
- Download: https://github.com/UB-Mannheim/tesseract/wiki
- Restart Flask service

---

## 📚 Complete Documentation

### User Guides:
- **DEPLOYMENT.md** - Complete deployment guide + user manual
- **TESSERACT_SETUP.md** - OCR installation (5 minutes)
- **README_PHASE6.md** - Phase 6 features quick start

### Technical Reports:
- **PHASE_7_COMPLETE.md** - Testing & deployment report
- **PHASE_6_PROGRESS.md** - OCR implementation details
- **TEST_REPORT.md** - Initial test documentation

### Development Phases:
- **workflow/phase-1.txt** - Backend setup
- **workflow/phase-2.txt** - Phone app
- **workflow/phase-3.txt** - AI processing
- **workflow/phase-4.txt** - Dashboard
- **workflow/phase-6.txt** - OCR features
- **workflow/phase-7.txt** - Testing & deployment

---

## 🎯 Technology Stack

### Backend:
- **Node.js** + **Express** 5.1.0 - REST API server
- **Socket.IO** 4.8.1 - Real-time communication
- **Multer** - File upload handling

### AI Processing:
- **Flask** 3.1.2 - Python web framework
- **OpenCV** 4.12.0.88 - Image processing
- **NumPy** 2.2.6 - Numerical operations
- **Pillow** 11.3.0 - Image enhancement
- **Pytesseract** 0.3.13 - OCR text extraction

### Frontend:
- **React Native** 0.74.5 - Mobile app
- **Expo SDK** ~51.0.0 - Development platform
- **HTML/CSS/JS** - Web dashboard

---

## 🏆 Features by Phase

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Node.js Backend | ✅ Complete |
| 2 | React Native App | ✅ Complete |
| 3 | AI Image Processing | ✅ Complete |
| 4 | Web Dashboard | ✅ Complete |
| 6 | OCR Text Extraction | ✅ Complete |
| 6 | Perspective Correction | ✅ Complete |
| 7 | Testing & Deployment | ✅ Complete |

**Overall Completion: 98%** 🎉

---

## 🎓 Perfect For:

✅ College projects and submissions  
✅ Portfolio demonstration  
✅ Real-world document scanning  
✅ Office automation  
✅ Personal document management  
✅ Learning full-stack development  

---

## 📞 Quick Commands

```powershell
# Start everything
.\start_services.ps1

# Stop everything
.\stop_services.ps1

# Run tests
.\test_suite.ps1

# Open dashboard
Start-Process "http://localhost:3000"

# Check service status
pm2 status

# View logs
pm2 logs
```

---

## 🔒 Security Notes

**Current Setup**: Development mode (no authentication)

**For Production**:
- Add user authentication (JWT)
- Enable HTTPS (SSL certificates)
- Add file size limits
- Implement rate limiting
- Scan uploads for malware

See `DEPLOYMENT.md` for detailed security recommendations.

---

## 📈 Performance

### Benchmarks:
- **API Response**: < 10ms average
- **Image Processing**: 2-5 seconds
- **OCR Extraction**: 2-5 seconds
- **Socket.IO Latency**: < 100ms
- **Memory Usage**: ~200MB total

### Optimizations:
- Image compression (quality: 95%)
- Efficient OpenCV operations
- Memory limits enforced (PM2)
- Auto-cleanup recommended

---

## 🎉 Achievement Unlocked!

**PrintChakra is Production Ready!**

✅ Complete automated workflow  
✅ AI-powered processing  
✅ OCR text extraction  
✅ Comprehensive testing  
✅ Production deployment  
✅ Complete documentation  

---

## 📧 Support

### Documentation:
- All documentation in project root
- Phase-by-phase guides in `workflow/`
- Troubleshooting in `DEPLOYMENT.md`

### Testing:
- Run `.\test_suite.ps1` for diagnostics
- Check `logs/` folder for errors
- Use `pm2 logs` for real-time monitoring

---

**Built with ❤️ for automated document scanning**

**Version**: 1.0.0  
**Release Date**: October 5, 2025  
**Status**: ✅ Production Ready  

---

## 🚀 Get Started Now!

```powershell
# 1. Start the system
.\start_services.ps1

# 2. Open dashboard
Start-Process "http://localhost:3000"

# 3. Run tests
.\test_suite.ps1

# 4. Read the docs
Get-Content DEPLOYMENT.md
```

**🎉 Happy Scanning! 🎉**