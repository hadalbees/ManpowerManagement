# Operations & Maintenance Runbook
**Manpower Agency Management System**

This runbook provides standardized procedures for system administrators, DevOps, and on-call engineers managing the production platform.

---

## 1. Application Process Management

### 1.1 Process Status & Inspection
```bash
# Check NestJS API process status
pm2 status api-backend
# Or systemd:
sudo systemctl status manpower-backend.service

# Check Next.js Frontend status
pm2 status frontend-app
# Or systemd:
sudo systemctl status manpower-frontend.service
```

### 1.2 Graceful Application Restart
```bash
# Backend restart (zero downtime if clustered)
pm2 reload api-backend
# Frontend restart
pm2 reload frontend-app
```

---

## 2. Database Maintenance & Migrations

### 2.1 Applying Production Schema Migrations
> [!CAUTION]
> NEVER run `prisma migrate dev` or `prisma migrate reset` in production!
> Always verify database backup completion before executing migrations.

```bash
# 1. Verify environment and database target
cd /var/www/manpower-agency/backend
npx prisma validate

# 2. Apply pending migrations safely
npx prisma migrate deploy

# 3. Check migration status
npx prisma migrate status
```

### 2.2 Handling Database Connection Exhaustion
If `/health/ready` reports `DOWN` due to pool timeout:
1. Inspect active connections:
   ```sql
   SELECT count(*), state FROM pg_stat_activity WHERE datname = 'manpower_agency_db' GROUP BY state;
   ```
2. Terminate idle connection spikes:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE datname = 'manpower_agency_db' AND state = 'idle' AND state_change < current_timestamp - INTERVAL '15 minutes';
   ```
3. Verify `DATABASE_URL` pool parameter (`&connection_limit=25`).

---

## 3. Storage Vault & Document Maintenance

### 3.1 Resolving Disk Space Warnings
Document uploads are partitioned under `./storage/vault/private/{agencyId}/...`.
If disk usage exceeds 80%:
1. Check storage usage per agency:
   ```bash
   du -sh ./storage/vault/private/* | sort -hr
   ```
2. Archive older soft-deleted documents (`deletedAt IS NOT NULL > 90 days`) to secondary cold storage.
3. Clean temporary download caches:
   ```bash
   find /tmp -name "report_*" -mtime +1 -delete
   ```

---

## 4. Scheduled Jobs & Expiry Monitor Diagnostics

### 4.1 Troubleshooting Expiry Alert Processing
If alerts fail to trigger or run automatically:
1. Check backend execution logs:
   ```bash
   grep -i "compliance" /var/log/manpower/backend.log
   ```
2. Manually trigger the idempotent compliance scan via admin API:
   ```bash
   curl -X POST "https://api.apexmanpower.com/api/v1/compliance/process-alerts" \
     -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>"
   ```
3. Verify in database:
   ```sql
   SELECT count(*), status FROM expiry_alerts WHERE created_at >= CURRENT_DATE GROUP BY status;
   ```

---

## 5. Rollback Procedures

### 5.1 Application Code Rollback
If a newly deployed release exhibits critical defects:
1. Revert to the previous stable release artifact or git commit:
   ```bash
   git checkout tags/v1.4.0-stable
   npm run build
   pm2 restart all
   ```
2. Validate system health via `curl https://api.apexmanpower.com/api/v1/health/ready`.

### 5.2 Emergency Database Rollback
See `docs/BACKUP_RESTORE.md` for point-in-time snapshot restoration.
