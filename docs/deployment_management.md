# Employee Deployment Engine Specification

**Module**: Employee Deployment  
**Domain Layer**: Workforce Operations & Temporal Rostering  
**Architectural Version**: 1.0 (Phase 3 Step 1)  
**Database**: PostgreSQL 16+ (btree_gist temporal exclusion)  
**Backend Framework**: NestJS 11 + Prisma ORM  
**Frontend Framework**: Next.js 15 (Turbopack)  

---

## 1. Executive Summary & Objective

The **Employee Deployment Engine** is the core operational bridge of the Manpower Agency Management System. It formally establishes where, under what designation, at which client site, during which shift hours, with which fleet vehicle (optional), at what commercial billing rate, and under what salary structure an employee is contracted to work.

### Relational Chain
$$\text{Employee} \longrightarrow \text{Designation} \longrightarrow \text{Client} \longrightarrow \text{Client Site} \longrightarrow \text{Vehicle (Optional)} \longrightarrow \text{Billing Rate} \longrightarrow \text{Salary Structure} \longrightarrow \text{Shift}$$

---

## 2. Core Architectural Principle: Immutable Temporal Ledger

Deployment records represent historical and operational truth. In accordance with enterprise manpower regulations and statutory compliance:
- **Deployments are NEVER overwritten**: Editing a worker's assigned client, site, or vehicle directly on an existing record is strictly forbidden.
- **Historical Immutability**: Historical records preserve the exact client, site, designation, rate card, and vehicle operating during that timeframe.
- **Atomic Reassignment**: Moving an employee to a new site or client ends the prior deployment as `TRANSFERRED` (capping `endDate`) and transactionally creates the new `ACTIVE` deployment in a single database transaction.

---

## 3. Database Schema & Temporal Constraints

### 3.1 PostgreSQL GIST Exclusion Constraint
To prevent simultaneous conflicting active deployments for the same worker across overlapping date ranges, PostgreSQL enforces an exclusion constraint:

```sql
ALTER TABLE employee_deployments 
ADD CONSTRAINT exclude_employee_deployment_overlap 
EXCLUDE USING gist (
  employee_id WITH =,
  daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
) WHERE (deleted_at IS NULL AND status = 'ACTIVE');
```

Any attempt to insert or update an `ACTIVE` deployment overlapping an existing active deployment for that employee is rejected at both the service layer (with a clear `ConflictException`) and the PostgreSQL database engine.

### 3.2 Prisma Models Involved
- `EmployeeDeployment`: Master deployment record storing foreign keys, shift timings, night shift indicator, start date, end date, and status.
- `DeploymentShift`: 7-day calendar breakdown specifying workday vs. rest day scheduled for that deployment.
- `AuditLog`: Immutable audit trail recording deployment creation, modification, safe completion, and reassignment reasons.

---

## 4. Deployment Lifecycle & Statuses

The deployment status lifecycle adheres to the enum `deployment_status_enum`:
1. `ACTIVE`: The employee is currently deployed and actively performing shifts.
2. `COMPLETED`: The deployment was safely ended upon contract completion, project closure, or agreed release.
3. `TRANSFERRED`: The deployment ended because the employee was reassigned to another client, site, or role.
4. `REPLACED`: The worker was temporarily or permanently substituted by a standby or replacement worker.

---

## 5. Comprehensive Business Validation Pipeline

Before any deployment record is accepted, the system validates the following 18 criteria:

1. **Employee Existence**: Employee must exist and belong to the authenticated agency.
2. **Employee Branch Context**: User can only deploy workers belonging to their authorized branch (unless HQ Super Admin).
3. **Employee Active Status**: Only employees with status `ACTIVE` can be deployed. `INACTIVE`, `SUSPENDED`, `TERMINATED`, and `RESIGNED` workers are rejected.
4. **Client Existence**: Client must exist and belong to the authenticated agency.
5. **Client Active Status**: Client status must be `ACTIVE`. `INACTIVE` or `BLACKLISTED` clients are rejected.
6. **Client Branch Context**: Client must be registered within the user's branch scope.
7. **Client Site Integrity**: The selected site must belong to the selected client (`site.clientId === client.id`). Cross-client site assignment is strictly rejected.
8. **Designation Validity**: The designation must exist in the agency. The deployment designation is stored on the deployment and does not overwrite the employee master designation.
9. **Vehicle Eligibility (Optional)**:
   - Vehicles are optional (security guards, cleaners, and static workers require no vehicle).
   - If a vehicle is specified: it must belong to the user's agency & branch, and its status must be operational (`AVAILABLE` or `ASSIGNED`). `UNDER_MAINTENANCE` and `GROUNDED` vehicles are rejected.
