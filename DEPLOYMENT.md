# Deployment Guide - Production Deployment (No Docker, Minimal Infrastructure)

This guide covers deploying the Gemini Video Platform to production without Docker or Kubernetes. The platform is designed for simple, cost-effective deployment using modern Node.js hosting platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Environment Configuration](#environment-configuration)
4. [Deployment to Railway](#deployment-to-railway)
5. [Deployment to Render](#deployment-to-render)
6. [Deployment to VPS](#deployment-to-vps)
7. [Frontend Deployment](#frontend-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Security Checklist](#security-checklist)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- **Google Cloud Project** with:
  - Generative Language API enabled
  - OAuth 2.0 credentials (Client ID and Secret)
  - Authorized redirect URIs for your production domain
- **Gemini API Key** from Google AI Studio
- **Git repository** with your code
- **Account** on your chosen deployment platform (Railway, Render, or VPS provider)

### Generate Strong JWT Secrets

For production, use strong random secrets:

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate refresh token secret
openssl rand -base64 32
```

## Deployment Options

### Option A: Railway.app (Recommended)

**Pros:**
- Free tier available ($5/month credit)
- Automatic HTTPS
- Built-in persistent volumes
- Simple GitHub integration
- No Docker required

**Cons:**
- Free tier has sleep timer (15 min inactivity)
- Limited free storage

**Cost:**
- Free: $5/month credit
- Paid: Starts at $5/month

**Best for:** Small to medium projects, quick deployment, testing

### Option B: Render (Recommended)

**Pros:**
- Free web service tier available
- Automatic HTTPS
- Built-in persistent disks
- Preview deployments for pull requests
- No Docker required

**Cons:**
- Free tier spins down after 15 min inactivity
- Limited free storage

**Cost:**
- Free: Web service (with spin-down)
- Paid: Starts at $7/month

**Best for:** Projects needing preview deployments, teams using GitHub

### Option C: VPS (DigitalOcean, Linode, Vultr)

**Pros:**
- Full control over environment
- No sleep timers
- Most cost-effective at scale
- Can host multiple services

**Cons:**
- Manual SSL setup
- More maintenance required
- Need to manage updates

**Cost:** Starting at $4-5/month

**Best for:** Production applications, multiple services, full control

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the root directory with these values:

```env
# Backend Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Gemini API
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here

# Database (use persistent volume paths)
DATABASE_PATH=/data/database.db

# Frontend URL (update with your domain)
FRONTEND_URL=https://your-domain.com

# Video Storage (use persistent volume paths)
VIDEO_STORAGE_TYPE=local
VIDEO_STORAGE_PATH=/data/videos

# JWT Secrets (use strong random strings)
JWT_SECRET=your_generated_jwt_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized JavaScript origins: `https://your-frontend-domain.com`
   - Authorized redirect URIs:
     - `https://your-backend-domain.com/api/auth/google/callback`
     - `http://localhost:3001/api/auth/google/callback` (for local dev)
4. Copy Client ID and Client Secret

## Deployment to Railway

### Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub with a `.env.example` file (never commit `.env`).

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign up
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway will detect it's a Node.js project

### Step 3: Configure Environment Variables

1. Go to your project settings
2. Add all required environment variables from the [Environment Configuration](#environment-configuration) section
3. Set persistent volume paths:
   - `DATABASE_PATH=/data/database.db`
   - `VIDEO_STORAGE_PATH=/data/videos`

### Step 4: Add Persistent Volume

1. Go to **Settings** → **Volumes**
2. Create a volume named `data` (minimum 1GB, recommended 10GB+)
3. Mount point: `/data`

### Step 5: Configure Build Settings

Railway will automatically use the `railway.json` file in your repository:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd backend && npm start",
    "healthcheckPath": "/api/health"
  }
}
```

### Step 6: Deploy

1. Railway will automatically build and deploy
2. Monitor the build logs
3. Once deployed, you'll get a public URL like `https://your-app.railway.app`
4. Update Google OAuth redirect URI to include this URL

### Step 7: Verify Deployment

```bash
# Check health endpoint
curl https://your-app.railway.app/api/health

# Check metrics
curl https://your-app.railway.app/api/health/metrics
```

### Railway-Specific Tips

- **Free Tier Sleep:** The free tier sleeps after 15 minutes of inactivity. The first request may take ~30 seconds to wake up.
- **Custom Domain:** Add a custom domain in Railway settings, then update `FRONTEND_URL` env var.
- **Logs:** View real-time logs in Railway dashboard or use CLI: `railway logs`
- **Database:** SQLite database persists in the mounted volume at `/data/database.db`

## Deployment to Render

### Step 1: Prepare Your Repository

Push your code to GitHub. Render will use the `render.yaml` file in your repository.

### Step 2: Create Render Account

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account

### Step 3: Create Web Service

1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Render will detect the configuration from `render.yaml`

### Step 4: Configure Environment Variables

Add all required environment variables (same as Railway, see [Environment Configuration](#environment-configuration)).

### Step 5: Deploy

1. Click **Create Web Service**
2. Render will build and deploy automatically
3. You'll get a URL like `https://your-app.onrender.com`
4. Update Google OAuth redirect URI

### Step 6: Verify Deployment

```bash
curl https://your-app.onrender.com/api/health
```

### Render-Specific Tips

- **Spin Down:** Free tier spins down after 15 minutes. First request takes ~30 seconds.
- **Persistent Disk:** Configure disk size in Render settings (starts at 1GB, can expand).
- **Preview Deployments:** Enable preview deployments for pull requests.
- **Custom Domain:** Add custom domain in Render settings, update `FRONTEND_URL`.

## Deployment to VPS

This example uses DigitalOcean, but similar steps apply to Linode, Vultr, or any VPS.

### Step 1: Create VPS

1. Go to [DigitalOcean](https://digitalocean.com)
2. Create a Droplet (Ubuntu 22.04 LTS)
3. Choose size: Basic $4/month (1GB RAM, 25GB SSD)
4. Add SSH key for secure access

### Step 2: Connect to VPS

```bash
ssh root@your-vps-ip-address
```

### Step 3: Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 4: Clone Repository

```bash
# Install git if needed
sudo apt-get install git

# Clone your repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Install dependencies
cd backend
npm install --production
npm run build
```

### Step 5: Set Up Environment

```bash
# Create .env file
nano .env

# Paste your environment variables
# Use these paths for persistence:
# DATABASE_PATH=/var/gemini-platform/database.db
# VIDEO_STORAGE_PATH=/var/gemini-platform/videos
```

```bash
# Create data directories
sudo mkdir -p /var/gemini-platform
sudo chown $USER:$USER /var/gemini-platform
```

### Step 6: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Start the application
pm2 start dist/server.js --name gemini-platform

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Step 7: Set Up Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt-get install nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/gemini-platform
```

Add this configuration:

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/gemini-platform /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 8: Set Up SSL with Certbot

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will auto-renew certificates
```

### Step 9: Configure Firewall

```bash
# Configure UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Step 10: Verify Deployment

```bash
# Check if app is running
pm2 status

# Check logs
pm2 logs gemini-platform

# Test health endpoint
curl http://localhost:3001/api/health
```

## Frontend Deployment

### Option 1: Vercel (Recommended for Frontend)

1. Go to [vercel.com](https://vercel.com) and sign up
2. Import your repository
3. Vercel will detect it's a Vite project
4. Set environment variable: `VITE_API_URL=https://your-backend-domain.com`
5. Deploy

**Vercel provides:**
- Automatic HTTPS
- Global CDN
- Preview deployments
- Free hosting

### Option 2: Serve from Backend (Monolith)

If you want to deploy frontend and backend together:

1. Build frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. Serve static files from backend:

   Add to `backend/src/server.ts` after all routes:

   ```typescript
   // Serve frontend static files in production
   if (process.env.NODE_ENV === 'production') {
     const frontendPath = path.join(__dirname, '../../frontend/dist');
     app.use(express.static(frontendPath));
     
     // SPA fallback
     app.get('*', (req, res) => {
       res.sendFile(path.join(frontendPath, 'index.html'));
     });
   }
   ```

3. Update `.env`: Set `FRONTEND_URL` to your backend URL

### Option 3: Separate Frontend Service

Deploy frontend to Railway or Render as a separate static site service using the configuration files provided.

## Monitoring & Maintenance

### Health Checks

Monitor your deployment with the health endpoint:

```bash
curl https://your-domain.com/api/health
```

Response includes:
- Database status
- Uptime
- Memory usage
- API metrics
- Active requests

### Detailed Metrics

```bash
curl https://your-domain.com/api/health/metrics
```

Provides detailed metrics for:
- API calls by endpoint
- Gemini API usage
- Error rates
- Request counts

### Log Monitoring

**Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# View logs
railway logs
```

**Render:**
- View logs in Render dashboard
- Or use SSH into container

**VPS:**
```bash
# PM2 logs
pm2 logs gemini-platform

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs (if using Winston)
tail -f /path/to/app/logs/combined.log
tail -f /path/to/app/logs/error.log
```

### Database Backups

**Railway/Render:**
- Automatic snapshots included
- Export database manually:
  ```bash
  railway shell
  sqlite3 /data/database.db ".backup /tmp/backup.db"
  exit
  railway cp /tmp/backup.db ./
  ```

**VPS:**
- Set up automated backups:
  ```bash
  # Add to crontab: 0 2 * * * /path/to/backup-script.sh
  crontab -e
  ```

Backup script example:
```bash
#!/bin/bash
BACKUP_DIR=/var/backups/gemini-platform
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /var/gemini-platform/database.db $BACKUP_DIR/database_$DATE.db
# Keep last 30 backups
ls -t $BACKUP_DIR/database_*.db | tail -n +31 | xargs rm --
```

### Performance Monitoring

Key metrics to monitor:
- Response time (should be < 200ms for health check)
- Memory usage (should stay under 512MB for free tier)
- Error rate (target: < 1%)
- Gemini API calls (monitor usage costs)
- Active requests (should not exceed capacity)

## Security Checklist

Before going to production, ensure:

### Environment Variables
- [ ] Strong JWT secrets generated with `openssl rand -base64 32`
- [ ] `.env` file NOT committed to git
- [ ] `.env.example` committed for reference
- [ ] All required variables set in production

### Authentication
- [ ] Google OAuth redirect URIs include production domain
- [ ] Google OAuth redirect URIs include `http://localhost` for dev
- [ ] JWT expiration times are reasonable (default: 1 hour access, 7 days refresh)

### CORS
- [ ] `FRONTEND_URL` set to your production frontend domain
- [ ] CORS properly configured in server.ts

### API Security
- [ ] Rate limiting enabled (automatic with production middleware)
- [ ] Helmet middleware installed and configured
- [ ] Input validation on all endpoints

### Data Security
- [ ] Database file on persistent volume
- [ ] Video storage on persistent volume
- [ ] Regular backups configured
- [ ] No sensitive data in logs

### Network Security
- [ ] HTTPS enforced (automatic on Railway/Render)
- [ ] SSL certificates valid (VPS)
- [ ] Firewall configured (VPS)
- [ ] SSH keys used instead of passwords (VPS)

### Dependencies
- [ ] Dependencies kept up-to-date: `npm audit`
- [ ] No high-severity vulnerabilities: `npm audit fix`

## Troubleshooting

### Issue: Application fails to start

**Symptoms:** Logs show "Cannot find module" or similar

**Solutions:**
1. Ensure `npm run build` completed successfully
2. Check `package.json` has correct `start` script
3. Verify `tsconfig.json` output directory matches `dist/`
4. Check build logs for TypeScript errors

### Issue: Database not persisting

**Symptoms:** Data lost after redeploy

**Solutions:**
1. Verify `DATABASE_PATH` points to persistent volume (`/data/database.db`)
2. Ensure volume is mounted correctly
3. Check file permissions on database file

### Issue: Video uploads fail

**Symptoms:** 500 errors on video upload

**Solutions:**
1. Verify `VIDEO_STORAGE_PATH` points to persistent volume (`/data/videos`)
2. Check disk space usage
3. Ensure directory exists and has write permissions
4. Check file size limits (10MB default, adjustable in server.ts)

### Issue: High memory usage

**Symptoms:** Application crashes or slows down

**Solutions:**
1. Monitor memory with `/api/health/metrics`
2. Check for memory leaks in code
3. Increase plan memory allocation if needed
4. Optimize Gemini API calls (caching, batch processing)

### Issue: Slow first response

**Symptoms:** First request takes > 30 seconds

**Solutions:**
1. Normal behavior on free tier (spin-up time)
2. Consider paid plan for always-on instances
3. Optimize bundle size and lazy loading

### Issue: CORS errors

**Symptoms:** Browser shows CORS policy errors

**Solutions:**
1. Verify `FRONTEND_URL` matches your frontend domain exactly
2. Check no trailing slashes in URLs
3. Ensure credentials are included in requests
4. Clear browser cache

### Issue: Gemini API errors

**Symptoms:** 429 or 500 errors from AI endpoints

**Solutions:**
1. Check API key is valid and has quota
2. Monitor usage in Google Cloud Console
3. Implement request queuing for high volume
4. Add retry logic with exponential backoff (already implemented)

## Cost Optimization

### Free Tier Usage

**Railway:**
- $5/month credit
- 512MB RAM
- 1GB disk
- Use for development/testing

**Render:**
- Free web service (with spin-down)
- 512MB RAM
- 1GB disk
- Use for staging

**Vercel (Frontend):**
- Always free for static sites
- Global CDN included

### Cost Reduction Tips

1. **Frontend on Vercel:** Always free, best performance
2. **Backend on Render:** Slightly cheaper than Railway for paid tiers
3. **VPS at scale:** Most cost-effective for production > $20/month
4. **Monitor usage:** Use `/api/health/metrics` to optimize
5. **Cache responses:** Reduces Gemini API calls (already implemented)
6. **Optimize videos:** Compress before upload

## Scaling Considerations

When to scale up:

- **CPU usage > 70%:** Upgrade to higher plan or add worker
- **Memory usage > 80%:** Increase RAM allocation
- **Disk usage > 80%:** Increase storage volume
- **API latency > 500ms:** Consider load balancing

Scaling options:

1. **Vertical scaling:** Upgrade plan (Railway/Render)
2. **Horizontal scaling:** Add instances (VPS with load balancer)
3. **Separate services:** Move frontend to Vercel (already optimal)

## Support & Resources

- **Documentation:** This guide + README.md
- **Health Check:** `/api/health` for system status
- **Metrics:** `/api/health/metrics` for detailed metrics
- **Logs:** Platform-specific log viewers
- **GitHub Issues:** Report bugs in repository

---

**Platform Status:** Production-ready ✓  
**Last Updated:** 2024  
**Version:** 1.0.0
