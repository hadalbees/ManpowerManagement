-- ==============================================================================
-- POSTGRESQL TEMPORAL CONSTRAINTS & EXTENSION INITIALIZATION
-- Project: Manpower Agency Management System
-- Purpose: Ensure zero overlapping active intervals for deployments, vehicles, 
--          salary packages, and billing rate cards.
-- ==============================================================================

-- 1. Enable btree_gist extension for combining scalar columns (=) with range overlaps (&&)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Employee Deployment Overlap Prevention:
-- Ensures an employee cannot have two ACTIVE deployments overlapping in dates.
ALTER TABLE employee_deployments 
DROP CONSTRAINT IF EXISTS exclude_employee_deployment_overlap;

ALTER TABLE employee_deployments 
ADD CONSTRAINT exclude_employee_deployment_overlap 
EXCLUDE USING gist (
  employee_id WITH =,
  daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
) WHERE (deleted_at IS NULL AND status = 'ACTIVE');

-- 3. Vehicle Assignment Overlap Prevention:
-- Ensures a vehicle cannot be assigned to two drivers simultaneously.
ALTER TABLE vehicle_assignments 
DROP CONSTRAINT IF EXISTS exclude_vehicle_assignment_overlap;

ALTER TABLE vehicle_assignments 
ADD CONSTRAINT exclude_vehicle_assignment_overlap 
EXCLUDE USING gist (
  vehicle_id WITH =,
  tstzrange(start_datetime, COALESCE(end_datetime, 'infinity'::timestamptz), '[]') WITH &&
) WHERE (deleted_at IS NULL);

-- 4. Employee Salary Structure Overlap Prevention:
-- Ensures an employee cannot have two active pay structures for overlapping effective dates.
ALTER TABLE employee_salary_structures 
DROP CONSTRAINT IF EXISTS exclude_employee_salary_structure_overlap;

ALTER TABLE employee_salary_structures 
ADD CONSTRAINT exclude_employee_salary_structure_overlap 
EXCLUDE USING gist (
  employee_id WITH =,
  daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
) WHERE (deleted_at IS NULL);

-- 5. Client Billing Rate Overlap Prevention:
-- Ensures a client cannot have duplicate active rate cards for the same designation, site & billing model.
ALTER TABLE client_billing_rates 
DROP CONSTRAINT IF EXISTS exclude_client_billing_rate_overlap;

ALTER TABLE client_billing_rates 
ADD CONSTRAINT exclude_client_billing_rate_overlap 
EXCLUDE USING gist (
  client_id WITH =,
  designation_id WITH =,
  COALESCE(client_site_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
  billing_model WITH =,
  daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
) WHERE (deleted_at IS NULL AND is_active = true);