10. **Billing Rate Existence**: Billing rate card must belong to the selected client.
11. **Billing Rate Active Status**: Billing rate must be currently active (`isActive === true`).
12. **Billing Rate Designation Match**: Billing rate designation must match the deployment designation.
13. **Billing Rate Site Compatibility**: If the rate is site-specific, it must match the deployment's client site.
14. **Billing Rate Effective Period**: Rate card must cover the deployment start date (`effectiveFrom <= startDate <= (effectiveTo || infinity)`).
15. **Salary Structure Ownership**: Salary structure must belong to the deployed employee.
16. **Salary Structure Effective Period**: Salary structure must cover the deployment start date (`effectiveFrom <= startDate <= (effectiveTo || infinity)`).
17. **Temporal Non-Overlap**: Employee must have zero overlapping active deployments in that date interval.
18. **Chronological Validity**: Start date is mandatory; if end date is provided, it must be $\ge$ start date.

---

## 6. Safe Ending & Atomic Reassignment Workflows

### 6.1 Safe Ending (`POST /deployments/:id/end`)
- Validates that current status is `ACTIVE`.
- Validates that `endDate >= startDate`.
- Updates `endDate` and transitions status to `COMPLETED`.
- Immutably logs user, completion reason, and optional handover remarks in `AuditLog`.

### 6.2 Atomic Reassignment (`POST /deployments/:id/reassign`)
Executed within a single database transaction (`prisma.$transaction`):
1. Clicks previous deployment `endDate = effectiveDate - 1 day` (or same day if instantaneous), status = `TRANSFERRED`.
2. Creates new deployment record with new client, site, designation, rate, salary, vehicle, and shift.
3. Automatically populates 7-day `DeploymentShift` workdays for new deployment.
4. Cross-references audit trails on both records for unbroken operational traceability.

---

## 7. Shift Rostering & Cross-Midnight Support

- **Embedded Shift**:
  - `shiftName`: Descriptive shift label (e.g., `GENERAL`, `DAY_SHIFT`, `NIGHT_SHIFT`).
  - `shiftStartTime` & `shiftEndTime`: Stored with `@db.Time` precision.
  - `isNightShift`: Automatically flagged `true` when `shiftEndTime < shiftStartTime` (e.g. 20:00 to 05:00) or explicitly indicated.
- **Roster Workdays**:
  - `DeploymentShift` records store days 1 (Monday) through 7 (Sunday) with `isScheduledWorkday: true/false`.

---

## 8. Role-Based Access Control & Branch Isolation

Guards enforced across all deployment endpoints:
- `JwtAuthGuard`: Validates active JWT session.
- `PermissionsGuard`: Enforces granular permissions.
- `AgencyBranchContextGuard`: Injects and scopes user agency and branch context.

### Permissions
- `DEPLOYMENT_CREATE`: Create new employee client deployments.
- `DEPLOYMENT_READ`: View live deployment directories and dossiers.
- `DEPLOYMENT_UPDATE`: Modify non-core shift timings and remarks.
- `DEPLOYMENT_DELETE`: Soft-delete or cancel deployments.
- `DEPLOYMENT_END`: Safely end active deployments.
- `DEPLOYMENT_REASSIGN`: Transfer worker to another client/site.

---

## 9. API Reference

| Method | Path | Required Permission | Description |
|---|---|---|---|
| `POST` | `/api/v1/deployments` | `DEPLOYMENT_CREATE` | Create new deployment with 7-day shift roster |
| `GET` | `/api/v1/deployments` | `DEPLOYMENT_READ` | Search and filter deployments directory |
| `GET` | `/api/v1/deployments/options` | `DEPLOYMENT_READ` | Dynamic dropdown metadata (clients, sites, rates, salaries, vehicles) |
| `GET` | `/api/v1/deployments/:id` | `DEPLOYMENT_READ` | Get full deployment dossier and audit history |
| `PATCH` | `/api/v1/deployments/:id` | `DEPLOYMENT_UPDATE` | Update non-core shift parameters |
| `POST` | `/api/v1/deployments/:id/end` | `DEPLOYMENT_END` | Safely end deployment (`status: COMPLETED`) |
| `POST` | `/api/v1/deployments/:id/reassign` | `DEPLOYMENT_REASSIGN` | Atomically transfer worker to new deployment |

---

## 10. Future Module Compatibility

1. **Attendance Engine (Phase 3 Step 2)**:
   - Attendance records directly reference `deploymentId`.
   - Shifts and scheduled workdays determine attendance eligibility without needing to reverse-engineer client/employee linkages.
2. **Statutory & Payroll Engine**:
   - Accurately computes monthly wages using the `salaryStructureId` and deployment intervals preserved in the ledger.
3. **Client Invoicing Engine**:
   - Generates client billing based on verified deployment days and attached `billingRateId`.
