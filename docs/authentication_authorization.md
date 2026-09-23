# Production Authentication, Authorization & Context Specification (Phase 2 - Step 1)

**Project:** Manpower Agency Management System  
**Module:** Core Foundation — Authentication & Authorization  
**Stack:** NestJS 11, TypeScript, Prisma, PostgreSQL, Next.js 15  
**Version:** 1.0.0-PROD  

---

## 1. Authentication Architecture

### 1.1 Login Flow
1. **Client Submission:** Client posts credentials via `POST /api/v1/auth/login` (`email`, `password`).
2. **Account Sanitization & Existence:** Email is converted to lowercase and trimmed. User lookup runs against active, non-deleted users.
3. **Lockout Check:** If `user.lockedUntil > now()`, login is rejected immediately with code `AUTH_ACCOUNT_LOCKED` and the remaining duration in minutes.
4. **Password Verification:** Passwords are hashed using `bcrypt` (10 rounds). Verification uses `bcrypt.compare`.
5. **Failed Attempt Tracking:**
   - On mismatch: `failedLoginAttempts` increments by 1.
   - Upon reaching 5 consecutive failed attempts: `lockedUntil` is set to `now() + 15 minutes`, and an `ACCOUNT_LOCKED` audit record is stored.
   - On match: `failedLoginAttempts` resets to 0, `lockedUntil` is cleared, and `lastLoginAt` / `lastLoginIp` are recorded.
6. **Session Creation & Token Issuance:**
   - Short-lived Access Token (15 mins) generated via JWT.
   - Cryptographically random 40-byte raw refresh token generated.
   - SHA-256 hash of refresh token stored in `user_sessions` with 7-day expiration.
   - Zero raw tokens or passwords stored in database or audit logs.

```
Client (Browser)                 NestJS AuthController            Database (PostgreSQL)
       │                                   │                                │
       ├───── POST /auth/login ───────────►│                                │
       │      (email, password)            ├───── findUserByEmail ─────────►│
       │                                   │◄──── userRecord ───────────────┤
       │                                   │                                │
       │                                   ├── Verify Lockout (< 15m)       │
       │                                   ├── bcrypt.compare(pwd, hash)    │
       │                                   │                                │
       │                                   ├── [If Valid]:                  │
       │                                   │   Reset failed attempts        │
       │                                   │   Create user_sessions ───────►│
       │                                   │   Log LOGIN_SUCCESS ──────────►│
       │                                   │                                │
       │◄──── 200 OK ──────────────────────┤                                │
       │      { accessToken,               │                                │
       │        refreshToken,              │                                │
       │        userProfile }              │                                │
```

### 1.2 JWT Token Payload & Security
JWT payloads strictly contain minimum required claims to prevent information leakage:
```json
{
  "sub": "b8f0473e-3294-4d1a-8dc4-92769c8b7401",
  "agencyId": "6c4598d1-419b-4b24-8fa2-680456123400",
  "branchId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "roleId": "9f8e7d6c-5b4a-3210-fedc-ba9876543210",
  "iat": 1774156800,
  "exp": 1774157700
}
```
- Signed with `HMAC-SHA256` using `JWT_SECRET`.
- Valid for **15 minutes**.
- Zero PII (no Aadhaar, PAN, phone number, or permissions dump) inside the JWT token.

### 1.3 Refresh Token Rotation & Reuse Detection
- Refresh tokens are single-use.
- When `POST /api/v1/auth/refresh` is called:
  1. Incoming token is hashed via SHA-256 and matched against `user_sessions`.
  2. If session is already marked `isRevoked: true`, **Reuse Detection** is triggered:
     - **Security Action:** All active sessions for this user ID are immediately revoked (`isRevoked = true`).
     - Alert logged to `audit_logs` as `REFRESH_TOKEN_REUSE_DETECTED`.
     - Request rejected with `AUTH_REFRESH_TOKEN_REUSE_DETECTED`.
  3. If valid: Current session marked `isRevoked = true`, new session created with new SHA-256 hash, and new tokens returned.

---

## 2. Authorization & RBAC Architecture

### 2.1 Permission Model
Permissions follow the `<MODULE>_<ACTION>` standard (e.g. `EMPLOYEE_CREATE`, `SALARY_APPROVE`, `INVOICE_CREATE`).

### 2.2 Precedence Order for User-Level Overrides
A role grants baseline capabilities. Individual user overrides take precedence:

```
┌──────────────────────────────────────────────────────────┐
│                   USER-LEVEL OVERRIDE                    │
│   (user_permissions table: is_granted: true / false)     │
└────────────────────────────┬─────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
     [Override Exists?]                       │
            │                                 │
           YES                                NO
            │                                 │
            ▼                                 ▼
┌─────────────────────────┐       ┌────────────────────────┐
│ If is_granted = true    │       │ ROLE PERMISSION        │
│   → GRANTED (Explicit)  │       │ (role_permissions)     │
│ If is_granted = false   │       └───────────┬────────────┘
│   → DENIED (Explicit)   │                   │
└─────────────────────────┘                   ▼
                                  ┌────────────────────────┐
                                  │ Default: DENIED        │
                                  └────────────────────────┘
```

