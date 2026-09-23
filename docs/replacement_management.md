# Replacement Management Engine — Technical Architecture & Operational Guide

## 1. Executive Summary & Core Architectural Invariant
The **Replacement Management Engine** is the mission-critical operational subsystem of the Manpower Agency Management System governing temporary, emergency, and planned workforce substitutions across deployed client sites.

### The Sacred Non-Destructive Invariant
In traditional, flawed HR/roster systems, dispatching a replacement employee often replaces the assigned worker on the client contract or alters historical records. In our enterprise architecture, this is **strictly prohibited**:

> [!IMPORTANT]
> **OPERATIONAL INVARIANT**:
> 1. A replacement is an **operational shift overlay** that NEVER mutates `EmployeeDeployment.employeeId`.
> 2. The absent employee's historical assignment, approved leave records, and past attendance remain **100% historically intact**.
> 3. Shift attendance for replacement shifts is recorded with `employeeId = replacementEmployeeId`, but explicitly links to `deploymentId = originalDeploymentId`, `clientId = originalDeployment.clientId`, and `clientSiteId = originalDeployment.clientSiteId`. This retains complete billing context without polluting workforce rosters or causing duplicate attendance collisions.

```
+---------------------------------------------------------------------------------------------------+
| CLIENT DEPLOYMENT: Apex Logistics - Site A1 (Original Employee: Ramesh Kumar [EMP-001])           |
| Status: ACTIVE | Shift: General Morning 08:00 - 16:00                                            |
+---------------------------------------------------------------------------------------------------+
                                                  |
                     Ramesh applies for Emergency Medical Leave (Approved)
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| REPLACEMENT DISPATCH OVERLAY: Replacement ID #rep-8f921                                          |
| Absent Employee:      Ramesh Kumar (EMP-001)                                                      |
| Replacement Worker:   Suresh Selvam (EMP-002) [Active, Verified Badge, Valid License]             |
| Operational Window:   2026-05-01 to 2026-05-05                                                    |
| Status:               DISPATCHED                                                                 |
+---------------------------------------------------------------------------------------------------+
                                                  |
                     Daily Shift Attendance Recorded for May 01
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| ATTENDANCE REGISTER ENTRY:                                                                        |
| employeeId:   Suresh Selvam (EMP-002)  <-- Worker who actually performed on-site duty            |
| deploymentId: dep-guard-active         <-- Links to Apex Logistics Site A1                        |
| clientId:     client-apex-a            <-- Preserves client billing lineage                       |
| clientSiteId: site-a1                  <-- Preserves site context                                 |
| Ramesh's Record: PAID_LEAVE            <-- Untouched and preserved historically                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Replacement Lifecycle & State Machine
The lifecycle transitions between three authoritative states (`ReplacementStatus`):

```
                     +----------------------------+
                     |         DISPATCHED         |
                     | (Active on-site coverage)  |
                     +----------------------------+
                               /        \
                   Supervisor /          \ Operational scope
                    approves /            \ cancelled / rejected
                            /              \
                           v                v
                 +---------------+    +---------------+
                 |   COMPLETED   |    |   CANCELLED   |
                 | (Closed shift)|    | (With reason) |
                 +---------------+    +---------------+
