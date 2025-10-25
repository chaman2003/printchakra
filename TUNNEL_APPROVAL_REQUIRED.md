# 🚨 IMPORTANT: LocalTunnel Browser Approval Required!

## ⚠️ Before Your Frontend Can Connect

LocalTunnel requires a **one-time browser approval** before it will serve requests. This is a security feature.

### 📋 Quick Steps (Do This Now!)

1. **Open your browser** and visit:
   ```
   https://printchakra-backend-2025.loca.lt
   ```

2. **You'll see a LocalTunnel landing page** that says:
   ```
   "If you are the developer of this page, visit:
   Click to Continue"
   ```

3. **Click the "Click to Continue" button**

4. **✅ Done!** The tunnel is now approved and will serve requests

### 🔄 When You Need to Do This Again

You'll need to repeat this process:
- Every time you **restart the tunnel** (run `instatunnel.ps1` again)
- After the tunnel has been **idle for too long**
- If you see **503 - Tunnel Unavailable** errors

### 🧪 Test the Tunnel

After clicking "Click to Continue", test if it's working:

**PowerShell:**
```powershell
Invoke-WebRequest -Uri https://printchakra-backend-2025.loca.lt/health -UseBasicParsing
```

**Browser:**
```
https://printchakra-backend-2025.loca.lt/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "message": "PrintChakra Backend is running",
  ...
}
```

### 🎯 Current Tunnel URL

```
https://printchakra-backend-2025.loca.lt
```

This URL is **fixed** and won't change when you restart the tunnel!

### 📝 Summary

1. ✅ Tunnel is running: `https://printchakra-backend-2025.loca.lt`
2. ⚠️ **YOU MUST VISIT IT IN BROWSER** and click "Click to Continue"
3. ✅ After approval, frontend can connect
4. ✅ Repeat approval after tunnel restarts

---

**Next Step:** Open https://printchakra-backend-2025.loca.lt in your browser NOW! 🚀
