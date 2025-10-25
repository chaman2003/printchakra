# PrintChakra Deployment Guide

## 🚀 Quick Deploy to Vercel

### Step 1: Rebuild Frontend
```bash
cd frontend
npm run build
```

### Step 2: Deploy to Vercel
Vercel will automatically detect the new changes from GitHub and deploy. Or you can manually deploy:

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Deploy
vercel --prod
```

## 🧪 Testing the CORS Fix

### 1. Check Browser Console
Open https://printchakra.vercel.app and check the browser console:

✅ **Expected**:
```
🔄 API Request: GET /api/files
  headers: { ngrok-skip-browser-warning: "true", ... }
```

❌ **Not Expected**:
```
Access to XMLHttpRequest blocked by CORS policy
ERR_BLOCKED_BY_CLIENT
```

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Refresh the page
3. Click on any API request (e.g., `/api/files`)
4. Check **Request Headers** section:
   - Should include: `ngrok-skip-browser-warning: true`
   - Should include: `Origin: https://printchakra.vercel.app`
5. Check **Response Headers** section:
   - Should include: `Access-Control-Allow-Origin: *`
   - Should include: `Access-Control-Allow-Headers: Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With`

### 3. Test Core Features

#### File Upload (Phone.tsx)
1. Go to https://printchakra.vercel.app/phone
2. Click camera button
3. Capture/select an image
4. Click upload
5. **Expected**: "✅ Upload successful" toast
6. **Check**: File appears in Dashboard

#### File List (Dashboard.tsx)
1. Go to https://printchakra.vercel.app
2. **Expected**: List of uploaded files loads
3. **Check**: No CORS errors in console

#### OCR View
1. Click "View OCR" on any file
2. **Expected**: OCR text displays
3. **Check**: No network errors

#### File Operations
- ✅ Delete file
- ✅ Download processed image
- ✅ Convert files to PDF
- ✅ Download converted files

## 🐛 Troubleshooting

### CORS Errors Still Occurring

#### Check 1: Backend Running?
```bash
# Make sure backend is running
cd backend
python app.py
```

Backend should show:
```
============================================================
PrintChakra Backend Server
============================================================
 * Running on http://127.0.0.1:5000
```

#### Check 2: ngrok Active?
```bash
# Check if ngrok tunnel is running
ngrok http 5000
```

Should show:
```
Forwarding   https://your-domain.ngrok-free.dev -> http://localhost:5000
```

#### Check 3: Frontend Config Correct?
Check `frontend/src/config.ts`:
```typescript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
  'https://freezingly-nonsignificative-edison.ngrok-free.dev';
```

Update the ngrok URL if it changed!

#### Check 4: Browser Extensions
Some ad blockers block ngrok URLs. Try:
1. Disable ad blockers on `printchakra.vercel.app`
2. Whitelist `*.ngrok-free.dev` in extension settings
3. Try in Incognito/Private mode

#### Check 5: Clear Cache
```bash
# Clear browser cache
Ctrl+Shift+Delete → Clear cache

# Clear Vercel deployment cache
vercel --prod --force
```

### ERR_BLOCKED_BY_CLIENT

This error means a browser extension is blocking the request. **Solutions**:

1. **Whitelist ngrok in ad blocker**:
   - uBlock Origin: Settings → Whitelist → Add `*.ngrok-free.dev`
   - Adblock Plus: Settings → Allowlist → Add `*ngrok-free.dev`

2. **Disable privacy extensions temporarily**:
   - Privacy Badger
   - Ghostery
   - Disconnect

3. **Test in different browser**:
   - Try Chrome, Firefox, Edge
   - Use Incognito/Private mode

### ngrok Warning Page Appearing

If you see "You are about to visit...", the `ngrok-skip-browser-warning` header isn't working.

**Check**:
1. Verify `apiClient.ts` is being used (not raw axios)
2. Check browser console logs show header being sent
3. Update to ngrok paid plan for custom domain (bypasses warning)

## 📊 Monitoring

### Backend Logs
```bash
cd backend
python app.py
```

Watch for:
```
OPTIONS request to /api/files
Headers: {'ngrok-skip-browser-warning': 'true', ...}
127.0.0.1 - - [timestamp] "OPTIONS /api/files HTTP/1.1" 200 -
127.0.0.1 - - [timestamp] "GET /api/files HTTP/1.1" 200 -
```

### Frontend Logs
Browser console should show:
```
🔄 API Request: GET /api/files
  headers: { ngrok-skip-browser-warning: "true" }
```

## 🔄 Rollback Plan

If issues persist, rollback:
```bash
git revert HEAD
git push origin main
```

Then redeploy Vercel.

## 📝 Environment Variables

### Vercel Environment Variables
Make sure these are set in Vercel dashboard:

1. Go to https://vercel.com/your-project/settings/environment-variables
2. Add:
   - `REACT_APP_API_BASE_URL` = `https://your-ngrok-url.ngrok-free.dev`
   - `REACT_APP_SOCKET_IO_ENABLED` = `true`

3. Redeploy after adding variables

### Local .env (for testing)
Create `frontend/.env.local`:
```env
REACT_APP_API_BASE_URL=https://your-ngrok-url.ngrok-free.dev
REACT_APP_SOCKET_IO_ENABLED=true
```

## ✅ Success Criteria

The CORS fix is working when:

1. ✅ No CORS errors in browser console
2. ✅ Files load on Dashboard without errors
3. ✅ File upload from Phone works
4. ✅ OCR viewing works
5. ✅ File operations (delete, download, convert) work
6. ✅ Network tab shows `ngrok-skip-browser-warning` header on all requests
7. ✅ Response headers include `Access-Control-Allow-Origin: *`

## 🆘 Still Having Issues?

If CORS errors persist after all troubleshooting:

1. **Check ngrok plan**: Free tier can be unreliable. Consider upgrading to:
   - ngrok Pro ($8/mo) - Custom domains, no warning page
   - Alternative tunneling: localtunnel, serveo, localhost.run

2. **Backend proxy**: Implement a backend proxy to avoid CORS entirely:
   ```python
   # Add to backend/app.py
   @app.route('/proxy/<path:url>')
   def proxy(url):
       # Forward requests through backend
       pass
   ```

3. **Contact support**: Open an issue on GitHub with:
   - Browser console screenshots
   - Network tab screenshots
   - Backend logs
   - ngrok URL

---

**Last Updated**: 2025-01-25  
**Version**: 1.0.0  
**Author**: GitHub Copilot
