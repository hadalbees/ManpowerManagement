# User Acceptance Testing (UAT) Checklist & Workflow Guide
**Manpower Agency Management System**

This document specifies the authoritative test scenarios for role-based user acceptance testing prior to production sign-off.

---

## 1. Super Admin / Agency Owner Persona

| ID | Scenario | Steps to Execute | Expected Result | Sign-Off |
| :--- | :--- | :--- | :--- | :--- |
| **UA-01** | Multi-Branch Visibility | Login as Super Admin; navigate to `/dashboard/analytics`. Filter by All Branches vs Chennai vs Trichy. | Dashboard KPIs, revenue trends, and headcount update reactively based on branch selection. | [ ] |
| **UA-02** | User & Role Governance | Create new user; assign role; apply explicit permission denial for `PAYROLL_APPROVE`. | User inherits role permissions except `PAYROLL_APPROVE`, which is strictly denied. | [ ] |
| **UA-03** | Audit Log Inspection | Perform administrative action; inspect `/dashboard/audit`. | Complete immutable audit log appears with timestamp, user email, action type, and diff summary. | [ ] |

---

## 2. Branch Manager Persona

| ID | Scenario | Steps to Execute | Expected Result | Sign-Off |
| :--- | :--- | :--- | :--- | :--- |
| **BM-01** | Client & Site Setup | Register new commercial client; add deployment site. | Client record created with active status; site associated to branch. | [ ] |
| **BM-02** | Employee Onboarding | Create new employee profile with bank account and designation. | Profile created; bank account ciphertext encrypted and masked as `XXXXXX1234`. | [ ] |
| **BM-03** | Fleet Vehicle Allocation | Assign available vehicle to employee. | Vehicle status transitions from `AVAILABLE` to `ASSIGNED`. | [ ] |
| **BM-04** | Cross-Branch Access Attempt | Attempt to view data belonging to sister branch. | System blocks request with `403 Forbidden` / `404 Not Found`. | [ ] |

---

## 3. Operations Coordinator Persona

| ID | Scenario | Steps to Execute | Expected Result | Sign-Off |
| :--- | :--- | :--- | :--- | :--- |
| **OP-01** | Deployment Rostering | Assign employee to client site shift. | Deployment record created with active status and shift timing. | [ ] |
| **OP-02** | Daily Attendance Roll | Mark attendance (PRESENT/ABSENT) with worked and overtime hours. | Attendance record saved with `shiftBusinessDate` normalized to Asia/Kolkata. | [ ] |
| **OP-03** | Emergency Replacement | Employee A requests leave; dispatch Employee B as replacement. | Replacement recorded; attendance logged under original deployment; Employee B compensated. | [ ] |

---

## 4. Payroll & Accounts Officer Persona

| ID | Scenario | Steps to Execute | Expected Result | Sign-Off |
| :--- | :--- | :--- | :--- | :--- |
| **PA-01** | Payroll Batch Calculation | Initiate payroll calculation for previous month. | System aggregates worked hours, computes basic + DA, applies statutory PF/ESI/PT/LWF formulas. | [ ] |
| **PA-02** | Payroll Lock & Immutability | Review calculated batch; execute Approve and Lock action. | Batch status transitions to `LOCKED`; modifications, deletions, and further calculations blocked. | [ ] |
| **PA-03** | Tax Invoice Generation | Generate GST invoice for client based on active deployed headcount. | Invoice issued with subtotal, 18% GST breakdown, and unique invoice number. | [ ] |
| **PA-04** | Payment Receipt Entry | Record payment receipt against outstanding invoice with TDS deduction. | Invoice `balanceDue` reduced; status transitions to `PAID` once balance reaches zero. | [ ] |

---

## 5. HR & Compliance Officer Persona

| ID | Scenario | Steps to Execute | Expected Result | Sign-Off |
| :--- | :--- | :--- | :--- | :--- |
| **HR-01** | Document Upload & Verification | Upload credential PDF (10MB); verify document as auditor. | Document uploaded with version 1; verification status updated to `VERIFIED` with auditor signature. | [ ] |
| **HR-02** | Document Revision Versioning | Upload new revision of existing credential. | Version increments to v2; parent status resets to `PENDING`; v1 preserved in version history table. | [ ] |
| **HR-03** | Expiry Alert Acknowledgment | Navigate to `/dashboard/compliance`; acknowledge active expiry alert. | Alert status transitions to `ACKNOWLEDGED` with review timestamp and reviewer signature. | [ ] |
| **HR-04** | Candidate Pipeline Progression | Move candidate through screening, interview evaluation, and offer signoff. | Stage advances cleanly; CTC offer issued with basic, allowances, and validity date. | [ ] |
| **HR-05** | Candidate to Employee Conversion | Execute atomic conversion on candidate with accepted offer. | Authoritative Employee created with salary structure; candidate marked `HIRED`; duplicate conversion blocked. | [ ] |
