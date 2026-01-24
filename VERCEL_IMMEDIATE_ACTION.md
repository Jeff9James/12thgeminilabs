# IMMEDIATE ACTION REQUIRED - Vercel Configuration Fix

## The Problem

The website shows a 404 error when navigating to any route (like `/login` or when opening modals). This happens because:
1. Vercel's `vercel.json` was missing SPA (Single Page Application) routing configuration
2. The `VITE_API_URL` environment variable is not properly set in Vercel

## The Solution (Takes 3 minutes)

The code fix has already been pushed to GitHub. You just need to set the environment variable and redeploy.

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

## What Was Fixed (Already Pushed)

1. **Added SPA routing to `vercel.json`:**
   - Added `rewrites` configuration to serve `index.html` for all routes
   - This fixes the 404 errors when navigating to different pages

2. **Fixed OAuth redirect URL handling:**
   - Updated `GoogleDriveImportModal.tsx` to properly construct redirect URLs

## Why This Happened

1. The `vercel.json` was missing the `rewrites` configuration needed for React Router to work properly
2. Environment variables must be set in Vercel Dashboard to be available during the build process

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
