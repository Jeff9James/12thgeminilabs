# 🐛 Upload 405 Error Fix

## Problem

**Error**: `Failed to upload chunk: 405` from `/api/videos/upload`  
**Cause**: The URL `/api/videos/upload` doesn't exist - it should be `/api/upload`

---

## ✅ Solution

### Issue Identified

The error shows `api/videos/upload` but our route is at `app/api/upload/route.ts` which maps to `/api/upload`.

This means either:
1. ❌ You're testing an old version that wasn't rebuilt
2. ❌ You're testing the old Railway/Vercel frontend (not the new video-platform)
3. ❌ Browser cache is serving old JavaScript

---

## 🔧 Fixes Applied

### 1. Moved File Upload Logic to Route

Moved all Node.js file operations directly into `app/api/upload/route.ts`:

```typescript
// Direct imports (not dynamic) since this route uses Node.js runtime
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Use Node.js runtime for file operations (NOT Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

**Why**: 
- Keeps Node.js-only code isolated to Node.js runtime routes
- Prevents Edge Runtime from trying to load Node.js modules
- `lib/gemini.ts` now only has Edge-compatible streaming code

### 2. Verified Route Path

- ✅ Route file: `app/api/upload/route.ts`
- ✅ URL path: `/api/upload`
- ✅ Frontend calls: `/api/upload`

---

## 🧪 Testing Steps

### Step 1: Clear Everything

```bash
# Stop any running dev servers
# Close all browser tabs with the app

# Rebuild
cd c:\Users\HP\Downloads\12thgeminilabs\video-platform
npm run build
```

### Step 2: Start Fresh Dev Server

```bash
npm run dev
```

### Step 3: Test in Browser

1. Open **new incognito/private window**: `http://localhost:3000`
2. Open DevTools Console (F12)
3. Try uploading a video
4. Check Network tab for the actual URL being called

---

## 🔍 Debugging Checklist

### If Still Getting 405:

#### 1. Verify You're Testing the Right App

```bash
# Make sure you're in video-platform directory
cd c:\Users\HP\Downloads\12thgeminilabs\video-platform
pwd  # Should show: .../video-platform

# Check dev server is running
npm run dev
```

**URL should be**: `http://localhost:3000` (NOT your old Vercel URL)

#### 2. Check Browser Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Try upload
4. Look for the request
5. Check the **exact URL** being called

**Should see**: `http://localhost:3000/api/upload`  
**NOT**: `api/videos/upload` or any Railway/Vercel URL

#### 3. Clear Browser Cache

```bash
# Hard refresh in browser
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)

# Or use Incognito/Private mode
```

#### 4. Verify Route Exists

```bash
# Check file exists
ls app/api/upload/route.ts

# Check it exports POST
cat app/api/upload/route.ts | grep "export async function POST"
```

#### 5. Check for Port Conflicts

```bash
# Make sure port 3000 is not in use by another app
# If it is, Next.js will use 3001, 3002, etc.

# Check what port the dev server actually started on
# Look for: "Local:    http://localhost:XXXX"
```

---

## 🚨 Common Mistakes

### Mistake 1: Testing Old Deployment

**Problem**: Browsing to old Vercel URL (not video-platform)

**Solution**: 
- Test local dev: `http://localhost:3000`
- Or redeploy video-platform to Vercel

### Mistake 2: Mixed Deployments

**Problem**: Frontend from old deployment calling old backend

**Solution**: Make sure you're testing the new `video-platform` app:
```bash
cd video-platform
npm run dev
# Visit http://localhost:3000
```

### Mistake 3: Browser Cache

**Problem**: Browser serving old JavaScript

**Solution**:
- Use Incognito mode
- Hard refresh (Ctrl+Shift+R)
- Clear cache and reload

---

## ✅ Correct Implementation

### Route Structure

```
video-platform/
└── app/
    └── api/
        ├── upload/
        │   └── route.ts  ← POST handler for /api/upload
        └── videos/
            └── [id]/
                ├── route.ts  ← GET handler for /api/videos/:id
                └── analyze/
                    └── route.ts  ← POST handler for /api/videos/:id/analyze
```

