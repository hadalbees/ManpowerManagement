# Leave Management Engine — Technical Architecture & Operational Guide

## 1. Overview & Business Workflow
The **Leave Management Engine** is a core operational subsystem of the Manpower Agency Management System. It governs the end-to-end lifecycle of workforce absences across client deployments, ensuring strict adherence to multi-tenant isolation, organizational branch boundaries, atomic balance tracking, and automated attendance register integration.

The authoritative business workflow proceeds as follows:
```
Employee / Manager
       ↓
Leave Application (Submitted in PENDING state)
       ↓
Authorized Manager / Approver (LEAVE_APPROVE permission)
       ↓
Single Database Transaction ($transaction)
       ├── Revalidate Request Status (must be PENDING)
       ├── Revalidate Date Boundaries (endDate >= startDate)
       ├── Overlap Prevention Check (no conflicting APPROVED/PENDING requests)
       ├── Atomic Leave Balance Verification & Decrement
       ├── Historical Deployment Resolution (resolves deployment active on shift date)
       ├── Payroll Lock Guard (rejects if shift attendance is locked)
       ├── Attendance Register Integration (marks PAID_LEAVE or UNPAID_LEAVE)
       └── System Audit Log Recording (APPROVE action snapshot)
       ↓
Leave Request Status: APPROVED
```

---

## 2. Leave Types & Policy Configuration
Leave types are configured per agency and define the entitlement, compensation, and accumulation rules:
- **Casual Leave (CL)**: Paid leave (default 12 days/year), non-accumulative.
- **Sick Leave (SL)**: Paid leave (default 10 days/year), accumulative across years.
- **Earned Leave (EL)**: Paid leave accrued against worked shifts.
- **Loss of Pay (LOP)**: Unpaid absence. **Crucial Rule**: LOP requests do not consume paid leave balance and generate `AttendanceStatus.UNPAID_LEAVE` records, preserving absent records for subsequent payroll processing without computing salary deductions in this phase.
- **Other**: Controlled special leaves configured per agency policy.

Each leave type model (`leave_types`) enforces:
- `code`: Uppercase unique alphanumeric string per agency (e.g., `CL`, `SL`, `LOP`).
- `daysPerYear`: Annual quota for full-time deployed staff.
- `isPaid`: Boolean determining whether balance is consumed and whether attendance status is `PAID_LEAVE` or `UNPAID_LEAVE`.
- `isActive`: Inactive types are strictly blocked from new applications.

---

## 3. Configurable Leave Year Concept
The system avoids hardcoding calendar years (`Jan 1 – Dec 31`). Instead, it supports configurable leave cycles:
- **Default Indian Financial Year**: `01-Apr-YYYY` to `31-Mar-YYYY+1` (e.g., Leave Year `2026` represents `01-Apr-2026` to `31-Mar-2027`, displayed to users as `2026-27`).
- **Configuration Key**: `AgencyConfiguration` key `LEAVE_YEAR_CONFIG` / `process.env.LEAVE_YEAR_START_MONTH` specifies the integer start month (e.g., `4` for April, `1` for January).
- **Date Derivation**: The utility function `getLeaveYearForDate(dateInput, startMonth)` dynamically calculates the appropriate integer leave year for any shift business date in the agency's operational timezone (`Asia/Kolkata` / IST UTC+05:30).

---

## 4. Balance Calculation & Concurrency Strategy

### Balance Model Architecture
Balances are maintained in `leave_balances` uniquely indexed by `(employeeId, leaveTypeId, year)`:
- **Allocated Quota**: `openingBalance + accruedDays`
- **Used**: `consumedDays`
- **Available (Closing)**: `closingBalance` (must satisfy `closingBalance = openingBalance + accruedDays - consumedDays`)

### Concurrency & Race Condition Protection
When multiple managers or automated schedulers attempt concurrent approvals for the same employee, standard read-modify-write patterns result in race conditions.

To eliminate race conditions:
1. All approval checks execute inside a PostgreSQL interactive transaction (`prisma.$transaction`).
2. The balance record is fetched and checked:
   ```typescript
   if (availableBalance < totalDays) {
     throw new ConflictException('LEAVE_BALANCE_INSUFFICIENT_OR_CONCURRENT_UPDATE');
   }
   ```
3. Balance mutations use atomic increment/decrement operators:
   ```typescript
   await tx.leaveBalance.update({
     where: { id: balance.id },
     data: {
       consumedDays: { increment: totalDays },
       closingBalance: { decrement: totalDays },
     },
   });
   ```
4. Balance adjustments (`POST /leave/balances/:id/adjust`) strictly enforce `closingBalance + adjustment >= 0`, rejecting any transaction that would drive closing balance negative.

---

## 5. Attendance Integration & Historical Deployment Resolution

### The Historical Deployment Invariant
Manpower agency staff frequently rotate across client sites over time:
- Example: Employee deployed to **Client A (Warehouse)** from `01-Apr` to `15-Apr`, and transferred to **Client B (Port Terminal)** from `16-Apr` onwards.
- A leave approved for `10-Apr` must be attributed to **Client A**, never to the employee's current deployment!

### Attendance Resolution Algorithm
For each calendar date within the leave range `[startDate, endDate]`:
1. The engine queries `EmployeeDeployment` active on that exact date:
   ```sql
   WHERE employee_id = :employeeId
     AND start_date <= :shiftDate
     AND (end_date IS NULL OR end_date >= :shiftDate)
     AND deleted_at IS NULL
   ```
