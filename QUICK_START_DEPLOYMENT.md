# Quick Start Deployment Guide

Get your Gemini Video Platform deployed in under 10 minutes!

## Prerequisites (5 minutes)

1. **Gemini API Key**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create an API key
   - Save it: `GEMINI_API_KEY`

2. **Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a project (or use existing)
   - Enable Google+ API
   - Go to **APIs & Services** → **Credentials**
   - Create **OAuth 2.0 Client ID**:
     - Application type: Web application
     - Authorized JavaScript origins: `https://your-app.railway.app` (or your platform)
     - Authorized redirect URIs: `https://your-app.railway.app/api/auth/google/callback`
   - Save: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

3. **Strong JWT Secrets**
   ```bash
   # Generate two secrets
   openssl rand -base64 32  # JWT_SECRET
   openssl rand -base64 32  # JWT_REFRESH_SECRET
   ```

## Choose Your Platform

Pick one of these deployment options:

### Option 1: Railway (Easiest) ⭐

**⚠️ IMPORTANT:** Railway Shared Variables require explicit configuration! See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for detailed instructions to avoid deployment crashes.

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Create Railway Project**
   - Go to [railway.app](https://railway.app)
   - Click **New Project** → **Deploy from GitHub repo**
   - Select your repository

3. **Configure Shared Variables (CRITICAL!)**
   - Go to **Project Settings** (gear icon) → **Shared Variables**
   - Select your environment (usually "production")
   - Add these variables:
     ```
     GEMINI_API_KEY=your_api_key_here
     GOOGLE_CLIENT_ID=your_client_id_here
     GOOGLE_CLIENT_SECRET=your_client_secret_here
     JWT_SECRET=your_jwt_secret_here
     JWT_REFRESH_SECRET=your_refresh_secret_here
     DATABASE_PATH=/data/database.db
     VIDEO_STORAGE_PATH=/data/videos
     VIDEO_STORAGE_TYPE=local
     FRONTEND_URL=https://your-app-name.railway.app
     NODE_ENV=production
     PORT=3001
     LOG_LEVEL=info
     ```
   - **CRITICAL STEP:** For EACH variable, click **Share** → Select your backend service
   - OR: Go to backend service → Variables tab → Shared Variable → Add all variables

   > **Why this is critical:** Railway's Shared Variables DO NOT automatically inherit to services. You must explicitly share them! This is the #1 cause of "npm error code 1" crashes. See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for troubleshooting.

4. **Add Persistent Volume**
   - Go to **Settings** → **Volumes**
   - Create volume: Name `data`, Mount path `/data`, Size 1GB
   - Railway will automatically redeploy

5. **Deploy!**
   - Railway automatically builds and deploys
   - Get your URL from the dashboard
   - Test: `curl https://your-app.railway.app/api/health`

6. **Deploy Frontend to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set environment variable: `VITE_API_URL=https://your-app.railway.app`
   - Deploy!
   - Get your frontend URL

7. **Update Google OAuth**
   - Go back to Google Cloud Console
   - Update your OAuth Client ID with:
     - Frontend URL as authorized origin
     - Backend URL as redirect URI

**Time: 5-10 minutes**  
**Cost: Free ($5/month credit)**

---

### Option 2: Render

1. **Push code to GitHub** (same as Railway step 1)

2. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Connect GitHub account

3. **Create Web Service**
   - Click **New** → **Web Service**
   - Select your repository
   - Render will detect configuration from `render.yaml`

4. **Configure Environment**
   - Add same environment variables as Railway
   - Add persistent disk:
     - Go to **Advanced** → **Persistent Disk**
     - Mount path: `/data`
     - Size: 10GB

5. **Deploy!**
   - Click **Create Web Service**
   - Wait for deployment (2-3 minutes)
   - Test: `curl https://your-app.onrender.com/api/health`

6. **Deploy Frontend** (same as Railway step 6)

7. **Update Google OAuth** (same as Railway step 7)

**Time: 5-10 minutes**  
**Cost: Free tier available**

---

### Option 3: VPS (DigitalOcean) - Advanced

1. **Create Droplet**
   - Go to [DigitalOcean](https://digitalocean.com)
   - Create Droplet: Ubuntu 22.04, Basic $4/month
   - Add SSH key

2. **Connect and Setup**
   ```bash
   ssh root@your-droplet-ip
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Clone repo
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo
   
   # Install dependencies
   cd backend
   npm install --production
   npm run build
   ```

3. **Configure Environment**
   ```bash
   nano .env
   # Add all environment variables
   # Use these paths:
   # DATABASE_PATH=/var/gemini-platform/database.db
   # VIDEO_STORAGE_PATH=/var/gemini-platform/videos
   
   # Create directories
   sudo mkdir -p /var/gemini-platform
   sudo chown $USER:$USER /var/gemini-platform
   ```

4. **Install PM2 and Start**
   ```bash
   sudo npm install -g pm2
   pm2 start dist/server.js --name gemini-platform
   pm2 save
   pm2 startup
   ```

5. **Setup Nginx**
   ```bash
   sudo apt-get install nginx
   sudo nano /etc/nginx/sites-available/gemini-platform
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/gemini-platform /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Setup SSL**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

7. **Deploy Frontend**
   - Use Vercel as described above
   - Or serve from same server (see DEPLOYMENT.md)

**Time: 20-30 minutes**  
**Cost: $4-5/month**

---

## Post-Deployment Checklist

After deployment, verify:

- [ ] Health check returns 200: `curl https://your-api-url/api/health`
- [ ] Metrics endpoint works: `curl https://your-api-url/api/health/metrics`
- [ ] Frontend loads and connects to API
- [ ] Google OAuth login works
- [ ] Video upload works (upload a small test video)
- [ ] Video analysis works
- [ ] Chat feature works

## Troubleshooting

### "Missing environment variable" error
- Check all required variables are set in platform settings
- Restart the service

### Database not persisting
- Verify persistent volume is mounted at `/data`
- Check `DATABASE_PATH` is set to `/data/database.db`

### CORS errors
- Verify `FRONTEND_URL` matches your frontend domain exactly
- Check no trailing slashes in URLs

### Slow first response
- Normal on free tier (spin-up time takes ~30 seconds)
- Consider paid plan for always-on

### Google OAuth error
- Verify redirect URIs match your backend URL exactly
- Check OAuth consent screen is configured

## Next Steps

1. **Customize Domain** (Optional)
   - Add custom domain in platform settings
   - Update Google OAuth with new domain
   - Update `FRONTEND_URL` environment variable

2. **Set up Monitoring** (Recommended)
   - Add UptimeRobot monitoring for `/api/health`
   - Configure alerts for downtime
   - See MONITORING.md for details

3. **Configure Backups** (Important)
   - Set up automated database backups
   - See MONITORING.md → Backup Strategies

4. **Review Security** (Critical)
   - Ensure strong JWT secrets
   - Enable 2FA on your accounts
   - See DEPLOYMENT.md → Security Checklist

## Need Help?

- **Documentation**: See DEPLOYMENT.md for detailed guides
- **Monitoring**: See MONITORING.md for performance tips
- **Health Check**: `/api/health` endpoint always available
- **Logs**: Check platform dashboard for real-time logs

## Platform Comparison

| Feature | Railway | Render | VPS |
|---------|---------|--------|-----|
| Ease of Use | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Free Tier | $5 credit | Spin-down | None |
| Paid Tier | $5/mo | $7/mo | $4-5/mo |
| Auto HTTPS | Yes | Yes | Manual |
| Persistent Storage | Yes | Yes | Manual |
| Custom Domain | Yes | Yes | Yes |
| SSL | Auto | Auto | Manual |
| Console | Great | Great | None |
| Best For | Beginners | Beginners | Production |

---

**Recommended Start:** Railway or Render (easiest)  
**Production:** Render or VPS (most cost-effective at scale)  
**Frontend:** Vercel (always free, best performance)

**Estimated Total Time:** 10-30 minutes depending on platform choice
