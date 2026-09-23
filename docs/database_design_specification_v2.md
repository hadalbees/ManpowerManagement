# Production Database Architecture & Data Specification v2.0
**Project:** Manpower Agency Management System  
**Jurisdiction:** India (EPFO, ESIC, State PT, LWF, GST Compliance Ready)  
**Architecture Style:** Modular Monolith (PostgreSQL 16+ / NestJS / Prisma / Next.js)  
**Status:** Under Architectural Final Review (Phase 1 Database Design)

---

## 1. Domain-Driven Entity Grouping & Justification

To maintain strict modularity, historical integrity, and operational simplicity, the system is organized into **11 Core Domains** comprising **38 production tables**.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             AGENCY DOMAIN                                │
│   agencies · agency_branches · agency_configurations                     │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴─────────────────────────────────────┐
│                          IAM & AUDIT DOMAIN                              │
│   users · roles · permissions · role_permissions · user_permissions      │
│   user_sessions · audit_logs                                             │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
       ┌─────────────────────────────┼─────────────────────────────┐
       ▼                             ▼                             ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│CLIENT DOMAIN │             │WORKFORCE     │             │FLEET DOMAIN  │
│clients       │             │DOMAINS       │             │vehicles      │
│client_sites  │             │employees     │             │vehicle_      │
│client_       │             │designations  │             │ assignments  │
│ contracts    │             │skills        │             └──────┬───────┘
│client_       │             │employee_     │                    │
│ billing_rates│             │ skills       │                    │
└──────┬───────┘             │employee_     │                    │
       │                     │ qualifs      │                    │
       │                     │salary_structs│                    │
       │                     │salary_advanc.│                    │
       │                     │leave_types   │                    │
       │                     │leave_balances│                    │
       │                     │leave_requests│                    │
       │                     └──────┬───────┘                    │
       │                            │                            │
       └─────────────────────┬──────┴────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           OPERATIONS DOMAIN                              │
│   employee_deployments · deployment_shifts · attendances · replacements  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
       ┌─────────────────────────────┴─────────────────────────────┐
       ▼                                                           ▼
┌───────────────────────────────┐         ┌────────────────────────────────┐
│   STATUTORY & PAYROLL DOMAIN  │         │     CLIENT BILLING DOMAIN      │
│ statutory_rules               │         │ invoice_sequences              │
│ payroll_batches               │         │ client_invoices                │
│ salary_calculations           │         │ client_invoice_items           │
│ payslips                      │         │ invoice_adjustments (Cr/Dr)    │
│                               │         │ client_payments                │
└───────────────────────────────┘         └────────────────────────────────┘
       │                                                           │
       └─────────────────────────────┬─────────────────────────────┘
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT & GOVERNANCE DOMAINS                         │
│ document_types · documents · expiry_alerts · recruitment_candidates     │
│ candidate_interviews · notifications                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Evaluation of Proposed New Entities (Section 8 Review)

| Proposed Entity | Decision | Why Required & What Problem It Solves | Major Relationships |
| :--- | :--- | :--- | :--- |
| **`designations`** | **APPROVED** | In manpower agencies, billing rates, minimum wage compliance, statutory job classifications, and roster requirements all anchor to standardized roles (Driver, Security Guard, Housekeeper, Gunman, Forklift Operator). Strings lead to typos, broken rate cards, and inaccurate reporting. | Belongs to `Agency`. Referenced by `deployments`, `client_billing_rates`, `recruitment_candidates`. |
| **`skills` & `employee_skills`** | **APPROVED** | Operations coordinators frequently need to filter personnel by specialized operational certifications (e.g., Heavy Transport Driver, Hazmat License, Armed Guard, English-speaking Concierge). Solves emergency replacement matching. | M:N between `employees` and `skills`. |
| **`employee_qualifications`** | **APPROVED** | Commercial enterprise contracts (banks, IT parks, airports) enforce strict educational/certification thresholds (e.g. 10th/12th standard pass, ex-serviceman discharge book, ITI certificate). Solves regulatory compliance and client audit rejections. | Belongs to `employees`. |
| **`client_contracts`** | **APPROVED** | Manpower supply is governed by legal service agreements with specific start/end dates, penalty clauses, minimum notice periods, and commercial terms. Solves contract expiration oversights and links billing rate revisions to contract amendments. | Belongs to `clients`. Has many `client_billing_rates` and `client_sites`. |
| **`invoice_adjustments`** *(Credit / Debit Notes)* | **APPROVED** | Indian GST law strictly forbids modifying a finalized/locked tax invoice. Any billing dispute (shift shortage, client SLA penalty) requires an official Credit Note (`CRN`), while unbilled overtime requires a Debit Note (`DBN`). Solves tax and financial accounting compliance. | Belongs to `client_invoices`. References `agency_branches`. |
| **`salary_advances`** | **APPROVED** | Blue-collar manpower staff frequently request emergency cash advances or festival loans. Without automated tracking, manual deductions in payroll get missed, resulting in revenue leakage. Solves automated installment deductions in monthly payroll. | Belongs to `employees`. Referenced in `salary_calculations`. |
| **`leave_balances`** | **APPROVED** | `leave_requests` only log transactions. Under the Indian Factories / Shops and Establishments Act, workers accrue paid leaves periodically. Solves real-time entitlement validation, preventing unearned paid leaves. | Belongs to `employees` and `leave_types`. |
| **`document_types`** | **APPROVED** | Replacing hardcoded document enums with a configurable master table allows agencies to define custom compliance requirements (e.g. Police Verification, Medical Fitness, Driving Badge) with per-type expiry interval rules without modifying code. | Belongs to `agencies`. Referenced by `documents`. |
| **`agency_configurations`** | **APPROVED** | Stores branch/agency level parameters such as working days per month basis (26 vs 30 days for daily wage divisor), financial year bounds, and default notification preferences. | Belongs to `agencies` and `agency_branches`. |
| **`user_sessions`** | **APPROVED** | Critical for enterprise security: tracks active JWT refresh tokens, IP addresses, browser fingerprint, device info, and enables instant admin remote session revocation. | Belongs to `users`. |
| **`payroll_batches`** | **APPROVED** | Individual salary calculation lines belong to an aggregate administrative batch. A batch provides the atomic lock boundary (`DRAFT` $\rightarrow$ `APPROVED` $\rightarrow$ `LOCKED`), preventing partial modification during bank disbursements or statutory filing. | Belongs to `agency_branches`. Has many `salary_calculations`. |
| **`candidate_interviews`** | **APPROVED** | Captures interview rounds, interviewer remarks, driving/physical skill test scores, and selection ratings before employee creation. Preserves recruitment history permanently. | Belongs to `recruitment_candidates`. |
| **`invoice_sequences`** | **APPROVED** | Provides concurrency-safe, gapless, transaction-isolated invoice and credit note numbering scoped to `{BRANCH}/{FIN_YEAR}` using database row-level locking (`SELECT FOR UPDATE`). | Belongs to `agency_branches`. |

---

## 3. Complete Production Table Definitions

### Domain 1: Agency & Branch Infrastructure

