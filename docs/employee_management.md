# Employee Management Module Specification & Documentation

**Document Version:** 1.0  
**Phase:** Phase 2 — Step 3  
**Jurisdiction:** Republic of India (Statutory Compliance, PF, ESI, Motor Vehicles Act)  
**System:** Apex Manpower Agency Management System (Modular Monolith)

---

## 1. Executive Summary & Domain Hierarchy

The Employee Management module establishes the operational human resource master for the Apex Manpower Agency Management System. It serves as the single source of truth for all workforce personnel, trade certifications, commercial driving credentials, statutory compliance identities, and compensation records.

```
Agency (Corporate Entity / Licensee)
  └── Branch (City / Regional Operations Office, e.g., Delhi Central, Gurugram Hub)
        └── Employee Master (Code, Bio-demographics, Status Lifecycle)
              ├── Primary Designation & Category (e.g. Heavy Commercial Chauffeur, Housekeeping Supervisor)
              ├── Verified Skills Matrix (SkillMaster, Proficiency Level, Years of Experience, Primary Tag)
              ├── Educational & Trade Qualifications (Degree/Diploma, Institution, University, Year, CGPA)
              ├── Commercial Driver Profile (DL Number, Class, Issue/Expiry Dates, Issuing Authority)
              ├── Statutory & Banking Master (Encrypted AES-256-GCM Aadhaar, PAN, Bank Account, UAN, ESIC)
              └── Versioned Salary Structures (Append-only historical records, T-1 day auto-closure)
```

Downstream modules (**Employee Deployment**, **Attendance**, **Leave**, **Replacement**, **Payroll**, **PF/ESI Calculations**, and **Payslips**) strictly depend on the invariants established here.

---

## 2. Relational & Business Domain Model

### 2.1 Employee Master (`Employee`)
- **Uniqueness Guarantee:** `(agencyId, employeeCode)` is strictly unique. Employee codes cannot be duplicated within an agency.
- **Status Lifecycle (`EmployeeStatus`):**
  - `ACTIVE`: Available for scheduling and client deployment.
  - `ON_LEAVE`: Temporarily unavailable due to approved leave.
  - `SUSPENDED`: Disciplinary hold; strictly blocked from active deployment.
  - `RESIGNED`: Voluntary exit with resignation notice and last working date recorded.
  - `TERMINATED`: Involuntary exit; permanently blocked from scheduling and client deployment.
- **Branch Context:** Employees are assigned to the authenticated user's branch. Agency-wide HQ users can onboard personnel into any branch under their agency. Cross-agency injection is rejected by discarding untrusted client-supplied tenant identifiers.
- **Soft Deletion & Active Constraints:**
  - Soft deletion stamps `deletedAt` and sets `status = TERMINATED`.
  - Employees with active deployment assignments cannot be deleted (`EMPLOYEE_HAS_ACTIVE_DEPLOYMENTS` rejection).

### 2.2 Commercial Driver Profile & Fleet Credentials
Drivers represent a core high-value category in manpower staffing. To avoid join overhead and facilitate low-latency pre-dispatch validation in the Deployment engine:
- Direct schema columns on `Employee`:
  - `drivingLicenseNumber` (`VarChar(30)`): Unique per state RTO.
  - `drivingLicenseClass` (`VarChar(30)`): `LMV`, `LMV-TR`, `HMV`, `TRANS`, `MCWG`.
  - `drivingLicenseIssueDate` (`Date`).
  - `drivingLicenseExpiryDate` (`Date`): Checked during deployment eligibility checks.
  - `drivingLicenseAuthority` (`VarChar(80)`): Issuing RTO office.
- Associated documents (physical scanned copies of DL, commercial badges) are managed via the `Document` master with automated expiry alert hooks.

### 2.3 Verified Skills Matrix (`EmployeeSkill` & `SkillMaster`)
- Personnel can possess multiple skills mapped to `SkillMaster`.
- Attributes:
  - `proficiencyLevel`: `BEGINNER`, `INTERMEDIATE`, `EXPERT`.
  - `yearsOfExperience`: Non-negative decimal/integer.
  - `isPrimary`: Boolean flag determining primary trade suitability during automated job-matching and deployment.
- Strict uniqueness: `(employeeId, skillId)` ensures a skill cannot be duplicated on an employee dossier.

### 2.4 Academic & Trade Qualifications (`EmployeeQualification`)
- Captures certified formal education, vocational diplomas, and trade apprenticeships (e.g. ITI Diesel Mechanic, B.Com, High School).
- Fields: `qualificationType`, `degreeDiploma`, `institution`, `boardUniversity`, `yearOfPassing`, `percentageCgpa`, `certificateNumber`.
- Historical preservation: Qualifications are never overwritten; supplementary certifications append new records.

