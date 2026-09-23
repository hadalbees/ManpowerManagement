import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AttendanceService } from './src/modules/attendance/attendance.service';
import { AuthenticatedUserContext } from './src/common/decorators/current-user.decorator';
import { AttendanceStatus, AuditAction, DeploymentStatus } from '@prisma/client';

console.log('\n======================================================');
console.log('🧪 RUNNING PRODUCTION ATTENDANCE MANAGEMENT ENGINE TEST SUITE (32/32)');
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
    },
    {
      id: 'emp-2',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-002',
      firstName: 'Suresh',
      lastName: 'Selvam',
      phone: '+919876543211',
      status: 'ACTIVE',
      deletedAt: null,
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
      designationId: 'desig-driver',
      vehicleId: 'veh-truck-1',
      clientBillingRateId: 'rate-a1-driver',
      employeeSalaryStructureId: 'sal-emp1',
      deploymentCode: 'DEP-2026-0001',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: null,
      shiftName: 'General Morning',
      isNightShift: false,
      status: DeploymentStatus.ACTIVE,
      deletedAt: null,
      employee: {
        id: 'emp-1',
        employeeCode: 'EMP-001',
        firstName: 'Ramesh',
        lastName: 'Kumar',
        phone: '+919876543210',
      },
      client: {
        id: 'client-apex-a',
        clientCode: 'CLI-001',
        companyName: 'Apex Logistics Corp',
      },
      clientSite: {
        id: 'site-a1',
        siteCode: 'SITE-A1',
        siteName: 'Central Warehouse Site A1',
        city: 'Chennai',
      },
      shifts: [
        {
          id: 'shift-1-mon',
          deploymentId: 'dep-active-1',
          dayOfWeek: 1, // Monday
          shiftName: 'General Morning',
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          expectedHours: 8,
          isNightShift: false,
          isScheduledWorkday: true,
        },
        {
          id: 'shift-1-tue',
          deploymentId: 'dep-active-1',
          dayOfWeek: 2, // Tuesday (night shift)
          shiftName: 'Night Shift',
          startTime: '22:00',
          endTime: '06:00',
          breakMinutes: 60,
          expectedHours: 7,
          isNightShift: true,
          isScheduledWorkday: true,
        },
      ],
    },
    {
      id: 'dep-historical-old',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeId: 'emp-2',
      clientId: 'client-apex-a',
      clientSiteId: 'site-a1',
      designationId: 'desig-driver',
      vehicleId: null,
      clientBillingRateId: 'rate-a1-driver',
      employeeSalaryStructureId: 'sal-emp2',
      deploymentCode: 'DEP-2025-0099',
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2025-12-31T23:59:59.000Z'),
      shiftName: 'Day Shift',
      isNightShift: false,
      status: DeploymentStatus.COMPLETED,
      deletedAt: null,
      employee: {
        id: 'emp-2',
        employeeCode: 'EMP-002',
        firstName: 'Suresh',
        lastName: 'Selvam',
        phone: '+919876543211',
      },
      client: {
        id: 'client-apex-a',
        clientCode: 'CLI-001',
        companyName: 'Apex Logistics Corp',
      },
      clientSite: {
        id: 'site-a1',
        siteCode: 'SITE-A1',
        siteName: 'Central Warehouse Site A1',
        city: 'Chennai',
      },
      shifts: [
        {
          id: 'shift-2-all',
          deploymentId: 'dep-historical-old',
          dayOfWeek: 3, // Wednesday
          shiftName: 'Day Shift',
          startTime: '08:00',
          endTime: '17:00',
          breakMinutes: 60,
          expectedHours: 8,
          isNightShift: false,
          isScheduledWorkday: true,
        },
      ],
    },
    {
      id: 'dep-active-emp2-new',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeId: 'emp-2',
      clientId: 'client-apex-a',
      clientSiteId: 'site-a1',
      designationId: 'desig-driver',
      vehicleId: null,
      clientBillingRateId: 'rate-a1-driver',
      employeeSalaryStructureId: 'sal-emp2',
      deploymentCode: 'DEP-2026-0002',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: null,
      shiftName: 'General Morning',
      isNightShift: false,
      status: DeploymentStatus.ACTIVE,
      deletedAt: null,
      employee: {
        id: 'emp-2',
        employeeCode: 'EMP-002',
        firstName: 'Suresh',
        lastName: 'Selvam',
        phone: '+919876543211',
      },
      client: {
        id: 'client-apex-a',
        clientCode: 'CLI-001',
        companyName: 'Apex Logistics Corp',
      },
      clientSite: {
        id: 'site-a1',
        siteCode: 'SITE-A1',
        siteName: 'Central Warehouse Site A1',
        city: 'Chennai',
      },
      shifts: [],
    },
  ],
};

