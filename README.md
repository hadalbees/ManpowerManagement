# Manpower Agency Management System (ERP)

**Jurisdiction:** India (EPFO, ESIC, State PT, LWF, GST Compliance Ready)  
**Architecture Style:** Modular Monolith  
**Tech Stack:** 
- **Backend:** NestJS, TypeScript, Prisma ORM, PostgreSQL 16+
- **Frontend:** Next.js 15, React 19, TypeScript
- **Database:** PostgreSQL 16+ (with `btree_gist` temporal range exclusion constraints)

---

## Repository Structure

```
manpower-agency-system/
├── backend/                  # NestJS modular monolith backend
│   ├── prisma/               # Prisma schema, migrations, and seed scripts
│   │   ├── schema.prisma     # 45-table production relational schema
│   │   └── seed.ts           # System roles, permissions, statutory rule templates
│   ├── src/                  # NestJS application modules
│   │   ├── common/           # Guards, interceptors, decorators, pipes
│   │   ├── config/           # Environment and configuration loaders
│   │   ├── modules/          # Domain modules (Agency, Auth, Clients, Staff, Fleet, Ops, Payroll, Billing, etc.)
│   │   └── app.module.ts
│   └── package.json
├── frontend/                 # Next.js modern responsive administrative web portal
│   ├── src/
│   │   ├── app/              # App router pages & layouts
│   │   ├── components/       # Reusable UI component library
│   │   ├── lib/              # API clients and utilities
│   │   └── styles/           # CSS design tokens and theme
│   └── package.json
├── docs/                     # Technical architecture, specifications, and compliance guides
│   └── database_design_specification_v2.md
└── README.md
```

---

## Key Architectural Principles

1. **Append-Only / Temporal Immutability:** Deployments, salary structures, client billing rates, vehicle assignments, and payslips preserve complete historical records. Updates terminate previous effective dates without overwriting past state.
2. **PostgreSQL Temporal Exclusion:** Built with PostgreSQL `btree_gist` exclusion constraints to guarantee zero overlapping active records for employee deployments, vehicle assignments, rate cards, and salary packages.
3. **Indian Statutory Versatility:** PF, ESI, Professional Tax, and Labour Welfare Fund (LWF) calculations are fully versioned and configurable via database records (`statutory_rules`), with zero hardcoded percentages or wage ceilings in business code.
4. **Branch-Aware Concurrency-Safe Invoicing:** Automatic invoice numbering formatted as `{BRANCH_CODE}/INV/{FINANCIAL_YEAR}/{SEQUENCE}` using isolated row-level locks (`SELECT FOR UPDATE`) on `invoice_sequences`.
5. **Role-Based Access Control (RBAC):** 6 standard roles with 45 granular permissions and user-level override support.
6. **Defense-in-Depth Security:** Sensitive credentials (Aadhaar, PAN, Bank Account) are encrypted using AES-256-GCM at rest and masked in standard API views.

---

## Getting Started

### Prerequisites
- Node.js v20+ or v22+
- PostgreSQL 16+ (with `btree_gist` extension support)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push # or npx prisma migrate dev
npm run seed
npm run start:dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