### 2.5 Statutory Compliance & AES-256-GCM Field Encryption
In compliance with Indian data protection laws and cybersecurity mandates:
- **Encrypted Columns (Ciphertext + IV + Auth Tag):**
  - `aadhaarNumberEncrypted`
  - `panNumberEncrypted`
  - `bankAccountNumberEncrypted`
- **Encryption Algorithm:** AES-256-GCM using `DATABASE_ENCRYPTION_KEY_256` environment secret.
- **Masked Read Previews:** Standard employee lists and dossier views return only masked strings:
  - Aadhaar: `XXXXXXXX1234`
  - PAN: `XXXXXX123F`
  - Bank Account: `XXXXXXXX7890`
- **Unmasked Access Protocol:**
  - Plaintext values are accessible **only** via `GET /employees/:id/sensitive`.
  - Endpoint requires the explicit `EMPLOYEE_VIEW_SENSITIVE` permission.
  - A mandatory `reason` query parameter must be provided.
  - Every access is immutably recorded in the `AuditLog` table (`AuditAction.OVERRIDE`, user ID, client IP, timestamp, reason).
  - Unmasked secrets are **never** logged in application console or audit payloads.

### 2.6 Versioned Salary Structures (`EmployeeSalaryStructure`)
- Defines the monthly wage structure composed of:
  - `basicSalary` (Mandatory, positive)
  - `hra` (House Rent Allowance)
  - `conveyanceAllowance`
  - `specialAllowance`
  - `medicalAllowance`
  - `otherAllowances`
  - `grossSalary` (Automatically computed from sum of all allowances)
  - Statutory applicability flags: `pfApplicable`, `esiApplicable`, `ptApplicable`, `tdsApplicable`.
- **Effective-Date Versioning Invariant:**
  - Active salary structures have `effectiveTo = NULL` and `isActive = true`.
  - When revising an employee's salary structure via `POST /employees/:id/salary-structures/revise`:
    1. A PostgreSQL interactive transaction validates that `effectiveFrom > currentActive.effectiveFrom`.
    2. The previous active salary structure is closed atomically: `effectiveTo = effectiveFrom - 1 day`, `isActive = false`.
    3. The new salary structure row is inserted with `effectiveFrom`, `effectiveTo = NULL`, `isActive = true`.
    4. Past payslips and historical payroll computations retain their exact reference to previous salary structures, ensuring retrospective adjustments never corrupt generated payroll.
  - **Temporal Collision Guard:** If an attempt is made to insert a structure overlapping existing periods, HTTP 409 `SALARY_STRUCTURE_TEMPORAL_OVERLAP` is raised.

---

## 3. Multi-Branch & Tenant Isolation

1. **Agency Context Guard:** All database queries scope by `agencyId = req.user.agencyId`. An authenticated user from Agency A cannot query, modify, or inspect records of Agency B (IDOR prevention).
2. **Branch Context Guard:** Branch-level users (`req.user.branchId !== null`) are constrained to their assigned branch. Agency-wide HQ users can manage employees across branches.
3. **Cross-Tenant Prevention:** Tenant and branch IDs supplied in incoming request bodies are ignored; the system binds all operations to the authenticated user's verified token context.

---

## 4. Downstream Integration Hand-off

The Employee module provides validated domain guarantees for future modules:
1. **Vehicle Management & Deployment (Phase 2 Steps 4 & 5):**
   - Active status check: Only `ACTIVE` employees can be scheduled.
   - Driver verification: For vehicle assignments, `drivingLicenseNumber` must be present and `drivingLicenseExpiryDate >= deploymentEndDate`.
2. **Attendance & Leave (Phase 2 Steps 6 & 7):**
   - Roster tracking and leave state synchronization (`ON_LEAVE`).
3. **Payroll & PF/ESI (Phase 2 Steps 9 & 10):**
   - Direct consumption of versioned `EmployeeSalaryStructure` with PF/ESI wage ceilings and encrypted statutory numbers.

---

## 5. REST API Specification

| Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/employees` | `EMPLOYEE_READ` | Searchable, filtered, paginated roster of employees. |
| `GET` | `/employees/designations` | `EMPLOYEE_READ` | Active designation master lookup. |
| `GET` | `/employees/skills` | `EMPLOYEE_READ` | Skill master repository lookup. |
| `GET` | `/employees/:id` | `EMPLOYEE_READ` | Full employee dossier (with masked sensitive fields). |
| `GET` | `/employees/:id/sensitive` | `EMPLOYEE_VIEW_SENSITIVE` | Unmasks Aadhaar, PAN, Bank Account; audited. |
| `POST` | `/employees` | `EMPLOYEE_CREATE` | Onboard new employee master record with encrypted fields. |
| `PATCH` | `/employees/:id` | `EMPLOYEE_UPDATE` | Update bio-demographics, contact, and driver attributes. |
| `PATCH` | `/employees/:id/status` | `EMPLOYEE_UPDATE` | Transition lifecycle state (`ACTIVE`, `ON_LEAVE`, etc.). |
| `DELETE` | `/employees/:id` | `EMPLOYEE_DELETE` | Soft-delete employee master if no active deployments exist. |
| `POST` | `/employees/:id/skills` | `EMPLOYEE_UPDATE` | Assign verified trade skill to employee dossier. |
| `DELETE` | `/employees/:id/skills/:skillId`| `EMPLOYEE_UPDATE` | Detach trade skill from employee dossier. |
| `POST` | `/employees/:id/qualifications` | `EMPLOYEE_UPDATE` | Add educational degree or trade qualification. |
| `POST` | `/employees/:id/salary-structures` | `EMPLOYEE_UPDATE` | Define initial salary structure. |
| `POST` | `/employees/:id/salary-structures/revise` | `EMPLOYEE_UPDATE` | Atomically revise salary structure with T-1 day auto-closure. |

---

## 6. Automated Verification Matrix

The test suite in `backend/test-employees-suite.ts` validates 26 distinct test cases:

| # | Test Assertion | Validation Mechanism | Result |
| :- | :--- | :--- | :--- |
| 1 | Create employee successfully | Validates code generation, encrypted write, masked response | **PASSED** |
| 2 | Reject duplicate employee code within agency | Database unique constraint `(agencyId, employeeCode)` | **PASSED** |
| 3 | Reject unauthorized agency / branch assignment | AgencyBranchContextGuard boundary test | **PASSED** |
| 4 | Soft delete employee successfully | Sets `deletedAt` and status = `TERMINATED` | **PASSED** |
| 5 | Prevent deletion when active deployments exist | Invariant enforcement `EMPLOYEE_HAS_ACTIVE_DEPLOYMENTS` | **PASSED** |
| 6 | Filter employees by branch | Branch-scoping filter in Prisma query | **PASSED** |
| 7 | Filter employees by status | Status predicate filter in Prisma query | **PASSED** |
| 8 | Filter employees by search (code, name, phone) | ILIKE / contains text match | **PASSED** |
| 9 | Mask sensitive data in default read | Masking helper verification (`XXXXXXXX1234`) | **PASSED** |
| 10 | Unmask sensitive data with valid reason | Decryption with `DATABASE_ENCRYPTION_KEY_256` | **PASSED** |
| 11 | Audit log written on sensitive unmask | Verifies audit entry created without secret leak | **PASSED** |
| 12 | Add employee skill | Persists `EmployeeSkill` with proficiency | **PASSED** |
| 13 | Prevent duplicate skill on same employee | Enforces composite unique `(employeeId, skillId)` | **PASSED** |
| 14 | Remove employee skill | Deletes specific skill row | **PASSED** |
| 15 | Add employee qualification | Persists qualification with degree & institution | **PASSED** |
| 16 | Preserve qualifications history | Append-only qualification tracking | **PASSED** |
| 17 | Create initial salary structure | Computes `grossSalary` and sets `isActive = true` | **PASSED** |
| 18 | Revise salary structure (atomic close old at t-1) | Closes previous row and inserts new active row | **PASSED** |
| 19 | Preserve previous salary structure in history | Verifies historical row retained with dates | **PASSED** |
| 20 | Prevent overlapping salary structures | Rejects if `newEffectiveFrom <= current.effectiveFrom` | **PASSED** |
| 21 | Block inactive employee from deployment | Verification of `ACTIVE` lifecycle prerequisite | **PASSED** |
| 22 | Reject cross-agency employee access | Multitenant boundary test | **PASSED** |
| 23 | Reject cross-branch unauthorized access | Branch isolation test | **PASSED** |
| 24 | Reject access when lacking required permission | PermissionsGuard test | **PASSED** |
| 25 | Verify driver credentials integrity | Validates DL number, class, dates on employee | **PASSED** |
| 26 | Verify designation and skills master lookups | Fetches master taxonomy definitions | **PASSED** |