#### 1. `agencies`
The primary corporate enterprise tenant.
- `id`: `UUID` PK, default `gen_random_uuid()`
- `name`: `VARCHAR(150)` NOT NULL
- `legal_name`: `VARCHAR(200)` NOT NULL
- `registration_number`: `VARCHAR(50)` NOT NULL UNIQUE
- `pan`: `VARCHAR(10)` NOT NULL UNIQUE
- `gstin`: `VARCHAR(15)` NOT NULL UNIQUE
- `epf_code`: `VARCHAR(25)` NULL
- `esic_code`: `VARCHAR(25)` NULL
- `lin_number`: `VARCHAR(20)` NULL *(Labour Identification Number)*
- `registered_address`: `TEXT` NOT NULL
- `state_code`: `VARCHAR(2)` NOT NULL *(Indian 2-digit state code, e.g. 33 for TN, 27 for MH)*
- `phone`: `VARCHAR(20)` NOT NULL
- `email`: `VARCHAR(100)` NOT NULL
- `website`: `VARCHAR(150)` NULL
- `status`: `agency_status_enum` NOT NULL DEFAULT `'ACTIVE'`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL

#### 2. `agency_branches`
Operating offices across regions/cities managing clients and workers.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_name`: `VARCHAR(100)` NOT NULL
- `branch_code`: `VARCHAR(10)` NOT NULL *(e.g. 'TRC', 'CHN', 'BLR')*
- `gstin`: `VARCHAR(15)` NULL *(Branches in different states have separate GSTINs)*
- `state_code`: `VARCHAR(2)` NOT NULL
- `city`: `VARCHAR(50)` NOT NULL
- `address`: `TEXT` NOT NULL
- `contact_person`: `VARCHAR(100)` NOT NULL
- `contact_phone`: `VARCHAR(20)` NOT NULL
- `contact_email`: `VARCHAR(100)` NOT NULL
- `is_headquarters`: `BOOLEAN` NOT NULL DEFAULT `false`
- `is_active`: `BOOLEAN` NOT NULL DEFAULT `true`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL
- **Constraints:** `UNIQUE(agency_id, branch_code)`

#### 3. `agency_configurations`
Branch and agency level operational configuration keys.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NULL FK $\rightarrow$ `agency_branches(id)`
- `config_key`: `VARCHAR(50)` NOT NULL *(e.g. 'SALARY_DIVISOR_DAYS', 'FINANCIAL_YEAR_START')*
- `config_value`: `JSONB` NOT NULL
- `description`: `VARCHAR(255)` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(agency_id, branch_id, config_key)`

---

### Domain 2: Identity, Access Management & Security

#### 4. `users`
System administrative and operational operators.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NULL FK $\rightarrow$ `agency_branches(id)`
- `email`: `VARCHAR(150)` NOT NULL
- `password_hash`: `VARCHAR(255)` NOT NULL
- `full_name`: `VARCHAR(100)` NOT NULL
- `phone`: `VARCHAR(20)` NOT NULL
- `role_id`: `UUID` NOT NULL FK $\rightarrow$ `roles(id)`
- `status`: `user_status_enum` NOT NULL DEFAULT `'ACTIVE'`
- `failed_login_attempts`: `INT` NOT NULL DEFAULT `0`
- `locked_until`: `TIMESTAMPTZ` NULL
- `last_login_at`: `TIMESTAMPTZ` NULL
- `last_login_ip`: `VARCHAR(45)` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL
- **Constraints:** `UNIQUE(agency_id, email)`

#### 5. `roles`
Role definitions.
- `id`: `UUID` PK
- `agency_id`: `UUID` NULL FK $\rightarrow$ `agencies(id)` *(NULL denotes global system presets)*
- `name`: `VARCHAR(50)` NOT NULL
- `slug`: `VARCHAR(50)` NOT NULL
- `description`: `VARCHAR(255)` NULL
- `is_system_default`: `BOOLEAN` NOT NULL DEFAULT `false`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(agency_id, slug)`

#### 6. `permissions`
Granular authorization actions.
- `id`: `UUID` PK
- `module`: `VARCHAR(40)` NOT NULL *(e.g. 'CLIENT', 'EMPLOYEE', 'PAYROLL')*
- `action`: `VARCHAR(30)` NOT NULL *(e.g. 'CREATE', 'READ', 'APPROVE')*
- `code`: `VARCHAR(70)` NOT NULL UNIQUE *(e.g. 'CLIENT_CREATE', 'SALARY_APPROVE')*
- `description`: `VARCHAR(255)` NOT NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

#### 7. `role_permissions`
Join table for role capabilities.
- `role_id`: `UUID` NOT NULL FK $\rightarrow$ `roles(id)` ON DELETE CASCADE
- `permission_id`: `UUID` NOT NULL FK $\rightarrow$ `permissions(id)` ON DELETE CASCADE
- **PK:** `(role_id, permission_id)`

#### 8. `user_permissions`
Individual user overrides (grants or revokes on top of role).
- `id`: `UUID` PK
- `user_id`: `UUID` NOT NULL FK $\rightarrow$ `users(id)` ON DELETE CASCADE
- `permission_id`: `UUID` NOT NULL FK $\rightarrow$ `permissions(id)` ON DELETE CASCADE
- `is_granted`: `BOOLEAN` NOT NULL *(true = explicit grant, false = explicit revoke)*
- `granted_by`: `UUID` NOT NULL FK $\rightarrow$ `users(id)`
- `granted_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(user_id, permission_id)`

#### 9. `user_sessions`
JWT refresh token and device tracking for revoking compromised sessions.
- `id`: `UUID` PK
- `user_id`: `UUID` NOT NULL FK $\rightarrow$ `users(id)` ON DELETE CASCADE
- `refresh_token_hash`: `VARCHAR(255)` NOT NULL UNIQUE
- `user_agent`: `VARCHAR(255)` NULL
- `ip_address`: `VARCHAR(45)` NULL
- `expires_at`: `TIMESTAMPTZ` NOT NULL
- `is_revoked`: `BOOLEAN` NOT NULL DEFAULT `false`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `last_active_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

#### 10. `audit_logs`
Immutable record of all business and financial state mutations.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NULL FK $\rightarrow$ `agency_branches(id)`
- `user_id`: `UUID` NULL FK $\rightarrow$ `users(id)` *(NULL for system background jobs)*
- `entity_name`: `VARCHAR(60)` NOT NULL
- `entity_id`: `UUID` NOT NULL
- `action`: `audit_action_enum` NOT NULL *(CREATE, UPDATE, DELETE, APPROVE, LOCK, OVERRIDE)*
- `old_values`: `JSONB` NULL *(Sensitive fields sanitized/masked)*
- `new_values`: `JSONB` NULL *(Sensitive fields sanitized/masked)*
- `change_summary`: `VARCHAR(255)` NULL
- `ip_address`: `VARCHAR(45)` NULL
- `user_agent`: `VARCHAR(255)` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Indexes:** `(entity_name, entity_id)`, `(created_at)`, `(agency_id, user_id)`

---

### Domain 3: Client & Commercial Contracts

#### 11. `clients`
Enterprise clients contracting manpower supply services.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow$ `agency_branches(id)`
- `client_code`: `VARCHAR(20)` NOT NULL
- `company_name`: `VARCHAR(150)` NOT NULL
- `legal_name`: `VARCHAR(200)` NOT NULL
- `pan`: `VARCHAR(10)` NOT NULL
- `gstin`: `VARCHAR(15)` NOT NULL
- `state_code`: `VARCHAR(2)` NOT NULL
- `billing_address`: `TEXT` NOT NULL
- `contact_person_name`: `VARCHAR(100)` NOT NULL
- `contact_email`: `VARCHAR(100)` NOT NULL
- `contact_phone`: `VARCHAR(20)` NOT NULL
- `payment_terms_days`: `INT` NOT NULL DEFAULT `30`
- `status`: `client_status_enum` NOT NULL DEFAULT `'ACTIVE'`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL
- **Constraints:** `UNIQUE(agency_id, client_code)`, `UNIQUE(agency_id, gstin)`

