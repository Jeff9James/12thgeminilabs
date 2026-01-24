# IMMEDIATE ACTION REQUIRED - Vercel Environment Variable

## The Problem

When you click "Import from Drive" → "Connect Google Drive", the website goes blank with a 404 error because the `VITE_API_URL` environment variable is not properly set in Vercel.

## The Solution (Takes 2 minutes)

### Step 1: Set Environment Variable in Vercel

1. Go to your Vercel Dashboard: https://vercel.com
2. Click on your project (12thgeminilabs)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add the following:
   ```
   Key: VITE_API_URL
   Value: https://web-production-cc201.up.railway.app/api
   ```
   
   **IMPORTANT:**
   - Make sure there's `/api` at the end
   - Make sure there's NO trailing slash after `/api`
   - Apply to: **Production**, **Preview**, and **Development** (check all three)

6. Click **Save**

### Step 2: Redeploy

After adding the environment variable, you need to redeploy:

**Option A: Trigger from Vercel Dashboard**
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the three dots (•••) on the right
4. Click **Redeploy**
5. Uncheck "Use existing Build Cache" (to force rebuild with new env var)
6. Click **Redeploy**

**Option B: Trigger from Git**
```bash
git commit --allow-empty -m "Trigger rebuild with VITE_API_URL"
git push origin main
```

### Step 3: Verify

1. Wait for deployment to complete (usually 1-2 minutes)
2. Visit your Vercel URL
3. Login
4. Go to Videos page
5. Click "Import from Google Drive"
6. The modal should open without errors
7. Click "Connect Google Drive"
8. You should be redirected to Google OAuth (not 404)

## Why This Happened

The previous `vercel.json` had the environment variable hardcoded, but Vercel doesn't read that for build-time environment variables. Environment variables must be set in the Vercel Dashboard to be available during the build process.

## If It Still Doesn't Work

1. Double-check the `VITE_API_URL` value has no trailing slash
2. Make sure it ends with `/api`
3. Verify it's set for all environments (Production, Preview, Development)
4. Try clearing browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
5. Check browser console for the log message: "Redirecting to Google Drive OAuth: [URL]"
   - The URL should be: `https://web-production-cc201.up.railway.app/api/google-drive/auth/start`

## Expected Behavior After Fix

1. Click "Import from Google Drive" → Modal opens ✅
2. Click "Connect Google Drive" → Redirects to Google OAuth page ✅
3. Authorize Google → Redirects back to your app at `/videos?drive=connected` ✅
4. Google Drive files appear in the import modal ✅

## Need Help?

If you're still having issues after following these steps, check the full setup guide in `VERCEL_SETUP.md`.