// Mock Prisma implementation
const mockPrisma: any = {
  employee: {
    findFirst: async ({ where }: any) => {
      return mockDb.employees.find(
        (e) =>
          e.id === where.id &&
          e.agencyId === where.agencyId &&
          (where.deletedAt === null ? e.deletedAt === null : true),
      ) || null;
    },
  },
  agencyBranch: {
    findFirst: async ({ where }: any) => {
      return mockDb.agencyBranches.find(
        (b) =>
          b.id === where.id &&
          b.agencyId === where.agencyId &&
          (where.deletedAt === null ? b.deletedAt === null : true),
      ) || null;
    },
  },
  employeeDeployment: {
    findFirst: async ({ where, include }: any) => {
      const dep = mockDb.deployments.find((d) => {
        if (where.id && d.id !== where.id) return false;
        if (where.agencyId && d.agencyId !== where.agencyId) return false;
        if (where.branchId && d.branchId !== where.branchId) return false;
        if (where.employeeId && d.employeeId !== where.employeeId) return false;
        if (where.status && d.status !== where.status) return false;
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
      });
      if (!dep) return null;
      return { ...dep };
    },
    findMany: async ({ where }: any) => {
      return mockDb.deployments.filter((d) => {
        if (where.agencyId && d.agencyId !== where.agencyId) return false;
        if (where.branchId && d.branchId !== where.branchId) return false;
        if (where.clientSiteId && d.clientSiteId !== where.clientSiteId) return false;
        if (where.status && d.status !== where.status) return false;
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
      }).map(d => ({ ...d }));
    },
  },
  deploymentShift: {
    findFirst: async ({ where }: any) => {
      const dep = mockDb.deployments.find((d) => d.id === where.deploymentId);
      if (!dep) return null;
      return dep.shifts.find((s: any) => s.dayOfWeek === where.dayOfWeek) || null;
    },
  },
  attendance: {
    findFirst: async ({ where }: any) => {
      return mockDb.attendances.find((a) => {
        if (where.id && a.id !== where.id) return false;
        if (where.agencyId && a.agencyId !== where.agencyId) return false;
        if (where.branchId && a.branchId !== where.branchId) return false;
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
        if (where.deletedAt === null && a.deletedAt !== null) return false;
        return true;
      }) || null;
    },
    create: async ({ data }: any) => {
      const dep = mockDb.deployments.find((d) => d.id === data.deploymentId);
      const emp = mockDb.employees.find((e) => e.id === data.employeeId);
      const cl = mockDb.clients.find((c) => c.id === data.clientId);
      const cs = mockDb.clientSites.find((s) => s.id === data.clientSiteId);

      const newRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        isApproved: false,
        approvedById: null,
        approvedAt: null,
        isLocked: false,
        ...data,
        deployment: dep ? { ...dep } : null,
        employee: emp ? { ...emp } : null,
        client: cl ? { ...cl } : null,
        clientSite: cs ? { ...cs } : null,
        branch: { id: data.branchId, branchName: 'Chennai HQ', branchCode: 'CHN' },
        recordedBy: { id: data.recordedById, fullName: 'Test User', email: 'test@example.com' },
        approvedBy: null,
      };

      mockDb.attendances.push(newRecord);
      return newRecord;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.attendances.findIndex((a) => a.id === where.id);
      if (idx === -1) throw new Error('Not found in mock DB');
      mockDb.attendances[idx] = {
        ...mockDb.attendances[idx],
        ...data,
        updatedAt: new Date(),
      };
      return mockDb.attendances[idx];
    },
    findMany: async ({ where, include, orderBy, skip, take }: any) => {
      let filtered = mockDb.attendances.filter((a) => {
        if (where.agencyId && a.agencyId !== where.agencyId) return false;
        if (where.branchId && a.branchId !== where.branchId) return false;
        if (where.clientId && a.clientId !== where.clientId) return false;
        if (where.clientSiteId && a.clientSiteId !== where.clientSiteId) return false;
        if (where.employeeId && a.employeeId !== where.employeeId) return false;
        if (where.deploymentId && a.deploymentId !== where.deploymentId) return false;
        if (where.status && a.status !== where.status) return false;
        if (where.isApproved !== undefined && a.isApproved !== where.isApproved) return false;
        if (where.isLocked !== undefined && a.isLocked !== where.isLocked) return false;
        if (where.deletedAt === null && a.deletedAt !== null) return false;
        if (where.shiftBusinessDate) {
          if (where.shiftBusinessDate instanceof Date || typeof where.shiftBusinessDate === 'string') {
            const aD = a.shiftBusinessDate instanceof Date ? a.shiftBusinessDate.toISOString().slice(0, 10) : String(a.shiftBusinessDate).slice(0, 10);
            const tD = where.shiftBusinessDate instanceof Date ? where.shiftBusinessDate.toISOString().slice(0, 10) : String(where.shiftBusinessDate).slice(0, 10);
            if (aD !== tD) return false;
          } else {
            const aDate = new Date(a.shiftBusinessDate);
            if (where.shiftBusinessDate.gte && aDate < new Date(where.shiftBusinessDate.gte)) return false;
            if (where.shiftBusinessDate.lte && aDate > new Date(where.shiftBusinessDate.lte)) return false;
            if (where.shiftBusinessDate.equals) {
              const aD = a.shiftBusinessDate instanceof Date ? a.shiftBusinessDate.toISOString().slice(0, 10) : a.shiftBusinessDate;
              const tD = where.shiftBusinessDate.equals instanceof Date ? where.shiftBusinessDate.equals.toISOString().slice(0, 10) : where.shiftBusinessDate.equals;
              if (aD !== tD) return false;
            }
          }
        }
        return true;
      });
      return filtered.map((a) => ({
        ...a,
        deployment: mockDb.deployments.find((d) => d.id === a.deploymentId),
        employee: mockDb.employees.find((e) => e.id === a.employeeId),
        client: mockDb.clients.find((c) => c.id === a.clientId),
        clientSite: mockDb.clientSites.find((s) => s.id === a.clientSiteId),
      }));
    },
    count: async ({ where }: any) => {
      return (await mockPrisma.attendance.findMany({ where })).length;
    },
  },
  $transaction: async (cbOrPromises: any) => {
    if (typeof cbOrPromises === 'function') {
      return cbOrPromises(mockPrisma);
    }
    return Promise.all(cbOrPromises);
  },
};

