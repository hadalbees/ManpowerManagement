-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "agency_status_enum" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "user_status_enum" AS ENUM ('ACTIVE', 'LOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "client_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "contract_status_enum" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "billing_cycle_enum" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "billing_model_enum" AS ENUM ('MONTHLY_FIXED', 'PER_EMPLOYEE_PER_SHIFT', 'HOURLY', 'OVERTIME');

-- CreateEnum
CREATE TYPE "designation_category_enum" AS ENUM ('DRIVER', 'SECURITY', 'HOUSEKEEPING', 'INDUSTRIAL', 'WAREHOUSE', 'ADMINISTRATIVE');

-- CreateEnum
CREATE TYPE "gender_enum" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "marital_status_enum" AS ENUM ('SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED');

-- CreateEnum
CREATE TYPE "employee_status_enum" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "proficiency_enum" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERT');

-- CreateEnum
CREATE TYPE "advance_status_enum" AS ENUM ('ACTIVE', 'FULLY_RECOVERED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "leave_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "vehicle_type_enum" AS ENUM ('SEDAN', 'SUV', 'BUS', 'VAN', 'TRUCK', 'AUTO');

-- CreateEnum
CREATE TYPE "fuel_type_enum" AS ENUM ('DIESEL', 'PETROL', 'CNG', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "vehicle_status_enum" AS ENUM ('AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'GROUNDED');

-- CreateEnum
CREATE TYPE "deployment_status_enum" AS ENUM ('ACTIVE', 'TRANSFERRED', 'REPLACED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "attendance_status_enum" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'PAID_LEAVE', 'UNPAID_LEAVE', 'WEEK_OFF', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "attendance_method_enum" AS ENUM ('WEB_MANUAL', 'TABLET_MANUAL', 'CSV_IMPORT', 'BIOMETRIC', 'MOBILE_GPS');

-- CreateEnum
CREATE TYPE "replacement_type_enum" AS ENUM ('TEMPORARY', 'PERMANENT');

-- CreateEnum
CREATE TYPE "replacement_status_enum" AS ENUM ('DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "statutory_rule_type_enum" AS ENUM ('EPF', 'ESIC', 'PROFESSIONAL_TAX', 'LWF');

-- CreateEnum
CREATE TYPE "statutory_calc_method_enum" AS ENUM ('PERCENTAGE_ON_GROSS', 'PERCENTAGE_ON_BASIC_DA', 'SLAB_BASED', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "rounding_method_enum" AS ENUM ('NEAREST_INTEGER', 'ROUND_UP', 'ROUND_DOWN', 'EXACT');

-- CreateEnum
CREATE TYPE "payroll_batch_status_enum" AS ENUM ('DRAFT', 'REVIEWED', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "salary_payment_status_enum" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "invoice_status_enum" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "invoice_adjustment_type_enum" AS ENUM ('CREDIT_NOTE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "payment_mode_enum" AS ENUM ('NEFT', 'RTGS', 'CHEQUE', 'UPI', 'CASH');

-- CreateEnum
CREATE TYPE "document_entity_type_enum" AS ENUM ('EMPLOYEE', 'VEHICLE', 'CLIENT', 'CLIENT_SITE', 'CONTRACT', 'CANDIDATE', 'AGENCY', 'BRANCH');

-- CreateEnum
CREATE TYPE "verification_status_enum" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "expiry_alert_status_enum" AS ENUM ('SCHEDULED', 'SENT', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "recruitment_status_enum" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'SKILL_TEST_PASSED', 'DOCUMENT_VERIFIED', 'SELECTED', 'OFFERED', 'HIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "candidate_offer_status_enum" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "interview_result_enum" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "notification_priority_enum" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "notification_category_enum" AS ENUM ('EXPIRY', 'COMPLIANCE', 'ATTENDANCE', 'REPLACEMENT', 'PAYROLL', 'BILLING', 'RECRUITMENT', 'LEAVE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "audit_action_enum" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'LOCK', 'OVERRIDE');

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "legal_name" VARCHAR(200) NOT NULL,
    "registration_number" VARCHAR(50) NOT NULL,
    "pan" VARCHAR(10) NOT NULL,
    "gstin" VARCHAR(15) NOT NULL,
    "epf_code" VARCHAR(25),
    "esic_code" VARCHAR(25),
    "lin_number" VARCHAR(20),
    "registered_address" TEXT NOT NULL,
    "state_code" VARCHAR(2) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "website" VARCHAR(150),
    "status" "agency_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_name" VARCHAR(100) NOT NULL,
    "branch_code" VARCHAR(10) NOT NULL,
    "gstin" VARCHAR(15),
    "state_code" VARCHAR(2) NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "address" TEXT NOT NULL,
    "contact_person" VARCHAR(100) NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "contact_email" VARCHAR(100) NOT NULL,
    "is_headquarters" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "agency_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_configurations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID,
    "config_key" VARCHAR(50) NOT NULL,
    "config_value" JSONB NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "role_id" UUID NOT NULL,
    "status" "user_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "last_login_ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "is_system_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module" VARCHAR(40) NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "code" VARCHAR(70) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "is_granted" BOOLEAN NOT NULL,
    "granted_by" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID,
    "user_id" UUID,
    "entity_name" VARCHAR(60) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "audit_action_enum" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "change_summary" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_code" VARCHAR(20) NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "legal_name" VARCHAR(200) NOT NULL,
    "pan" VARCHAR(10) NOT NULL,
    "gstin" VARCHAR(15) NOT NULL,
    "state_code" VARCHAR(2) NOT NULL,
    "billing_address" TEXT NOT NULL,
    "contact_person_name" VARCHAR(100) NOT NULL,
    "contact_email" VARCHAR(100) NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "status" "client_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "site_code" VARCHAR(20) NOT NULL,
    "site_name" VARCHAR(120) NOT NULL,
    "address" TEXT NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "state_code" VARCHAR(2) NOT NULL,
    "pincode" VARCHAR(10) NOT NULL,
    "site_supervisor_name" VARCHAR(100),
    "site_supervisor_phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "client_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "contract_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "notice_period_days" INTEGER NOT NULL DEFAULT 30,
    "billing_cycle" "billing_cycle_enum" NOT NULL DEFAULT 'MONTHLY',
    "status" "contract_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "client_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_billing_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "client_site_id" UUID,
    "designation_id" UUID NOT NULL,
    "billing_model" "billing_model_enum" NOT NULL,
    "rate_amount" DECIMAL(12,2) NOT NULL,
    "standard_shift_hours" DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    "ot_hourly_rate" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "client_billing_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "category" "designation_category_enum" NOT NULL,
    "description" VARCHAR(255),
    "minimum_wage_category" VARCHAR(40),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "employee_code" VARCHAR(20) NOT NULL,
    "first_name" VARCHAR(60) NOT NULL,
    "last_name" VARCHAR(60) NOT NULL,
    "gender" "gender_enum" NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "date_of_joining" DATE NOT NULL,
    "date_of_leaving" DATE,
    "primary_designation_id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "alternate_phone" VARCHAR(20),
    "email" VARCHAR(120),
    "driving_license_number" VARCHAR(30),
    "driving_license_class" VARCHAR(30),
    "driving_license_issue_date" DATE,
    "driving_license_expiry_date" DATE,
    "driving_license_authority" VARCHAR(80),
    "emergency_contact_name" VARCHAR(100) NOT NULL,
    "emergency_contact_phone" VARCHAR(20) NOT NULL,
    "current_address" TEXT NOT NULL,
    "permanent_address" TEXT NOT NULL,
    "marital_status" "marital_status_enum",
    "blood_group" VARCHAR(5),
    "bank_name" VARCHAR(100) NOT NULL,
    "bank_branch" VARCHAR(100) NOT NULL,
    "bank_account_no_encrypted" VARCHAR(255) NOT NULL,
    "bank_account_no_masked" VARCHAR(20) NOT NULL,
    "bank_ifsc" VARCHAR(11) NOT NULL,
    "pan_encrypted" VARCHAR(255),
    "pan_masked" VARCHAR(10),
    "aadhaar_encrypted" VARCHAR(255) NOT NULL,
    "aadhaar_masked" VARCHAR(12) NOT NULL,
    "uan_number" VARCHAR(12),
    "esic_ip_number" VARCHAR(17),
    "recruited_candidate_id" UUID,
    "status" "employee_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_skills" (
    "employee_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "proficiency_level" "proficiency_enum" NOT NULL DEFAULT 'INTERMEDIATE',
    "years_of_experience" DECIMAL(3,1) NOT NULL DEFAULT 0.0,
    "certified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("employee_id","skill_id")
);

-- CreateTable
CREATE TABLE "employee_qualifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "qualification_type" VARCHAR(50) NOT NULL,
    "degree_title" VARCHAR(100) NOT NULL,
    "institution_name" VARCHAR(150) NOT NULL,
    "year_of_passing" INTEGER NOT NULL,
    "grade_percentage" VARCHAR(15),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_salary_structures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "basic_pay" DECIMAL(10,2) NOT NULL,
    "dearness_allowance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "house_rent_allowance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "conveyance_allowance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "special_allowance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "overtime_rate_per_hour" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "pf_applicable" BOOLEAN NOT NULL DEFAULT true,
    "pf_opt_out_rule" VARCHAR(30),
    "esi_applicable" BOOLEAN NOT NULL DEFAULT true,
    "pt_applicable" BOOLEAN NOT NULL DEFAULT true,
    "lwf_applicable" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "reason_for_change" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "employee_salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_advances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "advance_amount" DECIMAL(10,2) NOT NULL,
    "disbursed_date" DATE NOT NULL,
    "repayment_start_month" INTEGER NOT NULL,
    "repayment_start_year" INTEGER NOT NULL,
    "total_installments" INTEGER NOT NULL DEFAULT 1,
    "monthly_deduction_amount" DECIMAL(10,2) NOT NULL,
    "recovered_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "balance_remaining" DECIMAL(10,2) NOT NULL,
    "status" "advance_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "approved_by" UUID NOT NULL,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(15) NOT NULL,
    "days_per_year" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "is_accumulative" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "opening_balance" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "accrued_days" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "consumed_days" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "closing_balance" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" DECIMAL(4,1) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "leave_status_enum" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "reviewer_comments" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID,
    "vehicle_registration_number" VARCHAR(20) NOT NULL,
    "vehicle_make" VARCHAR(50) NOT NULL,
    "vehicle_model" VARCHAR(50) NOT NULL,
    "vehicle_type" "vehicle_type_enum" NOT NULL,
    "fuel_type" "fuel_type_enum" NOT NULL,
    "chassis_number" VARCHAR(50) NOT NULL,
    "engine_number" VARCHAR(50) NOT NULL,
    "manufacturing_year" INTEGER NOT NULL,
    "current_odometer_km" INTEGER NOT NULL DEFAULT 0,
    "status" "vehicle_status_enum" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_site_id" UUID,
    "start_datetime" TIMESTAMPTZ NOT NULL,
    "end_datetime" TIMESTAMPTZ,
    "start_odometer_km" INTEGER NOT NULL,
    "end_odometer_km" INTEGER,
    "handover_condition_notes" TEXT,
    "return_condition_notes" TEXT,
    "reason_for_change" VARCHAR(255),
    "assigned_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "vehicle_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_deployments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "client_site_id" UUID NOT NULL,
    "designation_id" UUID NOT NULL,
    "shift_name" VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
    "shift_start_time" TIME NOT NULL DEFAULT '09:00:00'::time,
    "shift_end_time" TIME NOT NULL DEFAULT '18:00:00'::time,
    "is_night_shift" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "billing_rate_id" UUID NOT NULL,
    "salary_structure_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "status" "deployment_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "employee_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deployment_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "is_scheduled_workday" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "deployment_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "deployment_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "client_site_id" UUID NOT NULL,
    "shift_business_date" DATE NOT NULL,
    "clock_in_time" TIMESTAMPTZ,
    "clock_out_time" TIMESTAMPTZ,
    "status" "attendance_status_enum" NOT NULL DEFAULT 'PRESENT',
    "scheduled_hours" DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    "worked_hours" DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    "overtime_hours" DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    "recorded_method" "attendance_method_enum" NOT NULL DEFAULT 'WEB_MANUAL',
    "recorded_by" UUID NOT NULL,
    "supervisor_remarks" VARCHAR(255),
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replacements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "original_deployment_id" UUID NOT NULL,
    "absent_employee_id" UUID NOT NULL,
    "replacement_employee_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "replacement_type" "replacement_type_enum" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "replacement_status_enum" NOT NULL DEFAULT 'DISPATCHED',
    "dispatched_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replacements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statutory_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "rule_type" "statutory_rule_type_enum" NOT NULL,
    "state_code" VARCHAR(2),
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "wage_ceiling" DECIMAL(10,2),
    "employee_contribution_pct" DECIMAL(5,3) NOT NULL,
    "employer_contribution_pct" DECIMAL(5,3) NOT NULL,
    "calculation_method" "statutory_calc_method_enum" NOT NULL,
    "rounding_method" "rounding_method_enum" NOT NULL DEFAULT 'NEAREST_INTEGER',
    "rule_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statutory_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "batch_number" VARCHAR(30) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "total_employees" INTEGER NOT NULL DEFAULT 0,
    "total_gross_wages" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "total_deductions" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "total_net_wages" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "status" "payroll_batch_status_enum" NOT NULL DEFAULT 'DRAFT',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "locked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_calculations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_batch_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "salary_structure_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "total_calendar_days" INTEGER NOT NULL,
    "present_days" DECIMAL(4,1) NOT NULL,
    "paid_leave_days" DECIMAL(4,1) NOT NULL,
    "unpaid_leave_days" DECIMAL(4,1) NOT NULL,
    "week_off_days" DECIMAL(4,1) NOT NULL,
    "payable_days" DECIMAL(4,1) NOT NULL,
    "overtime_hours" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "basic_earned" DECIMAL(10,2) NOT NULL,
    "da_earned" DECIMAL(10,2) NOT NULL,
    "hra_earned" DECIMAL(10,2) NOT NULL,
    "conveyance_earned" DECIMAL(10,2) NOT NULL,
    "special_allowance_earned" DECIMAL(10,2) NOT NULL,
    "overtime_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "gross_salary" DECIMAL(10,2) NOT NULL,
    "epf_employee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "epf_employer" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "epf_eps_employer" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "esic_employee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "esic_employer" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "professional_tax" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "lwf_employee" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "advance_deduction" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "other_deductions" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_deductions" DECIMAL(10,2) NOT NULL,
    "net_salary" DECIMAL(10,2) NOT NULL,
    "bank_account_no_snapshot" VARCHAR(20) NOT NULL,
    "bank_ifsc_snapshot" VARCHAR(11) NOT NULL,
    "payment_status" "salary_payment_status_enum" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salary_calculation_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "payslip_number" VARCHAR(35) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "snapshot_data" JSONB NOT NULL,
    "pdf_storage_key" VARCHAR(255),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "financial_year" VARCHAR(7) NOT NULL,
    "document_type" VARCHAR(10) NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "contract_id" UUID,
    "invoice_number" VARCHAR(35) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "billing_period_start" DATE NOT NULL,
    "billing_period_end" DATE NOT NULL,
    "subtotal_amount" DECIMAL(14,2) NOT NULL,
    "is_interstate" BOOLEAN NOT NULL DEFAULT false,
    "cgst_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "cgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "sgst_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "sgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "igst_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "igst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total_tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "round_off" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "total_invoice_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "credit_adjustment_amount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "balance_due" DECIMAL(14,2) NOT NULL,
    "status" "invoice_status_enum" NOT NULL DEFAULT 'DRAFT',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "pdf_storage_key" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "client_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "client_site_id" UUID NOT NULL,
    "designation_id" UUID NOT NULL,
    "billing_rate_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "billing_model" "billing_model_enum" NOT NULL,
    "quantity_shifts_or_hours" DECIMAL(8,2) NOT NULL,
    "rate_applied" DECIMAL(10,2) NOT NULL,
    "overtime_hours" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "overtime_rate" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "line_total" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_adjustments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "note_number" VARCHAR(35) NOT NULL,
    "note_type" "invoice_adjustment_type_enum" NOT NULL,
    "issue_date" DATE NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "subtotal_amount" DECIMAL(12,2) NOT NULL,
    "cgst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "sgst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "igst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "approved_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "payment_date" DATE NOT NULL,
    "amount_received" DECIMAL(14,2) NOT NULL,
    "tds_deducted" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "payment_mode" "payment_mode_enum" NOT NULL,
    "reference_transaction_id" VARCHAR(100) NOT NULL,
    "bank_name" VARCHAR(100),
    "recorded_by" UUID NOT NULL,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "applicable_entity" "document_entity_type_enum" NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "requires_expiry_date" BOOLEAN NOT NULL DEFAULT false,
    "default_alert_days" INTEGER[] DEFAULT ARRAY[60, 30, 15, 7]::INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID,
    "document_type_id" UUID NOT NULL,
    "entity_type" "document_entity_type_enum" NOT NULL,
    "entity_id" UUID NOT NULL,
    "document_number" VARCHAR(100),
    "title" VARCHAR(150),
    "description" TEXT,
    "issued_by" VARCHAR(100),
    "issue_date" DATE,
    "expiry_date" DATE,
    "storage_provider" VARCHAR(50) NOT NULL DEFAULT 'S3_COMPLIANT',
    "s3_storage_key" VARCHAR(255) NOT NULL,
    "original_file_name" VARCHAR(150) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" VARCHAR(60) NOT NULL,
    "checksum" VARCHAR(64),
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "verification_status" "verification_status_enum" NOT NULL DEFAULT 'PENDING',
    "uploaded_by" UUID,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "rejection_reason" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "s3_storage_key" VARCHAR(255) NOT NULL,
    "original_file_name" VARCHAR(150) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" VARCHAR(60) NOT NULL,
    "checksum" VARCHAR(64),
    "uploaded_by_id" UUID,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expiry_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "entity_type" "document_entity_type_enum" NOT NULL,
    "entity_id" UUID NOT NULL,
    "expiry_date" DATE NOT NULL,
    "alert_threshold_days" INTEGER NOT NULL,
    "scheduled_alert_date" DATE NOT NULL,
    "status" "expiry_alert_status_enum" NOT NULL DEFAULT 'SCHEDULED',
    "sent_at" TIMESTAMPTZ,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expiry_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "candidate_code" VARCHAR(20) NOT NULL,
    "first_name" VARCHAR(60) NOT NULL,
    "last_name" VARCHAR(60) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "alternate_phone" VARCHAR(20),
    "email" VARCHAR(100),
    "date_of_birth" DATE,
    "gender" "gender_enum",
    "address" TEXT,
    "previous_employer" VARCHAR(100),
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" VARCHAR(50) NOT NULL DEFAULT 'WALK_IN',
    "expected_salary" DECIMAL(10,2),
    "availability_date" DATE,
    "notes" TEXT,
    "screening_notes" TEXT,
    "screened_by_id" UUID,
    "screened_at" TIMESTAMPTZ,
    "skill_test_notes" TEXT,
    "skill_test_score" DECIMAL(4,1),
    "primary_designation_id" UUID NOT NULL,
    "years_of_experience" DECIMAL(3,1) NOT NULL DEFAULT 0.0,
    "current_city" VARCHAR(50) NOT NULL,
    "status" "recruitment_status_enum" NOT NULL DEFAULT 'APPLIED',
    "converted_to_employee_id" UUID,
    "hired_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "recruitment_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "interviewer_user_id" UUID NOT NULL,
    "stage_name" VARCHAR(50) NOT NULL,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "score" DECIMAL(4,1),
    "result" "interview_result_enum" NOT NULL DEFAULT 'PENDING',
    "evaluation_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "designation_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "offered_salary" DECIMAL(10,2) NOT NULL,
    "joining_date" DATE NOT NULL,
    "offer_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" DATE,
    "status" "candidate_offer_status_enum" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "branch_id" UUID,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" TEXT NOT NULL,
    "category" "notification_category_enum" NOT NULL,
    "priority" "notification_priority_enum" NOT NULL DEFAULT 'NORMAL',
    "action_url" VARCHAR(255),
    "reference_type" VARCHAR(50),
    "reference_id" VARCHAR(100),
    "dedup_key" VARCHAR(150),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agencies_registration_number_key" ON "agencies"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_pan_key" ON "agencies"("pan");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_gstin_key" ON "agencies"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "agency_branches_agency_id_branch_code_key" ON "agency_branches"("agency_id", "branch_code");

-- CreateIndex
CREATE UNIQUE INDEX "agency_configurations_agency_id_branch_id_config_key_key" ON "agency_configurations"("agency_id", "branch_id", "config_key");

-- CreateIndex
CREATE UNIQUE INDEX "users_agency_id_email_key" ON "users"("agency_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_permission_id_key" ON "user_permissions"("user_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_hash_key" ON "user_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "audit_logs_entity_name_entity_id_idx" ON "audit_logs"("entity_name", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_agency_id_user_id_idx" ON "audit_logs"("agency_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_agency_id_client_code_key" ON "clients"("agency_id", "client_code");

-- CreateIndex
CREATE UNIQUE INDEX "clients_agency_id_gstin_key" ON "clients"("agency_id", "gstin");

-- CreateIndex
CREATE UNIQUE INDEX "client_sites_client_id_site_code_key" ON "client_sites"("client_id", "site_code");

-- CreateIndex
CREATE UNIQUE INDEX "client_contracts_client_id_contract_number_key" ON "client_contracts"("client_id", "contract_number");

-- CreateIndex
CREATE UNIQUE INDEX "designations_agency_id_code_key" ON "designations"("agency_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_agency_id_employee_code_key" ON "employees"("agency_id", "employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "skills_agency_id_name_key" ON "skills"("agency_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_agency_id_code_key" ON "leave_types"("agency_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employee_id_leave_type_id_year_key" ON "leave_balances"("employee_id", "leave_type_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_agency_id_vehicle_registration_number_key" ON "vehicles"("agency_id", "vehicle_registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "deployment_shifts_deployment_id_day_of_week_key" ON "deployment_shifts"("deployment_id", "day_of_week");

-- CreateIndex
CREATE INDEX "attendances_shift_business_date_client_id_idx" ON "attendances"("shift_business_date", "client_id");

-- CreateIndex
CREATE INDEX "attendances_deployment_id_shift_business_date_idx" ON "attendances"("deployment_id", "shift_business_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_employee_id_shift_business_date_key" ON "attendances"("employee_id", "shift_business_date");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_batches_batch_number_key" ON "payroll_batches"("batch_number");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_batches_branch_id_month_year_key" ON "payroll_batches"("branch_id", "month", "year");

-- CreateIndex
CREATE INDEX "salary_calculations_employee_id_year_month_idx" ON "salary_calculations"("employee_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "salary_calculations_payroll_batch_id_employee_id_key" ON "salary_calculations"("payroll_batch_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_salary_calculation_id_key" ON "payslips"("salary_calculation_id");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payslip_number_key" ON "payslips"("payslip_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_sequences_branch_id_financial_year_document_type_key" ON "invoice_sequences"("branch_id", "financial_year", "document_type");

-- CreateIndex
CREATE UNIQUE INDEX "client_invoices_invoice_number_key" ON "client_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "client_invoices_client_id_status_idx" ON "client_invoices"("client_id", "status");

-- CreateIndex
CREATE INDEX "client_invoices_branch_id_invoice_date_idx" ON "client_invoices"("branch_id", "invoice_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_adjustments_note_number_key" ON "invoice_adjustments"("note_number");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_agency_id_code_key" ON "document_types"("agency_id", "code");

-- CreateIndex
CREATE INDEX "documents_entity_type_entity_id_idx" ON "documents"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "documents_expiry_date_idx" ON "documents"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_id_version_number_key" ON "document_versions"("document_id", "version_number");

-- CreateIndex
CREATE INDEX "expiry_alerts_scheduled_alert_date_status_idx" ON "expiry_alerts"("scheduled_alert_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "expiry_alerts_document_id_alert_threshold_days_key" ON "expiry_alerts"("document_id", "alert_threshold_days");

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_candidates_candidate_code_key" ON "recruitment_candidates"("candidate_code");

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_candidates_converted_to_employee_id_key" ON "recruitment_candidates"("converted_to_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedup_key_key" ON "notifications"("dedup_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "agency_branches" ADD CONSTRAINT "agency_branches_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_configurations" ADD CONSTRAINT "agency_configurations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_configurations" ADD CONSTRAINT "agency_configurations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_sites" ADD CONSTRAINT "client_sites_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contracts" ADD CONSTRAINT "client_contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_billing_rates" ADD CONSTRAINT "client_billing_rates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_billing_rates" ADD CONSTRAINT "client_billing_rates_client_site_id_fkey" FOREIGN KEY ("client_site_id") REFERENCES "client_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_billing_rates" ADD CONSTRAINT "client_billing_rates_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_primary_designation_id_fkey" FOREIGN KEY ("primary_designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_recruited_candidate_id_fkey" FOREIGN KEY ("recruited_candidate_id") REFERENCES "recruitment_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_qualifications" ADD CONSTRAINT "employee_qualifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_client_site_id_fkey" FOREIGN KEY ("client_site_id") REFERENCES "client_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deployments" ADD CONSTRAINT "employee_deployments_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deployments" ADD CONSTRAINT "employee_deployments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deployments" ADD CONSTRAINT "employee_deployments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deployments" ADD CONSTRAINT "employee_deployments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deployments" ADD CONSTRAINT "employee_deployments_client_site_id_fkey" FOREIGN KEY ("client_site_id") REFERENCES "client_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deployments" ADD CONSTRAINT "employee_deployments_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deployments" ADD CONSTRAINT "employee_deployments_billing_rate_id_fkey" FOREIGN KEY ("billing_rate_id") REFERENCES "client_billing_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deployments" ADD CONSTRAINT "employee_deployments_salary_structure_id_fkey" FOREIGN KEY ("salary_structure_id") REFERENCES "employee_salary_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deployments" ADD CONSTRAINT "employee_deployments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_shifts" ADD CONSTRAINT "deployment_shifts_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "employee_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "employee_deployments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_client_site_id_fkey" FOREIGN KEY ("client_site_id") REFERENCES "client_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacements" ADD CONSTRAINT "replacements_original_deployment_id_fkey" FOREIGN KEY ("original_deployment_id") REFERENCES "employee_deployments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacements" ADD CONSTRAINT "replacements_absent_employee_id_fkey" FOREIGN KEY ("absent_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacements" ADD CONSTRAINT "replacements_replacement_employee_id_fkey" FOREIGN KEY ("replacement_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacements" ADD CONSTRAINT "replacements_dispatched_by_fkey" FOREIGN KEY ("dispatched_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statutory_rules" ADD CONSTRAINT "statutory_rules_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_batches" ADD CONSTRAINT "payroll_batches_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_batches" ADD CONSTRAINT "payroll_batches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_batches" ADD CONSTRAINT "payroll_batches_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_calculations" ADD CONSTRAINT "salary_calculations_payroll_batch_id_fkey" FOREIGN KEY ("payroll_batch_id") REFERENCES "payroll_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_calculations" ADD CONSTRAINT "salary_calculations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_calculations" ADD CONSTRAINT "salary_calculations_salary_structure_id_fkey" FOREIGN KEY ("salary_structure_id") REFERENCES "employee_salary_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_salary_calculation_id_fkey" FOREIGN KEY ("salary_calculation_id") REFERENCES "salary_calculations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invoices" ADD CONSTRAINT "client_invoices_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invoices" ADD CONSTRAINT "client_invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invoices" ADD CONSTRAINT "client_invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invoices" ADD CONSTRAINT "client_invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "client_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invoices" ADD CONSTRAINT "client_invoices_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invoice_items" ADD CONSTRAINT "client_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "client_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invoice_items" ADD CONSTRAINT "client_invoice_items_client_site_id_fkey" FOREIGN KEY ("client_site_id") REFERENCES "client_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invoice_items" ADD CONSTRAINT "client_invoice_items_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_invoice_items" ADD CONSTRAINT "client_invoice_items_billing_rate_id_fkey" FOREIGN KEY ("billing_rate_id") REFERENCES "client_billing_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_adjustments" ADD CONSTRAINT "invoice_adjustments_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_adjustments" ADD CONSTRAINT "invoice_adjustments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_adjustments" ADD CONSTRAINT "invoice_adjustments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "client_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_adjustments" ADD CONSTRAINT "invoice_adjustments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "client_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expiry_alerts" ADD CONSTRAINT "expiry_alerts_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expiry_alerts" ADD CONSTRAINT "expiry_alerts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expiry_alerts" ADD CONSTRAINT "expiry_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_candidates" ADD CONSTRAINT "recruitment_candidates_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_candidates" ADD CONSTRAINT "recruitment_candidates_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_candidates" ADD CONSTRAINT "recruitment_candidates_primary_designation_id_fkey" FOREIGN KEY ("primary_designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_candidates" ADD CONSTRAINT "recruitment_candidates_screened_by_id_fkey" FOREIGN KEY ("screened_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "recruitment_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_interviewer_user_id_fkey" FOREIGN KEY ("interviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "recruitment_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