- **Example 1:** Role grants `EMPLOYEE_CREATE`. User has `UserPermission(EMPLOYEE_CREATE, is_granted: false)`.  
  **Result:** `EMPLOYEE_CREATE` is **DENIED**.
- **Example 2:** Role does not have `SALARY_APPROVE`. User has `UserPermission(SALARY_APPROVE, is_granted: true)`.  
  **Result:** `SALARY_APPROVE` is **GRANTED**.

### 2.3 Declarative Route Protection
Controllers enforce permissions via decorators:
```typescript
@RequirePermission('EMPLOYEE', 'READ')
@Get(':id')
async getEmployee(@Param('id') id: string) { ... }
```
- Handled automatically by `PermissionsGuard`.
- Super Admin (`roleSlug === 'super-admin'`) bypasses granular permission checks.

---

## 3. Agency & Branch Context Isolation

### 3.1 Trust-Free Architecture
- Frontend headers or query parameters such as `?agency_id=...` are **strictly ignored** for authorization.
- The `agencyId` is extracted solely from the cryptographically verified JWT payload and checked against active database user records.

### 3.2 Branch-Level Access Strategy
1. **Agency-Wide Users (`branchId === null`):**
   - Typically Super Admin, Agency Owner, or Central Payroll Director.
   - Authorized to view and manage all branches under their agency.
2. **Branch-Scoped Users (`branchId !== null`):**
   - Branch Managers, Field Supervisors, Local Coordinators.
   - Restricted to their assigned branch.
   - Any attempt to access a resource with a conflicting `branchId` triggers `AUTH_FORBIDDEN_BRANCH_ACCESS` (HTTP 403).

### 3.3 Automated IDOR Defense
Service layer methods apply automated scoping via `AuthorizationService.applyTenantFilter`:
```typescript
const filter = this.authzService.applyTenantFilter(currentUser, { id: employeeId });
// Automatically enforces:
// { id: employeeId, agencyId: currentUser.agencyId, branchId: currentUser.branchId }
```

---

## 4. API Specification & Error Codes

### 4.1 Endpoints

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Authenticates user with email & password, returns JWT & refresh token |
| `POST` | `/api/v1/auth/refresh` | Public | Rotates single-use refresh token and issues new access token |
| `POST` | `/api/v1/auth/logout` | Bearer | Invalidates active user session in `user_sessions` |
| `POST` | `/api/v1/auth/change-password` | Bearer | Verifies current password, hashes new password, invalidates all sessions |
| `GET` | `/api/v1/auth/me` | Bearer | Returns current authenticated user profile, agency/branch, and real-time effective permissions |

### 4.2 Standardized Response Format

#### Success Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "7d9a1c...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "user-uuid",
      "email": "admin@apexmanpower.in",
      "fullName": "Super Administrator",
      "role": { "id": "role-uuid", "name": "Super Admin", "slug": "super-admin" },
      "agency": { "id": "agency-uuid", "name": "Apex Manpower Solutions Pvt Ltd" },
      "branch": null,
      "effectivePermissions": ["*"]
    }
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### 4.3 Error Codes Catalog

| Error Code | HTTP Status | Trigger Condition |
| :--- | :--- | :--- |
| `AUTH_INVALID_CREDENTIALS` | 401 | Email not found or incorrect password |
| `AUTH_ACCOUNT_LOCKED` | 401 | 5 consecutive failed login attempts (locked for 15 minutes) |
| `AUTH_ACCOUNT_INACTIVE` | 401 | User status is `SUSPENDED` or `INACTIVE` |
| `AUTH_UNAUTHORIZED` | 401 | Missing, malformed, or expired JWT Bearer token |
| `AUTH_INVALID_REFRESH_TOKEN` | 401 | Refresh token not found in active sessions |
| `AUTH_REFRESH_TOKEN_EXPIRED` | 401 | Refresh token past 7-day validity |
| `AUTH_REFRESH_TOKEN_REUSE_DETECTED` | 401 | Stolen or already rotated token submitted (triggers full session revocation) |
| `AUTH_CURRENT_PASSWORD_INCORRECT` | 400 | Current password failed verification during password change |
| `AUTH_FORBIDDEN` | 403 | Authenticated user lacks access to the requested action |
| `AUTH_FORBIDDEN_PERMISSION_REQUIRED` | 403 | Missing explicit required permission (e.g. `EMPLOYEE_DELETE`) |
| `AUTH_FORBIDDEN_BRANCH_ACCESS` | 403 | Branch-scoped user attempting cross-branch access |
| `AUTH_TENANT_CONTEXT_MISSING` | 403 | Request lacks a verifiable agency tenant context |
| `VALIDATION_FAILED` | 400 | DTO schema validation failed (e.g. invalid email format) |
| `NETWORK_ERROR` | - | Client failed to establish connection with API gateway |
