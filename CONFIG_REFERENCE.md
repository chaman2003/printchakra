# Configuration Reference

## How Configuration Works

PrintChakra automatically detects your environment and routes requests correctly:

```
Environment Detection Priority:
1. Explicit REACT_APP_API_URL environment variable (highest)
   ↓
2. Detected hostname (localhost = local dev)
   ↓
3. Same-host connection (deployed on same server)
```

---

## Frontend Configuration

### Automatic Detection (No Setup Needed!)

When frontend and backend run on same machine:
```
✅ Frontend on localhost:3000
✅ Backend on localhost:5000
→ Auto-connects!
```

### Manual Configuration (.env.local)

Create `frontend/.env.local` with:

```bash
# ngrok development
REACT_APP_API_URL=https://abc123.ngrok-free.dev

# OR custom server
REACT_APP_API_URL=http://192.168.1.100:5000

# OR production
REACT_APP_API_URL=https://api.myapp.com

# Debug mode (optional)
REACT_APP_DEBUG=true
```

### How Frontend Chooses Backend

```typescript
// Priority order in config.ts:

1. process.env.REACT_APP_API_URL
   ↓ (if not set)
2. window.location.hostname === 'localhost'
   → returns 'http://localhost:5000'
   ↓ (if not localhost)
3. Same host as frontend
   → returns current host URL
```

---

## Backend Configuration

### Local Development (Default)

```bash
# Nothing needed! Just run:
python app.py
# Listens on http://localhost:5000
```

### Deployed with Custom Domain

Create `backend/.env`:

```bash
# Tell backend about frontend for CORS
FRONTEND_URL=https://app.myapp.com

# Optional: ngrok tunnel
NGROK_URL=https://abc123.ngrok-free.dev

# Flask settings
FLASK_ENV=development
FLASK_DEBUG=False
```

### Environment Variables

```bash
# NGROK_URL: Set when using ngrok tunnel
export NGROK_URL=https://abc123.ngrok-free.dev

# FRONTEND_URL: Set for CORS configuration
export FRONTEND_URL=https://app.example.com

# FLASK_ENV: development or production
export FLASK_ENV=development

# FLASK_DEBUG: Enable debug mode
export FLASK_DEBUG=False
```

---

## Socket.IO Configuration

### Automatic Configuration

Socket.IO is automatically configured for:
- ✅ Local WebSocket connections
- ✅ Polling fallback for firewalls/proxies
- ✅ ngrok tunnel compatibility
- ✅ Deployed environments

### What if Socket.IO doesn't connect?

This is normal! Fallback chain:
```
1. Try WebSocket
   ↓ (if blocked by firewall/proxy)
2. Use HTTP polling
   ↓ (if that fails)
3. Continue without real-time (stateless)
```

The app works in all cases, just with different update frequencies.

---

## CORS Configuration

### Frontend Origins Allowed

The backend allows requests from:
- `http://localhost:*`
- `http://127.0.0.1:*`
- `*.ngrok-free.dev` (ngrok)
- `*` (all - safe for development)

### Custom CORS Origins

Edit `backend/app.py` line ~325:

```python
allowed_origins = [
    "http://my-custom-domain.com",
    "https://my-custom-domain.com",
]
```

### CORS Headers Sent

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS, PUT, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization, ...
Access-Control-Allow-Credentials: true
```

---

## Image URLs and Caching

### How Images Load

```typescript
// Using CORS-compliant image serving
export const getImageUrl = (endpoint: string, filename: string) => {
  const baseUrl = API_BASE_URL;
  const fullUrl = `${baseUrl}${endpoint}/${filename}`;
  
  // Add timestamp to bypass browser cache
  return `${fullUrl}?_t=${Date.now()}`;
};
```

### Supported Endpoints

- `/public/uploads/` - Original uploads
- `/public/processed/` - Processed images
- `/public/converted/` - Converted files

---

## Logging and Debugging

### Enable Debug Output

**Frontend:**
```bash
# In .env.local
REACT_APP_DEBUG=true

# Browser console will show:
# [Config] Using REACT_APP_API_URL: ...
# [Socket] Environment: development
# [Socket] Backend URL: ...
```

**Backend:**
```bash
# In .env or command line
FLASK_DEBUG=True

# Terminal will show detailed logs:
# * Running on http://localhost:5000
# * Debug mode: on
```

### Check Connection Status

**Browser Console:**
```javascript
// Check API URL
localStorage.getItem('api_url')

// Or from config
import { API_BASE_URL, ENVIRONMENT } from './config'
console.log('API:', API_BASE_URL)
console.log('Environment:', ENVIRONMENT)
```

**Backend Terminal:**
```
[CORS] Configured for multi-environment: local, ngrok, deployed
[Socket] Initializing Socket.IO connection
```

---

## Common Setups

### Setup 1: Local Testing (Laptop Only)

```bash
# No configuration needed!
cd scripts
.\backend.ps1      # Terminal 1
.\frontend.ps1     # Terminal 2

# Open: http://localhost:3000
```

### Setup 2: ngrok Sharing

```bash
# frontend/.env.local
REACT_APP_API_URL=https://abc123.ngrok-free.dev

# Terminal 1: Backend
.\backend.ps1

# Terminal 2: ngrok
.\ngrok.ps1

# Terminal 3: Frontend
.\frontend.ps1

# Share: https://abc123.ngrok-free.dev
```

### Setup 3: Production Deployment

```bash
# Deploy backend to: https://api.app.com
# Deploy frontend to: https://app.com

# Frontend environment variable:
REACT_APP_API_URL=https://api.app.com

# Backend environment variable:
FRONTEND_URL=https://app.com

# Works automatically!
```

### Setup 4: Docker/Container

```dockerfile
# Frontend Dockerfile
ENV REACT_APP_API_URL=http://backend:5000

# Backend runs on :5000 inside container
# Frontend connects to http://backend:5000
```

---

## Troubleshooting Configuration

| Issue | Check | Fix |
|-------|-------|-----|
| CORS error | Browser console | Update REACT_APP_API_URL in .env.local |
| API timeout | Backend running? | Check `http://localhost:5000/health` |
| Socket fails | Look for polling | App still works, just slower updates |
| Image won't load | Network tab | Is CORS header present? |
| ngrok URL broken | Did it restart? | ngrok URL changes on restart - update .env |
| Port in use | `netstat -ano` | Kill process and restart |

---

## Environment Files

### frontend/.env.local
```bash
# For ngrok or custom backend (optional)
REACT_APP_API_URL=https://your-url.com

# Debug mode
REACT_APP_DEBUG=false
```

### backend/.env
```bash
# For deployed environments (optional)
FRONTEND_URL=https://app.example.com
NGROK_URL=https://abc123.ngrok-free.dev

# Flask settings
FLASK_ENV=development
FLASK_DEBUG=False
```

---

## Further Help

- **Quick Start**: See `QUICKSTART.md`
- **ngrok Setup**: See `NGROK_SETUP.md`
- **Backend API**: See `backend/app.py`
- **Frontend Code**: See `frontend/src/`
