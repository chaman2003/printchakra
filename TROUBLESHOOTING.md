# PrintChakra - Setup and Troubleshooting Guide

## 🚀 Quick Setup

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install/Update dependencies
pip install -r requirements.txt

# Verify installation
pip list | Select-String "flask|opencv|tesseract|socketio|pywin32"
```

### 2. Frontend Setup

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Verify installation
npm list socket.io-client axios react-router-dom
```

## 🔧 WebSocket Connection Fixes

### Issues Fixed:
1. ✅ Socket.IO broadcast not working - Added `broadcast=True` to all emit calls
2. ✅ File upload endpoint accepting wrong field name - Now accepts both 'file' and 'photo'
3. ✅ Files endpoint returning wrong structure - Now returns `{files: [], count: n}`
4. ✅ Phone capture event not triggering - Fixed dependency array in useEffect
5. ✅ Auto-reconnection not configured - Added reconnection settings
6. ✅ Error messages not displayed properly - Enhanced error handling

## 🖨️ Printer Setup

### Prerequisites:
- Windows 10/11 with default printer configured
- Python packages: `pywin32`, `fpdf2`

### Test Printer:
1. Click "Test Printer" button in Dashboard
2. This creates `blank.pdf` in `backend/print_scripts/`
3. Verifies printer connection without printing

### Print & Capture Workflow:
1. Click "Print & Capture" in Dashboard
2. Backend prints blank.pdf using `print-file.py`
3. Phone interface receives WebSocket event
4. Auto-captures if in camera mode

## 🐛 Troubleshooting

### Backend Issues

**Port 5000 already in use:**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

**Tesseract not found:**
- Download from: https://github.com/UB-Mannheim/tesseract/wiki
- Add to PATH or update line 42 in `backend/app.py`

**pywin32 installation fails:**
```powershell
pip install --upgrade pywin32
python .\venv\Scripts\pywin32_postinstall.py -install
```

**Socket.IO connection fails:**
- Check CORS settings in `app.py`
- Verify ngrok is running with correct subdomain
- Check firewall settings

### Frontend Issues

**Cannot connect to backend:**
- Verify backend is running: http://localhost:5000/health
- Check `frontend/src/config.ts` for correct API_BASE_URL
- Open browser console for WebSocket errors

**Files not loading:**
- Check Network tab in browser DevTools
- Verify `/files` endpoint returns `{files: [], count: n}`
- Check CORS headers in response

**Camera not working:**
- Grant camera permissions in browser
- Use HTTPS or localhost (camera requires secure context)
- Try different browser (Chrome/Edge recommended)

**Upload fails:**
- Check file size (backend may have limits)
- Verify image format (jpg, png, jpeg)
- Check backend logs for error details

### Printer Issues

**blank.pdf not created:**
```powershell
cd backend/print_scripts
python create_blank_pdf.py
```

**Print command fails:**
- Verify default printer is set in Windows
- Check printer status in Windows Settings
- Run `print-file.py` manually to see errors:
```powershell
cd backend/print_scripts
python print-file.py
```

**Capture not triggered:**
- Verify WebSocket connection (green indicator)
- Check phone is in Camera mode
- Look for capture event in browser console

## 📊 Monitoring

### Backend Logs:
```powershell
# Terminal running backend.ps1 shows:
- Socket.IO connections
- File upload progress
- Print commands
- OCR processing status
```

### Frontend Console:
```javascript
// Open browser DevTools (F12) > Console
// Look for:
- "Connected to server" ✅
- "Received capture command" 📸
- Upload responses and errors
```

### Test WebSocket:
```javascript
// Run in browser console on Dashboard/Phone page:
console.log('Socket connected:', window.socket?.connected);
```

## 🔄 Update Process

### Backend Updates:
```powershell
cd backend
git pull origin main
pip install -r requirements.txt --upgrade
```

### Frontend Updates:
```powershell
cd frontend
git pull origin main
npm install
npm audit fix
```

## 📝 Environment Variables

### Frontend (.env.local):
```env
REACT_APP_API_URL=http://localhost:5000
```

### Frontend (.env.production):
```env
REACT_APP_API_URL=https://freezingly-nonsignificative-edison.ngrok-free.dev
```

### Backend (.env):
```env
FLASK_ENV=development
FLASK_DEBUG=1
```

## ✅ Verification Checklist

- [ ] Backend starts without errors
- [ ] Frontend opens at http://localhost:3000
- [ ] ngrok shows public URL
- [ ] WebSocket shows "Connected" (green)
- [ ] Test Printer creates blank.pdf
- [ ] File upload works from Phone page
- [ ] Files display in Dashboard
- [ ] OCR text extraction works
- [ ] Print & Capture triggers phone
- [ ] Delete function works

## 📞 Support

- Check logs in terminal windows
- Review browser console (F12)
- Verify all services are running
- Test each component individually

## 🎯 Common Workflows

### Test Everything:
1. Start backend: `.\backend.ps1`
2. Start frontend: `cd frontend && npm start`
3. Open http://localhost:3000
4. Click "Test Printer"
5. Upload image from Phone page
6. Verify file appears in Dashboard
7. Click "Print & Capture"
8. Check capture triggered on Phone

### Development Mode:
```powershell
# Terminal 1 - Backend with auto-reload
cd backend
.\venv\Scripts\Activate.ps1
$env:FLASK_DEBUG="1"
python app.py

# Terminal 2 - Frontend with hot reload
cd frontend
npm start

# Terminal 3 - ngrok (optional for remote access)
ngrok http 5000 --subdomain freezingly-nonsignificative-edison
```

---

**Last Updated:** October 12, 2025
**Version:** 2.0.0
