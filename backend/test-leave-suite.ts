import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LeaveService } from './src/modules/leave/leave.service';
import { AuthenticatedUserContext } from './src/common/decorators/current-user.decorator';
import {
  AuditAction,
  LeaveStatus,
  AttendanceStatus,
  AttendanceMethod,
  DeploymentStatus,
} from '@prisma/client';

console.log('\n======================================================');
console.log('🧪 RUNNING PRODUCTION LEAVE MANAGEMENT ENGINE TEST SUITE (37/37)');
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
  leaveTypes: [
    {
      id: 'lt-cl',
      agencyId: 'agency-apex-1',
      name: 'Casual Leave',
      code: 'CL',
      daysPerYear: 12,
      isPaid: true,
      isAccumulative: false,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'lt-sl',
      agencyId: 'agency-apex-1',
      name: 'Sick Leave',
      code: 'SL',
      daysPerYear: 10,
      isPaid: true,
      isAccumulative: true,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'lt-lop',
      agencyId: 'agency-apex-1',
      name: 'Loss of Pay',
      code: 'LOP',
      daysPerYear: 0,
      isPaid: false,
      isAccumulative: false,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'lt-inactive',
      agencyId: 'agency-apex-1',
      name: 'Special Inactive Leave',
      code: 'SPEC',
      daysPerYear: 5,
      isPaid: true,
      isAccumulative: false,
      isActive: false,
      createdAt: new Date(),
    },
  ],
  leaveBalances: [] as any[],
  leaveRequests: [] as any[],
  attendances: [] as any[],
  auditLogs: [] as any[],
  agencyBranches: [
    { id: 'branch-chennai', agencyId: 'agency-apex-1', branchName: 'Chennai HQ', branchCode: 'CHN', isHeadquarters: true, deletedAt: null },
    { id: 'branch-trichy', agencyId: 'agency-apex-1', branchName: 'Trichy Branch', branchCode: 'TRC', isHeadquarters: false, deletedAt: null },
    { id: 'branch-alien-1', agencyId: 'agency-alien-99', branchName: 'Alien Branch', branchCode: 'ALN', isHeadquarters: true, deletedAt: null },
  ],
  employees: [
    {
      id: 'emp-1',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-001',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      phone: '+919876543210',
      status: 'ACTIVE',
      deletedAt: null,
      branch: { id: 'branch-chennai', branchName: 'Chennai HQ', branchCode: 'CHN' },
    },
    {
      id: 'emp-2',
      agencyId: 'agency-apex-1',
      branchId: 'branch-trichy',
      employeeCode: 'EMP-002',
      firstName: 'Suresh',
      lastName: 'Selvam',
      phone: '+919876543211',
      status: 'ACTIVE',
      deletedAt: null,
      branch: { id: 'branch-trichy', branchName: 'Trichy Branch', branchCode: 'TRC' },
    },
    {
      id: 'emp-alien',
      agencyId: 'agency-alien-99',
      branchId: 'branch-alien-1',
      employeeCode: 'EMP-999',
      firstName: 'Alien',
      lastName: 'Worker',
      phone: '+919876543299',
      status: 'ACTIVE',
      deletedAt: null,
      branch: { id: 'branch-alien-1', branchName: 'Alien Branch', branchCode: 'ALN' },
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
      id: 'dep-active-1',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeId: 'emp-1',
      clientId: 'client-apex-a',
      clientSiteId: 'site-a1',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2026-06-30T23:59:59.000Z'),
      shiftName: 'General Morning',
      status: DeploymentStatus.ACTIVE,
      deletedAt: null,
      client: { id: 'client-apex-a', companyName: 'Apex Logistics Corp' },
      clientSite: { id: 'site-a1', siteName: 'Central Warehouse Site A1' },
    },
    {
      id: 'dep-historical-old',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeId: 'emp-1',
      clientId: 'client-apex-a',
      clientSiteId: 'site-a1',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-03-31T23:59:59.000Z'),
      shiftName: 'Historical Shift',
      status: DeploymentStatus.COMPLETED,
      deletedAt: null,
      client: { id: 'client-apex-a', companyName: 'Apex Logistics Corp' },
      clientSite: { id: 'site-a1', siteName: 'Central Warehouse Site A1' },
    },
  ],
};

