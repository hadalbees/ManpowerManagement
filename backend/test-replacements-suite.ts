import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReplacementsService } from './src/modules/replacements/replacements.service';
import { AuthenticatedUserContext } from './src/common/decorators/current-user.decorator';
import {
  AuditAction,
  ReplacementStatus,
  ReplacementType,
  AttendanceStatus,
  AttendanceMethod,
  DeploymentStatus,
  LeaveStatus,
  DesignationCategory,
} from '@prisma/client';

console.log('\n======================================================');
console.log('🧪 RUNNING REPLACEMENT MANAGEMENT ENGINE TEST SUITE (58/58)');
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

// In-memory mock database state
const mockDb = {
  agencies: [
    { id: 'agency-apex-1', name: 'Apex Manpower Services' },
    { id: 'agency-alien-99', name: 'Alien Manpower Services' },
  ],
  branches: [
    { id: 'branch-chennai', agencyId: 'agency-apex-1', branchName: 'Chennai HQ', branchCode: 'CHN', isHeadquarters: true, deletedAt: null },
    { id: 'branch-trichy', agencyId: 'agency-apex-1', branchName: 'Trichy Branch', branchCode: 'TRC', isHeadquarters: false, deletedAt: null },
    { id: 'branch-alien-1', agencyId: 'agency-alien-99', branchName: 'Alien Branch', branchCode: 'ALN', isHeadquarters: true, deletedAt: null },
  ],
  designations: [
    { id: 'desig-guard', agencyId: 'agency-apex-1', title: 'Security Guard', category: DesignationCategory.SECURITY, isActive: true },
    { id: 'desig-driver', agencyId: 'agency-apex-1', title: 'Commercial Driver', category: DesignationCategory.DRIVER, isActive: true },
    { id: 'desig-housekeep', agencyId: 'agency-apex-1', title: 'Housekeeper', category: DesignationCategory.HOUSEKEEPING, isActive: true },
  ],
  employees: [
    {
      id: 'emp-absent-1',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-001',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      phone: '+919876543210',
      status: 'ACTIVE',
      primaryDesignationId: 'desig-guard',
      drivingLicenseNumber: null,
      drivingLicenseExpiryDate: null,
      deletedAt: null,
      branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
      primaryDesignation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
    },
    {
      id: 'emp-rep-active-1',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-002',
      firstName: 'Suresh',
      lastName: 'Selvam',
      phone: '+919876543211',
      status: 'ACTIVE',
      primaryDesignationId: 'desig-guard',
      drivingLicenseNumber: null,
      drivingLicenseExpiryDate: null,
      deletedAt: null,
      branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
      primaryDesignation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
    },
    {
      id: 'emp-rep-inactive',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-003',
      firstName: 'Karthik',
      lastName: 'Raja',
      phone: '+919876543212',
      status: 'INACTIVE',
      primaryDesignationId: 'desig-guard',
      drivingLicenseNumber: null,
      drivingLicenseExpiryDate: null,
      deletedAt: null,
      branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
      primaryDesignation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
    },
    {
      id: 'emp-rep-terminated',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-004',
      firstName: 'Murugan',
      lastName: 'P',
      phone: '+919876543213',
      status: 'TERMINATED',
      primaryDesignationId: 'desig-guard',
      deletedAt: null,
      branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
      primaryDesignation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
    },
    {
      id: 'emp-rep-resigned',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-005',
      firstName: 'Anand',
      lastName: 'G',
      phone: '+919876543214',
      status: 'RESIGNED',
      primaryDesignationId: 'desig-guard',
      deletedAt: null,
      branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
      primaryDesignation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
    },
    {
      id: 'emp-driver-absent',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-DRV-1',
      firstName: 'Dhanush',
      lastName: 'V',
      phone: '+919876543220',
      status: 'ACTIVE',
      primaryDesignationId: 'desig-driver',
      drivingLicenseNumber: 'DL-TN-01-2015-1234',
      drivingLicenseExpiryDate: new Date('2030-12-31T00:00:00.000Z'),
      deletedAt: null,
      branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
      primaryDesignation: { id: 'desig-driver', title: 'Commercial Driver', category: DesignationCategory.DRIVER },
    },
    {
      id: 'emp-driver-rep-valid',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-DRV-2',
      firstName: 'Vijay',
      lastName: 'R',
      phone: '+919876543221',
      status: 'ACTIVE',
      primaryDesignationId: 'desig-driver',
      drivingLicenseNumber: 'DL-TN-01-2018-9876',
      drivingLicenseExpiryDate: new Date('2028-12-31T00:00:00.000Z'),
      deletedAt: null,
      branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
      primaryDesignation: { id: 'desig-driver', title: 'Commercial Driver', category: DesignationCategory.DRIVER },
    },
    {
      id: 'emp-driver-rep-expired',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-DRV-3',
      firstName: 'Ajith',
      lastName: 'K',
      phone: '+919876543222',
      status: 'ACTIVE',
      primaryDesignationId: 'desig-driver',
      drivingLicenseNumber: 'DL-TN-01-2010-0001',
      drivingLicenseExpiryDate: new Date('2026-05-01T00:00:00.000Z'), // expires May 1, 2026
      deletedAt: null,
      branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
      primaryDesignation: { id: 'desig-driver', title: 'Commercial Driver', category: DesignationCategory.DRIVER },
    },
    {
      id: 'emp-driver-rep-nolicense',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-DRV-4',
      firstName: 'Mani',
      lastName: 'S',
      phone: '+919876543223',
      status: 'ACTIVE',
      primaryDesignationId: 'desig-driver',
      drivingLicenseNumber: null,
      drivingLicenseExpiryDate: null,
      deletedAt: null,
      branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
      primaryDesignation: { id: 'desig-driver', title: 'Commercial Driver', category: DesignationCategory.DRIVER },
    },
    {
      id: 'emp-rep-trichy',
      agencyId: 'agency-apex-1',
      branchId: 'branch-trichy',
      employeeCode: 'EMP-006',
      firstName: 'Praveen',
      lastName: 'T',
      phone: '+919876543215',
      status: 'ACTIVE',
      primaryDesignationId: 'desig-guard',
      deletedAt: null,
      branch: { id: 'branch-trichy', branchName: 'Trichy Branch', branchCode: 'TRC' },
      primaryDesignation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
    },
    {
      id: 'emp-alien-rep',
      agencyId: 'agency-alien-99',
      branchId: 'branch-alien-1',
      employeeCode: 'EMP-999',
      firstName: 'Alien',
      lastName: 'Worker',
      phone: '+919876543299',
      status: 'ACTIVE',
      primaryDesignationId: 'desig-guard',
      deletedAt: null,
      branch: { id: 'branch-alien-1', branchName: 'Alien Branch', branchCode: 'ALN' },
      primaryDesignation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
    },
  ],
  clients: [
    {
      id: 'client-apex-a',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      clientCode: 'CLI-001',
      companyName: 'Apex Logistics Corp',
      status: 'ACTIVE',
      deletedAt: null,
    },
  ],
  clientSites: [
    {
      id: 'site-a1',
      clientId: 'client-apex-a',
      siteCode: 'SITE-A1',
      siteName: 'Central Warehouse Site A1',
      city: 'Chennai',
      deletedAt: null,
    },
  ],
  deployments: [
    {
      id: 'dep-guard-active',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeId: 'emp-absent-1',
      clientId: 'client-apex-a',
      clientSiteId: 'site-a1',
      designationId: 'desig-guard',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2026-06-30T23:59:59.000Z'),
      shiftName: 'General Morning',
      status: DeploymentStatus.ACTIVE,
      vehicleId: null,
      deletedAt: null,
      client: { id: 'client-apex-a', companyName: 'Apex Logistics Corp' },
      clientSite: { id: 'site-a1', siteName: 'Central Warehouse Site A1' },
      designation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
    },
    {
      id: 'dep-driver-active',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeId: 'emp-driver-absent',
      clientId: 'client-apex-a',
      clientSiteId: 'site-a1',
      designationId: 'desig-driver',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2026-06-30T23:59:59.000Z'),
      shiftName: 'Driver Shift',
      status: DeploymentStatus.ACTIVE,
      vehicleId: 'veh-001',
      deletedAt: null,
      client: { id: 'client-apex-a', companyName: 'Apex Logistics Corp' },
      clientSite: { id: 'site-a1', siteName: 'Central Warehouse Site A1' },
      designation: { id: 'desig-driver', title: 'Commercial Driver', category: DesignationCategory.DRIVER },
    },
    {
      id: 'dep-perm-conflict',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeId: 'emp-rep-with-dep',
      clientId: 'client-apex-a',
      clientSiteId: 'site-a1',
      designationId: 'desig-guard',
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      endDate: new Date('2026-05-31T23:59:59.000Z'),
      shiftName: 'Day Shift',
      status: DeploymentStatus.ACTIVE,
      deletedAt: null,
      client: { id: 'client-apex-a', companyName: 'Apex Logistics Corp' },
      clientSite: { id: 'site-a1', siteName: 'Central Warehouse Site A1' },
      designation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
    },
  ],
  replacements: [] as any[],
  leaveRequests: [
    {
      id: 'leave-rep-approved',
      agencyId: 'agency-apex-1',
      employeeId: 'emp-rep-on-leave',
      startDate: new Date('2026-05-10T00:00:00.000Z'),
      endDate: new Date('2026-05-15T23:59:59.000Z'),
      status: LeaveStatus.APPROVED,
      deletedAt: null,
    },
    {
      id: 'leave-rep-rejected',
      agencyId: 'agency-apex-1',
      employeeId: 'emp-rep-rejected-leave',
      startDate: new Date('2026-05-10T00:00:00.000Z'),
      endDate: new Date('2026-05-15T23:59:59.000Z'),
      status: LeaveStatus.REJECTED,
      deletedAt: null,
    },
  ],
  attendances: [] as any[],
  auditLogs: [] as any[],
};