#### 12. `client_sites`
Physical customer work locations where staff are deployed.
- `id`: `UUID` PK
- `client_id`: `UUID` NOT NULL FK $\rightarrow$ `clients(id)` ON DELETE RESTRICT
- `site_code`: `VARCHAR(20)` NOT NULL
- `site_name`: `VARCHAR(120)` NOT NULL
- `address`: `TEXT` NOT NULL
- `city`: `VARCHAR(50)` NOT NULL
- `state_code`: `VARCHAR(2)` NOT NULL
- `pincode`: `VARCHAR(10)` NOT NULL
- `site_supervisor_name`: `VARCHAR(100)` NULL
- `site_supervisor_phone`: `VARCHAR(20)` NULL
- `is_active`: `BOOLEAN` NOT NULL DEFAULT `true`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL
- **Constraints:** `UNIQUE(client_id, site_code)`

#### 13. `client_contracts`
Master service contracts binding commercial terms.
- `id`: `UUID` PK
- `client_id`: `UUID` NOT NULL FK $\rightarrow$ `clients(id)` ON DELETE RESTRICT
- `contract_number`: `VARCHAR(50)` NOT NULL
- `title`: `VARCHAR(150)` NOT NULL
- `start_date`: `DATE` NOT NULL
- `end_date`: `DATE` NOT NULL
- `notice_period_days`: `INT` NOT NULL DEFAULT `30`
- `billing_cycle`: `billing_cycle_enum` NOT NULL DEFAULT `'MONTHLY'`
- `status`: `contract_status_enum` NOT NULL DEFAULT `'ACTIVE'`
- `auto_renew`: `BOOLEAN` NOT NULL DEFAULT `false`
- `notes`: `TEXT` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL
- **Constraints:** `UNIQUE(client_id, contract_number)`

#### 14. `client_billing_rates`
Temporal commercial rate card for client sites and designations.
- `id`: `UUID` PK
- `client_id`: `UUID` NOT NULL FK $\rightarrow$ `clients(id)` ON DELETE RESTRICT
- `client_site_id`: `UUID` NULL FK $\rightarrow$ `client_sites(id)` *(NULL applies rate to all client sites)*
- `designation_id`: `UUID` NOT NULL FK $\rightarrow$ `designations(id)` ON DELETE RESTRICT
- `billing_model`: `billing_model_enum` NOT NULL *(MONTHLY_FIXED, PER_EMPLOYEE_PER_SHIFT, HOURLY, OVERTIME)*
- `rate_amount`: `NUMERIC(12,2)` NOT NULL
- `standard_shift_hours`: `NUMERIC(4,2)` NOT NULL DEFAULT `8.00`
- `ot_hourly_rate`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `effective_from`: `DATE` NOT NULL
- `effective_to`: `DATE` NULL *(NULL = currently open and active)*
- `is_active`: `BOOLEAN` NOT NULL DEFAULT `true`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL

---

### Domain 4: Workforce & Human Resources

#### 15. `designations`
Standardized roles supplied by the agency.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `name`: `VARCHAR(80)` NOT NULL
- `code`: `VARCHAR(20)` NOT NULL
- `category`: `designation_category_enum` NOT NULL *(DRIVER, SECURITY, HOUSEKEEPING, INDUSTRIAL, WAREHOUSE, ADMINISTRATIVE)*
- `description`: `VARCHAR(255)` NULL
- `minimum_wage_category`: `VARCHAR(40)` NULL *(UNSKILLED, SEMI_SKILLED, SKILLED, HIGHLY_SKILLED)*
- `is_active`: `BOOLEAN` NOT NULL DEFAULT `true`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL
- **Constraints:** `UNIQUE(agency_id, code)`

#### 16. `employees`
Worker master record.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow$ `agency_branches(id)`
- `employee_code`: `VARCHAR(20)` NOT NULL
- `first_name`: `VARCHAR(60)` NOT NULL
- `last_name`: `VARCHAR(60)` NOT NULL
- `gender`: `gender_enum` NOT NULL
- `date_of_birth`: `DATE` NOT NULL
- `date_of_joining`: `DATE` NOT NULL
- `date_of_leaving`: `DATE` NULL
- `primary_designation_id`: `UUID` NOT NULL FK $\rightarrow$ `designations(id)`
- `phone`: `VARCHAR(20)` NOT NULL
- `alternate_phone`: `VARCHAR(20)` NULL
- `emergency_contact_name`: `VARCHAR(100)` NOT NULL
- `emergency_contact_phone`: `VARCHAR(20)` NOT NULL
- `current_address`: `TEXT` NOT NULL
- `permanent_address`: `TEXT` NOT NULL
- `marital_status`: `marital_status_enum` NULL
- `blood_group`: `VARCHAR(5)` NULL
- `bank_name`: `VARCHAR(100)` NOT NULL
- `bank_branch`: `VARCHAR(100)` NOT NULL
- `bank_account_no_encrypted`: `VARCHAR(255)` NOT NULL
- `bank_account_no_masked`: `VARCHAR(20)` NOT NULL
- `bank_ifsc`: `VARCHAR(11)` NOT NULL
- `pan_encrypted`: `VARCHAR(255)` NULL
- `pan_masked`: `VARCHAR(10)` NULL
- `aadhaar_encrypted`: `VARCHAR(255)` NOT NULL
- `aadhaar_masked`: `VARCHAR(12)` NOT NULL
- `uan_number`: `VARCHAR(12)` NULL
- `esic_ip_number`: `VARCHAR(17)` NULL
- `recruited_candidate_id`: `UUID` NULL FK $\rightarrow$ `recruitment_candidates(id)`
- `status`: `employee_status_enum` NOT NULL DEFAULT `'ACTIVE'`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL
- **Constraints:** `UNIQUE(agency_id, employee_code)`

