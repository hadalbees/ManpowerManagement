# Security Hardening & Threat Model Specification
**Manpower Agency Management System**

This specification outlines the technical safeguards, defense-in-depth architecture, and threat mitigation strategies deployed across the system.

---

## 1. Authentication & Token Security

- **Password Hashing**: Bcrypt with minimum 10 salt rounds (`bcrypt.hash(password, 10)`).
- **Access Tokens**: Short-lived JWT (15 minutes expiry) containing `userId`, `agencyId`, and `branchId`.
- **Refresh Tokens**: Long-lived (7 days expiry), stored as SHA-256 hashes in the database (`refreshTokenHash`). Raw refresh tokens are never persisted.
- **Refresh Token Rotation**: Each refresh request invalidates the previous token and issues a new token pair. If a revoked token is presented, all active sessions for that user are immediately invalidated (token reuse detection).
- **Session Revocation**: Logout, password change, or suspicious reuse marks the session revoked and clears browser cookies/storage.

---

## 2. Multi-Tenant & Branch Scoping (Zero IDOR Guarantee)

- **Server-Derived Context**: `@CurrentUser()` decorator extracts `agencyId` and `branchId` directly from the validated JWT payload.
- **Client Input Disregard**: Parameter values like `agencyId` or `branchId` passed in query strings or request bodies are ignored or validated against the server-side session.
- **Branch-Restricted Users**: Users with `user.branchId !== null` are locked to their branch; queries automatically enforce `WHERE branchId = user.branchId`. Cross-branch inspection triggers `403 Forbidden`.
- **Tenant Boundary**: All database repository queries enforce `WHERE agencyId = user.agencyId`. Cross-agency lookups return `404 Not Found` to prevent entity enumeration.

---

## 3. Role-Based Access Control (RBAC) & Overrides

- **Authorization Hierarchy**:
  ```text
  Explicit User Denial
      > Explicit User Allowance
          > Role Permissions
              > Default Deny
  ```
- **Server-Side Enforcement**: Every mutating and sensitive reading endpoint is guarded with `@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)` and annotated with `@RequirePermission('CODE')`.
- **Precedence Testing**: Explicit user denies override role-granted permissions; users cannot elevate privileges through client-side state manipulation.

---

## 4. Sensitive Data Protection & Encryption

- **Field-Level Encryption**: AES-256-GCM encryption with unique 12-byte initialization vectors (IV) and 16-byte authentication tags protects sensitive PII (`aadhaarEncrypted`, `bankAccountNoEncrypted`).
- **Response Masking**: Plaintext account numbers are never emitted. APIs return masked formats:
  - Bank Account: `XXXXXX1234` (last 4 digits visible)
  - Aadhaar: `XXXXXXXX1234` (last 4 digits visible)
  - Phone: `XXXXXX3210` (last 4 digits visible)
- **Log Sanitation**: Structured loggers, exception filters, and audit serializers strip `password`, `token`, `secret`, `bankAccount`, and `aadhaar` fields.

---

## 5. Document Storage Security

- **Private Partitioning**: Documents stored in isolated directory structures:
  `private/{agencyId}/{entityType}/{entityId}/{timestamp}_{randomHex}_{sanitizedFileName}`
- **HMAC-SHA256 Presigned Downloads**: Download links contain signed, time-limited tokens (15-minute expiration) generated using `crypto.createHmac('sha256', SECRET)`.
- **Timing-Attack Protection**: Token comparison uses `crypto.timingSafeEqual` with buffer length validation.
- **Upload Restrictions**: 15MB file ceiling, strict MIME allowlisting (`application/pdf`, `image/jpeg`, `image/png`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, etc.), and strict path traversal sanitization (`[^a-zA-Z0-9._-]` replaced with `_`).

---

## 6. HTTP Security Headers & Abuse Protection

- **Headers Configured**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Production HTTPS)
- **CORS**: Configurable whitelist (`CORS_ORIGINS`). Prohibits wildcard `*` with credentials.
- **Rate Limiting**: In-memory sliding-window token bucket blocks brute-force authentication and export scraping.
- **CSV Injection Defense (CWE-1236)**: Fields starting with spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`) are escaped with a leading single quote (`'`).
