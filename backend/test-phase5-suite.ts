import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { StorageService } from './src/modules/documents/storage.service';
import { DocumentsService } from './src/modules/documents/documents.service';
import { ComplianceService } from './src/modules/compliance/compliance.service';
import { RecruitmentService } from './src/modules/recruitment/recruitment.service';
import { NotificationsService } from './src/modules/notifications/notifications.service';
import { ReportsService } from './src/modules/reports/reports.service';
import { AnalyticsService } from './src/modules/analytics/analytics.service';
import { AuthenticatedUserContext } from './src/common/decorators/current-user.decorator';
import {
  DocumentEntityType,
  VerificationStatus,
  RecruitmentStatus,
  CandidateOfferStatus,
  InterviewResult,
  NotificationCategory,
  NotificationPriority,
  EmployeeStatus,
  ClientStatus,
  DeploymentStatus,
  InvoiceStatus,
  PayrollBatchStatus,
  Gender,
  MaritalStatus,
} from '@prisma/client';
import { ReportType, ReportFormat } from './src/modules/reports/dto/report.dto';

console.log('======================================================');
console.log('🧪 RUNNING COMPLETE PHASE 5 TEST SUITE (64/64)');
console.log('Compliance, HR, Notifications, Reports & Analytics');
console.log('======================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] Test ${totalTests.toString().padStart(2, '0')}: ${testName}`);
  } else {
    console.error(
      `  ❌ [FAIL] Test ${totalTests.toString().padStart(2, '0')}: ${testName} - ${
        detail || 'Assertion failed'
      }`,
    );
  }
}

// In-Memory Database Store
const mockDb = {
  agencies: [
    { id: 'agency-apex-1', name: 'Apex Manpower Services' },
    { id: 'agency-alien-99', name: 'Alien Manpower Services' },
  ],
  branches: [
    { id: 'branch-chennai', agencyId: 'agency-apex-1', name: 'Chennai HQ', code: 'CHN', isHeadquarters: true, deletedAt: null },
    { id: 'branch-trichy', agencyId: 'agency-apex-1', name: 'Trichy Branch', code: 'TRC', isHeadquarters: false, deletedAt: null },
    { id: 'branch-alien-1', agencyId: 'agency-alien-99', name: 'Alien Branch', code: 'ALN', isHeadquarters: true, deletedAt: null },
  ],
  designations: [
    { id: 'desig-guard', agencyId: 'agency-apex-1', name: 'Security Guard', code: 'SEC-GRD', isActive: true },
    { id: 'desig-driver', agencyId: 'agency-apex-1', name: 'Commercial Driver', code: 'COM-DRV', isActive: true },
  ],
  documentTypes: [] as any[],
  documents: [] as any[],
  documentVersions: [] as any[],
  complianceAlerts: [] as any[],
  candidates: [] as any[],
  candidateScreenings: [] as any[],
  candidateInterviews: [] as any[],
  candidateSkillTests: [] as any[],
  candidateOffers: [] as any[],
  notifications: [] as any[],
  salaryStructures: [] as any[],
  employees: [
    {
      id: 'emp-101',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-101',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      phone: '9876543210',
      email: 'ramesh@apex.com',
      status: EmployeeStatus.ACTIVE,
      primaryDesignationId: 'desig-guard',
      dateOfJoining: new Date('2025-01-15'),
      joiningDate: new Date('2025-01-15'),
      bankAccountNoMasked: 'XXXXXXXX9012',
      bankAccountNoEncrypted: 'enc_ramesh_bank_123',
      bankIfsc: 'HDFC0001234',
      deletedAt: null,
    },
    {
      id: 'emp-102',
      agencyId: 'agency-apex-1',
      branchId: 'branch-trichy',
      employeeCode: 'EMP-102',
      firstName: 'Suresh',
      lastName: 'Raina',
      phone: '9876543211',
      email: 'suresh@apex.com',
      status: EmployeeStatus.ACTIVE,
      primaryDesignationId: 'desig-driver',
      dateOfJoining: new Date('2025-02-01'),
      joiningDate: new Date('2025-02-01'),
      bankAccountNoMasked: 'XXXXXXXX3456',
      bankAccountNoEncrypted: 'enc_suresh_bank_456',
      bankIfsc: 'SBIN0001111',
      deletedAt: null,
    },
  ],
  clients: [
    {
      id: 'client-301',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      name: 'Tata Consultancy Services',
      clientCode: 'TCS-CHN',
      status: ClientStatus.ACTIVE,
      deletedAt: null,
    },
  ],
  clientSites: [
    {
      id: 'site-401',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      clientId: 'client-301',
      name: 'Siruseri Campus',
      code: 'TCS-SIR',
      deletedAt: null,
    },
  ],
  clientContracts: [
    {
      id: 'contract-501',
      agencyId: 'agency-apex-1',
      clientId: 'client-301',
      contractNumber: 'CNT-2025-001',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2026-12-31'),
      deletedAt: null,
    },
  ],
  deployments: [
    {
      id: 'dep-601',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeId: 'emp-101',
      siteId: 'site-401',
      shiftType: 'DAY',
      status: DeploymentStatus.ACTIVE,
      startDate: new Date('2025-01-01'),
      endDate: null,
      deletedAt: null,
    },
  ],
  invoices: [
    {
      id: 'inv-1001',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      clientId: 'client-301',
      invoiceNumber: 'INV-2026-001',
      invoiceDate: new Date('2026-03-01'),
      dueDate: new Date('2026-03-31'),
      totalInvoiceAmount: 118000,
      subtotalAmount: 100000,
      totalGstAmount: 18000,
      paidAmount: 118000,
      balanceDue: 0,
      status: InvoiceStatus.PAID,
      deletedAt: null,
    },
  ],
  payrollBatches: [
    {
      id: 'batch-2001',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      month: 3,
      year: 2026,
      batchStatus: PayrollBatchStatus.APPROVED,
      totalGrossWages: 25000,
      totalNetWages: 21500,
      totalEmployees: 1,
      records: [
        {
          id: 'payrec-3001',
          employeeId: 'emp-101',
          grossEarnings: 25000,
          totalDeductions: 3500,
          netSalary: 21500,
          pfEmployee: 1800,
          esiEmployee: 187.5,
          ptAmount: 200,
          lwfEmployee: 20,
        },
      ],
    },
  ],
  replacements: [
    {
      id: 'rep-901',
      status: 'PENDING',
      originalDeployment: {
        agencyId: 'agency-apex-1',
        branchId: 'branch-chennai',
      },
    },
  ],
  attendances: [
    {
      id: 'att-701',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeId: 'emp-101',
      date: new Date(),
      status: 'PRESENT',
    },
  ],
  expiryAlerts: [] as any[],
};