#### 17. `skills`
Master catalog of worker trade competencies.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `name`: `VARCHAR(80)` NOT NULL
- `category`: `VARCHAR(50)` NOT NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(agency_id, name)`

#### 18. `employee_skills`
Worker-to-Skill mapping.
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE CASCADE
- `skill_id`: `UUID` NOT NULL FK $\rightarrow$ `skills(id)` ON DELETE CASCADE
- `proficiency_level`: `proficiency_enum` NOT NULL DEFAULT `'INTERMEDIATE'`
- `years_of_experience`: `NUMERIC(3,1)` NOT NULL DEFAULT `0.0`
- `certified`: `BOOLEAN` NOT NULL DEFAULT `false`
- **PK:** `(employee_id, skill_id)`

#### 19. `employee_qualifications`
Formal educational and vocational certificates.
- `id`: `UUID` PK
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE CASCADE
- `qualification_type`: `VARCHAR(50)` NOT NULL *(10TH, 12TH, ITI, DIPLOMA, DEGREE, CERTIFICATE)*
- `degree_title`: `VARCHAR(100)` NOT NULL
- `institution_name`: `VARCHAR(150)` NOT NULL
- `year_of_passing`: `INT` NOT NULL
- `grade_percentage`: `VARCHAR(15)` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

#### 20. `employee_salary_structures`
Temporal, version-controlled worker pay packages.
- `id`: `UUID` PK
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `basic_pay`: `NUMERIC(10,2)` NOT NULL
- `dearness_allowance`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `house_rent_allowance`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `conveyance_allowance`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `special_allowance`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `overtime_rate_per_hour`: `NUMERIC(8,2)` NOT NULL DEFAULT `0.00`
- `pf_applicable`: `BOOLEAN` NOT NULL DEFAULT `true`
- `pf_opt_out_rule`: `VARCHAR(30)` NULL
- `esi_applicable`: `BOOLEAN` NOT NULL DEFAULT `true`
- `pt_applicable`: `BOOLEAN` NOT NULL DEFAULT `true`
- `lwf_applicable`: `BOOLEAN` NOT NULL DEFAULT `true`
- `effective_from`: `DATE` NOT NULL
- `effective_to`: `DATE` NULL *(NULL = active)*
- `reason_for_change`: `VARCHAR(255)` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL

#### 21. `salary_advances`
Employee loans and advance cash disbursements.
- `id`: `UUID` PK
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `advance_amount`: `NUMERIC(10,2)` NOT NULL
- `disbursed_date`: `DATE` NOT NULL
- `repayment_start_month`: `INT` NOT NULL *(1-12)*
- `repayment_start_year`: `INT` NOT NULL
- `total_installments`: `INT` NOT NULL DEFAULT `1`
- `monthly_deduction_amount`: `NUMERIC(10,2)` NOT NULL
- `recovered_amount`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `balance_remaining`: `NUMERIC(10,2)` NOT NULL
- `status`: `advance_status_enum` NOT NULL DEFAULT `'ACTIVE'` *(ACTIVE, FULLY_RECOVERED, WRITTEN_OFF)*
- `approved_by`: `UUID` NOT NULL FK $\rightarrow$ `users(id)`
- `notes`: `VARCHAR(255)` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

#### 22. `leave_types`
Configurable leave categories.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `name`: `VARCHAR(50)` NOT NULL
- `code`: `VARCHAR(15)` NOT NULL *(e.g. 'CL', 'SL', 'EL', 'LOP')*
- `days_per_year`: `NUMERIC(4,1)` NOT NULL DEFAULT `0.0`
- `is_paid`: `BOOLEAN` NOT NULL DEFAULT `true`
- `is_accumulative`: `BOOLEAN` NOT NULL DEFAULT `false`
- `is_active`: `BOOLEAN` NOT NULL DEFAULT `true`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(agency_id, code)`

#### 23. `leave_balances`
Periodic employee leave quotas and consumption counters.
- `id`: `UUID` PK
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `leave_type_id`: `UUID` NOT NULL FK $\rightarrow$ `leave_types(id)` ON DELETE RESTRICT
- `year`: `INT` NOT NULL
- `opening_balance`: `NUMERIC(4,1)` NOT NULL DEFAULT `0.0`
- `accrued_days`: `NUMERIC(4,1)` NOT NULL DEFAULT `0.0`
- `consumed_days`: `NUMERIC(4,1)` NOT NULL DEFAULT `0.0`
- `closing_balance`: `NUMERIC(4,1)` NOT NULL DEFAULT `0.0`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(employee_id, leave_type_id, year)`

#### 24. `leave_requests`
Formal staff leave applications and approval lifecycle.
- `id`: `UUID` PK
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `leave_type_id`: `UUID` NOT NULL FK $\rightarrow$ `leave_types(id)` ON DELETE RESTRICT
- `start_date`: `DATE` NOT NULL
- `end_date`: `DATE` NOT NULL
- `total_days`: `NUMERIC(4,1)` NOT NULL
- `reason`: `TEXT` NOT NULL
- `status`: `leave_status_enum` NOT NULL DEFAULT `'PENDING'` *(PENDING, APPROVED, REJECTED, CANCELLED)*
- `reviewed_by`: `UUID` NULL FK $\rightarrow$ `users(id)`
- `reviewed_at`: `TIMESTAMPTZ` NULL
- `reviewer_comments`: `VARCHAR(255)` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL

---

### Domain 5: Fleet & Vehicle Management

#### 25. `vehicles`
Client-dedicated or agency-owned commercial vehicle fleet.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow$ `agency_branches(id)`
- `client_id`: `UUID` NULL FK $\rightarrow$ `clients(id)` *(Optional client dedicated)*
- `vehicle_registration_number`: `VARCHAR(20)` NOT NULL
- `vehicle_make`: `VARCHAR(50)` NOT NULL
- `vehicle_model`: `VARCHAR(50)` NOT NULL
- `vehicle_type`: `vehicle_type_enum` NOT NULL *(SEDAN, SUV, BUS, VAN, TRUCK, AUTO)*
- `fuel_type`: `fuel_type_enum` NOT NULL *(DIESEL, PETROL, CNG, ELECTRIC)*
- `chassis_number`: `VARCHAR(50)` NOT NULL
- `engine_number`: `VARCHAR(50)` NOT NULL
- `manufacturing_year`: `INT` NOT NULL
- `current_odometer_km`: `INT` NOT NULL DEFAULT `0`
- `status`: `vehicle_status_enum` NOT NULL DEFAULT `'AVAILABLE'` *(AVAILABLE, ASSIGNED, UNDER_MAINTENANCE, GROUNDED)*
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL
- **Constraints:** `UNIQUE(agency_id, vehicle_registration_number)`

#### 26. `vehicle_assignments`
Temporal driver allocation and vehicle handover audit.
- `id`: `UUID` PK
- `vehicle_id`: `UUID` NOT NULL FK $\rightarrow$ `vehicles(id)` ON DELETE RESTRICT
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `client_site_id`: `UUID` NULL FK $\rightarrow$ `client_sites(id)`
- `start_datetime`: `TIMESTAMPTZ` NOT NULL
- `end_datetime`: `TIMESTAMPTZ` NULL *(NULL = active driver assignment)*
- `start_odometer_km`: `INT` NOT NULL
- `end_odometer_km`: `INT` NULL
- `handover_condition_notes`: `TEXT` NULL
- `return_condition_notes`: `TEXT` NULL
- `reason_for_change`: `VARCHAR(255)` NULL
- `assigned_by`: `UUID` NOT NULL FK $\rightarrow$ `users(id)`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL

---

### Domain 6: Operations, Scheduling & Attendance

#### 27. `employee_deployments`
Core dispatch assignment mapping workers to customer locations.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow$ `agency_branches(id)`
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `client_id`: `UUID` NOT NULL FK $\rightarrow$ `clients(id)` ON DELETE RESTRICT
- `client_site_id`: `UUID` NOT NULL FK $\rightarrow$ `client_sites(id)` ON DELETE RESTRICT
- `designation_id`: `UUID` NOT NULL FK $\rightarrow$ `designations(id)` ON DELETE RESTRICT
- `shift_name`: `VARCHAR(40)` NOT NULL DEFAULT `'GENERAL'` *(e.g. 'MORNING', 'NIGHT')*
- `shift_start_time`: `TIME` NOT NULL DEFAULT `'09:00:00'`
- `shift_end_time`: `TIME` NOT NULL DEFAULT `'18:00:00'`
- `is_night_shift`: `BOOLEAN` NOT NULL DEFAULT `false`
- `start_date`: `DATE` NOT NULL
- `end_date`: `DATE` NULL *(NULL = active open deployment)*
- `billing_rate_id`: `UUID` NOT NULL FK $\rightarrow$ `client_billing_rates(id)`
- `salary_structure_id`: `UUID` NOT NULL FK $\rightarrow$ `employee_salary_structures(id)`
- `vehicle_id`: `UUID` NULL FK $\rightarrow$ `vehicles(id)`
- `status`: `deployment_status_enum` NOT NULL DEFAULT `'ACTIVE'` *(ACTIVE, TRANSFERRED, REPLACED, COMPLETED)*
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL

#### 28. `deployment_shifts`
Roster matrix defining which days of the week the deployment operates.
- `id`: `UUID` PK
- `deployment_id`: `UUID` NOT NULL FK $\rightarrow$ `employee_deployments(id)` ON DELETE CASCADE
- `day_of_week`: `INT` NOT NULL *(0 = Sunday, 1 = Monday, ..., 6 = Saturday)*
- `is_scheduled_workday`: `BOOLEAN` NOT NULL DEFAULT `true`
- **Constraints:** `UNIQUE(deployment_id, day_of_week)`

#### 29. `attendances`
Daily operational shift attendance record.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow$ `agency_branches(id)`
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `deployment_id`: `UUID` NOT NULL FK $\rightarrow$ `employee_deployments(id)` ON DELETE RESTRICT
- `client_id`: `UUID` NOT NULL FK $\rightarrow$ `clients(id)` ON DELETE RESTRICT
- `client_site_id`: `UUID` NOT NULL FK $\rightarrow$ `client_sites(id)` ON DELETE RESTRICT
- `shift_business_date`: `DATE` NOT NULL *(Anchor date for night shifts)*
- `clock_in_time`: `TIMESTAMPTZ` NULL
- `clock_out_time`: `TIMESTAMPTZ` NULL
- `status`: `attendance_status_enum` NOT NULL DEFAULT `'PRESENT'` *(PRESENT, ABSENT, HALF_DAY, PAID_LEAVE, UNPAID_LEAVE, WEEK_OFF, HOLIDAY)*
- `scheduled_hours`: `NUMERIC(4,2)` NOT NULL DEFAULT `8.00`
- `worked_hours`: `NUMERIC(4,2)` NOT NULL DEFAULT `8.00`
- `overtime_hours`: `NUMERIC(4,2)` NOT NULL DEFAULT `0.00`
- `recorded_method`: `attendance_method_enum` NOT NULL DEFAULT `'WEB_MANUAL'` *(WEB_MANUAL, TABLET_MANUAL, CSV_IMPORT, BIOMETRIC, MOBILE_GPS)*
- `recorded_by`: `UUID` NOT NULL FK $\rightarrow$ `users(id)`
- `supervisor_remarks`: `VARCHAR(255)` NULL
- `is_approved`: `BOOLEAN` NOT NULL DEFAULT `false`
- `approved_by`: `UUID` NULL FK $\rightarrow$ `users(id)`
- `is_locked`: `BOOLEAN` NOT NULL DEFAULT `false` *(Set to true when payroll batch is approved)*
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(employee_id, shift_business_date)`
- **Indexes:** `(shift_business_date, client_id)`, `(employee_id, shift_business_date)`