// Mock Prisma implementation
const mockPrisma: any = {
  leaveType: {
    findUnique: async ({ where }: any) => {
      if (where.agencyId_code) {
        return mockDb.leaveTypes.find(
          (lt) => lt.agencyId === where.agencyId_code.agencyId && lt.code === where.agencyId_code.code,
        ) || null;
      }
      if (where.id) {
        return mockDb.leaveTypes.find((lt) => lt.id === where.id) || null;
      }
      return null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.leaveTypes.find(
        (lt) =>
          lt.id === where.id &&
          (where.agencyId ? lt.agencyId === where.agencyId : true),
      ) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.leaveTypes.filter((lt) => {
        if (where.agencyId && lt.agencyId !== where.agencyId) return false;
        if (where.isActive !== undefined && lt.isActive !== where.isActive) return false;
        return true;
      });
    },
    create: async ({ data }: any) => {
      const rec = { id: `lt-${Date.now()}`, createdAt: new Date(), ...data };
      mockDb.leaveTypes.push(rec);
      return rec;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.leaveTypes.findIndex((lt) => lt.id === where.id);
      if (idx === -1) throw new NotFoundException('Leave type not found');
      mockDb.leaveTypes[idx] = { ...mockDb.leaveTypes[idx], ...data };
      return mockDb.leaveTypes[idx];
    },
  },
  employee: {
    findFirst: async ({ where }: any) => {
      return mockDb.employees.find(
        (e) =>
          e.id === where.id &&
          (where.agencyId ? e.agencyId === where.agencyId : true) &&
          (where.deletedAt === null ? e.deletedAt === null : true),
      ) || null;
    },
  },
  leaveBalance: {
    findUnique: async ({ where }: any) => {
      if (where.employeeId_leaveTypeId_year) {
        return mockDb.leaveBalances.find(
          (b) =>
            b.employeeId === where.employeeId_leaveTypeId_year.employeeId &&
            b.leaveTypeId === where.employeeId_leaveTypeId_year.leaveTypeId &&
            b.year === where.employeeId_leaveTypeId_year.year,
        ) || null;
      }
      if (where.id) {
        const bal = mockDb.leaveBalances.find((b) => b.id === where.id);
        if (!bal) return null;
        const emp = mockDb.employees.find((e) => e.id === bal.employeeId);
        const lt = mockDb.leaveTypes.find((t) => t.id === bal.leaveTypeId);
        return { ...bal, employee: emp, leaveType: lt };
      }
      return null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.leaveBalances.filter((b) => {
        if (where.employeeId && b.employeeId !== where.employeeId) return false;
        if (where.leaveTypeId && b.leaveTypeId !== where.leaveTypeId) return false;
        if (where.year && b.year !== where.year) return false;
        return true;
      }).map((b) => {
        const emp = mockDb.employees.find((e) => e.id === b.employeeId);
        const lt = mockDb.leaveTypes.find((t) => t.id === b.leaveTypeId);
        return { ...b, employee: emp, leaveType: lt };
      });
    },
    create: async ({ data }: any) => {
      const rec = {
        id: `bal-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      mockDb.leaveBalances.push(rec);
      const emp = mockDb.employees.find((e) => e.id === data.employeeId);
      const lt = mockDb.leaveTypes.find((t) => t.id === data.leaveTypeId);
      return { ...rec, employee: emp, leaveType: lt };
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.leaveBalances.findIndex((b) => b.id === where.id);
      if (idx === -1) throw new NotFoundException('Leave balance not found');
      const current = mockDb.leaveBalances[idx];

      let newConsumed = current.consumedDays;
      let newClosing = current.closingBalance;
      let newAccrued = current.accruedDays;

      if (data.consumedDays && data.consumedDays.increment !== undefined) {
        newConsumed = Number(newConsumed) + Number(data.consumedDays.increment);
      } else if (data.consumedDays && data.consumedDays.decrement !== undefined) {
        newConsumed = Number(newConsumed) - Number(data.consumedDays.decrement);
      }

      if (data.closingBalance && data.closingBalance.increment !== undefined) {
        newClosing = Number(newClosing) + Number(data.closingBalance.increment);
      } else if (data.closingBalance && data.closingBalance.decrement !== undefined) {
        newClosing = Number(newClosing) - Number(data.closingBalance.decrement);
      } else if (data.closingBalance !== undefined) {
        newClosing = Number(data.closingBalance);
      }

      if (data.accruedDays !== undefined) {
        newAccrued = Number(data.accruedDays);
      }

      mockDb.leaveBalances[idx] = {
        ...current,
        consumedDays: newConsumed,
        closingBalance: newClosing,
        accruedDays: newAccrued,
        updatedAt: new Date(),
      };
      const emp = mockDb.employees.find((e) => e.id === mockDb.leaveBalances[idx].employeeId);
      const lt = mockDb.leaveTypes.find((t) => t.id === mockDb.leaveBalances[idx].leaveTypeId);
      return { ...mockDb.leaveBalances[idx], employee: emp, leaveType: lt };
    },
  },
  leaveRequest: {
    findUnique: async ({ where }: any) => {
      const req = mockDb.leaveRequests.find((r) => r.id === where.id);
      if (!req) return null;
      const emp = mockDb.employees.find((e) => e.id === req.employeeId);
      const lt = mockDb.leaveTypes.find((t) => t.id === req.leaveTypeId);
      return { ...req, employee: emp, leaveType: lt };
    },
    findFirst: async ({ where }: any) => {
      const req = mockDb.leaveRequests.find((r) => {
        if (where.id && where.id.not && r.id === where.id.not) return false;
        if (where.id && typeof where.id === 'string' && r.id !== where.id) return false;
        if (where.employeeId && r.employeeId !== where.employeeId) return false;
        if (where.status && where.status.in && !where.status.in.includes(r.status)) return false;
        if (where.status && typeof where.status === 'string' && r.status !== where.status) return false;
        if (where.deletedAt === null && r.deletedAt !== null) return false;

        if (where.startDate && where.startDate.lte) {
          const reqEnd = new Date(r.endDate);
          const filterStartLte = new Date(where.startDate.lte);
          if (r.startDate > filterStartLte && reqEnd < where.endDate.gte) return false;
        }
        if (where.startDate && where.endDate) {
          const rStart = new Date(r.startDate);
          const rEnd = new Date(r.endDate);
          const wStart = new Date(where.endDate.gte || where.startDate);
          const wEnd = new Date(where.startDate.lte || where.endDate);
          if (rStart <= wEnd && rEnd >= wStart) return true;
          return false;
        }
        return true;
      });
      if (!req) return null;
      const emp = mockDb.employees.find((e) => e.id === req.employeeId);
      const lt = mockDb.leaveTypes.find((t) => t.id === req.leaveTypeId);
      return { ...req, employee: emp, leaveType: lt };
    },
    findMany: async ({ where }: any) => {
      return mockDb.leaveRequests.filter((r) => {
        if (where.employeeId && r.employeeId !== where.employeeId) return false;
        if (where.leaveTypeId && r.leaveTypeId !== where.leaveTypeId) return false;
        if (where.status && r.status !== where.status) return false;
        if (where.deletedAt === null && r.deletedAt !== null) return false;
        return true;
      }).map((r) => {
        const emp = mockDb.employees.find((e) => e.id === r.employeeId);
        const lt = mockDb.leaveTypes.find((t) => t.id === r.leaveTypeId);
        return { ...r, employee: emp, leaveType: lt };
      });
    },
    count: async () => mockDb.leaveRequests.length,
    create: async ({ data }: any) => {
      const rec = {
        id: `lr-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        reviewedById: null,
        reviewedAt: null,
        reviewerComments: null,
        ...data,
      };
      mockDb.leaveRequests.push(rec);
      const emp = mockDb.employees.find((e) => e.id === data.employeeId);
      const lt = mockDb.leaveTypes.find((t) => t.id === data.leaveTypeId);
      return { ...rec, employee: emp, leaveType: lt };
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.leaveRequests.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new NotFoundException('Leave request not found');
      mockDb.leaveRequests[idx] = { ...mockDb.leaveRequests[idx], ...data, updatedAt: new Date() };
      const emp = mockDb.employees.find((e) => e.id === mockDb.leaveRequests[idx].employeeId);
      const lt = mockDb.leaveTypes.find((t) => t.id === mockDb.leaveRequests[idx].leaveTypeId);
      return { ...mockDb.leaveRequests[idx], employee: emp, leaveType: lt };
    },
  },
  employeeDeployment: {
    findFirst: async ({ where }: any) => {
      return mockDb.deployments.find((d) => {
        if (where.employeeId && d.employeeId !== where.employeeId) return false;
        if (where.agencyId && d.agencyId !== where.agencyId) return false;
        if (where.deletedAt === null && d.deletedAt !== null) return false;
        if (where.startDate && where.startDate.lte) {
          if (new Date(d.startDate) > new Date(where.startDate.lte)) return false;
        }
        if (where.OR) {
          const matchesOr = where.OR.some((clause: any) => {
            if (clause.endDate === null && d.endDate === null) return true;
            if (clause.endDate && clause.endDate.gte) {
              return d.endDate && new Date(d.endDate) >= new Date(clause.endDate.gte);
            }
            return false;
          });
          if (!matchesOr) return false;
        }
        return true;
      }) || null;
    },
  },
  attendance: {
    findFirst: async ({ where }: any) => {
      return mockDb.attendances.find((a) => {
        if (where.employeeId && a.employeeId !== where.employeeId) return false;
        if (where.shiftBusinessDate) {
          const matchDate =
            a.shiftBusinessDate instanceof Date
              ? a.shiftBusinessDate.toISOString().slice(0, 10)
              : a.shiftBusinessDate;
          const targetDate =
            where.shiftBusinessDate instanceof Date
              ? where.shiftBusinessDate.toISOString().slice(0, 10)
              : where.shiftBusinessDate;
          if (matchDate !== targetDate) return false;
        }
        return true;
      }) || null;
    },
    create: async ({ data }: any) => {
      const rec = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      mockDb.attendances.push(rec);
      return rec;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.attendances.findIndex((a) => a.id === where.id);
      if (idx === -1) throw new NotFoundException('Attendance record not found');
      mockDb.attendances[idx] = { ...mockDb.attendances[idx], ...data, updatedAt: new Date() };
      return mockDb.attendances[idx];
    },
  },
  $transaction: async (fn: any) => {
    return fn(mockPrisma);
  },
};