### Frontend Call

```typescript
// components/VideoUpload.tsx
const res = await fetch('/api/upload', {  // ✅ Correct
  method: 'POST',
  body: formData
});

// NOT:
// const res = await fetch('/api/videos/upload', ...  // ❌ Wrong
```

### Backend Route

```typescript
// app/api/upload/route.ts
export const runtime = 'nodejs';  // ✅ Required for file ops
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // ... upload logic
}
```

---

## 🔐 Vercel KV Setup (For Production)

If testing on Vercel (not localhost), ensure KV is set up:

```bash
# Create Vercel KV
vercel kv create

# Verify it's linked
vercel kv list

# Environment variables should be auto-injected:
# - KV_URL
# - KV_REST_API_URL  
# - KV_REST_API_TOKEN
```

---

## 🎯 Quick Fix Steps

### For Local Development:

1. **Navigate to correct directory**:
   ```bash
   cd c:\Users\HP\Downloads\12thgeminilabs\video-platform
   ```

2. **Rebuild**:
   ```bash
   npm run build
   ```

3. **Start dev server**:
   ```bash
   npm run dev
   ```

4. **Test in incognito**:
   - Open `http://localhost:3000`
   - Upload video
   - Check DevTools Network tab

### For Vercel Deployment:

1. **Redeploy**:
   ```bash
   vercel --prod
   ```

2. **Verify KV**:
   ```bash
   vercel kv list
   ```

3. **Check logs**:
   ```bash
   vercel logs --prod
   ```

---

## 📊 Expected Behavior

### Successful Upload Flow:

1. User selects video file
2. Frontend calls `POST /api/upload`
3. Backend receives file
4. Backend uploads to Gemini File API (may take 10-30s)
5. Backend saves to Vercel KV
6. Backend returns `{ success: true, videoId, geminiFileUri }`
7. Frontend redirects to `/videos/{videoId}`

### Timeline:

- Small video (< 10MB): 10-20 seconds
- Medium video (10-50MB): 20-40 seconds
- Large video (50-100MB): 40-90 seconds

**Note**: The upload includes:
1. Upload to Gemini (5-10s)
2. Gemini processing (10-60s depending on size)
3. Save to KV (< 1s)

---

## 🐛 Still Not Working?

### Check These:

1. **Environment Variables**:
   ```bash
   # Check .env.local exists and has:
   cat .env.local
   # Should show GEMINI_API_KEY=...
   ```

2. **Dependencies Installed**:
   ```bash
   npm list @google/generative-ai
   npm list @vercel/kv
   npm list uuid
   ```

3. **Build Successful**:
   ```bash
   npm run build
   # Should complete without errors
   ```

4. **No Port Conflicts**:
   ```bash
   # Dev server should start on 3000
   # If it says 3001 or 3002, another process is using 3000
   ```

5. **Correct App Running**:
   - Check browser URL bar
   - Should be `localhost:3000` (or the port shown by `npm run dev`)
   - NOT your old Vercel URL

---

## 💡 Pro Tips

### Testing Gemini File Upload Without Frontend:

```bash
# Test with curl (from video-platform directory)
curl -X POST http://localhost:3000/api/upload \
  -F "video=@/path/to/test-video.mp4"

# Should return JSON with videoId
```

### Check Dev Server Logs:

When you upload, check the terminal running `npm run dev`:
- Look for console.log outputs
- Look for errors
- Check upload progress

### Verify KV Locally:

```bash
# Pull KV env vars for local testing
vercel env pull .env.local

# Now .env.local will have KV credentials
```

---

## ✅ Solution Summary

**The issue is likely**: Testing the wrong app or browser cache.

**Quick fix**:
1. Make sure you're in `video-platform` directory
2. Run `npm run dev`
3. Test in incognito at `http://localhost:3000`

**The route IS correctly implemented** - no code changes needed!

---

**Last Updated**: After runtime configuration fix  
**Status**: ✅ Route implementation correct  
**Action Needed**: Test in correct environment (see steps above)