#### 30. `replacements`
Emergency and scheduled stand-in workers for absent or on-leave staff.
- `id`: `UUID` PK
- `original_deployment_id`: `UUID` NOT NULL FK $\rightarrow$ `employee_deployments(id)` ON DELETE RESTRICT
- `absent_employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `replacement_employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `start_date`: `DATE` NOT NULL
- `end_date`: `DATE` NOT NULL
- `replacement_type`: `replacement_type_enum` NOT NULL *(TEMPORARY, PERMANENT)*
- `reason`: `TEXT` NOT NULL
- `status`: `replacement_status_enum` NOT NULL DEFAULT `'DISPATCHED'` *(DISPATCHED, COMPLETED, CANCELLED)*
- `dispatched_by`: `UUID` NOT NULL FK $\rightarrow$ `users(id)`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

---

### Domain 7: Statutory Compliance & Payroll Engine

#### 31. `statutory_rules`
Indian version-controlled compliance rule configuration.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `rule_type`: `statutory_rule_type_enum` NOT NULL *(EPF, ESIC, PROFESSIONAL_TAX, LWF)*
- `state_code`: `VARCHAR(2)` NULL *(State code for PT and LWF; NULL for federal EPF/ESIC)*
- `effective_from`: `DATE` NOT NULL
- `effective_to`: `DATE` NULL *(NULL = currently active)*
- `wage_ceiling`: `NUMERIC(10,2)` NULL *(e.g. 15000.00 for EPF, 21000.00 for ESIC)*
- `employee_contribution_pct`: `NUMERIC(5,3)` NOT NULL *(e.g. 12.000 for EPF, 0.750 for ESIC)*
- `employer_contribution_pct`: `NUMERIC(5,3)` NOT NULL *(e.g. 12.000 for EPF, 3.250 for ESIC)*
- `calculation_method`: `statutory_calc_method_enum` NOT NULL *(PERCENTAGE_ON_GROSS, PERCENTAGE_ON_BASIC_DA, SLAB_BASED, FIXED_AMOUNT)*
- `rounding_method`: `rounding_method_enum` NOT NULL DEFAULT `'NEAREST_INTEGER'` *(NEAREST_INTEGER, ROUND_UP, ROUND_DOWN, EXACT)*
- `rule_config`: `JSONB` NOT NULL *(Contains sub-breakdowns e.g. EPS 8.33%, EPF 3.67%, EDLI 0.5%, Admin 0.5%, or PT monthly slabs)*
- `is_active`: `BOOLEAN` NOT NULL DEFAULT `true`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

#### 32. `payroll_batches`
Administrative processing batch for monthly wages.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow$ `agency_branches(id)`
- `batch_number`: `VARCHAR(30)` NOT NULL UNIQUE *(e.g. 'PAY-CHN-2026-10')*
- `month`: `INT` NOT NULL *(1 - 12)*
- `year`: `INT` NOT NULL *(e.g. 2026)*
- `total_employees`: `INT` NOT NULL DEFAULT `0`
- `total_gross_wages`: `NUMERIC(14,2)` NOT NULL DEFAULT `0.00`
- `total_deductions`: `NUMERIC(14,2)` NOT NULL DEFAULT `0.00`
- `total_net_wages`: `NUMERIC(14,2)` NOT NULL DEFAULT `0.00`
- `status`: `payroll_batch_status_enum` NOT NULL DEFAULT `'DRAFT'` *(DRAFT, REVIEWED, APPROVED, LOCKED)*
- `approved_by`: `UUID` NULL FK $\rightarrow$ `users(id)`
- `approved_at`: `TIMESTAMPTZ` NULL
- `locked_at`: `TIMESTAMPTZ` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(branch_id, month, year)`

#### 33. `salary_calculations`
Detailed monthly wage calculation for an individual employee.
- `id`: `UUID` PK
- `payroll_batch_id`: `UUID` NOT NULL FK $\rightarrow$ `payroll_batches(id)` ON DELETE RESTRICT
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `salary_structure_id`: `UUID` NOT NULL FK $\rightarrow$ `employee_salary_structures(id)`
- `month`: `INT` NOT NULL
- `year`: `INT` NOT NULL
- `total_calendar_days`: `INT` NOT NULL
- `present_days`: `NUMERIC(4,1)` NOT NULL
- `paid_leave_days`: `NUMERIC(4,1)` NOT NULL
- `unpaid_leave_days`: `NUMERIC(4,1)` NOT NULL *(LOP)*
- `week_off_days`: `NUMERIC(4,1)` NOT NULL
- `payable_days`: `NUMERIC(4,1)` NOT NULL
- `overtime_hours`: `NUMERIC(5,2)` NOT NULL DEFAULT `0.00`
- `basic_earned`: `NUMERIC(10,2)` NOT NULL
- `da_earned`: `NUMERIC(10,2)` NOT NULL
- `hra_earned`: `NUMERIC(10,2)` NOT NULL
- `conveyance_earned`: `NUMERIC(10,2)` NOT NULL
- `special_allowance_earned`: `NUMERIC(10,2)` NOT NULL
- `overtime_amount`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `gross_salary`: `NUMERIC(10,2)` NOT NULL
- `epf_employee`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `epf_employer`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `epf_eps_employer`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `esic_employee`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `esic_employer`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `professional_tax`: `NUMERIC(8,2)` NOT NULL DEFAULT `0.00`
- `lwf_employee`: `NUMERIC(8,2)` NOT NULL DEFAULT `0.00`
- `advance_deduction`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `other_deductions`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `total_deductions`: `NUMERIC(10,2)` NOT NULL
- `net_salary`: `NUMERIC(10,2)` NOT NULL
- `bank_account_no_snapshot`: `VARCHAR(20)` NOT NULL
- `bank_ifsc_snapshot`: `VARCHAR(11)` NOT NULL
- `payment_status`: `salary_payment_status_enum` NOT NULL DEFAULT `'PENDING'` *(PENDING, PAID, FAILED)*
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(payroll_batch_id, employee_id)`