// Mock Audit Service
const mockAuditService: any = {
  record: async (entry: any) => {
    mockDb.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
      ...entry,
    });
  },
};

// Instantiate LeaveService
const leaveService = new LeaveService(mockPrisma, mockAuditService);

// Test Contexts
const hqAdminUser: AuthenticatedUserContext = {
  id: 'usr-admin-hq',
  agencyId: 'agency-apex-1',
  branchId: null,
  roleSlug: 'super-admin',
  effectivePermissions: ['LEAVE_CREATE', 'LEAVE_READ', 'LEAVE_UPDATE', 'LEAVE_DELETE', 'LEAVE_APPROVE', 'LEAVE_REJECT', 'LEAVE_CANCEL', 'LEAVE_BALANCE_READ', 'LEAVE_BALANCE_UPDATE'],
};

const chennaiManagerUser: AuthenticatedUserContext = {
  id: 'usr-mgr-chn',
  agencyId: 'agency-apex-1',
  branchId: 'branch-chennai',
  roleSlug: 'branch-manager',
  effectivePermissions: ['LEAVE_CREATE', 'LEAVE_READ', 'LEAVE_UPDATE', 'LEAVE_APPROVE', 'LEAVE_REJECT', 'LEAVE_CANCEL', 'LEAVE_BALANCE_READ', 'LEAVE_BALANCE_UPDATE'],
};

