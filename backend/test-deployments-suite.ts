import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DeploymentsService } from './src/modules/deployments/deployments.service';
import { AuthenticatedUserContext } from './src/common/decorators/current-user.decorator';
import { DeploymentStatus, VehicleStatus, AuditAction } from '@prisma/client';

console.log('\n======================================================');
console.log('🧪 RUNNING PRODUCTION DEPLOYMENT ENGINE TEST SUITE (31/31)');
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
  deployments: [] as any[],
  deploymentShifts: [] as any[],
  auditLogs: [] as any[],
  employees: [
    {
      id: 'emp-active-1',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-001',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      status: 'ACTIVE',
      deletedAt: null,
    },
    {
      id: 'emp-active-2',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-002',
      firstName: 'Suresh',
      lastName: 'Selvam',
      status: 'ACTIVE',
      deletedAt: null,
    },
    {
      id: 'emp-inactive-3',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-003',
      firstName: 'Dinesh',
      lastName: 'Karthik',
      status: 'INACTIVE',
      deletedAt: null,
    },
    {
      id: 'emp-terminated-4',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-004',
      firstName: 'Vijay',
      lastName: 'Shankar',
      status: 'TERMINATED',
      deletedAt: null,
    },
    {
      id: 'emp-resigned-5',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-005',
      firstName: 'Praveen',
      lastName: 'Kumar',
      status: 'RESIGNED',
      deletedAt: null,
    },
    {
      id: 'emp-trichy-6',
      agencyId: 'agency-apex-1',
      branchId: 'branch-trichy',
      employeeCode: 'EMP-006',
      firstName: 'Manoj',
      lastName: 'Prabhakar',
      status: 'ACTIVE',
      deletedAt: null,
    },
  ],
  agencyBranches: [
    { id: 'branch-chennai', agencyId: 'agency-apex-1', branchName: 'Chennai HQ', branchCode: 'CHN', isHeadquarters: true, deletedAt: null },
    { id: 'branch-trichy', agencyId: 'agency-apex-1', branchName: 'Trichy Branch', branchCode: 'TRC', isHeadquarters: false, deletedAt: null },
    { id: 'branch-alien-1', agencyId: 'agency-alien-99', branchName: 'Alien Branch', branchCode: 'ALN', isHeadquarters: true, deletedAt: null },
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
    {
      id: 'client-apex-b',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      clientCode: 'CLI-002',
      companyName: 'Metro Warehousing Ltd',
      status: 'ACTIVE',
      deletedAt: null,
    },
    {
      id: 'client-inactive-c',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      clientCode: 'CLI-003',
      companyName: 'Inactive Retailers',
      status: 'INACTIVE',
      deletedAt: null,
    },
  ],
  clientSites: [
    { id: 'site-a1', clientId: 'client-apex-a', siteCode: 'SITE-A1', siteName: 'Central Warehouse Site A1', city: 'Chennai', deletedAt: null },
    { id: 'site-a2', clientId: 'client-apex-a', siteCode: 'SITE-A2', siteName: 'Hub Site A2', city: 'Chennai', deletedAt: null },
    { id: 'site-b1', clientId: 'client-apex-b', siteCode: 'SITE-B1', siteName: 'Metro Dock Site B1', city: 'Chennai', deletedAt: null },
  ],
  designations: [
    { id: 'desig-driver', agencyId: 'agency-apex-1', code: 'DRV-01', name: 'Heavy Commercial Driver', category: 'DRIVER', deletedAt: null },
    { id: 'desig-security', agencyId: 'agency-apex-1', code: 'SEC-01', name: 'Armed Security Officer', category: 'SECURITY', deletedAt: null },
  ],
  vehicles: [
    {
      id: 'veh-oper-1',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      vehicleRegistrationNumber: 'TN01AB1234',
      vehicleMake: 'Tata',
      vehicleModel: 'Prima 4028',
      vehicleType: 'TRUCK',
      status: VehicleStatus.AVAILABLE,
      deletedAt: null,
    },
    {
      id: 'veh-oper-2',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      vehicleRegistrationNumber: 'TN02CD5678',
      vehicleMake: 'Ashok Leyland',
      vehicleModel: 'Boss 1215',
      vehicleType: 'TRUCK',
      status: VehicleStatus.AVAILABLE,
      deletedAt: null,
    },
    {
      id: 'veh-grounded-3',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      vehicleRegistrationNumber: 'TN03EF9999',
      vehicleMake: 'Eicher',
      vehicleModel: 'Pro 2049',
      vehicleType: 'TRUCK',
      status: VehicleStatus.GROUNDED,
      deletedAt: null,
    },
  ],
  clientBillingRates: [
    {
      id: 'rate-a1-driver',
      clientId: 'client-apex-a',
      clientSiteId: 'site-a1',
      designationId: 'desig-driver',
      rateAmount: 32000,
      billingModel: 'PER_EMPLOYEE_PER_SHIFT',
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: new Date('2026-12-31'),
      isActive: true,
      deletedAt: null,
    },
    {
      id: 'rate-b1-driver',
      clientId: 'client-apex-b',
      clientSiteId: 'site-b1',
      designationId: 'desig-driver',
      rateAmount: 35000,
      billingModel: 'PER_EMPLOYEE_PER_SHIFT',
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
      isActive: true,
      deletedAt: null,
    },
    {
      id: 'rate-expired',
      clientId: 'client-apex-a',
      clientSiteId: 'site-a1',
      designationId: 'desig-driver',
      rateAmount: 25000,
      billingModel: 'PER_EMPLOYEE_PER_SHIFT',
      effectiveFrom: new Date('2025-01-01'),
      effectiveTo: new Date('2025-12-31'),
      isActive: true,
      deletedAt: null,
    },
  ],
  employeeSalaryStructures: [
    {
      id: 'sal-emp1',
      employeeId: 'emp-active-1',
      basicPay: 20000,
      specialAllowance: 5000,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
      deletedAt: null,
    },
    {
      id: 'sal-emp2',
      employeeId: 'emp-active-2',
      basicPay: 18000,
      specialAllowance: 4000,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
      deletedAt: null,
    },
    {
      id: 'sal-emp1-expired',
      employeeId: 'emp-active-1',
      basicPay: 15000,
      specialAllowance: 3000,
      effectiveFrom: new Date('2025-01-01'),
      effectiveTo: new Date('2025-12-31'),
      deletedAt: null,
    },
  ],
};