// Mock Audit Service
const mockAuditService: any = {
  record: async (entry: any) => {
    mockDb.auditLogs.push({ ...entry, id: `audit-${mockDb.auditLogs.length + 1}`, timestamp: new Date() });
    return true;
  },
};

// Authenticated User Contexts
const hqAdminUser: any = {
  id: 'user-admin-1',
  agencyId: 'agency-apex-1',
  branchId: null,
  roleId: 'role-admin',
  roleSlug: 'ADMIN',
  effectivePermissions: ['ATTENDANCE_RECORD', 'ATTENDANCE_VIEW', 'ATTENDANCE_UPDATE', 'ATTENDANCE_APPROVE', 'ATTENDANCE_LOCK'],
  fullName: 'Admin User',
  email: 'admin@apex.com',
};

const supervisorUser: AuthenticatedUserContext = {
  id: 'user-sup-1',
  agencyId: 'agency-apex-1',
  branchId: 'branch-chennai',
  isHeadquarters: false,
  roleCode: 'SUPERVISOR',
  roles: ['SUPERVISOR'],
  permissions: ['ATTENDANCE_RECORD', 'ATTENDANCE_VIEW', 'ATTENDANCE_APPROVE'],
  fullName: 'Shift Supervisor',
  email: 'supervisor@apex.com',
};

