import { PrismaClient, AgencyStatus, DesignationCategory, DocumentEntityType, StatutoryRuleType, StatutoryCalcMethod, RoundingMethod } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Manpower Agency System Seeding...');

  // ==========================================
  // 1. SYSTEM PERMISSIONS (45 Granular Actions)
  // ==========================================
  console.log('  -> Seeding System Permissions...');
  const permissionsData = [
    // Agency & Branch
    { module: 'AGENCY', action: 'MANAGE', code: 'AGENCY_MANAGE', description: 'Manage agency corporate details and branches' },
    { module: 'AGENCY', action: 'VIEW', code: 'AGENCY_VIEW', description: 'View agency settings and branches' },
    // Users & Roles
    { module: 'USER', action: 'CREATE', code: 'USER_CREATE', description: 'Create internal system users' },
    { module: 'USER', action: 'READ', code: 'USER_READ', description: 'View system users' },
    { module: 'USER', action: 'UPDATE', code: 'USER_UPDATE', description: 'Update user profiles and role assignments' },
    { module: 'USER', action: 'OVERRIDE_PERMISSIONS', code: 'USER_PERMISSION_OVERRIDE', description: 'Assign user-level permission overrides' },
    // Clients
    { module: 'CLIENT', action: 'CREATE', code: 'CLIENT_CREATE', description: 'Create client companies and contracts' },
    { module: 'CLIENT', action: 'READ', code: 'CLIENT_READ', description: 'View clients, sites, and rate cards' },
    { module: 'CLIENT', action: 'UPDATE', code: 'CLIENT_UPDATE', description: 'Update client details and rate cards' },
    { module: 'CLIENT', action: 'DELETE', code: 'CLIENT_DELETE', description: 'Deactivate or soft-delete clients' },
    // Employees
    { module: 'EMPLOYEE', action: 'CREATE', code: 'EMPLOYEE_CREATE', description: 'Onboard and create employee profiles' },
    { module: 'EMPLOYEE', action: 'READ', code: 'EMPLOYEE_READ', description: 'View employee roster and profile dossier' },
    { module: 'EMPLOYEE', action: 'UPDATE', code: 'EMPLOYEE_UPDATE', description: 'Update employee information and salary structure' },
    { module: 'EMPLOYEE', action: 'VIEW_SENSITIVE', code: 'EMPLOYEE_VIEW_SENSITIVE', description: 'View unmasked Aadhaar, PAN, and Bank details' },
    // Vehicles
    { module: 'VEHICLE', action: 'CREATE', code: 'VEHICLE_CREATE', description: 'Register new fleet vehicles' },
    { module: 'VEHICLE', action: 'READ', code: 'VEHICLE_READ', description: 'View vehicle inventory and handover history' },
    { module: 'VEHICLE', action: 'UPDATE', code: 'VEHICLE_UPDATE', description: 'Update fleet vehicle specifications and status' },
    { module: 'VEHICLE', action: 'DELETE', code: 'VEHICLE_DELETE', description: 'Decommission and soft delete fleet vehicles' },
    { module: 'VEHICLE', action: 'ASSIGN', code: 'VEHICLE_ASSIGN', description: 'Assign drivers and record handover checklists' },
    { module: 'VEHICLE', action: 'ASSIGNMENT_READ', code: 'VEHICLE_ASSIGNMENT_READ', description: 'View vehicle driver assignment history' },
    { module: 'VEHICLE', action: 'ASSIGNMENT_UPDATE', code: 'VEHICLE_ASSIGNMENT_UPDATE', description: 'Complete or update driver handovers' },
    // Deployments
    { module: 'DEPLOYMENT', action: 'CREATE', code: 'DEPLOYMENT_CREATE', description: 'Create employee client deployments' },
    { module: 'DEPLOYMENT', action: 'READ', code: 'DEPLOYMENT_READ', description: 'View live deployment boards and rosters' },
    { module: 'DEPLOYMENT', action: 'UPDATE', code: 'DEPLOYMENT_UPDATE', description: 'Update deployment configuration and shift details' },
    { module: 'DEPLOYMENT', action: 'DELETE', code: 'DEPLOYMENT_DELETE', description: 'Cancel or soft delete deployments' },
    { module: 'DEPLOYMENT', action: 'END', code: 'DEPLOYMENT_END', description: 'Safely end active deployments with completion audit' },
    { module: 'DEPLOYMENT', action: 'REASSIGN', code: 'DEPLOYMENT_REASSIGN', description: 'Reassign employee to another client, site, or vehicle' },
    { module: 'DEPLOYMENT', action: 'TRANSFER', code: 'DEPLOYMENT_TRANSFER', description: 'Transfer employee to new site or designation' },
    // Attendance
    { module: 'ATTENDANCE', action: 'RECORD', code: 'ATTENDANCE_RECORD', description: 'Record daily shift attendance' },
    { module: 'ATTENDANCE', action: 'READ', code: 'ATTENDANCE_READ', description: 'View daily and monthly attendance registers' },
    { module: 'ATTENDANCE', action: 'UPDATE', code: 'ATTENDANCE_UPDATE', description: 'Edit recorded attendance records' },
    { module: 'ATTENDANCE', action: 'APPROVE', code: 'ATTENDANCE_APPROVE', description: 'Approve shift hours and overtime' },
    // Leave & Replacements
    { module: 'LEAVE', action: 'CREATE', code: 'LEAVE_CREATE', description: 'Submit employee leave requests' },
    { module: 'LEAVE', action: 'READ', code: 'LEAVE_READ', description: 'View leave requests and allocations' },
    { module: 'LEAVE', action: 'UPDATE', code: 'LEAVE_UPDATE', description: 'Modify pending leave requests' },
    { module: 'LEAVE', action: 'DELETE', code: 'LEAVE_DELETE', description: 'Delete draft leave requests' },
    { module: 'LEAVE', action: 'APPROVE', code: 'LEAVE_APPROVE', description: 'Approve employee leave requests' },
    { module: 'LEAVE', action: 'REJECT', code: 'LEAVE_REJECT', description: 'Reject employee leave requests' },
    { module: 'LEAVE', action: 'CANCEL', code: 'LEAVE_CANCEL', description: 'Cancel approved or pending leave requests' },
    { module: 'LEAVE', action: 'BALANCE_READ', code: 'LEAVE_BALANCE_READ', description: 'View employee leave balances' },
    { module: 'LEAVE', action: 'BALANCE_UPDATE', code: 'LEAVE_BALANCE_UPDATE', description: 'Allocate and adjust leave balances' },
    { module: 'LEAVE', action: 'APPLY', code: 'LEAVE_APPLY', description: 'Submit employee leave requests (alias)' },
    // Replacements
    { module: 'REPLACEMENT', action: 'CREATE', code: 'REPLACEMENT_CREATE', description: 'Create and dispatch employee replacement requests' },
    { module: 'REPLACEMENT', action: 'READ', code: 'REPLACEMENT_READ', description: 'View replacement log and SLA tracking' },
    { module: 'REPLACEMENT', action: 'UPDATE', code: 'REPLACEMENT_UPDATE', description: 'Update replacement schedule and assignment details' },
    { module: 'REPLACEMENT', action: 'DELETE', code: 'REPLACEMENT_DELETE', description: 'Delete draft replacement requests' },
    { module: 'REPLACEMENT', action: 'APPROVE', code: 'REPLACEMENT_APPROVE', description: 'Approve replacement requests and dispatch standby worker' },
    { module: 'REPLACEMENT', action: 'REJECT', code: 'REPLACEMENT_REJECT', description: 'Reject replacement requests with operational justification' },
    { module: 'REPLACEMENT', action: 'CANCEL', code: 'REPLACEMENT_CANCEL', description: 'Cancel active or pending replacement requests' },
    { module: 'REPLACEMENT', action: 'COMPLETE', code: 'REPLACEMENT_COMPLETE', description: 'Formally complete and close finished replacements' },
    { module: 'REPLACEMENT', action: 'DISPATCH', code: 'REPLACEMENT_DISPATCH', description: 'Dispatch standby workers for absent staff (alias)' },
    // Statutory Rules
    { module: 'STATUTORY', action: 'MANAGE', code: 'STATUTORY_MANAGE', description: 'Configure PF, ESI, PT, and LWF calculation rules' },
    { module: 'STATUTORY', action: 'READ', code: 'STATUTORY_READ', description: 'View statutory compliance rules' },
    { module: 'STATUTORY', action: 'RULE_READ', code: 'STATUTORY_RULE_READ', description: 'View statutory compliance rules (alias)' },
    { module: 'STATUTORY', action: 'RULE_UPDATE', code: 'STATUTORY_RULE_UPDATE', description: 'Update statutory compliance rules' },
    { module: 'STATUTORY', action: 'CALCULATE', code: 'STATUTORY_CALCULATE', description: 'Execute statutory deductions calculation' },
    // Salary & Payroll
    { module: 'PAYROLL', action: 'CREATE', code: 'PAYROLL_CREATE', description: 'Create monthly payroll batches' },
    { module: 'PAYROLL', action: 'READ', code: 'PAYROLL_READ', description: 'View payroll batches and calculations' },
    { module: 'PAYROLL', action: 'UPDATE', code: 'PAYROLL_UPDATE', description: 'Update payroll batches and calculations' },
    { module: 'PAYROLL', action: 'CALCULATE', code: 'PAYROLL_CALCULATE', description: 'Run payroll calculation engine' },
    { module: 'PAYROLL', action: 'LOCK', code: 'PAYROLL_LOCK', description: 'Lock payroll batch against data mutations' },
    { module: 'PAYROLL', action: 'FINALIZE', code: 'PAYROLL_FINALIZE', description: 'Finalize payroll and close batch' },
    { module: 'PAYROLL', action: 'EXPORT', code: 'PAYROLL_EXPORT', description: 'Export bank advice and wage registers' },
    { module: 'SALARY', action: 'CALCULATE', code: 'SALARY_CALCULATE', description: 'Run monthly payroll batch calculations (alias)' },
    { module: 'SALARY', action: 'APPROVE', code: 'SALARY_APPROVE', description: 'Approve and lock monthly payroll batches (alias)' },
    { module: 'PAYSLIP', action: 'GENERATE', code: 'PAYSLIP_GENERATE', description: 'Generate and publish employee payslips' },
    { module: 'PAYSLIP', action: 'READ', code: 'PAYSLIP_READ', description: 'View and download payslips' },
    { module: 'PAYSLIP', action: 'EXPORT', code: 'PAYSLIP_EXPORT', description: 'Export payslip PDFs and registers' },
    // Billing & Invoicing
    { module: 'BILLING', action: 'CREATE', code: 'BILLING_CREATE', description: 'Create billing runs' },
    { module: 'BILLING', action: 'READ', code: 'BILLING_READ', description: 'View billing reports and revenue ledgers' },
    { module: 'BILLING', action: 'UPDATE', code: 'BILLING_UPDATE', description: 'Update billing parameters' },
    { module: 'BILLING', action: 'FINALIZE', code: 'BILLING_FINALIZE', description: 'Finalize client billing cycle' },
    { module: 'BILLING', action: 'EXPORT', code: 'BILLING_EXPORT', description: 'Export billing reports' },
    { module: 'INVOICE', action: 'CREATE', code: 'INVOICE_CREATE', description: 'Generate client billing tax invoices' },
    { module: 'INVOICE', action: 'APPROVE', code: 'INVOICE_APPROVE', description: 'Approve and finalize invoices' },
    { module: 'INVOICE', action: 'READ', code: 'INVOICE_READ', description: 'View invoice ledger and aging reports' },
    { module: 'INVOICE', action: 'UPDATE', code: 'INVOICE_UPDATE', description: 'Update draft client invoices' },
    { module: 'INVOICE', action: 'FINALIZE', code: 'INVOICE_FINALIZE', description: 'Finalize and lock client invoices' },
    { module: 'ADJUSTMENT', action: 'CREATE', code: 'ADJUSTMENT_CREATE', description: 'Issue GST Credit Notes and Debit Notes' },
    { module: 'PAYMENT', action: 'RECORD', code: 'PAYMENT_RECORD', description: 'Record client payment receipts and TDS deductions' },
    { module: 'PAYMENT', action: 'CREATE', code: 'PAYMENT_CREATE', description: 'Create client payment receipt entry' },
    { module: 'PAYMENT', action: 'READ', code: 'PAYMENT_READ', description: 'View client payment records' },
    { module: 'PAYMENT', action: 'UPDATE', code: 'PAYMENT_UPDATE', description: 'Update client payment details' },
    // Documents & Expiry
    { module: 'DOCUMENT', action: 'CREATE', code: 'DOCUMENT_CREATE', description: 'Upload and create new document records' },
    { module: 'DOCUMENT', action: 'READ', code: 'DOCUMENT_READ', description: 'View documents and metadata' },
    { module: 'DOCUMENT', action: 'UPLOAD', code: 'DOCUMENT_UPLOAD', description: 'Upload compliance documents' },
    { module: 'DOCUMENT', action: 'VERIFY', code: 'DOCUMENT_VERIFY', description: 'Verify or reject uploaded compliance certificates' },
    { module: 'DOCUMENT', action: 'DOWNLOAD', code: 'DOCUMENT_DOWNLOAD', description: 'Download secured document files' },
    { module: 'DOCUMENT', action: 'DELETE', code: 'DOCUMENT_DELETE', description: 'Soft-delete documents' },
    { module: 'COMPLIANCE', action: 'READ', code: 'COMPLIANCE_READ', description: 'View compliance dashboard and audit reports' },
    { module: 'COMPLIANCE', action: 'UPDATE', code: 'COMPLIANCE_UPDATE', description: 'Acknowledge alerts and trigger expiry scans' },
    { module: 'EXPIRY', action: 'VIEW', code: 'EXPIRY_VIEW', description: 'View upcoming expiration alerts' },
    { module: 'EXPIRY', action: 'OVERRIDE', code: 'EXPIRY_OVERRIDE', description: 'Acknowledge or extend expiry grace period' },
    // Recruitment
    { module: 'RECRUITMENT', action: 'CREATE', code: 'RECRUITMENT_CREATE', description: 'Register new candidates' },
    { module: 'RECRUITMENT', action: 'READ', code: 'RECRUITMENT_READ', description: 'View candidate pipeline and interview scores' },
    { module: 'RECRUITMENT', action: 'UPDATE', code: 'RECRUITMENT_UPDATE', description: 'Screen candidates, evaluate interviews and tests' },
    { module: 'RECRUITMENT', action: 'APPROVE', code: 'RECRUITMENT_APPROVE', description: 'Issue and approve formal employment offers' },
    { module: 'RECRUITMENT', action: 'MANAGE', code: 'RECRUITMENT_MANAGE', description: 'Manage candidate pipeline and trade interviews' },
    { module: 'RECRUITMENT', action: 'CONVERT', code: 'RECRUITMENT_CONVERT', description: 'One-click conversion of candidate to employee' },
    // Notifications
    { module: 'NOTIFICATION', action: 'READ', code: 'NOTIFICATION_READ', description: 'View notification inbox and unread counters' },
    { module: 'NOTIFICATION', action: 'UPDATE', code: 'NOTIFICATION_UPDATE', description: 'Mark notifications as read' },
    // Reports & Analytics
    { module: 'REPORT', action: 'READ', code: 'REPORT_READ', description: 'View business reports' },
    { module: 'REPORT', action: 'EXPORT', code: 'REPORT_EXPORT', description: 'Export Form T, PF ECR, ESI, and operational reports' },
    { module: 'ANALYTICS', action: 'READ', code: 'ANALYTICS_READ', description: 'Access executive KPI dashboards and trends' },
    // Audit & Governance
    { module: 'AUDIT', action: 'VIEW', code: 'AUDIT_LOG_VIEW', description: 'Inspect full immutable system audit logs' },
  ];

  const permissionsMap = new Map<string, string>();
  for (const p of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description },
      create: p
    });
    permissionsMap.set(p.code, perm.id);
  }

  // ==========================================
  // 2. SYSTEM ROLES
  // ==========================================
  console.log('  -> Seeding System Roles...');
  const rolesData = [
    {
      name: 'Super Admin / Agency Owner',
      slug: 'super-admin',
      description: 'Complete unrestricted access across all branches, finance, payroll, and configuration.',
      isSystemDefault: true,
      permissionCodes: Array.from(permissionsMap.keys())
    },
    {
      name: 'Branch Manager',
      slug: 'branch-manager',
      description: 'Operational control within assigned branch. Manages clients, deployments, and attendance.',
      isSystemDefault: true,
      permissionCodes: [
        'AGENCY_VIEW', 'USER_READ', 'CLIENT_CREATE', 'CLIENT_READ', 'CLIENT_UPDATE',
        'EMPLOYEE_CREATE', 'EMPLOYEE_READ', 'EMPLOYEE_UPDATE',
        'VEHICLE_CREATE', 'VEHICLE_READ', 'VEHICLE_UPDATE', 'VEHICLE_DELETE', 'VEHICLE_ASSIGN', 'VEHICLE_ASSIGNMENT_READ', 'VEHICLE_ASSIGNMENT_UPDATE',
        'DEPLOYMENT_CREATE', 'DEPLOYMENT_READ', 'DEPLOYMENT_UPDATE', 'DEPLOYMENT_DELETE', 'DEPLOYMENT_END', 'DEPLOYMENT_REASSIGN', 'DEPLOYMENT_TRANSFER',
        'ATTENDANCE_RECORD', 'ATTENDANCE_READ', 'ATTENDANCE_UPDATE', 'ATTENDANCE_APPROVE',
        'LEAVE_CREATE', 'LEAVE_READ', 'LEAVE_UPDATE', 'LEAVE_DELETE', 'LEAVE_APPROVE', 'LEAVE_REJECT', 'LEAVE_CANCEL', 'LEAVE_BALANCE_READ', 'LEAVE_BALANCE_UPDATE', 'LEAVE_APPLY',
        'REPLACEMENT_CREATE', 'REPLACEMENT_READ', 'REPLACEMENT_UPDATE', 'REPLACEMENT_DELETE', 'REPLACEMENT_APPROVE', 'REPLACEMENT_REJECT', 'REPLACEMENT_CANCEL', 'REPLACEMENT_COMPLETE', 'REPLACEMENT_DISPATCH',
        'INVOICE_READ', 'PAYSLIP_READ',
        'DOCUMENT_CREATE', 'DOCUMENT_READ', 'DOCUMENT_UPLOAD', 'DOCUMENT_VERIFY', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_DELETE',
        'COMPLIANCE_READ', 'COMPLIANCE_UPDATE', 'EXPIRY_VIEW',
        'RECRUITMENT_CREATE', 'RECRUITMENT_READ', 'RECRUITMENT_UPDATE', 'RECRUITMENT_APPROVE', 'RECRUITMENT_MANAGE', 'RECRUITMENT_CONVERT',
        'NOTIFICATION_READ', 'NOTIFICATION_UPDATE',
        'REPORT_READ', 'REPORT_EXPORT', 'ANALYTICS_READ'
      ]
    },
    {
      name: 'Operations / Dispatch Coordinator',
      slug: 'operations-coordinator',
      description: 'Day-to-day rostering, shift scheduling, vehicle assignments, and emergency replacements.',
      isSystemDefault: true,
      permissionCodes: [
        'CLIENT_READ', 'EMPLOYEE_READ', 'VEHICLE_READ', 'VEHICLE_ASSIGN',
        'DEPLOYMENT_CREATE', 'DEPLOYMENT_READ', 'DEPLOYMENT_UPDATE', 'DEPLOYMENT_END', 'DEPLOYMENT_REASSIGN', 'DEPLOYMENT_TRANSFER',
        'ATTENDANCE_RECORD', 'ATTENDANCE_READ',
        'LEAVE_CREATE', 'LEAVE_READ', 'LEAVE_UPDATE', 'LEAVE_CANCEL', 'LEAVE_BALANCE_READ', 'LEAVE_APPLY',
        'REPLACEMENT_CREATE', 'REPLACEMENT_READ', 'REPLACEMENT_UPDATE', 'REPLACEMENT_APPROVE', 'REPLACEMENT_CANCEL', 'REPLACEMENT_COMPLETE', 'REPLACEMENT_DISPATCH',
        'DOCUMENT_CREATE', 'DOCUMENT_READ', 'DOCUMENT_UPLOAD', 'DOCUMENT_DOWNLOAD',
        'COMPLIANCE_READ', 'EXPIRY_VIEW',
        'NOTIFICATION_READ', 'NOTIFICATION_UPDATE', 'REPORT_READ'
      ]
    },
    {
      name: 'Payroll & Accounts Officer',
      slug: 'payroll-accounts-officer',
      description: 'Manages salary structures, PF/ESI rules, monthly payroll, invoicing, credit notes, and payments.',
      isSystemDefault: true,
      permissionCodes: [
        'CLIENT_READ', 'EMPLOYEE_READ', 'EMPLOYEE_VIEW_SENSITIVE',
        'ATTENDANCE_READ', 'STATUTORY_MANAGE', 'STATUTORY_READ',
        'SALARY_CALCULATE', 'SALARY_APPROVE', 'PAYSLIP_GENERATE', 'PAYSLIP_READ',
        'INVOICE_CREATE', 'INVOICE_APPROVE', 'INVOICE_READ',
        'ADJUSTMENT_CREATE', 'PAYMENT_RECORD',
        'DOCUMENT_READ', 'DOCUMENT_DOWNLOAD',
        'NOTIFICATION_READ', 'NOTIFICATION_UPDATE',
        'REPORT_READ', 'REPORT_EXPORT', 'ANALYTICS_READ'
      ]
    },
    {
      name: 'HR & Compliance Officer',
      slug: 'hr-compliance-officer',
      description: 'Candidate recruitment, employee dossiers, document verification, and expiry tracking.',
      isSystemDefault: true,
      permissionCodes: [
        'EMPLOYEE_CREATE', 'EMPLOYEE_READ', 'EMPLOYEE_UPDATE', 'EMPLOYEE_VIEW_SENSITIVE',
        'DOCUMENT_CREATE', 'DOCUMENT_READ', 'DOCUMENT_UPLOAD', 'DOCUMENT_VERIFY', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_DELETE',
        'COMPLIANCE_READ', 'COMPLIANCE_UPDATE', 'EXPIRY_VIEW', 'EXPIRY_OVERRIDE',
        'RECRUITMENT_CREATE', 'RECRUITMENT_READ', 'RECRUITMENT_UPDATE', 'RECRUITMENT_APPROVE', 'RECRUITMENT_MANAGE', 'RECRUITMENT_CONVERT',
        'NOTIFICATION_READ', 'NOTIFICATION_UPDATE',
        'REPORT_READ', 'REPORT_EXPORT', 'ANALYTICS_READ'
      ]
    },
    {
      name: 'Field Supervisor / Site In-charge',
      slug: 'field-supervisor',
      description: 'Client site supervisor for daily attendance marking and shift replacement requests.',
      isSystemDefault: true,
      permissionCodes: [
        'CLIENT_READ', 'EMPLOYEE_READ', 'DEPLOYMENT_READ',
        'ATTENDANCE_RECORD', 'ATTENDANCE_READ', 'LEAVE_APPLY', 'REPLACEMENT_DISPATCH',
        'NOTIFICATION_READ', 'NOTIFICATION_UPDATE'
      ]
    }
  ];

  const rolesMap = new Map<string, string>();
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { slug: r.slug },
      update: { name: r.name, description: r.description },
      create: {
        name: r.name,
        slug: r.slug,
        description: r.description,
        isSystemDefault: r.isSystemDefault
      }
    });
    rolesMap.set(r.slug, role.id);

    // Link permissions
    for (const permCode of r.permissionCodes) {
      const permId = permissionsMap.get(permCode);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: permId }
          },
          update: {},
          create: { roleId: role.id, permissionId: permId }
        });
      }
    }
  }

  // ==========================================
  // 3. INITIAL SEED AGENCY & BRANCHES
  // ==========================================
  console.log('  -> Seeding Sample Agency and Branches...');
  const agency = await prisma.agency.upsert({
    where: { registrationNumber: 'CIN-U74999TN2020PTC135890' },
    update: {},
    create: {
      name: 'Apex Manpower Solutions Pvt Ltd',
      legalName: 'Apex Manpower Solutions Private Limited',
      registrationNumber: 'CIN-U74999TN2020PTC135890',
      pan: 'AABCA1234F',
      gstin: '33AABCA1234F1Z5',
      epfCode: 'TN/TRC/0089452/000',
      esicCode: '51000894520000101',
      linNumber: '1894562301',
      registeredAddress: '124, Cantonment Main Road, Tiruchirappalli, Tamil Nadu 620001',
      stateCode: '33',
      phone: '+91 431 2410500',
      email: 'admin@apexmanpower.in',
      website: 'https://apexmanpower.in',
      status: AgencyStatus.ACTIVE
    }
  });

  const branchTrichy = await prisma.agencyBranch.upsert({
    where: {
      agencyId_branchCode: { agencyId: agency.id, branchCode: 'TRC' }
    },
    update: {},
    create: {
      agencyId: agency.id,
      branchName: 'Tiruchirappalli Headquarters',
      branchCode: 'TRC',
      gstin: '33AABCA1234F1Z5',
      stateCode: '33',
      city: 'Tiruchirappalli',
      address: '124, Cantonment Main Road, Tiruchirappalli 620001',
      contactPerson: 'K. Senthil Kumar',
      contactPhone: '+91 94431 20001',
      contactEmail: 'trc.branch@apexmanpower.in',
      isHeadquarters: true,
      isActive: true
    }
  });

  const branchChennai = await prisma.agencyBranch.upsert({
    where: {
      agencyId_branchCode: { agencyId: agency.id, branchCode: 'CHN' }
    },
    update: {},
    create: {
      agencyId: agency.id,
      branchName: 'Chennai Regional Office',
      branchCode: 'CHN',
      gstin: '33AABCA1234F1Z5',
      stateCode: '33',
      city: 'Chennai',
      address: '45, Anna Salai, Guindy, Chennai 600032',
      contactPerson: 'M. Ramanathan',
      contactPhone: '+91 98401 50002',
      contactEmail: 'chn.branch@apexmanpower.in',
      isHeadquarters: false,
      isActive: true
    }
  });

  // ==========================================
  // 4. SUPER ADMIN USER
  // ==========================================
  console.log('  -> Seeding Default Super Admin User...');
  const passwordHash = await bcrypt.hash('Admin@Manpower2026', 10);
  await prisma.user.upsert({
    where: {
      agencyId_email: { agencyId: agency.id, email: 'admin@apexmanpower.in' }
    },
    update: {},
    create: {
      agencyId: agency.id,
      branchId: branchTrichy.id,
      email: 'admin@apexmanpower.in',
      passwordHash: passwordHash,
      fullName: 'Super Administrator',
      phone: '+91 94431 00000',
      roleId: rolesMap.get('super-admin')!
    }
  });

  // ==========================================
  // 5. STANDARD DESIGNATIONS
  // ==========================================
  console.log('  -> Seeding Standard Designations...');
  const designationsData = [
    { name: 'Commercial Heavy Vehicle Driver', code: 'DRIVER_HMV', category: DesignationCategory.DRIVER, minimumWageCategory: 'SKILLED' },
    { name: 'Light Transport Vehicle Driver', code: 'DRIVER_LMV', category: DesignationCategory.DRIVER, minimumWageCategory: 'SEMI_SKILLED' },
    { name: 'Security Guard (Unarmed)', code: 'SEC_GUARD', category: DesignationCategory.SECURITY, minimumWageCategory: 'SEMI_SKILLED' },
    { name: 'Armed Security Guard', code: 'SEC_ARMED', category: DesignationCategory.SECURITY, minimumWageCategory: 'SKILLED' },
    { name: 'Security Supervisor', code: 'SEC_SUPV', category: DesignationCategory.SECURITY, minimumWageCategory: 'HIGHLY_SKILLED' },
    { name: 'Commercial Housekeeper / Cleaner', code: 'HK_CLEANER', category: DesignationCategory.HOUSEKEEPING, minimumWageCategory: 'UNSKILLED' },
    { name: 'Industrial Warehouse Loader', code: 'WH_LOADER', category: DesignationCategory.WAREHOUSE, minimumWageCategory: 'UNSKILLED' },
    { name: 'Forklift Operator', code: 'IND_FORKLIFT', category: DesignationCategory.INDUSTRIAL, minimumWageCategory: 'SKILLED' }
  ];

  for (const d of designationsData) {
    await prisma.designation.upsert({
      where: { agencyId_code: { agencyId: agency.id, code: d.code } },
      update: {},
      create: {
        agencyId: agency.id,
        name: d.name,
        code: d.code,
        category: d.category,
        minimumWageCategory: d.minimumWageCategory
      }
    });
  }

  // ==========================================
  // 6. COMMON LEAVE TYPES
  // ==========================================
  console.log('  -> Seeding Standard Leave Types...');
  const leaveTypesData = [
    { name: 'Casual Leave', code: 'CL', daysPerYear: 12.0, isPaid: true, isAccumulative: false },
    { name: 'Sick Leave', code: 'SL', daysPerYear: 12.0, isPaid: true, isAccumulative: false },
    { name: 'Earned Leave / Annual Privilege', code: 'EL', daysPerYear: 15.0, isPaid: true, isAccumulative: true },
    { name: 'Loss of Pay (Unpaid Leave)', code: 'LOP', daysPerYear: 0.0, isPaid: false, isAccumulative: false }
  ];

  for (const lt of leaveTypesData) {
    await prisma.leaveType.upsert({
      where: { agencyId_code: { agencyId: agency.id, code: lt.code } },
      update: {},
      create: {
        agencyId: agency.id,
        name: lt.name,
        code: lt.code,
        daysPerYear: lt.daysPerYear,
        isPaid: lt.isPaid,
        isAccumulative: lt.isAccumulative
      }
    });
  }

  // ==========================================
  // 7. COMPLIANCE DOCUMENT TYPES
  // ==========================================
  console.log('  -> Seeding Document Types...');
  const documentTypesData = [
    { name: 'Aadhaar Identity Card', code: 'AADHAAR', applicableEntity: DocumentEntityType.EMPLOYEE, isMandatory: true, requiresExpiryDate: false, defaultAlertDays: [] },
    { name: 'Income Tax PAN Card', code: 'PAN', applicableEntity: DocumentEntityType.EMPLOYEE, isMandatory: true, requiresExpiryDate: false, defaultAlertDays: [] },
    { name: 'Commercial Driving License with Badge', code: 'DRIVING_LICENSE', applicableEntity: DocumentEntityType.EMPLOYEE, isMandatory: false, requiresExpiryDate: true, defaultAlertDays: [60, 30, 15, 7] },
    { name: 'Police Verification Certificate', code: 'POLICE_VERIFICATION', applicableEntity: DocumentEntityType.EMPLOYEE, isMandatory: true, requiresExpiryDate: true, defaultAlertDays: [30, 15, 7] },
    { name: 'Vehicle Registration Certificate (RC)', code: 'VEHICLE_RC', applicableEntity: DocumentEntityType.VEHICLE, isMandatory: true, requiresExpiryDate: true, defaultAlertDays: [60, 30, 15, 7] },
    { name: 'Vehicle Commercial Fitness Certificate (FC)', code: 'VEHICLE_FC', applicableEntity: DocumentEntityType.VEHICLE, isMandatory: true, requiresExpiryDate: true, defaultAlertDays: [60, 30, 15, 7] },
    { name: 'Commercial Vehicle Insurance Policy', code: 'VEHICLE_INSURANCE', applicableEntity: DocumentEntityType.VEHICLE, isMandatory: true, requiresExpiryDate: true, defaultAlertDays: [60, 30, 15, 7] },
    { name: 'Pollution Under Control Certificate (PUC)', code: 'VEHICLE_PUC', applicableEntity: DocumentEntityType.VEHICLE, isMandatory: true, requiresExpiryDate: true, defaultAlertDays: [30, 15, 7] },
    { name: 'Client Master Service Agreement (Contract)', code: 'CLIENT_CONTRACT', applicableEntity: DocumentEntityType.CLIENT, isMandatory: true, requiresExpiryDate: true, defaultAlertDays: [60, 30, 15] }
  ];

  for (const dt of documentTypesData) {
    await prisma.documentType.upsert({
      where: { agencyId_code: { agencyId: agency.id, code: dt.code } },
      update: {},
      create: {
        agencyId: agency.id,
        name: dt.name,
        code: dt.code,
        applicableEntity: dt.applicableEntity,
        isMandatory: dt.isMandatory,
        requiresExpiryDate: dt.requiresExpiryDate,
        defaultAlertDays: dt.defaultAlertDays
      }
    });
  }

  // ==========================================
  // 8. INDIAN STATUTORY RULE TEMPLATES
  // ==========================================
  console.log('  -> Seeding Configurable Indian Statutory Rules (Templates)...');
  // 1. Employees Provident Fund (EPF India)
  await prisma.statutoryRule.create({
    data: {
      agencyId: agency.id,
      ruleType: StatutoryRuleType.EPF,
      stateCode: null, // Federal
      effectiveFrom: new Date('2026-04-01'),
      effectiveTo: null,
      wageCeiling: 15000.00,
      employeeContributionPct: 12.000,
      employerContributionPct: 12.000,
      calculationMethod: StatutoryCalcMethod.PERCENTAGE_ON_BASIC_DA,
      roundingMethod: RoundingMethod.NEAREST_INTEGER,
      ruleConfig: {
        description: 'Employees Provident Fund & Miscellaneous Provisions Act, 1952',
        statutory_breakdown: {
          employee_epf_pct: 12.00,
          employer_epf_ac1_pct: 3.67,
          employer_eps_ac10_pct: 8.33,
          employer_edli_ac21_pct: 0.50,
          employer_admin_ac2_pct: 0.50
        },
        max_statutory_eps_wage_ceiling: 15000.00,
        remarks: 'Configurable template; must verify current official gazette before live payroll run.'
      },
      isActive: true
    }
  });

  // 2. Employees State Insurance (ESIC India)
  await prisma.statutoryRule.create({
    data: {
      agencyId: agency.id,
      ruleType: StatutoryRuleType.ESIC,
      stateCode: null, // Federal
      effectiveFrom: new Date('2026-04-01'),
      effectiveTo: null,
      wageCeiling: 21000.00,
      employeeContributionPct: 0.750,
      employerContributionPct: 3.250,
      calculationMethod: StatutoryCalcMethod.PERCENTAGE_ON_GROSS,
      roundingMethod: RoundingMethod.ROUND_UP,
      ruleConfig: {
        description: 'Employees State Insurance Act, 1948',
        exempt_daily_wage_threshold: 176.00,
        remarks: 'Configurable template; must verify current official gazette before live payroll run.'
      },
      isActive: true
    }
  });

  // 3. Professional Tax (Tamil Nadu State Slab Template)
  await prisma.statutoryRule.create({
    data: {
      agencyId: agency.id,
      ruleType: StatutoryRuleType.PROFESSIONAL_TAX,
      stateCode: '33', // Tamil Nadu
      effectiveFrom: new Date('2026-04-01'),
      effectiveTo: null,
      wageCeiling: null,
      employeeContributionPct: 0.000,
      employerContributionPct: 0.000,
      calculationMethod: StatutoryCalcMethod.SLAB_BASED,
      roundingMethod: RoundingMethod.EXACT,
      ruleConfig: {
        description: 'Tamil Nadu Municipal Corporation Professional Tax Half-Yearly Slabs (Monthly Accrual)',
        half_yearly_slabs: [
          { min_half_year_gross: 0, max_half_year_gross: 21000, half_yearly_tax: 0 },
          { min_half_year_gross: 21001, max_half_year_gross: 30000, half_yearly_tax: 100 },
          { min_half_year_gross: 30001, max_half_year_gross: 45000, half_yearly_tax: 235 },
          { min_half_year_gross: 45001, max_half_year_gross: 60000, half_yearly_tax: 510 },
          { min_half_year_gross: 60001, max_half_year_gross: 75000, half_yearly_tax: 760 },
          { min_half_year_gross: 75001, max_half_year_gross: 999999999, half_yearly_tax: 1095 }
        ]
      },
      isActive: true
    }
  });

  // 4. Labour Welfare Fund (Tamil Nadu LWF Template)
  await prisma.statutoryRule.create({
    data: {
      agencyId: agency.id,
      ruleType: StatutoryRuleType.LWF,
      stateCode: '33', // Tamil Nadu
      effectiveFrom: new Date('2026-04-01'),
      effectiveTo: null,
      wageCeiling: null,
      employeeContributionPct: 0.000,
      employerContributionPct: 0.000,
      calculationMethod: StatutoryCalcMethod.FIXED_AMOUNT,
      roundingMethod: RoundingMethod.EXACT,
      ruleConfig: {
        description: 'Tamil Nadu Labour Welfare Fund Annual/Monthly Contribution',
        employee_fixed_amount: 20.00,
        employer_fixed_amount: 40.00,
        deduction_frequency: 'MONTHLY'
      },
      isActive: true
    }
  });

  // ==========================================
  // 9. INVOICE SEQUENCE INITIALIZATION
  // ==========================================
  console.log('  -> Seeding Invoice Sequences...');
  await prisma.invoiceSequence.upsert({
    where: {
      branchId_financialYear_documentType: {
        branchId: branchTrichy.id,
        financialYear: '2026-27',
        documentType: 'INV'
      }
    },
    update: {},
    create: {
      agencyId: agency.id,
      branchId: branchTrichy.id,
      financialYear: '2026-27',
      documentType: 'INV',
      lastSequence: 0
    }
  });

  await prisma.invoiceSequence.upsert({
    where: {
      branchId_financialYear_documentType: {
        branchId: branchChennai.id,
        financialYear: '2026-27',
        documentType: 'INV'
      }
    },
    update: {},
    create: {
      agencyId: agency.id,
      branchId: branchChennai.id,
      financialYear: '2026-27',
      documentType: 'INV',
      lastSequence: 0
    }
  });

  console.log('✅ Seeding Completed Successfully!');
  console.log('   Default Super Admin: admin@apexmanpower.in / Admin@Manpower2026');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