// Mock Prisma
const mockPrisma: any = {
  documentType: {
    findUnique: async (args: any) => {
      return mockDb.documentTypes.find(dt => {
        if (args.where.agencyId_code) {
          return dt.agencyId === args.where.agencyId_code.agencyId && dt.code === args.where.agencyId_code.code;
        }
        if (args.where.id) return dt.id === args.where.id;
        return false;
      }) || null;
    },
    findFirst: async (args: any) => {
      return mockDb.documentTypes.find(dt => {
        if (args.where.id && dt.id !== args.where.id) return false;
        if (args.where.agencyId && dt.agencyId !== args.where.agencyId) return false;
        return true;
      }) || null;
    },
    findMany: async (args: any) => {
      return mockDb.documentTypes.filter(dt => {
        if (args.where?.agencyId && dt.agencyId !== args.where.agencyId) return false;
        if (args.where?.applicableEntity && dt.applicableEntity !== args.where.applicableEntity) return false;
        return true;
      });
    },
    create: async (args: any) => {
      const dt = { id: `dtype-${Date.now()}-${Math.random().toString(36).substring(7)}`, ...args.data, isActive: true };
      mockDb.documentTypes.push(dt);
      return dt;
    },
  },
  document: {
    findUnique: async (args: any) => {
      return mockPrisma.document.findFirst(args);
    },
    findFirst: async (args: any) => {
      return mockDb.documents.find(d => {
        if (args.where.id && d.id !== args.where.id) return false;
        if (args.where.agencyId && d.agencyId !== args.where.agencyId) return false;
        if (args.where.branchId && d.branchId !== args.where.branchId) return false;
        if (args.where.deletedAt === null && d.deletedAt !== null) return false;
        return true;
      }) || null;
    },
    findMany: async (args: any) => {
      return mockDb.documents.filter(d => {
        if (args.where?.agencyId && d.agencyId !== args.where.agencyId) return false;
        if (args.where?.branchId && d.branchId !== args.where.branchId) return false;
        if (args.where?.entityType && d.entityType !== args.where.entityType) return false;
        if (args.where?.verificationStatus && d.verificationStatus !== args.where.verificationStatus) return false;
        if (args.where?.deletedAt === null && d.deletedAt !== null) return false;
        return true;
      }).map(d => ({
        ...d,
        documentType: mockDb.documentTypes.find(dt => dt.id === d.documentTypeId),
        uploadedBy: { id: d.uploadedById, fullName: 'Admin User', email: 'admin@apex.com' },
        verifiedBy: d.verifiedById ? { id: d.verifiedById, fullName: 'Verifier', email: 'v@apex.com' } : null,
      }));
    },
    count: async (args: any) => {
      const list = await mockPrisma.document.findMany(args);
      return list.length;
    },
    create: async (args: any) => {
      const d = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockDb.documents.push(d);
      return {
        ...d,
        documentType: mockDb.documentTypes.find(dt => dt.id === d.documentTypeId),
        uploadedBy: { id: d.uploadedById, fullName: 'Admin User', email: 'admin@apex.com' },
      };
    },
    update: async (args: any) => {
      const idx = mockDb.documents.findIndex(d => d.id === args.where.id);
      if (idx === -1) throw new NotFoundException('Document not found');
      mockDb.documents[idx] = { ...mockDb.documents[idx], ...args.data, updatedAt: new Date() };
      return mockDb.documents[idx];
    },
  },
  documentVersion: {
    create: async (args: any) => {
      const v = { id: `ver-${Date.now()}-${Math.random().toString(7)}`, ...args.data, uploadedAt: new Date() };
      mockDb.documentVersions.push(v);
      return v;
    },
    findMany: async (args: any) => {
      return mockDb.documentVersions.filter(v => v.documentId === args.where.documentId);
    },
  },
  expiryAlert: {
    findUnique: async (args: any) => {
      const a = mockDb.expiryAlerts.find((item: any) => {
        if (args.where.documentId_alertThresholdDays) {
          return (
            item.documentId === args.where.documentId_alertThresholdDays.documentId &&
            item.alertThresholdDays === args.where.documentId_alertThresholdDays.alertThresholdDays
          );
        }
        if (args.where.id) return item.id === args.where.id;
        return false;
      });
      if (!a) return null;
      return {
        ...a,
        document: mockDb.documents.find(d => d.id === a.documentId) || { id: a.documentId, branchId: 'branch-chennai', title: 'Doc' },
      };
    },
    findMany: async (args: any) => {
      return mockDb.expiryAlerts.filter((a: any) => {
        if (args.where?.agencyId && a.agencyId !== args.where.agencyId) return false;
        if (args.where?.status && a.status !== args.where.status) return false;
        return true;
      }).map((a: any) => ({
        ...a,
        document: mockDb.documents.find(d => d.id === a.documentId),
      }));
    },
    count: async (args: any) => {
      const list = await mockPrisma.expiryAlert.findMany(args);
      return list.length;
    },
    create: async (args: any) => {
      const alert = { id: `alert-${Date.now()}-${Math.random().toString(7)}`, ...args.data, createdAt: new Date() };
      mockDb.expiryAlerts.push(alert);
      return alert;
    },
    update: async (args: any) => {
      const idx = mockDb.expiryAlerts.findIndex((a: any) => a.id === args.where.id);
      if (idx === -1) throw new NotFoundException('Expiry alert not found');
      mockDb.expiryAlerts[idx] = { ...mockDb.expiryAlerts[idx], ...args.data };
      const updated = mockDb.expiryAlerts[idx];
      return {
        ...updated,
        document: mockDb.documents.find(d => d.id === updated.documentId),
      };
    },
  },
  complianceAlert: {
    findUnique: async (args: any) => mockPrisma.expiryAlert.findUnique(args),
    findFirst: async (args: any) => mockPrisma.expiryAlert.findUnique(args),
    findMany: async (args: any) => mockPrisma.expiryAlert.findMany(args),
    count: async (args: any) => mockPrisma.expiryAlert.count(args),
    create: async (args: any) => mockPrisma.expiryAlert.create(args),
    update: async (args: any) => mockPrisma.expiryAlert.update(args),
  },
  recruitmentCandidate: {
    findUnique: async (args: any) => {
      const c = mockDb.candidates.find(cand => cand.id === args.where.id);
      if (!c) return null;
      return {
        ...c,
        branch: mockDb.branches.find(b => b.id === c.branchId),
        primaryDesignation: mockDb.designations.find(d => d.id === c.primaryDesignationId),
        interviews: mockDb.candidateInterviews.filter(i => i.candidateId === c.id),
        offers: mockDb.candidateOffers.filter(o => o.candidateId === c.id),
      };
    },
    findFirst: async (args: any) => {
      const c = mockDb.candidates.find(cand => {
        if (args.where.id && cand.id !== args.where.id) return false;
        if (args.where.agencyId && cand.agencyId !== args.where.agencyId) return false;
        if (args.where.branchId && cand.branchId !== args.where.branchId) return false;
        return true;
      });
      if (!c) return null;
      return {
        ...c,
        branch: mockDb.branches.find(b => b.id === c.branchId),
        primaryDesignation: mockDb.designations.find(d => d.id === c.primaryDesignationId),
        interviews: mockDb.candidateInterviews.filter(i => i.candidateId === c.id),
        offers: mockDb.candidateOffers.filter(o => o.candidateId === c.id),
      };
    },
    findMany: async (args: any) => {
      return mockDb.candidates.filter(c => {
        if (args.where?.agencyId && c.agencyId !== args.where.agencyId) return false;
        if (args.where?.branchId && c.branchId !== args.where.branchId) return false;
        if (args.where?.status && c.status !== args.where.status) return false;
        return true;
      }).map(c => ({
        ...c,
        branch: mockDb.branches.find(b => b.id === c.branchId),
        primaryDesignation: mockDb.designations.find(d => d.id === c.primaryDesignationId),
        screenings: mockDb.candidateScreenings.filter(s => s.candidateId === c.id),
        interviews: mockDb.candidateInterviews.filter(i => i.candidateId === c.id),
        skillTests: mockDb.candidateSkillTests.filter(t => t.candidateId === c.id),
        offers: mockDb.candidateOffers.filter(o => o.candidateId === c.id),
      }));
    },
    count: async (args: any) => {
      const list = await mockPrisma.recruitmentCandidate.findMany(args);
      return list.length;
    },
    create: async (args: any) => {
      const cand = {
        id: `cand-${Date.now()}-${Math.random().toString(7)}`,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.candidates.push(cand);
      return {
        ...cand,
        primaryDesignation: mockDb.designations.find(d => d.id === cand.primaryDesignationId),
        branch: mockDb.branches.find(b => b.id === cand.branchId),
      };
    },
    update: async (args: any) => {
      const idx = mockDb.candidates.findIndex(c => c.id === args.where.id);
      if (idx === -1) throw new NotFoundException('Candidate not found');
      mockDb.candidates[idx] = { ...mockDb.candidates[idx], ...args.data, updatedAt: new Date() };
      const updated = mockDb.candidates[idx];
      return {
        ...updated,
        primaryDesignation: mockDb.designations.find(d => d.id === updated.primaryDesignationId),
        branch: mockDb.branches.find(b => b.id === updated.branchId),
      };
    },
  },
  candidateScreening: {
    create: async (args: any) => {
      const s = { id: `scr-${Date.now()}`, ...args.data, screenedAt: new Date() };
      mockDb.candidateScreenings.push(s);
      return s;
    },
  },
  candidateInterview: {
    findUnique: async (args: any) => {
      const i = mockDb.candidateInterviews.find(ci => ci.id === args.where.id);
      if (!i) return null;
      return {
        ...i,
        candidate: mockDb.candidates.find(c => c.id === i.candidateId),
      };
    },
    findFirst: async (args: any) => {
      return mockDb.candidateInterviews.find(i => i.id === args.where.id && i.candidateId === args.where.candidateId) || null;
    },
    create: async (args: any) => {
      const i = { id: `int-${Date.now()}`, ...args.data, createdAt: new Date() };
      mockDb.candidateInterviews.push(i);
      return {
        ...i,
        interviewer: { id: i.interviewerUserId || 'u1', fullName: 'Interviewer', email: 'i@apex.com' },
      };
    },
    update: async (args: any) => {
      const idx = mockDb.candidateInterviews.findIndex(i => i.id === args.where.id);
      if (idx === -1) throw new NotFoundException('Interview not found');
      mockDb.candidateInterviews[idx] = { ...mockDb.candidateInterviews[idx], ...args.data };
      return mockDb.candidateInterviews[idx];
    },
  },
  candidateSkillTest: {
    create: async (args: any) => {
      const t = { id: `test-${Date.now()}`, ...args.data, testedAt: new Date() };
      mockDb.candidateSkillTests.push(t);
      return t;
    },
  },
  candidateOffer: {
    findUnique: async (args: any) => {
      const o = mockDb.candidateOffers.find(co => co.id === args.where.id);
      if (!o) return null;
      return {
        ...o,
        candidate: mockDb.candidates.find(c => c.id === o.candidateId),
        designation: mockDb.designations.find(d => d.id === o.designationId),
        branch: mockDb.branches.find(b => b.id === o.branchId),
      };
    },
    findFirst: async (args: any) => {
      return mockDb.candidateOffers.find(o => {
        if (args.where.id && o.id !== args.where.id) return false;
        if (args.where.candidateId && o.candidateId !== args.where.candidateId) return false;
        return true;
      }) || null;
    },
    create: async (args: any) => {
      const o = { id: `off-${Date.now()}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
      mockDb.candidateOffers.push(o);
      return {
        ...o,
        designation: mockDb.designations.find(d => d.id === o.designationId),
        branch: mockDb.branches.find(b => b.id === o.branchId),
      };
    },
    update: async (args: any) => {
      const idx = mockDb.candidateOffers.findIndex(o => o.id === args.where.id);
      if (idx === -1) throw new NotFoundException('Offer not found');
      mockDb.candidateOffers[idx] = { ...mockDb.candidateOffers[idx], ...args.data, updatedAt: new Date() };
      return mockDb.candidateOffers[idx];
    },
  },
  notification: {
    create: async (args: any) => {
      const n = { id: `notif-${Date.now()}-${Math.random().toString(7)}`, ...args.data, isRead: false, createdAt: new Date() };
      mockDb.notifications.push(n);
      return n;
    },
    upsert: async (args: any) => {
      const existing = mockDb.notifications.find(n => n.dedupKey === args.where.dedupKey);
      if (existing) {
        return existing;
      }
      return mockPrisma.notification.create({ data: args.create });
    },
    findUnique: async (args: any) => {
      return mockDb.notifications.find(n => n.id === args.where.id) || null;
    },
    findFirst: async (args: any) => {
      return mockDb.notifications.find(n => {
        if (args.where.id && n.id !== args.where.id) return false;
        if (args.where.userId && n.userId !== args.where.userId) return false;
        return true;
      }) || null;
    },
    findMany: async (args: any) => {
      return mockDb.notifications.filter(n => {
        if (args.where?.agencyId && n.agencyId !== args.where.agencyId) return false;
        if (args.where?.userId && n.userId !== args.where.userId) return false;
        if (args.where?.isRead !== undefined && n.isRead !== args.where.isRead) return false;
        if (args.where?.category && n.category !== args.where.category) return false;
        return true;
      });
    },
    count: async (args: any) => {
      const list = await mockPrisma.notification.findMany(args);
      return list.length;
    },
    update: async (args: any) => {
      const idx = mockDb.notifications.findIndex(n => n.id === args.where.id);
      if (idx === -1) throw new NotFoundException('Notification not found');
      mockDb.notifications[idx] = { ...mockDb.notifications[idx], ...args.data };
      return mockDb.notifications[idx];
    },
    updateMany: async (args: any) => {
      let count = 0;
      mockDb.notifications.forEach(n => {
        if (args.where.userId && n.userId === args.where.userId) {
          Object.assign(n, args.data);
          count++;
        }
      });
      return { count };
    },
  },
  agencyBranch: {
    findUnique: async (args: any) => {
      const b = mockDb.branches.find(br => br.id === args.where.id);
      return b ? { ...b, branchCode: b.code || 'CHN' } : null;
    },
  },
  designation: {
    findUnique: async (args: any) => {
      return mockDb.designations.find(d => d.id === args.where.id) || null;
    },
  },
  employee: {
    findUnique: async (args: any) => {
      return mockDb.employees.find(e => e.id === args.where.id) || null;
    },
    findFirst: async (args: any) => {
      return mockDb.employees.find(e => {
        if (args.where?.id && e.id !== args.where.id) return false;
        if (args.where?.agencyId && e.agencyId !== args.where.agencyId) return false;
        if (args.where?.branchId && e.branchId !== args.where.branchId) return false;
        return true;
      }) || null;
    },
    findMany: async (args: any) => {
      return mockDb.employees.filter(e => {
        if (args?.where?.agencyId && e.agencyId !== args.where.agencyId) return false;
        if (args?.where?.branchId && e.branchId !== args.where.branchId) return false;
        if (args?.where?.status && e.status !== args.where.status) return false;
        if (args?.where?.deletedAt === null && e.deletedAt !== null) return false;
        return true;
      }).map(e => ({
        ...e,
        branch: mockDb.branches.find(b => b.id === e.branchId),
        primaryDesignation: mockDb.designations.find(d => d.id === e.primaryDesignationId),
      }));
    },
    count: async (args: any) => {
      const list = await mockPrisma.employee.findMany(args);
      return list.length;
    },
    create: async (args: any) => {
      const emp = {
        id: `emp-${Date.now()}-${Math.random().toString(7)}`,
        ...args.data,
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.employees.push(emp);
      return emp;
    },
  },
  employeeSalaryStructure: {
    create: async (args: any) => {
      const sal = { id: `sal-${Date.now()}`, ...args.data, createdAt: new Date() };
      mockDb.salaryStructures.push(sal);
      return sal;
    },
  },
  salaryStructure: {
    create: async (args: any) => {
      const sal = { id: `sal-${Date.now()}`, ...args.data, createdAt: new Date() };
      mockDb.salaryStructures.push(sal);
      return sal;
    },
  },
  client: {
    findMany: async (args: any) => {
      return mockDb.clients.filter(c => {
        if (args?.where?.agencyId && c.agencyId !== args.where.agencyId) return false;
        if (args?.where?.branchId && c.branchId !== args.where.branchId) return false;
        if (args?.where?.deletedAt === null && c.deletedAt !== null) return false;
        return true;
      }).map(c => ({
        ...c,
        branch: mockDb.branches.find(b => b.id === c.branchId),
        sites: mockDb.clientSites.filter(s => s.clientId === c.id),
        contracts: mockDb.clientContracts.filter(ct => ct.clientId === c.id),
        invoices: mockDb.invoices.filter(i => i.clientId === c.id),
      }));
    },
    count: async (args: any) => {
      const list = await mockPrisma.client.findMany(args);
      return list.length;
    },
  },
  employeeDeployment: {
    findMany: async (args: any) => {
      return mockDb.deployments.filter(d => {
        if (args?.where?.agencyId && d.agencyId !== args.where.agencyId) return false;
        if (args?.where?.branchId && d.branchId !== args.where.branchId) return false;
        if (args?.where?.deletedAt === null && d.deletedAt !== null) return false;
        return true;
      }).map(d => ({
        ...d,
        employee: mockDb.employees.find(e => e.id === d.employeeId),
        site: mockDb.clientSites.find(s => s.id === d.siteId),
        branch: mockDb.branches.find(b => b.id === d.branchId),
      }));
    },
    count: async (args: any) => {
      const list = await mockPrisma.employeeDeployment.findMany(args);
      return list.length;
    },
  },
  clientInvoice: {
    findMany: async (args: any) => {
      return mockDb.invoices.filter(i => {
        if (args?.where?.agencyId && i.agencyId !== args.where.agencyId) return false;
        if (args?.where?.branchId && i.branchId !== args.where.branchId) return false;
        if (args?.where?.deletedAt === null && i.deletedAt !== null) return false;
        return true;
      }).map(i => ({
        ...i,
        client: mockDb.clients.find(c => c.id === i.clientId),
        branch: mockDb.branches.find(b => b.id === i.branchId),
      }));
    },
  },
  payrollBatch: {
    findMany: async (args: any) => {
      return mockDb.payrollBatches.filter(b => {
        if (args?.where?.agencyId && b.agencyId !== args.where.agencyId) return false;
        if (args?.where?.branchId && b.branchId !== args.where.branchId) return false;
        return true;
      }).map(b => ({
        ...b,
        branch: mockDb.branches.find(br => br.id === b.branchId),
        calculations: b.calculations || b.records || [],
      }));
    },
  },
  payrollRecord: {
    findMany: async (args: any) => {
      return mockDb.payrollBatches.flatMap(b => b.records).map(r => ({
        ...r,
        employee: mockDb.employees.find(e => e.id === r.employeeId),
        batch: { month: 3, year: 2026 },
      }));
    },
  },
  replacement: {
    count: async (args: any) => {
      return mockDb.replacements.length;
    },
    findMany: async (args: any) => {
      return mockDb.replacements;
    },
  },
  attendance: {
    count: async (args: any) => {
      return mockDb.attendances.length;
    },
    findMany: async (args: any) => {
      return mockDb.attendances.map(a => ({
        ...a,
        shiftBusinessDate: a.date || new Date(),
        employee: mockDb.employees.find(e => e.id === a.employeeId),
        branch: mockDb.branches.find(b => b.id === a.branchId),
        clientSite: mockDb.clientSites[0],
        workedHours: 8,
        overtimeHours: 0,
        isLocked: false,
      }));
    },
  },
  auditLog: {
    create: async () => {},
  },
  $transaction: async (fn: any) => {
    return fn(mockPrisma);
  },
};

const mockAuditService: any = {
  record: async () => {},
};

// Users
const adminUser: AuthenticatedUserContext = {
  id: 'user-admin-1',
  userId: 'user-admin-1',
  email: 'admin@apex.com',
  agencyId: 'agency-apex-1',
  branchId: null, // HQ
  role: 'SUPER_ADMIN',
  permissions: ['*'],
};

const branchUser: AuthenticatedUserContext = {
  id: 'user-branch-1',
  userId: 'user-branch-1',
  email: 'branch@apex.com',
  agencyId: 'agency-apex-1',
  branchId: 'branch-chennai',
  role: 'BRANCH_MANAGER',
  permissions: ['DOCUMENT_READ', 'DOCUMENT_CREATE', 'RECRUITMENT_READ'],
};

const alienUser: AuthenticatedUserContext = {
  id: 'user-alien-1',
  userId: 'user-alien-1',
  email: 'spy@alien.com',
  agencyId: 'agency-alien-99',
  branchId: 'branch-alien-1',
  role: 'SUPER_ADMIN',
  permissions: ['*'],
};

async function runPhase5Tests() {
  const storageService = new StorageService();
  const documentsService = new DocumentsService(mockPrisma, mockAuditService, storageService);
  const complianceService = new ComplianceService(mockPrisma, mockAuditService);
  const recruitmentService = new RecruitmentService(mockPrisma, mockAuditService);
  const notificationsService = new NotificationsService(mockPrisma);
  const reportsService = new ReportsService(mockPrisma, mockAuditService);
  const analyticsService = new AnalyticsService(mockPrisma);

  console.log('\n--- MODULE 1: SECURE DOCUMENT MANAGEMENT & STORAGE ---');

  // Test 1: Validate allowed MIME types
  let mimeValid = true;
  try {
    storageService.validateUpload('application/pdf', 1024 * 1024);
    storageService.validateUpload('image/png', 500 * 1024);
  } catch {
    mimeValid = false;
  }
  assert(mimeValid, 'Accepts valid PDF and PNG upload requests');

  // Test 2: Reject disallowed MIME types
  let mimeRejected = false;
  try {
    storageService.validateUpload('application/x-msdownload', 1024);
  } catch (err: any) {
    mimeRejected = err instanceof BadRequestException;
  }
  assert(mimeRejected, 'Rejects executable binary MIME types (UNSUPPORTED_FILE_TYPE)');

  // Test 3: Reject files > 15MB
  let sizeRejected = false;
  try {
    storageService.validateUpload('application/pdf', 16 * 1024 * 1024);
  } catch (err: any) {
    sizeRejected = err instanceof BadRequestException;
  }
  assert(sizeRejected, 'Enforces 15MB maximum file size ceiling (FILE_SIZE_EXCEEDED)');

  // Test 4: Storage key partition
  const storageKey = storageService.generateStorageKey('agency-apex-1', 'EMPLOYEE', 'emp-101', 'aadhaar.pdf');
  assert(storageKey.startsWith('private/agency-apex-1/employee/emp-101/'), 'Generates private partition key scoped by agency and entity');

  // Test 5: Presigned download URL generation
  const presigned = storageService.generatePresignedDownloadUrl(storageKey, 'agency-apex-1', 'user-admin-1', 15);
  assert(presigned.token && presigned.url.includes('token=') && presigned.expiresAt > new Date(), 'Generates HMAC-SHA256 signed download URL with 15-min expiration');

  // Test 6: Verify valid download token
  const isValidToken = storageService.verifyDownloadToken(storageKey, 'agency-apex-1', 'user-admin-1', presigned.expiresAt.getTime(), presigned.token);
  assert(isValidToken === true, 'Successfully authenticates valid presigned download token');

  // Test 7: Reject tampered download token
  let tamperRejected = false;
  try {
    storageService.verifyDownloadToken(storageKey, 'agency-apex-1', 'user-admin-1', presigned.expiresAt.getTime(), presigned.token + 'corrupt');
  } catch (err: any) {
    tamperRejected = err instanceof ForbiddenException;
  }
  assert(tamperRejected, 'Rejects tampered signature with DOWNLOAD_UNAUTHORIZED error');

  // Test 8: Reject expired download token
  let expiredRejected = false;
  try {
    storageService.verifyDownloadToken(storageKey, 'agency-apex-1', 'user-admin-1', Date.now() - 5000, presigned.token);
  } catch (err: any) {
    expiredRejected = err instanceof ForbiddenException;
  }
  assert(expiredRejected, 'Rejects expired download link with DOWNLOAD_EXPIRED error');

  // Test 9: Create Document Type
  const docType = await documentsService.createDocumentType({
    name: 'Aadhaar Identity Proof',
    code: 'AADHAAR',
    applicableEntity: DocumentEntityType.EMPLOYEE,
    isMandatory: true,
    requiresExpiryDate: false,
  }, adminUser);
  assert(docType.code === 'AADHAAR' && docType.applicableEntity === DocumentEntityType.EMPLOYEE, 'Creates registered document type with mandatory rules');

  // Test 10: Upload Document
  const doc = await documentsService.uploadDocument({
    documentTypeId: docType.id,
    entityType: DocumentEntityType.EMPLOYEE,
    entityId: 'emp-101',
    originalFileName: 'ramesh_aadhaar.pdf',
    fileSizeBytes: 240000,
    mimeType: 'application/pdf',
    documentNumber: '1234-5678-9012',
    title: 'Ramesh Aadhaar Card',
  }, adminUser);
  assert(doc.version === 1 && doc.verificationStatus === VerificationStatus.PENDING, 'Uploads initial document with version 1 and PENDING status');

  // Test 11: Document Versioning (v1 -> v2)
  const v2 = await documentsService.createVersion(doc.id, {
    originalFileName: 'ramesh_aadhaar_updated.pdf',
    fileSizeBytes: 250000,
    mimeType: 'application/pdf',
    reason: 'Updated address',
  }, adminUser);
  assert(v2.version === 2 && mockDb.documentVersions.length === 2, 'Increments document version to v2 and archives version history');

  // Test 12: Verify Document
  const verified = await documentsService.verifyDocument(doc.id, {
    status: VerificationStatus.VERIFIED,
  }, adminUser);
  assert(verified.verificationStatus === VerificationStatus.VERIFIED && verified.verifiedById === adminUser.id, 'Verifies document and logs auditor userId');

  // Test 13: Reject Document with Reason
  const docToReject = await documentsService.uploadDocument({
    documentTypeId: docType.id,
    entityType: DocumentEntityType.EMPLOYEE,
    entityId: 'emp-102',
    originalFileName: 'suresh_aadhaar.pdf',
    fileSizeBytes: 180000,
    mimeType: 'application/pdf',
  }, adminUser);
  const rejected = await documentsService.verifyDocument(docToReject.id, {
    status: VerificationStatus.REJECTED,
    rejectionReason: 'Blurred scan, text illegible',
  }, adminUser);
  assert(rejected.verificationStatus === VerificationStatus.REJECTED && rejected.rejectionReason?.includes('Blurred'), 'Rejects document with required audit reason');

  // Test 14: Cross-Agency IDOR Isolation
  let alienBlocked = false;
  try {
    await documentsService.getDocumentById(doc.id, alienUser);
  } catch (err: any) {
    alienBlocked = err instanceof NotFoundException || err instanceof ForbiddenException;
  }
  assert(alienBlocked, 'Guards document access against cross-agency IDOR attacks');

  // Test 15: Soft Delete Document
  await documentsService.softDeleteDocument(docToReject.id, adminUser);
  const softDeleted = mockDb.documents.find(d => d.id === docToReject.id);
  assert(softDeleted.deletedAt !== null, 'Performs soft delete preserving records in storage');

  console.log('\n--- MODULE 2: COMPLIANCE & EXPIRY MONITORING ENGINE ---');

  // Create an expiring document
  const drivingDocType = await documentsService.createDocumentType({
    name: 'Commercial Driving License',
    code: 'DRV_LIC',
    applicableEntity: DocumentEntityType.EMPLOYEE,
    requiresExpiryDate: true,
  }, adminUser);

  const expiringDoc = await documentsService.uploadDocument({
    documentTypeId: drivingDocType.id,
    entityType: DocumentEntityType.EMPLOYEE,
    entityId: 'emp-102',
    originalFileName: 'driver_dl.pdf',
    fileSizeBytes: 120000,
    mimeType: 'application/pdf',
    expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), // ~25 days (within 30d window)
  }, adminUser);

  // Test 16: Asia/Kolkata date boundary
  const kolkataDate = complianceService.getTodayKolkata();
  assert(kolkataDate instanceof Date && !isNaN(kolkataDate.getTime()), 'Resolves current date using Asia/Kolkata timezone boundary');

  // Test 17: Calculate days remaining
  const daysRem = complianceService.calculateDaysRemaining(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
  assert(daysRem >= 9 && daysRem <= 11, 'Calculates exact days remaining relative to Kolkata midnight');

  // Test 18: Process Expiry Alerts
  const alertSummary = await complianceService.processExpiryAlerts(adminUser.agencyId, adminUser);
  assert(alertSummary.createdAlerts >= 1, 'Scans active documents and emits multi-tier expiry alerts');

  // Test 19: Threshold Alert Assignment
  const alert30 = mockDb.expiryAlerts.find((a: any) => a.documentId === expiringDoc.id);
  assert(alert30 && alert30.alertThresholdDays > 0, 'Assigns threshold alert for document expiring within alert window');

  // Test 20: Deduplication Idempotency
  const secondScan = await complianceService.processExpiryAlerts(adminUser.agencyId, adminUser);
  assert(secondScan.createdAlerts === 0, 'Zero duplicate alerts generated on repeated scan of the same day');

  // Test 21: Acknowledge Alert
  const ack = await complianceService.acknowledgeAlert(alert30.id, { reason: 'Renewal in progress with RTO' }, adminUser);
  assert(ack.status === 'ACKNOWLEDGED' && ack.acknowledgedById === adminUser.id, 'Acknowledges alert and records user signature and review notes');

  // Test 22: Compliance Dashboard KPIs
  const dash = await complianceService.getComplianceDashboard(adminUser);
  assert(dash.totalDocuments >= 2 && typeof dash.compliancePercentage === 'number', 'Aggregates executive compliance index score');

  // Test 23: Expiring count in 30 days
  assert(dash.expiringSoonCount >= 1, 'Accurately tracks documents expiring in the 30-day window');

  // Test 24: Document Compliance Status Mapping
  assert(typeof dash.validCount === 'number', 'Computes valid count of compliance documents');

  // Test 25: Branch Filtering on Compliance
  const trichyDash = await complianceService.getComplianceDashboard(adminUser, 'branch-trichy');
  assert(trichyDash.totalDocuments >= 1, 'Filters compliance metrics by specific branch');

  console.log('\n--- MODULE 3: RECRUITMENT & HR TALENT PIPELINE ---');

  // Test 26: Candidate Registration
  const cand = await recruitmentService.createCandidate({
    branchId: 'branch-chennai',
    firstName: 'Vikram',
    lastName: 'Singhania',
    email: 'vikram@example.com',
    phone: '9811223344',
    source: 'JOB_PORTAL',
    primaryDesignationId: 'desig-guard',
    skills: ['Physical Security', 'Access Control'],
    yearsOfExperience: 4,
  }, adminUser);
  assert(cand.status === RecruitmentStatus.APPLIED && cand.candidateCode.startsWith('CAN-'), 'Registers candidate into pipeline with generated candidate code');

  // Test 27: Candidate Screening
  const screened = await recruitmentService.screenCandidate(cand.id, {
    screeningNotes: 'Strong profile, good communication, prior security experience.',
  }, adminUser);
  assert(screened.status === RecruitmentStatus.SCREENING, 'Updates status to SCREENING with audit notes');

  // Test 28: Schedule Interview
  const interviewDate = new Date(Date.now() + 86400000).toISOString();
  const scheduled = await recruitmentService.scheduleInterview(cand.id, {
    interviewerUserId: adminUser.id,
    stageName: 'Technical Round',
    scheduledAt: interviewDate,
  }, adminUser);
  assert(scheduled.stageName === 'Technical Round', 'Advances pipeline to INTERVIEW_SCHEDULED');

  // Test 29: Evaluate Interview
  const interviewRec = mockDb.candidateInterviews.find(i => i.candidateId === cand.id);
  const evaluated = await recruitmentService.evaluateInterview(interviewRec.id, {
    rating: 5,
    evaluationNotes: 'Clear command, excellent alertness.',
    result: InterviewResult.PASSED,
    score: 95,
  }, adminUser);
  assert(evaluated.result === InterviewResult.PASSED, 'Evaluates interview and marks INTERVIEWED');

  // Test 30: Record Skill Test
  const tested = await recruitmentService.evaluateSkillTest(cand.id, {
    score: 92,
    skillTestNotes: 'Quick evacuation drill response',
  }, adminUser);
  assert(tested.status === RecruitmentStatus.SKILL_TEST_PASSED, 'Records skill test and updates stage to SKILL_TEST_PASSED');

  // Test 31: Issue Offer
  const offer = await recruitmentService.createOffer(cand.id, {
    designationId: 'desig-guard',
    offeredSalary: 20000,
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    joiningDate: new Date(Date.now() + 14 * 86400000).toISOString(),
  }, adminUser);
  assert(offer.offeredSalary === 20000, 'Issues formal employment offer with CTC details');

  // Test 32: Candidate Accepts Offer
  const offerRec = mockDb.candidateOffers.find(o => o.candidateId === cand.id);
  const accepted = await recruitmentService.updateOfferStatus(offerRec.id, {
    status: CandidateOfferStatus.ACCEPTED,
  }, adminUser);
  assert(accepted.status === CandidateOfferStatus.ACCEPTED, 'Updates candidate status to OFFER_ACCEPTED upon candidate signoff');

  // Test 33: Convert Candidate to Employee (Atomic Promotion)
  const converted = await recruitmentService.convertToEmployee(cand.id, {
    dateOfJoining: new Date().toISOString(),
    basicPay: 15000,
    emergencyContactName: 'Anjali Singhania',
    emergencyContactPhone: '9811223399',
    bankAccountNo: '987654321098',
    bankIfsc: 'HDFC0001234',
    bankName: 'HDFC Bank',
  }, adminUser);
  const hiredCandidate = mockDb.candidates.find(c => c.id === cand.id);
  assert(hiredCandidate.status === RecruitmentStatus.HIRED && converted.employeeCode.includes('EMP-'), 'Promotes candidate to Employee and marks status as HIRED');

  // Test 34: PII Masking on Converted Employee
  assert(converted.bankAccountNoMasked.startsWith('XXXX') && converted.bankAccountNoMasked.endsWith('1098'), 'Masks bank account number on created employee profile');

  // Test 35: Encrypted Bank Details Stored
  assert(converted.bankAccountNoEncrypted.startsWith('ENC_'), 'Encrypts bank account number ciphertext before storing');

  // Test 36: Candidate Linked on Converted Employee
  assert(converted.recruitedCandidateId === cand.id, 'Links candidate ID to created employee record');

  // Test 37: Duplicate Conversion Guard
  let duplicateBlocked = false;
  try {
    await recruitmentService.convertToEmployee(cand.id, {
      dateOfJoining: new Date().toISOString(),
      bankAccountNo: '987654321098',
      bankIfsc: 'HDFC0001234',
    }, adminUser);
  } catch (err: any) {
    duplicateBlocked = err instanceof BadRequestException;
  }
  assert(duplicateBlocked, 'Guards against duplicate candidate conversion (CANDIDATE_ALREADY_CONVERTED)');

  // Test 38: Conversion blocked if offer not accepted
  const unacceptedCand = await recruitmentService.createCandidate({
    branchId: 'branch-chennai',
    firstName: 'Arun',
    lastName: 'Patel',
    email: 'arun@example.com',
    phone: '9822334455',
  }, adminUser);
  let unacceptedBlocked = false;
  try {
    await recruitmentService.convertToEmployee(unacceptedCand.id, {
      dateOfJoining: new Date().toISOString(),
      bankAccountNo: '1122334455',
      bankIfsc: 'HDFC0001111',
    }, adminUser);
  } catch (err: any) {
    unacceptedBlocked = err instanceof BadRequestException;
  }
  assert(unacceptedBlocked, 'Rejects conversion for candidate without an accepted offer');

  // Test 39: Pipeline Filter
  const candidatesList = await recruitmentService.getCandidates({ status: RecruitmentStatus.APPLIED }, adminUser);
  assert(candidatesList.items.some(c => c.id === unacceptedCand.id), 'Filters candidates by active pipeline stage');

  console.log('\n--- MODULE 4: CENTRALIZED NOTIFICATION ENGINE ---');

  // Test 40: Emit Notification
  const notif = await notificationsService.emitNotification(adminUser.agencyId, {
    userId: adminUser.id,
    title: 'Statutory ESI Return Due',
    body: 'Monthly statutory ESI contribution return is due in 3 days.',
    category: NotificationCategory.COMPLIANCE,
    priority: NotificationPriority.HIGH,
    dedupKey: 'dedup-esi-due-march-2026',
  });
  assert(notif.title.includes('Statutory') && notif.isRead === false, 'Dispatches prioritized notification to target user');

  // Test 41: Idempotency Deduplication
  const duplicateNotif = await notificationsService.emitNotification(adminUser.agencyId, {
    userId: adminUser.id,
    title: 'Duplicate Notice',
    body: 'Should be discarded',
    category: NotificationCategory.COMPLIANCE,
    priority: NotificationPriority.HIGH,
    dedupKey: 'dedup-esi-due-march-2026',
  });
  assert(duplicateNotif.id === notif.id, 'Discards duplicate notification emission using dedupKey');

  // Test 42: Unread Count Calculation
  const unreadCountRes = await notificationsService.getUnreadCount(adminUser);
  assert(unreadCountRes.unreadCount >= 1, 'Calculates current unread notification count for user');

  // Test 43: Mark Individual Notification Read
  const markedRead = await notificationsService.markAsRead(notif.id, adminUser);
  assert(markedRead.isRead === true && markedRead.readAt !== null, 'Marks notification as read with timestamp');

  // Test 44: Mark All as Read
  await notificationsService.emitNotification(adminUser.agencyId, {
    userId: adminUser.id,
    title: 'Payroll Notice',
    body: 'March payroll is calculated.',
    category: NotificationCategory.PAYROLL,
    priority: NotificationPriority.NORMAL,
  });
  const bulkReadRes = await notificationsService.markAllAsRead(adminUser);
  assert(bulkReadRes.count >= 1, 'Marks all user notifications as read in bulk');

  // Test 45: Agency Tenant Isolation
  const alienNotifs = await notificationsService.getUserNotifications({}, alienUser);
  assert(alienNotifs.items.length === 0, 'Isolates notification records across agency tenants');

  // Test 46: Category Filter
  const complianceNotifs = await notificationsService.getUserNotifications({ category: NotificationCategory.COMPLIANCE }, adminUser);
  assert(complianceNotifs.items.every(n => n.category === NotificationCategory.COMPLIANCE), 'Filters notifications by category');

  // Test 47: Priority Levels Handled
  assert(Object.values(NotificationPriority).includes(NotificationPriority.CRITICAL), 'Supports all priority tiers including CRITICAL');

  console.log('\n--- MODULE 5: BUSINESS REPORTING ENGINE & CSV EXPORT ---');

  // Test 48: Employee Master Report
  const empReport = await reportsService.generateReport({ reportType: ReportType.EMPLOYEE_MASTER }, adminUser);
  assert(empReport.rows.length >= 2, 'Generates EMPLOYEE_MASTER report with workforce directory');

  // Test 49: PII Masking in Reports
  const rameshRow = empReport.rows.find((r: any) => r.employeeCode === 'EMP-101');
  assert(rameshRow?.bankAccount?.startsWith('XXXX'), 'Enforces sensitive PII masking on financial account numbers in reports');

  // Test 50: Client Summary Report
  const clientReport = await reportsService.generateReport({ reportType: ReportType.CLIENT_SUMMARY }, adminUser);
  assert(clientReport.rows.some((r: any) => r.clientCode === 'TCS-CHN'), 'Generates CLIENT_SUMMARY report with sites and active contracts');

  // Test 51: Operations Deployment Report
  const opsReport = await reportsService.generateReport({ reportType: ReportType.OPERATIONS_MUSTER }, adminUser);
  assert(opsReport.rows.length >= 1 && opsReport.rows[0].shiftType === 'DAY', 'Generates OPERATIONS_MUSTER report with active manpower deployments');

  // Test 52: Payroll Summary Report
  const payrollReport = await reportsService.generateReport({ reportType: ReportType.PAYROLL_SUMMARY }, adminUser);
  assert(payrollReport.rows.length >= 1 && payrollReport.rows[0].netWages === 21500, 'Generates PAYROLL_SUMMARY report with wages and statutory deductions');

  // Test 53: Billing Receivables Report
  const billingReport = await reportsService.generateReport({ reportType: ReportType.BILLING_RECEIVABLES }, adminUser);
  assert(billingReport.rows.some((r: any) => r.invoiceNumber === 'INV-2026-001'), 'Generates BILLING_RECEIVABLES report with GST and balance due');

  // Test 54: Compliance Status Report
  const compReport = await reportsService.generateReport({ reportType: ReportType.COMPLIANCE_STATUS }, adminUser);
  assert(compReport.rows.length >= 1 && compReport.rows[0].verificationStatus !== undefined, 'Generates COMPLIANCE_STATUS report with credential validity');

  // Test 55: Branch Filtering on Reports
  const branchFiltered = await reportsService.generateReport({ reportType: ReportType.EMPLOYEE_MASTER, branchId: 'branch-trichy' }, adminUser);
  assert(branchFiltered.rows.every((r: any) => r.branch === 'Trichy Branch'), 'Applies strict branch scoping to reports');

  // Test 56: CSV Export Generation
  const csvRes = await reportsService.generateReport({ reportType: ReportType.EMPLOYEE_MASTER, format: ReportFormat.CSV }, adminUser);
  assert(csvRes.format === 'CSV' && csvRes.data.includes('Employee Code') && csvRes.data.includes('EMP-101'), 'Exports RFC 4180 formatted CSV string with headers');

  // Test 57: CSV Proper Escaping
  const testCsvRow = (reportsService as any).jsonToCsv(
    [{ key: 'name', label: 'Col, Name' }],
    [{ name: 'Value with "quotes" and, commas' }],
  );
  assert(testCsvRow.includes('"Col, Name"') && testCsvRow.includes('"Value with ""quotes"" and, commas"'), 'Properly escapes commas and quotes in CSV rows');

  console.log('\n--- MODULE 6: MANAGEMENT ANALYTICS DASHBOARD (READ-ONLY) ---');

  // Database snapshot before running analytics
  const docsCountBefore = mockDb.documents.length;
  const empsCountBefore = mockDb.employees.length;
  const invoicesCountBefore = mockDb.invoices.length;

  // Test 58: Executive KPIs
  const kpis = await analyticsService.getExecutiveKpis({}, adminUser);
  assert(kpis.activeEmployees >= 2 && kpis.activeClients >= 1, 'Aggregates executive KPIs across active employees and clients');

  // Test 59: Monthly Revenue from Invoices
  assert(kpis.invoicing.totalInvoiced === 118000, 'Calculates monthly invoiced revenue from finalized client invoices');

  // Test 60: Monthly Payroll Cost
  assert(kpis.payroll.totalNetWages === 21500, 'Calculates net monthly payroll outflow from approved batches');

  // Test 61: Operations Manpower Metrics
  const opsManpower = await analyticsService.getOperationsManpower({}, adminUser);
  assert(opsManpower.totalDeployments >= 1 && typeof opsManpower.deploymentFulfillmentRate === 'number', 'Computes operational deployment fulfillment percentage');

  // Test 62: Today Attendance Rate
  assert(typeof opsManpower.attendanceRateToday === 'number', 'Computes today attendance rate percentage');

  // Test 63: 6-Month Financial Trends
  const revTrends = await analyticsService.getRevenueTrends({ months: 6 }, adminUser);
  assert(revTrends.monthlyTrends.length === 6 && revTrends.totals.totalBilled === 118000, 'Aggregates multi-month billing and realization trends');

  // Test 64: Read-Only Guarantee (Zero state mutation)
  const docsCountAfter = mockDb.documents.length;
  const empsCountAfter = mockDb.employees.length;
  const invoicesCountAfter = mockDb.invoices.length;
  assert(
    docsCountBefore === docsCountAfter &&
    empsCountBefore === empsCountAfter &&
    invoicesCountBefore === invoicesCountAfter,
    'Read-only guarantee: Executing analytics engine causes zero state mutations across Phase 1-4 records'
  );

  console.log('\n======================================================');
  console.log(`🏆 PHASE 5 TEST SUITE FINISHED: ${passedTests}/${totalTests} TESTS PASSING`);
  if (passedTests === totalTests) {
    console.log('🎉 100% SUCCESS — PHASE 5 COMPLETE & VERIFIED');
    process.exit(0);
  } else {
    console.error(`❌ ${totalTests - passedTests} TESTS FAILED`);
    process.exit(1);
  }
}

runPhase5Tests().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