2. The engine checks if an `Attendance` record already exists for `(employeeId, shiftBusinessDate)`.
3. **Payroll Lock Guard**: If existing attendance has `isLocked === true`, the transaction aborts with an immediate `ATTENDANCE_LOCKED` exception.
4. If attendance exists and is unlocked, it updates status to `PAID_LEAVE` or `UNPAID_LEAVE` and zeroes `workedHours` and `overtimeHours`.
5. If no attendance record exists, it inserts a new record linked to the historical `deploymentId`, `clientId`, and `clientSiteId`.

---

## 6. Cancellation Workflow
- **Pending Leave (`PENDING -> CANCELLED`)**: Transitions status immediately without altering balance pools.
- **Approved Future Leave (`APPROVED -> CANCELLED`)**:
  - Restores consumed balance atomically (`consumedDays: { decrement: totalDays }`, `closingBalance: { increment: totalDays }`).
  - Reverts future unlocked attendance records from `PAID_LEAVE` / `UNPAID_LEAVE` to `ABSENT`.
- **Past Finalized Leave**: Cannot be silently overwritten. Rejection or cancellation of historical finalized leave requires an authorized supervisor override.

---

## 7. Role-Based Access Control (RBAC) & Multi-Tenant Security
All leave endpoints enforce strict authentication via `JwtAuthGuard`, branch/agency scoping via `AgencyBranchContextGuard`, and permissions via `PermissionsGuard`:
- `LEAVE_CREATE`: Submit leave applications.
- `LEAVE_READ`: Inspect leave requests, calendar entries, and balances.
- `LEAVE_UPDATE`: Edit pending leave request details.
- `LEAVE_DELETE`: Remove draft applications.
- `LEAVE_APPROVE`: Formally approve leave applications and trigger attendance mutation.
- `LEAVE_REJECT`: Formally reject leave applications with a mandatory reason.
- `LEAVE_CANCEL`: Revoke pending or approved future applications.
- `LEAVE_BALANCE_READ`: View employee leave quota ledgers.
- `LEAVE_BALANCE_UPDATE`: Allocate or adjust employee leave balances.

Cross-agency access is blocked with `404 Not Found` to prevent entity enumeration (IDOR protection). Cross-branch access is blocked with `403 Forbidden` unless the user possesses Headquarters access.

---

## 8. Audit Logging Implementation
Every sensitive state change writes an immutable entry to `audit_logs` via `AuditService`:
- `LEAVE_CREATED`: Records applicant, employee, dates, and server-calculated days.
- `LEAVE_UPDATED`: Records changes to dates or reasons.
- `LEAVE_APPROVED`: Records approver, balance consumption, and attendance impact.
- `LEAVE_REJECTED`: Records rejecter and mandatory rejection reason.
- `LEAVE_CANCELLED`: Records cancellation initiator and balance restoration.
- `LEAVE_BALANCE_CREATED`: Records initial balance allocation.
- `LEAVE_BALANCE_ADJUSTED`: Records manual adjustments with justification.

---

## 9. API Specifications
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/leave/types` | List leave types (optional `activeOnly=true`) |
| `POST` | `/api/v1/leave/types` | Create new leave type |
| `PATCH` | `/api/v1/leave/types/:id` | Update leave type properties |
| `GET` | `/api/v1/leave/balances` | Query leave balances by employee, year, or branch |
| `POST` | `/api/v1/leave/balances` | Allocate initial leave balance |
| `POST` | `/api/v1/leave/balances/:id/adjust`| Manually adjust leave balance (+/- days with reason) |
| `GET` | `/api/v1/leave/requests` | List leave requests with multi-field filters |
| `POST` | `/api/v1/leave/requests` | Submit new leave application |
| `GET` | `/api/v1/leave/requests/:id` | Get single leave request details & review history |
| `PATCH`| `/api/v1/leave/requests/:id` | Update pending leave request |
| `POST` | `/api/v1/leave/requests/:id/approve` | Approve leave request & update attendance |
| `POST` | `/api/v1/leave/requests/:id/reject` | Reject leave request with required reason |
| `POST` | `/api/v1/leave/requests/:id/cancel` | Cancel pending or approved future leave |
| `POST` | `/api/v1/leave-requests*` | Root-level alias endpoints matching specification |

---

## 10. Test Suite & Verification Metrics
- **Targeted Leave Test Suite**: `backend/test-leave-suite.ts` (40 tests passing).
- **Cumulative Regression Results**:
  - `test-auth-suite.ts`: 17/17 passing
  - `test-clients-suite.ts`: 23/23 passing
  - `test-employees-suite.ts`: 26/26 passing
  - `test-vehicles-suite.ts`: 26/26 passing
  - `test-deployments-suite.ts`: 31/31 passing
  - `test-attendance-suite.ts`: 32/32 passing
  - `test-leave-suite.ts`: 40/40 passing
  - **Grand Total**: **195 / 195 tests passing (100% SUCCESS)**.

---

## 11. Known V1 Limitations & Future Enhancements
- **Holiday Calendar Exclusion**: V1 computes day count directly from calendar days (`getDateRangeArray`). Public holiday calendar and weekly-off exclusion rules will be integrated in Phase 4 when statutory calendars are introduced.
- **Accrual Engine**: V1 implements manual allocation and audited adjustments. An automated monthly accrual cron (e.g., 1.5 days accrued per 30 days worked) is designed as a Phase 4 enhancement.
- **Carry Forward Processing**: Year-end carry forward from SL balances will be processed via an annual batch utility during financial year closure.
