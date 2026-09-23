# Fleet & Vehicle Management Module Specification & Documentation

**Document Version:** 1.0  
**Phase:** Phase 2 — Step 4  
**Jurisdiction:** Republic of India (Motor Vehicles Act, State RTO Standards, Fleet Compliance)  
**System:** Apex Manpower Agency Management System (Modular Monolith)

---

## 1. Executive Summary & Domain Hierarchy

The Fleet & Vehicle Management module establishes the operational asset master and temporal driver allocation ledger for the Apex Manpower Agency Management System. It manages commercial transport assets, delivery vans, passenger buses, and utility vehicles used in manpower deployments and logistics operations.

```
Agency (Corporate Entity / Licensee)
  └── Branch (City / Regional Operations Office, e.g., Chennai HQ, Trichy Hub)
        └── Vehicle (Fleet Asset, Normalized Registration Number, Technical Profile)
              ├── Ownership Model (General Agency Fleet Pool vs Client-Dedicated Asset)
              ├── Temporal Assignment Ledger (Sequential Handover History, Odometers)
              │     └── Assigned Driver (Active Commercial Employee / Chauffeur)
              └── Compliance Documents (RC, Commercial Insurance, Fitness, Road Permits, PUC)
```

Downstream modules (**Employee Deployment**, **Attendance & Shift Rostering**, and **Client Billing**) consume active assignments and vehicle deployment records validated through this domain.

---

## 2. Relational & Business Domain Model

### 2.1 Vehicle Master (`Vehicle`)
- **Uniqueness Guarantee:** `(agency_id, vehicle_registration_number)` is strictly enforced at the database level.
- **Registration Number Normalization:**
  - Standard Indian registration formats (e.g. `TN 01 AB 1234`, `tn01ab1234`, `TN-01-AB-1234`) are sanitized to uppercase alphanumeric strings (`TN01AB1234`) at ingestion.
  - Normalization prevents duplicate records caused by spacing or casing discrepancies while preserving valid state and regional RTO structures.
- **Technical Attributes:**
  - `vehicleMake`: Manufacturer (e.g. Tata Motors, Mahindra, Ashok Leyland).
  - `vehicleModel`: Specific model (e.g. Ace Gold HT, Bolero Maxi Truck, Dost+).
  - `vehicleType`: `SEDAN`, `SUV`, `BUS`, `VAN`, `TRUCK`, `AUTO`.
  - `fuelType`: `DIESEL`, `PETROL`, `CNG`, `ELECTRIC`.
  - `chassisNumber` (VIN) & `engineNumber`: Stored in uppercase for regulatory inspections.
  - `manufacturingYear`: Integer year of build.
  - `currentOdometerKm`: Integer kilometer reading, continuously synchronized with handover returns.
- **Ownership Classification:**
  - `AGENCY_OWNED`: Vehicle belongs to the agency fleet pool (`clientId = NULL`), available for flexible dispatch.
  - `CLIENT_OWNED` / Dedicated: Vehicle is dedicated to a specific client organization (`clientId` foreign key populated), reserved for that client's operations.
- **Status Lifecycle (`VehicleStatus`):**
  - `AVAILABLE`: Parked in depot, inspected, and eligible to receive new driver assignments.
  - `ASSIGNED`: Currently allocated to an active driver with an open assignment interval.
  - `UNDER_MAINTENANCE`: In service / repair bay; strictly blocked from receiving driver assignments.
  - `GROUNDED`: Decommissioned or retired asset; permanently blocked from operational assignments.

### 2.2 Vehicle Assignment Temporal Ledger (`VehicleAssignment`)
Rather than maintaining a flat 1:1 foreign key between vehicles and employees, the system models assignments as an **immutable temporal ledger**:
- **Attributes:**
  - `startDatetime`: Handover timestamp when the driver takes custody.
  - `endDatetime`: Return timestamp (`NULL` indicates the currently active driver assignment).
  - `startOdometerKm`: Odometer reading at departure.
  - `endOdometerKm`: Odometer reading at return (`NULL` while active).
  - `handoverConditionNotes`: Pre-departure vehicle condition inspection notes (e.g. tire condition, spare wheel, fuel level).
  - `returnConditionNotes`: Post-trip condition notes and damage inspection.
  - `reasonForChange`: Operational justification (e.g. shift dispatch, routine rotation, maintenance call).
  - `assignedById`: User ID of dispatcher or manager authorizing the handover.
