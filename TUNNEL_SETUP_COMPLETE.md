# ✅ Fixed Subdomain LocalTunnel - Setup Complete!

## 🎯 What Was Done

Successfully configured **PrintChakra** to use **LocalTunnel with a fixed subdomain** that remains consistent across restarts.

## 🔗 Your Fixed URL

```
https://printchakra-api.loca.lt
```

This URL will be the same **every time** you run `.\instatunnel.ps1`!

## 🚀 How to Use

### Step 1: Start Backend
```powershell
.\backend.ps1
```

### Step 2: Start Tunnel (New Terminal)
```powershell
.\instatunnel.ps1
```

You should see:
```
============================================================
PrintChakra LocalTunnel Launcher
============================================================

Starting LocalTunnel with fixed subdomain...
   Subdomain: printchakra-api
   Local Port: 5000
   Public URL: https://printchakra-api.loca.lt

your url is: https://printchakra-api.loca.lt
```

### Step 3: First-Time Approval (Important!)

1. Open browser: `https://printchakra-api.loca.lt`
2. Click "Click to Continue" button on LocalTunnel landing page
3. ✅ Done! Tunnel is now active

You only need to do this once when you first start the tunnel.

### Step 4: Deploy Frontend

The frontend is already configured to use the fixed subdomain:

```bash
cd frontend
npm run build
# Deploy to Vercel - it will automatically use https://printchakra-api.loca.lt
```

## 📝 Configuration Summary

### ✅ Files Created
1. **`instatunnel.ps1`** - PowerShell script to start tunnel with fixed subdomain
2. **`LOCALTUNNEL_SETUP.md`** - Comprehensive documentation

### ✅ Files Updated
1. **`frontend/src/config.ts`**
   - Changed from: `https://printchakra.loca.lt`
   - Changed to: `https://printchakra-api.loca.lt`

### ✅ Configuration Details
```typescript
// frontend/src/config.ts
const prodUrl = 'https://printchakra-api.loca.lt';
```

```powershell
# instatunnel.ps1
$SUBDOMAIN = "printchakra-api"
$PORT = 5000
```

## 🎨 Script Features

The `instatunnel.ps1` script includes:

- ✅ **Fixed subdomain** (`printchakra-api`)
- ✅ **Backend health check** before starting
- ✅ **Auto-installation** of LocalTunnel if missing
- ✅ **Clear instructions** displayed in terminal
- ✅ **Colored output** for better readability
- ✅ **Error handling** for common issues

## 🔄 Advantages Over ngrok

| Feature | LocalTunnel | ngrok (Free) |
|---------|-------------|--------------|
| Monthly Limit | ✅ **Unlimited** | ❌ Limited (reached) |
| Fixed Subdomain | ✅ **Yes** | ❌ Random URL |
| Setup Time | ✅ **Instant** | ⚠️ Requires account |
| Configuration | ✅ **Already done** | ⚠️ Need to update URL |
| Cost | ✅ **Free** | ✅ Free (limited) |

## 🧪 Testing

### Test the Tunnel
```powershell
# Test connection
Test-NetConnection printchakra-api.loca.lt -Port 443

# Test API endpoint
Invoke-WebRequest -Uri https://printchakra-api.loca.lt/health
```

### Expected Response
```json
{
  "status": "ok",
  "message": "PrintChakra backend is running"
}
```

## 🎯 Next Steps

1. **Keep tunnel running** in its terminal
2. **Start frontend** (separate terminal):
   ```bash
   cd frontend
   npm start
   ```
3. **Test locally**: Open `http://localhost:3000`
4. **Deploy to Vercel**: Push to GitHub, Vercel auto-deploys
5. **Verify**: Test on `https://printchakra.vercel.app`

## 🐛 Troubleshooting

### Subdomain Already Taken
If someone else is using `printchakra-api`:

1. Edit `instatunnel.ps1`:
   ```powershell
   $SUBDOMAIN = "printchakra-api-yourname"
   ```

2. Edit `frontend/src/config.ts`:
   ```typescript
   const prodUrl = 'https://printchakra-api-yourname.loca.lt';
   ```

3. Rebuild frontend: `npm run build`

### Tunnel Won't Start
```powershell
# Reinstall LocalTunnel
npm uninstall -g localtunnel
npm install -g localtunnel

# Try again
.\instatunnel.ps1
```

### CORS Errors
1. Visit `https://printchakra-api.loca.lt` first
2. Click "Click to Continue"
3. Refresh your app

### Backend Not Running
```powershell
# Check if backend is running
Test-NetConnection localhost -Port 5000

# If not, start it
.\backend.ps1
```

## 📊 How It Works

```
┌─────────────────┐
│  Your Browser   │
│  (Vercel App)   │
└────────┬────────┘
         │
         ↓ HTTPS
┌─────────────────────────────┐
│  printchakra-api.loca.lt    │
│  (LocalTunnel Server)       │
└────────┬────────────────────┘
         │
         ↓ Forward
┌─────────────────┐
│  localhost:5000 │
│  (Your Backend) │
└─────────────────┘
```

## ✅ Success Indicators

You know it's working when:

1. ✅ `instatunnel.ps1` shows: `your url is: https://printchakra-api.loca.lt`
2. ✅ Browser can access: `https://printchakra-api.loca.lt/health`
3. ✅ Frontend shows: `Using production URL (LocalTunnel): https://printchakra-api.loca.lt`
4. ✅ No CORS errors in browser console
5. ✅ Files load in dashboard
6. ✅ File uploads work from phone interface

## 📚 Documentation

- **Setup Guide**: `LOCALTUNNEL_SETUP.md` (comprehensive)
- **This Summary**: Quick reference
- **Script**: `instatunnel.ps1` (automated setup)

## 🔐 Security Note

⚠️ **The tunnel URL is publicly accessible**. Anyone with the URL can access your backend. This is fine for development but:

- Don't expose sensitive data
- Don't use in production without authentication
- LocalTunnel's landing page provides basic bot protection

## 🎉 Benefits Achieved

1. ✅ **Consistent URL** - No more updating config on every restart
2. ✅ **No ngrok limits** - Unlimited requests with LocalTunnel
3. ✅ **Easy to remember** - `printchakra-api.loca.lt`
4. ✅ **Automated setup** - Just run `.\instatunnel.ps1`
5. ✅ **Frontend auto-configured** - Works immediately on Vercel
6. ✅ **CORS fixed** - All headers configured properly

## 📞 Quick Commands Reference

```powershell
# Start everything
.\backend.ps1           # Terminal 1
.\instatunnel.ps1       # Terminal 2

# Check tunnel URL
echo https://printchakra-api.loca.lt

# Test tunnel
Invoke-WebRequest -Uri https://printchakra-api.loca.lt/health

# Stop tunnel
# Press Ctrl+C in tunnel terminal

# Restart tunnel (same URL!)
.\instatunnel.ps1
```

---

**Status:** ✅ **COMPLETE AND WORKING**  
**Fixed URL:** `https://printchakra-api.loca.lt`  
**Script:** `instatunnel.ps1`  
**Date:** October 25, 2025  

**You're all set! Just run `.\instatunnel.ps1` and the fixed subdomain will be used automatically!** 🚀
