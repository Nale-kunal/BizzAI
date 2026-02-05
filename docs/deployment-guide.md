# Deployment Guide

## Overview

This guide covers deployment procedures for BizzAI Inventory Management System to production environments.

## Deployment Architecture

### Backend (Render)
- **Service**: Web Service
- **Environment**: Node.js 18+
- **Database**: MongoDB Atlas (Replica Set)
- **Cache**: Redis Cloud
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### Frontend (Vercel)
- **Framework**: React 18
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] Linting passed (`npm run lint`)
- [ ] Code reviewed and approved
- [ ] No console.log statements in production code
- [ ] Environment variables documented

### Database
- [ ] Migrations tested in staging
- [ ] Backup created
- [ ] Indexes optimized
- [ ] Connection pooling configured

### Security
- [ ] Secrets rotated
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Security headers set

### Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Performance monitoring enabled
- [ ] Log aggregation set up
- [ ] Alerts configured

---

## Environment Variables

### Backend (.env)

```bash
# Application
NODE_ENV=production
PORT=5000
API_URL=https://api.bizzai.com

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/bizzai?retryWrites=true&w=majority
MONGO_POOL_SIZE=10

# Redis
REDIS_URL=redis://default:password@redis-cloud.com:6379
REDIS_HOST=redis-cloud.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRE=30d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@bizzai.com
EMAIL_PASS=your-email-password
EMAIL_FROM=BizzAI <noreply@bizzai.com>

# AWS S3 (for backups)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=bizzai-backups
AWS_REGION=ap-south-1

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# Feature Flags
ENABLE_GDPR=true
ENABLE_PERIOD_LOCKING=true
MAINTENANCE_MODE=false
```

### Frontend (.env)

```bash
VITE_API_URL=https://api.bizzai.com
VITE_APP_NAME=BizzAI
VITE_ENABLE_ANALYTICS=true
```

---

## Deployment Steps

### 1. Backend Deployment (Render)

#### Initial Setup

```bash
# 1. Create Render account and connect GitHub

# 2. Create new Web Service
# - Name: bizzai-backend
# - Environment: Node
# - Branch: main
# - Build Command: npm install
# - Start Command: npm start

# 3. Add environment variables in Render dashboard
# Copy all variables from .env

# 4. Configure health check
# Path: /health
# Expected Status: 200
```

#### Deployment Process

```bash
# 1. Merge to main branch
git checkout main
git merge develop
git push origin main

# 2. Render auto-deploys on push to main

# 3. Monitor deployment
# Check Render dashboard for build logs

# 4. Verify deployment
curl https://api.bizzai.com/health
# Should return: {"status":"ok"}
```

#### Manual Deployment

```bash
# If auto-deploy fails, deploy manually:

# 1. SSH into Render (if available) or use Render CLI
render deploy

# 2. Or trigger via API
curl -X POST https://api.render.com/deploy/srv-xxx \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 2. Frontend Deployment (Vercel)

#### Initial Setup

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Link project
cd frontend
vercel link

# 4. Configure environment variables
vercel env add VITE_API_URL production
# Enter: https://api.bizzai.com
```

#### Deployment Process

```bash
# 1. Build locally to verify
npm run build

# 2. Deploy to production
vercel --prod

# 3. Verify deployment
curl https://bizzai.vercel.app
```

#### Automatic Deployment

```bash
# Vercel auto-deploys on push to main

# 1. Push to main
git push origin main

# 2. Vercel builds and deploys automatically

# 3. Check deployment status
vercel ls
```

---

## Database Migrations

### Running Migrations in Production

```bash
# 1. Backup database first
./scripts/backup-mongodb.sh

# 2. SSH into production server or use Render shell

# 3. Run migrations
npm run migrate:up

# 4. Verify migration
npm run migrate:status

# 5. If issues, rollback
npm run migrate:down
```

### Migration Best Practices

1. **Always backup before migration**
2. **Test in staging first**
3. **Run during low-traffic hours**
4. **Monitor during migration**
5. **Have rollback plan ready**

---

## Rollback Procedures

### Backend Rollback

```bash
# 1. Identify last working deployment
# Check Render dashboard for previous deployments

# 2. Rollback via Render dashboard
# Click "Rollback" on previous deployment

# 3. Or rollback via Git
git revert HEAD
git push origin main

# 4. Verify rollback
curl https://api.bizzai.com/health
```

### Frontend Rollback

```bash
# 1. Rollback via Vercel dashboard
# Select previous deployment and promote to production

# 2. Or rollback via CLI
vercel rollback

# 3. Verify rollback
curl https://bizzai.vercel.app
```