#### 34. `payslips`
Immutable digital payslip archive.
- `id`: `UUID` PK
- `salary_calculation_id`: `UUID` NOT NULL FK $\rightarrow$ `salary_calculations(id)` ON DELETE RESTRICT UNIQUE
- `employee_id`: `UUID` NOT NULL FK $\rightarrow$ `employees(id)` ON DELETE RESTRICT
- `payslip_number`: `VARCHAR(35)` NOT NULL UNIQUE *(e.g. 'PS-TRC-202610-00142')*
- `month`: `INT` NOT NULL
- `year`: `INT` NOT NULL
- `snapshot_data`: `JSONB` NOT NULL *(Complete immutable audit snapshot of all salary figures)*
- `pdf_storage_key`: `VARCHAR(255)` NULL
- `is_published`: `BOOLEAN` NOT NULL DEFAULT `false`
- `published_at`: `TIMESTAMPTZ` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

---

### Domain 8: Client Invoicing & Receivables

#### 35. `invoice_sequences`
Transactional sequence counter ensuring concurrency-safe, gapless billing numbers.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow$ `agency_branches(id)`
- `financial_year`: `VARCHAR(7)` NOT NULL *(e.g. '2026-27')*
- `document_type`: `VARCHAR(10)` NOT NULL *(INV, CRN, DBN)*
- `last_sequence`: `INT` NOT NULL DEFAULT `0`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(branch_id, financial_year, document_type)`

#### 36. `client_invoices`
Formal GST commercial tax invoices.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow$ `agency_branches(id)`
- `client_id`: `UUID` NOT NULL FK $\rightarrow$ `clients(id)` ON DELETE RESTRICT
- `contract_id`: `UUID` NULL FK $\rightarrow` `client_contracts(id)`
- `invoice_number`: `VARCHAR(35)` NOT NULL UNIQUE *(e.g. 'TRC/INV/2026-27/0001')*
- `invoice_date`: `DATE` NOT NULL
- `due_date`: `DATE` NOT NULL
- `billing_period_start`: `DATE` NOT NULL
- `billing_period_end`: `DATE` NOT NULL
- `subtotal_amount`: `NUMERIC(14,2)` NOT NULL
- `is_interstate`: `BOOLEAN` NOT NULL DEFAULT `false`
- `cgst_rate`: `NUMERIC(5,2)` NOT NULL DEFAULT `0.00`
- `cgst_amount`: `NUMERIC(12,2)` NOT NULL DEFAULT `0.00`
- `sgst_rate`: `NUMERIC(5,2)` NOT NULL DEFAULT `0.00`
- `sgst_amount`: `NUMERIC(12,2)` NOT NULL DEFAULT `0.00`
- `igst_rate`: `NUMERIC(5,2)` NOT NULL DEFAULT `0.00`
- `igst_amount`: `NUMERIC(12,2)` NOT NULL DEFAULT `0.00`
- `total_tax_amount`: `NUMERIC(12,2)` NOT NULL DEFAULT `0.00`
- `round_off`: `NUMERIC(5,2)` NOT NULL DEFAULT `0.00`
- `total_invoice_amount`: `NUMERIC(14,2)` NOT NULL
- `paid_amount`: `NUMERIC(14,2)` NOT NULL DEFAULT `0.00`
- `credit_adjustment_amount`: `NUMERIC(14,2)` NOT NULL DEFAULT `0.00`
- `balance_due`: `NUMERIC(14,2)` NOT NULL
- `status`: `invoice_status_enum` NOT NULL DEFAULT `'DRAFT'` *(DRAFT, APPROVED, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED)*
- `is_locked`: `BOOLEAN` NOT NULL DEFAULT `false`
- `approved_by`: `UUID` NULL FK $\rightarrow$ `users(id)`
- `pdf_storage_key`: `VARCHAR(255)` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL

#### 37. `client_invoice_items`
Individual line items on the invoice (shift/hour breakdown).
- `id`: `UUID` PK
- `invoice_id`: `UUID` NOT NULL FK $\rightarrow$ `client_invoices(id)` ON DELETE CASCADE
- `client_site_id`: `UUID` NOT NULL FK $\rightarrow$ `client_sites(id)`
- `designation_id`: `UUID` NOT NULL FK $\rightarrow$ `designations(id)`
- `billing_rate_id`: `UUID` NOT NULL FK $\rightarrow$ `client_billing_rates(id)`
- `description`: `VARCHAR(255)` NOT NULL
- `billing_model`: `billing_model_enum` NOT NULL
- `quantity_shifts_or_hours`: `NUMERIC(8,2)` NOT NULL
- `rate_applied`: `NUMERIC(10,2)` NOT NULL
- `overtime_hours`: `NUMERIC(8,2)` NOT NULL DEFAULT `0.00`
- `overtime_rate`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `line_total`: `NUMERIC(12,2)` NOT NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

#### 38. `invoice_adjustments`
Statutory GST Credit Notes & Debit Notes for finalized invoices.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow$ `agency_branches(id)`
- `invoice_id`: `UUID` NOT NULL FK $\rightarrow$ `client_invoices(id)` ON DELETE RESTRICT
- `note_number`: `VARCHAR(35)` NOT NULL UNIQUE *(e.g. 'TRC/CRN/2026-27/0001')*
- `note_type`: `invoice_adjustment_type_enum` NOT NULL *(CREDIT_NOTE, DEBIT_NOTE)*
- `issue_date`: `DATE` NOT NULL
- `reason`: `VARCHAR(255)` NOT NULL
- `subtotal_amount`: `NUMERIC(12,2)` NOT NULL
- `cgst_amount`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `sgst_amount`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `igst_amount`: `NUMERIC(10,2)` NOT NULL DEFAULT `0.00`
- `total_amount`: `NUMERIC(12,2)` NOT NULL
- `approved_by`: `UUID` NOT NULL FK $\rightarrow$ `users(id)`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

#### 39. `client_payments`
Customer payment remittances, NEFT transfers, and TDS certificates.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow$ `agency_branches(id)`
- `client_id`: `UUID` NOT NULL FK $\rightarrow$ `clients(id)` ON DELETE RESTRICT
- `invoice_id`: `UUID` NOT NULL FK $\rightarrow$ `client_invoices(id)` ON DELETE RESTRICT
- `payment_date`: `DATE` NOT NULL
- `amount_received`: `NUMERIC(14,2)` NOT NULL
- `tds_deducted`: `NUMERIC(12,2)` NOT NULL DEFAULT `0.00` *(TDS u/s 194C)*
- `payment_mode`: `payment_mode_enum` NOT NULL *(NEFT, RTGS, CHEQUE, UPI, CASH)*
- `reference_transaction_id`: `VARCHAR(100)` NOT NULL
- `bank_name`: `VARCHAR(100)` NULL
- `recorded_by`: `UUID` NOT NULL FK $\rightarrow$ `users(id)`
- `notes`: `VARCHAR(255)` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

