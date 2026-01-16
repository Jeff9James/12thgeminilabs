# Monitoring & Performance Guide

This guide covers monitoring, performance optimization, and maintenance for the Gemini Video Platform in production.

## Table of Contents

1. [Built-in Monitoring](#built-in-monitoring)
2. [Health Check Endpoints](#health-check-endpoints)
3. [Performance Metrics](#performance-metrics)
4. [Performance Optimization](#performance-optimization)
5. [Error Tracking](#error-tracking)
6. [Logging Strategy](#logging-strategy)
7. [Alerting Setup](#alerting-setup)
8. [Backup Strategies](#backup-strategies)

## Built-in Monitoring

The application includes built-in monitoring through the health check endpoints and metrics service.

### Automatic Metrics Collection

The `MetricsService` automatically tracks:

- **API Calls**: Total count, by endpoint, by HTTP method
- **Gemini API Usage**: Total calls, success/failure rates, by model
- **Errors**: Total count, by error type (client/server)
- **Requests**: Active concurrent requests, total requests served

### Request IDs

Every request receives a unique ID for tracing:
- Header: `X-Request-ID`
- Logged in all log entries
- Useful for debugging distributed issues

## Health Check Endpoints

### Basic Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-16T10:30:00.000Z",
    "uptime": 3600,
    "database": {
      "status": "connected",
      "videoCount": 42
    },
    "metrics": {
      "apiCalls": 1523,
      "geminiCalls": 89,
      "errors": 12,
      "activeRequests": 3
    },
    "memory": {
      "used": 128.5,
      "total": 256.0
    }
  },
  "message": "Server is running and healthy"
}
```

**Use cases:**
- Uptime monitoring (UptimeRobot, Pingdom)
- Load balancer health checks
- Automated health checks in CI/CD

### Detailed Metrics

**Endpoint:** `GET /api/health/metrics`

**Response:**
```json
{
  "success": true,
  "data": {
    "uptime": 3600,
    "startTime": "2024-01-16T09:30:00.000Z",
    "apiCalls": {
      "total": 1523,
      "byEndpoint": {
        "/api/health": 45,
        "/api/videos": 234,
        "/api/videos/:id/analyze": 89
      },
      "byMethod": {
        "GET": 876,
        "POST": 647
      }
    },
    "geminiCalls": {
      "total": 89,
      "successful": 85,
      "failed": 4,
      "byModel": {
        "gemini-1.5-pro": 89
      }
    },
    "errors": {
      "total": 12,
      "byType": {
        "client_error": 10,
        "server_error": 2
      }
    },
    "requests": {
      "active": 3,
      "total": 1535
    }
  }
}
```

**Use cases:**
- Detailed performance analysis
- API usage analytics
- Error rate tracking
- Capacity planning

## Performance Metrics

### Key Performance Indicators (KPIs)

Monitor these metrics regularly:

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Health Check Response Time | < 100ms | 100-200ms | > 200ms |
| API Response Time (p95) | < 500ms | 500-1000ms | > 1000ms |
| Error Rate | < 1% | 1-5% | > 5% |
| Memory Usage | < 512MB | 512-768MB | > 768MB |
| Active Requests | < 50 | 50-100 | > 100 |
| Gemini API Success Rate | > 95% | 90-95% | < 90% |

### Response Time Headers

All API responses include timing information:

```
X-Response-Time: 45ms
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

### Memory Usage

Monitor Node.js memory consumption:

```bash
# Check memory metrics
curl https://your-app.com/api/health | jq '.data.memory'

# Expected output:
{
  "used": 128.5,      # MB of heap used
  "total": 256.0     # MB of heap total
}
```

## Performance Optimization

### Frontend Optimization

#### 1. Code Splitting

The frontend already implements code splitting:

```typescript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: {
      vendor: ['react', 'react-dom', 'react-router-dom'],
      ui: ['@tanstack/react-query'],
      auth: ['@react-oauth/google'],
    },
  },
}
```

**Benefits:**
- Smaller initial bundle
- Faster page loads
- Better caching

#### 2. Minification

Production builds use Terser with optimizations:

```typescript
minify: 'terser',
terserOptions: {
  compress: {
    drop_console: true,      // Remove console.log in production
    drop_debugger: true,
  },
}
```

#### 3. Lazy Loading

Load components on-demand:

```typescript
// Example: Lazy load video player
const VideoPlayer = lazy(() => import('./components/VideoPlayer'));

// Usage with Suspense
<Suspense fallback={<Spinner />}>
  <VideoPlayer />
</Suspense>
```

#### 4. Asset Optimization

- Images: Use WebP format when possible
- Videos: Pre-compress before upload
- Icons: Use SVG format
- Fonts: Subset and WOFF2 format

### Backend Optimization

#### 1. Compression Middleware

Gzip compression is enabled automatically:

```typescript
app.use(compression());
```

**Benefits:**
- Reduces payload size by 60-80%
- Faster transfer times
- Lower bandwidth costs

#### 2. Response Caching

Gemini API responses are cached for 24 hours:

```typescript
// Already implemented in gemini.ts
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
```

**Benefits:**
- Reduces API costs
- Faster responses for repeat requests
- Lower load on Gemini API

#### 3. Database Optimization

##### Indexes

Ensure database indexes exist:

```sql
-- Check existing indexes
PRAGMA index_list(videos);
PRAGMA index_list(conversations);
PRAGMA index_list(bookmarks);
PRAGMA index_list(rate_limits);
```

##### Query Optimization

Use prepared statements with parameterized queries (already implemented):

```typescript
// Good: Parameterized query
db.get('SELECT * FROM videos WHERE id = ?', [videoId]);

// Bad: String concatenation (SQL injection risk)
db.get(`SELECT * FROM videos WHERE id = ${videoId}`);
```

#### 4. Rate Limiting

Multiple layers of rate limiting:

1. **Auth endpoints:** 5 requests per 15 minutes
2. **API endpoints:** 100 requests per 15 minutes
3. **Chat per video:** 50 messages per 24 hours
4. **Streaming:** No rate limiting

#### 5. Connection Pooling

SQLite is single-connection by design, but we optimize by:

- Reusing database connection (singleton pattern)
- Keeping connection open
- Using prepared statements

## Error Tracking

### Automatic Error Classification

Errors are automatically categorized:

```typescript
// Client errors (4xx)
metricsService.incrementError('client_error');

// Server errors (5xx)
metricsService.incrementError('server_error');
```

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Patterns

#### 1. Rate Limit Exceeded

```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later"
}
```

**Solution:** Wait and retry, or increase rate limit.

#### 2. Database Connection Failed

```json
{
  "success": false,
  "error": "Database connection failed"
}
```

**Solution:** Check persistent volume, restart application.

#### 3. Gemini API Error

```json
{
  "success": false,
  "error": "Gemini API quota exceeded"
}
```

**Solution:** Check API quota in Google Cloud Console, upgrade plan.

#### 4. File Upload Failed

```json
{
  "success": false,
  "error": "Failed to process video upload"
}
```

**Solution:** Check file size, format, and disk space.

## Logging Strategy

### Log Levels

Configure log level with `LOG_LEVEL` environment variable:

- `error`: Only errors
- `warn`: Warnings and errors
- `info`: Info, warnings, errors (default)
- `debug`: All logs including debug

### Log Format

Structured logging with JSON:

```json
{
  "level": "info",
  "message": "GET /api/health",
  "timestamp": "2024-01-16T10:30:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### Log Files

Logs are written to files in production:

- `combined.log`: All logs
- `error.log`: Only error logs

**Location:** Application root directory

### Log Rotation

For production, implement log rotation:

**Option 1: PM2 (VPS)**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

**Option 2: Logrotate (Linux)**
```bash
# /etc/logrotate.d/gemini-platform
/path/to/app/logs/*.log {
  daily
  rotate 30
  compress
  delaycompress
  missingok
  notifempty
  create 0644 www-data www-data
}
```

### Viewing Logs

**Railway:**
```bash
railway logs
# Or view in dashboard
```

**Render:**
- View logs in Render dashboard
- Stream with `render logs`

**VPS:**
```bash
# PM2 logs
pm2 logs gemini-platform

# Tail log files
tail -f logs/combined.log
tail -f logs/error.log

# Search logs
grep "ERROR" logs/combined.log
grep "requestId" logs/combined.log | tail -20
```

## Alerting Setup

### External Monitoring Services

Recommended monitoring tools:

1. **UptimeRobot** (Free)
   - Monitor `/api/health` endpoint
   - Alert on 5xx errors or timeouts
   - 5-minute check interval

2. **Better Uptime** (Free)
   - Status page included
   - Multiple check locations
   - SMS/email alerts

3. **Sentry** (Free tier)
   - Error tracking and alerting
   - Stack trace aggregation
   - Performance monitoring

### Custom Alerting Script

Set up a simple health check script:

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="https://your-app.com/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -ne 200 ]; then
  echo "Health check failed! Status: $RESPONSE"
  # Send alert (email, Slack, etc.)
  # Example: curl -X POST $SLACK_WEBHOOK_URL ...
  exit 1
fi

echo "Health check passed"
exit 0
```

Run with cron:
```bash
# Check every 5 minutes
*/5 * * * * /path/to/health-check.sh
```

### Alert Thresholds

Configure alerts for:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Health check status | != 200 | Immediate alert |
| Response time | > 2s | Warning |
| Error rate | > 5% | Warning |
| Error rate | > 10% | Critical alert |
| Memory usage | > 800MB | Warning |
| Memory usage | > 900MB | Critical alert |
| Disk space | < 10% | Critical alert |

## Backup Strategies

### Database Backups

#### Automatic Backups (VPS)

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/var/backups/gemini-platform"
DATABASE_PATH="/data/database.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Create backup
cp $DATABASE_PATH $BACKUP_DIR/database_$DATE.db

# Compress old backups (older than 7 days)
find $BACKUP_DIR -name "database_*.db" -mtime +7 -exec gzip {} \;

# Keep only last 30 days of backups
find $BACKUP_DIR -name "database_*.db.gz" -mtime +30 -delete

echo "Backup completed: database_$DATE.db"
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-database.sh >> /var/backups/backup.log 2>&1
```

#### Manual Backups (Railway/Render)

```bash
# Railway
railway shell
cp /data/database.db /tmp/backup.db
exit
railway cp /tmp/backup.db ./

# Render
# Use Render dashboard to download database file
```

### Video Storage Backups

Videos are stored in `/data/videos` (or configured path). Options:

1. **Cloud Storage Sync**: Sync to Google Cloud Storage or S3
2. **Periodic Snapshot**: Platform provides automatic snapshots
3. **External Backup**: Download important videos periodically

### Disaster Recovery Plan

1. **Data Loss Recovery:**
   - Restore from latest database backup
   - Re-upload critical videos if needed
   - Notify users of downtime

2. **Complete System Failure:**
   - Deploy fresh instance
   - Restore database from backup
   - Restore video storage from backup
   - Update DNS if needed

3. **Testing Recovery:**
   - Practice restore procedures monthly
   - Test backup integrity regularly
   - Document recovery steps

## Performance Tuning Checklist

### Daily
- [ ] Check `/api/health/metrics` for anomalies
- [ ] Review error logs
- [ ] Monitor disk space usage

### Weekly
- [ ] Analyze API usage patterns
- [ ] Review Gemini API costs
- [ ] Check database size and optimize if needed

### Monthly
- [ ] Test backup restoration
- [ ] Review and update dependencies: `npm audit fix`
- [ ] Analyze performance trends
- [ ] Update security patches

### Quarterly
- [ ] Performance audit and optimization
- [ ] Security review
- [ ] Cost analysis and optimization
- [ ] Capacity planning

---

**Monitoring Stack:** Built-in + External (UptimeRobot recommended)  
**Logging:** Winston + File + Platform Console  
**Backup:** Daily automated + Manual option  
**Alerting:** Health check + Error rate monitoring
