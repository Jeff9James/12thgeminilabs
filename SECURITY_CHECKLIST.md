# Security Checklist for Production Deployment

Use this checklist to ensure your Gemini Video Platform deployment is secure before going to production.

## Environment Variables & Secrets

### 🔒 Critical Security Items

- [ ] **Generate strong JWT secrets**
  ```bash
  # Use these commands:
  openssl rand -base64 32  # JWT_SECRET
  openssl rand -base64 32  # JWT_REFRESH_SECRET
  ```
  - [ ] Secrets are at least 32 characters long
  - [ ] Secrets are unique for each deployment
  - [ ] Secrets are NOT committed to git

- [ ] **API Keys**
  - [ ] `GEMINI_API_KEY` is set and valid
  - [ ] `GOOGLE_CLIENT_ID` is set and valid
  - [ ] `GOOGLE_CLIENT_SECRET` is set and valid
  - [ ] API keys are rotated periodically (recommended: every 90 days)

- [ ] **Environment Configuration**
  - [ ] `.env` file exists and is NOT committed to git
  - [ ] `.env.example` exists with placeholders (committed)
  - [ ] `NODE_ENV` is set to `production`
  - [ ] `FRONTEND_URL` matches your production domain exactly

## Google OAuth Configuration

### 🔐 OAuth Settings

- [ ] **Authorized Origins**
  - [ ] Frontend URL (e.g., `https://your-frontend-domain.com`)
  - [ ] No trailing slashes in URLs

- [ ] **Authorized Redirect URIs**
  - [ ] Backend URL with callback path:
    - `https://your-backend-domain.com/api/auth/google/callback`
  - [ ] Local development URL (for testing):
    - `http://localhost:3001/api/auth/google/callback`

- [ ] **OAuth Consent Screen**
  - [ ] Application name is set
  - [ ] Application logo is uploaded (optional but recommended)
  - [ ] Privacy policy URL is set
  - [ ] Terms of service URL is set
  - [ ] Domain verification completed (for production)

## Platform Security

### Railway/Render Specific

- [ ] **Persistent Volumes**
  - [ ] Database path: `/data/database.db`
  - [ ] Video storage path: `/data/videos`
  - [ ] Volume is mounted correctly

- [ ] **Access Control**
  - [ ] Two-factor authentication (2FA) enabled on account
  - [ ] Team members have minimal required permissions
  - [ ] Audit logs are reviewed regularly

- [ ] **Network Security**
  - [ ] HTTPS is enforced (automatic on Railway/Render)
  - [ ] SSL/TLS certificates are valid
  - [ ] No insecure HTTP endpoints exposed

### VPS Specific

- [ ] **Server Hardening**
  - [ ] SSH key authentication (password login disabled)
  - [ ] Root login disabled in SSH config
  - [ ] SSH port changed from default 22 (optional)
  - [ ] Firewall configured (UFW):
    ```bash
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    sudo ufw enable
    ```
  - [ ] Fail2ban installed for SSH protection

- [ ] **System Updates**
  - [ ] Automatic security updates enabled
  - [ ] System is up to date: `sudo apt update && sudo apt upgrade`
  - [ ] Security patches applied regularly

