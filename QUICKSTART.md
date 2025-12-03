# PrintChakra - Quick Start Guide

## 🚀 Three Ways to Run

### **Option A: Local Only (Easiest)** ✨
Perfect for testing on your laptop.

```powershell
# Terminal 1
cd scripts
.\backend.ps1

# Terminal 2 (after backend starts)
cd scripts
.\frontend.ps1
```

Open: `http://localhost:3000`

✅ **Zero configuration needed** - app auto-detects localhost backend!

---

### **Option B: With ngrok (Remote Access)** 🌐
Share access with others or test on phone/tablet.

```powershell
# Terminal 1
cd scripts
.\backend.ps1

# Terminal 2
cd scripts
.\ngrok.ps1
# Copy the ngrok URL shown: https://xxxxx.ngrok-free.dev

# Create frontend/.env.local:
REACT_APP_API_URL=https://xxxxx.ngrok-free.dev

# Terminal 3
cd scripts
.\frontend.ps1
```

Share URL: `https://xxxxx.ngrok-free.dev` (ngrok provides this)

✅ Works locally and remotely!

---

### **Option C: Deployed Production** 🔒
Production server setup.

```powershell
# Deploy backend to: https://api.yourapp.com
# Deploy frontend to: https://app.yourapp.com

# Set environment variable in frontend deployment:
REACT_APP_API_URL=https://api.yourapp.com
```

✅ Auto-detects same host - app works!

---

## 📋 Summary

| Setup | Commands | Config | Open |
|-------|----------|--------|------|
| **Local** | 2 scripts | None | http://localhost:3000 |
| **ngrok** | 3 scripts + .env.local | 1 line | https://xxxxx.ngrok-free.dev |
| **Deployed** | Deploy both | 1 env var | https://app.yourapp.com |

---

## ⚙️ Configuration Details

See `NGROK_SETUP.md` for complete multi-environment setup guide.

### Quick Env Vars:

**Frontend (.env.local):**
```bash
# For ngrok or custom backend:
REACT_APP_API_URL=https://your-backend-url.com
```

**Backend (.env):**
```bash
# Optional - only if using ngrok:
NGROK_URL=https://your-ngrok-url.ngrok-free.dev

# Optional - for deployed:
FRONTEND_URL=https://your-frontend-url.com
```

---

## ✅ Verification

All working? You should see:

1. Backend console:
   - ✓ "Serving Flask app 'app'"
   - ✓ "Running on http://localhost:5000"

2. Frontend console:
   - ✓ "Compiled successfully"
   - ✓ "webpack compiled"

3. Browser:
   - ✓ Pages load
   - ✓ No CORS errors
   - ✓ "[Socket] Connected" (or polling) in console

---

## 🆘 Troubleshooting

**"Cannot connect to backend"**
- Local? Backend running on port 5000? Check terminal
- ngrok? Did you update .env.local? Did you restart frontend?
- Deployed? Is backend URL correct in env vars?

**"Port 5000/3000 already in use"**
- Kill processes: `Get-Process python,node | Stop-Process -Force`

**"WebSocket connection failed"** ✅
- This is OK! Socket.IO falls back to polling
- App still works, just slower real-time updates

---

## 📚 Full Documentation

- **Local Testing**: This guide
- **Multi-Environment Setup**: See `NGROK_SETUP.md`
- **Backend API**: See `backend/app.py` docstrings
- **Frontend Components**: See `frontend/src/components/`

---

## 🎯 Next Steps

1. Choose your option (A, B, or C)
2. Run the commands
3. Open the URL
4. Start building! 🎉
