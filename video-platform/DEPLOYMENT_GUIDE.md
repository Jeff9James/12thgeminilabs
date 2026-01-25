# Deployment Guide - Gemini Video Analysis Platform

## 🎯 Pre-Deployment Checklist

Before deploying, ensure you have:

- [x] Gemini API Key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- [x] Vercel account (free tier is fine)
- [x] Git initialized in the project (for Vercel deployment)
- [x] All code files created and tested locally

## 🚀 Quick Deployment (5 Minutes)

### Step 1: Verify Local Build

```bash
cd c:\Users\HP\Downloads\12thgeminilabs\video-platform
npm run build
```

If build succeeds, you're ready to deploy!

### Step 2: Install Vercel CLI (if not already installed)

```bash
npm i -g vercel
```

### Step 3: Login to Vercel

```bash
vercel login
```

This will open your browser. Login with your Vercel account.

### Step 4: Deploy to Vercel

```bash
vercel
```

Answer the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **Project name?** → video-platform (or your choice)
- **Directory?** → ./ (current directory)
- **Override settings?** → No

This creates a preview deployment.

### Step 5: Setup Vercel KV Database

```bash
vercel kv create
```

When prompted:
- **Database name**: `video-platform-kv`
- **Link to project**: Select the project you just created

### Step 6: Add Environment Variables

```bash
vercel env add GEMINI_API_KEY production
```

Paste your actual Gemini API key and press Enter.

Optionally add JWT secret:
```bash
vercel env add JWT_SECRET production
```

Generate a random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 7: Deploy to Production

```bash
vercel --prod
```

Done! Your app is now live at `https://your-project.vercel.app` 🎉

## 🔧 Vercel Dashboard Configuration

### 1. Add Environment Variables via Dashboard

Go to: `Project Settings` → `Environment Variables`

Add these variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `GEMINI_API_KEY` | Your Gemini API key | Production, Preview, Development |
| `JWT_SECRET` | Random 32-byte base64 string | Production, Preview, Development |

### 2. Link Vercel KV

Go to: `Storage` tab → Click your KV database

The following variables are auto-injected:
- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

## 🧪 Testing Your Deployment

1. Visit your deployment URL
2. Upload a short video (< 50MB recommended)
3. Click "Analyze Video" on the video detail page
4. Watch the streaming analysis in real-time!

## 📊 Monitoring

### View Logs

```bash
vercel logs
```

Or go to: `Project Dashboard` → `Functions` → Select function → View logs

### Check KV Database

```bash
vercel kv list
```

Or use Vercel Dashboard → Storage → Your KV → Browse data

## 🐛 Common Issues & Solutions

### Issue: "GEMINI_API_KEY is not defined"

**Cause**: Environment variable not set

**Solution**:
```bash
vercel env add GEMINI_API_KEY production
```

Then redeploy:
```bash
vercel --prod
```

### Issue: "KV is not defined" or KV connection errors

**Cause**: Vercel KV not linked to project

**Solution**:
1. Go to Vercel Dashboard → Storage
2. Create KV database
3. Link to your project
4. Redeploy

### Issue: Build fails with "Cannot find module '@/lib/gemini'"

**Cause**: TypeScript path mapping issue

**Solution**: Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Issue: Streaming not working (full response comes at once)

**Cause**: Edge runtime not configured

**Solution**: Ensure `app/api/videos/[id]/analyze/route.ts` has:
```typescript
export const runtime = 'edge';
```

### Issue: Upload fails with timeout

**Cause**: Gemini File API processing time

**Solution**: This is expected for large videos. The app waits automatically. For production, consider:
- Adding a loading indicator
- Implementing background jobs
- Using smaller videos for testing

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Rotate API keys periodically** - Update in Vercel dashboard
3. **Use environment-specific keys** - Different keys for dev/prod
4. **Enable Vercel Authentication** - For sensitive deployments
5. **Monitor usage** - Check Gemini API quota

## 📈 Performance Optimization

### Enable Caching

Results are already cached in Vercel KV for 48 hours.

### Edge Runtime

Analysis endpoint uses Edge runtime for:
- Faster cold starts
- Better streaming performance
- Global distribution

### Vercel CDN

Static assets are automatically served from Vercel's global CDN.

## 🔄 Continuous Deployment

### Setup Git Integration

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/video-platform.git
git push -u origin main
```

2. Link in Vercel Dashboard:
   - Go to Project Settings → Git
   - Connect your GitHub repo
   - Enable auto-deployment on push

Now every push to `main` automatically deploys!

## 🌍 Custom Domain

### Add Custom Domain

1. Go to: Project Settings → Domains
2. Add your domain: `yourdomain.com`
3. Update DNS records as instructed by Vercel
4. Wait for SSL certificate (automatic)

## 📊 Analytics & Monitoring

### Vercel Analytics (Optional)

```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

Redeploy to see analytics in Vercel Dashboard.

## 💰 Cost Considerations

### Free Tier Limits

**Vercel:**
- 100 GB bandwidth/month
- 100 GB-Hrs serverless function execution
- Unlimited static requests

**Gemini API:**
- 1,500 requests/day (free tier)
- File API: 20 GB storage

**Vercel KV:**
- 256 MB storage
- 30,000 commands/month

### Monitoring Usage

Check usage at:
- Vercel: Dashboard → Usage
- Gemini: [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)

## 🎬 Demo for Judges

### 1. Prepare Demo Video
- Use a short video (30-60 seconds)
- Pre-upload before demo to avoid wait time
- Have analysis cached

### 2. Demo Flow
1. Show homepage with features
2. Upload new video (or use pre-uploaded)
3. Show streaming analysis in real-time
4. Highlight scene breakdowns with timestamps
5. Refresh page to show persistence
6. Explain zero-cost architecture

### 3. Technical Deep Dive
- Show Vercel dashboard (edge functions)
- Show KV database (cached results)
- Explain streaming implementation
- Highlight Gemini 2.0 integration

## 📝 Deployment Checklist

Before presenting:

- [ ] App deployed to production
- [ ] Custom domain configured (optional)
- [ ] Test video uploaded
- [ ] Analysis cached for instant demo
- [ ] Environment variables set
- [ ] Vercel KV connected
- [ ] Logs checked for errors
- [ ] Performance tested (load time, streaming)
- [ ] Mobile responsive checked
- [ ] README updated with deployment URL

## 🆘 Emergency Fixes

### Quick Rollback

```bash
vercel rollback
```

### Force Redeploy

```bash
vercel --prod --force
```

### Clear KV Cache

```bash
vercel kv clear
```

## 🎯 Post-Deployment Tasks

1. **Test all features** on production URL
2. **Monitor logs** for first few uploads
3. **Check analytics** for usage patterns
4. **Update README** with live demo URL
5. **Prepare demo script** for judges

## 🏆 You're Ready!

Your Gemini Video Analysis Platform is now:
- ✅ Deployed to production
- ✅ Using Edge runtime for streaming
- ✅ Cached with Vercel KV
- ✅ Zero infrastructure cost
- ✅ Auto-scaling on Vercel's network

**Live URL**: [Your Vercel URL here]

Good luck with your hackathon! 🚀

---

**Need help?** Check logs with `vercel logs` or visit [Vercel Docs](https://vercel.com/docs)
