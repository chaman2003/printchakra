# Environment Diagrams

## Architecture Overview

### Local Development ✨
```
┌─────────────────────────────────────┐
│         Your Computer               │
├─────────────────────────────────────┤
│                                     │
│  ┌────────────────┐                │
│  │ Frontend (3000)│                │
│  │  localhost:3   │                │
│  │      000       │                │
│  └────────────────┘                │
│          ↓                          │
│   Auto-detects localhost            │
│          ↓                          │
│  ┌────────────────┐                │
│  │ Backend (5000) │                │
│  │  localhost:5   │                │
│  │     000        │                │
│  └────────────────┘                │
│                                     │
│  ✅ Works! No config needed.       │
│  ✅ Fast local WebSocket            │
│  ✅ No internet required            │
│                                     │
└─────────────────────────────────────┘
```

### ngrok/Tunnel Setup 🌐
```
┌─────────────────────────────────────────────────────────────┐
│         Your Computer                                       │
├────────────────────┬────────────────────────────────────────┤
│                    │                                        │
│ ┌──────────────┐   │   ┌──────────────┐                   │
│ │  Frontend    │   │   │Backend       │                   │
│ │localhost:3000│   │   │localhost:5000│                   │
│ └──────────────┘   │   └──────────────┘                   │
│        ↓           │            ↑                          │
│   Set in .env.local│            │                          │
│        ↓           │            ↓                          │
└────────────────────┼────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │   ngrok Tunnel      │
          │ (localhost:5000)    │
          └──────────┬──────────┘
                     ↓
          ┌──────────────────────┐
          │   Internet (ngrok)   │
          │ https://xxx.ngrok    │
          │-free.dev             │
          └──────────┬───────────┘
                     ↓
          ┌─────────────────────┐
          │  Other Devices      │
          │  (phone, tablet,    │
          │   remote computer)  │
          └─────────────────────┘

Frontend says: REACT_APP_API_URL=https://xxx.ngrok-free.dev
✅ Works from other devices
✅ HTTP polling fallback for WebSocket
⚠️  ngrok URL changes on restart
```

### Deployed Setup 🚀
```
┌─────────────────────────────────────┐
│     Frontend Cloud (Vercel, Netlify)│
│      https://app.example.com        │
│                                     │
│  env: REACT_APP_API_URL=...api... │
│                                     │
│              ↓                      │
│   Connects to Backend API via URL   │
└─────────────────────────────────────┘
                 ↓
    ┌───────────────────────┐
    │   Your Backend        │
    │  https://api.example  │
    │   .com (Heroku, AWS)  │
    │                       │
    │  CORS configured ✅   │
    │  env: FRONTEND_URL    │
    └───────────────────────┘

✅ Scalable
✅ Always online
✅ No client machine needed
```

### Same-Network LAN 🖥️
```
┌──────────────────────────────────────────┐
│          Your Network                    │
│       192.168.1.0/24                    │
│                                          │
│  ┌────────────────────┐                 │
│  │ Main Computer      │                 │
│  │ 192.168.1.100      │                 │
│  │                    │                 │
│  │ Frontend: 3000     │                 │
│  │ Backend: 5000      │                 │
│  │                    │                 │
│  │ .env.local set     │                 │
│  └────────────────────┘                 │
│       ↓              ↓                   │
│   ┌──────────┐  ┌──────────┐           │
│   │  Phone   │  │ Laptop   │           │
│   │WiFi      │  │ WiFi     │           │
│   │192.168.. │  │192.168.. │           │
│   └──────────┘  └──────────┘           │
│                                          │
│  ✅ Works on same network               │
│  ✅ No internet needed                  │
│  ✅ Fast local connection               │
│                                          │
└──────────────────────────────────────────┘
```

---

## Configuration Decision Tree

```
                        START
                         ↓
                  Where run?
                    ↙      ↓      ↘
                   /        |        \
            Laptop   Internet  Deployed
            only     access    server
             ↓          ↓          ↓
        Just run    ngrok or   Docker/
        scripts     tunnel      Cloud
             ↓          ↓          ↓
        READY!    Set .env.    Set env
                  local        vars
             ↓          ↓          ↓
        Works     Works via   Works at
        locally   URL shared  domain.com
```

---

## Data Flow

### Request Flow (Frontend → Backend)

```
User clicks button
       ↓
React component
       ↓
Call apiClient.get(endpoint)
       ↓
axios checks API_BASE_URL
       ↓
Determine backend URL based on:
├─ REACT_APP_API_URL? Use it
├─ localhost? Use localhost:5000
└─ else? Use same host
       ↓
Send HTTP request
       ↓
Backend CORS check
├─ Origin allowed? ✅ Continue
└─ Not allowed? ❌ CORS error
       ↓
Process request
       ↓
Return response
       ↓
React updates UI
```

### WebSocket Connection Flow

```
App loads
       ↓
Socket.IO tries to connect
       ↓
Use API_BASE_URL + /socket.io/
       ↓
Try WebSocket
├─ Success? ✅ Use WebSocket
└─ Blocked? Try next transport
       ↓
Try HTTP Polling
├─ Success? ✅ Use Polling
└─ Failed? Continue without real-time
       ↓
Connected (or gracefully degraded)
       ↓
Listen for events
```

---

## Common Flows

### "I want to test locally"
```
1. Run .\backend.ps1
2. Run .\frontend.ps1
3. Open http://localhost:3000
4. Done! ✅
```

### "I want to share with team"
```
1. Run .\backend.ps1
2. Run .\ngrok.ps1
3. Add to frontend/.env.local:
   REACT_APP_API_URL=https://xxx.ngrok-free.dev
4. Run .\frontend.ps1
5. Share https://xxx.ngrok-free.dev ✅
```

### "I want to deploy to production"
```
1. Deploy backend to https://api.app.com
2. Deploy frontend to https://app.com
3. Set REACT_APP_API_URL=https://api.app.com
4. Works automatically! ✅
```

### "I want LAN access"
```
1. Find IP: ipconfig
2. Add to frontend/.env.local:
   REACT_APP_API_URL=http://192.168.1.100:5000
3. Modify backend to listen on 0.0.0.0
4. Open http://192.168.1.100:3000 from other device ✅
```

---

## Environment Variables Summary

### Frontend Options
```
Auto (local):     No variable needed
Custom:           REACT_APP_API_URL=http://custom.com
ngrok:            REACT_APP_API_URL=https://xxx.ngrok-free.dev
Production:       REACT_APP_API_URL=https://api.app.com
```

### Backend Options
```
Auto (local):     No variables needed
ngrok:            NGROK_URL=https://xxx.ngrok-free.dev
Production:       FRONTEND_URL=https://app.com
Debug:            FLASK_DEBUG=True
```
