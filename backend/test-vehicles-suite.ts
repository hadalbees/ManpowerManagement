import { ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { VehiclesService } from './src/modules/vehicles/vehicles.service';
import { AuthenticatedUserContext } from './src/common/decorators/current-user.decorator';
import { VehicleStatus, VehicleType, FuelType, AuditAction } from '@prisma/client';

console.log('\n======================================================');
console.log('🧪 RUNNING PRODUCTION VEHICLE MANAGEMENT TEST SUITE (26/26)');
console.log('======================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] Test ${totalTests.toString().padStart(2, '0')}: ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] Test ${totalTests.toString().padStart(2, '0')}: ${testName} - ${detail || 'Assertion failed'}`);
  }
}

// In-memory mock database state
const mockDb = {
  vehicles: [] as any[],
  vehicleAssignments: [] as any[],
  employees: [
    {
      id: 'emp-driver-1',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-001',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      phone: '9876543210',
      status: 'ACTIVE',
      drivingLicenseNumber: 'DL0420110012345',
      drivingLicenseClass: 'LMV-TR',
      deletedAt: null,
    },
    {
      id: 'emp-driver-2',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-002',
      firstName: 'Suresh',
      lastName: 'Selvam',
      phone: '9876543211',
      status: 'ACTIVE',
      drivingLicenseNumber: 'TN0120150098765',
      drivingLicenseClass: 'HMV',
      deletedAt: null,
    },
    {
      id: 'emp-inactive-3',
      agencyId: 'agency-apex-1',
      branchId: 'branch-chennai',
      employeeCode: 'EMP-003',
      firstName: 'Karthik',
      lastName: 'Natarajan',
      phone: '9876543212',
      status: 'TERMINATED',
      deletedAt: null,
    },
    {
      id: 'emp-trichy-4',
      agencyId: 'agency-apex-1',
      branchId: 'branch-trichy',
      employeeCode: 'EMP-004',
      firstName: 'Manoj',
      lastName: 'Prabhakar',
      phone: '9876543213',
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
    { id: 'client-corp-1', agencyId: 'agency-apex-1', branchId: 'branch-chennai', companyName: 'OmniLogistics India', clientCode: 'CLI-001', deletedAt: null },
  ],
  clientSites: [
    { id: 'site-hub-1', clientId: 'client-corp-1', siteName: 'Central Logistics Hub', siteCode: 'SITE-01', deletedAt: null },
  ],
  documents: [] as any[],
  auditLogs: [] as any[],
};

// Mock Prisma Service
const mockPrisma: any = {
  vehicle: {
    findUnique: async ({ where }: any) => {
      const { agencyId, vehicleRegistrationNumber } = where.agencyId_vehicleRegistrationNumber || {};
      return mockDb.vehicles.find(
        (v) => v.agencyId === agencyId && v.vehicleRegistrationNumber === vehicleRegistrationNumber && v.deletedAt === null,
      ) || null;
    },
    findFirst: async ({ where, include }: any) => {
      const v = mockDb.vehicles.find((item) => {
        let match = true;
        if (where.id && item.id !== where.id) match = false;
        if (where.agencyId && item.agencyId !== where.agencyId) match = false;
        if (where.branchId && item.branchId !== where.branchId) match = false;
        if (where.deletedAt === null && item.deletedAt !== null) match = false;
        return match;
      });
      if (!v) return null;
      const res = { ...v };
      if (include?.branch) res.branch = mockDb.agencyBranches.find((b) => b.id === v.branchId);
      if (include?.client) res.client = mockDb.clients.find((c) => c.id === v.clientId);
      if (include?.assignments) {
        res.assignments = mockDb.vehicleAssignments
          .filter((a) => a.vehicleId === v.id && a.deletedAt === null)
          .sort((a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime())
          .map((a) => ({
            ...a,
            employee: mockDb.employees.find((e) => e.id === a.employeeId),
            clientSite: mockDb.clientSites.find((s) => s.id === a.clientSiteId),
            assignedBy: { id: a.assignedById, fullName: 'Super Admin', email: 'admin@apexmanpower.com' },
          }));
      }
      return res;
    },
    findMany: async ({ where, skip = 0, take = 10, include }: any) => {
      let list = mockDb.vehicles.filter((item) => {
        let match = true;
        if (where.agencyId && item.agencyId !== where.agencyId) match = false;
        if (where.branchId && item.branchId !== where.branchId) match = false;
        if (where.vehicleType && item.vehicleType !== where.vehicleType) match = false;
        if (where.status && item.status !== where.status) match = false;
        if (where.fuelType && item.fuelType !== where.fuelType) match = false;
        if (where.clientId && item.clientId !== where.clientId) match = false;
        if (where.deletedAt === null && item.deletedAt !== null) match = false;
        if (where.OR) {
          const orMatch = where.OR.some((clause: any) => {
            if (clause.vehicleRegistrationNumber && item.vehicleRegistrationNumber.includes(clause.vehicleRegistrationNumber.contains)) return true;
            if (clause.vehicleMake && item.vehicleMake.toLowerCase().includes(clause.vehicleMake.contains.toLowerCase())) return true;
            if (clause.vehicleModel && item.vehicleModel.toLowerCase().includes(clause.vehicleModel.contains.toLowerCase())) return true;
            return false;
          });
          if (!orMatch) match = false;
        }
        return match;
      });

      const sliced = list.slice(skip, skip + take);
      return sliced.map((v) => {
        const res = { ...v };
        if (include?.branch) res.branch = mockDb.agencyBranches.find((b) => b.id === v.branchId);
        if (include?.client) res.client = mockDb.clients.find((c) => c.id === v.clientId);
        if (include?.assignments) {
          res.assignments = mockDb.vehicleAssignments
            .filter((a) => a.vehicleId === v.id && a.deletedAt === null && a.endDatetime === null)
            .map((a) => ({
              ...a,
              employee: mockDb.employees.find((e) => e.id === a.employeeId),
            }));
        }
        return res;
      });
    },
    count: async ({ where }: any) => {
      return mockDb.vehicles.filter((item) => {
        let match = true;
        if (where.agencyId && item.agencyId !== where.agencyId) match = false;
        if (where.branchId && item.branchId !== where.branchId) match = false;
        if (where.deletedAt === null && item.deletedAt !== null) match = false;
        return match;
      }).length;
    },
    create: async ({ data, include }: any) => {
      const newV = {
        id: `veh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockDb.vehicles.push(newV);
      const res = { ...newV };
      if (include?.branch) res.branch = mockDb.agencyBranches.find((b) => b.id === data.branchId);
      if (include?.client) res.client = mockDb.clients.find((c) => c.id === data.clientId);
      return res;
    },
    update: async ({ where, data, include }: any) => {
      const idx = mockDb.vehicles.findIndex((v) => v.id === where.id);
      if (idx === -1) throw new Error('Vehicle not found');
      mockDb.vehicles[idx] = {
        ...mockDb.vehicles[idx],
        ...data,
        updatedAt: new Date(),
      };
      const res = { ...mockDb.vehicles[idx] };
      if (include?.branch) res.branch = mockDb.agencyBranches.find((b) => b.id === res.branchId);
      if (include?.client) res.client = mockDb.clients.find((c) => c.id === res.clientId);
      return res;
    },
  },
  vehicleAssignment: {
    findFirst: async ({ where, include }: any) => {
      const a = mockDb.vehicleAssignments.find((item) => {
        let match = true;
        if (where.id && item.id !== where.id) match = false;
        if (where.vehicleId && item.vehicleId !== where.vehicleId) match = false;
        if (where.employeeId && item.employeeId !== where.employeeId) match = false;
        if (where.deletedAt === null && item.deletedAt !== null) match = false;
        if (where.endDatetime === null && item.endDatetime !== null) match = false;

        if (where.OR) {
          const orMatches = where.OR.some((clause: any) => {
            let cMatch = true;
            if (clause.endDatetime === null && item.endDatetime !== null) cMatch = false;
            if (clause.endDatetime?.gte && (!item.endDatetime || new Date(item.endDatetime) < new Date(clause.endDatetime.gte))) cMatch = false;
            if (clause.endDatetime?.gt && (!item.endDatetime || new Date(item.endDatetime) <= new Date(clause.endDatetime.gt))) cMatch = false;
            if (clause.startDatetime?.lte && new Date(item.startDatetime) > new Date(clause.startDatetime.lte)) cMatch = false;
            return cMatch;
          });
          if (!orMatches) match = false;
        }

        return match;
      });
      if (!a) return null;
      const res = { ...a };
      if (include?.employee) res.employee = mockDb.employees.find((e) => e.id === a.employeeId);
      if (include?.vehicle) res.vehicle = mockDb.vehicles.find((v) => v.id === a.vehicleId);
      if (include?.clientSite) res.clientSite = mockDb.clientSites.find((s) => s.id === a.clientSiteId);
      if (include?.assignedBy) res.assignedBy = { id: a.assignedById, fullName: 'Super Admin', email: 'admin@apexmanpower.com' };
      return res;
    },
    findMany: async ({ where, include }: any) => {
      return mockDb.vehicleAssignments
        .filter((a) => {
          let match = true;
          if (where.vehicleId && a.vehicleId !== where.vehicleId) match = false;
          if (where.employeeId && a.employeeId !== where.employeeId) match = false;
          if (where.deletedAt === null && a.deletedAt !== null) match = false;
          return match;
        })
        .sort((a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime())
        .map((a) => {
          const res = { ...a };
          if (include?.employee) res.employee = mockDb.employees.find((e) => e.id === a.employeeId);
          if (include?.vehicle) res.vehicle = mockDb.vehicles.find((v) => v.id === a.vehicleId);
          if (include?.clientSite) res.clientSite = mockDb.clientSites.find((s) => s.id === a.clientSiteId);
          if (include?.assignedBy) res.assignedBy = { id: a.assignedById, fullName: 'Super Admin' };
          return res;
        });
    },
    create: async ({ data, include }: any) => {
      const newA = {
        id: `assign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockDb.vehicleAssignments.push(newA);
      const res = { ...newA };
      if (include?.employee) res.employee = mockDb.employees.find((e) => e.id === data.employeeId);
      if (include?.vehicle) res.vehicle = mockDb.vehicles.find((v) => v.id === data.vehicleId);
      if (include?.clientSite) res.clientSite = mockDb.clientSites.find((s) => s.id === data.clientSiteId);
      if (include?.assignedBy) res.assignedBy = { id: data.assignedById, fullName: 'Super Admin' };
      return res;
    },
    update: async ({ where, data, include }: any) => {
      const idx = mockDb.vehicleAssignments.findIndex((a) => a.id === where.id);
      if (idx === -1) throw new Error('Assignment not found');
      mockDb.vehicleAssignments[idx] = {
        ...mockDb.vehicleAssignments[idx],
        ...data,
        updatedAt: new Date(),
      };
      const res = { ...mockDb.vehicleAssignments[idx] };
      if (include?.employee) res.employee = mockDb.employees.find((e) => e.id === res.employeeId);
      if (include?.vehicle) res.vehicle = mockDb.vehicles.find((v) => v.id === res.vehicleId);
      return res;
    },
  },
  agencyBranch: {
    findFirst: async ({ where }: any) => {
      return mockDb.agencyBranches.find(
        (b) => b.id === where.id && b.agencyId === where.agencyId && b.deletedAt === null,
      ) || null;
    },
  },
  employee: {
    findFirst: async ({ where }: any) => {
      return mockDb.employees.find(
        (e) => e.id === where.id && e.agencyId === where.agencyId && (where.deletedAt === null ? e.deletedAt === null : true),
      ) || null;
    },
  },
  client: {
    findFirst: async ({ where }: any) => {
      return mockDb.clients.find(
        (c) => c.id === where.id && c.agencyId === where.agencyId && c.deletedAt === null,
      ) || null;
    },
  },
  document: {
    findMany: async ({ where }: any) => {
      return mockDb.documents.filter(
        (d) => d.entityType === where.entityType && d.entityId === where.entityId && d.deletedAt === null,
      );
    },
  },
  auditLog: {
    create: async ({ data }: any) => {
      mockDb.auditLogs.push({ id: `audit-${Date.now()}`, ...data, createdAt: new Date() });
    },
  },
  $transaction: async (cb: any) => {
    return cb(mockPrisma);
  },
};

// Mock Audit Service
const mockAuditService: any = {
  record: async (params: any) => {
    mockDb.auditLogs.push({
      ...params,
      timestamp: new Date(),
    });
  },
};

// Contexts
const adminUser: AuthenticatedUserContext = {
  id: 'usr-admin-1',
  email: 'admin@apexmanpower.com',
  fullName: 'Super Admin',
  role: 'super-admin',
  agencyId: 'agency-apex-1',
  branchId: null, // HQ unrestricted
  effectivePermissions: [
    'VEHICLE_CREATE', 'VEHICLE_READ', 'VEHICLE_UPDATE', 'VEHICLE_DELETE', 'VEHICLE_ASSIGN',
  ],
};

const trichyBranchUser: AuthenticatedUserContext = {
  id: 'usr-trichy-mgr',
  email: 'trichy.manager@apexmanpower.com',
  fullName: 'Trichy Manager',
  role: 'branch-manager',
  agencyId: 'agency-apex-1',
  branchId: 'branch-trichy',
  effectivePermissions: [
    'VEHICLE_CREATE', 'VEHICLE_READ', 'VEHICLE_UPDATE', 'VEHICLE_ASSIGN',
  ],
};

const alienAgencyUser: AuthenticatedUserContext = {
  id: 'usr-alien-mgr',
  email: 'alien@otheragency.com',
  fullName: 'Alien Manager',
  role: 'branch-manager',
  agencyId: 'agency-alien-99',
  branchId: 'branch-alien-1',
  effectivePermissions: ['VEHICLE_READ', 'VEHICLE_CREATE'],
};

const vehiclesService = new VehiclesService(mockPrisma, mockAuditService);

async function runVehicleTestSuite() {
  let createdVehicleId = '';
  let secondVehicleId = '';
  let assignmentId1 = '';
  let assignmentId2 = '';

  // ----------------------------------------------------
  // TEST 01: Create Vehicle with Normalized Registration
  // ----------------------------------------------------
  try {
    const v = await vehiclesService.createVehicle(
      {
        vehicleRegistrationNumber: 'tn 01 ab 1234', // Unnormalized spacing & lowercase
        vehicleMake: 'Tata Motors',
        vehicleModel: 'Ace Gold HT',
        vehicleType: 'TRUCK' as any,
        fuelType: 'DIESEL' as any,
        chassisNumber: 'MAT612001A1B2C3D4',
        engineNumber: 'ENG475ID456789',
        manufacturingYear: 2024,
        currentOdometerKm: 15400,
        branchId: 'branch-chennai',
      },
      adminUser,
    );

    createdVehicleId = v.id;
    assert(
      v.vehicleRegistrationNumber === 'TN01AB1234' &&
        v.status === VehicleStatus.AVAILABLE &&
        v.branch?.branchCode === 'CHN',
      'Create Vehicle - Normalized registration TN01AB1234, AVAILABLE status, branch CHN',
    );
  } catch (err: any) {
    assert(false, 'Create Vehicle', err.message);
  }

  // ----------------------------------------------------
  // TEST 02: Read Vehicle Structured Profile
  // ----------------------------------------------------
  try {
    const v = await vehiclesService.getVehicleById(createdVehicleId, adminUser);
    assert(
      v.id === createdVehicleId &&
        v.vehicleMake === 'Tata Motors' &&
        v.currentAssignment === null &&
        Array.isArray(v.assignments),
      'Read Vehicle - Structured profile with null current assignment and assignments array',
    );
  } catch (err: any) {
    assert(false, 'Read Vehicle', err.message);
  }

  // ----------------------------------------------------
  // TEST 03: Update Vehicle Technical Attributes
  // ----------------------------------------------------
  try {
    const updated = await vehiclesService.updateVehicle(
      createdVehicleId,
      {
        vehicleModel: 'Ace Gold Plus',
        currentOdometerKm: 15500,
      },
      adminUser,
    );

    assert(
      updated.vehicleModel === 'Ace Gold Plus' && updated.currentOdometerKm === 15500,
      'Update Vehicle - Successfully updated model and odometer km',
    );
  } catch (err: any) {
    assert(false, 'Update Vehicle', err.message);
  }

  // ----------------------------------------------------
  // TEST 04: Duplicate Registration Number Rejected
  // ----------------------------------------------------
  try {
    await vehiclesService.createVehicle(
      {
        vehicleRegistrationNumber: 'TN-01-AB-1234', // Same normalized number
        vehicleMake: 'Ashok Leyland',
        vehicleModel: 'Dost+',
        vehicleType: 'VAN' as any,
        fuelType: 'DIESEL' as any,
        chassisNumber: 'CHAS99999999',
        engineNumber: 'ENG99999999',
        manufacturingYear: 2023,
        branchId: 'branch-chennai',
      },
      adminUser,
    );
    assert(false, 'Duplicate Registration Rejected', 'Expected ConflictException');
  } catch (err: any) {
    assert(
      err instanceof ConflictException,
      'Duplicate Registration Rejected - Correctly rejected normalized registration collision',
    );
  }

  // ----------------------------------------------------
  // TEST 05: Unauthorized Agency Read Rejected
  // ----------------------------------------------------
  try {
    await vehiclesService.getVehicleById(createdVehicleId, alienAgencyUser);
    assert(false, 'Unauthorized Agency Rejected', 'Expected NotFoundException across tenant boundary');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException,
      'Unauthorized Agency Rejected - Alien agency blocked with NotFoundException',
    );
  }

  // ----------------------------------------------------
  // TEST 06: Unauthorized Branch Manager Access Rejected
  // ----------------------------------------------------
  try {
    await vehiclesService.getVehicleById(createdVehicleId, trichyBranchUser);
    assert(false, 'Unauthorized Branch Rejected', 'Expected ForbiddenException for cross-branch access');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Unauthorized Branch Rejected - Trichy manager blocked from accessing Chennai vehicle',
    );
  }

  // ----------------------------------------------------
  // TEST 07: Vehicle Status Transition
  // ----------------------------------------------------
  try {
    const s1 = await vehiclesService.updateVehicleStatus(
      createdVehicleId,
      { status: VehicleStatus.UNDER_MAINTENANCE as any, remarks: 'Scheduled 15,000 km general service' },
      adminUser,
    );
    assert(
      s1.status === VehicleStatus.UNDER_MAINTENANCE,
      'Vehicle Status Change - Transitioned to UNDER_MAINTENANCE',
    );

    // Revert to AVAILABLE for assignment tests
    await vehiclesService.updateVehicleStatus(
      createdVehicleId,
      { status: VehicleStatus.AVAILABLE as any },
      adminUser,
    );
  } catch (err: any) {
    assert(false, 'Vehicle Status Change', err.message);
  }

  // ----------------------------------------------------
  // TEST 08: Assign Driver to Available Vehicle
  // ----------------------------------------------------
  try {
    const asgn = await vehiclesService.assignVehicle(
      createdVehicleId,
      {
        employeeId: 'emp-driver-1',
        startDatetime: '2026-04-01T08:00:00.000Z',
        startOdometerKm: 15500,
        clientSiteId: 'site-hub-1',
        handoverConditionNotes: 'Clean cabin, tires good, spare wheel present',
        reasonForChange: 'New Client Shift Dispatch',
      },
      adminUser,
    );

    assignmentId1 = asgn.id;
    const vCheck = await vehiclesService.getVehicleById(createdVehicleId, adminUser);

    assert(
      asgn.vehicleId === createdVehicleId &&
        asgn.employee?.employeeCode === 'EMP-001' &&
        vCheck.status === VehicleStatus.ASSIGNED,
      'Assign Employee - Successfully assigned driver EMP-001 and set vehicle status to ASSIGNED',
    );
  } catch (err: any) {
    assert(false, 'Assign Employee', err.message);
  }

  // ----------------------------------------------------
  // TEST 09: Read Current Assignment
  // ----------------------------------------------------
  try {
    const v = await vehiclesService.getVehicleById(createdVehicleId, adminUser);
    assert(
      v.currentAssignment !== null &&
        v.currentAssignment.employeeId === 'emp-driver-1' &&
        v.currentAssignment.endDatetime === null,
      'Read Current Assignment - Identified active open-ended assignment correctly',
    );
  } catch (err: any) {
    assert(false, 'Read Current Assignment', err.message);
  }

  // ----------------------------------------------------
  // TEST 10: Prevent Soft Deletion When Active Assignment Exists
  // ----------------------------------------------------
  try {
    await vehiclesService.deleteVehicle(createdVehicleId, adminUser);
    assert(false, 'Prevent Deletion on Active Assignment', 'Expected ConflictException');
  } catch (err: any) {
    assert(
      err instanceof ConflictException && err.message.includes('VEHICLE_HAS_ACTIVE_ASSIGNMENTS'),
      'Prevent Soft Deletion with Active Assignment - Throws ConflictException (VEHICLE_HAS_ACTIVE_ASSIGNMENTS)',
    );
  }

  // ----------------------------------------------------
  // TEST 11: End Active Vehicle Assignment
  // ----------------------------------------------------
  try {
    const ended = await vehiclesService.endVehicleAssignment(
      createdVehicleId,
      assignmentId1,
      {
        endDatetime: '2026-06-30T20:00:00.000Z',
        endOdometerKm: 18900,
        returnConditionNotes: 'No dents, regular wear, fuel half tank',
        reasonForChange: 'Contract rotation',
      },
      adminUser,
    );

    const vCheck = await vehiclesService.getVehicleById(createdVehicleId, adminUser);

    assert(
      ended.endOdometerKm === 18900 &&
        vCheck.status === VehicleStatus.AVAILABLE &&
        vCheck.currentOdometerKm === 18900 &&
        vCheck.currentAssignment === null,
      'End Assignment - Recorded end odometer 18,900 km, restored status to AVAILABLE',
    );
  } catch (err: any) {
    assert(false, 'End Assignment', err.message);
  }

  // ----------------------------------------------------
  // TEST 12: Assign Driver 2 (Preserving Assignment 1)
  // ----------------------------------------------------
  try {
    const asgn2 = await vehiclesService.assignVehicle(
      createdVehicleId,
      {
        employeeId: 'emp-driver-2',
        startDatetime: '2026-07-01T08:00:00.000Z',
        startOdometerKm: 18900,
        handoverConditionNotes: 'Clean, full service done',
        reasonForChange: 'Second Quarter Rotation',
      },
      adminUser,
    );

    assignmentId2 = asgn2.id;
    assert(
      asgn2.id !== assignmentId1 && asgn2.employeeId === 'emp-driver-2',
      'Second Assignment - Successfully created sequential assignment for EMP-002',
    );
  } catch (err: any) {
    assert(false, 'Second Assignment', err.message);
  }

  // ----------------------------------------------------
  // TEST 13: Read Assignment History (Temporal Ledger)
  // ----------------------------------------------------
  try {
    const history = await vehiclesService.getVehicleAssignments(createdVehicleId, adminUser);
    assert(
      history.length === 2 &&
        history[0].id === assignmentId2 && // Newest first
        history[1].id === assignmentId1 &&
        history[1].endOdometerKm === 18900,
      'Read Assignment History - Both assignments preserved with odometer and timeline order',
    );
  } catch (err: any) {
    assert(false, 'Read Assignment History', err.message);
  }

  // ----------------------------------------------------
  // TEST 14: Historical Assignment Never Overwritten
  // ----------------------------------------------------
  try {
    const oldAsgn = mockDb.vehicleAssignments.find((a) => a.id === assignmentId1);
    assert(
      oldAsgn !== undefined &&
        oldAsgn.startOdometerKm === 15500 &&
        oldAsgn.endOdometerKm === 18900 &&
        oldAsgn.employeeId === 'emp-driver-1',
      'Historical Assignment Preserved - Assignment 1 remains untouched in historical ledger',
    );
  } catch (err: any) {
    assert(false, 'Historical Assignment Preserved', err.message);
  }

  // ----------------------------------------------------
  // TEST 15: Overlapping Vehicle Assignment Rejected
  // ----------------------------------------------------
  try {
    // Attempt to assign another driver to createdVehicleId while assignment 2 is active
    await vehiclesService.assignVehicle(
      createdVehicleId,
      {
        employeeId: 'emp-driver-1',
        startDatetime: '2026-07-15T08:00:00.000Z', // Overlaps with assignment 2
        startOdometerKm: 19000,
      },
      adminUser,
    );
    assert(false, 'Overlapping Assignment Rejected', 'Expected ConflictException or BadRequestException');
  } catch (err: any) {
    assert(
      err instanceof ConflictException || err instanceof BadRequestException,
      'Overlapping Vehicle Assignment Rejected - Blocked conflicting assignment on assigned vehicle',
    );
  }

  // ----------------------------------------------------
  // TEST 16: Overlapping Driver Assignment Rejected
  // ----------------------------------------------------
  try {
    // Create a second vehicle in Chennai
    const v2 = await vehiclesService.createVehicle(
      {
        vehicleRegistrationNumber: 'TN01CD5678',
        vehicleMake: 'Mahindra',
        vehicleModel: 'Bolero Maxi Truck',
        vehicleType: 'TRUCK' as any,
        fuelType: 'DIESEL' as any,
        chassisNumber: 'MAH1234567890',
        engineNumber: 'ENG9876543210',
        manufacturingYear: 2024,
        branchId: 'branch-chennai',
      },
      adminUser,
    );
    secondVehicleId = v2.id;

    // Attempt to assign emp-driver-2 (who is currently assigned to vehicle 1) to vehicle 2
    await vehiclesService.assignVehicle(
      secondVehicleId,
      {
        employeeId: 'emp-driver-2', // Already driving vehicle 1
        startDatetime: '2026-07-10T08:00:00.000Z',
        startOdometerKm: 500,
      },
      adminUser,
    );
    assert(false, 'Driver Conflict Rejected', 'Expected ConflictException for driver concurrent assignment');
  } catch (err: any) {
    assert(
      err instanceof ConflictException && err.message.includes('EMPLOYEE_ALREADY_ASSIGNED_TO_VEHICLE'),
      'Overlapping Driver Assignment Rejected - Driver EMP-002 blocked from second vehicle simultaneously',
    );
  }

  // ----------------------------------------------------
  // TEST 17: Inactive / Terminated Employee Rejected
  // ----------------------------------------------------
  try {
    await vehiclesService.assignVehicle(
      secondVehicleId,
      {
        employeeId: 'emp-inactive-3', // Status: TERMINATED
        startDatetime: '2026-07-10T08:00:00.000Z',
        startOdometerKm: 500,
      },
      adminUser,
    );
    assert(false, 'Inactive Employee Rejected', 'Expected BadRequestException');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('Must be ACTIVE'),
      'Invalid / Inactive Employee Rejected - Terminated driver cannot receive vehicle assignment',
    );
  }

  // ----------------------------------------------------
  // TEST 18: Maintenance Vehicle Cannot Receive Assignment
  // ----------------------------------------------------
  try {
    await vehiclesService.updateVehicleStatus(
      secondVehicleId,
      { status: VehicleStatus.UNDER_MAINTENANCE as any },
      adminUser,
    );

    await vehiclesService.assignVehicle(
      secondVehicleId,
      {
        employeeId: 'emp-driver-1',
        startDatetime: '2026-08-01T08:00:00.000Z',
        startOdometerKm: 500,
      },
      adminUser,
    );
    assert(false, 'Maintenance Vehicle Rejected', 'Expected BadRequestException');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('Must be AVAILABLE'),
      'Maintenance Vehicle Rejected - Vehicle in UNDER_MAINTENANCE cannot receive driver assignment',
    );
  }

  // ----------------------------------------------------
  // TEST 19: Retired / Grounded Vehicle Cannot Receive Assignment
  // ----------------------------------------------------
  try {
    await vehiclesService.updateVehicleStatus(
      secondVehicleId,
      { status: VehicleStatus.GROUNDED as any },
      adminUser,
    );

    await vehiclesService.assignVehicle(
      secondVehicleId,
      {
        employeeId: 'emp-driver-1',
        startDatetime: '2026-08-01T08:00:00.000Z',
        startOdometerKm: 500,
      },
      adminUser,
    );
    assert(false, 'Grounded Vehicle Rejected', 'Expected BadRequestException');
  } catch (err: any) {
    assert(
      err instanceof BadRequestException && err.message.includes('Must be AVAILABLE'),
      'Retired Vehicle Rejected - Decommissioned GROUNDED vehicle blocked from assignment',
    );
  }

  // ----------------------------------------------------
  // TEST 20: Cross-Agency IDOR Attempt Blocked
  // ----------------------------------------------------
  try {
    await vehiclesService.updateVehicle(
      createdVehicleId,
      { vehicleModel: 'Malicious Model' },
      alienAgencyUser,
    );
    assert(false, 'Cross-Agency IDOR Blocked', 'Expected NotFoundException');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException,
      'Cross-Agency IDOR Rejected - Direct update blocked with NotFoundException',
    );
  }

  // ----------------------------------------------------
  // TEST 21: Cross-Branch IDOR Attempt Blocked
  // ----------------------------------------------------
  try {
    await vehiclesService.assignVehicle(
      createdVehicleId,
      {
        employeeId: 'emp-trichy-4',
        startDatetime: '2026-08-01T08:00:00.000Z',
        startOdometerKm: 20000,
      },
      trichyBranchUser,
    );
    assert(false, 'Cross-Branch IDOR Blocked', 'Expected ForbiddenException');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Cross-Branch IDOR Rejected - Trichy branch manager blocked from managing Chennai vehicle',
    );
  }

  // ----------------------------------------------------
  // TEST 22: Soft Deletion of Available Vehicle
  // ----------------------------------------------------
  try {
    // Delete secondVehicleId (which has no active assignments)
    const delRes = await vehiclesService.deleteVehicle(secondVehicleId, adminUser);
    assert(
      delRes.message.includes('successfully deactivated'),
      'Soft Deletion - Successfully deactivated available vehicle without active assignments',
    );
  } catch (err: any) {
    assert(false, 'Soft Deletion', err.message);
  }

  // ----------------------------------------------------
  // TEST 23: Employee Vehicle History Query
  // ----------------------------------------------------
  try {
    const driverHistory = await vehiclesService.getEmployeeVehicleHistory('emp-driver-1', adminUser);
    assert(
      driverHistory.length >= 1 &&
        driverHistory[0].vehicle.vehicleRegistrationNumber === 'TN01AB1234',
      'Employee Vehicle History Query - Returns vehicle assignments linked to driver EMP-001',
    );
  } catch (err: any) {
    assert(false, 'Employee Vehicle History', err.message);
  }

  // ----------------------------------------------------
  // TEST 24: Vehicle Types & Metadata Lookups
  // ----------------------------------------------------
  try {
    const types = vehiclesService.getVehicleTypes();
    const fuels = vehiclesService.getFuelTypes();
    const statuses = vehiclesService.getVehicleStatuses();
    assert(
      types.length === 6 && fuels.length === 4 && statuses.length === 4,
      'Vehicle Types & Metadata - Returns 6 vehicle types, 4 fuels, and 4 lifecycle statuses',
    );
  } catch (err: any) {
    assert(false, 'Vehicle Metadata', err.message);
  }

  // ----------------------------------------------------
  // TEST 25: Handover & Return Odometer Audit
  // ----------------------------------------------------
  try {
    const auditEntries = mockDb.auditLogs.filter((a) => a.entityName === 'VehicleAssignment');
    assert(
      auditEntries.length >= 2,
      'Handover & Return Odometer Audit - Assignment creation and ending events logged to audit table',
    );
  } catch (err: any) {
    assert(false, 'Handover Audit', err.message);
  }

  // ----------------------------------------------------
  // TEST 26: Roster Pagination & Query Filtering
  // ----------------------------------------------------
  try {
    const roster = await vehiclesService.getVehicles(
      {
        status: VehicleStatus.ASSIGNED as any,
        search: 'TN01',
        page: 1,
        limit: 10,
      },
      adminUser,
    );

    assert(
      roster.total >= 1 &&
        roster.items[0].currentAssignment !== null &&
        roster.items[0].vehicleRegistrationNumber === 'TN01AB1234',
      'Roster Filtering & Pagination - Successfully filtered active ASSIGNED vehicle by search TN01',
    );
  } catch (err: any) {
    assert(false, 'Roster Filtering', err.message);
  }

  // Final Summary
  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} VEHICLE TESTS PASSED`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runVehicleTestSuite().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
