# Setup Checklist

Use this checklist to verify your setup is working correctly.

---

## ✅ Local Development Setup

### Prerequisites
- [ ] Python 3.8+ installed (`python --version`)
- [ ] Node.js/npm installed (`node --version`)
- [ ] Git repository cloned

### Backend Setup
- [ ] Verify backend directory exists: `backend/app.py`
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Activate venv:
  - Windows: `venv\Scripts\activate`
  - Mac/Linux: `source venv/bin/activate`
- [ ] Install requirements: `pip install -r requirements.txt`
- [ ] Test backend: `python app.py`
  - Should see: "Running on http://localhost:5000"
  - Should see: "[CORS] Configured for multi-environment"

### Frontend Setup
- [ ] Verify frontend directory exists: `frontend/package.json`
- [ ] Install dependencies: `npm install` (in frontend directory)
- [ ] No `.env.local` file needed (auto-detects localhost)
- [ ] Test frontend: `npm start` (in frontend directory)
  - Should compile without errors
  - Should open http://localhost:3000
  - Should see Socket connection logs in console

### Verify It Works
- [ ] Backend terminal shows requests coming in
- [ ] Frontend loads without CORS errors
- [ ] Browser console shows: `[Socket] Connected` (or `polling`)
- [ ] Can upload files
- [ ] Can trigger processing
- [ ] Real-time updates show (or polling updates)

---

## ✅ ngrok/Tunnel Setup

### Prerequisites
- [ ] ngrok installed or ready to use
- [ ] Backend working locally first
- [ ] Port 5000 is available