- **Historical Immutability:**
  - Historical assignments are never overwritten or casually removed.
  - Every handover and return remains in the ledger with exact dates, total kilometers driven, and inspection logs.

---

## 3. Temporal Overlap & Concurrency Safeguards

### 3.1 Database Exclusion Constraint (`btree_gist`)
The PostgreSQL database utilizes the `btree_gist` extension to enforce a strict temporal exclusion constraint:
```sql
ALTER TABLE vehicle_assignments 
ADD CONSTRAINT exclude_vehicle_assignment_overlap 
EXCLUDE USING gist (
  vehicle_id WITH =,
  tstzrange(start_datetime, COALESCE(end_datetime, 'infinity'::timestamptz), '[]') WITH &&
) WHERE (deleted_at IS NULL);
```
- **Engine-Level Guarantee:** PostgreSQL rejects any transaction that attempts to create overlapping active intervals for the same vehicle.

### 3.2 Dual-Sided Concurrency Protection
In addition to the database-level constraint on vehicles, the domain service enforces:
1. **Vehicle Availability Guard:** A vehicle cannot receive a new assignment unless its status is `AVAILABLE` and it has no overlapping assignments.
2. **Driver Concurrency Guard:** An employee cannot be assigned to two vehicles simultaneously. If an active or overlapping assignment exists for the driver, HTTP 409 `EMPLOYEE_ALREADY_ASSIGNED_TO_VEHICLE` is thrown.
3. **Driver Status Guard:** The assigned employee must be in `ACTIVE` status (drivers who are `ON_LEAVE`, `SUSPENDED`, `RESIGNED`, or `TERMINATED` are strictly rejected with HTTP 400 `EMPLOYEE_NOT_ELIGIBLE_FOR_ASSIGNMENT`).

---

## 4. Multi-Branch & Tenant Isolation

1. **Agency Context Guard:** All database queries automatically scope to `agencyId = req.user.agencyId`. Cross-agency operations (IDOR attempts) fail with HTTP 404 / 403.
2. **Branch Context Guard:** Branch-level managers (`branchId !== null`) are strictly restricted to vehicles belonging to their assigned branch. Agency-wide HQ users can manage vehicles across all branches.
3. **Branch Consistency in Handover:** Driver assignments require that both the vehicle and the assigned employee belong to the same authorized branch context.

---

## 5. Audit Trails & Governance

All lifecycle transitions and handover events record immutable entries in `audit_logs`:
- `VEHICLE_CREATED`: Initial registration of fleet asset.
- `VEHICLE_UPDATED`: Technical specification changes (odometer, model, specifications).
- `VEHICLE_STATUS_CHANGED`: Transitions between `AVAILABLE`, `UNDER_MAINTENANCE`, `GROUNDED`.
- `VEHICLE_DELETED`: Soft deletion / asset decommissioning.
- `VEHICLE_ASSIGNMENT_CREATED`: Driver assignment with start timestamp, initial odometer, and handover checklist.
- `VEHICLE_ASSIGNMENT_ENDED`: Vehicle return with return timestamp, ending odometer, and inspection condition.

---

## 6. Downstream Integration Hand-off

The Vehicle Management module establishes foundational guarantees for future modules:
1. **Employee Deployment (Phase 2 Step 5):**
   - Direct integration: Deployment shifts can link to a validated `vehicleId`.
   - Driver validation: Automatically checks that the deployed employee holds a valid driving license for the vehicle class and that the vehicle is in `AVAILABLE` / `ASSIGNED` status.
2. **Attendance & Trip Tracking (Phase 2 Step 6):**
   - Trip distance calculation: `endOdometerKm - startOdometerKm`.
3. **Client Billing & Invoicing (Phase 2 Step 10):**
   - Dedicated vehicle billing rates: If `clientId` is present, monthly vehicle rental or per-kilometer transport billing can be auto-computed.

---

## 7. REST API Specification

