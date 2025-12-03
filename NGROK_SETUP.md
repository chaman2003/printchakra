# PrintChakra Multi-Environment Setup Guide

## Automatic Detection 🎯

The application now **automatically detects** your environment and routes to the correct backend:

| Scenario | Detection | Backend URL | Action Required |
|----------|-----------|------------|-----------------|
| **Local Development** | Hostname = localhost | http://localhost:5000 | ✅ None - just run locally |
| **Same Deployment** | Frontend serves from same host | Uses same URL | ✅ None - deployed together |
| **Custom Backend** | Via environment variable | REACT_APP_API_URL | ✅ Set .env.local |
| **ngrok Tunnel** | Via environment variable | Your ngrok URL | ✅ Set .env.local |

---

## Option 1: Local Development (Recommended for Testing)

### Best for:
- Development and testing
- Desktop usage
- No network access needed

### Quick Start:

```powershell
# Terminal 1: Backend
cd scripts
.\backend.ps1

# Terminal 2: Frontend (wait for backend to start)
cd scripts
.\frontend.ps1
```

✅ That's it! The app automatically connects to `http://localhost:5000`

**No configuration needed.** The app detects localhost and connects automatically.

---

## Option 2: ngrok/Tunnel (For Remote Access)

### Best for:
- Testing on phone/tablet
- Remote team access
- Sharing during development

### Step-by-Step:

**1. Start Backend**
```powershell
cd scripts
.\backend.ps1
```

**2. Start ngrok (New Terminal)**
```powershell
cd scripts
.\ngrok.ps1
```

You'll see:
```
Forwarding                    biteable-preintelligently-angeles.ngrok-free.dev -> http://localhost:5000
```

**3. Configure Frontend**

Create `frontend/.env.local`:
```bash
REACT_APP_API_URL=biteable-preintelligently-angeles.ngrok-free.dev
```

**4. Start Frontend (New Terminal)**
```powershell
cd scripts
.\frontend.ps1
```

✅ Now accessible from anywhere via the ngrok URL!

---

## Option 3: Deployed Production (Vercel, Heroku, etc.)

### Best for:
- Production deployments
- Shared hosting
- Always-on systems

### Setup:

**1. Deploy Backend** (e.g., Heroku, AWS, Railway)
- Backend URL: `https://your-api.example.com`

**2. Set Frontend Environment Variable**

Create `frontend/.env.local`:
```bash
REACT_APP_API_URL=https://your-api.example.com
```

Or set in deployment platform (Vercel, Netlify):
```
REACT_APP_API_URL=https://your-api.example.com
```

**3. Deploy Frontend** (e.g., Vercel, Netlify)
- Frontend URL: `https://your-app.example.com`

✅ App automatically connects to your API!

---

## Option 4: Same Network (LAN)

### Best for:
- Multiple devices on same network
- Office testing
- Local area network

### Setup:

**1. Find Your Machine's IP**
```powershell
ipconfig | findstr "IPv4"
```
Example: `192.168.1.100`

**2. Update Backend Script**

Edit `scripts/backend.ps1` - change:
```powershell
python $appFile
```

To:
```powershell
$env:FLASK_RUN_HOST = "0.0.0.0"  # Listen on all interfaces
python $appFile
```

**3. Configure Frontend**

Create `frontend/.env.local`:
```bash
REACT_APP_API_URL=http://192.168.1.100:5000
```

**4. From Another Device**

Access the frontend from another computer on the network:
```
http://192.168.1.100:3000
```

✅ Now works from other devices!

---

## Troubleshooting

### "Failed to fetch" / Network Error

**If local (localhost):**
- ✓ Is backend running? Check: `http://localhost:5000/health`
- ✓ Is frontend on port 3000? Check terminal for "Compiled successfully"
- ✓ Retry - give it 10 seconds to fully start

**If using ngrok:**
- ✓ Is ngrok running? Should see "Forwarding" message
- ✓ Did you update `.env.local` with correct ngrok URL?
- ✓ ngrok URL changes on restart - update .env.local
- ✓ Restart frontend after updating .env.local

**If deployed:**
- ✓ Is backend running and accessible?
- ✓ Are CORS headers correct? (Already configured in app.py)
- ✓ Is REACT_APP_API_URL set correctly?

### Socket.IO "WebSocket connection failed"

**This is normal!** Socket.IO automatically falls back to HTTP polling:
- Works fine, just slower updates
- Common with ngrok/tunnels
- Not an error - app still functions

### Port Already in Use

The scripts automatically try to free ports:
```powershell
# Manual cleanup if needed:
Get-Process python | Stop-Process -Force
Get-Process node | Stop-Process -Force
```

---

## Environment Variables Reference

### Frontend (.env.local or platform settings)

```bash
# Production/API URL (optional - auto-detected if not set)
REACT_APP_API_URL=https://api.example.com

# Debug mode (optional)
REACT_APP_DEBUG=true
```

### Backend (.env file)

```bash
# ngrok tunnel URL (optional)
NGROK_URL=https://your-ngrok-url.ngrok-free.dev

# Frontend URL (optional - for CORS)
FRONTEND_URL=https://your-frontend.example.com

# Flask settings
FLASK_ENV=development
FLASK_DEBUG=False
```

---

## Summary

| Use Case | Steps | Configuration |
|----------|-------|----------------|
| 📱 Local dev (laptop only) | Run backend + frontend scripts | None needed |
| 🌐 Remote access (ngrok) | Add ngrok, update .env.local | `REACT_APP_API_URL=` |
| 🚀 Production deploy | Deploy both, set env vars | Platform env vars |
| 🖥️ LAN sharing | Backend listens on 0.0.0.0, update .env.local | `REACT_APP_API_URL=` |

The app **automatically detects** localhost and routes correctly!
Only set `REACT_APP_API_URL` when using external URLs (ngrok, deployed, etc.)
