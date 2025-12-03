# PrintChakra - Complete Setup & Configuration Guide

## 📚 Documentation Map

Quick links to relevant docs:

| Document | Purpose | Best For |
|----------|---------|----------|
| **QUICKSTART.md** | Get up and running fast | First-time setup |
| **NGROK_SETUP.md** | Comprehensive multi-environment guide | All setup scenarios |
| **CONFIG_REFERENCE.md** | Technical configuration details | Troubleshooting, advanced setup |
| **ENVIRONMENT_DIAGRAMS.md** | Visual architecture diagrams | Understanding architecture |
| **SETUP_CHECKLIST.md** | Verification checklist | Testing and deployment |

---

## 🎯 Getting Started (Choose One)

### 1️⃣ Local Testing Only
**Best for:** Solo development, testing on one computer

```powershell
cd scripts
.\backend.ps1      # Terminal 1
.\frontend.ps1     # Terminal 2
```

✅ **Zero configuration** - app auto-detects localhost
- Open: http://localhost:3000
- Works offline
- Fast WebSocket connection

👉 **Next:** See `QUICKSTART.md` → Option A

---

### 2️⃣ Share with Team (ngrok)
**Best for:** Sharing with teammates, testing on other devices

```powershell
# Copy your ngrok URL from the output
cd scripts
.\backend.ps1      # Terminal 1
.\ngrok.ps1        # Terminal 2
                   # Note the URL: https://xxxxx.ngrok-free.dev

# Edit frontend/.env.local:
REACT_APP_API_URL=https://xxxxx.ngrok-free.dev

cd scripts
.\frontend.ps1     # Terminal 3
```

✅ **Works from anywhere**
- Share the ngrok URL with others
- Access from phone/tablet
- Works remotely

⚠️ **Limitations:**
- ngrok URL changes on restart (update .env)
- WebSocket may downgrade to polling (still works)

👉 **Next:** See `QUICKSTART.md` → Option B or `NGROK_SETUP.md`

---

### 3️⃣ Production Deployment
**Best for:** Permanent hosting, 24/7 availability

```bash
# Backend: Deploy to Heroku, AWS, Railway, etc.
# Frontend: Deploy to Vercel, Netlify, etc.

# Set frontend environment variable:
REACT_APP_API_URL=https://your-api.example.com

# Deploy both
```

✅ **Always online**
- Scalable to many users
- Professional setup
- Works with custom domains

👉 **Next:** See `NGROK_SETUP.md` → Option C

---

### 4️⃣ Same Network (LAN)
**Best for:** Testing on multiple devices on your network

```bash
# Find your IP: ipconfig | findstr IPv4
# Example: 192.168.1.100

# Edit frontend/.env.local:
REACT_APP_API_URL=http://192.168.1.100:5000

# Run scripts
```

✅ **Fast, no internet needed**
- Works on same WiFi network
- Good for demos

👉 **Next:** See `NGROK_SETUP.md` → Option 4

---

## ⚙️ Configuration: How It Works

### Automatic Detection

The app automatically detects where the backend is:

```
When you run on localhost?
    → Automatically connects to localhost:5000 ✅

When deployed together?
    → Automatically uses same host ✅

When using custom URL?
    → Set REACT_APP_API_URL environment variable ✅
```

**No manual URL switching needed!**

### Configuration Priority

1. **Environment Variable** (REACT_APP_API_URL)
   ```bash
   REACT_APP_API_URL=https://custom-api.com
   ```

2. **Auto-Detection** (if not set)
   - Localhost? → http://localhost:5000
   - Same host? → Use current host
   - Deployed? → Configured during deployment

3. **Fallback** (last resort)
   - Uses the same host as frontend

### Example Scenarios

| Running | Auto-Detects | Config Needed |
|---------|--------------|---------------|
| Both local | localhost:5000 | ❌ None |
| Both deployed | Same server | ❌ None |
| Frontend local, ngrok backend | ngrok URL | ✅ Set .env.local |
| Frontend deployed, custom API | API domain | ✅ Set env var |

---

## 🚀 Quick Commands Reference

### Local Setup
```powershell
# Backend (Python)
cd backend
pip install -r requirements.txt    # First time only
python app.py

# Frontend (Node)
cd frontend
npm install                         # First time only
npm start
```

### Using Scripts (Recommended)
```powershell
cd scripts
.\backend.ps1       # Start backend
.\frontend.ps1      # Start frontend (new terminal)
.\ngrok.ps1         # Start ngrok tunnel (new terminal)
.\cleanup.ps1       # Clean up processes
```

### Environment Variables
```powershell
# Set for current session
$env:REACT_APP_API_URL = "https://api.example.com"

# Or create frontend/.env.local
# REACT_APP_API_URL=https://api.example.com
```

---

## 🔍 Verification Checklist

### Backend Running ✅
```
Terminal shows:
✓ "Running on http://localhost:5000"
✓ "[CORS] Configured for multi-environment"
✓ No error messages
```

### Frontend Running ✅
```
Terminal shows:
✓ "Compiled successfully"
✓ "webpack compiled"
✓ No compilation errors

Browser:
✓ http://localhost:3000 loads
✓ No CORS errors in console
✓ "[Socket] Connected" or "[Socket] Using polling"
```

### API Connection ✅
```
Test in browser:
✓ http://localhost:5000/health returns JSON
✓ Files can be uploaded
✓ Processing works
```

---

## 🆘 Troubleshooting Quick Fixes

### CORS Error
```
Check 1: Backend running? → python app.py
Check 2: .env.local correct? → REACT_APP_API_URL=...
Check 3: Restart frontend? → npm start
```