- [ **Nginx Security**
  - [ ] Nginx version is current
  - [ ] SSL/TLS configured with strong ciphers
  - [ ] HTTP to HTTPS redirect enabled
  - [ ] Security headers configured:
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `X-XSS-Protection: 1; mode=block`
    - `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## Application Security

### 🛡️ Middleware & Configuration

- [ ] **Helmet Middleware**
  - [ ] Installed and configured in `server.ts`
  - [ ] Content Security Policy is appropriate
  - [ ] HTTP Strict Transport Security (HSTS) enabled

- [ ] **CORS Configuration**
  - [ ] `FRONTEND_URL` matches your frontend domain
  - [ ] Credentials are enabled if needed
  - [ ] No wildcard origins (`*`) in production

- [ ] **Rate Limiting**
  - [ ] Auth endpoints: 5 requests per 15 minutes
  - [ ] API endpoints: 100 requests per 15 minutes
  - [ ] Chat per video: 50 messages per 24 hours
  - [ ] Streaming endpoints: No rate limiting (as intended)

- [ ] **Input Validation**
  - [ ] All user input is validated
  - [ ] File uploads have size limits (10MB)
  - [ ] File upload types are restricted
  - [ ] SQL injection protection (parameterized queries)
  - [ ] XSS protection (input sanitization)

- [ ] **Error Handling**
  - [ ] Stack traces not exposed in production
  - [ ] Generic error messages for users
  - [ ] Detailed errors logged securely
  - [ ] Sensitive information not in error messages

## Database Security

### 🗄️ SQLite Security

- [ ] **Database Location**
  - [ ] Database file on persistent volume (`/data/database.db`)
  - [ ] Database file not in web root
  - [ ] Database file permissions are restricted (600 or 640)

- [ ] **Database Access**
  - [ ] Application is the only process accessing database
  - [ ] Database backups are encrypted if stored off-server
  - [ ] Database credentials not hardcoded

- [ ] **Data Protection**
  - [ ] Sensitive user data is protected
  - [ ] Personal information minimization
  - [ ] Data retention policy defined
  - [ ] Right to deletion implemented

## API Security

### 🔌 API Endpoints

- [ ] **Authentication**
  - [ ] All protected endpoints require authentication
  - [ ] JWT tokens are validated on each request
  - [ ] Token expiration is enforced (1 hour access, 7 days refresh)
  - [ ] Refresh tokens are securely stored

- [ ] **Authorization**
  - [ ] Users can only access their own data
  - [ ] Resource ownership verified
  - [ ] Admin endpoints protected

- [ ] **API Versioning**
  - [ ] API version is clear (currently v1)
  - [ ] Deprecation policy documented
  - [ ] Breaking changes are versioned

- [ ] **Security Headers**
  - [ ] `X-Request-ID` header for request tracing
  - [ ] `X-Response-Time` header for monitoring
  - [ ] No sensitive headers in responses

## Data Privacy & Compliance

### 📋 Privacy Considerations

- [ ] **Data Collection**
  - [ ] Only necessary data is collected
  - [ ] Data collection is disclosed to users
  - [ ] User consent obtained where required

- [ ] **Data Storage**
  - [ ] Data encrypted at rest (if required)
  - [ ] Data encrypted in transit (HTTPS)
  - [ ] Secure backup procedures

- [ ] **Data Retention**
  - [ ] Data retention policy defined
  - [ ] Automatic data deletion when appropriate
  - [ ] User data export available (GDPR)

- [ ] **Third-Party Services**
  - [ ] Google AI Studio terms reviewed
  - [ ] Google OAuth terms reviewed
  - [ ] Data processing agreements in place (if required)

## Monitoring & Logging

### 📊 Security Monitoring

- [ ] **Logging**
  - [ ] Security events logged (failed logins, suspicious activity)
  - [ ] Logs are not exposed publicly
  - [ ] Logs are rotated to prevent disk exhaustion
  - [ ] Logs are retained for appropriate period

- [ ] **Monitoring**
  - [ ] Health check endpoint monitored
  - [ ] Error rates monitored
  - [ ] Unusual activity alerts configured
  - [ ] Response times monitored

- [ ] **Alerting**
  - [ ] Alerts configured for security events
  - [ ] Alerts configured for service downtime
  - [ ] Alert notification channels verified

## Backup & Recovery

### 💾 Data Protection

- [ ] **Backups**
  - [ ] Automated database backups configured
  - [ ] Backups tested for restoration
  - [ ] Backup retention policy defined
  - [ ] Backups stored securely (encrypted if off-site)

- [ ] **Disaster Recovery**
  - [ ] Disaster recovery plan documented
  - [ ] Recovery procedures tested
  - [ ] RTO (Recovery Time Objective) defined
  - [ ] RPO (Recovery Point Objective) defined

## Deployment Security

### 🚀 Deployment Process

- [ ] **Source Code**
  - [ ] `.gitignore` excludes sensitive files
  - [ ] No secrets in source code
  - [ ] Repository is private

- [ ] **Deployment**
  - [ ] Secure deployment process
  - [ ] Deployment logs reviewed
  - [ ] Rollback procedure tested
  - [ ] Zero-downtime deployment (if supported)

- [ ] **CI/CD**
  - [ ] Secrets managed securely in CI/CD
  - [ ] Automated security scans (if applicable)
  - [ ] Pull request reviews enforced

## Post-Deployment Security

### 🔍 Ongoing Security

- [ ] **Regular Audits**
  - [ ] Security audit schedule defined (quarterly recommended)
  - [ ] Dependency audits: `npm audit`
  - [ ] Vulnerability scanning configured

- [ ] **Dependency Management**
  - [ ] Dependencies kept up to date
  - [ ] Security patches applied promptly
  - [ ] Vulnerable packages replaced

- [ ] **Incident Response**
  - [ ] Incident response plan documented
  - [ ] Team roles and responsibilities defined
  - [ ] Communication channels established
  - [ ] Legal requirements understood

## Compliance Considerations

### ⚖️ Regulatory Compliance

If applicable to your use case:

- [ ] **GDPR** (EU General Data Protection Regulation)
  - [ ] Privacy policy is compliant
  - [ ] User consent mechanisms implemented
  - [ ] Data subject rights implemented
  - [ ] Data breach notification procedure

- [ ] **CCPA** (California Consumer Privacy Act)
  - [ ] Privacy policy updated
  - [ ] Data deletion rights implemented
  - [ ] Do not sell option available

- [ ] **SOC 2** (if required)
  - [ ] Security controls documented
  - [ ] Access controls implemented
  - [ ] Monitoring and logging in place

## Pre-Launch Security Checklist

### ✅ Final Verification

Before launching to production:

- [ ] All items in this checklist reviewed
- [ ] Security audit completed (even if self-audit)
- [ ] Penetration testing performed (if possible)
- [ ] Legal review completed (if applicable)
- [ ] Team trained on security procedures
- [ ] Incident response team identified
- [ ] Emergency contact information documented

## Security Best Practices

### 📚 Ongoing Security

1. **Principle of Least Privilege**
   - Users and systems have minimum required access
   - Review permissions regularly

2. **Defense in Depth**
   - Multiple security layers
   - No single point of failure

3. **Security by Design**
   - Security considered in all decisions
   - Regular security reviews

4. **Transparency**
   - Open about security practices
   - Clear communication about incidents

5. **Continuous Improvement**
   - Stay informed about security threats
   - Regular security training
   - Update security practices

## Resources

### 📖 Security Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://github.com/lirantal/nodejs-security-best-practices)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Google Cloud Security](https://cloud.google.com/security)

### 🛠️ Security Tools

- `npm audit` - Check for vulnerabilities
- `npm audit fix` - Automatically fix vulnerabilities
- Snyk - Dependency vulnerability scanner
- SonarQube - Code security analysis

---

**Remember:** Security is an ongoing process, not a one-time checklist. Review and update this checklist regularly as threats evolve.

**Last Updated:** 2024
**Version:** 1.0.0