---

### Domain 9: Document Management & Expiry Engine

#### 40. `document_types`
Master registry of compliance document categories.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `name`: `VARCHAR(80)` NOT NULL
- `code`: `VARCHAR(30)` NOT NULL *(e.g. 'AADHAAR', 'DRIVING_LICENSE', 'VEHICLE_RC', 'POLICE_VERIFICATION')*
- `applicable_entity`: `document_entity_type_enum` NOT NULL *(EMPLOYEE, VEHICLE, CLIENT, CANDIDATE)*
- `is_mandatory`: `BOOLEAN` NOT NULL DEFAULT `false`
- `requires_expiry_date`: `BOOLEAN` NOT NULL DEFAULT `false`
- `default_alert_days`: `INT[]` NOT NULL DEFAULT `'{60, 30, 15, 7}'`
- `is_active`: `BOOLEAN` NOT NULL DEFAULT `true`
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(agency_id, code)`

#### 41. `documents`
Encrypted file metadata and verification state.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `document_type_id`: `UUID` NOT NULL FK $\rightarrow$ `document_types(id)` ON DELETE RESTRICT
- `entity_type`: `document_entity_type_enum` NOT NULL
- `entity_id`: `UUID` NOT NULL
- `document_number`: `VARCHAR(100)` NULL
- `issue_date`: `DATE` NULL
- `expiry_date`: `DATE` NULL
- `s3_storage_key`: `VARCHAR(255)` NOT NULL
- `original_file_name`: `VARCHAR(150)` NOT NULL
- `file_size_bytes`: `INT` NOT NULL
- `mime_type`: `VARCHAR(60)` NOT NULL
- `verification_status`: `verification_status_enum` NOT NULL DEFAULT `'PENDING'` *(PENDING, VERIFIED, REJECTED)*
- `verified_by`: `UUID` NULL FK $\rightarrow$ `users(id)`
- `verified_at`: `TIMESTAMPTZ` NULL
- `rejection_reason`: `VARCHAR(255)` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL
- **Indexes:** `(entity_type, entity_id)`, `(expiry_date)`

#### 42. `expiry_alerts`
Triggered compliance alarms for upcoming expiration dates.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `document_id`: `UUID` NOT NULL FK $\rightarrow$ `documents(id)` ON DELETE CASCADE
- `entity_type`: `document_entity_type_enum` NOT NULL
- `entity_id`: `UUID` NOT NULL
- `expiry_date`: `DATE` NOT NULL
- `alert_threshold_days`: `INT` NOT NULL *(e.g. 60, 30, 15, 7, 0)*
- `scheduled_alert_date`: `DATE` NOT NULL
- `status`: `expiry_alert_status_enum` NOT NULL DEFAULT `'SCHEDULED'` *(SCHEDULED, SENT, ACKNOWLEDGED, RESOLVED)*
- `sent_at`: `TIMESTAMPTZ` NULL
- `acknowledged_by`: `UUID` NULL FK $\rightarrow$ `users(id)`
- `acknowledged_at`: `TIMESTAMPTZ` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Constraints:** `UNIQUE(document_id, alert_threshold_days)`
- **Indexes:** `(scheduled_alert_date, status)`

---

### Domain 10: Recruitment Pipeline

#### 43. `recruitment_candidates`
Applicants moving through trade qualification and screening.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `branch_id`: `UUID` NOT NULL FK $\rightarrow` `agency_branches(id)`
- `candidate_code`: `VARCHAR(20)` NOT NULL UNIQUE
- `first_name`: `VARCHAR(60)` NOT NULL
- `last_name`: `VARCHAR(60)` NOT NULL
- `phone`: `VARCHAR(20)` NOT NULL
- `alternate_phone`: `VARCHAR(20)` NULL
- `email`: `VARCHAR(100)` NULL
- `primary_designation_id`: `UUID` NOT NULL FK $\rightarrow$ `designations(id)`
- `years_of_experience`: `NUMERIC(3,1)` NOT NULL DEFAULT `0.0`
- `current_city`: `VARCHAR(50)` NOT NULL
- `status`: `recruitment_status_enum` NOT NULL DEFAULT `'APPLIED'` *(APPLIED, SCREENING, INTERVIEW_SCHEDULED, SKILL_TEST_PASSED, DOCUMENT_VERIFIED, SELECTED, OFFERED, HIRED, REJECTED)*
- `converted_to_employee_id`: `UUID` NULL FK $\rightarrow$ `employees(id)`
- `hired_at`: `TIMESTAMPTZ` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `updated_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- `deleted_at`: `TIMESTAMPTZ` NULL

#### 44. `candidate_interviews`
Evaluation sessions, trade tests (driving, physical, tool handling).
- `id`: `UUID` PK
- `candidate_id`: `UUID` NOT NULL FK $\rightarrow$ `recruitment_candidates(id)` ON DELETE CASCADE
- `interviewer_user_id`: `UUID` NOT NULL FK $\rightarrow$ `users(id)`
- `stage_name`: `VARCHAR(50)` NOT NULL *(e.g. 'DRIVING_TEST', 'PHYSICAL_FITNESS', 'HR_ROUND')*
- `scheduled_at`: `TIMESTAMPTZ` NOT NULL
- `completed_at`: `TIMESTAMPTZ` NULL
- `score`: `NUMERIC(4,1)` NULL *(e.g. 8.5 / 10.0)*
- `result`: `interview_result_enum` NOT NULL DEFAULT `'PENDING'` *(PENDING, PASSED, FAILED, RESCHEDULED)*
- `evaluation_notes`: `TEXT` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`

---

### Domain 11: Notification Hub

#### 45. `notifications`
In-app and cross-channel operational alerts.
- `id`: `UUID` PK
- `agency_id`: `UUID` NOT NULL FK $\rightarrow$ `agencies(id)`
- `user_id`: `UUID` NOT NULL FK $\rightarrow$ `users(id)` ON DELETE CASCADE
- `title`: `VARCHAR(120)` NOT NULL
- `body`: `TEXT` NOT NULL
- `category`: `notification_category_enum` NOT NULL *(EXPIRY, ATTENDANCE, REPLACEMENT, BILLING, SYSTEM)*
- `action_url`: `VARCHAR(255)` NULL
- `is_read`: `BOOLEAN` NOT NULL DEFAULT `false`
- `read_at`: `TIMESTAMPTZ` NULL
- `created_at`: `TIMESTAMPTZ` NOT NULL DEFAULT `CURRENT_TIMESTAMP`
- **Indexes:** `(user_id, is_read)`, `(created_at)`

---

## 4. PostgreSQL Temporal Constraints & Overlap Prevention

In manpower supply operations, overlapping active intervals corrupt payroll, billing, and operational safety.

### 4.1 Required Overlap Protections
1. **Employee Deployments:** An employee cannot have two active deployments on the same date.
2. **Vehicle Assignments:** A vehicle cannot be assigned to two drivers simultaneously.
3. **Employee Salary Structures:** An employee cannot have two salary packages active for the same effective date.
4. **Client Billing Rates:** A client cannot have two active rate cards for the same designation and site on the same date.
5. **Statutory Rules:** A jurisdiction cannot have two overlapping rule periods for the same statutory type.

