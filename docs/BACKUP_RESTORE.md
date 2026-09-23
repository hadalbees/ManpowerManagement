# Database & Document Backup / Restore Runbook
**Manpower Agency Management System**

This runbook specifies the authoritative procedures for automated backups, integrity verification, and non-destructive restore drills.

---

## 1. Backup Architecture & Policies

| Attribute | Database Specification | Document Vault Specification |
| :--- | :--- | :--- |
| **Engine** | PostgreSQL 16+ (pg_dump / WAL) | Private filesystem / Object Storage |
| **Frequency** | Full daily at 01:00 UTC | Incremental daily snapshot |
| **Retention** | 30 days daily, 12 months monthly | 7 years statutory compliance retention |
| **Compression** | gzip level 9 | Native file format |
| **Encryption** | AES-256 (GPG symmetric encryption) | Encrypted storage volume (LUKS / dm-crypt) |
| **Target** | Off-site encrypted S3/cold storage | Multi-region backup bucket |

---

## 2. Automated Daily Database Backup Script

Save as `/opt/scripts/backup-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="manpower_agency_db"
DB_USER="postgres"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
GPG_RECIPIENT="ops-backup@apexmanpower.com"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting PostgreSQL full backup for ${DB_NAME}..."

# Execute dump with custom directory format & compression
PGPASSWORD="${DB_PASSWORD}" pg_dump -h localhost -U "${DB_USER}" -d "${DB_NAME}" \
  --format=custom \
  --blobs \
  --no-owner \
  --no-privileges \
  | gzip -9 > "${BACKUP_FILE}"

echo "[$(date)] Backup completed: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Encrypt backup file
gpg --encrypt --recipient "${GPG_RECIPIENT}" "${BACKUP_FILE}"
rm -f "${BACKUP_FILE}"

# Replicate to offsite secondary vault
aws s3 cp "${BACKUP_FILE}.gpg" "s3://apex-manpower-db-backups/${DB_NAME}/" --sse aws:kms

echo "[$(date)] Backup encrypted and uploaded offsite."
```

---

## 3. Database Restore Drill Procedure (Non-Production Validation)

> [!IMPORTANT]
> Never restore directly into the live production database. Always perform restores into an isolated staging or recovery instance to verify integrity before cutover.

### Step 1: Provision Isolated Restore Target
```bash
# Create temporary isolated recovery database
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -c "CREATE DATABASE manpower_recovery_drill;"
```

### Step 2: Decrypt and Restore Dump
```bash
# 1. Decrypt archive
gpg --decrypt "${BACKUP_FILE}.gpg" > /tmp/restore_drill.sql.gz

# 2. Decompress and restore into isolated recovery DB
gunzip -c /tmp/restore_drill.sql.gz | \
  PGPASSWORD="${DB_PASSWORD}" pg_restore -h localhost -U postgres \
  --dbname=manpower_recovery_drill \
  --no-owner \
  --exit-on-error

# 3. Securely remove unencrypted temporary dump
rm -f /tmp/restore_drill.sql.gz
```

### Step 3: Run Database Integrity Verification Queries
Connect to `manpower_recovery_drill` and verify:
```sql
-- 1. Verify table counts match production baseline
SELECT count(*) AS total_agencies FROM agencies;
SELECT count(*) AS total_employees FROM employees;
SELECT count(*) AS total_attendances FROM attendances;
SELECT count(*) AS total_invoices FROM client_invoices;
SELECT count(*) AS total_payroll_batches FROM payroll_batches;

-- 2. Verify financial records consistency
SELECT id, batch_number, batch_status, total_gross_wages, total_net_wages 
FROM payroll_batches 
WHERE batch_status = 'LOCKED' LIMIT 5;

-- 3. Verify sensitive encrypted data format (AES-256-GCM)
SELECT id, employee_code, bank_account_no_masked, 
       substring(bank_account_no_encrypted from 1 for 10) AS ciphertext_prefix 
FROM employees LIMIT 5;
```

### Step 4: Cleanup Drill Database
```bash
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -c "DROP DATABASE manpower_recovery_drill;"
```

---

## 4. Disaster Recovery Targets

| Metric | Target | Description |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | `< 24 Hours` | Maximum data loss window in the event of total server loss (daily full backup). |
| **Recovery Time Objective (RTO)** | `< 60 Minutes` | Maximum time to provision replacement host, restore database, and restart services. |
