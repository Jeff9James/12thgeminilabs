# 🔧 Vercel KV Setup - Quick Fix

## The Error

```
Missing required environment variables KV_REST_API_URL and KV_REST_API_TOKEN
```

## The Problem

Vercel KV database hasn't been created/linked to your project yet.

---

## ✅ Quick Fix (2 minutes)

### Step 1: Create Vercel KV Database

```bash
cd c:\Users\HP\Downloads\12thgeminilabs\video-platform
vercel kv create
```

**When prompted:**
- **Database name**: `video-platform-kv`
- **Link to project**: Select your `video-platform` project

### Step 2: Verify It's Linked

```bash
vercel kv list
```

You should see your database listed.

### Step 3: Check Environment Variables

```bash
vercel env ls
```

You should now see these **auto-injected** variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

### Step 4: Redeploy (Important!)

The environment variables are injected at build time, so you need to redeploy:

```bash
vercel --prod
```

---

## 🧪 Test Again

After redeploying:
1. Visit your production URL
2. Upload a video
3. Should work now! ✅

---

## 🔍 Alternative: Create via Dashboard

If CLI doesn't work, use the dashboard:

### 1. Go to Vercel Dashboard
Visit: https://vercel.com/dashboard

### 2. Select Your Project
Click on `video-platform` project

### 3. Go to Storage Tab
Click **Storage** in the top menu

### 4. Create Database
- Click **"Create Database"**
- Select **"KV"** (Redis)
- Name: `video-platform-kv`
- Region: Choose closest to your users
- Click **"Create"**

### 5. Link to Project
- Select your `video-platform` project
- Click **"Connect"**

### 6. Redeploy
Go to **Deployments** tab → Click **"Redeploy"** on latest deployment

---

## 📋 Verification Checklist

After setup:

- [ ] `vercel kv list` shows your database
- [ ] `vercel env ls` shows KV_* variables
- [ ] Redeployed with `vercel --prod`
- [ ] Test upload works on production

---

## 🐛 If Still Not Working

### Check 1: Verify Variables Are Set

```bash
vercel env ls | grep KV
```

**Should show:**
```
KV_URL                     Production
KV_REST_API_URL            Production
KV_REST_API_TOKEN          Production
KV_REST_API_READ_ONLY_TOKEN Production
```

### Check 2: Check Logs

```bash
vercel logs --prod
```

Look for KV-related errors.

### Check 3: Manually Add Variables (Last Resort)

If auto-injection doesn't work, get values from dashboard:

1. Go to Storage → Your KV database → `.env.local` tab
2. Copy the values
3. Add manually:

```bash
vercel env add KV_REST_API_URL production
# Paste the URL

vercel env add KV_REST_API_TOKEN production
# Paste the token

vercel env add KV_URL production
# Paste the URL
```

Then redeploy: `vercel --prod`

---

## 💡 Why KV Is Needed

Vercel KV stores:
- Video metadata (title, URI, timestamps)
- Analysis results (cached for 48 hours)
- User data (in future)

Without KV, the app can't save anything!

---

## 🎯 Quick Commands Summary

```bash
# Navigate to project
cd c:\Users\HP\Downloads\12thgeminilabs\video-platform

# Create KV database
vercel kv create

# Verify it worked
vercel kv list
vercel env ls | grep KV

# Redeploy to pick up env vars
vercel --prod
```

---

## ✅ Expected Output

After `vercel kv create`:
```
✔ Created KV Database video-platform-kv
✔ Linked to project video-platform
✔ Environment variables automatically added
```

After `vercel env ls`:
```
KV_URL                     Production
KV_REST_API_URL            Production
KV_REST_API_TOKEN          Production
```

After redeploying and testing:
```
✅ Upload works
✅ Metadata saved to KV
✅ No more 500 errors
```

---

## 🚀 Do This Now

1. Run `vercel kv create`
2. Run `vercel --prod`
3. Test upload again

**That's it!** The KV setup takes 2 minutes. 🎉

---

**Status**: Missing Vercel KV setup  
**Fix**: Create KV database and redeploy  
**Time**: 2 minutes  
**After fix**: Upload will work perfectly!