### Configuration
- [ ] Created `frontend/.env.local` file
- [ ] Added: `REACT_APP_API_URL=https://YOUR_NGROK_URL.ngrok-free.dev`
- [ ] ngrok running: `ngrok http 5000`
- [ ] Copied ngrok URL correctly (includes https://)

### Verify Tunnel
- [ ] Backend running on localhost:5000
- [ ] ngrok terminal shows: `Forwarding https://xxx.ngrok-free.dev -> http://localhost:5000`
- [ ] Test in browser: https://xxx.ngrok-free.dev/health
  - Should return JSON response

### Frontend Tunnel
- [ ] Restarted frontend: `npm start`
- [ ] Frontend shows: "Compiled successfully"
- [ ] Browser opens frontend (may show warning about ngrok)
- [ ] Browser console shows connection to ngrok URL
- [ ] Can access from another device using ngrok URL

### Verify It Works
- [ ] Upload works through ngrok
- [ ] Processing works through ngrok
- [ ] Socket.IO shows `polling` (WebSocket may not work through ngrok)
- [ ] Phone/tablet can access using ngrok URL
- [ ] No 403 Forbidden errors

---

## ✅ Deployed Setup

### Backend Deployment
- [ ] Backend deployed to: `https://YOUR_API_DOMAIN.com`
- [ ] Test endpoint: `https://YOUR_API_DOMAIN.com/health`
  - Should return: `{"status": "ok"}`
- [ ] Backend `.env` set with (optional):
  - `FRONTEND_URL=https://app.example.com`
  - `FLASK_ENV=production`
  - `FLASK_DEBUG=False`

### Frontend Deployment
- [ ] Frontend deployed to: `https://YOUR_APP_DOMAIN.com`
- [ ] Set environment variable: `REACT_APP_API_URL=https://YOUR_API_DOMAIN.com`
- [ ] Rebuild and redeploy frontend

### Verify It Works
- [ ] Frontend loads without errors
- [ ] Browser console shows correct API URL
- [ ] API requests reach backend
- [ ] No CORS errors
- [ ] Socket.IO connects (polling or WebSocket)
- [ ] Data persists (refresh page)
- [ ] Can upload and process files

---

## 🆘 Troubleshooting Checklist

### CORS Errors

**Symptom:** "Access to XMLHttpRequest at 'X' from origin 'Y' has been blocked by CORS policy"

Check:
- [ ] Backend is running
- [ ] `REACT_APP_API_URL` is set correctly (if using ngrok/custom)
- [ ] Backend CORS headers are being sent (check Network tab)
- [ ] No typos in URL
- [ ] If ngrok, did you restart frontend after updating .env?

Fix:
```bash
# Option 1: Verify backend running
http://localhost:5000/health

# Option 2: Update .env.local
REACT_APP_API_URL=https://correct-url.com

# Option 3: Restart frontend
Ctrl+C in frontend terminal
npm start
```

### Socket.IO Connection Failed

**Symptom:** "WebSocket connection failed" or socket errors in console

This is **OK**! Check:
- [ ] App still works (just slower updates)
- [ ] Browser shows `polling` transport
- [ ] Backend is running
- [ ] API calls still work

This is normal for:
- ngrok (WebSocket often blocked)
- Firewalls/proxies
- Deployed environments

### "Cannot reach backend" / Network Error

**Symptom:** API returns 404, timeout, or connection refused

Check:
- [ ] Is backend running? (Terminal shows "Running on...")
- [ ] Port 5000 is available: `netstat -ano | findstr 5000`
- [ ] If ngrok: ngrok process still running?
- [ ] If deployed: Is server online?
- [ ] Network connection exists

Fix:
```powershell
# Kill port 5000
Get-Process python | Stop-Process -Force

# Restart backend
.\backend.ps1
```

### Localhost 5000 Already in Use

**Symptom:** "Address already in use" or "Port 5000 is already in use"

Fix:
```powershell
# Find what's using port 5000
netstat -ano | findstr 5000

# Kill the process
taskkill /PID <PID> /F

# Or kill all Python processes
Get-Process python | Stop-Process -Force
```

### Frontend Doesn't Compile

**Symptom:** `npm start` errors or "Failed to compile"

Check:
- [ ] Node version: `node --version` (should be 14+)
- [ ] npm version: `npm --version` (should be 6+)
- [ ] Dependencies installed: `npm install`
- [ ] No .env.local syntax errors
- [ ] Not missing node_modules

Fix:
```bash
# Clear and reinstall
rm -r node_modules
npm install
npm start
```

### Backend Won't Start

**Symptom:** Python errors or "Flask app failed to start"

Check:
- [ ] Python version: `python --version` (should be 3.8+)
- [ ] Virtual environment activated
- [ ] Requirements installed: `pip install -r requirements.txt`
- [ ] Port 5000 available
- [ ] No import errors in terminal

Fix:
```powershell
# Verify Python
python --version

# Recreate venv
python -m venv venv
venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Start
python app.py
```

### "Module not found" Error

**Symptom:** `ModuleNotFoundError: No module named 'X'`

Fix:
```bash
# Reinstall requirements
pip install -r requirements.txt

# Or install specific module
pip install module-name

# Restart backend
python app.py
```

### Images Won't Load

**Symptom:** 404 errors for image files

Check:
- [ ] Upload directory exists: `backend/public/data/uploads`
- [ ] Processed directory exists: `backend/public/data/processed`
- [ ] Files were uploaded successfully (check terminal logs)
- [ ] Backend serving static files correctly

---

## ⚙️ Configuration Verification

### Check Frontend Config
```javascript
// In browser console:
import { API_BASE_URL, ENVIRONMENT } from './config'
console.log(API_BASE_URL)      // Should show your backend URL
console.log(ENVIRONMENT)        // Should show 'development', 'custom-url', or 'deployed'
```

### Check Backend Config
```bash
# In backend terminal:
# Should show:
# [CORS] Configured for multi-environment: local, ngrok, deployed
# [Socket] Initializing Socket.IO connection
```

### Test API Endpoint
```bash
# In terminal or Postman:
curl http://localhost:5000/health
# Should return: {"status": "ok"}
```

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

### Code
- [ ] No console errors in development
- [ ] No CORS errors
- [ ] All features working locally
- [ ] Removed debug code
- [ ] Environment variables set correctly

### Backend
- [ ] All requirements in `requirements.txt`
- [ ] `.env` configured for production
- [ ] `FLASK_ENV=production`
- [ ] `FLASK_DEBUG=False`
- [ ] Database/storage configured
- [ ] Logging configured
- [ ] Error handling tested

### Frontend
- [ ] `REACT_APP_API_URL` set to production API
- [ ] Build optimized: `npm run build`
- [ ] No hardcoded localhost URLs
- [ ] Environment variables set on deployment platform
- [ ] Build size acceptable
- [ ] Performance tested

### Deployment
- [ ] Backend deployed and running
- [ ] Frontend deployed and running
- [ ] Both can reach each other
- [ ] CORS headers correct
- [ ] SSL/HTTPS working
- [ ] DNS pointing to correct servers
- [ ] Backups configured

---

## ✅ Final Verification

Before considering setup complete:

- [ ] Can run locally with `npm start` and `python app.py`
- [ ] Can share via ngrok tunnel
- [ ] Can deploy to production
- [ ] Auto-detection works (no manual URL switching needed)
- [ ] Socket.IO connects (or falls back gracefully)
- [ ] All endpoints respond
- [ ] No CORS errors
- [ ] Errors handled gracefully
- [ ] Documentation understood
- [ ] Team can replicate setup

If all checked: **🎉 Setup Complete!**
