# Migration Playbooks

## Overview

This document provides step-by-step procedures for safely deploying database migrations in production.

## Pre-Migration Checklist

- [ ] **Backup Database**: Run `./scripts/backup-mongodb.sh`
- [ ] **Test in Staging**: Verify migration works in staging environment
- [ ] **Review Migration Code**: Ensure migration is idempotent and reversible
- [ ] **Check Dependencies**: Verify all required packages are installed
- [ ] **Notify Team**: Inform team of planned maintenance window
- [ ] **Enable Maintenance Mode**: Put application in read-only mode if needed

---

## Migration 003: Create Default Financial Period

### Purpose
Creates default financial periods for all organizations and assigns existing journal entries to appropriate periods.

### Impact
- **Downtime**: None (can run while system is live)
- **Duration**: ~1-2 minutes for 1000 organizations
- **Reversible**: Yes

### Pre-Migration Steps

```bash
# 1. Backup database
./scripts/backup-mongodb.sh

# 2. Check current state
mongosh
use bizzai
db.organizations.countDocuments()
db.journalEntries.countDocuments({ financialPeriod: { $exists: false } })
```

### Running the Migration

```bash
# Development
npm run migrate:up

# Production (with logging)
NODE_ENV=production npm run migrate:up 2>&1 | tee migration-003.log
```

### Verification Steps

```bash
mongosh
use bizzai

# 1. Verify all organizations have periods
db.financialPeriods.countDocuments()
# Should equal number of organizations

# 2. Verify all journal entries have periods
db.journalEntries.countDocuments({ financialPeriod: { $exists: false } })
# Should be 0

# 3. Check period status
db.financialPeriods.find({ status: "open" }).count()
# Should match number of organizations
```

### Rollback Procedure

```bash
# If issues occur, rollback immediately
npm run migrate:down

# Verify rollback
mongosh
use bizzai
db.financialPeriods.countDocuments()
# Should be 0
```

### Troubleshooting

**Issue**: Migration fails with "Duplicate key error"
```bash
# Solution: Remove duplicate periods
mongosh
use bizzai
db.financialPeriods.aggregate([
  { $group: { _id: "$organization", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
# Manually resolve duplicates
```

**Issue**: Some journal entries not assigned
```bash
# Solution: Run assignment query manually
db.journalEntries.updateMany(
  { financialPeriod: { $exists: false } },
  { $set: { financialPeriod: <period_id> } }
)
```

---

## Migration 004: Add Organization to All Models

### Purpose
Adds `organizationId` field to all 13 core models and backfills existing data.

### Impact
- **Downtime**: Recommended (5-10 minutes)
- **Duration**: ~5-10 minutes for 10,000 documents
- **Reversible**: Yes

### Pre-Migration Steps

```bash
# 1. Backup database
./scripts/backup-mongodb.sh

# 2. Enable maintenance mode
# Update environment variable or feature flag
export MAINTENANCE_MODE=true

# 3. Check current state
mongosh
use bizzai
db.items.countDocuments({ organizationId: { $exists: false } })
db.invoices.countDocuments({ organizationId: { $exists: false } })
db.purchases.countDocuments({ organizationId: { $exists: false } })
```

### Running the Migration

```bash
# Development
npm run migrate:up

# Production (with progress tracking)
NODE_ENV=production npm run migrate:up 2>&1 | tee migration-004.log

# Monitor progress in separate terminal
watch -n 5 'mongosh --eval "db.items.countDocuments({ organizationId: { $exists: true } })"'
```

### Verification Steps

```bash
mongosh
use bizzai

# 1. Verify all items have organizationId
db.items.countDocuments({ organizationId: { $exists: false } })
# Should be 0

# 2. Verify all invoices have organizationId
db.invoices.countDocuments({ organizationId: { $exists: false } })
# Should be 0

# 3. Verify indexes created
db.items.getIndexes()
# Should include organizationId index

# 4. Sample data check
db.items.findOne()
# Should have organizationId field

# 5. Verify no data loss
db.items.countDocuments()
# Should match pre-migration count
```

