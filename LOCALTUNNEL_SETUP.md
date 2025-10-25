# LocalTunnel Setup for PrintChakra

## 🎯 Fixed Subdomain Configuration

PrintChakra now uses **LocalTunnel** with a **fixed subdomain** for consistent API endpoints.

### Fixed URL
```
https://printchakra-api.loca.lt
```

This URL remains the same every time you run the tunnel script!

## 🚀 Quick Start

### 1. Start Backend
```powershell
.\backend.ps1
```

### 2. Start Tunnel
```powershell
.\instatunnel.ps1
```

The tunnel will start with the fixed subdomain `printchakra-api`.

### 3. First-Time Setup (Important!)

When you first access `https://printchakra-api.loca.lt`, LocalTunnel will show a landing page asking you to click a button to proceed. This is a one-time security check.

**Steps:**
1. Open browser to: https://printchakra-api.loca.lt
2. Click the "Click to Continue" button
3. The tunnel is now active and ready!

You may need to do this again if you restart the tunnel.

## 📝 Configuration

### Frontend Config
The frontend is already configured to use the fixed subdomain:

**File:** `frontend/src/config.ts`
```typescript
const prodUrl = 'https://printchakra-api.loca.lt';
```

### Environment Variable (Optional)
You can override the URL using an environment variable:

**Vercel:**
```
REACT_APP_API_URL=https://printchakra-api.loca.lt
```

**Local .env:**
```env
REACT_APP_API_URL=https://printchakra-api.loca.lt
```

## 🔄 Subdomain Reservation

The subdomain `printchakra-api` is requested from LocalTunnel on each run. 

**Note:** LocalTunnel subdomains are **first-come, first-served**. If someone else is using `printchakra-api`, the tunnel will fail. In that case:

### Change the Subdomain

1. **Edit `instatunnel.ps1`:**
   ```powershell
   $SUBDOMAIN = "printchakra-api-2"  # Change this
   ```

2. **Edit `frontend/src/config.ts`:**
   ```typescript
   const prodUrl = 'https://printchakra-api-2.loca.lt';  // Match the subdomain
   ```

3. **Rebuild and redeploy frontend:**
   ```bash
   cd frontend
   npm run build
   ```

## 🆚 LocalTunnel vs ngrok

### Why LocalTunnel?

| Feature | LocalTunnel | ngrok (Free) |
|---------|-------------|--------------|
| **Monthly Limit** | ✅ Unlimited | ❌ Limited requests |
| **Fixed Subdomain** | ✅ Yes | ❌ Random URL |
| **Setup** | ✅ Simple | ⚠️ Account required |
| **Speed** | ⚠️ Moderate | ✅ Fast |
| **Reliability** | ⚠️ Good | ✅ Excellent |
| **Cost** | ✅ Free | ✅ Free (limited) |

**Verdict:** LocalTunnel is better for development when you need consistent URLs and unlimited requests.

## 🐛 Troubleshooting

### Subdomain Already in Use
```
Error: Subdomain 'printchakra-api' is already in use
```

**Solution:** Change the subdomain in `instatunnel.ps1` and `config.ts`.

### Tunnel Not Starting
1. Check if backend is running: `Test-NetConnection localhost -Port 5000`
2. Check if localtunnel is installed: `lt --version`
3. Reinstall if needed: `npm install -g localtunnel`

### CORS Errors Still Occurring
1. Visit the tunnel URL first: https://printchakra-api.loca.lt
2. Click "Click to Continue" button
3. Refresh your app
4. Check browser console for `ngrok-skip-browser-warning` header (works for loca.lt too)

### Tunnel Disconnects Frequently
LocalTunnel can be less stable than ngrok. If disconnections are frequent:

1. **Restart the tunnel:** `Ctrl+C` then `.\instatunnel.ps1`
2. **Use ngrok paid plan:** More stable for production
3. **Deploy backend to cloud:** Render, Railway, Fly.io

### Connection Timeout
```
Error: Connection timeout
```

**Solutions:**
1. Check firewall settings
2. Try a different subdomain
3. Restart your router/network
4. Use a VPN if your ISP blocks tunneling services

## 🎨 Script Features

The `instatunnel.ps1` script includes:

- ✅ Fixed subdomain reservation
- ✅ Backend health check before starting
- ✅ Automatic localtunnel installation
- ✅ Clear instructions for frontend config
- ✅ Colored terminal output
- ✅ Error handling

## 📊 Monitoring

### Check Tunnel Status
```powershell
# Test connection
Test-NetConnection printchakra-api.loca.lt -Port 443

# Check if tunnel is running
Get-Process -Name node | Where-Object {$_.CommandLine -like "*localtunnel*"}
```

### View Tunnel Logs
Tunnel output is displayed in the terminal where you ran `instatunnel.ps1`.

### Test API Endpoint
```powershell
# Test health endpoint
Invoke-WebRequest -Uri https://printchakra-api.loca.lt/health
```

## 🔐 Security Notes

1. **Public Access:** The tunnel URL is publicly accessible. Don't expose sensitive data.
2. **Landing Page:** LocalTunnel's landing page provides basic security against automated bots.
3. **HTTPS:** All connections use HTTPS encryption.
4. **No Authentication:** LocalTunnel doesn't provide built-in auth. Add your own if needed.

## 📚 Additional Resources

- [LocalTunnel Documentation](https://theboroer.github.io/localtunnel-www/)
- [LocalTunnel GitHub](https://github.com/localtunnel/localtunnel)
- [Alternative: ngrok](https://ngrok.com/) (paid plans available)
- [Alternative: serveo](https://serveo.net/) (SSH-based tunneling)

## 🚦 Quick Commands

```powershell
# Start everything
.\backend.ps1                    # Terminal 1
.\instatunnel.ps1                # Terminal 2

# Stop tunnel
Ctrl+C                           # In tunnel terminal

# Restart tunnel
.\instatunnel.ps1                # No config changes needed!

# Check tunnel URL
echo https://printchakra-api.loca.lt
```

## ✅ Success Checklist

- [ ] Backend running on port 5000
- [ ] `instatunnel.ps1` executed successfully
- [ ] Tunnel shows: `your url is: https://printchakra-api.loca.lt`
- [ ] Visited tunnel URL and clicked "Click to Continue"
- [ ] Frontend config matches tunnel subdomain
- [ ] No CORS errors in browser console
- [ ] Files loading successfully in dashboard

---

**Last Updated:** October 25, 2025  
**Script:** `instatunnel.ps1`  
**Fixed URL:** `https://printchakra-api.loca.lt`
