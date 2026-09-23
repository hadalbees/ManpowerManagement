# Financial Engine Documentation (Phase 4)

## 1. Architectural Architecture & Engine Separation

The Financial Engine implements two strictly isolated and decoupled engines in full compliance with commercial agency and labour law requirements:

1. **Engine A — Employee Payroll & Statutory Compliance**:
   - Computes employee earnings, statutory compliance deductions (EPF, ESIC, Professional Tax, Labour Welfare Fund, TDS), overtime pay, and loan/advance recoveries.
   - Generates and publishes immutable, versioned statutory payslips (`{BRANCH}/PAY/{YYYYMM}/{SEQ}`).
   - **Isolation Invariant**: Employee salary calculation NEVER reads or derives from client billing rates or contract invoices.

2. **Engine B — Client Commercial Billing & Invoicing**:
   - Generates GST-compliant commercial tax invoices (`{BRANCH}/INV/{FINANCIAL_YEAR}/{SEQ}`).
   - Supports 4 commercial models: `MONTHLY_FIXED`, `PER_EMPLOYEE_PER_SHIFT`, `HOURLY`, and `OVERTIME`.
   - Handles GST tax classification:
     - **Intra-state** (Agency Branch State = Client Place of Supply): CGST (9%) + SGST (9%).
     - **Inter-state** (Agency Branch State ≠ Client Place of Supply): IGST (18%).
   - Supports Credit & Debit Adjustments (`{BRANCH}/ADJ/{FINANCIAL_YEAR}/{SEQ}`) and Client Payment Receipts with TDS withholding.
   - **Isolation Invariant**: Client invoices NEVER read or derive from employee internal wages or salary structures.

---

## 2. Replacement Shift Invariant

When an employee is on leave and a replacement worker is dispatched:
- The attendance record has:
  ```json
  {
    "employeeId": "replacement-worker-id",
    "deploymentId": "original-client-deployment-id",
    "status": "PRESENT"
  }
  ```
- **Engine A**: Aggregates this shift strictly for the replacement worker (`employeeId`), paying them using their own salary structure and bank account. The original employee retains unpaid leave on that date and is never double-paid.
- **Engine B**: Aggregates the deployment shift against the client site contract rate. The client is billed once for the post coverage without duplicate billing.

---

## 3. Statutory Compliance Rules

All statutory deduction rules are stored in `StatutoryComplianceRule` and configured by agency and state:

| Statutory Rule | Calculation Method | Rules & Ceilings |
| :--- | :--- | :--- |
| **EPF (Employee)** | `PERCENTAGE_OF_BASIC` | 12% on (Basic Pay + DA). Statutory wage ceiling: ₹15,000/month. |
| **EPS / EPF (Employer)** | `PERCENTAGE_OF_BASIC` | 12% split into 8.33% EPS (capped at ₹1,250) + 3.67% EPF. |
| **ESIC (Employee)** | `PERCENTAGE_OF_GROSS` | 0.75% on Gross Wages. Wage ceiling: ₹21,000/month (exempt if gross > ₹21,000). |
| **ESIC (Employer)** | `PERCENTAGE_OF_GROSS` | 3.25% on Gross Wages (for eligible employees). |
| **Professional Tax (PT)** | `SLAB_BASED` | State-specific slabs (e.g. Tamil Nadu half-yearly/monthly municipal corporation slabs). |
| **Labour Welfare Fund (LWF)** | `FIXED_AMOUNT` | Fixed statutory employee and employer contribution (e.g., ₹20). |
| **Rounding Engine** | Configurable | Supports `NEAREST_INTEGER`, `ROUND_UP`, `ROUND_DOWN`, and `EXACT` (2 decimal places). |

---

## 4. Sequential Numbering Schemes

Atomic sequential counters are maintained per branch and financial year via `InvoiceSequence`:

- **Payroll Batches**: `{BRANCH_CODE}/PAYROLL/{YYYYMM}` (e.g., `CHN/PAYROLL/202610`)
- **Payslips**: `{BRANCH_CODE}/PAY/{YYYYMM}/{0001}` (e.g., `CHN/PAY/202610/0001`)
- **Tax Invoices**: `{BRANCH_CODE}/INV/{FINANCIAL_YEAR}/{0001}` (e.g., `CHN/INV/2026-27/0001`)
- **Invoice Adjustments**: `{BRANCH_CODE}/ADJ/{FINANCIAL_YEAR}/{0001}` (e.g., `CHN/ADJ/2026-27/0001`)
- **Payment Receipts**: `{BRANCH_CODE}/REC/{FINANCIAL_YEAR}/{0001}` (e.g., `CHN/REC/2026-27/0001`)

---

## 5. Security, RBAC & Tenant Isolation

- **Tenant Isolation**: All operations strictly filter by `agencyId`. Cross-agency operations throw `NotFoundException` or `ForbiddenException`.
- **Branch Scope**: Branch managers are constrained to their assigned `branchId`.
- **RBAC Permissions Enforced**:
  - `PAYROLL_CREATE`, `PAYROLL_CALCULATE`, `PAYROLL_LOCK`, `PAYROLL_FINALIZE`
  - `STATUTORY_RULE_READ`, `STATUTORY_RULE_UPDATE`, `STATUTORY_CALCULATE`
  - `PAYSLIP_READ`, `PAYSLIP_GENERATE`, `PAYSLIP_EXPORT`
  - `INVOICE_CREATE`, `INVOICE_READ`, `INVOICE_UPDATE`, `INVOICE_FINALIZE`
  - `ADJUSTMENT_CREATE`, `PAYMENT_CREATE`, `PAYMENT_READ`
- **Audit Trails**: All batch transitions, recalculations, invoice locking, adjustments, and payments record immutable audit logs with diff snapshots.