### Port Already in Use
```powershell
Get-Process python | Stop-Process -Force
Get-Process node | Stop-Process -Force
```

### Socket.IO Won't Connect
```
This is OK! Check:
✓ App still works?
✓ Shows "polling" in console?
✓ Backend responding to requests?

WebSocket is optional - polling fallback works fine
```

### Module Not Found
```bash
# Python
pip install -r requirements.txt

# Node
npm install
```

---

## 📖 Full Documentation

For detailed information:

- **Quick Start**: `QUICKSTART.md`
  - 3 main setup options
  - Basic troubleshooting

- **Multi-Environment Guide**: `NGROK_SETUP.md`
  - All 4 setup scenarios in detail
  - Environment-specific troubleshooting
  - Common pitfalls

- **Technical Reference**: `CONFIG_REFERENCE.md`
  - Complete configuration options
  - All environment variables
  - Advanced debugging

- **Architecture**: `ENVIRONMENT_DIAGRAMS.md`
  - Visual diagrams
  - Data flow
  - Decision trees

- **Testing**: `SETUP_CHECKLIST.md`
  - Verification steps
  - Pre-deployment checklist
  - Comprehensive troubleshooting

---

## 🎓 Key Concepts

### Environments
- **Development**: Local machine, localhost
- **Tunnel**: ngrok or similar for sharing
- **Deployed**: Production servers
- **LAN**: Same network sharing

### Automatic Detection
App chooses backend based on:
1. Explicit environment variable
2. Hostname detection
3. Same-host connection

### Socket.IO Transport
- Primary: WebSocket (fast)
- Fallback: HTTP Polling (slower but reliable)

Both work! Polling is normal with proxies/tunnels.

### CORS Headers
Already configured for:
- localhost
- ngrok
- Any deployment
- No manual CORS setup needed

---

## 💡 Pro Tips

### 1. Environment Variables Are Your Friend
Instead of editing config files:
```bash
# Create .env.local for frontend
REACT_APP_API_URL=https://your-url.com

# Or set in deployment platform
```

### 2. Restart Frontend After Config Changes
```powershell
# Kill: Ctrl+C
# Restart: npm start
```

### 3. Check API Endpoint First
```bash
# Before debugging Socket.IO, test API:
curl http://localhost:5000/health
```

### 4. Use Console Logs for Debugging
```javascript
// In browser console:
console.log(localStorage)  // Check stored config
```

### 5. ngrok URL Changes on Restart
Each time ngrok restarts, you get a new URL.
- Update .env.local
- Restart frontend

Use paid ngrok for permanent URLs.

---

## 🔗 Common Workflows

### Workflow 1: Local Testing
```
1. npm start (frontend)
2. python app.py (backend)
3. http://localhost:3000
4. Test and develop
✅ Done
```

### Workflow 2: Sharing with Team
```
1. ngrok http 5000
2. Copy URL
3. Update frontend/.env.local
4. npm start
5. Share URL with team
6. They visit: https://xxx.ngrok-free.dev
✅ Done
```

### Workflow 3: Production
```
1. Deploy backend to production
2. Deploy frontend to production
3. Set REACT_APP_API_URL in platform
4. Both services online
✅ Done
```

### Workflow 4: Debug Production
```
1. Check frontend env vars
2. Test API endpoint
3. Check logs in terminal
4. Verify Socket.IO status
5. Review browser console
✅ Done
```

---

## ❓ FAQ

**Q: Do I need ngrok?**
A: No, only if you want remote access. For local testing, just run both locally.

**Q: What if WebSocket doesn't work?**
A: That's OK! Socket.IO automatically falls back to HTTP polling. App still works.

**Q: Can I use different backend and frontend URLs?**
A: Yes! Set `REACT_APP_API_URL` environment variable to your backend URL.

**Q: How do I update ngrok URL?**
A: Update `frontend/.env.local` and restart frontend with `npm start`.

**Q: Is the app working if Socket.IO shows polling?**
A: Yes! Polling is a fallback transport. WebSocket is the preference, but polling works fine.

**Q: What if I'm on a corporate network?**
A: WebSocket might be blocked. Polling will work. If not, use ngrok with HTTP polling explicitly.

**Q: Can I deploy just the frontend?**
A: Only if you have a backend deployed somewhere. Frontend always needs a backend to connect to.

---

## 🎯 Next Steps

1. **Choose your setup** above (local, ngrok, deployed, or LAN)
2. **Follow the steps** for your choice
3. **Verify using checklist** in `SETUP_CHECKLIST.md`
4. **Read appropriate doc** for your scenario:
   - Local: `QUICKSTART.md`
   - Advanced: `NGROK_SETUP.md`
   - Technical: `CONFIG_REFERENCE.md`
5. **Troubleshoot using** `SETUP_CHECKLIST.md`

---

## 📞 Support

If something doesn't work:

1. Check `SETUP_CHECKLIST.md` Troubleshooting section
2. Review `CONFIG_REFERENCE.md` for your scenario
3. Check browser console for errors
4. Check terminal for error messages
5. Verify backend API is working: `/health` endpoint
6. Try the quick fixes above

**Most issues are:**
- ❌ Backend not running → Start it
- ❌ Wrong REACT_APP_API_URL → Update .env.local
- ❌ Port in use → Kill process
- ❌ Dependencies missing → pip/npm install

---

## 🎉 You're Ready!

All documentation is in place. Choose your setup above and get started!

Questions? Check the appropriate doc above. 📚