### Database Rollback

```bash
# 1. Rollback migration
npm run migrate:down

# 2. If data corrupted, restore from backup
./scripts/restore-mongodb.sh /backups/mongodb/latest.tar.gz

# 3. Verify data integrity
npm run test:integration
```

---

## Monitoring & Alerts

### Health Checks

```bash
# Backend health
curl https://api.bizzai.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-01-31T16:00:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

### Error Monitoring (Sentry)

1. **Setup Sentry Project**
   - Create project in Sentry
   - Copy DSN
   - Add to environment variables

2. **Configure Alerts**
   - Error rate > 5%
   - Response time > 2s
   - Database connection failures

### Performance Monitoring

```bash
# Monitor response times
# Use Render metrics dashboard

# Monitor database performance
# Use MongoDB Atlas monitoring

# Monitor Redis
# Use Redis Cloud monitoring
```

---

## Scaling

### Horizontal Scaling (Render)

```bash
# 1. Go to Render dashboard
# 2. Select service
# 3. Scale > Increase instance count
# 4. Recommended: 2-3 instances for production

# Note: Ensure Redis sessions for stateless scaling
```

### Database Scaling (MongoDB Atlas)

```bash
# 1. Go to MongoDB Atlas
# 2. Select cluster
# 3. Edit Configuration
# 4. Increase tier (M10 → M20 → M30)
# 5. Enable auto-scaling if needed
```

### Redis Scaling

```bash
# 1. Go to Redis Cloud
# 2. Select database
# 3. Edit configuration
# 4. Increase memory limit
# 5. Enable clustering if needed
```

---

## Backup & Recovery

### Automated Backups

```bash
# Setup cron job for daily backups
0 2 * * * /path/to/scripts/backup-mongodb.sh

# Backups stored in:
# - Local: /backups/mongodb/
# - S3: s3://bizzai-backups/mongodb/
```

### Manual Backup

```bash
# Create backup
./scripts/backup-mongodb.sh

# Verify backup
ls -lh /backups/mongodb/

# Upload to S3
aws s3 cp /backups/mongodb/latest.tar.gz s3://bizzai-backups/mongodb/
```

### Restore from Backup

```bash
# 1. Download backup from S3
aws s3 cp s3://bizzai-backups/mongodb/backup-20260131.tar.gz /tmp/

# 2. Restore
./scripts/restore-mongodb.sh /tmp/backup-20260131.tar.gz

# 3. Verify data
mongosh
use bizzai
db.items.countDocuments()
```

---

## Troubleshooting

### Common Issues

**Issue**: Application won't start
```bash
# Check logs
render logs

# Verify environment variables
render env ls

# Check build logs
# Review Render dashboard
```

**Issue**: Database connection failed
```bash
# Verify MongoDB URI
echo $MONGO_URI

# Test connection
mongosh $MONGO_URI

# Check IP whitelist in MongoDB Atlas
```

**Issue**: High response times
```bash
# Check database indexes
mongosh
db.items.getIndexes()

# Monitor slow queries
db.system.profile.find().sort({ts:-1}).limit(10)

# Scale up if needed
```

---

## Security Checklist

- [ ] HTTPS enabled (automatic on Render/Vercel)
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] Dependencies updated
- [ ] Secrets not in code
- [ ] API keys rotated
- [ ] Firewall rules configured

---

## Post-Deployment Verification

```bash
# 1. Health check
curl https://api.bizzai.com/health

# 2. Test authentication
curl -X POST https://api.bizzai.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 3. Test API endpoints
curl https://api.bizzai.com/api/items \
  -H "Authorization: Bearer TOKEN"

# 4. Check frontend
open https://bizzai.vercel.app

# 5. Monitor errors
# Check Sentry dashboard

# 6. Monitor performance
# Check Render metrics
```

---

## Maintenance Windows

### Scheduled Maintenance

1. **Announce 24 hours in advance**
   - Email users
   - Update status page
   - Post on social media

2. **During Maintenance**
   - Enable maintenance mode
   - Display maintenance page
   - Perform updates
   - Test thoroughly

3. **After Maintenance**
   - Disable maintenance mode
   - Verify all systems
   - Notify users
   - Monitor for issues

---

## Contact Information

- **DevOps Lead**: [Email]
- **On-Call Engineer**: [Phone]
- **Database Admin**: [Email]

---

**Last Updated**: 2026-01-31  
**Version**: 1.0  
**Owner**: DevOps Team
