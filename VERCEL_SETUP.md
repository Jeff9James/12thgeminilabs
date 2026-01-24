# Vercel Deployment Setup

This guide explains how to deploy the frontend to Vercel with proper configuration.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Backend deployed and running (e.g., on Railway)
3. Git repository connected to Vercel

## Environment Variables

### Required Environment Variables in Vercel Dashboard

Go to your Vercel project settings → Environment Variables and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://your-backend-url.railway.app/api` | Your backend API URL with /api (NO trailing slash) |

**Important Notes:**
- MUST include `/api` at the end (since backend routes use /api prefix)
- Do NOT include trailing slashes after `/api`
- Example (correct): `https://web-production-cc201.up.railway.app/api`
- Example (wrong): `https://web-production-cc201.up.railway.app` (missing /api)
- Example (wrong): `https://web-production-cc201.up.railway.app/api/` (trailing slash)
- This variable must be set for all environments (Production, Preview, Development)

## Deployment Steps

1. **Connect your repository to Vercel:**
   ```bash
   # If not already connected
   vercel
   ```

2. **Set environment variables:**
   - Go to: https://vercel.com/[your-account]/[your-project]/settings/environment-variables
   - Add `VITE_API_URL` with your Railway backend URL
   - Apply to: Production, Preview, and Development

3. **Configure build settings (if not auto-detected):**
   - Framework Preset: `Vite`
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `npm install --ignore-scripts`

4. **Deploy:**
   ```bash
   # Deploy to production
   vercel --prod
   
   # Or push to your main branch (if auto-deployment is enabled)
   git push origin main
   ```

## Update Backend CORS Settings

After deploying to Vercel, update your backend environment variables:

1. Go to your Railway backend project
2. Update `FRONTEND_URL` to your Vercel deployment URL:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```

3. Redeploy the backend if needed

## Google OAuth Configuration

If using Google OAuth (for Drive imports):

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   - `https://your-backend.railway.app/api/google-drive/auth/callback`
   - `https://your-backend.railway.app/api/auth/google/callback`
5. Add authorized origins:
   - `https://your-app.vercel.app`
   - `https://your-backend.railway.app`

## Troubleshooting

### Issue: 404 errors when clicking "Connect Drive"

**Cause:** `VITE_API_URL` not set or incorrectly configured

**Solution:**
1. Verify `VITE_API_URL` is set in Vercel environment variables
2. Check that it does NOT have a trailing slash
3. Rebuild the frontend after adding the variable

### Issue: CORS errors

**Cause:** Backend not configured to allow requests from Vercel URL

**Solution:**
1. Update `FRONTEND_URL` in Railway backend settings
2. Ensure backend CORS middleware includes your Vercel URL

### Issue: Build fails

**Cause:** Build command or output directory misconfigured

**Solution:**
1. Check `vercel.json` configuration
2. Ensure build command is: `cd frontend && npm install && npm run build`
3. Ensure output directory is: `frontend/dist`

## Verification

After deployment, verify:

1. Frontend loads at your Vercel URL
2. Login works (checks backend connection)
3. Google Drive import modal opens without errors
4. Clicking "Connect Drive" redirects to Google OAuth (not 404)

## Manual Redeployment

To trigger a fresh deployment:

```bash
# From your local repository
git commit --allow-empty -m "Trigger Vercel rebuild"
git push origin main
```

Or use Vercel dashboard:
1. Go to Deployments
2. Click the three dots on a deployment
3. Click "Redeploy"
4. Check "Use existing Build Cache" if you only changed env vars
