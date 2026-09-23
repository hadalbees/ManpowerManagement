# Client Management Module Specification & Documentation

**Document Version:** 1.0  
**Phase:** Phase 2 — Step 2  
**Jurisdiction:** Republic of India (GST / PAN / Statutory Compliance)  
**System:** Apex Manpower Agency Management System (Modular Monolith)

---

## 1. Executive Summary & Client Hierarchy

The Client Management module serves as the primary commercial foundation for all downstream operations in the Apex Manpower Agency Management System (deployments, shifts, attendance, salary generation, and billing). It enforces a strict multi-branch relational hierarchy:

```
Agency (Corporate Entity / Licensee)
  └── Branch (City / Regional Operations Office, e.g., Chennai HQ, Trichy)
        └── Client (Master Commercial Entity, Trade & Legal Names, PAN/GSTIN)
              └── Client Site (Operational Depots, Hubs, Factories, Warehouse Facilities)
                    └── Client Contract (MSAs, Work Orders, Notice Periods, Billing Cycles)
                          └── Client Billing Rate (Historical & Active Rate Cards by Designation/Site)
```

---

## 2. Relational & Business Domain Model

### 2.1 Client Master (`Client`)
- **Uniqueness Guarantee:** `(agency_id, client_code)` is strictly unique. A client code cannot be reused within an agency.
- **GSTIN / PAN Validation:** Indian PAN (10 alphanumeric characters `[A-Z]{5}[0-9]{4}[A-Z]{1}`) and Indian GSTIN (15 characters matching state code prefix and PAN) are validated via DTO regexes and enforced at the database level.
- **Branch Context:** Clients are assigned to the authenticated user's branch. Agency-wide users (HQ) may specify any branch belonging to their agency. Cross-agency injection is prevented by discarding frontend tenant IDs.
- **Soft Deletion & Status:** Physical records are never dropped if downstream operational references exist. Soft deletion records `deletedAt` and sets `status = INACTIVE`. Soft delete is rejected if active employee deployments reference the client.

### 2.2 Client Sites (`ClientSite`)
- Represents physical dispatch locations and client facilities.
- Enables site-level supervisor tracking (`siteSupervisorName`, `siteSupervisorPhone`) and site-specific billing rates.
- `siteCode` is unique per client.

### 2.3 Client Contracts (`ClientContract`)
- Captures Master Service Agreements (MSA) and Service Level Agreements (SLA).
- Supports historical agreements: renewals do **not** overwrite past contracts. Previous contracts remain intact with their effective date boundaries (`startDate`, `endDate`).
- Tracks `billingCycle` (`MONTHLY`, `FORTNIGHTLY`, `WEEKLY`, `DAILY`), `noticePeriodDays`, and `autoRenew`.

### 2.4 Client Billing Rates & Versioning (`ClientBillingRate`)
- Defines billing rates per `(clientId, designationId, clientSiteId, billingModel)`.
- Supported Billing Models (exact Prisma Enum):
  - `MONTHLY_FIXED`: Fixed monthly lump-sum billing per deployed head.
  - `PER_EMPLOYEE`: Daily/monthly headcount-based billing rate.
  - `PER_SHIFT`: Flat rate per shift completed.
  - `HOURLY`: Hourly billing rate based on attendance punches.
  - `OVERTIME`: Dedicated overtime billing rate per hour.
- **Effective-Date Versioning Invariant:**
  - Active rate cards have `effectiveTo = NULL` (open-ended).
  - When revising a rate card via `createNewRateVersion(rateId, { newRateAmount, newEffectiveFrom })`:
    1. An atomic PostgreSQL transaction updates the previous active rate: `effectiveTo = newEffectiveFrom - 1 day`.
    2. The new rate row is inserted with `effectiveFrom = newEffectiveFrom`, `effectiveTo = NULL`, `isActive = true`.
    3. Past invoices and historical deployments retain reference to previous rates, preventing retrospective billing recalculations.
- **Temporal Overlap Prevention:**
  - Creating a rate card executes a collision detection query against existing active rates for the same client, site, designation, and billing model. If any date window overlaps, HTTP 409 `RATE_CARD_TEMPORAL_OVERLAP` is returned.

---

## 3. Authorization & Security Architecture

### 3.1 Permission Codes
The module enforces fine-grained permissions via `@RequirePermission`:
- `CLIENT_CREATE`: Required to create new client masters, sites, contracts, and rates.
- `CLIENT_READ`: Required to view client directory, structured client profiles, and rate cards.
- `CLIENT_UPDATE`: Required to edit client details, update status, create contract renewals, and revise rate versions.
- `CLIENT_DELETE`: Required to soft-delete clients or deactivate sites/rates.