### 4.2 PostgreSQL Exclusion Constraint Implementation
We utilize the PostgreSQL `btree_gist` extension with range types:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Employee Deployment Overlap Prevention:
ALTER TABLE employee_deployments 
ADD CONSTRAINT exclude_employee_deployment_overlap 
EXCLUDE USING gist (
  employee_id WITH =,
  daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
) WHERE (deleted_at IS NULL AND status = 'ACTIVE');

-- 2. Vehicle Assignment Overlap Prevention:
ALTER TABLE vehicle_assignments 
ADD CONSTRAINT exclude_vehicle_assignment_overlap 
EXCLUDE USING gist (
  vehicle_id WITH =,
  tstzrange(start_datetime, COALESCE(end_datetime, 'infinity'::timestamptz), '[]') WITH &&
) WHERE (deleted_at IS NULL);

-- 3. Employee Salary Structure Overlap Prevention:
ALTER TABLE employee_salary_structures 
ADD CONSTRAINT exclude_employee_salary_structure_overlap 
EXCLUDE USING gist (
  employee_id WITH =,
  daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
) WHERE (deleted_at IS NULL);

-- 4. Client Billing Rate Overlap Prevention:
ALTER TABLE client_billing_rates 
ADD CONSTRAINT exclude_client_billing_rate_overlap 
EXCLUDE USING gist (
  client_id WITH =,
  designation_id WITH =,
  COALESCE(client_site_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
  billing_model WITH =,
  daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
) WHERE (deleted_at IS NULL AND is_active = true);
```

### 4.3 Application-Layer Pre-validation
Because Prisma CLI does not automatically generate `EXCLUDE USING gist` syntax directly in standard schema definitions, we handle temporal constraints via a two-layer defense:
1. **Database Migration:** Raw SQL migration script executed via `prisma migrate` creates the authoritative GIST exclusion constraints.
2. **Service Layer Validation:** Before issuing insert/update transactions, the NestJS domain service runs an explicit overlap collision check and returns clear, user-friendly HTTP 409 Conflict errors with the conflicting dates.

---

## 5. Security & Sensitive Data Strategy

### 5.1 Field Classification
| Field Name | Storage Approach | Masking Format | Permitted Roles |
| :--- | :--- | :--- | :--- |
| **Aadhaar Number** | Encrypted (AES-256-GCM) + Masked | `XXXXXXXX1234` | Only HR Officer & Super Admin can decrypt |
| **PAN Card** | Encrypted (AES-256-GCM) + Masked | `XXXXX1234F` | Accounts & Super Admin |
| **Bank Account No** | Encrypted (AES-256-GCM) + Masked | `XXXXXX7890` | Accounts & Super Admin |
| **Bank IFSC Code** | Plaintext (Public directory) | None | All Operational Staff |
| **UAN & ESIC No** | Plaintext (Required for ECR returns)| None | HR, Accounts |

### 5.2 Encryption Implementation
- Master encryption key stored in environment variables (`DATABASE_ENCRYPTION_KEY_256`).
- Decryption occurs dynamically in memory inside the NestJS service layer for authorized requests only.
- In audit logs, encrypted or sensitive fields are **strictly excluded** or logged as `[REDACTED]`.

---

## 6. Concurrency-Safe Invoice Numbering Strategy

In multi-branch operations, duplicate invoice numbers violate GST compliance and legal validity.

### 6.1 Format
`{BRANCH_CODE}/INV/{FINANCIAL_YEAR}/{SEQUENCE_4_DIGITS}`  
Examples:
- `TRC/INV/2026-27/0001`
- `CHN/INV/2026-27/0002`
- `TRC/CRN/2026-27/0001` (Credit Note)

### 6.2 Concurrency Algorithm (`invoice_sequences`)
Invoice generation executes inside an isolated PostgreSQL transaction using pessimistic row locking:

```typescript
// NestJS Billing Transaction
return await this.prisma.$transaction(async (tx) => {
  // 1. Lock the sequence row for this branch, fiscal year, and doc type
  const sequenceRecord = await tx.$queryRaw`
    SELECT id, last_sequence 
    FROM invoice_sequences 
    WHERE branch_id = ${branchId} 
      AND financial_year = ${financialYear} 
      AND document_type = ${docType} 
    FOR UPDATE
  `;

  // 2. Increment sequence atomically
  const nextSeq = sequenceRecord[0].last_sequence + 1;
  await tx.invoice_sequences.update({
    where: { id: sequenceRecord[0].id },
    data: { last_sequence: nextSeq }
  });

  // 3. Format invoice number
  const formattedNumber = `${branchCode}/${docType}/${financialYear}/${String(nextSeq).padStart(4, '0')}`;

  // 4. Create invoice with guaranteed unique, gapless number
  return await tx.client_invoices.create({
    data: {
      invoice_number: formattedNumber,
      // ... invoice payload
    }
  });
});
```

---

## 7. Soft-Delete & Audit Strategy

### 7.1 Soft-Delete Rules
1. **Never Hard Delete:** Core business records (`clients`, `employees`, `vehicles`, `contracts`, `deployments`, `invoices`, `salary_calculations`, `documents`) are soft-deleted via `deleted_at: TIMESTAMPTZ`.
2. **Hard Delete Prohibited for Finalized Financials:** Finalized invoices (`is_locked = true`) and approved payroll batches cannot be deleted—even soft deletion is rejected by service-layer guards.
3. **Prisma Middleware / Client Extensions:** Soft-deleted records are automatically filtered out using Prisma Client extensions (`$use` or Prisma Client Extensions where `deleted_at: null`).

### 7.2 Audit Trail Architecture
Every update and status transition logs into `audit_logs`:
- **Captured:** `user_id`, `branch_id`, `entity_name`, `entity_id`, `action`, `ip_address`, `user_agent`.
- **JSON Diffs:** `old_values` and `new_values` capture JSON object state changes.
- **Sanitization Pipeline:** Passwords, full Aadhaar, full bank account numbers, and token hashes are stripped before JSON serialization.

---

## 8. Initial Seed Data Plan

The automated seed runner (`prisma/seed.ts`) will initialize:
1. **Standard System Roles:** `Super Admin`, `Branch Manager`, `Operations Coordinator`, `Payroll & Accounts Officer`, `HR & Compliance Officer`, `Field Supervisor`.
2. **Granular Permissions Matrix:** 45 pre-defined system permissions across 12 modules.
3. **Standard Designation Categories:** Driver (Heavy, Light), Security (Guard, Armed, Supervisor), Housekeeping, Warehouse Helper, Administrative.
4. **Common Leave Types:** Casual Leave (CL), Sick Leave (SL), Earned Leave (EL), Loss of Pay (LOP).
5. **Document Type Registry:** Aadhaar Card, PAN Card, Driving License (Commercial Badge), Police Clearance Certificate, Vehicle RC, Vehicle Fitness Certificate, Vehicle Commercial Insurance, Pollution Under Control (PUC), Client Service Agreement.
6. **Statutory Rule Templates (Configurable Shells):**
   - EPF India Template (Employee 12%, Employer 12% split into 8.33% EPS + 3.67% EPF, ceiling Rs. 15,000).
   - ESIC India Template (Employee 0.75%, Employer 3.25%, ceiling Rs. 21,000).
   - Tamil Nadu / Maharashtra / Karnataka Professional Tax slab templates.
   - Labour Welfare Fund (LWF) state templates.
   *(Note: Seed values are marked as sample templates; production users must verify and activate based on latest government gazette).*
7. **Agency Configuration Defaults:** Standard 26-day monthly divisor, standard 8-hour shift, 30-day default payment terms.
