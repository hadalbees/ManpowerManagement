# Production Deployment & Go-Live Checklist
**Manpower Agency Management System**

This checklist must be reviewed and signed off by the lead engineer and operations team prior to production cutover.

---

## 1. Infrastructure & Operating System
- [ ] Dedicated host or container cluster provisioned (minimum: 2 vCPU, 4GB RAM, Linux/Ubuntu LTS or containerized Linux).
- [ ] Reverse proxy (Nginx / Caddy / AWS ALB) configured with automated TLS/SSL certificate renewal.
- [ ] HTTP-to-HTTPS permanent redirection (301) enabled.
- [ ] Firewall (UFW / Security Groups) configured to allow only ports `80`, `443`, and SSH (port `22`) from authorized bastion IPs.
- [ ] Database port (`5432`) isolated within private VPC subnet; zero public internet exposure.

---

## 2. Database Foundation (PostgreSQL 16+)
- [ ] Managed PostgreSQL 16+ instance provisioned with SSD storage (gp3 / NVMe).
- [ ] Automated daily snapshots enabled with point-in-time recovery (PITR) for 14 days.
- [ ] Max connection pool configured appropriately for backend instance capacity (`connection_limit=25`).
- [ ] UTF-8 encoding and timezone set to `UTC` (application handles `Asia/Kolkata` date boundaries).
- [ ] Baseline schema applied via `npx prisma migrate deploy` (NEVER run `prisma migrate reset`).
- [ ] Mandatory indexes verified for high-volume lookup tables (`attendances`, `deployments`, `invoices`, `documents`).

---

## 3. Environment & Secrets Management
- [ ] Production `.env` file generated from `.env.example` with cryptographically secure random values.
- [ ] `JWT_SECRET` generated via `openssl rand -hex 32` (256-bit entropy).
- [ ] `JWT_REFRESH_SECRET` generated independently from `JWT_SECRET`.
- [ ] `DATABASE_ENCRYPTION_KEY_256` generated as a distinct 32-byte hex key for AES-256-GCM field encryption.
- [ ] `NODE_ENV` explicitly set to `production`.
- [ ] `CORS_ORIGINS` strictly limited to authoritative frontend domain names (wildcard `*` prohibited).
- [ ] Zero development default secrets present in the production environment.

---

## 4. Security & Hardening Verification
- [ ] Security headers active: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, CSP.
- [ ] Sliding-window rate limiting active on `/auth/login`, `/auth/refresh`, and heavy export endpoints.
- [ ] Global exception filter active: zero stack traces, database strings, or internal paths leaked in API errors.
- [ ] PII data masking verified on all API responses (Aadhaar, PAN, Bank Accounts, Phone Numbers).
- [ ] File uploads restricted to 15MB with strict MIME allowlisting and path traversal sanitization.
- [ ] Document download URLs protected via HMAC-SHA256 tokens with 15-minute expiration.

---

## 5. Backup & Recovery Validation
- [ ] Automated daily database backup verified using `pg_dump` with gzip compression and GPG encryption.
- [ ] Document storage vault backup configured to replicate private partition blobs to secondary offsite storage.
- [ ] Restore drill successfully executed on isolated staging database (`BACKUP_RESTORE.md` procedure).
- [ ] Documented Recovery Time Objective (RTO < 60 min) and Recovery Point Objective (RPO < 24 hrs).

---

## 6. Observability & Health Probing
- [ ] Liveness probe pointed to `GET /api/v1/health` (expects HTTP 200 `UP`).
- [ ] Readiness probe pointed to `GET /api/v1/health/ready` (validates active database connection pool).
- [ ] Process monitoring configured (PM2 / systemd / Kubernetes restart policies).
- [ ] Host metric alarms configured: CPU > 80%, RAM > 85%, Disk > 80%.

---

## 7. Operational Scheduled Jobs
- [ ] Cron schedule for credential expiration scan verified (`0 2 * * *` Asia/Kolkata).
- [ ] Alert deduplication verified: repeated scans generate zero redundant alerts or notifications.
- [ ] Failed cron job execution logging and notification alerts enabled.

---

## 8. User Acceptance Testing (UAT) Sign-Off
- [ ] Super Admin workflow verified (Agency configuration, Branch creation, Role assignment).
- [ ] Branch Manager workflow verified (Client registration, Site setup, Employee onboarding).
- [ ] Operations workflow verified (Deployment assignment, Daily attendance roll, Emergency replacement).
- [ ] Finance workflow verified (Payroll calculation, Review, Approval, Locking, Invoicing, Payment receipt).
- [ ] HR & Compliance workflow verified (Document upload, Verification, Candidate offer, Employee conversion).
- [ ] Final sign-off obtained from business stakeholders.
