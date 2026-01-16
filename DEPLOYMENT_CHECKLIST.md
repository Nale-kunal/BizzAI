# 🎯 Production Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Environment Setup
- [ ] Backend `.env` file created with all required variables
- [ ] Frontend `.env` file created with backend URL
- [ ] Strong secrets generated (64+ characters)
  ```bash
  ./scripts/generate-secrets.sh
  ```
- [ ] `NODE_ENV=production` set in backend
- [ ] MongoDB connection string configured (Atlas or self-hosted)
- [ ] Email credentials configured (Gmail app password)

### Security
- [ ] All hardcoded secrets removed from code
- [ ] JWT secrets are strong random strings (64+ chars)
- [ ] SSL certificate obtained (Let's Encrypt or custom)
- [ ] Domain DNS configured correctly
- [ ] Firewall rules configured (ports 80, 443, 22 only)
- [ ] Rate limiting tested
- [ ] Security headers verified
- [ ] CORS origins whitelisted

### Database
- [ ] MongoDB authentication enabled
- [ ] Database indexes created
  ```bash
  docker-compose exec backend node scripts/create-indexes.js
  ```
- [ ] Backup script tested
  ```bash
  ./scripts/backup-mongodb.sh
  ```
- [ ] Restore procedure tested
  ```bash
  ./scripts/restore-mongodb.sh <backup-file>
  ```
- [ ] Automated backups scheduled (cron)

### Testing
- [ ] All backend tests passing
  ```bash
  cd backend && npm test
  ```
- [ ] All frontend tests passing
  ```bash
  cd frontend && npm test
  ```
- [ ] Manual testing of all features completed
- [ ] Load testing performed (optional)
- [ ] Security scan completed
  ```bash
  npm audit
  ```

### Infrastructure
- [ ] Docker and Docker Compose installed
- [ ] Production docker-compose.yml configured
- [ ] Health checks working
  ```bash
  curl http://localhost:5000/api/health
  ```
- [ ] Logs directory created and writable
- [ ] Sufficient disk space (20GB+ recommended)
- [ ] Sufficient RAM (2GB+ recommended)

## Deployment

### Build & Deploy
- [ ] Run pre-deployment verification
  ```bash
  ./scripts/verify-deployment.sh
  ```
- [ ] Build Docker images
  ```bash
  docker-compose -f docker-compose.prod.yml build
  ```
- [ ] Start services
  ```bash
  docker-compose -f docker-compose.prod.yml up -d
  ```
- [ ] Verify all containers running
  ```bash
  docker-compose ps
  ```

### Post-Deployment Verification
- [ ] Health check endpoint responding
  ```bash
  curl https://api.yourdomain.com/api/health
  ```
- [ ] Readiness check passing
  ```bash
  curl https://api.yourdomain.com/api/health/ready
  ```
- [ ] Frontend accessible
  ```bash
  curl https://yourdomain.com
  ```
- [ ] SSL certificate valid
  ```bash
  curl -I https://yourdomain.com | grep "HTTP/2 200"
  ```
- [ ] Security headers present
  ```bash
  curl -I https://yourdomain.com | grep -i "strict-transport-security"
  ```
- [ ] HTTPS redirect working
  ```bash
  curl -I http://yourdomain.com
  ```

### Functional Testing
- [ ] User registration works
- [ ] User login works
- [ ] Create inventory item works
- [ ] Create customer works
- [ ] Create POS invoice works
- [ ] Process return works
- [ ] Generate report works
- [ ] Email sending works (test forgot password)

### Monitoring Setup
- [ ] Logs being written
  ```bash
  docker-compose logs -f backend
  ```
- [ ] Error tracking configured (Sentry)
- [ ] Health checks monitored
- [ ] Backup automation verified
- [ ] Alerts configured (optional)

## Post-Deployment

### Documentation
- [ ] Deployment documented (date, version, who deployed)
- [ ] Credentials stored securely (password manager)
- [ ] Backup location documented
- [ ] Rollback procedure documented

### Maintenance
- [ ] Automated backups running daily
- [ ] Log rotation configured
- [ ] SSL certificate auto-renewal configured
  ```bash
  sudo certbot renew --dry-run
  ```
- [ ] Monitoring dashboard accessible
- [ ] Team notified of deployment

### Ongoing
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Review logs regularly
- [ ] Test backups monthly
- [ ] Update dependencies monthly
- [ ] Review security advisories

## Rollback Plan

If deployment fails:

1. Stop services
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. Restore database from backup
   ```bash
   ./scripts/restore-mongodb.sh backups/latest.tar.gz.gpg
   ```

3. Revert to previous version
   ```bash
   git checkout <previous-tag>
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Emergency Contacts

- **Technical Lead:** [Name] - [Email] - [Phone]
- **DevOps:** [Name] - [Email] - [Phone]
- **On-Call:** [Name] - [Email] - [Phone]

## Sign-Off

- [ ] Technical Lead approved
- [ ] Security review completed
- [ ] Stakeholders notified
- [ ] Deployment window scheduled

**Deployed By:** _______________  
**Date:** _______________  
**Version:** _______________  
**Sign-off:** _______________

---

**Last Updated:** January 15, 2026
