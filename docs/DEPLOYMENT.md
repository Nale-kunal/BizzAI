# 🚀 BizzAI Production Deployment Guide

**Version:** 1.0.0  
**Last Updated:** January 15, 2026

---

## Prerequisites

Before deploying to production, ensure you have:

- [ ] MongoDB Atlas account or self-hosted MongoDB 6+
- [ ] Domain name with DNS access
- [ ] SSL certificate (Let's Encrypt recommended)
- [ ] Email account for transactional emails (Gmail with app password)
- [ ] Server with Docker and Docker Compose installed
- [ ] Minimum 2GB RAM, 2 CPU cores, 20GB storage

---

## 1. Environment Setup

### Generate Secrets

```bash
# Generate strong JWT secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate backup encryption passphrase
node -e "console.log('BACKUP_GPG_PASSPHRASE=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Create Production .env Files

**Backend (.env):**
```bash
# Server
PORT=5000
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bizzai?retryWrites=true&w=majority

# Security
JWT_SECRET=<generated-secret-from-above>
JWT_REFRESH_SECRET=<generated-secret-from-above>

# Email
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=<gmail-app-password>

# Frontend
FRONTEND_URL=https://yourdomain.com

# Optional: Error Tracking
SENTRY_DSN=<your-sentry-dsn>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Backup
BACKUP_GPG_PASSPHRASE=<generated-passphrase>
BACKUP_DIR=./backups
RETENTION_DAYS=30
```

**Frontend (.env):**
```bash
VITE_BACKEND_URL=https://api.yourdomain.com
```

---

## 2. SSL Certificate Setup

### Option A: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### Option B: Custom Certificate

Place your certificate files in:
- `/etc/ssl/certs/yourdomain.com.crt`
- `/etc/ssl/private/yourdomain.com.key`

Update `nginx-ssl.conf` with correct paths.

---

## 3. DNS Configuration

Point your domain to your server:

```
A Record:  yourdomain.com      → <your-server-ip>
A Record:  api.yourdomain.com  → <your-server-ip>
CNAME:     www.yourdomain.com  → yourdomain.com
```

---

## 4. Database Setup

### MongoDB Atlas (Recommended)

1. Create cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user
3. Whitelist your server IP
4. Get connection string
5. Update `MONGO_URI` in .env

### Self-Hosted MongoDB

```bash
# Install MongoDB
sudo apt-get install mongodb-org

# Enable authentication
mongo admin --eval 'db.createUser({user:"admin",pwd:"<password>",roles:["root"]})'

# Update MONGO_URI
MONGO_URI=mongodb://admin:<password>@localhost:27017/bizzai?authSource=admin
```

---

## 5. Application Deployment

### Using Docker Compose

1. **Clone repository:**
```bash
git clone https://github.com/yourusername/BizzAI.git
cd BizzAI
```

2. **Set environment variables:**
```bash
# Create .env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit with your values
nano backend/.env
nano frontend/.env
```

3. **Update nginx configuration:**
```bash
# Copy SSL config
cp frontend/nginx-ssl.conf frontend/nginx.conf

# Update domain names
sed -i 's/yourdomain.com/your-actual-domain.com/g' frontend/nginx.conf
```

4. **Build and deploy:**
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 6. Post-Deployment Verification

### Health Checks

```bash
# Check application health
curl https://api.yourdomain.com/api/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":123,"environment":"production"}

# Check database connectivity
curl https://api.yourdomain.com/api/health/ready

# Expected response:
# {"status":"ready","timestamp":"...","checks":{"database":"connected"}}
```

### SSL Verification

```bash
# Check SSL certificate
curl -I https://yourdomain.com

# Verify HTTPS redirect
curl -I http://yourdomain.com
# Should return: 301 Moved Permanently

# Check security headers
curl -I https://yourdomain.com | grep -i "strict-transport-security"
```

### Functional Testing

- [ ] Register new user
- [ ] Login with credentials
- [ ] Create inventory item
- [ ] Add customer
- [ ] Create POS invoice
- [ ] Process return
- [ ] Generate reports

---

## 7. Backup Configuration

### Automated Daily Backups

```bash
# Make scripts executable
chmod +x scripts/backup-mongodb.sh
chmod +x scripts/restore-mongodb.sh

# Test backup manually
./scripts/backup-mongodb.sh

# Setup cron job for daily backups at 2 AM
crontab -e

# Add this line:
0 2 * * * cd /path/to/BizzAI && ./scripts/backup-mongodb.sh >> /var/log/bizzai-backup.log 2>&1
```

### Test Restore

```bash
# List backups
ls -lh backups/

# Test restore (use test database first!)
MONGO_URI=mongodb://localhost:27017/bizzai_test ./scripts/restore-mongodb.sh backups/bizzai_backup_20260115_020000.tar.gz.gpg
```

---

## 8. Monitoring Setup

### Application Logs

```bash
# View backend logs
docker-compose logs -f backend

# View nginx logs
docker-compose logs -f frontend

# Logs are also in backend/logs/ directory
tail -f backend/logs/$(date +%Y-%m-%d).log
```

### Error Tracking (Optional)

If using Sentry:

1. Create account at [sentry.io](https://sentry.io)
2. Create new project
3. Copy DSN
4. Add to backend/.env: `SENTRY_DSN=<your-dsn>`
5. Restart application

---

## 9. Security Checklist

Before going live:

- [ ] All environment variables set
- [ ] Strong JWT secrets generated (64+ characters)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] SSL certificate valid and not expired
- [ ] Security headers present (check with curl)
- [ ] Rate limiting active (test with multiple requests)
- [ ] Database authentication enabled
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] Backup encryption enabled
- [ ] Email sending tested
- [ ] Error tracking configured (optional)

---

## 10. Performance Optimization

### Enable Caching

```nginx
# In nginx.conf, static assets already cached for 1 year
# Verify with:
curl -I https://yourdomain.com/assets/logo.png | grep -i "cache-control"
```

### Database Indexes

```bash
# Run index creation script
cd backend
node scripts/create-indexes.js
```

---

## 11. Scaling Considerations

### Horizontal Scaling

To run multiple instances:

1. Use external MongoDB (MongoDB Atlas)
2. Use external file storage for invoices (S3/Cloud Storage)
3. Use Redis for session storage (if needed)
4. Use load balancer (nginx, HAProxy, or cloud LB)

### Vertical Scaling

Recommended resources per 1000 concurrent users:
- 4GB RAM
- 2 CPU cores
- 50GB storage

---

## 12. Rollback Procedure

If deployment fails:

```bash
# Stop current deployment
docker-compose down

# Restore from backup
./scripts/restore-mongodb.sh backups/bizzai_backup_<timestamp>.tar.gz.gpg

# Checkout previous version
git checkout <previous-commit>

# Rebuild and deploy
docker-compose build
docker-compose up -d
```

---

## 13. Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker-compose build

# Restart with zero downtime (if using multiple instances)
docker-compose up -d --no-deps --build backend
docker-compose up -d --no-deps --build frontend
```

### Certificate Renewal

```bash
# Let's Encrypt auto-renewal
sudo certbot renew --dry-run

# Setup auto-renewal cron
sudo crontab -e
# Add: 0 0 1 * * certbot renew --quiet && docker-compose restart frontend
```

### Database Maintenance

```bash
# Compact database (monthly)
mongo $MONGO_URI --eval "db.runCommand({compact: 'invoices'})"

# Check database size
mongo $MONGO_URI --eval "db.stats()"
```

---

## 14. Troubleshooting

### Application Won't Start

```bash
# Check environment variables
docker-compose config

# Check logs
docker-compose logs backend

# Verify database connection
docker-compose exec backend node -e "require('./config/db.js').default()"
```

### SSL Issues

```bash
# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -noout -dates
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check database slow queries
mongo $MONGO_URI --eval "db.system.profile.find().sort({ts:-1}).limit(5).pretty()"

# Enable MongoDB profiling
mongo $MONGO_URI --eval "db.setProfilingLevel(1, {slowms: 100})"
```

---

## 15. Support

For issues or questions:

- GitHub Issues: [github.com/yourusername/BizzAI/issues](https://github.com/yourusername/BizzAI/issues)
- Email: support@yourdomain.com
- Documentation: [docs.yourdomain.com](https://docs.yourdomain.com)

---

## Quick Reference

### Essential Commands

```bash
# Start application
docker-compose up -d

# Stop application
docker-compose down

# View logs
docker-compose logs -f

# Restart service
docker-compose restart backend

# Backup database
./scripts/backup-mongodb.sh

# Restore database
./scripts/restore-mongodb.sh <backup-file>

# Check health
curl https://api.yourdomain.com/api/health
```

### Important Files

- `backend/.env` - Backend environment variables
- `frontend/.env` - Frontend environment variables
- `frontend/nginx.conf` - Nginx configuration
- `docker-compose.yml` - Docker services configuration
- `scripts/backup-mongodb.sh` - Backup script
- `scripts/restore-mongodb.sh` - Restore script

---

**🎉 Congratulations! Your BizzAI application is now production-ready!**