### Rollback Procedure

```bash
# 1. Run rollback migration
npm run migrate:down

# 2. Verify rollback
mongosh
use bizzai
db.items.countDocuments({ organizationId: { $exists: true } })
# Should be 0

# 3. Disable maintenance mode
export MAINTENANCE_MODE=false
```

### Performance Optimization

For large datasets (>100,000 documents):

```javascript
// Run in batches
const batchSize = 1000;
let processed = 0;

while (true) {
  const result = await db.items.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: defaultOrgId } },
    { limit: batchSize }
  );
  
  processed += result.modifiedCount;
  console.log(`Processed: ${processed}`);
  
  if (result.modifiedCount === 0) break;
  
  // Brief pause to avoid overwhelming database
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### Troubleshooting

**Issue**: Migration timeout
```bash
# Solution: Increase timeout and run in batches
export MIGRATION_TIMEOUT=600000  # 10 minutes
npm run migrate:up
```

**Issue**: Some documents not updated
```bash
# Solution: Find and update manually
mongosh
use bizzai
db.items.find({ organizationId: { $exists: false } }).limit(10)
# Investigate why these weren't updated
```

---

## General Migration Best Practices

### 1. Always Backup First
```bash
# Automated backup with timestamp
./scripts/backup-mongodb.sh
# Backup stored in /backups/mongodb/backup-YYYYMMDD-HHMMSS.tar.gz
```

### 2. Test in Staging
```bash
# Deploy to staging
git checkout staging
npm run migrate:up

# Verify application works
npm run test:integration

# If successful, proceed to production
```

### 3. Monitor During Migration
```bash
# Terminal 1: Run migration
npm run migrate:up

# Terminal 2: Monitor database
watch -n 2 'mongosh --eval "db.currentOp()"'

# Terminal 3: Monitor application logs
tail -f logs/app.log
```

### 4. Have Rollback Plan Ready
```bash
# Keep rollback command ready
npm run migrate:down

# Test rollback in staging first
```

### 5. Communicate with Team
- Announce maintenance window 24 hours in advance
- Update status page during migration
- Have team on standby for issues

---

## Post-Migration Checklist

- [ ] **Verify Data Integrity**: Run verification queries
- [ ] **Test Application**: Smoke test critical features
- [ ] **Monitor Errors**: Check error logs for issues
- [ ] **Update Documentation**: Document any changes
- [ ] **Disable Maintenance Mode**: Return to normal operation
- [ ] **Notify Team**: Confirm successful completion
- [ ] **Archive Logs**: Save migration logs for audit

---

## Emergency Rollback

If critical issues occur during migration:

```bash
# 1. IMMEDIATE: Stop migration
# Press Ctrl+C if still running

# 2. Enable maintenance mode
export MAINTENANCE_MODE=true

# 3. Rollback migration
npm run migrate:down

# 4. Restore from backup if needed
./scripts/restore-mongodb.sh /backups/mongodb/latest.tar.gz

# 5. Verify system state
npm run test:integration

# 6. Investigate issue
# Review logs, identify root cause

# 7. Fix and retry
# Fix migration code, test in staging, retry
```

---

## Migration Monitoring

### Key Metrics to Watch

1. **Database Performance**
   - Query response time
   - Connection pool usage
   - Lock wait time

2. **Application Health**
   - Error rate
   - Response time
   - Request throughput

3. **Data Integrity**
   - Document counts
   - Index status
   - Validation errors

### Monitoring Commands

```bash
# Database stats
mongosh --eval "db.stats()"

# Current operations
mongosh --eval "db.currentOp()"

# Slow queries
mongosh --eval "db.system.profile.find().sort({ts:-1}).limit(10)"

# Application health
curl http://localhost:5000/health
```

---

## Contact Information

- **On-Call Engineer**: [Phone]
- **Database Admin**: [Phone]
- **DevOps Lead**: [Email]

---

**Last Updated**: 2026-01-31  
**Version**: 1.0  
**Owner**: DevOps Team
