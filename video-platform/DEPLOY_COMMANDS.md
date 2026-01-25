# Quick Deploy Commands - Copy & Paste

## 🚀 Complete Deployment in 5 Minutes

### Prerequisites
- [ ] Gemini API Key ready
- [ ] Vercel account created
- [ ] Updated `.env.local` with real API keys

---

## Step-by-Step Commands

### 1. Navigate to Project
```bash
cd c:\Users\HP\Downloads\12thgeminilabs\video-platform
```

### 2. Install Vercel CLI (if not installed)
```bash
npm i -g vercel
```

### 3. Login to Vercel
```bash
vercel login
```

### 4. Deploy Preview
```bash
vercel
```

**Answer prompts:**
- Set up and deploy? → **Yes**
- Which scope? → Your account
- Link to existing project? → **No**
- Project name? → **video-platform**
- Directory? → **./** (press Enter)
- Override settings? → **No**

### 5. Create Vercel KV Database
```bash
vercel kv create
```

**Answer prompts:**
- Database name? → **video-platform-kv**
- Which project? → Select the one you just created

### 6. Add Gemini API Key
```bash
vercel env add GEMINI_API_KEY production
```

When prompted, paste your Gemini API key and press Enter.

### 7. Generate and Add JWT Secret

**First, generate a secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Copy the output, then:**
```bash
vercel env add JWT_SECRET production
```

Paste the generated secret and press Enter.

### 8. Deploy to Production
```bash
vercel --prod
```

---

## ✅ Verification Commands

### Check Deployment Status
```bash
vercel ls
```

### View Production Logs
```bash
vercel logs --prod
```

### Check Environment Variables
```bash
vercel env ls
```

### Check KV Database
```bash
vercel kv list
```

---

## 🧪 Test Your Deployment

1. Open the production URL shown after deployment
2. Upload a test video
3. Click "Analyze Video"
4. Watch streaming analysis in real-time

---

## 🔄 Update Commands (If Needed)

### Redeploy After Changes
```bash
vercel --prod
```

### Update Environment Variable
```bash
vercel env rm GEMINI_API_KEY production
vercel env add GEMINI_API_KEY production
```

### Rollback to Previous Deployment
```bash
vercel rollback
```

---

## 🎯 All Commands in Sequence (Copy This Block)

```bash
# 1. Navigate to project
cd c:\Users\HP\Downloads\12thgeminilabs\video-platform

# 2. Install Vercel CLI
npm i -g vercel

# 3. Login
vercel login

# 4. Initial deployment
vercel

# 5. Create KV database
vercel kv create

# 6. Add environment variables
vercel env add GEMINI_API_KEY production
# (Paste your Gemini API key when prompted)

# 7. Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 8. Add JWT secret
vercel env add JWT_SECRET production
# (Paste generated secret when prompted)

# 9. Deploy to production
vercel --prod
```

---

## 📝 Expected Output

After successful deployment, you should see:

```
✅ Production: https://video-platform-xxx.vercel.app [copied to clipboard]
```

**Your app is now live!** 🎉

---

## 🐛 If Something Goes Wrong

### Command Not Found: vercel
```bash
npm i -g vercel
# If that fails, try:
npx vercel
```

### Authentication Error
```bash
vercel logout
vercel login
```

### KV Connection Error
```bash
# Recreate KV and relink
vercel kv create
# Then redeploy
vercel --prod
```

### Environment Variable Not Working
```bash
# Check if variables are set
vercel env ls

# Pull variables locally to verify
vercel env pull .env.local
```

---

## 🎬 After Deployment

1. ✅ Test upload on production URL
2. ✅ Test streaming analysis
3. ✅ Verify results are cached (refresh page)
4. ✅ Check logs: `vercel logs --prod`
5. ✅ Note your production URL for demo

---

## 💡 Pro Tips

- **First deployment** creates preview - Always run `vercel --prod` after
- **Environment variables** need to be added before `--prod` deployment
- **KV database** must be created and linked before analysis works
- **Check logs** if anything doesn't work: `vercel logs --prod`

---

## ✨ You're Done!

Your Gemini Video Analysis Platform is now:
- ✅ Live on Vercel
- ✅ Using Edge runtime
- ✅ Connected to Gemini 2.0
- ✅ Cached with Vercel KV
- ✅ Ready for demo!

**Save your production URL** - you'll need it for the demo! 🚀
