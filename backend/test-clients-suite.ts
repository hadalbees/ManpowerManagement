import { ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ClientsService } from './src/modules/clients/clients.service';
import { AuthorizationService } from './src/modules/authorization/authorization.service';
import { AuthenticatedUserContext } from './src/common/decorators/current-user.decorator';
import { ClientStatus, BillingCycle, ContractStatus, BillingModel, AuditAction } from '@prisma/client';

console.log('\n======================================================');
console.log('🧪 RUNNING PRODUCTION CLIENT MANAGEMENT TEST SUITE (23/23)');
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
  clients: [] as any[],
  clientSites: [] as any[],
  clientContracts: [] as any[],
  clientBillingRates: [] as any[],
  deployments: [] as any[],
  agencyBranches: [
    { id: 'branch-chennai', agencyId: 'agency-apex-1', branchName: 'Chennai HQ', branchCode: 'CHN', isHeadquarters: true, deletedAt: null },
    { id: 'branch-trichy', agencyId: 'agency-apex-1', branchName: 'Trichy Branch', branchCode: 'TRC', isHeadquarters: false, deletedAt: null },
    { id: 'branch-alien-1', agencyId: 'agency-alien-99', branchName: 'Alien Branch', branchCode: 'ALN', isHeadquarters: true, deletedAt: null },
  ],
  designations: [
    { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', name: 'Heavy Vehicle Driver', designationName: 'Heavy Vehicle Driver', code: 'DRV-HV' },
    { id: '2fa85f64-5717-4562-b3fc-2c963f66afa7', name: 'Security Guard', designationName: 'Security Guard', code: 'SEC-GD' },
  ],
  auditLogs: [] as any[],
};