### 3.2 Branch & Agency Context Isolation
- **Branch-Scoped Users (`user.branchId !== null`):** Can only query, create, or modify clients where `client.branchId === user.branchId`. Any attempt to access a client belonging to a different branch triggers HTTP 403 `AUTH_FORBIDDEN_BRANCH_RECORD`.
- **Agency-Wide Users (`user.branchId === null`):** Can view across branches or assign clients to any branch within their authorized `agencyId`.
- **Cross-Agency IDOR Prevention:** The query layer automatically injects `where.agencyId = user.agencyId` and verifies branch access, preventing cross-tenant or cross-branch direct ID access even if UUIDs are known.

---

## 4. REST API Endpoint Reference

All endpoints require `Bearer <accessToken>` and appropriate permission tokens.

### Client Master
| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `POST` | `/api/v1/clients` | Create new client master | `CLIENT_CREATE` |
| `GET` | `/api/v1/clients` | Paginated client directory with search & filters | `CLIENT_READ` |
| `GET` | `/api/v1/clients/:id` | Full structured client profile dossier | `CLIENT_READ` |
| `PATCH` | `/api/v1/clients/:id` | Update client profile & commercial terms | `CLIENT_UPDATE` |
| `PATCH` | `/api/v1/clients/:id/status` | Update client status (ACTIVE / INACTIVE / BLACKLISTED) | `CLIENT_UPDATE` |
| `DELETE` | `/api/v1/clients/:id` | Soft delete client (blocked if active deployments exist) | `CLIENT_DELETE` |

### Client Sites
| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `POST` | `/api/v1/clients/:clientId/sites` | Register new site for client | `CLIENT_CREATE` |
| `GET` | `/api/v1/clients/:clientId/sites` | List sites for client | `CLIENT_READ` |
| `GET` | `/api/v1/clients/:clientId/sites/:siteId` | Retrieve site details | `CLIENT_READ` |
| `PATCH` | `/api/v1/clients/:clientId/sites/:siteId` | Update site supervisor & details | `CLIENT_UPDATE` |
| `DELETE` | `/api/v1/clients/:clientId/sites/:siteId` | Deactivate/soft-delete site | `CLIENT_DELETE` |

### Client Contracts
| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `POST` | `/api/v1/clients/:clientId/contracts` | Create contract agreement / renewal | `CLIENT_CREATE` |
| `GET` | `/api/v1/clients/:clientId/contracts` | List historical and active contracts | `CLIENT_READ` |
| `PATCH` | `/api/v1/clients/:clientId/contracts/:contractId` | Update contract metadata | `CLIENT_UPDATE` |

### Client Billing Rates
| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `POST` | `/api/v1/clients/:clientId/billing-rates` | Create initial rate card | `CLIENT_CREATE` |
| `GET` | `/api/v1/clients/:clientId/billing-rates` | List historical and active rate cards | `CLIENT_READ` |
| `POST` | `/api/v1/clients/:clientId/billing-rates/:rateId/version` | Atomically revise rate version | `CLIENT_UPDATE` |
| `DELETE` | `/api/v1/clients/:clientId/billing-rates/:rateId` | Deactivate billing rate | `CLIENT_DELETE` |

---

## 5. Audit Logging

Every critical state mutation is recorded immutably via `AuditService` in the `AuditLog` table with:
- `CLIENT_CREATED`: Logged with company name and client code.
- `CLIENT_UPDATED`: Logged with delta of modified fields.
- `CLIENT_STATUS_CHANGED`: Logged with old and new status.
- `CLIENT_DELETED`: Logged with soft deletion timestamp.
- `SITE_CREATED`, `SITE_UPDATED`, `SITE_DELETED`: Logged with site code and parent client.
- `CONTRACT_CREATED`, `CONTRACT_UPDATED`: Logged with contract number and validity dates.
- `RATE_CREATED`, `RATE_REVISED`, `RATE_DEACTIVATED`: Logged with designation, previous and new rate amounts, and effective date boundaries.

---

## 6. Frontend Routes & User Interface

The Client Management module UI is implemented in Next.js 15 under the authenticated dashboard shell:
- `/dashboard/clients`: Client directory with live search, status filter, branch tags, pagination, and quick status actions.
- `/dashboard/clients/new`: Validated client registration form with Indian tax format validations.
- `/dashboard/clients/[id]`: Comprehensive dossier view with 4 tabbed panels:
  1. **Overview**: Enterprise identity, Indian PAN/GSTIN, registered address, payment terms, contact details.
  2. **Client Sites**: Grid of operating locations with "Add Site" modal.
  3. **Contracts**: Master service agreements table with "Register Contract" modal.
  4. **Billing Rates**: Rate card matrix displaying current vs historical rates, with "Add Rate Card" modal and "Revise Rate Version" atomic versioning modal.
- `/dashboard/clients/[id]/edit`: Safe modification form with read-only lock on statutory identifiers.
