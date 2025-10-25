# 🔧 CORS Fix - Action Items

## ✅ What Was Fixed

1. **Updated `.env.production`** - Changed URL from old `instatunnel.my` to `https://printchakra-api.loca.lt`
2. **Moved script** - `instatunnel.ps1` moved to `scripts/` folder for better organization

## 🚨 **IMPORTANT: You Need to Update Vercel Environment Variables**

The CORS errors are happening because **Vercel is using old environment variables**. Here's how to fix it:

### Step 1: Update Vercel Environment Variables

1. Go to: https://vercel.com/your-username/printchakra/settings/environment-variables

2. Find the variable: `REACT_APP_API_URL`

3. **Update it to:**
   ```
   https://printchakra-api.loca.lt
   ```

4. **Important:** Make sure it's set for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. Click **Save**

### Step 2: Redeploy on Vercel

After updating the environment variable:

**Option A: Trigger Redeploy (Easiest)**
1. Go to: https://vercel.com/your-username/printchakra
2. Click on the latest deployment
3. Click **"Redeploy"** button
4. Select "Use existing Build Cache" → **NO** (to force rebuild)

**Option B: Push a New Commit**
```bash
git commit --allow-empty -m "chore: Trigger Vercel rebuild with new env vars"
git push origin main
```

### Step 3: Verify the Fix

After redeployment:

1. Open: https://printchakra.vercel.app
2. Open browser DevTools (F12)
3. Check Console - should show:
   ```
   ✅ Using production URL (LocalTunnel): https://printchakra-api.loca.lt
   ```
4. No more CORS errors! ✅

## 🔍 Current Issue Explanation

**What's happening:**
- Frontend on Vercel is using: `https://printchakra.loca.lt` (OLD URL)
- Backend tunnel is at: `https://printchakra-api.loca.lt` (NEW URL)
- Result: **URL mismatch → Connection fails → CORS errors**

**Why:**
- Vercel has cached the old environment variable
- Even though we updated `.env.production`, Vercel uses its own environment variables
- Need to update both and redeploy

## ✅ Quick Checklist

- [x] Updated `frontend/.env.production` to `https://printchakra-api.loca.lt`
- [x] Committed and pushed changes to GitHub
- [ ] **Update Vercel environment variable** ← **YOU NEED TO DO THIS**
- [ ] **Redeploy on Vercel** ← **YOU NEED TO DO THIS**
- [ ] Verify the fix by checking browser console

## 🎯 Expected Result

After completing the steps above:

**Console will show:**
```
✅ Using REACT_APP_API_URL: https://printchakra-api.loca.lt
✅ Using production URL (LocalTunnel): https://printchakra-api.loca.lt
🔧 API Configuration: { API_BASE_URL: "https://printchakra-api.loca.lt", ... }
API Request: GET /files { headers: { ngrok-skip-browser-warning: "true" } }
```

**No more errors:**
- ❌ ~~Access to XMLHttpRequest blocked by CORS policy~~
- ❌ ~~ERR_FAILED~~
- ❌ ~~Network Error~~

**Everything works:**
- ✅ Files load in dashboard
- ✅ File uploads work
- ✅ Socket.IO connects
- ✅ Real-time updates work

## 📝 Alternative: Use Local Development

If you want to test without deploying:

```bash
# Terminal 1: Start backend
.\backend.ps1

# Terminal 2: Start tunnel
.\scripts\instatunnel.ps1

# Terminal 3: Start frontend locally
cd frontend
npm start
```

Then open: http://localhost:3000

The frontend will automatically use `http://localhost:5000` when running locally!

---

**Next Action:** Update Vercel environment variable to `https://printchakra-api.loca.lt` and redeploy! 🚀