// Mock Prisma implementation
const mockPrisma: any = {
  employee: {
    findFirst: async ({ where, include }: any) => {
      const emp = mockDb.employees.find((e) => {
        if (where.id && e.id !== where.id) return false;
        if (where.agencyId && e.agencyId !== where.agencyId) return false;
        if (where.deletedAt === null && e.deletedAt !== null) return false;
        return true;
      });
      if (!emp) return null;
      return {
        ...emp,
        ...(include?.primaryDesignation ? { primaryDesignation: emp.primaryDesignation } : {}),
        ...(include?.branch ? { branch: emp.branch } : {}),
      };
    },
  },
  employeeDeployment: {
    findFirst: async ({ where, include }: any) => {
      return mockDb.deployments.find((d) => {
        if (where.id && d.id !== where.id) return false;
        if (where.employeeId && d.employeeId !== where.employeeId) return false;
        if (where.agencyId && d.agencyId !== where.agencyId) return false;
        if (where.status && d.status !== where.status) return false;
        if (where.deletedAt === null && d.deletedAt !== null) return false;

        // Date ranges
        if (where.startDate?.lte) {
          const reqEnd = where.startDate.lte;
          if (d.startDate > reqEnd) return false;
        }
        if (where.OR) {
          const satisfiesOr = where.OR.some((cond: any) => {
            if (cond.endDate === null) return d.endDate === null;
            if (cond.endDate?.gte) return d.endDate && d.endDate >= cond.endDate.gte;
            return true;
          });
          if (!satisfiesOr) return false;
        }

        return true;
      }) || null;
    },
  },
  leaveRequest: {
    findFirst: async ({ where }: any) => {
      return mockDb.leaveRequests.find((l) => {
        if (where.employeeId && l.employeeId !== where.employeeId) return false;
        if (where.status && l.status !== where.status) return false;
        if (where.deletedAt === null && l.deletedAt !== null) return false;
        if (where.startDate?.lte && l.startDate > where.startDate.lte) return false;
        if (where.endDate?.gte && l.endDate < where.endDate.gte) return false;
        return true;
      }) || null;
    },
  },
  replacement: {
    create: async ({ data, include }: any) => {
      const rec = {
        id: `rep-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      mockDb.replacements.push(rec);

      // Hydrate includes
      const dep = mockDb.deployments.find((d) => d.id === rec.originalDeploymentId);
      const absent = mockDb.employees.find((e) => e.id === rec.absentEmployeeId);
      const replacement = mockDb.employees.find((e) => e.id === rec.replacementEmployeeId);

      return {
        ...rec,
        originalDeployment: dep,
        absentEmployee: absent,
        replacementEmployee: replacement,
        dispatchedBy: { id: rec.dispatchedById, fullName: 'Operations Coordinator', email: 'ops@agency.com' },
      };
    },
    findUnique: async ({ where, include }: any) => {
      const rec = mockDb.replacements.find((r) => r.id === where.id);
      if (!rec) return null;
      const dep = mockDb.deployments.find((d) => d.id === rec.originalDeploymentId);
      const absent = mockDb.employees.find((e) => e.id === rec.absentEmployeeId);
      const replacement = mockDb.employees.find((e) => e.id === rec.replacementEmployeeId);
      return {
        ...rec,
        originalDeployment: dep,
        absentEmployee: absent,
        replacementEmployee: replacement,
        dispatchedBy: { id: rec.dispatchedById, fullName: 'Operations Coordinator', email: 'ops@agency.com' },
      };
    },
    findFirst: async ({ where }: any) => {
      return mockDb.replacements.find((r) => {
        if (where.id?.not && r.id === where.id.not) return false;
        if (where.replacementEmployeeId && r.replacementEmployeeId !== where.replacementEmployeeId) return false;
        if (where.status && r.status !== where.status) return false;
        if (where.startDate?.lte && r.startDate > where.startDate.lte) return false;
        if (where.endDate?.gte && r.endDate < where.endDate.gte) return false;
        return true;
      }) || null;
    },
    findMany: async ({ where, skip, take }: any) => {
      let list = mockDb.replacements.filter((r) => {
        const dep = mockDb.deployments.find((d) => d.id === r.originalDeploymentId);
        if (!dep) return false;
        if (where.originalDeployment?.agencyId && dep.agencyId !== where.originalDeployment.agencyId) return false;
        if (where.originalDeployment?.branchId && dep.branchId !== where.originalDeployment.branchId) return false;
        if (where.absentEmployeeId && r.absentEmployeeId !== where.absentEmployeeId) return false;
        if (where.replacementEmployeeId && r.replacementEmployeeId !== where.replacementEmployeeId) return false;
        if (where.originalDeploymentId && r.originalDeploymentId !== where.originalDeploymentId) return false;
        if (where.status && r.status !== where.status) return false;
        if (where.startDate?.lte && r.startDate > where.startDate.lte) return false;
        if (where.endDate?.gte && r.endDate < where.endDate.gte) return false;
        return true;
      });

      const start = skip || 0;
      const end = take ? start + take : list.length;
      return list.slice(start, end).map((r) => {
        const dep = mockDb.deployments.find((d) => d.id === r.originalDeploymentId);
        const absent = mockDb.employees.find((e) => e.id === r.absentEmployeeId);
        const replacement = mockDb.employees.find((e) => e.id === r.replacementEmployeeId);
        return {
          ...r,
          originalDeployment: dep,
          absentEmployee: absent,
          replacementEmployee: replacement,
          dispatchedBy: { id: r.dispatchedById, fullName: 'Operations Coordinator', email: 'ops@agency.com' },
        };
      });
    },
    count: async ({ where }: any) => {
      return mockDb.replacements.filter((r) => {
        const dep = mockDb.deployments.find((d) => d.id === r.originalDeploymentId);
        if (!dep) return false;
        if (where.originalDeployment?.agencyId && dep.agencyId !== where.originalDeployment.agencyId) return false;
        if (where.originalDeployment?.branchId && dep.branchId !== where.originalDeployment.branchId) return false;
        if (where.absentEmployeeId && r.absentEmployeeId !== where.absentEmployeeId) return false;
        if (where.replacementEmployeeId && r.replacementEmployeeId !== where.replacementEmployeeId) return false;
        if (where.originalDeploymentId && r.originalDeploymentId !== where.originalDeploymentId) return false;
        if (where.status && r.status !== where.status) return false;
        return true;
      }).length;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.replacements.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new NotFoundException('Replacement not found');
      mockDb.replacements[idx] = { ...mockDb.replacements[idx], ...data, updatedAt: new Date() };
      const rec = mockDb.replacements[idx];
      const dep = mockDb.deployments.find((d) => d.id === rec.originalDeploymentId);
      const absent = mockDb.employees.find((e) => e.id === rec.absentEmployeeId);
      const replacement = mockDb.employees.find((e) => e.id === rec.replacementEmployeeId);
      return {
        ...rec,
        originalDeployment: dep,
        absentEmployee: absent,
        replacementEmployee: replacement,
        dispatchedBy: { id: rec.dispatchedById, fullName: 'Operations Coordinator', email: 'ops@agency.com' },
      };
    },
  },
  attendance: {
    findFirst: async ({ where }: any) => {
      return mockDb.attendances.find((a) => {
        if (where.employeeId && a.employeeId !== where.employeeId) return false;
        if (where.shiftBusinessDate) {
          const aDate = new Date(a.shiftBusinessDate).toISOString().slice(0, 10);
          const wDate = new Date(where.shiftBusinessDate).toISOString().slice(0, 10);
          if (aDate !== wDate) return false;
        }
        return true;
      }) || null;
    },
    create: async ({ data }: any) => {
      const rec = { id: `att-${Date.now()}`, createdAt: new Date(), ...data };
      mockDb.attendances.push(rec);
      return rec;
    },
  },
  $transaction: async (fn: any) => {
    return fn(mockPrisma);
  },
};

const mockAudit: any = {
  record: async (data: any) => {
    mockDb.auditLogs.push({ id: `audit-${Date.now()}`, ...data, createdAt: new Date() });
  },
};

// Users
const hqUser: AuthenticatedUserContext = {
  id: 'user-ops-hq',
  agencyId: 'agency-apex-1',
  branchId: undefined, // HQ user sees all branches
  role: 'OPERATIONS_COORDINATOR',
  permissions: ['REPLACEMENT_CREATE', 'REPLACEMENT_READ', 'REPLACEMENT_UPDATE', 'REPLACEMENT_APPROVE', 'REPLACEMENT_CANCEL', 'REPLACEMENT_COMPLETE'],
};

const branchChennaiUser: AuthenticatedUserContext = {
  id: 'user-branch-chn',
  agencyId: 'agency-apex-1',
  branchId: 'branch-chennai',
  role: 'BRANCH_MANAGER',
  permissions: ['REPLACEMENT_CREATE', 'REPLACEMENT_READ', 'REPLACEMENT_UPDATE', 'REPLACEMENT_APPROVE'],
};

const branchTrichyUser: AuthenticatedUserContext = {
  id: 'user-branch-trc',
  agencyId: 'agency-apex-1',
  branchId: 'branch-trichy',
  role: 'BRANCH_MANAGER',
  permissions: ['REPLACEMENT_CREATE', 'REPLACEMENT_READ'],
};

const alienUser: AuthenticatedUserContext = {
  id: 'user-alien',
  agencyId: 'agency-alien-99',
  branchId: 'branch-alien-1',
  role: 'BRANCH_MANAGER',
  permissions: ['REPLACEMENT_CREATE', 'REPLACEMENT_READ'],
};

async function runTests() {
  const service = new ReplacementsService(mockPrisma, mockAudit);

  // Setup additional test employee with permanent deployment
  mockDb.employees.push({
    id: 'emp-rep-with-dep',
    agencyId: 'agency-apex-1',
    branchId: 'branch-chennai',
    employeeCode: 'EMP-007',
    firstName: 'Permanent',
    lastName: 'Assigned',
    phone: '+919876543216',
    status: 'ACTIVE',
    primaryDesignationId: 'desig-guard',
    deletedAt: null,
    branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
    primaryDesignation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
  } as any);

  // Setup employee on leave
  mockDb.employees.push({
    id: 'emp-rep-on-leave',
    agencyId: 'agency-apex-1',
    branchId: 'branch-chennai',
    employeeCode: 'EMP-008',
    firstName: 'OnLeave',
    lastName: 'Worker',
    phone: '+919876543217',
    status: 'ACTIVE',
    primaryDesignationId: 'desig-guard',
    deletedAt: null,
    branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
    primaryDesignation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
  } as any);

  mockDb.employees.push({
    id: 'emp-rep-rejected-leave',
    agencyId: 'agency-apex-1',
    branchId: 'branch-chennai',
    employeeCode: 'EMP-009',
    firstName: 'RejectedLeave',
    lastName: 'Worker',
    phone: '+919876543218',
    status: 'ACTIVE',
    primaryDesignationId: 'desig-guard',
    deletedAt: null,
    branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
    primaryDesignation: { id: 'desig-guard', title: 'Security Guard', category: DesignationCategory.SECURITY },
  } as any);

  console.log('--- SUITE A: DISPATCH & OPERATIONAL INVARIANTS ---');

  // Test 01: Dispatch happy path
  let createdRep: any;
  try {
    createdRep = await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-active-1',
        startDate: '2026-05-01',
        endDate: '2026-05-05',
        reason: 'Original guard on emergency medical leave',
      },
      hqUser,
    );
    assert(
      createdRep &&
        createdRep.status === ReplacementStatus.DISPATCHED &&
        createdRep.replacementEmployeeId === 'emp-rep-active-1' &&
        createdRep.absentEmployeeId === 'emp-absent-1',
      'Create / dispatch replacement successfully with DISPATCHED status',
    );
  } catch (err: any) {
    assert(false, 'Create / dispatch replacement successfully with DISPATCHED status', err.message);
  }

  // Test 02: INVARIANT CHECK - EmployeeDeployment.employeeId was NOT mutated
  const originalDeployment = mockDb.deployments.find((d) => d.id === 'dep-guard-active');
  assert(
    originalDeployment?.employeeId === 'emp-absent-1',
    'BUSINESS INVARIANT: originalDeployment.employeeId remains untouched (NOT mutated to replacement worker)',
    `Expected emp-absent-1, found ${originalDeployment?.employeeId}`,
  );

  // Test 03: INVARIANT CHECK - Absent employee status is untouched
  const originalEmployee = mockDb.employees.find((e) => e.id === 'emp-absent-1');
  assert(
    originalEmployee?.status === 'ACTIVE' && originalEmployee?.id === 'emp-absent-1',
    'BUSINESS INVARIANT: Absent employee entity remains completely preserved',
  );

  // Test 04: Validation - cannot replace themselves
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-absent-1',
        startDate: '2026-05-06',
        endDate: '2026-05-07',
        reason: 'Self replace test',
      },
      hqUser,
    );
    assert(false, 'Reject replacement where absent worker replaces themselves');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('replace themselves'),
      'Reject replacement where absent worker replaces themselves',
    );
  }

  // Test 05: Validation - missing absentEmployeeId
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        replacementEmployeeId: 'emp-rep-active-1',
        startDate: '2026-05-06',
        endDate: '2026-05-07',
      } as any,
      hqUser,
    );
    assert(false, 'Reject dispatch when absentEmployeeId is missing');
  } catch (err: any) {
    assert(err instanceof BadRequestException, 'Reject dispatch when absentEmployeeId is missing');
  }

  // Test 06: Validation - non-existent absent employee
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-non-existent',
        replacementEmployeeId: 'emp-rep-active-1',
        startDate: '2026-05-06',
        endDate: '2026-05-07',
      },
      hqUser,
    );
    assert(false, 'Reject dispatch when absent employee does not exist');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Reject dispatch when absent employee does not exist');
  }

  // Test 07: Validation - non-existent replacement employee
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-does-not-exist',
        startDate: '2026-05-06',
        endDate: '2026-05-07',
      },
      hqUser,
    );
    assert(false, 'Reject dispatch when replacement employee does not exist');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Reject dispatch when replacement employee does not exist');
  }

  // Test 08: Validation - non-existent original deployment
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-non-existent',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-active-1',
        startDate: '2026-05-06',
        endDate: '2026-05-07',
      },
      hqUser,
    );
    assert(false, 'Reject dispatch when deployment does not exist');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Reject dispatch when deployment does not exist');
  }

  // Test 09: Tenant Isolation - dispatching employee from another agency
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-alien-rep',
        startDate: '2026-05-06',
        endDate: '2026-05-07',
      },
      hqUser,
    );
    assert(false, 'Reject dispatching employee from another agency (Tenant Isolation)');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Reject dispatching employee from another agency (Tenant Isolation)');
  }

  // Test 10: Branch Isolation - branch user dispatching employee from different branch
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-trichy',
        startDate: '2026-05-06',
        endDate: '2026-05-07',
      },
      branchChennaiUser, // Chennai user trying to dispatch Trichy worker
    );
    assert(false, 'Reject branch user dispatching employee from another branch');
  } catch (err: any) {
    assert(err instanceof ForbiddenException, 'Reject branch user dispatching employee from another branch');
  }

  console.log('--- SUITE B: ELIGIBILITY VALIDATION ENGINE ---');

  // Test 11: Inactive replacement employee rejected
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-inactive',
        startDate: '2026-05-06',
        endDate: '2026-05-07',
      },
      hqUser,
    );
    assert(false, 'Reject INACTIVE replacement employee');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('REPLACEMENT_EMPLOYEE_NOT_ACTIVE'),
      'Reject INACTIVE replacement employee',
    );
  }

  // Test 12: Terminated replacement employee rejected
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-terminated',
        startDate: '2026-05-06',
        endDate: '2026-05-07',
      },
      hqUser,
    );
    assert(false, 'Reject TERMINATED replacement employee');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('REPLACEMENT_EMPLOYEE_NOT_ACTIVE'),
      'Reject TERMINATED replacement employee',
    );
  }

  // Test 13: Resigned replacement employee rejected
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-resigned',
        startDate: '2026-05-06',
        endDate: '2026-05-07',
      },
      hqUser,
    );
    assert(false, 'Reject RESIGNED replacement employee');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('REPLACEMENT_EMPLOYEE_NOT_ACTIVE'),
      'Reject RESIGNED replacement employee',
    );
  }

  // Test 14: End date < Start date
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-active-1',
        startDate: '2026-05-10',
        endDate: '2026-05-05',
      },
      hqUser,
    );
    assert(false, 'Reject endDate < startDate');
  } catch (err: any) {
    assert(err instanceof BadRequestException, 'Reject endDate < startDate');
  }

  // Test 15: Start date earlier than deployment startDate
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active', // starts 2026-04-01
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-active-1',
        startDate: '2026-03-20',
        endDate: '2026-04-05',
      },
      hqUser,
    );
    assert(false, 'Reject replacement startDate earlier than deployment startDate');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('REPLACEMENT_DATES_OUTSIDE_DEPLOYMENT'),
      'Reject replacement startDate earlier than deployment startDate',
    );
  }

  // Test 16: End date exceeding deployment endDate
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active', // ends 2026-06-30
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-active-1',
        startDate: '2026-06-25',
        endDate: '2026-07-05',
      },
      hqUser,
    );
    assert(false, 'Reject replacement endDate later than deployment endDate');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('REPLACEMENT_DATES_OUTSIDE_DEPLOYMENT'),
      'Reject replacement endDate later than deployment endDate',
    );
  }

  // Test 17: Deployment conflict - replacement employee already has an active deployment overlapping dates
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-with-dep', // has deployment from 2026-05-01 to 2026-05-31
        startDate: '2026-05-10',
        endDate: '2026-05-12',
      },
      hqUser,
    );
    assert(false, 'Reject replacement employee with overlapping active permanent deployment');
  } catch (err: any) {
    assert(
      err instanceof ConflictException && err.message.includes('REPLACEMENT_DEPLOYMENT_CONFLICT'),
      'Reject replacement employee with overlapping active permanent deployment',
    );
  }

  // Test 18: Overlapping replacement conflict - worker already dispatched for overlapping dates
  try {
    // emp-rep-active-1 is already dispatched from 2026-05-01 to 2026-05-05 in Test 01
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-active-1',
        startDate: '2026-05-03',
        endDate: '2026-05-07',
      },
      hqUser,
    );
    assert(false, 'Reject replacement employee with overlapping existing active replacement dispatch');
  } catch (err: any) {
    assert(
      err instanceof ConflictException && err.message.includes('REPLACEMENT_OVERLAP_CONFLICT'),
      'Reject replacement employee with overlapping existing active replacement dispatch',
    );
  }

  // Test 19: Non-overlapping replacement succeeds for same worker
  try {
    const nonOverlapRep = await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-active-1',
        startDate: '2026-05-15', // after May 5
        endDate: '2026-05-20',
      },
      hqUser,
    );
    assert(
      nonOverlapRep && nonOverlapRep.status === ReplacementStatus.DISPATCHED,
      'Allow same replacement employee for non-overlapping future date window',
    );
  } catch (err: any) {
    assert(false, 'Allow same replacement employee for non-overlapping future date window', err.message);
  }

  // Test 20: Leave conflict - replacement employee has approved leave on dates
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-on-leave', // Approved leave 2026-05-10 to 2026-05-15
        startDate: '2026-05-12',
        endDate: '2026-05-14',
      },
      hqUser,
    );
    assert(false, 'Reject replacement employee with approved leave on requested dates');
  } catch (err: any) {
    assert(
      err instanceof ConflictException && err.message.includes('REPLACEMENT_LEAVE_CONFLICT'),
      'Reject replacement employee with approved leave on requested dates',
    );
  }

  // Test 21: Non-approved leave does not block replacement
  try {
    const repRejectedLeave = await service.createReplacement(
      {
        originalDeploymentId: 'dep-guard-active',
        absentEmployeeId: 'emp-absent-1',
        replacementEmployeeId: 'emp-rep-rejected-leave', // REJECTED leave 2026-05-10 to 2026-05-15
        startDate: '2026-05-12',
        endDate: '2026-05-14',
      },
      hqUser,
    );
    assert(
      repRejectedLeave && repRejectedLeave.status === ReplacementStatus.DISPATCHED,
      'Allow replacement employee with non-approved (rejected) leave on dates',
    );
  } catch (err: any) {
    assert(false, 'Allow replacement employee with non-approved (rejected) leave on dates', err.message);
  }

  console.log('--- SUITE C: DRIVER DESIGNATION & LICENSE ENGINE ---');

  // Test 22: Driver deployment requires driving license on file
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-driver-active', // Driver role & vehicle assigned
        absentEmployeeId: 'emp-driver-absent',
        replacementEmployeeId: 'emp-driver-rep-nolicense', // No license
        startDate: '2026-05-01',
        endDate: '2026-05-05',
      },
      hqUser,
    );
    assert(false, 'Reject driver replacement with no driving license on file');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('DRIVER_LICENCE_REQUIRED'),
      'Reject driver replacement with no driving license on file',
    );
  }

  // Test 23: Driver replacement with expired driving license rejected
  try {
    await service.createReplacement(
      {
        originalDeploymentId: 'dep-driver-active',
        absentEmployeeId: 'emp-driver-absent',
        replacementEmployeeId: 'emp-driver-rep-expired', // Expired on 2026-05-01
        startDate: '2026-05-02',
        endDate: '2026-05-05',
      },
      hqUser,
    );
    assert(false, 'Reject driver replacement with license expiring before replacement end date');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('EXPIRED_DRIVING_LICENCE'),
      'Reject driver replacement with license expiring before replacement end date',
    );
  }

  // Test 24: Driver replacement with valid license succeeds
  try {
    const driverRep = await service.createReplacement(
      {
        originalDeploymentId: 'dep-driver-active',
        absentEmployeeId: 'emp-driver-absent',
        replacementEmployeeId: 'emp-driver-rep-valid', // Valid until 2028
        startDate: '2026-05-01',
        endDate: '2026-05-05',
        reason: 'Temporary driver replacement for VIP route',
      },
      hqUser,
    );
    assert(
      driverRep && driverRep.status === ReplacementStatus.DISPATCHED,
      'Dispatch driver replacement with verified valid license successfully',
    );
  } catch (err: any) {
    assert(false, 'Dispatch driver replacement with verified valid license successfully', err.message);
  }

  console.log('--- SUITE D: QUERY, FILTERING & IDOR ISOLATION ---');

  // Test 25: List replacements across agency for HQ user
  const hqList = await service.getReplacements({}, hqUser);
  assert(hqList.items.length >= 3, 'HQ user can query all agency replacements across branches');

  // Test 26: Branch user query is scoped to branch
  const branchList = await service.getReplacements({}, branchChennaiUser);
  assert(
    branchList.items.every((r: any) => r.originalDeployment.branchId === 'branch-chennai'),
    'Branch user query automatically filtered to user branch',
  );

  // Test 27: Cross-tenant query returns empty for alien user
  const alienList = await service.getReplacements({}, alienUser);
  assert(alienList.items.length === 0, 'Cross-tenant query returns empty list (Tenant Isolation)');

  // Test 28: Filter by status
  const dispatchedList = await service.getReplacements({ status: ReplacementStatus.DISPATCHED }, hqUser);
  assert(
    dispatchedList.items.every((r: any) => r.status === ReplacementStatus.DISPATCHED),
    'Filter replacements by status DISPATCHED',
  );

  // Test 29: Filter by absentEmployeeId
  const empList = await service.getReplacements({ originalEmployeeId: 'emp-absent-1' }, hqUser);
  assert(
    empList.items.every((r: any) => r.absentEmployeeId === 'emp-absent-1'),
    'Filter replacements by original absent employee ID',
  );

  // Test 30: Filter by replacementEmployeeId
  const repEmpList = await service.getReplacements({ replacementEmployeeId: 'emp-rep-active-1' }, hqUser);
  assert(
    repEmpList.items.every((r: any) => r.replacementEmployeeId === 'emp-rep-active-1'),
    'Filter replacements by replacement worker ID',
  );

  // Test 31: Filter by deploymentId
  const depList = await service.getReplacements({ deploymentId: 'dep-guard-active' }, hqUser);
  assert(
    depList.items.every((r: any) => r.originalDeploymentId === 'dep-guard-active'),
    'Filter replacements by original deployment ID',
  );

  // Test 32: Pagination metadata check
  const paged = await service.getReplacements({ page: 1, limit: 2 }, hqUser);
  assert(
    paged.items.length <= 2 && paged.pagination.limit === 2 && paged.pagination.page === 1,
    'Pagination controls (page, limit, totalPages) computed correctly',
  );

  // Test 33: Get replacement by ID
  const fetchedRep = await service.getReplacementById(createdRep.id, hqUser);
  assert(
    fetchedRep && fetchedRep.id === createdRep.id && fetchedRep.originalDeployment !== undefined,
    'Fetch replacement by ID with eager relationships',
  );

  // Test 34: Get non-existent replacement throws NotFoundException
  try {
    await service.getReplacementById('rep-imaginary', hqUser);
    assert(false, 'Get non-existent replacement throws NotFoundException');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Get non-existent replacement throws NotFoundException');
  }

  // Test 35: Cross-tenant GetById throws NotFoundException
  try {
    await service.getReplacementById(createdRep.id, alienUser);
    assert(false, 'Cross-tenant GetById blocked');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Cross-tenant GetById blocked');
  }

  // Test 36: Cross-branch GetById throws ForbiddenException for branch user
  try {
    await service.getReplacementById(createdRep.id, branchTrichyUser); // createdRep is in branch-chennai
    assert(false, 'Cross-branch GetById throws ForbiddenException');
  } catch (err: any) {
    assert(err instanceof ForbiddenException, 'Cross-branch GetById throws ForbiddenException');
  }

  console.log('--- SUITE E: UPDATE WORKFLOW ---');

  // Test 37: Update replacement dates successfully
  const updatedRep = await service.updateReplacement(
    createdRep.id,
    {
      startDate: '2026-05-01',
      endDate: '2026-05-04', // shortened by 1 day
      reason: 'Updated reason: leave shortened',
    },
    hqUser,
  );
  assert(
    updatedRep && new Date(updatedRep.endDate).toISOString().slice(0, 10) === '2026-05-04',
    'Update replacement dates successfully within deployment boundary',
  );

  // Test 38: Update with endDate < startDate rejected
  try {
    await service.updateReplacement(
      createdRep.id,
      {
        startDate: '2026-05-04',
        endDate: '2026-05-01',
      },
      hqUser,
    );
    assert(false, 'Reject update with endDate < startDate');
  } catch (err: any) {
    assert(err instanceof BadRequestException, 'Reject update with endDate < startDate');
  }

  // Test 39: Update with dates outside deployment boundary rejected
  try {
    await service.updateReplacement(
      createdRep.id,
      {
        startDate: '2026-03-01', // deployment starts in April
        endDate: '2026-05-04',
      },
      hqUser,
    );
    assert(false, 'Reject update with dates earlier than deployment startDate');
  } catch (err: any) {
    assert(err instanceof BadRequestException, 'Reject update with dates earlier than deployment startDate');
  }

  console.log('--- SUITE F: APPROVAL, REJECTION & CANCELLATION WORKFLOWS ---');

  // Test 40: Approve replacement successfully
  const approvedRep = await service.approveReplacement(
    createdRep.id,
    { comments: 'Reviewed by branch manager, verified guard badge' },
    hqUser,
  );
  assert(
    approvedRep && approvedRep.status === ReplacementStatus.DISPATCHED,
    'Approve replacement successfully via transaction',
  );

  // Test 41: Cross-tenant approval blocked
  try {
    await service.approveReplacement(createdRep.id, { comments: 'Alien approve' }, alienUser);
    assert(false, 'Cross-tenant approve blocked');
  } catch (err: any) {
    assert(err instanceof NotFoundException, 'Cross-tenant approve blocked');
  }

  // Test 42: Reject replacement requires mandatory rejectionReason
  try {
    await service.rejectReplacement(createdRep.id, { rejectionReason: '' }, hqUser);
    assert(false, 'Reject replacement without reason throws BadRequestException');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('mandatory'),
      'Reject replacement without reason throws BadRequestException',
    );
  }

  // Test 43: Create a replacement specifically for rejection test
  const repToReject = await service.createReplacement(
    {
      originalDeploymentId: 'dep-guard-active',
      absentEmployeeId: 'emp-absent-1',
      replacementEmployeeId: 'emp-rep-active-1',
      startDate: '2026-05-25',
      endDate: '2026-05-28',
    },
    hqUser,
  );

  // Test 44: Reject replacement sets CANCELLED status
  const rejectedRep = await service.rejectReplacement(
    repToReject.id,
    { rejectionReason: 'Original employee reported back to work early' },
    hqUser,
  );
  assert(
    rejectedRep && rejectedRep.status === ReplacementStatus.CANCELLED,
    'Reject replacement transitions status to CANCELLED',
  );

  // Test 45: Cancel replacement transitions status to CANCELLED
  const repToCancel = await service.createReplacement(
    {
      originalDeploymentId: 'dep-guard-active',
      absentEmployeeId: 'emp-absent-1',
      replacementEmployeeId: 'emp-rep-active-1',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
    },
    hqUser,
  );
  const cancelledRep = await service.cancelReplacement(
    repToCancel.id,
    { cancellationReason: 'Client site reduced shift count' },
    hqUser,
  );
  assert(
    cancelledRep && cancelledRep.status === ReplacementStatus.CANCELLED,
    'Cancel replacement transitions status to CANCELLED',
  );

  // Test 46: Cannot cancel already cancelled replacement
  try {
    await service.cancelReplacement(repToCancel.id, { cancellationReason: 'Again' }, hqUser);
    assert(false, 'Reject cancelling an already cancelled replacement');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('already cancelled'),
      'Reject cancelling an already cancelled replacement',
    );
  }

  // Test 47: Cannot update cancelled replacement
  try {
    await service.updateReplacement(repToCancel.id, { reason: 'New reason' }, hqUser);
    assert(false, 'Reject updating a cancelled replacement');
  } catch (err: any) {
    assert(err instanceof BadRequestException, 'Reject updating a cancelled replacement');
  }

  console.log('--- SUITE G: COMPLETION WORKFLOW ---');

  // Test 48: Complete replacement successfully
  const completedRep = await service.completeReplacement(
    createdRep.id,
    { notes: 'Replacement shift window concluded without incident' },
    hqUser,
  );
  assert(
    completedRep && completedRep.status === ReplacementStatus.COMPLETED,
    'Complete replacement sets status to COMPLETED',
  );

  // Test 49: Completing already completed replacement is idempotent
  const completedAgain = await service.completeReplacement(createdRep.id, {}, hqUser);
  assert(
    completedAgain && completedAgain.status === ReplacementStatus.COMPLETED,
    'Completing already completed replacement is idempotent',
  );

  // Test 50: Cannot cancel a completed replacement
  try {
    await service.cancelReplacement(createdRep.id, { cancellationReason: 'Try cancel' }, hqUser);
    assert(false, 'Reject cancelling completed replacement');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('completed'),
      'Reject cancelling completed replacement',
    );
  }

  // Test 51: Cannot reject a completed replacement
  try {
    await service.rejectReplacement(createdRep.id, { rejectionReason: 'Try reject' }, hqUser);
    assert(false, 'Reject rejecting completed replacement');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('completed'),
      'Reject rejecting completed replacement',
    );
  }

  // Test 52: Cannot complete a cancelled replacement
  try {
    await service.completeReplacement(repToCancel.id, {}, hqUser);
    assert(false, 'Reject completing a cancelled replacement');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('cancelled'),
      'Reject completing a cancelled replacement',
    );
  }

  console.log('--- SUITE H: ATTENDANCE INTEGRATION INVARIANTS ---');

  // Setup an active dispatched replacement for attendance testing
  const attendanceRep = await service.createReplacement(
    {
      originalDeploymentId: 'dep-guard-active',
      absentEmployeeId: 'emp-absent-1',
      replacementEmployeeId: 'emp-rep-active-1',
      startDate: '2026-06-10',
      endDate: '2026-06-15',
      reason: 'Guard annual leave cover',
    },
    hqUser,
  );

  // Test 53: Record replacement attendance with operational context
  let attRecord: any;
  try {
    attRecord = await service.recordReplacementAttendance(
      attendanceRep.id,
      '2026-06-11',
      hqUser,
      8.0,
      'Covered morning shift smoothly',
    );
    assert(
      attRecord &&
        attRecord.employeeId === 'emp-rep-active-1' &&
        attRecord.deploymentId === 'dep-guard-active' &&
        attRecord.clientId === 'client-apex-a' &&
        attRecord.status === AttendanceStatus.PRESENT,
      'ATTENDANCE INTEGRATION: Attendance recorded under replacementEmployeeId with original deploymentId',
    );
  } catch (err: any) {
    assert(false, 'ATTENDANCE INTEGRATION: Attendance recorded under replacementEmployeeId', err.message);
  }

  // Test 54: Original employee attendance invariant - absent employee has NO duplicate attendance conflict
  const absentEmpAttendance = mockDb.attendances.find(
    (a) => a.employeeId === 'emp-absent-1' && a.shiftBusinessDate === '2026-06-11',
  );
  assert(
    absentEmpAttendance === undefined,
    'INVARIANT: Original absent employee attendance is not overridden or corrupted by replacement record',
  );

  // Test 55: Attendance date outside replacement window rejected
  try {
    await service.recordReplacementAttendance(
      attendanceRep.id,
      '2026-06-20', // outside June 10-15
      hqUser,
    );
    assert(false, 'Reject attendance recording outside replacement window');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('ATTENDANCE_DATE_OUTSIDE_REPLACEMENT'),
      'Reject attendance recording outside replacement window',
    );
  }

  // Test 56: Duplicate attendance for replacement worker on same date rejected
  try {
    await service.recordReplacementAttendance(
      attendanceRep.id,
      '2026-06-11', // already recorded in Test 53
      hqUser,
    );
    assert(false, 'Reject duplicate attendance for replacement worker on same shiftBusinessDate');
  } catch (err: any) {
    assert(
      err instanceof ConflictException && err.message.includes('DUPLICATE_ATTENDANCE'),
      'Reject duplicate attendance for replacement worker on same shiftBusinessDate',
    );
  }

  // Test 57: Cannot record attendance for cancelled replacement
  try {
    await service.recordReplacementAttendance(
      repToCancel.id,
      '2026-06-02',
      hqUser,
    );
    assert(false, 'Reject attendance recording for CANCELLED replacement');
  } catch (err: any) {
    assert(err instanceof BadRequestException, 'Reject attendance recording for CANCELLED replacement');
  }

  console.log('--- SUITE I: AUDIT TRAIL VERIFICATION ---');

  // Test 58: Audit log generated on replacement dispatch
  const dispatchAudit = mockDb.auditLogs.find(
    (l) => l.action === AuditAction.CREATE && l.entityName === 'Replacement',
  );
  assert(
    dispatchAudit !== undefined && dispatchAudit.changeSummary.includes('REPLACEMENT_DISPATCHED'),
    'AUDIT VERIFICATION: Create/dispatch produces structured audit entry with entityName Replacement',
  );

  // Test 59: Audit log generated on replacement cancellation/completion
  const cancelAudit = mockDb.auditLogs.find(
    (l) => l.entityName === 'Replacement' && l.changeSummary.includes('REPLACEMENT_CANCELLED'),
  );
  const completeAudit = mockDb.auditLogs.find(
    (l) => l.entityName === 'Replacement' && l.changeSummary.includes('REPLACEMENT_COMPLETED'),
  );
  assert(
    cancelAudit !== undefined && completeAudit !== undefined,
    'AUDIT VERIFICATION: Cancel and Complete actions produce structured audit log records',
  );

  console.log('\n======================================================');
  console.log(`📊 REPLACEMENT SUITE RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('======================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled error in replacement test suite:', err);
  process.exit(1);
});
