# Railway Deployment Setup Guide

This guide provides step-by-step instructions for properly configuring environment variables in Railway to avoid startup crashes.

## ⚠️ Common Issue: Backend Crashes Due to Missing Environment Variables

If your backend service crashes with `npm error code 1`, it's likely because environment variables from "Shared Variables" are not being inherited by the backend service.

### Why This Happens

Railway's **Shared Variables** don't automatically inherit to services. You have two options:

1. **Option A (Recommended):** Share variables from Project Settings → Shared Variables
2. **Option B:** Create Reference Variables in the service using `${{shared.VARIABLE_NAME}}` syntax

## 🚀 Step-by-Step Setup

### Step 1: Create Shared Variables

1. Go to your Railway project
2. Click **Project Settings** (gear icon in top right)
3. Navigate to **Shared Variables** tab
4. Select your **Environment** (usually "production")
5. Add the following variables:

```bash
# Required Variables
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
NODE_ENV=production
PORT=3001
DATABASE_PATH=/data/database.db
VIDEO_STORAGE_PATH=/data/videos
FRONTEND_URL=https://your-frontend-domain.com
VIDEO_STORAGE_TYPE=local
LOG_LEVEL=info
```

**Important Notes:**
- Generate strong JWT secrets: `openssl rand -base64 32`
- Update `FRONTEND_URL` with your actual frontend domain
- For local storage, use paths starting with `/data` for persistent volumes

### Step 2: Share Variables with Backend Service (CRITICAL!)

After creating Shared Variables, you MUST explicitly share them with your backend service:

1. Stay in **Project Settings** → **Shared Variables**
2. For EACH variable you created, click the **Share** button (three dots menu)
3. Select **all services** that need the variable (especially your backend service)
4. Click **Share**

**Alternative Method:**

You can also share from the service side:

1. Go to your **backend service**
2. Click the **Variables** tab
3. Click **Shared Variable** button
4. Select ALL the shared variables you created
5. Click **Add**

This will create reference variables in your service like:
```bash
GEMINI_API_KEY=${{shared.GEMINI_API_KEY}}
GOOGLE_CLIENT_ID=${{shared.GOOGLE_CLIENT_ID}}
# ... etc for all variables
```

### Step 3: Add Persistent Volume

1. Go to your **backend service**
2. Click **Settings** tab
3. Scroll to **Volumes** section
4. Click **New Volume**
5. Configure:
   - **Name:** `data`
   - **Mount Path:** `/data`
   - **Size:** 1 GB (or more based on your needs)
6. Click **Create**

Railway will automatically redeploy with the volume attached.

### Step 4: Verify Configuration

After deployment completes:

1. Check the service logs for startup messages
2. You should see:
   ```
   ✓ Environment variables validated
   Server running on port 3001
   Environment: production
   Frontend URL: https://your-frontend-domain.com
   ```

3. Test the health check endpoint:
   ```bash
   curl https://your-backend-domain.railway.app/api/health
   ```

   You should get:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-17T...",
     "database": "connected",
     "videoCount": 0,
     "uptime": 15.234
   }
   ```

## 🔍 Troubleshooting

### Error: "Missing required environment variables"

**Problem:** Backend crashes on startup with missing env vars

**Solution:**
1. Verify Shared Variables are created in Project Settings
2. **CRITICAL:** Ensure variables are explicitly shared with the backend service (Step 2)
3. Check that variable names match exactly (case-sensitive)
4. Redeploy the service after sharing variables

### Error: "Database not connected"

**Problem:** Database initialization fails

**Solution:**
1. Check that `DATABASE_PATH=/data/database.db` is set
2. Verify the persistent volume is created and mounted at `/data`
3. Ensure the volume has write permissions

### Error: "CORS error" or "Origin not allowed"

**Problem:** Frontend can't communicate with backend

**Solution:**
1. Verify `FRONTEND_URL` matches your actual frontend domain exactly
2. Include protocol (`https://`) and no trailing slash
3. Redeploy backend after updating `FRONTEND_URL`

### Check Environment Variables from Logs

Add temporary debug logging to see what variables are available:

1. Go to your backend service → **Settings** → **Variables**
2. Add a temporary variable:
   ```bash
   DEBUG_ENV=true
   ```
3. The backend will log all available env vars on startup (sensitive values hidden)
4. Check service logs to see what variables Railway is providing
5. Remove the `DEBUG_ENV` variable after debugging

## 📋 Variable Scoping Reference

### Railway Variable Types

| Type | Scope | Inheritance |
|------|-------|-------------|
| **Service Variables** | Single service only | Not inherited |
| **Shared Variables** | Project-wide | Must be explicitly shared |
| **Reference Variables** | Service (references other vars) | Uses template syntax |
| **Railway-Provided** | All services | Automatic |

### Template Syntax

```bash
# Reference a shared variable
API_KEY=${{shared.API_KEY}}

# Reference another service's variable
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Reference Railway-provided variables
PUBLIC_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}

# Combine variables
AUTH_ENDPOINT=https://${{shared.DOMAIN}}/auth
```

## 🔒 Security Best Practices

1. **Never commit secrets to Git**
   - Use `.env.example` for templates only
   - Keep actual secrets in Railway's UI

2. **Use strong random secrets**
   ```bash
   # Generate secure secrets
   openssl rand -base64 32
   ```

3. **Use Railway's Sealed Variables** (optional, extra security)
   - Click the 3-dot menu on a variable → **Seal**
   - Value becomes hidden in UI and API
   - Cannot be unsealed (security-first feature)

4. **Rotate secrets periodically**
   - Update JWT_SECRET and JWT_REFRESH_SECRET every 90 days
   - Update GEMINI_API_KEY if compromised

## 🔄 Deployment Workflow

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Railway auto-deploys**
   - Builds using `railway.json` configuration
   - Runs health checks
   - Switches traffic to new deployment

3. **Monitor deployment**
   - Watch logs for errors
   - Check health endpoint
   - Test critical functionality

## 📚 Additional Resources

- [Railway Variables Documentation](https://docs.railway.com/guides/variables)
- [Railway Shared Variables](https://docs.railway.com/reference/variables#shared-variables)
- [Railway Template Syntax](https://docs.railway.com/reference/variables#template-syntax)
- [Project Deployment Guide](./DEPLOYMENT.md)
- [Quick Start Guide](./QUICK_START_DEPLOYMENT.md)

## ✅ Checklist

Use this checklist to ensure proper setup:

- [ ] Created all required Shared Variables in Project Settings
- [ ] Explicitly shared variables with backend service (CRITICAL!)
- [ ] Created persistent volume mounted at `/data`
- [ ] Set `DATABASE_PATH=/data/database.db`
- [ ] Set `VIDEO_STORAGE_PATH=/data/videos`
- [ ] Generated strong JWT secrets using `openssl rand -base64 32`
- [ ] Updated `FRONTEND_URL` with actual frontend domain
- [ ] Verified health check endpoint returns success
- [ ] Tested frontend-backend communication
- [ ] Reviewed service logs for startup errors
- [ ] Confirmed database is connected

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. Check the service logs in Railway dashboard
2. Verify all variables are shared (not just created)
3. Try manually adding variables directly to the service (bypass Shared Variables)
4. Reach out to Railway support or community Discord
5. Review the [Monitoring Guide](./MONITORING.md) for debugging tips