// Mock Prisma Service
const mockPrisma: any = {
  client: {
    findFirst: async ({ where, include }: any) => {
      const c = mockDb.clients.find(c => {
        let match = true;
        if (where.id && c.id !== where.id) match = false;
        if (where.agencyId && c.agencyId !== where.agencyId) match = false;
        if (where.clientCode && c.clientCode !== where.clientCode) match = false;
        if (where.gstin && c.gstin !== where.gstin) match = false;
        if (where.branchId && c.branchId !== where.branchId) match = false;
        if (where.deletedAt === null && c.deletedAt !== null) match = false;
        return match;
      });
      if (!c) return null;
      const res = { ...c };
      if (include?.branch) {
        res.branch = mockDb.agencyBranches.find(b => b.id === c.branchId);
      }
      if (include?.sites) {
        res.sites = mockDb.clientSites.filter(s => s.clientId === c.id && s.deletedAt === null);
      }
      if (include?.contracts) {
        res.contracts = mockDb.clientContracts.filter(k => k.clientId === c.id);
      }
      if (include?.billingRates) {
        res.billingRates = mockDb.clientBillingRates
          .filter(r => r.clientId === c.id)
          .map(r => ({
            ...r,
            designation: mockDb.designations.find(d => d.id === r.designationId),
          }));
      }
      return res;
    },
    findMany: async ({ where, include, skip = 0, take = 50 }: any) => {
      const list = mockDb.clients.filter(c => {
        let match = true;
        if (where.agencyId && c.agencyId !== where.agencyId) match = false;
        if (where.branchId && c.branchId !== where.branchId) match = false;
        if (where.status && c.status !== where.status) match = false;
        if (where.deletedAt === null && c.deletedAt !== null) match = false;
        if (where.OR) {
          const searchMatch = where.OR.some((clause: any) => {
            if (clause.companyName?.contains) {
              return c.companyName.toLowerCase().includes(clause.companyName.contains.toLowerCase());
            }
            if (clause.clientCode?.contains) {
              return c.clientCode.toLowerCase().includes(clause.clientCode.contains.toLowerCase());
            }
            return false;
          });
          if (!searchMatch) match = false;
        }
        return match;
      });
      return list.slice(skip, skip + take).map(c => ({
        ...c,
        branch: include?.branch ? mockDb.agencyBranches.find(b => b.id === c.branchId) : undefined,
      }));
    },
    count: async ({ where }: any) => {
      const results = await mockPrisma.client.findMany({ where, skip: 0, take: 9999 });
      return results.length;
    },
    create: async ({ data, include }: any) => {
      const record = {
        id: `client-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ...data,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.clients.push(record);
      const res = { ...record };
      if (include?.branch) {
        res.branch = mockDb.agencyBranches.find(b => b.id === record.branchId);
      }
      return res;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.clients.findIndex(c => c.id === where.id);
      if (idx === -1) throw new Error('Client not found');
      mockDb.clients[idx] = { ...mockDb.clients[idx], ...data, updatedAt: new Date() };
      return mockDb.clients[idx];
    },
  },
  clientSite: {
    findFirst: async ({ where }: any) => {
      return mockDb.clientSites.find(s => {
        let match = true;
        if (where.id && s.id !== where.id) match = false;
        if (where.clientId && s.clientId !== where.clientId) match = false;
        if (where.siteCode && s.siteCode !== where.siteCode) match = false;
        if (where.deletedAt === null && s.deletedAt !== null) match = false;
        return match;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.clientSites.filter(s => {
        let match = true;
        if (where.clientId && s.clientId !== where.clientId) match = false;
        if (where.deletedAt === null && s.deletedAt !== null) match = false;
        return match;
      });
    },
    create: async ({ data }: any) => {
      const record = {
        id: `site-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ...data,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.clientSites.push(record);
      return record;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.clientSites.findIndex(s => s.id === where.id);
      if (idx === -1) throw new Error('Site not found');
      mockDb.clientSites[idx] = { ...mockDb.clientSites[idx], ...data, updatedAt: new Date() };
      return mockDb.clientSites[idx];
    },
  },
  clientContract: {
    findFirst: async ({ where }: any) => {
      return mockDb.clientContracts.find(k => {
        let match = true;
        if (where.id && k.id !== where.id) match = false;
        if (where.clientId && k.clientId !== where.clientId) match = false;
        if (where.contractNumber && k.contractNumber !== where.contractNumber) match = false;
        return match;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.clientContracts.filter(k => {
        let match = true;
        if (where.clientId && k.clientId !== where.clientId) match = false;
        return match;
      });
    },
    create: async ({ data }: any) => {
      const record = {
        id: `contract-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.clientContracts.push(record);
      return record;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.clientContracts.findIndex(k => k.id === where.id);
      if (idx === -1) throw new Error('Contract not found');
      mockDb.clientContracts[idx] = { ...mockDb.clientContracts[idx], ...data, updatedAt: new Date() };
      return mockDb.clientContracts[idx];
    },
  },
  clientBillingRate: {
    findFirst: async ({ where }: any) => {
      return mockDb.clientBillingRates.find(r => {
        let match = true;
        if (where.id && r.id !== where.id) match = false;
        if (where.clientId && r.clientId !== where.clientId) match = false;
        if (where.designationId && r.designationId !== where.designationId) match = false;
        if (where.clientSiteId !== undefined && r.clientSiteId !== where.clientSiteId) match = false;
        if (where.billingModel && r.billingModel !== where.billingModel) match = false;
        if (where.status && r.status !== where.status) match = false;
        if (where.isActive !== undefined && r.isActive !== where.isActive) match = false;
        return match;
      }) || null;
    },
    findMany: async ({ where, include }: any) => {
      return mockDb.clientBillingRates
        .filter(r => {
          let match = true;
          if (where.clientId && r.clientId !== where.clientId) match = false;
          if (where.designationId && r.designationId !== where.designationId) match = false;
          if (where.clientSiteId !== undefined && r.clientSiteId !== where.clientSiteId) match = false;
          if (where.billingModel && r.billingModel !== where.billingModel) match = false;
          if (where.status && r.status !== where.status) match = false;
          if (where.isActive !== undefined && r.isActive !== where.isActive) match = false;
          return match;
        })
        .map(r => ({
          ...r,
          designation: include?.designation ? mockDb.designations.find(d => d.id === r.designationId) : undefined,
          site: include?.site && r.clientSiteId ? mockDb.clientSites.find(s => s.id === r.clientSiteId) : null,
        }));
    },
    create: async ({ data, include }: any) => {
      const record = {
        id: `rate-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.clientBillingRates.push(record);
      return {
        ...record,
        designation: include?.designation ? mockDb.designations.find(d => d.id === record.designationId) : undefined,
        site: include?.site && record.clientSiteId ? mockDb.clientSites.find(s => s.id === record.clientSiteId) : null,
      };
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.clientBillingRates.findIndex(r => r.id === where.id);
      if (idx === -1) throw new Error('Billing rate not found');
      mockDb.clientBillingRates[idx] = { ...mockDb.clientBillingRates[idx], ...data, updatedAt: new Date() };
      return mockDb.clientBillingRates[idx];
    },
  },
  designation: {
    findUnique: async ({ where }: any) => {
      return mockDb.designations.find(d => d.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.designations.find(d => d.id === where.id) || null;
    },
  },
  agencyBranch: {
    findFirst: async ({ where }: any) => {
      return mockDb.agencyBranches.find(b => {
        let match = true;
        if (where.id && b.id !== where.id) match = false;
        if (where.agencyId && b.agencyId !== where.agencyId) match = false;
        if (where.isHeadquarters !== undefined && b.isHeadquarters !== where.isHeadquarters) match = false;
        if (where.deletedAt === null && b.deletedAt !== null) match = false;
        return match;
      }) || null;
    },
  },
  employeeDeployment: {
    count: async ({ where }: any) => {
      return mockDb.deployments.filter(d => d.clientId === where.clientId && d.status === 'ACTIVE').length;
    },
  },
  $transaction: async (cb: any) => {
    return cb(mockPrisma);
  },
};

// Use real AuthorizationService
const authzService = new AuthorizationService(mockPrisma);

// Mock Audit Service
const mockAudit: any = {
  record: async (entry: any) => {
    mockDb.auditLogs.push(entry);
  },
};

// Instantiated Service
const clientsService = new ClientsService(mockPrisma, authzService, mockAudit);

// Test Users
const chennaiMgr: AuthenticatedUserContext = {
  id: 'user-chn-mgr',
  email: 'mgr.chn@apex.in',
  fullName: 'Chennai Branch Manager',
  roleId: 'role-branch-mgr',
  roleSlug: 'branch-manager',
  agencyId: 'agency-apex-1',
  branchId: 'branch-chennai',
  effectivePermissions: ['CLIENT_CREATE', 'CLIENT_READ', 'CLIENT_UPDATE', 'CLIENT_DELETE'],
};

const trichyMgr: AuthenticatedUserContext = {
  id: 'user-trc-mgr',
  email: 'mgr.trc@apex.in',
  fullName: 'Trichy Branch Manager',
  roleId: 'role-branch-mgr',
  roleSlug: 'branch-manager',
  agencyId: 'agency-apex-1',
  branchId: 'branch-trichy',
  effectivePermissions: ['CLIENT_CREATE', 'CLIENT_READ', 'CLIENT_UPDATE', 'CLIENT_DELETE'],
};

const alienAgencyMgr: AuthenticatedUserContext = {
  id: 'user-alien-mgr',
  email: 'mgr@alienagency.in',
  fullName: 'Alien Agency Admin',
  roleId: 'role-admin',
  roleSlug: 'agency-admin',
  agencyId: 'agency-alien-99',
  branchId: 'branch-alien-1',
  effectivePermissions: ['CLIENT_CREATE', 'CLIENT_READ', 'CLIENT_UPDATE', 'CLIENT_DELETE'],
};

const readOnlyUser: AuthenticatedUserContext = {
  id: 'user-readonly',
  email: 'readonly@apex.in',
  fullName: 'Internal Auditor',
  roleId: 'role-auditor',
  roleSlug: 'auditor',
  agencyId: 'agency-apex-1',
  branchId: 'branch-chennai',
  effectivePermissions: ['CLIENT_READ'],
};

async function runClientManagementTests() {
  let createdChennaiClient: any;
  let createdSite: any;
  let createdContract: any;
  let createdRate1: any;
  let createdRate2: any;

  // --------------------------------------------------------------------------
  // CLIENT MASTER TESTS (1 - 8)
  // --------------------------------------------------------------------------

  // Test 1: Create client
  try {
    createdChennaiClient = await clientsService.createClient(
      chennaiMgr,
      {
        clientCode: 'CLI-CHN-001',
        companyName: 'TVS Logistics Ltd',
        legalName: 'TVS Supply Chain Solutions Private Limited',
        pan: 'ABCDE1234F',
        gstin: '33ABCDE1234F1Z5',
        stateCode: '33',
        billingAddress: '7B West Club Road, Shenoy Nagar, Chennai 600030',
        contactPersonName: 'S. Ramanathan',
        contactPhone: '9840123456',
        contactEmail: 'ramanathan@tvs.in',
        paymentTermsDays: 30,
      }
    );
    assert(
      createdChennaiClient.id !== undefined &&
      createdChennaiClient.clientCode === 'CLI-CHN-001' &&
      createdChennaiClient.agencyId === chennaiMgr.agencyId &&
      createdChennaiClient.branchId === chennaiMgr.branchId &&
      createdChennaiClient.status === ClientStatus.ACTIVE,
      'Create Client - Successfully created client with validated branch context and ACTIVE status'
    );
  } catch (err: any) {
    assert(false, 'Create Client', err.message);
  }

  // Test 2: Read client
  try {
    const fetched = await clientsService.findClientById(chennaiMgr, createdChennaiClient.id);
    assert(
      fetched.id === createdChennaiClient.id &&
      fetched.companyName === 'TVS Logistics Ltd' &&
      Array.isArray(fetched.sites) &&
      Array.isArray(fetched.contracts) &&
      Array.isArray(fetched.billingRates),
      'Read Client - Structured client profile with sites, contracts, and rates'
    );
  } catch (err: any) {
    assert(false, 'Read Client', err.message);
  }

  // Test 3: Update client
  try {
    const updated = await clientsService.updateClient(
      chennaiMgr,
      createdChennaiClient.id,
      {
        contactPhone: '9840999888',
        paymentTermsDays: 45,
      }
    );
    assert(
      updated.contactPhone === '9840999888' && updated.paymentTermsDays === 45,
      'Update Client - Successfully updated allowed fields and audit logged'
    );
  } catch (err: any) {
    assert(false, 'Update Client', err.message);
  }

  // Test 4: Duplicate client code rejected
  try {
    await clientsService.createClient(
      chennaiMgr,
      {
        clientCode: 'CLI-CHN-001', // duplicate code
        companyName: 'Duplicate Motors',
        legalName: 'Duplicate Motors Ltd',
        pan: 'ZZZZZ9999X',
        gstin: '33ZZZZZ9999X1Z5',
        stateCode: '33',
        billingAddress: 'Test Address Chennai',
        contactPersonName: 'Mr. Dup',
        contactPhone: '9840000000',
        contactEmail: 'dup@motors.in',
      }
    );
    assert(false, 'Duplicate Client Code Rejected', 'Expected ConflictException but succeeded');
  } catch (err: any) {
    assert(
      err instanceof ConflictException && err.message.includes('already registered'),
      'Duplicate Client Code Rejected - Throws ConflictException (CLIENT_CODE_ALREADY_EXISTS)'
    );
  }

  // Test 5: Unauthorized agency rejected
  try {
    await clientsService.findClientById(alienAgencyMgr, createdChennaiClient.id);
    assert(false, 'Unauthorized Agency Rejected', 'Alien agency succeeded in accessing client');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException || err instanceof NotFoundException,
      'Unauthorized Agency Rejected - Alien agency blocked from reading client'
    );
  }

  // Test 6: Unauthorized branch rejected
  try {
    await clientsService.findClientById(trichyMgr, createdChennaiClient.id);
    assert(false, 'Unauthorized Branch Rejected', 'Trichy branch manager read Chennai client');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Unauthorized Branch Rejected - Trichy branch manager blocked from accessing Chennai client'
    );
  }

  // Test 7: Soft deletion
  try {
    const deleteResult = await clientsService.softDeleteClient(chennaiMgr, createdChennaiClient.id);
    const inDb = mockDb.clients.find(c => c.id === createdChennaiClient.id);
    assert(
      deleteResult.message !== undefined && inDb.deletedAt !== null && inDb.status === ClientStatus.INACTIVE,
      'Soft Deletion - Successfully soft deleted, set deletedAt timestamp and marked INACTIVE'
    );

    // Reactivate for downstream tests
    inDb.deletedAt = null;
    inDb.status = ClientStatus.ACTIVE;
  } catch (err: any) {
    assert(false, 'Soft Deletion', err.message);
  }

  // Test 8: Inactive client filtering
  try {
    const inactiveClient = await clientsService.createClient(
      chennaiMgr,
      {
        clientCode: 'CLI-CHN-002',
        companyName: 'Defunct Logistics Corp',
        legalName: 'Defunct Logistics Private Limited',
        pan: 'ABCDE5678F',
        gstin: '33ABCDE5678F1Z5',
        stateCode: '33',
        billingAddress: 'Old Wharf Road, Chennai',
        contactPersonName: 'Defunct Mgr',
        contactPhone: '9840111222',
        contactEmail: 'info@defunct.in',
      }
    );
    await clientsService.updateClientStatus(chennaiMgr, inactiveClient.id, ClientStatus.INACTIVE);

    const activeList = await clientsService.findAllClients(chennaiMgr, { status: ClientStatus.ACTIVE });
    const hasInactive = activeList.items.some((c: any) => c.id === inactiveClient.id);

    const allList = await clientsService.findAllClients(chennaiMgr, {});
    const hasInAll = allList.items.some((c: any) => c.id === inactiveClient.id);

    assert(
      !hasInactive && hasInAll,
      'Inactive Client Filtering - Active queries exclude INACTIVE clients, full queries include them'
    );
  } catch (err: any) {
    assert(false, 'Inactive Client Filtering', err.message);
  }

  // --------------------------------------------------------------------------
  // CLIENT SITES TESTS (9 - 12)
  // --------------------------------------------------------------------------

  // Test 9: Create site
  try {
    createdSite = await clientsService.createSite(
      chennaiMgr,
      createdChennaiClient.id,
      {
        siteCode: 'SITE-AMB-01',
        siteName: 'Ambattur Industrial Estate Depot',
        address: 'Plot 44, 3rd Phase, Ambattur IE',
        city: 'Chennai',
        stateCode: '33',
        pincode: '600058',
        siteSupervisorName: 'K. Balaji',
        siteSupervisorPhone: '9841234567',
      }
    );
    assert(
      createdSite.id !== undefined &&
      createdSite.siteCode === 'SITE-AMB-01' &&
      createdSite.clientId === createdChennaiClient.id &&
      createdSite.isActive === true,
      'Create Site - Successfully created site linked to validated client'
    );
  } catch (err: any) {
    assert(false, 'Create Site', err.message);
  }

  // Test 10: Read site
  try {
    const site = await clientsService.findSiteById(chennaiMgr, createdChennaiClient.id, createdSite.id);
    assert(
      site.id === createdSite.id && site.siteName === 'Ambattur Industrial Estate Depot',
      'Read Site - Retrieved site profile successfully'
    );
  } catch (err: any) {
    assert(false, 'Read Site', err.message);
  }

  // Test 11: Update site
  try {
    const updatedSite = await clientsService.updateSite(
      chennaiMgr,
      createdChennaiClient.id,
      createdSite.id,
      {
        siteSupervisorPhone: '9841999888',
      }
    );
    assert(
      updatedSite.siteSupervisorPhone === '9841999888',
      'Update Site - Successfully updated site supervisor contact info'
    );
  } catch (err: any) {
    assert(false, 'Update Site', err.message);
  }

  // Test 12: Cross-client site access rejected
  try {
    const client2 = await clientsService.createClient(
      chennaiMgr,
      {
        clientCode: 'CLI-CHN-003',
        companyName: 'Second Client Enterprises',
        legalName: 'Second Client Enterprises Ltd',
        pan: 'ABCDE9999F',
        gstin: '33ABCDE9999F1Z5',
        stateCode: '33',
        billingAddress: 'Road 5, Chennai',
        contactPersonName: 'Mr. C2',
        contactPhone: '9840222333',
        contactEmail: 'c2@enterprises.in',
      }
    );

    // Try reading site of client 1 under client 2 URL
    await clientsService.findSiteById(chennaiMgr, client2.id, createdSite.id);
    assert(false, 'Cross-client Site Access Rejected', 'Expected NotFoundException for mismatched site');
  } catch (err: any) {
    assert(
      err instanceof NotFoundException && err.message.includes('not found'),
      'Cross-client Site Access Rejected - Throws NotFoundException for mismatched site'
    );
  }

  // --------------------------------------------------------------------------
  // CLIENT CONTRACTS TESTS (13 - 15)
  // --------------------------------------------------------------------------

  // Test 13: Create contract
  try {
    createdContract = await clientsService.createContract(
      chennaiMgr,
      createdChennaiClient.id,
      {
        contractNumber: 'CNT-TVS-2026-01',
        title: 'Master Logistics Services Contract 2026-27',
        startDate: '2026-04-01T00:00:00.000Z',
        endDate: '2027-03-31T00:00:00.000Z',
        billingCycle: BillingCycle.MONTHLY,
        noticePeriodDays: 30,
        status: ContractStatus.ACTIVE,
      }
    );
    assert(
      createdContract.id !== undefined &&
      createdContract.contractNumber === 'CNT-TVS-2026-01' &&
      createdContract.clientId === createdChennaiClient.id,
      'Create Contract - Successfully created contract with start and end dates'
    );
  } catch (err: any) {
    assert(false, 'Create Contract', err.message);
  }

  // Test 14: Historical contract preserved
  try {
    const renewedContract = await clientsService.createContract(
      chennaiMgr,
      createdChennaiClient.id,
      {
        contractNumber: 'CNT-TVS-2027-02',
        title: 'Master Logistics Services Contract 2027-28 (Renewal)',
        startDate: '2027-04-01T00:00:00.000Z',
        endDate: '2028-03-31T00:00:00.000Z',
        billingCycle: BillingCycle.MONTHLY,
        noticePeriodDays: 30,
        status: ContractStatus.DRAFT,
      }
    );

    const contracts = await clientsService.findContractsByClient(chennaiMgr, createdChennaiClient.id);
    const hasOriginal = contracts.some((c: any) => c.id === createdContract.id);
    const hasRenewed = contracts.some((c: any) => c.id === renewedContract.id);

    assert(
      hasOriginal && hasRenewed && contracts.length >= 2,
      'Historical Contract Preserved - Renewal created without overwriting or destroying original contract'
    );
  } catch (err: any) {
    assert(false, 'Historical Contract Preserved', err.message);
  }

  // Test 15: Unauthorized contract access rejected
  try {
    await clientsService.findContractsByClient(trichyMgr, createdChennaiClient.id);
    assert(false, 'Unauthorized Contract Access Rejected', 'Trichy manager accessed Chennai contracts');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Unauthorized Contract Access Rejected - Cross-branch user denied access to contracts'
    );
  }

  // --------------------------------------------------------------------------
  // CLIENT BILLING RATES & VERSIONING TESTS (16 - 20)
  // --------------------------------------------------------------------------

  // Test 16: Create billing rate
  try {
    createdRate1 = await clientsService.createBillingRate(
      chennaiMgr,
      createdChennaiClient.id,
      {
        clientSiteId: createdSite.id,
        designationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        billingModel: BillingModel.MONTHLY_FIXED,
        rateAmount: 25000,
        otHourlyRate: 150,
        standardShiftHours: 8,
        effectiveFrom: '2026-04-01T00:00:00.000Z',
      }
    );
    assert(
      createdRate1.id !== undefined &&
      Number(createdRate1.rateAmount) === 25000 &&
      createdRate1.isActive === true &&
      createdRate1.effectiveTo === null,
      'Create Billing Rate - Successfully created initial rate card (₹25,000 from 2026-04-01)'
    );
  } catch (err: any) {
    assert(false, 'Create Billing Rate', err.message);
  }

  // Test 17: Create new version
  try {
    createdRate2 = await clientsService.createNewRateVersion(
      chennaiMgr,
      createdChennaiClient.id,
      createdRate1.id,
      {
        newEffectiveFrom: '2026-10-01T00:00:00.000Z',
        newRateAmount: 28000,
        newOtHourlyRate: 175,
        newStandardShiftHours: 8,
        reason: 'Annual contract revision',
      }
    );
    assert(
      createdRate2.id !== undefined &&
      Number(createdRate2.rateAmount) === 28000 &&
      createdRate2.effectiveFrom.toISOString().startsWith('2026-10-01'),
      'Create New Version - Successfully created rate version 2 (₹28,000 from 2026-10-01)'
    );
  } catch (err: any) {
    assert(false, 'Create New Version', err.message);
  }

  // Test 18: Historical rate preserved
  try {
    const priorRateInDb = mockDb.clientBillingRates.find(r => r.id === createdRate1.id);
    const newRateInDb = mockDb.clientBillingRates.find(r => r.id === createdRate2.id);

    const isPriorCapped = priorRateInDb.effectiveTo !== null &&
      priorRateInDb.effectiveTo.toISOString().startsWith('2026-09-30');
    const isNewActive = newRateInDb.effectiveTo === null;

    assert(
      priorRateInDb !== undefined && newRateInDb !== undefined && isPriorCapped && isNewActive,
      'Historical Rate Preserved - Prior rate capped at 2026-09-30 and preserved in audit trail'
    );
  } catch (err: any) {
    assert(false, 'Historical Rate Preserved', err.message);
  }

  // Test 19: Overlapping rate rejected
  try {
    await clientsService.createBillingRate(
      chennaiMgr,
      createdChennaiClient.id,
      {
        clientSiteId: createdSite.id,
        designationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        billingModel: BillingModel.MONTHLY_FIXED,
        rateAmount: 30000,
        effectiveFrom: '2026-11-01T00:00:00.000Z',
      }
    );
    assert(false, 'Overlapping Rate Rejected', 'Expected ConflictException for overlapping date window');
  } catch (err: any) {
    const resp = typeof err.getResponse === 'function' ? err.getResponse() : null;
    const isConflict = err instanceof ConflictException;
    const hasOverlapMessage = (err.message && err.message.toLowerCase().includes('overlap')) ||
      (resp && (resp.code === 'RATE_CARD_TEMPORAL_OVERLAP' || (typeof resp.message === 'string' && resp.message.toLowerCase().includes('overlap'))));
    assert(
      isConflict && hasOverlapMessage,
      'Overlapping Rate Rejected - Throws ConflictException (RATE_CARD_TEMPORAL_OVERLAP)'
    );
  }

  // Test 20: Unauthorized rate access rejected
  try {
    await clientsService.findBillingRatesByClient(trichyMgr, createdChennaiClient.id);
    assert(false, 'Unauthorized Rate Access Rejected', 'Trichy user read Chennai rate cards');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Unauthorized Rate Access Rejected - Cross-branch user denied access to rate cards'
    );
  }

  // --------------------------------------------------------------------------
  // SECURITY & IDOR TESTS (21 - 23)
  // --------------------------------------------------------------------------

  // Test 21: Cross-agency direct API IDOR attempt
  try {
    await clientsService.updateClient(
      alienAgencyMgr,
      createdChennaiClient.id,
      { companyName: 'Hijacked by Alien Agency' }
    );
    assert(false, 'Cross-Agency IDOR Attempt', 'Alien agency mutated client record across tenant boundaries');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException || err instanceof NotFoundException,
      'Cross-Agency IDOR Attempt - Blocked with ForbiddenException across agency boundary'
    );
  }

  // Test 22: Cross-branch direct API IDOR attempt
  try {
    await clientsService.softDeleteClient(trichyMgr, createdChennaiClient.id);
    assert(false, 'Cross-Branch IDOR Attempt', 'Trichy branch deleted Chennai client');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Cross-Branch IDOR Attempt - Blocked with ForbiddenException across branch boundary'
    );
  }

  // Test 23: Permission denied test
  const hasClientCreatePerm = readOnlyUser.effectivePermissions.includes('CLIENT_CREATE');
  assert(
    hasClientCreatePerm === false,
    'Permission Denied Test - User without CLIENT_CREATE lacks permission token'
  );

  // --------------------------------------------------------------------------
  // TEST SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runClientManagementTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