```

1. **DISPATCHED**: The default initial state upon creation. The replacement worker is assigned to cover shifts for the requested window. Re-approval or revalidation can be executed by branch operations coordinators.
2. **COMPLETED**: Formally closed once the date window expires and shifts have been served. Idempotent and immutable. Completed records cannot be cancelled or rejected.
3. **CANCELLED**: Terminated prematurely or rejected by an approver (e.g. original employee returns to duty early, or client cancels shift). Requires a mandatory cancellation or rejection reason for audit compliance.

---

## 3. Multi-Tier Eligibility Engine
Before any replacement can be dispatched, the engine executes a comprehensive 8-step validation pipeline:

### 1. Distinct Identity Check
An employee cannot be dispatched to replace themselves (`absentEmployeeId !== replacementEmployeeId`).

### 2. Active Employment Status Guard
The replacement worker must have `status === 'ACTIVE'`. Any worker in `INACTIVE`, `SUSPENDED`, `RESIGNED`, or `TERMINATED` status is immediately rejected (`REPLACEMENT_EMPLOYEE_NOT_ACTIVE`).

### 3. Multi-Tenant & Branch Boundary Isolation (IDOR Defense)
- Both original and replacement employees must belong to the caller's `agencyId`.
- Branch managers cannot dispatch workers outside their assigned `branchId` (HQ coordinators can dispatch across branches within the same agency).

### 4. Date Boundary Enforcement
- Dates must be chronologically valid (`startDate <= endDate`).
- Replacement dates cannot precede the original deployment start date (`REPLACEMENT_DATES_OUTSIDE_DEPLOYMENT`).
- Replacement dates cannot exceed the original deployment end date (if defined).

### 5. Permanent Deployment Conflict Check
The replacement worker cannot hold an active permanent deployment (`DeploymentStatus.ACTIVE`) that overlaps the replacement date window (`REPLACEMENT_DEPLOYMENT_CONFLICT`). Unassigned or off-rotation workers are prioritized.

### 6. Replacement Overlap Prevention
The replacement worker cannot be simultaneously dispatched on another active replacement assignment (`ReplacementStatus.DISPATCHED`) overlapping the date window (`REPLACEMENT_OVERLAP_CONFLICT`).

### 7. Approved Leave Conflict Check
The replacement worker cannot have an `APPROVED` leave request (`LeaveStatus.APPROVED`) on any date within the replacement window (`REPLACEMENT_LEAVE_CONFLICT`). Pending or rejected leaves do not block dispatch.

### 8. Driver Qualification & Commercial License Verification
If the deployment has a designation category of `DRIVER` or has a vehicle assigned:
- The replacement worker must possess a non-empty `drivingLicenseNumber` on file (`DRIVER_LICENCE_REQUIRED`).
- If `drivingLicenseExpiryDate` is present, it must be greater than or equal to the replacement `endDate` (`EXPIRED_DRIVING_LICENCE`).

---

## 4. Attendance Register Integration
Daily muster roll attendance for replacement shifts is executed seamlessly via `/replacements/:id/record-attendance`:

```typescript
const attendance = await this.prisma.attendance.create({
  data: {
    agencyId: replacement.originalDeployment.agencyId,
    branchId: replacement.originalDeployment.branchId,
    employeeId: replacement.replacementEmployeeId, // Actual worker on duty
    deploymentId: replacement.originalDeploymentId, // Permanent client deployment
    clientId: replacement.originalDeployment.clientId,
    clientSiteId: replacement.originalDeployment.clientSiteId,
    shiftBusinessDate: businessDateObj,
    status: AttendanceStatus.PRESENT,
    scheduledHours: 8.0,
    workedHours,
    overtimeHours: Math.max(0, workedHours - 8.0),
    recordedMethod: AttendanceMethod.WEB_MANUAL,
    recordedById: user.id,
    supervisorRemarks: `Replacement shift for ${replacement.absentEmployee.employeeCode}`,
    isApproved: true,
    approvedById: user.id,
    isLocked: false,
  },
});
```

### Uniqueness & Integrity
- Attendance records enforce a unique constraint on `(employeeId, shiftBusinessDate)`. Because attendance is logged under `replacementEmployeeId`, there is zero collision with the absent employee's `PAID_LEAVE` or `ABSENT` entry for that date.
- Attending shifts outside the replacement `[startDate, endDate]` window is strictly blocked (`ATTENDANCE_DATE_OUTSIDE_REPLACEMENT`).

---

## 5. Audit Trail & Compliance
Every state change generates a structured entry in `audit_logs`:
- **CREATE**: Records initial dispatch details, original deployment ID, absent and replacement employee IDs, date windows.
- **UPDATE**: Records modified schedules or amended operational reasons.
- **APPROVE**: Records supervisor transaction sign-off.
- **CANCEL / REJECT**: Captures mandatory cancellation or rejection reasons.
- **COMPLETE**: Logs formal closing and post-shift operational notes.

---

## 6. RBAC Permissions Matrix
The module introduces granular role-based access permissions:

| Permission | Operations Coordinator | Branch Manager | HR Manager | System Admin |
| :--- | :---: | :---: | :---: | :---: |
| `REPLACEMENT_CREATE` | Yes | Yes | Yes | Yes |
| `REPLACEMENT_READ` | Yes | Yes | Yes | Yes |
| `REPLACEMENT_UPDATE` | Yes | Yes | Yes | Yes |
| `REPLACEMENT_APPROVE` | Yes | Yes | No | Yes |
| `REPLACEMENT_REJECT` | Yes | Yes | No | Yes |
| `REPLACEMENT_CANCEL` | Yes | Yes | No | Yes |
| `REPLACEMENT_COMPLETE` | Yes | Yes | No | Yes |

---

## 7. Verification & Regression Metrics
- **Replacement Test Suite**: 58 passing tests in `backend/test-replacements-suite.ts`.
- **System Regression**: 8/8 suites passing (Auth, Clients, Employees, Vehicles, Deployments, Attendance, Leave, Replacements) totaling **253 passing automated tests**.
- **Build Status**:
  - NestJS Backend: `tsc` and `nest build` completed with **0 errors**.
  - Next.js Frontend: Turbopack production build completed with **22 static & dynamic routes**.