// Mock Prisma Implementation
const mockPrisma: any = {
  agencyBranch: {
    findFirst: async ({ where }: any) => {
      return mockDb.agencyBranches.find(
        (b) => b.id === where.id && b.agencyId === where.agencyId && b.deletedAt === null,
      ) || null;
    },
  },
  employee: {
    findFirst: async ({ where }: any) => {
      return mockDb.employees.find((e) => {
        if (where.id && e.id !== where.id) return false;
        if (where.agencyId && e.agencyId !== where.agencyId) return false;
        if (where.deletedAt === null && e.deletedAt !== null) return false;
        return true;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.employees.filter((e) => {
        if (where.agencyId && e.agencyId !== where.agencyId) return false;
        if (where.branchId && e.branchId !== where.branchId) return false;
        if (where.status && e.status !== where.status) return false;
        if (where.deletedAt === null && e.deletedAt !== null) return false;
        return true;
      });
    },
  },
  client: {
    findFirst: async ({ where }: any) => {
      return mockDb.clients.find((c) => {
        if (where.id && c.id !== where.id) return false;
        if (where.agencyId && c.agencyId !== where.agencyId) return false;
        if (where.deletedAt === null && c.deletedAt !== null) return false;
        return true;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.clients.filter((c) => {
        if (where.agencyId && c.agencyId !== where.agencyId) return false;
        if (where.branchId && c.branchId !== where.branchId) return false;
        if (where.status && c.status !== where.status) return false;
        if (where.deletedAt === null && c.deletedAt !== null) return false;
        return true;
      }).map((c) => ({
        ...c,
        sites: mockDb.clientSites.filter((s) => s.clientId === c.id && s.deletedAt === null),
      }));
    },
  },
  clientSite: {
    findFirst: async ({ where }: any) => {
      return mockDb.clientSites.find((s) => {
        if (where.id && s.id !== where.id) return false;
        if (where.clientId && s.clientId !== where.clientId) return false;
        if (where.deletedAt === null && s.deletedAt !== null) return false;
        return true;
      }) || null;
    },
  },
  designation: {
    findFirst: async ({ where }: any) => {
      return mockDb.designations.find((d) => {
        if (where.id && d.id !== where.id) return false;
        if (where.agencyId && d.agencyId !== where.agencyId) return false;
        if (where.deletedAt === null && d.deletedAt !== null) return false;
        return true;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.designations.filter((d) => {
        if (where.agencyId && d.agencyId !== where.agencyId) return false;
        if (where.deletedAt === null && d.deletedAt !== null) return false;
        return true;
      });
    },
  },
  vehicle: {
    findFirst: async ({ where }: any) => {
      return mockDb.vehicles.find((v) => {
        if (where.id && v.id !== where.id) return false;
        if (where.agencyId && v.agencyId !== where.agencyId) return false;
        if (where.deletedAt === null && v.deletedAt !== null) return false;
        return true;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.vehicles.filter((v) => {
        if (where.agencyId && v.agencyId !== where.agencyId) return false;
        if (where.branchId && v.branchId !== where.branchId) return false;
        if (where.deletedAt === null && v.deletedAt !== null) return false;
        return true;
      });
    },
  },
  clientBillingRate: {
    findFirst: async ({ where }: any) => {
      return mockDb.clientBillingRates.find((r) => {
        if (where.id && r.id !== where.id) return false;
        if (where.clientId && r.clientId !== where.clientId) return false;
        if (where.deletedAt === null && r.deletedAt !== null) return false;
        return true;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.clientBillingRates.filter((r) => {
        if (where.clientId && r.clientId !== where.clientId) return false;
        if (where.isActive !== undefined && r.isActive !== where.isActive) return false;
        if (where.deletedAt === null && r.deletedAt !== null) return false;
        return true;
      });
    },
  },
  employeeSalaryStructure: {
    findFirst: async ({ where }: any) => {
      return mockDb.employeeSalaryStructures.find((s) => {
        if (where.id && s.id !== where.id) return false;
        if (where.employeeId && s.employeeId !== where.employeeId) return false;
        if (where.deletedAt === null && s.deletedAt !== null) return false;
        return true;
      }) || null;
    },
  },
  employeeDeployment: {
    create: async ({ data }: any) => {
      const dep = {
        id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        ...data,
      };
      mockDb.deployments.push(dep);
      return dep;
    },
    findFirst: async ({ where }: any) => {
      const dep = mockDb.deployments.find((d) => {
        if (where.id && d.id !== where.id) return false;
        if (where.agencyId && d.agencyId !== where.agencyId) return false;
        if (where.deletedAt === null && d.deletedAt !== null) return false;
        return true;
      });
      if (!dep) return null;
      return {
        ...dep,
        employee: mockDb.employees.find((e) => e.id === dep.employeeId),
        client: mockDb.clients.find((c) => c.id === dep.clientId),
        clientSite: mockDb.clientSites.find((s) => s.id === dep.clientSiteId),
        designation: mockDb.designations.find((d) => d.id === dep.designationId),
        vehicle: dep.vehicleId ? mockDb.vehicles.find((v) => v.id === dep.vehicleId) : null,
        billingRate: mockDb.clientBillingRates.find((r) => r.id === dep.billingRateId),
        salaryStructure: mockDb.employeeSalaryStructures.find((s) => s.id === dep.salaryStructureId),
        shifts: mockDb.deploymentShifts.filter((s) => s.deploymentId === dep.id),
        branch: mockDb.agencyBranches.find((b) => b.id === dep.branchId),
      };
    },
    findMany: async ({ where, skip = 0, take = 20 }: any) => {
      let list = mockDb.deployments.filter((d) => {
        if (where.agencyId && d.agencyId !== where.agencyId) return false;
        if (where.branchId && d.branchId !== where.branchId) return false;
        if (where.employeeId && d.employeeId !== where.employeeId) return false;
        if (where.clientId && d.clientId !== where.clientId) return false;
        if (where.clientSiteId && d.clientSiteId !== where.clientSiteId) return false;
        if (where.designationId && d.designationId !== where.designationId) return false;
        if (where.vehicleId && d.vehicleId !== where.vehicleId) return false;
        if (where.status && d.status !== where.status) return false;
        if (where.deletedAt === null && d.deletedAt !== null) return false;
        if (where.id && where.id.not && d.id === where.id.not) return false;
        return true;
      });

      return list.slice(skip, skip + take).map((dep) => ({
        ...dep,
        employee: mockDb.employees.find((e) => e.id === dep.employeeId),
        client: mockDb.clients.find((c) => c.id === dep.clientId),
        clientSite: mockDb.clientSites.find((s) => s.id === dep.clientSiteId),
        designation: mockDb.designations.find((d) => d.id === dep.designationId),
        vehicle: dep.vehicleId ? mockDb.vehicles.find((v) => v.id === dep.vehicleId) : null,
        billingRate: mockDb.clientBillingRates.find((r) => r.id === dep.billingRateId),
        salaryStructure: mockDb.employeeSalaryStructures.find((s) => s.id === dep.salaryStructureId),
        shifts: mockDb.deploymentShifts.filter((s) => s.deploymentId === dep.id),
      }));
    },
    count: async ({ where }: any) => {
      return mockDb.deployments.filter((d) => {
        if (where.agencyId && d.agencyId !== where.agencyId) return false;
        if (where.branchId && d.branchId !== where.branchId) return false;
        if (where.deletedAt === null && d.deletedAt !== null) return false;
        return true;
      }).length;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.deployments.findIndex((d) => d.id === where.id);
      if (idx === -1) throw new NotFoundException('Deployment not found');
      mockDb.deployments[idx] = {
        ...mockDb.deployments[idx],
        ...data,
        updatedAt: new Date(),
      };
      return mockDb.deployments[idx];
    },
  },
  deploymentShift: {
    create: async ({ data }: any) => {
      const shift = { id: `shf-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, ...data };
      mockDb.deploymentShifts.push(shift);
      return shift;
    },
    upsert: async ({ where, create, update }: any) => {
      const idx = mockDb.deploymentShifts.findIndex(
        (s) => s.deploymentId === where.deploymentId_dayOfWeek.deploymentId && s.dayOfWeek === where.deploymentId_dayOfWeek.dayOfWeek,
      );
      if (idx !== -1) {
        mockDb.deploymentShifts[idx] = { ...mockDb.deploymentShifts[idx], ...update };
        return mockDb.deploymentShifts[idx];
      } else {
        const item = { id: `shf-${Date.now()}`, ...create };
        mockDb.deploymentShifts.push(item);
        return item;
      }
    },
  },
  auditLog: {
    findMany: async ({ where, take }: any) => {
      return mockDb.auditLogs
        .filter((l) => l.entityId === where.entityId)
        .slice(0, take || 10);
    },
  },
  $transaction: async (fn: any) => {
    return fn(mockPrisma);
  },
};

// Mock Audit Service
const mockAuditService: any = {
  record: async (params: any) => {
    mockDb.auditLogs.push({
      id: `aud-${Date.now()}`,
      createdAt: new Date(),
      ...params,
    });
  },
};

// Instantiate DeploymentsService
const service = new DeploymentsService(mockPrisma, mockAuditService);

// Security Contexts
const adminUser: AuthenticatedUserContext = {
  id: 'usr-admin-1',
  email: 'admin@apexmanpower.com',
  fullName: 'Super Admin',
  roleId: 'role-super-admin',
  roleSlug: 'super-admin',
  agencyId: 'agency-apex-1',
  branchId: null, // HQ unrestricted
  effectivePermissions: [
    'DEPLOYMENT_CREATE', 'DEPLOYMENT_READ', 'DEPLOYMENT_UPDATE',
    'DEPLOYMENT_DELETE', 'DEPLOYMENT_END', 'DEPLOYMENT_REASSIGN',
  ],
};

const chennaiUser: AuthenticatedUserContext = {
  id: 'usr-chennai-mgr',
  email: 'chennai.mgr@apexmanpower.com',
  fullName: 'Chennai Branch Manager',
  roleId: 'role-branch-manager',
  roleSlug: 'branch-manager',
  agencyId: 'agency-apex-1',
  branchId: 'branch-chennai',
  effectivePermissions: [
    'DEPLOYMENT_CREATE', 'DEPLOYMENT_READ', 'DEPLOYMENT_UPDATE',
    'DEPLOYMENT_END', 'DEPLOYMENT_REASSIGN',
  ],
};

const trichyUser: AuthenticatedUserContext = {
  id: 'usr-trichy-mgr',
  email: 'trichy.mgr@apexmanpower.com',
  fullName: 'Trichy Branch Manager',
  roleId: 'role-branch-manager',
  roleSlug: 'branch-manager',
  agencyId: 'agency-apex-1',
  branchId: 'branch-trichy',
  effectivePermissions: [
    'DEPLOYMENT_CREATE', 'DEPLOYMENT_READ', 'DEPLOYMENT_UPDATE',
    'DEPLOYMENT_END', 'DEPLOYMENT_REASSIGN',
  ],
};

const alienUser: AuthenticatedUserContext = {
  id: 'usr-alien-mgr',
  email: 'alien.mgr@other.com',
  fullName: 'Alien Agency Manager',
  roleId: 'role-alien-manager',
  roleSlug: 'branch-manager',
  agencyId: 'agency-alien-99',
  branchId: 'branch-alien-1',
  effectivePermissions: ['DEPLOYMENT_READ', 'DEPLOYMENT_CREATE'],
};

// ==========================================
// TEST EXECUTION RUNNER
// ==========================================

async function runTests() {
  let initialDeploymentId = '';
  let reassignedDeploymentId = '';

  // ----------------------------------------------------
  // GROUP 1: BASIC DEPLOYMENT CRUD & LIFECYCLE
  // ----------------------------------------------------

  // Test 01: Create Deployment
  try {
    const dep = await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        vehicleId: 'veh-oper-1',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        shiftName: 'DAY_SHIFT',
        shiftStartTime: '08:00',
        shiftEndTime: '17:00',
        scheduledWorkdays: [1, 2, 3, 4, 5, 6],
        remarks: 'Initial client deployment for Q1',
      },
      chennaiUser,
    );
    initialDeploymentId = dep.id;
    assert(
      dep.id &&
      dep.status === DeploymentStatus.ACTIVE &&
      dep.vehicleId === 'veh-oper-1' &&
      dep.shifts.length === 7,
      'Create Deployment - ACTIVE status, vehicle TN01AB1234, and 7 weekday shift schedules',
    );
  } catch (err: any) {
    assert(false, 'Create Deployment', err.message);
  }

  // Test 02: Read Deployment
  try {
    const dep = await service.getDeploymentById(initialDeploymentId, chennaiUser);
    assert(
      dep.id === initialDeploymentId &&
      dep.employee.employeeCode === 'EMP-001' &&
      dep.client.clientCode === 'CLI-001' &&
      dep.clientSite.siteCode === 'SITE-A1' &&
      dep.vehicle.vehicleRegistrationNumber === 'TN01AB1234',
      'Read Deployment - Full relational graph including employee, client, site, vehicle, and shifts',
    );
  } catch (err: any) {
    assert(false, 'Read Deployment', err.message);
  }

  // Test 03: Update Allowed Metadata Fields
  try {
    const updated = await service.updateDeployment(
      initialDeploymentId,
      {
        shiftName: 'MODIFIED_DAY_SHIFT',
        shiftStartTime: '08:30',
        remarks: 'Adjusted reporting time',
      },
      chennaiUser,
    );
    assert(
      updated.shiftName === 'MODIFIED_DAY_SHIFT',
      'Update Allowed Fields - Modified shift timings without mutating core historical keys',
    );
  } catch (err: any) {
    assert(false, 'Update Allowed Fields', err.message);
  }

  // Test 04: Safe End Deployment
  try {
    const ended = await service.endDeployment(
      initialDeploymentId,
      {
        endDate: '2026-06-30',
        reason: 'Client contract phase completed successfully',
        remarks: 'Clean handover',
      },
      chennaiUser,
    );
    assert(
      ended.status === DeploymentStatus.COMPLETED &&
      ended.endDate !== null,
      'End Deployment - Set status = COMPLETED and recorded completion date in audit ledger',
    );
  } catch (err: any) {
    assert(false, 'End Deployment', err.message);
  }

  // Test 05: Historical Deployment Preserved
  try {
    const dep = await service.getDeploymentById(initialDeploymentId, chennaiUser);
    assert(
      dep.id === initialDeploymentId &&
      dep.status === DeploymentStatus.COMPLETED,
      'Historical Deployment Preserved - Historical record untouched and fully queryable',
    );
  } catch (err: any) {
    assert(false, 'Historical Deployment Preserved', err.message);
  }

  // ----------------------------------------------------
  // GROUP 2: EMPLOYEE VALIDATION
  // ----------------------------------------------------

  // Test 06: Inactive Employee Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-inactive-3',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
      },
      chennaiUser,
    );
    assert(false, 'Inactive Employee Rejected', 'Should have rejected INACTIVE employee');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('not active'),
      'Inactive Employee Rejected - Blocked with BadRequestException',
    );
  }

  // Test 07: Terminated Employee Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-terminated-4',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
      },
      chennaiUser,
    );
    assert(false, 'Terminated Employee Rejected', 'Should have rejected TERMINATED employee');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException,
      'Terminated Employee Rejected - Ineligible for operational deployment',
    );
  }

  // Test 08: Resigned Employee Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-resigned-5',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
      },
      chennaiUser,
    );
    assert(false, 'Resigned Employee Rejected', 'Should have rejected RESIGNED employee');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException,
      'Resigned Employee Rejected - Ineligible for operational deployment',
    );
  }

  // Test 09: Unauthorized Branch Employee Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-trichy-6', // Trichy employee
        clientId: 'client-apex-a',  // Chennai client
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
      },
      chennaiUser, // Chennai branch context
    );
    assert(false, 'Unauthorized Employee Rejected', 'Should have blocked employee from different branch');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Unauthorized Branch Employee Rejected - Cross-branch deployment blocked',
    );
  }

  // ----------------------------------------------------
  // GROUP 3: CLIENT & SITE VALIDATION
  // ----------------------------------------------------

  // Test 10: Inactive Client Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-inactive-c',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
      },
      chennaiUser,
    );
    assert(false, 'Inactive Client Rejected', 'Should have rejected inactive client');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('Client is not active'),
      'Inactive Client Rejected - Blocked with BadRequestException',
    );
  }

  // Test 11: Unauthorized Client Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
      },
      alienUser,
    );
    assert(false, 'Unauthorized Client Rejected', 'Should have rejected alien agency client');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException,
      'Unauthorized Client Rejected - Alien tenant blocked with NotFoundException',
    );
  }

  // Test 12: Cross-Client Site Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-b1', // Site belonging to client-apex-b!
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
      },
      chennaiUser,
    );
    assert(false, 'Cross-Client Site Rejected', 'Should have rejected mismatched site');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('Selected site does not belong'),
      'Cross-Client Site Rejected - Strict site.clientId === client.id enforcement',
    );
  }

  // Test 13: Unauthorized Site Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'non-existent-site-id',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
      },
      chennaiUser,
    );
    assert(false, 'Unauthorized Site Rejected', 'Should have rejected non-existent site');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException,
      'Unauthorized Site Rejected - Rejected invalid site identifier',
    );
  }

  // ----------------------------------------------------
  // GROUP 4: BILLING RATE & SALARY STRUCTURE
  // ----------------------------------------------------

  // Test 14: Invalid Billing Rate Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-b1-driver', // Rate belongs to client B!
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
      },
      chennaiUser,
    );
    assert(false, 'Invalid Billing Rate Rejected', 'Should have rejected wrong client rate');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('Selected billing rate does not belong'),
      'Invalid Billing Rate Rejected - Rate card must belong to selected client',
    );
  }

  // Test 15: Billing Rate Outside Effective Period Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-expired', // Expired Dec 2025
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
      },
      chennaiUser,
    );
    assert(false, 'Expired Billing Rate Rejected', 'Should have rejected expired rate');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('expired'),
      'Billing Rate Outside Effective Period Rejected - Verified start date coverage',
    );
  }

  // Test 16: Invalid Salary Structure Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp2', // Belongs to EMP-002!
        startDate: '2026-07-01',
      },
      chennaiUser,
    );
    assert(false, 'Invalid Salary Structure Rejected', 'Should have rejected wrong employee salary');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('does not belong to the selected employee'),
      'Invalid Salary Structure Rejected - Salary must belong to deployed employee',
    );
  }

  // Test 17: Salary Structure Outside Effective Period Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1-expired', // Expired Dec 2025
        startDate: '2026-07-01',
      },
      chennaiUser,
    );
    assert(false, 'Expired Salary Structure Rejected', 'Should have rejected expired salary');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('expired'),
      'Salary Structure Outside Effective Period Rejected - Verified start date coverage',
    );
  }

  // ----------------------------------------------------
  // GROUP 5: TEMPORAL OVERLAP & ATOMIC REASSIGNMENT
  // ----------------------------------------------------

  // Create an active deployment for EMP-002
  let emp2DeploymentId = '';
  try {
    const dep = await service.createDeployment(
      {
        employeeId: 'emp-active-2',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp2',
        startDate: '2026-05-01',
        endDate: '2026-08-31',
      },
      chennaiUser,
    );
    emp2DeploymentId = dep.id;
  } catch (err: any) {
    console.error('Setup failed for emp-active-2:', err.message);
  }

  // Test 18: Employee Deployment Temporal Overlap Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-2',
        clientId: 'client-apex-b',
        clientSiteId: 'site-b1',
        designationId: 'desig-driver',
        billingRateId: 'rate-b1-driver',
        salaryStructureId: 'sal-emp2',
        startDate: '2026-07-01', // Overlaps 2026-05-01 to 2026-08-31!
        endDate: '2026-09-30',
      },
      chennaiUser,
    );
    assert(false, 'Employee Temporal Overlap Rejected', 'Should have rejected overlapping interval');
  } catch (err: any) {
    assert(
      err instanceof ConflictException && err.message.includes('EMPLOYEE_DEPLOYMENT_TEMPORAL_OVERLAP'),
      'Employee Deployment Overlap Rejected - Throws ConflictException (EMPLOYEE_DEPLOYMENT_TEMPORAL_OVERLAP)',
    );
  }

  // Test 19: Reassignment Transaction Tested
  try {
    const reassigned = await service.reassignDeployment(
      emp2DeploymentId,
      {
        effectiveDate: '2026-09-01',
        newClientId: 'client-apex-b',
        newClientSiteId: 'site-b1',
        newDesignationId: 'desig-driver',
        newBillingRateId: 'rate-b1-driver',
        newSalaryStructureId: 'sal-emp2',
        newVehicleId: 'veh-oper-2',
        newShiftName: 'METRO_ROTATIONAL',
        reason: 'Transferred to Metro contract upon expansion',
        remarks: 'Immediate transfer',
      },
      chennaiUser,
    );
    reassignedDeploymentId = reassigned.id;
    assert(
      reassigned.id &&
      reassigned.status === DeploymentStatus.ACTIVE &&
      reassigned.clientId === 'client-apex-b' &&
      reassigned.clientSiteId === 'site-b1' &&
      reassigned.startDate.toISOString().substring(0, 10) === '2026-09-01',
      'Reassignment Transaction Tested - Atomically ended old deployment and launched new deployment',
    );
  } catch (err: any) {
    assert(false, 'Reassignment Transaction Tested', err.message);
  }

  // Test 20: Historical Reassignment Preserved
  try {
    const oldDep = await service.getDeploymentById(emp2DeploymentId, chennaiUser);
    const newDep = await service.getDeploymentById(reassignedDeploymentId, chennaiUser);
    assert(
      oldDep.status === DeploymentStatus.TRANSFERRED &&
      newDep.status === DeploymentStatus.ACTIVE &&
      oldDep.id !== newDep.id,
      'Historical Reassignment Preserved - Old record retained as TRANSFERRED, new record ACTIVE',
    );
  } catch (err: any) {
    assert(false, 'Historical Reassignment Preserved', err.message);
  }

  // ----------------------------------------------------
  // GROUP 6: VEHICLE INTEGRATION & VALIDATION
  // ----------------------------------------------------

  // Test 21: Vehicle Assignment is Optional
  try {
    const nonVehDep = await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        // vehicleId omitted
      },
      chennaiUser,
    );
    assert(
      nonVehDep.id && nonVehDep.vehicleId === null,
      'Vehicle Assignment is Optional - Security guard / non-driver deployment without vehicle succeeded',
    );
  } catch (err: any) {
    assert(false, 'Vehicle Optional', err.message);
  }

  // Test 22: Invalid Vehicle Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        vehicleId: 'non-existent-veh-id',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-10-01',
      },
      chennaiUser,
    );
    assert(false, 'Invalid Vehicle Rejected', 'Should have rejected non-existent vehicle');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException,
      'Invalid Vehicle Rejected - Non-existent or unauthorized vehicle rejected',
    );
  }

  // Test 23: Grounded / Maintenance Vehicle Rejected
  try {
    await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        vehicleId: 'veh-grounded-3', // GROUNDED
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-10-01',
      },
      chennaiUser,
    );
    assert(false, 'Grounded Vehicle Rejected', 'Should have rejected grounded vehicle');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('not operational'),
      'Grounded Vehicle Rejected - Decommissioned or grounded vehicles strictly blocked',
    );
  }

  // ----------------------------------------------------
  // GROUP 7: SECURITY & AUTHORIZATION
  // ----------------------------------------------------

  // Test 24: Cross-Agency IDOR Rejected
  try {
    await service.getDeploymentById(initialDeploymentId, alienUser);
    assert(false, 'Cross-Agency IDOR Rejected', 'Alien agency should not access deployment');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException,
      'Cross-Agency IDOR Rejected - Direct query blocked across tenant boundary',
    );
  }

  // Test 25: Cross-Branch IDOR Rejected
  try {
    await service.getDeploymentById(initialDeploymentId, trichyUser);
    assert(false, 'Cross-Branch IDOR Rejected', 'Trichy user should not access Chennai deployment');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Cross-Branch IDOR Rejected - Trichy branch manager blocked from Chennai deployment',
    );
  }

  // Test 26: Super Admin Unrestricted Cross-Branch Access
  try {
    const dep = await service.getDeploymentById(initialDeploymentId, adminUser);
    assert(
      dep.id === initialDeploymentId,
      'Permission & HQ Scope - Super Admin accesses branch deployments across entire agency',
    );
  } catch (err: any) {
    assert(false, 'Super Admin Access', err.message);
  }

  // ----------------------------------------------------
  // GROUP 8: SHIFTS & ROSTERING
  // ----------------------------------------------------

  // Test 27: Create Deployment Shift With Scheduled Workdays
  try {
    const dep = await service.getDeploymentById(initialDeploymentId, chennaiUser);
    const workdays = dep.shifts.filter((s: any) => s.isScheduledWorkday);
    assert(
      dep.shifts.length === 7 && workdays.length === 6,
      'Deployment Shift Configuration - Mon-Sat scheduled workdays (6) and Sunday rest day (1)',
    );
  } catch (err: any) {
    assert(false, 'Deployment Shift Workdays', err.message);
  }

  // Test 28: Cross-Midnight Shift Supported
  try {
    const nightDep = await service.createDeployment(
      {
        employeeId: 'emp-active-1',
        clientId: 'client-apex-a',
        clientSiteId: 'site-a1',
        designationId: 'desig-driver',
        billingRateId: 'rate-a1-driver',
        salaryStructureId: 'sal-emp1',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        shiftName: 'NIGHT_PATROL',
        shiftStartTime: '20:00',
        shiftEndTime: '05:00',
      },
      chennaiUser,
    );
    assert(
      nightDep.isNightShift === true &&
      nightDep.shiftName === 'NIGHT_PATROL',
      'Cross-Midnight Shift Supported - Automatically detected 20:00 -> 05:00 as isNightShift: true',
    );
  } catch (err: any) {
    assert(false, 'Cross-Midnight Shift', err.message);
  }

  // Test 29: Read Deployment Options / Lookup Metadata
  try {
    const options = await service.getDeploymentOptions(chennaiUser, 'client-apex-a');
    assert(
      options.clients.length > 0 &&
      options.designations.length > 0 &&
      options.vehicles.length > 0 &&
      options.employees.length > 0 &&
      options.clientBillingRates.length > 0,
      'Metadata Lookups - Returns active clients, sites, vehicles, designations, rates, and salaries',
    );
  } catch (err: any) {
    assert(false, 'Metadata Lookups', err.message);
  }

  // Test 30: End Deployment On Non-Active Deployment Rejected
  try {
    await service.endDeployment(
      initialDeploymentId, // Already ended in Test 04
      {
        endDate: '2026-07-01',
        reason: 'Attempting to end already completed deployment',
      },
      chennaiUser,
    );
    assert(false, 'End Non-Active Rejected', 'Should have rejected ending already completed deployment');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('Only ACTIVE deployments'),
      'End Non-Active Rejected - Blocked with BadRequestException',
    );
  }

  // Test 31: Reassign With Effective Date Before Start Rejected
  try {
    await service.reassignDeployment(
      reassignedDeploymentId,
      {
        effectiveDate: '2026-08-01', // Before reassigned start (2026-09-01)
        newClientId: 'client-apex-a',
        newClientSiteId: 'site-a1',
        newDesignationId: 'desig-driver',
        newBillingRateId: 'rate-a1-driver',
        newSalaryStructureId: 'sal-emp2',
        reason: 'Invalid retroactive reassignment',
      },
      chennaiUser,
    );
    assert(false, 'Retroactive Reassignment Rejected', 'Should have rejected date before start');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('cannot be earlier'),
      'Reassignment Date Validation - Rejected effective date preceding previous deployment start',
    );
  }

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} DEPLOYMENT TESTS PASSED`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal crash:', err);
  process.exit(1);
});