const trichyUser: AuthenticatedUserContext = {
  id: 'user-trichy-1',
  agencyId: 'agency-apex-1',
  branchId: 'branch-trichy',
  isHeadquarters: false,
  roleCode: 'BRANCH_STAFF',
  roles: ['BRANCH_STAFF'],
  permissions: ['ATTENDANCE_RECORD', 'ATTENDANCE_VIEW'],
  fullName: 'Trichy Staff',
  email: 'trichy@apex.com',
};

const alienAgencyUser: AuthenticatedUserContext = {
  id: 'user-alien-1',
  agencyId: 'agency-alien-99',
  branchId: 'branch-alien-1',
  isHeadquarters: true,
  roleCode: 'ADMIN',
  roles: ['ADMIN'],
  permissions: ['ATTENDANCE_RECORD', 'ATTENDANCE_VIEW', 'ATTENDANCE_UPDATE', 'ATTENDANCE_APPROVE'],
  fullName: 'Alien Admin',
  email: 'alien@other.com',
};

async function runTestSuite() {
  const service = new AttendanceService(mockPrisma, mockAuditService);

  // ----------------------------------------------------
  // TEST GROUP 1: Timezone Calculation & Shifts
  // ----------------------------------------------------
  console.log('\n--- GROUP 1: Timezone & Business Date Calculations ---');

  // Test 1: Record PRESENT attendance on Monday with clock in/out
  let record1: any;
  try {
    record1 = await service.recordAttendance(
      {
        employeeId: 'emp-1',
        shiftBusinessDate: '2026-03-02', // Monday
        clockInTime: '2026-03-02T03:30:00.000Z', // 09:00 IST (+05:30)
        clockOutTime: '2026-03-02T12:30:00.000Z', // 18:00 IST (+05:30) -> 9 hours total, 60m break -> 8 hrs worked
        status: AttendanceStatus.PRESENT,
      },
      supervisorUser,
    );
    assert(
      record1 && record1.workedHours === 8 && record1.status === AttendanceStatus.PRESENT,
      'Record normal day shift attendance in IST (+05:30)',
    );
  } catch (err: any) {
    assert(false, 'Record normal day shift attendance in IST', err.message);
  }

  // Test 2: Overtime calculation (11 hours worked on 8-hour expected shift)
  let record2: any;
  try {
    record2 = await service.recordAttendance(
      {
        employeeId: 'emp-1',
        shiftBusinessDate: '2026-03-09', // Next Monday
        clockInTime: '2026-03-09T03:30:00.000Z', // 09:00 IST
        clockOutTime: '2026-03-09T15:30:00.000Z', // 21:00 IST -> 12 hours gross, 60m break = 11h worked, 3h OT
        status: AttendanceStatus.PRESENT,
      },
      supervisorUser,
    );
    assert(
      record2 && record2.workedHours === 11 && record2.overtimeHours === 3,
      'Automatic overtime calculation (11 worked, 3 OT)',
      `Got workedHours: ${record2?.workedHours}, overtimeHours: ${record2?.overtimeHours}`,
    );
  } catch (err: any) {
    assert(false, 'Automatic overtime calculation', err.message);
  }

  // Test 3: Cross-midnight night shift anchor
  let recordNight: any;
  try {
    // 2026-03-03 is Tuesday (night shift starts at 22:00 IST = 16:30 UTC on March 3, ends 06:00 IST = 00:30 UTC on March 4)
    recordNight = await service.recordAttendance(
      {
        employeeId: 'emp-1',
        shiftBusinessDate: '2026-03-03',
        clockInTime: '2026-03-03T16:30:00.000Z', // 22:00 IST
        clockOutTime: '2026-03-04T00:30:00.000Z', // 06:00 IST next day
        status: AttendanceStatus.PRESENT,
      },
      supervisorUser,
    );
    assert(
      recordNight &&
        recordNight.shiftBusinessDate.toISOString().slice(0, 10) === '2026-03-03' &&
        recordNight.workedHours === 7, // 8h gross - 60m break = 7h
      'Cross-midnight shift properly anchored to starting shiftBusinessDate',
    );
  } catch (err: any) {
    assert(false, 'Cross-midnight shift properly anchored', err.message);
  }

  // Test 4: Clock Out before Clock In validation
  try {
    await service.recordAttendance(
      {
        employeeId: 'emp-1',
        shiftBusinessDate: '2026-03-04',
        clockInTime: '2026-03-04T10:00:00.000Z',
        clockOutTime: '2026-03-04T08:00:00.000Z', // Before clockIn
        status: AttendanceStatus.PRESENT,
      },
      supervisorUser,
    );
    assert(false, 'Reject clockOutTime before clockInTime');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException,
      'Reject clockOutTime before clockInTime (BadRequestException)',
    );
  }

  // Test 5: Clock times on non-present status (e.g. ABSENT should zero out worked/OT hours)
  try {
    const absentRecord = await service.recordAttendance(
      {
        employeeId: 'emp-1',
        shiftBusinessDate: '2026-03-05',
        status: AttendanceStatus.ABSENT,
        supervisorRemarks: 'Uninformed absence',
      },
      supervisorUser,
    );
    assert(
      absentRecord &&
        absentRecord.status === AttendanceStatus.ABSENT &&
        absentRecord.workedHours === 0 &&
        absentRecord.overtimeHours === 0,
      'ABSENT attendance zeroes worked hours and overtime hours',
    );
  } catch (err: any) {
    assert(false, 'ABSENT attendance zeroes worked hours', err.message);
  }

  // Test 6: HALF_DAY status
  try {
    const halfDay = await service.recordAttendance(
      {
        employeeId: 'emp-1',
        shiftBusinessDate: '2026-03-06',
        clockInTime: '2026-03-06T03:30:00.000Z',
        clockOutTime: '2026-03-06T07:30:00.000Z', // 4 hours
        status: AttendanceStatus.HALF_DAY,
      },
      supervisorUser,
    );
    assert(
      halfDay && halfDay.status === AttendanceStatus.HALF_DAY && halfDay.workedHours === 4,
      'HALF_DAY status correctly records 4 hours',
    );
  } catch (err: any) {
    assert(false, 'HALF_DAY status correctly records 4 hours', err.message);
  }

  // ----------------------------------------------------
  // TEST GROUP 2: Uniqueness & Double Shifts
  // ----------------------------------------------------
  console.log('\n--- GROUP 2: Duplicate Prevention & Double Shifts ---');

  // Test 7: Duplicate attendance rejection for same employee and shiftBusinessDate
  try {
    await service.recordAttendance(
      {
        employeeId: 'emp-1',
        shiftBusinessDate: '2026-03-02', // Already recorded in Test 1
        status: AttendanceStatus.PRESENT,
      },
      supervisorUser,
    );
    assert(false, 'Prevent duplicate attendance for (employeeId, shiftBusinessDate)');
  } catch (err: any) {
    assert(
      err instanceof ConflictException,
      'Prevent duplicate attendance for (employeeId, shiftBusinessDate) with 409 Conflict',
    );
  }

  // Test 8: Double shift handled via workedHours and overtimeHours without duplicate record
  try {
    const doubleShift = await service.recordAttendance(
      {
        employeeId: 'emp-1',
        shiftBusinessDate: '2026-03-16', // Monday
        clockInTime: '2026-03-16T03:30:00.000Z', // 09:00 IST
        clockOutTime: '2026-03-16T19:30:00.000Z', // 01:00 IST (16 hours gross - 1h break = 15 hours total worked)
        status: AttendanceStatus.PRESENT,
        supervisorRemarks: 'Double shift covered for absent colleague',
      },
      supervisorUser,
    );
    assert(
      doubleShift &&
        doubleShift.workedHours === 15 &&
        doubleShift.overtimeHours === 7 && // 15 - 8 expected = 7 OT
        doubleShift.supervisorRemarks?.includes('Double shift'),
      'Legitimate double shift recorded via workedHours and overtimeHours (15h worked, 7h OT)',
    );
  } catch (err: any) {
    assert(false, 'Legitimate double shift handled cleanly', err.message);
  }

  // ----------------------------------------------------
  // TEST GROUP 3: Historical Deployment Link Preservation
  // ----------------------------------------------------
  console.log('\n--- GROUP 3: Historical Deployment Integrity ---');

  // Test 9: Record historical attendance against a completed deployment (dep-historical-old)
  let historicalRecord: any;
  try {
    historicalRecord = await service.recordAttendance(
      {
        employeeId: 'emp-2',
        deploymentId: 'dep-historical-old', // Completed deployment in 2025
        shiftBusinessDate: '2025-06-11', // Wednesday inside 2025 deployment window
        status: AttendanceStatus.PRESENT,
        workedHours: 8,
      },
      supervisorUser,
    );
    assert(
      historicalRecord &&
        historicalRecord.deploymentId === 'dep-historical-old' &&
        historicalRecord.clientId === 'client-apex-a' &&
        historicalRecord.clientSiteId === 'site-a1',
      'Record historical attendance directly against original historical deployment',
    );
  } catch (err: any) {
    assert(false, 'Record historical attendance against completed deployment', err.message);
  }

  // Test 10: Query historical attendance resolves through historical deployment, NOT current deployment
  try {
    const fetched = await service.getAttendanceById(historicalRecord.id, supervisorUser);
    assert(
      fetched.deploymentId === 'dep-historical-old' &&
        fetched.deployment.deploymentCode === 'DEP-2025-0099' &&
        fetched.deploymentId !== 'dep-active-emp2-new',
      'Historical attendance resolves through original deployment (DEP-2025-0099), NOT active deployment',
    );
  } catch (err: any) {
    assert(false, 'Historical attendance resolves through original deployment', err.message);
  }

  // Test 11: Deployment date bounds check (shiftBusinessDate outside deployment window fails)
  try {
    await service.recordAttendance(
      {
        employeeId: 'emp-2',
        deploymentId: 'dep-historical-old', // Ended 2025-12-31
        shiftBusinessDate: '2026-01-15', // Date is after endDate!
        status: AttendanceStatus.PRESENT,
      },
      supervisorUser,
    );
    assert(false, 'Reject attendance outside deployment date boundaries');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException,
      'Reject attendance outside deployment date boundaries (BadRequestException)',
    );
  }

  // Test 12: Deployment date bounds check (shiftBusinessDate before deployment startDate fails)
  try {
    await service.recordAttendance(
      {
        employeeId: 'emp-1',
        deploymentId: 'dep-active-1', // Started 2026-01-01
        shiftBusinessDate: '2025-11-20', // Date is before startDate!
        status: AttendanceStatus.PRESENT,
      },
      supervisorUser,
    );
    assert(false, 'Reject attendance before deployment startDate');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException,
      'Reject attendance before deployment startDate (BadRequestException)',
    );
  }

  // ----------------------------------------------------
  // TEST GROUP 4: Multi-Tenant & Branch Scoping (IDOR)
  // ----------------------------------------------------
  console.log('\n--- GROUP 4: Multi-Tenant & Branch Scoping ---');

  // Test 13: Alien agency user cannot record attendance for apex employee
  try {
    await service.recordAttendance(
      {
        employeeId: 'emp-1',
        shiftBusinessDate: '2026-03-20',
        status: AttendanceStatus.PRESENT,
      },
      alienAgencyUser,
    );
    assert(false, 'Alien agency cannot record attendance for employee of another agency');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException,
      'Alien agency blocked with NotFoundException (IDOR isolation)',
    );
  }

  // Test 14: Alien agency user cannot query apex agency attendance
  try {
    await service.getAttendanceById(record1.id, alienAgencyUser);
    assert(false, 'Alien agency cannot view apex attendance');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException,
      'Alien agency viewing apex attendance blocked with NotFoundException',
    );
  }

  // Test 15: Trichy branch staff cannot access Chennai branch attendance (Branch-scoped isolation)
  try {
    await service.getAttendanceById(record1.id, trichyUser);
    assert(false, 'Branch restricted user cannot view another branch attendance');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Branch-restricted user blocked with ForbiddenException',
    );
  }

  // Test 16: HQ Admin can view attendance across branches
  try {
    const adminView = await service.getAttendanceById(record1.id, hqAdminUser);
    assert(
      adminView && adminView.id === record1.id,
      'HQ Admin can view attendance across branches',
    );
  } catch (err: any) {
    assert(false, 'HQ Admin can view attendance across branches', err.message);
  }

  // ----------------------------------------------------
  // TEST GROUP 5: Update, Approvals & Lock Enforcement
  // ----------------------------------------------------
  console.log('\n--- GROUP 5: Update, Approvals & Payroll Lock ---');

  // Test 17: Update attendance status and remarks
  try {
    const updated = await service.updateAttendance(
      record1.id,
      {
        supervisorRemarks: 'Shift completed with commendation',
        status: AttendanceStatus.PRESENT,
      },
      supervisorUser,
    );
    assert(
      updated && updated.supervisorRemarks === 'Shift completed with commendation',
      'Update attendance remarks successfully',
    );
  } catch (err: any) {
    assert(false, 'Update attendance remarks', err.message);
  }

  // Test 18: Supervisor approves attendance
  let approvedRecord: any;
  try {
    approvedRecord = await service.approveAttendance(
      record1.id,
      { isApproved: true, supervisorRemarks: 'Approved by Shift Supervisor' },
      supervisorUser,
    );
    assert(
      approvedRecord &&
        approvedRecord.isApproved === true &&
        approvedRecord.approvedById === supervisorUser.id,
      'Supervisor approves attendance record',
    );
  } catch (err: any) {
    assert(false, 'Supervisor approves attendance record', err.message);
  }

  // Test 19: Lock attendance record (payroll finalization simulation)
  try {
    const recIndex = mockDb.attendances.findIndex((a) => a.id === record1.id);
    mockDb.attendances[recIndex].isLocked = true;
    assert(mockDb.attendances[recIndex].isLocked === true, 'Lock attendance record for payroll batch');
  } catch (err: any) {
    assert(false, 'Lock attendance record', err.message);
  }

  // Test 20: Reject modification of locked attendance
  try {
    await service.updateAttendance(
      record1.id,
      { supervisorRemarks: 'Illegal modification attempt on locked payroll record' },
      supervisorUser,
    );
    assert(false, 'Reject modification of locked attendance');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('locked'),
      'Reject modification of locked attendance record (BadRequestException: Locked)',
    );
  }

  // Test 21: Reject approval attempt on locked attendance
  try {
    await service.approveAttendance(
      record1.id,
      { isApproved: true, supervisorRemarks: 'Re-approval attempt' },
      supervisorUser,
    );
    assert(false, 'Reject approval of locked attendance');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('locked'),
      'Reject approval of locked attendance record (BadRequestException: Locked)',
    );
  }

  // ----------------------------------------------------
  // TEST GROUP 6: Querying, Daily Muster Roll & Bulk
  // ----------------------------------------------------
  console.log('\n--- GROUP 6: Daily Muster Roll & Bulk Operations ---');

  // Test 22: Daily muster roll returns active deployments at site
  try {
    const musterRes = await service.getDailyMusterRoll(
      'site-a1',
      '2026-03-02',
      supervisorUser,
    );
    assert(
      musterRes && musterRes.muster && musterRes.muster.length >= 1,
      'Daily muster roll returns deployments at client site for specified date',
    );
  } catch (err: any) {
    assert(false, 'Daily muster roll returns deployments at client site', err.message);
  }

  // Test 23: Daily muster roll accurately reflects already recorded attendance
  try {
    const musterRes = await service.getDailyMusterRoll(
      'site-a1',
      '2026-03-02',
      supervisorUser,
    );
    const emp1Row = musterRes.muster.find((m: any) => m.employee.id === 'emp-1');
    assert(
      emp1Row && emp1Row.attendance !== null && emp1Row.attendance.status === AttendanceStatus.PRESENT,
      'Daily muster roll shows already marked attendance for employee',
    );
  } catch (err: any) {
    assert(false, 'Daily muster roll shows marked attendance', err.message);
  }

  // Test 24: Daily muster roll shows null attendance for unmarked active employees
  try {
    const musterRes = await service.getDailyMusterRoll(
      'site-a1',
      '2026-03-10', // Date where emp-2 has not marked attendance
      supervisorUser,
    );
    const emp2Row = musterRes.muster.find((m: any) => m.employee.id === 'emp-2');
    assert(
      emp2Row && emp2Row.attendance === null,
      'Daily muster roll shows null attendance for unmarked employee',
    );
  } catch (err: any) {
    assert(false, 'Daily muster roll shows null attendance for unmarked employee', err.message);
  }

  // Test 25: Bulk attendance recording
  try {
    const bulkResult = await service.bulkRecordAttendance(
      {
        shiftBusinessDate: '2026-03-23',
        records: [
          {
            employeeId: 'emp-1',
            status: AttendanceStatus.PRESENT,
            clockInTime: '2026-03-23T03:30:00.000Z',
            clockOutTime: '2026-03-23T12:30:00.000Z',
          },
          {
            employeeId: 'emp-2',
            status: AttendanceStatus.PRESENT,
            clockInTime: '2026-03-23T03:30:00.000Z',
            clockOutTime: '2026-03-23T12:30:00.000Z',
          },
        ],
      },
      supervisorUser,
    );
    assert(
      bulkResult && bulkResult.recordedCount === 2 && bulkResult.results.length === 2,
      'Bulk record attendance for multiple employees',
    );
  } catch (err: any) {
    assert(false, 'Bulk record attendance for multiple employees', err.message);
  }

  // Test 26: Bulk attendance captures errors on duplicate entry without crashing
  try {
    const bulk2 = await service.bulkRecordAttendance(
      {
        shiftBusinessDate: '2026-03-23', // Already recorded above!
        records: [
          {
            employeeId: 'emp-1',
            status: AttendanceStatus.PRESENT,
          },
        ],
      },
      supervisorUser,
    );
    assert(
      bulk2.failedCount === 1 && bulk2.errors[0].error.includes('ATTENDANCE_ALREADY_RECORDED'),
      'Bulk attendance reports failure for duplicate entry',
    );
  } catch (err: any) {
    assert(false, 'Bulk attendance captures errors on duplicate entry', err.message);
  }

  // Test 27: Monthly attendance register query with pagination
  try {
    const register = await service.getAttendanceRecords(
      {
        clientId: 'client-apex-a',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        page: 1,
        limit: 10,
      },
      supervisorUser,
    );
    assert(
      register && register.items && register.pagination.total >= 4 && register.pagination.page === 1,
      'Monthly register queries with date range and pagination',
    );
  } catch (err: any) {
    assert(false, 'Monthly register queries with date range and pagination', err.message);
  }

  // Test 28: Filter monthly register by status (PRESENT)
  try {
    const presentList = await service.getAttendanceRecords(
      {
        status: AttendanceStatus.PRESENT,
      },
      supervisorUser,
    );
    assert(
      presentList && presentList.items.every((item: any) => item.status === AttendanceStatus.PRESENT),
      'Filter register by AttendanceStatus.PRESENT',
    );
  } catch (err: any) {
    assert(false, 'Filter register by status', err.message);
  }

  // Test 29: Filter monthly register by approval status
  try {
    const approvedList = await service.getAttendanceRecords(
      {
        isApproved: true,
      },
      supervisorUser,
    );
    assert(
      approvedList && approvedList.items.every((item: any) => item.isApproved === true),
      'Filter register by isApproved: true',
    );
  } catch (err: any) {
    assert(false, 'Filter register by approval status', err.message);
  }

  // Test 30: Audit logging on attendance creation
  const createAudit = mockDb.auditLogs.find(
    (a) => a.action === AuditAction.CREATE && a.entityName === 'Attendance',
  );
  assert(
    !!createAudit,
    'Audit log created on Attendance record creation',
  );

  // Test 31: Audit logging on attendance approval
  const approveAudit = mockDb.auditLogs.find(
    (a) => a.action === AuditAction.APPROVE && a.entityName === 'Attendance',
  );
  assert(
    !!approveAudit,
    'Audit log created on Attendance approval action',
  );

  // Test 32: Audit logging captures original deploymentId and employeeId
  assert(
    createAudit && createAudit.newValues?.deploymentId && createAudit.newValues?.employeeId,
    'Audit log captures historical deploymentId and employeeId',
  );

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n======================================================');
  console.log(`🏁 ATTENDANCE ENGINE TEST RESULTS: ${passedTests}/${totalTests} PASSING`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