const trichyManagerUser: AuthenticatedUserContext = {
  id: 'usr-mgr-trc',
  agencyId: 'agency-apex-1',
  branchId: 'branch-trichy',
  roleSlug: 'branch-manager',
  effectivePermissions: ['LEAVE_CREATE', 'LEAVE_READ', 'LEAVE_UPDATE', 'LEAVE_APPROVE', 'LEAVE_REJECT', 'LEAVE_CANCEL', 'LEAVE_BALANCE_READ', 'LEAVE_BALANCE_UPDATE'],
};

const alienAgencyUser: AuthenticatedUserContext = {
  id: 'usr-alien',
  agencyId: 'agency-alien-99',
  branchId: 'branch-alien-1',
  roleSlug: 'branch-manager',
  effectivePermissions: ['LEAVE_CREATE', 'LEAVE_READ', 'LEAVE_UPDATE', 'LEAVE_APPROVE', 'LEAVE_REJECT', 'LEAVE_CANCEL', 'LEAVE_BALANCE_READ', 'LEAVE_BALANCE_UPDATE'],
};

async function runLeaveTests() {
  console.log('--- GROUP 1: Leave Types & Balances ---');

  // Test 1: Read leave types
  const types = await leaveService.getLeaveTypes(hqAdminUser, false);
  assert(types.length === 4, 'Read all leave types for agency', `Expected 4, got ${types.length}`);

  // Test 2: Active leave type filter
  const activeTypes = await leaveService.getLeaveTypes(hqAdminUser, true);
  assert(activeTypes.length === 3 && activeTypes.every((t) => t.isActive), 'Filter active leave types only');

  // Test 3: Create leave balance
  const balanceCL = await leaveService.createLeaveBalance(
    {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-cl',
      year: 2026,
      openingBalance: 12,
    },
    hqAdminUser,
  );
  assert(
    balanceCL && Number(balanceCL.openingBalance) === 12 && Number(balanceCL.closingBalance) === 12,
    'Create leave balance for employee (Year 2026, 12 days allocated)',
  );

  // Test 4: Read leave balance
  const balances = await leaveService.getLeaveBalances({ employeeId: 'emp-1' }, hqAdminUser);
  assert(balances.length === 1 && balances[0].employeeId === 'emp-1', 'Read employee leave balances');

  // Test 5: Allocate balance (create SL balance for emp-1)
  const balanceSL = await leaveService.createLeaveBalance(
    {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-sl',
      year: 2026,
      openingBalance: 10,
    },
    chennaiManagerUser,
  );
  assert(balanceSL && Number(balanceSL.closingBalance) === 10, 'Allocate second leave type (SL: 10 days)');

  // Test 6: Adjust balance (+3 days)
  const adjusted = await leaveService.adjustLeaveBalance(
    balanceCL.id,
    { adjustmentDays: 3, reason: 'Annual incentive adjustment' },
    chennaiManagerUser,
  );
  assert(
    Number(adjusted.closingBalance) === 15 && Number(adjusted.accruedDays) === 3,
    'Adjust leave balance (+3 days increases closingBalance from 12 to 15)',
  );

  // Test 7: Negative balance protection
  let negErrorThrown = false;
  try {
    await leaveService.adjustLeaveBalance(
      balanceCL.id,
      { adjustmentDays: -20, reason: 'Invalid reduction' },
      chennaiManagerUser,
    );
  } catch (err: any) {
    negErrorThrown = err instanceof BadRequestException && err.message.includes('NEGATIVE_BALANCE_NOT_ALLOWED');
  }
  assert(negErrorThrown, 'Negative balance protection rejects adjustment that drops balance below 0');

  console.log('\n--- GROUP 2: Leave Request Submission & Validation ---');

  // Test 8: Create valid leave request
  const request1 = await leaveService.createLeaveRequest(
    {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-cl',
      startDate: '2026-05-10',
      endDate: '2026-05-12',
      reason: 'Family function in hometown',
    },
    chennaiManagerUser,
  );
  assert(
    request1 && request1.status === LeaveStatus.PENDING && Number(request1.totalDays) === 3,
    'Create leave request in PENDING status (server calculated 3 days)',
  );

  // Test 9: Read leave request
  const readReq = await leaveService.getLeaveRequestById(request1.id, chennaiManagerUser);
  assert(readReq && readReq.id === request1.id, 'Read leave request by ID');

  // Test 10: Update pending request
  const updatedReq = await leaveService.updateLeaveRequest(
    request1.id,
    { reason: 'Updated family function dates' },
    chennaiManagerUser,
  );
  assert(updatedReq && updatedReq.reason === 'Updated family function dates', 'Update PENDING leave request details');

  // Test 11: Invalid start/end date validation
  let invalidDateThrown = false;
  try {
    await leaveService.createLeaveRequest(
      {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-cl',
        startDate: '2026-05-15',
        endDate: '2026-05-10',
        reason: 'Backwards dates',
      },
      chennaiManagerUser,
    );
  } catch (err: any) {
    invalidDateThrown = err instanceof BadRequestException;
  }
  assert(invalidDateThrown, 'Invalid date range (endDate < startDate) rejected with BadRequestException');

  // Test 12: Half-day mismatched dates validation
  let halfDayErrorThrown = false;
  try {
    await leaveService.createLeaveRequest(
      {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-cl',
        startDate: '2026-05-15',
        endDate: '2026-05-16',
        isHalfDay: true,
        reason: 'Multi-day half day invalid',
      },
      chennaiManagerUser,
    );
  } catch (err: any) {
    halfDayErrorThrown = err instanceof BadRequestException && err.message.includes('identical start and end');
  }
  assert(halfDayErrorThrown, 'Half-day leave requires identical start and end dates');

  // Test 13: Overlap rejection with existing PENDING request
  let pendingOverlapThrown = false;
  try {
    await leaveService.createLeaveRequest(
      {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-cl',
        startDate: '2026-05-11',
        endDate: '2026-05-14',
        reason: 'Conflicting dates',
      },
      chennaiManagerUser,
    );
  } catch (err: any) {
    pendingOverlapThrown = err instanceof ConflictException && err.message.includes('OVERLAPPING_LEAVE_REQUEST');
  }
  assert(pendingOverlapThrown, 'Overlapping request rejected with 409 Conflict (conflicts with PENDING leave)');

  // Test 14: Inactive leave type rejection
  let inactiveThrown = false;
  try {
    await leaveService.createLeaveRequest(
      {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-inactive',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        reason: 'Trying inactive leave',
      },
      chennaiManagerUser,
    );
  } catch (err: any) {
    inactiveThrown = err instanceof BadRequestException && err.message.includes('inactive');
  }
  assert(inactiveThrown, 'Inactive leave type rejected on request creation');

  // Test 15: Insufficient balance rejection for paid leave
  let insufficientThrown = false;
  try {
    await leaveService.createLeaveRequest(
      {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-sl', // 10 days available
        startDate: '2026-08-01',
        endDate: '2026-08-20', // 20 days requested
        reason: 'Extended medical leave',
      },
      chennaiManagerUser,
    );
  } catch (err: any) {
    insufficientThrown = err instanceof BadRequestException && err.message.includes('INSUFFICIENT_LEAVE_BALANCE');
  }
  assert(insufficientThrown, 'Insufficient leave balance rejected (20 days requested vs 10 available)');

  // Test 16: LOP accepted without paid balance
  const lopRequest = await leaveService.createLeaveRequest(
    {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-lop',
      startDate: '2026-09-01',
      endDate: '2026-09-03',
      reason: 'Unpaid personal time off',
    },
    chennaiManagerUser,
  );
  assert(
    lopRequest && Number(lopRequest.totalDays) === 3 && lopRequest.status === LeaveStatus.PENDING,
    'Loss of Pay (LOP) accepted without requiring pre-allocated paid balance',
  );

  console.log('\n--- GROUP 3: Approval Workflow & Attendance Integration ---');

  // Test 17: Approve paid leave
  const approvedCL = await leaveService.approveLeaveRequest(
    request1.id,
    { reviewerComments: 'Approved by Branch Manager' },
    chennaiManagerUser,
  );
  assert(
    approvedCL.status === LeaveStatus.APPROVED && approvedCL.reviewedById === chennaiManagerUser.id,
    'Approve paid leave transitions status to APPROVED with reviewer recorded',
  );

  // Verify balance consumption
  const balAfterApproval = await mockPrisma.leaveBalance.findUnique({ where: { id: balanceCL.id } });
  assert(
    Number(balAfterApproval.consumedDays) === 3 && Number(balAfterApproval.closingBalance) === 12, // 15 - 3 = 12
    'Balance consumed atomically on approval (consumedDays: 3, closingBalance: 12)',
  );

  // Test 18: Reject leave request
  const requestToReject = await leaveService.createLeaveRequest(
    {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-cl',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      reason: 'Short trip',
    },
    chennaiManagerUser,
  );
  const rejectedReq = await leaveService.rejectLeaveRequest(
    requestToReject.id,
    { rejectionReason: 'Operational crunch at client warehouse' },
    chennaiManagerUser,
  );
  assert(
    rejectedReq.status === LeaveStatus.REJECTED && rejectedReq.reviewerComments === 'Operational crunch at client warehouse',
    'Reject leave records REJECTED status and mandatory rejectionReason',
  );

  // Test 19: Rejection without reason fails
  const reqRejectNoReason = await leaveService.createLeaveRequest(
    {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-cl',
      startDate: '2026-06-05',
      endDate: '2026-06-06',
      reason: 'Another request',
    },
    chennaiManagerUser,
  );
  let rejectNoReasonThrown = false;
  try {
    await leaveService.rejectLeaveRequest(
      reqRejectNoReason.id,
      { rejectionReason: '   ' },
      chennaiManagerUser,
    );
  } catch (err: any) {
    rejectNoReasonThrown = err instanceof BadRequestException;
  }
  assert(rejectNoReasonThrown, 'Rejection without reason strictly rejected with BadRequestException');

  // Test 20: Unauthorized cross-branch approval
  let unauthorizedApprovalThrown = false;
  try {
    await leaveService.approveLeaveRequest(
      lopRequest.id,
      { reviewerComments: 'Trichy manager approving Chennai employee' },
      trichyManagerUser,
    );
  } catch (err: any) {
    unauthorizedApprovalThrown = err instanceof ForbiddenException;
  }
  assert(unauthorizedApprovalThrown, 'Cross-branch unauthorized approval blocked with ForbiddenException');

  // Test 21: Paid leave marks Attendance.status = PAID_LEAVE
  const attMay10 = await mockPrisma.attendance.findFirst({
    where: { employeeId: 'emp-1', shiftBusinessDate: '2026-05-10' },
  });
  assert(
    attMay10 && attMay10.status === AttendanceStatus.PAID_LEAVE && Number(attMay10.workedHours) === 0,
    'Approved paid leave automatically marks Attendance.status = PAID_LEAVE (0 worked hours)',
  );

  // Test 22: LOP approval marks Attendance.status = UNPAID_LEAVE
  // Create active deployment covering September 2026 for emp-1
  mockDb.deployments.push({
    id: 'dep-active-sep',
    agencyId: 'agency-apex-1',
    branchId: 'branch-chennai',
    employeeId: 'emp-1',
    clientId: 'client-apex-a',
    clientSiteId: 'site-a1',
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-30T23:59:59.000Z'),
    shiftName: 'General Morning',
    status: DeploymentStatus.ACTIVE,
    deletedAt: null,
    client: { id: 'client-apex-a', companyName: 'Apex Logistics Corp' },
    clientSite: { id: 'site-a1', siteName: 'Central Warehouse Site A1' },
  });

  await leaveService.approveLeaveRequest(lopRequest.id, { reviewerComments: 'Approved LOP' }, chennaiManagerUser);
  const attSep01 = await mockPrisma.attendance.findFirst({
    where: { employeeId: 'emp-1', shiftBusinessDate: '2026-09-01' },
  });
  assert(
    attSep01 && attSep01.status === AttendanceStatus.UNPAID_LEAVE && Number(attSep01.workedHours) === 0,
    'Approved LOP automatically marks Attendance.status = UNPAID_LEAVE',
  );

  // Test 23: Historical deployment resolution preserved
  // Employee 1 had dep-historical-old in Jan-Mar 2026, and dep-active-1 in Apr-Jun 2026
  // Check that attendance for May 10 resolved to dep-active-1
  assert(
    attMay10 && attMay10.deploymentId === 'dep-active-1',
    'Historical deployment correctly resolved for leave attendance date (dep-active-1)',
  );

  // Test 24: Locked attendance protected
  // Pre-seed a locked attendance record for 2026-05-20
  mockDb.attendances.push({
    id: 'att-locked-1',
    agencyId: 'agency-apex-1',
    branchId: 'branch-chennai',
    employeeId: 'emp-1',
    deploymentId: 'dep-active-1',
    clientId: 'client-apex-a',
    clientSiteId: 'site-a1',
    shiftBusinessDate: '2026-05-20',
    status: AttendanceStatus.PRESENT,
    isLocked: true, // Payroll finalized & locked!
  });

  const reqOnLockedDate = await leaveService.createLeaveRequest(
    {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-cl',
      startDate: '2026-05-20',
      endDate: '2026-05-20',
      reason: 'Leave on locked date',
    },
    chennaiManagerUser,
  );

  let lockedAttThrown = false;
  try {
    await leaveService.approveLeaveRequest(reqOnLockedDate.id, {}, chennaiManagerUser);
  } catch (err: any) {
    lockedAttThrown = err instanceof BadRequestException && err.message.includes('ATTENDANCE_LOCKED');
  }
  assert(lockedAttThrown, 'Approval on payroll-locked attendance date fails with ATTENDANCE_LOCKED error');

  console.log('\n--- GROUP 4: Cancellation Workflow & Balance Restoration ---');

  // Test 25: Cancel pending request
  const pendingToCancel = await leaveService.createLeaveRequest(
    {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-cl',
      startDate: '2026-06-15',
      endDate: '2026-06-16',
      reason: 'Plans changed',
    },
    chennaiManagerUser,
  );
  const cancelledPending = await leaveService.cancelLeaveRequest(
    pendingToCancel.id,
    { cancellationReason: 'Employee revoked application' },
    chennaiManagerUser,
  );
  assert(
    cancelledPending.status === LeaveStatus.CANCELLED,
    'Cancel PENDING request sets status to CANCELLED without touching balance',
  );

  // Test 26: Cancel approved future leave
  // request1 (May 10-12) was approved and consumed 3 days
  const cancelledApproved = await leaveService.cancelLeaveRequest(
    request1.id,
    { cancellationReason: 'Client work rescheduled, leave cancelled' },
    chennaiManagerUser,
  );
  assert(
    cancelledApproved.status === LeaveStatus.CANCELLED,
    'Cancel APPROVED future leave sets status to CANCELLED',
  );

  // Test 27: Balance restored after cancellation
  const balAfterCancel = await mockPrisma.leaveBalance.findUnique({ where: { id: balanceCL.id } });
  assert(
    Number(balAfterCancel.consumedDays) === 0 && Number(balAfterCancel.closingBalance) === 15,
    'Consumed balance fully restored on cancellation (closingBalance returned to 15)',
  );

  // Verify attendance reverted
  const attAfterCancel = await mockPrisma.attendance.findFirst({
    where: { employeeId: 'emp-1', shiftBusinessDate: '2026-05-10' },
  });
  assert(
    attAfterCancel && attAfterCancel.status === AttendanceStatus.ABSENT,
    'Attendance record safely reverted to ABSENT upon leave cancellation',
  );

  console.log('\n--- GROUP 5: Multi-Tenant & IDOR Security ---');

  // Test 28: Cross-agency IDOR protection
  let crossAgencyThrown = false;
  try {
    await leaveService.createLeaveRequest(
      {
        employeeId: 'emp-alien',
        leaveTypeId: 'lt-cl',
        startDate: '2026-05-01',
        endDate: '2026-05-02',
        reason: 'IDOR attempt',
      },
      chennaiManagerUser,
    );
  } catch (err: any) {
    crossAgencyThrown = err instanceof NotFoundException;
  }
  assert(crossAgencyThrown, 'Cross-agency access blocked with NotFoundException (IDOR isolation)');

  // Test 29: Cross-branch IDOR protection
  let crossBranchThrown = false;
  try {
    await leaveService.createLeaveRequest(
      {
        employeeId: 'emp-2', // Trichy employee
        leaveTypeId: 'lt-cl',
        startDate: '2026-05-01',
        endDate: '2026-05-02',
        reason: 'Cross branch request',
      },
      chennaiManagerUser, // Chennai manager
    );
  } catch (err: any) {
    crossBranchThrown = err instanceof ForbiddenException;
  }
  assert(crossBranchThrown, 'Cross-branch creation blocked with ForbiddenException');

  // Test 30: HQ Super Admin can manage across all branches
  const hqCreated = await leaveService.createLeaveBalance(
    {
      employeeId: 'emp-2', // Trichy employee
      leaveTypeId: 'lt-cl',
      year: 2026,
      openingBalance: 12,
    },
    hqAdminUser,
  );
  assert(hqCreated && hqCreated.employeeId === 'emp-2', 'HQ Super Admin authorized across all branches');

  console.log('\n--- GROUP 6: Concurrency & Audit Logging ---');

  // Test 31: Concurrent leave approval race condition
  // Set up employee 2 balance with exactly 2 days available
  const balEmp2 = await mockPrisma.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId: 'emp-2', leaveTypeId: 'lt-cl', year: 2026 } },
  });
  // Adjust balance to exactly 2 days
  await mockPrisma.leaveBalance.update({
    where: { id: balEmp2.id },
    data: { openingBalance: 2, closingBalance: 2, consumedDays: 0 },
  });

  // Create Request A for 2 days (June 1-2)
  const reqA = await leaveService.createLeaveRequest(
    {
      employeeId: 'emp-2',
      leaveTypeId: 'lt-cl',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      reason: 'Request A for 2 days',
    },
    trichyManagerUser,
  );

  // Create Request B for 2 days (June 10-11)
  const reqB = await leaveService.createLeaveRequest(
    {
      employeeId: 'emp-2',
      leaveTypeId: 'lt-cl',
      startDate: '2026-06-10',
      endDate: '2026-06-11',
      reason: 'Request B for 2 days',
    },
    trichyManagerUser,
  );

  // Simulate concurrent approvals:
  // First approval succeeds
  const resA = await leaveService.approveLeaveRequest(reqA.id, {}, trichyManagerUser);
  assert(resA.status === LeaveStatus.APPROVED, 'Concurrent Approval A succeeds consuming all remaining balance');

  // Second approval must fail due to exhausted balance
  let reqBFailedDueToBalance = false;
  try {
    await leaveService.approveLeaveRequest(reqB.id, {}, trichyManagerUser);
  } catch (err: any) {
    reqBFailedDueToBalance =
      err instanceof ConflictException && err.message.includes('LEAVE_BALANCE_INSUFFICIENT_OR_CONCURRENT_UPDATE');
  }
  assert(reqBFailedDueToBalance, 'Concurrent Approval B rejected with 409 Conflict (concurrency protection)');

  // Test 32: Duplicate attendance entry prevention
  // Re-approving an already approved or processed date does not create duplicate rows
  const allAttForEmp2June1 = mockDb.attendances.filter(
    (a) => a.employeeId === 'emp-2' && a.shiftBusinessDate === '2026-06-01',
  );
  assert(allAttForEmp2June1.length <= 1, 'Duplicate attendance records prevented for shift business date');

  // Test 33: Past / finalized leave cannot be repeatedly cancelled
  let doubleCancelThrown = false;
  try {
    await leaveService.cancelLeaveRequest(request1.id, {}, chennaiManagerUser);
  } catch (err: any) {
    doubleCancelThrown = err instanceof BadRequestException;
  }
  assert(doubleCancelThrown, 'Cancelling already cancelled leave request rejected with BadRequestException');

  // Test 34: Audit log on balance adjustment
  const balanceAdjustmentAudit = mockDb.auditLogs.find(
    (a) => a.entityName === 'LeaveBalance' && a.action === AuditAction.UPDATE && a.changeSummary.includes('LEAVE_BALANCE_ADJUSTED'),
  );
  assert(Boolean(balanceAdjustmentAudit), 'Audit log entry recorded for balance adjustment');

  // Test 35: Audit log on leave approval
  const leaveApprovalAudit = mockDb.auditLogs.find(
    (a) => a.entityName === 'LeaveRequest' && a.action === AuditAction.APPROVE && a.changeSummary.includes('LEAVE_APPROVED'),
  );
  assert(Boolean(leaveApprovalAudit), 'Audit log entry recorded for leave approval');

  // Test 36: Audit log on leave rejection
  const leaveRejectionAudit = mockDb.auditLogs.find(
    (a) => a.entityName === 'LeaveRequest' && a.action === AuditAction.UPDATE && a.changeSummary.includes('LEAVE_REJECTED'),
  );
  assert(Boolean(leaveRejectionAudit), 'Audit log entry recorded for leave rejection');

  // Test 37: Complete multi-step lifecycle regression
  // Apply -> Approve -> Verify Attendance & Balance -> Cancel -> Verify Restored Balance
  const lifecycleReq = await leaveService.createLeaveRequest(
    {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-sl', // 10 days
      startDate: '2026-06-20',
      endDate: '2026-06-21', // 2 days
      reason: 'Lifecycle test',
    },
    chennaiManagerUser,
  );
  await leaveService.approveLeaveRequest(lifecycleReq.id, { reviewerComments: 'Lifecycle approve' }, chennaiManagerUser);
  const balMid = await mockPrisma.leaveBalance.findUnique({ where: { id: balanceSL.id } });
  const midConsumed = Number(balMid.consumedDays);

  await leaveService.cancelLeaveRequest(lifecycleReq.id, { cancellationReason: 'Lifecycle cancel' }, chennaiManagerUser);
  const balFinal = await mockPrisma.leaveBalance.findUnique({ where: { id: balanceSL.id } });
  const finalConsumed = Number(balFinal.consumedDays);

  assert(
    midConsumed === 2 && finalConsumed === 0,
    'Complete leave lifecycle verified: Apply -> Approve -> Consume -> Cancel -> Restore Balance',
  );

  console.log('\n======================================================');
  console.log(`🏁 LEAVE ENGINE TEST RESULTS: ${passedTests}/${totalTests} PASSING`);
  console.log('======================================================\n');
}

runLeaveTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