| Method | Path | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/vehicles` | `VEHICLE_READ` | Searchable, filtered, paginated roster of fleet vehicles. |
| `GET` | `/vehicles/types` | `VEHICLE_READ` | Vehicle body class lookup (Sedan, SUV, Bus, Truck, etc.). |
| `GET` | `/vehicles/fuel-types` | `VEHICLE_READ` | Fuel type lookup (Diesel, Petrol, CNG, Electric). |
| `GET` | `/vehicles/statuses` | `VEHICLE_READ` | Vehicle status lifecycle lookup. |
| `GET` | `/vehicles/:id` | `VEHICLE_READ` | Full vehicle dossier with current assignment and linked documents. |
| `POST` | `/vehicles` | `VEHICLE_CREATE` | Register new fleet vehicle with normalized registration number. |
| `PATCH` | `/vehicles/:id` | `VEHICLE_UPDATE` | Update technical specifications and odometer. |
| `PATCH` | `/vehicles/:id/status` | `VEHICLE_UPDATE` | Transition lifecycle state (`AVAILABLE`, `UNDER_MAINTENANCE`, `GROUNDED`). |
| `DELETE` | `/vehicles/:id` | `VEHICLE_DELETE` | Soft-delete vehicle if no active assignments exist. |
| `POST` | `/vehicles/:id/assignments` | `VEHICLE_ASSIGN` | Assign active driver with start odometer and handover notes. |
| `PATCH` | `/vehicles/:id/assignments/:assignmentId/end` | `VEHICLE_ASSIGN` | Complete vehicle return with ending odometer and inspection notes. |
| `GET` | `/vehicles/:id/assignments` | `VEHICLE_READ` | Retrieve full chronological driver assignment ledger. |
| `GET` | `/employees/:id/vehicle-history` | `EMPLOYEE_READ` | Retrieve all vehicles previously assigned to an employee. |

---

## 8. Automated Verification Matrix

The test suite in `backend/test-vehicles-suite.ts` validates 26 distinct test cases:

| # | Test Assertion | Validation Mechanism | Result |
| :- | :--- | :--- | :--- |
| 1 | Create vehicle with normalized registration | Strips spacing & punctuation, enforces uppercase | **PASSED** |
| 2 | Read structured vehicle profile | Returns make, model, branch, and current assignment | **PASSED** |
| 3 | Update technical attributes | Updates model and odometer km | **PASSED** |
| 4 | Reject duplicate normalized registration | Unique constraint `(agencyId, normalizedRegNumber)` | **PASSED** |
| 5 | Reject unauthorized agency read | Multi-tenant boundary check throws `NotFoundException` | **PASSED** |
| 6 | Reject unauthorized branch manager access | Branch-level isolation throws `ForbiddenException` | **PASSED** |
| 7 | Transition vehicle status | Updates status to `UNDER_MAINTENANCE` and back | **PASSED** |
| 8 | Assign driver to available vehicle | Sets driver, start odometer, and vehicle status `ASSIGNED` | **PASSED** |
| 9 | Read current assignment | Identifies open-ended active assignment (`endDatetime = NULL`) | **PASSED** |
| 10 | Prevent deletion with active assignment | Invariant `VEHICLE_HAS_ACTIVE_ASSIGNMENTS` throws Conflict | **PASSED** |
| 11 | End active assignment | Records return odometer, marks vehicle `AVAILABLE` | **PASSED** |
| 12 | Create second sequential assignment | Creates assignment for Driver 2 | **PASSED** |
| 13 | Read assignment history | Returns chronological ledger sorted newest first | **PASSED** |
| 14 | Historical assignment never overwritten | Assignment 1 preserved with original start/end odometers | **PASSED** |
| 15 | Overlapping vehicle assignment rejected | Rejects concurrent assignment on occupied vehicle | **PASSED** |
| 16 | Overlapping driver assignment rejected | Prevents same driver from concurrent vehicle assignments | **PASSED** |
| 17 | Inactive / Terminated employee rejected | Rejects `TERMINATED` employee assignment | **PASSED** |
| 18 | Maintenance vehicle cannot receive assignment | Rejects assignment when vehicle is `UNDER_MAINTENANCE` | **PASSED** |
| 19 | Grounded / Retired vehicle cannot receive assignment | Rejects assignment when vehicle is `GROUNDED` | **PASSED** |
| 20 | Cross-agency IDOR rejected | Blocks cross-tenant direct modification | **PASSED** |
| 21 | Cross-branch IDOR rejected | Blocks cross-branch unauthorized assignment | **PASSED** |
| 22 | Soft deletion of available vehicle | Sets `deletedAt` and status `GROUNDED` | **PASSED** |
| 23 | Employee vehicle history query | Returns vehicles driven by employee | **PASSED** |
| 24 | Vehicle types & metadata lookups | Returns registered enum options for UI dropdowns | **PASSED** |
| 25 | Handover & Return odometer audit | Verified audit entries created for assignment events | **PASSED** |
| 26 | Roster pagination & search filter | Searches by normalized registration and paginates | **PASSED** |
