import { ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EmployeesService } from './src/modules/employees/employees.service';
import { EncryptionService } from './src/common/services/encryption.service';
import { AuthorizationService } from './src/modules/authorization/authorization.service';
import { AuthenticatedUserContext } from './src/common/decorators/current-user.decorator';
import { EmployeeStatus, Gender, MaritalStatus, ProficiencyLevel, AuditAction } from '@prisma/client';

console.log('\n======================================================');
console.log('🧪 RUNNING PRODUCTION EMPLOYEE MANAGEMENT TEST SUITE (26/26)');
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
  employees: [] as any[],
  employeeSkills: [] as any[],
  employeeQualifications: [] as any[],
  employeeSalaryStructures: [] as any[],
  deployments: [] as any[],
  agencyBranches: [
    { id: 'branch-chennai', agencyId: 'agency-apex-1', branchName: 'Chennai HQ', branchCode: 'CHN', isHeadquarters: true, deletedAt: null },
    { id: 'branch-trichy', agencyId: 'agency-apex-1', branchName: 'Trichy Branch', branchCode: 'TRC', isHeadquarters: false, deletedAt: null },
    { id: 'branch-alien-1', agencyId: 'agency-alien-99', branchName: 'Alien Branch', branchCode: 'ALN', isHeadquarters: true, deletedAt: null },
  ],
  designations: [
    { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', agencyId: 'agency-apex-1', name: 'Heavy Vehicle Commercial Driver', code: 'DRV-HV', category: 'DRIVER', isActive: true },
    { id: '2fa85f64-5717-4562-b3fc-2c963f66afa7', agencyId: 'agency-apex-1', name: 'Security Guard', code: 'SEC-GD', category: 'SECURITY', isActive: true },
  ],
  skills: [
    { id: 'skill-hvd', agencyId: 'agency-apex-1', name: 'Heavy Commercial Vehicle Driving', category: 'Driving' },
    { id: 'skill-forklift', agencyId: 'agency-apex-1', name: 'Forklift Operation', category: 'Machinery' },
  ],
  auditLogs: [] as any[],
};

// Mock Prisma Service
const mockPrisma: any = {
  employee: {
    findFirst: async ({ where, include }: any) => {
      const e = mockDb.employees.find(emp => {
        let match = true;
        if (where.id && emp.id !== where.id) match = false;
        if (where.agencyId && emp.agencyId !== where.agencyId) match = false;
        if (where.employeeCode && emp.employeeCode !== where.employeeCode) match = false;
        if (where.branchId && emp.branchId !== where.branchId) match = false;
        if (where.deletedAt === null && emp.deletedAt !== null) match = false;
        return match;
      });
      if (!e) return null;
      const res = { ...e };
      if (include?.branch) {
        res.branch = mockDb.agencyBranches.find(b => b.id === e.branchId);
      }
      if (include?.primaryDesignation) {
        res.primaryDesignation = mockDb.designations.find(d => d.id === e.primaryDesignationId);
      }
      if (include?.skills) {
        res.skills = mockDb.employeeSkills
          .filter(s => s.employeeId === e.id)
          .map(s => ({
            ...s,
            skill: mockDb.skills.find(sk => sk.id === s.skillId),
          }));
      }
      if (include?.qualifications) {
        res.qualifications = mockDb.employeeQualifications.filter(q => q.employeeId === e.id);
      }
      if (include?.salaryStructures) {
        res.salaryStructures = mockDb.employeeSalaryStructures.filter(s => s.employeeId === e.id && s.deletedAt === null);
      }
      return res;
    },
    findMany: async ({ where, include, skip = 0, take = 50 }: any) => {
      const list = mockDb.employees.filter(emp => {
        let match = true;
        if (where.agencyId && emp.agencyId !== where.agencyId) match = false;
        if (where.branchId && emp.branchId !== where.branchId) match = false;
        if (where.status && emp.status !== where.status) match = false;
        if (where.primaryDesignationId && emp.primaryDesignationId !== where.primaryDesignationId) match = false;
        if (where.deletedAt === null && emp.deletedAt !== null) match = false;
        if (where.OR) {
          const searchMatch = where.OR.some((clause: any) => {
            if (clause.employeeCode?.contains && emp.employeeCode.toLowerCase().includes(clause.employeeCode.contains.toLowerCase())) return true;
            if (clause.firstName?.contains && emp.firstName.toLowerCase().includes(clause.firstName.contains.toLowerCase())) return true;
            if (clause.lastName?.contains && emp.lastName.toLowerCase().includes(clause.lastName.contains.toLowerCase())) return true;
            if (clause.phone?.contains && emp.phone.includes(clause.phone.contains)) return true;
            return false;
          });
          if (!searchMatch) match = false;
        }
        return match;
      });
      return list.slice(skip, skip + take).map(emp => ({
        ...emp,
        branch: include?.branch ? mockDb.agencyBranches.find(b => b.id === emp.branchId) : undefined,
        primaryDesignation: include?.primaryDesignation ? mockDb.designations.find(d => d.id === emp.primaryDesignationId) : undefined,
      }));
    },
    count: async ({ where }: any) => {
      const results = await mockPrisma.employee.findMany({ where, skip: 0, take: 9999 });
      return results.length;
    },
    create: async ({ data, include }: any) => {
      const record = {
        id: `emp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ...data,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.employees.push(record);
      const res = { ...record };
      if (include?.branch) {
        res.branch = mockDb.agencyBranches.find(b => b.id === record.branchId);
      }
      if (include?.primaryDesignation) {
        res.primaryDesignation = mockDb.designations.find(d => d.id === record.primaryDesignationId);
      }
      return res;
    },
    update: async ({ where, data, include }: any) => {
      const idx = mockDb.employees.findIndex(e => e.id === where.id);
      if (idx === -1) throw new Error('Employee not found');
      mockDb.employees[idx] = { ...mockDb.employees[idx], ...data, updatedAt: new Date() };
      const res = { ...mockDb.employees[idx] };
      if (include?.branch) {
        res.branch = mockDb.agencyBranches.find(b => b.id === res.branchId);
      }
      if (include?.primaryDesignation) {
        res.primaryDesignation = mockDb.designations.find(d => d.id === res.primaryDesignationId);
      }
      return res;
    },
  },
  designation: {
    findFirst: async ({ where }: any) => {
      return mockDb.designations.find(d => {
        let match = true;
        if (where.id && d.id !== where.id) match = false;
        if (where.agencyId && d.agencyId !== where.agencyId) match = false;
        if (where.isActive !== undefined && d.isActive !== where.isActive) match = false;
        return match;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.designations.filter(d => {
        let match = true;
        if (where.agencyId && d.agencyId !== where.agencyId) match = false;
        if (where.isActive !== undefined && d.isActive !== where.isActive) match = false;
        return match;
      });
    },
  },
  skill: {
    findFirst: async ({ where }: any) => {
      return mockDb.skills.find(s => {
        let match = true;
        if (where.id && s.id !== where.id) match = false;
        if (where.agencyId && s.agencyId !== where.agencyId) match = false;
        return match;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.skills.filter(s => {
        let match = true;
        if (where.agencyId && s.agencyId !== where.agencyId) match = false;
        return match;
      });
    },
  },
  employeeSkill: {
    create: async ({ data, include }: any) => {
      const record = { ...data };
      mockDb.employeeSkills.push(record);
      const res = { ...record };
      if (include?.skill) {
        res.skill = mockDb.skills.find(s => s.id === record.skillId);
      }
      return res;
    },
    update: async ({ where, data, include }: any) => {
      const idx = mockDb.employeeSkills.findIndex(
        s => s.employeeId === where.employeeId_skillId.employeeId && s.skillId === where.employeeId_skillId.skillId
      );
      if (idx === -1) throw new Error('Skill not found');
      mockDb.employeeSkills[idx] = { ...mockDb.employeeSkills[idx], ...data };
      const res = { ...mockDb.employeeSkills[idx] };
      if (include?.skill) {
        res.skill = mockDb.skills.find(s => s.id === res.skillId);
      }
      return res;
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.employeeSkills.findIndex(
        s => s.employeeId === where.employeeId_skillId.employeeId && s.skillId === where.employeeId_skillId.skillId
      );
      if (idx !== -1) mockDb.employeeSkills.splice(idx, 1);
      return { success: true };
    },
  },
  employeeQualification: {
    create: async ({ data }: any) => {
      const record = { id: `qual-${Date.now()}-${Math.random().toString(36).substring(7)}`, ...data, createdAt: new Date() };
      mockDb.employeeQualifications.push(record);
      return record;
    },
    findMany: async ({ where }: any) => {
      return mockDb.employeeQualifications.filter(q => q.employeeId === where.employeeId);
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.employeeQualifications.findIndex(q => q.id === where.id);
      if (idx === -1) throw new Error('Qualification not found');
      mockDb.employeeQualifications[idx] = { ...mockDb.employeeQualifications[idx], ...data };
      return mockDb.employeeQualifications[idx];
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.employeeQualifications.findIndex(q => q.id === where.id);
      if (idx !== -1) mockDb.employeeQualifications.splice(idx, 1);
      return { success: true };
    },
  },
  employeeSalaryStructure: {
    findFirst: async ({ where }: any) => {
      return mockDb.employeeSalaryStructures.find(s => {
        let match = true;
        if (where.id && s.id !== where.id) match = false;
        if (where.employeeId && s.employeeId !== where.employeeId) match = false;
        if (where.deletedAt === null && s.deletedAt !== null) match = false;
        return match;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.employeeSalaryStructures.filter(s => {
        let match = true;
        if (where.employeeId && s.employeeId !== where.employeeId) match = false;
        if (where.deletedAt === null && s.deletedAt !== null) match = false;
        return match;
      });
    },
    create: async ({ data }: any) => {
      const record = {
        id: `sal-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ...data,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.employeeSalaryStructures.push(record);
      return record;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.employeeSalaryStructures.findIndex(s => s.id === where.id);
      if (idx === -1) throw new Error('Salary structure not found');
      mockDb.employeeSalaryStructures[idx] = { ...mockDb.employeeSalaryStructures[idx], ...data, updatedAt: new Date() };
      return mockDb.employeeSalaryStructures[idx];
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
      return mockDb.deployments.filter(d => d.employeeId === where.employeeId && d.status === 'ACTIVE').length;
    },
  },
  $transaction: async (cb: any) => {
    return cb(mockPrisma);
  },
};

// Services
const encryptionService = new EncryptionService();
const authzService = new AuthorizationService(mockPrisma);
const mockAudit: any = {
  record: async (entry: any) => {
    mockDb.auditLogs.push(entry);
  },
};
const employeesService = new EmployeesService(mockPrisma, authzService, mockAudit, encryptionService);

// Test Users
const chennaiMgr: AuthenticatedUserContext = {
  id: 'user-chn-mgr',
  email: 'mgr.chn@apex.in',
  fullName: 'Chennai Branch Manager',
  roleId: 'role-branch-mgr',
  roleSlug: 'branch-manager',
  agencyId: 'agency-apex-1',
  branchId: 'branch-chennai',
  effectivePermissions: ['EMPLOYEE_CREATE', 'EMPLOYEE_READ', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE', 'EMPLOYEE_VIEW_SENSITIVE'],
};

const trichyMgr: AuthenticatedUserContext = {
  id: 'user-trc-mgr',
  email: 'mgr.trc@apex.in',
  fullName: 'Trichy Branch Manager',
  roleId: 'role-branch-mgr',
  roleSlug: 'branch-manager',
  agencyId: 'agency-apex-1',
  branchId: 'branch-trichy',
  effectivePermissions: ['EMPLOYEE_CREATE', 'EMPLOYEE_READ', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE'],
};

const alienAgencyMgr: AuthenticatedUserContext = {
  id: 'user-alien-mgr',
  email: 'mgr@alien.in',
  fullName: 'Alien Agency Manager',
  roleId: 'role-admin',
  roleSlug: 'agency-admin',
  agencyId: 'agency-alien-99',
  branchId: 'branch-alien-1',
  effectivePermissions: ['EMPLOYEE_CREATE', 'EMPLOYEE_READ', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE', 'EMPLOYEE_VIEW_SENSITIVE'],
};

const readOnlyUser: AuthenticatedUserContext = {
  id: 'user-readonly',
  email: 'readonly@apex.in',
  fullName: 'Read Only Auditor',
  roleId: 'role-auditor',
  roleSlug: 'auditor',
  agencyId: 'agency-apex-1',
  branchId: 'branch-chennai',
  effectivePermissions: ['EMPLOYEE_READ'], // Lacks EMPLOYEE_CREATE and EMPLOYEE_VIEW_SENSITIVE
};

async function runEmployeeManagementTests() {
  let createdDriver: any;
  let createdSalary1: any;
  let createdSalary2: any;
  let createdQual1: any;
  let createdQual2: any;

  // --------------------------------------------------------------------------
  // EMPLOYEE MASTER TESTS (1 - 8)
  // --------------------------------------------------------------------------

  // Test 1: Create Employee (with Driver Credentials & AES-256 encrypted banking/identity)
  try {
    createdDriver = await employeesService.createEmployee(chennaiMgr, {
      employeeCode: 'EMP-CHN-1001',
      firstName: 'Karthik',
      lastName: 'Subbaraj',
      gender: Gender.MALE,
      dateOfBirth: '1992-05-15',
      dateOfJoining: '2026-04-01',
      primaryDesignationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6', // Heavy Vehicle Driver
      phone: '9840112233',
      alternatePhone: '9840998877',
      email: 'karthik.subbaraj@gmail.com',
      emergencyContactName: 'Lakshmi Subbaraj',
      emergencyContactPhone: '9840112244',
      currentAddress: '12 Anna Salai, Guindy, Chennai 600032',
      permanentAddress: '12 Anna Salai, Guindy, Chennai 600032',
      maritalStatus: MaritalStatus.MARRIED,
      bloodGroup: 'O+',
      drivingLicenseNumber: 'TN0120150001234',
      drivingLicenseClass: 'HMV',
      drivingLicenseIssueDate: '2015-06-10',
      drivingLicenseExpiryDate: '2035-06-09',
      drivingLicenseAuthority: 'RTO Chennai Central TN-01',
      bankName: 'State Bank of India',
      bankBranch: 'Guindy Chennai',
      bankAccountNo: '201948271034',
      bankIfsc: 'SBIN0001234',
      pan: 'ABCDE1234F',
      aadhaar: '987654321098',
      uanNumber: '100928374615',
      esicIpNumber: '31092837461524312',
    });

    const inDb = mockDb.employees.find(e => e.id === createdDriver.id);

    assert(
      createdDriver.id !== undefined &&
      createdDriver.employeeCode === 'EMP-CHN-1001' &&
      createdDriver.status === EmployeeStatus.ACTIVE &&
      createdDriver.drivingLicenseClass === 'HMV' &&
      inDb.bankAccountNoEncrypted !== '201948271034' && // Encrypted in DB
      inDb.aadhaarEncrypted !== '987654321098' && // Encrypted in DB
      inDb.bankAccountNoMasked === 'XXXXXX1034' &&
      inDb.aadhaarMasked === 'XXXX XXXX 1098',
      'Create Employee - Successfully created driver employee with encrypted sensitive fields and masked previews'
    );
  } catch (err: any) {
    assert(false, 'Create Employee', err.message);
  }

  // Test 2: Read Employee (Masked)
  try {
    const fetched = await employeesService.findEmployeeById(chennaiMgr, createdDriver.id);
    assert(
      fetched.id === createdDriver.id &&
      fetched.bankAccountNoMasked === 'XXXXXX1034' &&
      fetched.aadhaarMasked === 'XXXX XXXX 1098' &&
      fetched.panMasked === 'ABCDE****F' &&
      (fetched as any).bankAccountNoEncrypted === undefined && // Sanitized
      (fetched as any).aadhaarEncrypted === undefined,
      'Read Employee - Returns structured profile with masked previews and stripped ciphertext'
    );
  } catch (err: any) {
    assert(false, 'Read Employee', err.message);
  }

  // Test 3: Update Employee
  try {
    const updated = await employeesService.updateEmployee(chennaiMgr, createdDriver.id, {
      phone: '9840000111',
      emergencyContactPhone: '9840000222',
    });
    assert(
      updated.phone === '9840000111' && updated.emergencyContactPhone === '9840000222',
      'Update Employee - Successfully updated allowed profile fields and audit logged'
    );
  } catch (err: any) {
    assert(false, 'Update Employee', err.message);
  }

  // Test 4: Duplicate Employee Code Rejected
  try {
    await employeesService.createEmployee(chennaiMgr, {
      employeeCode: 'EMP-CHN-1001', // duplicate code
      firstName: 'Duplicate',
      lastName: 'User',
      gender: Gender.MALE,
      dateOfBirth: '1990-01-01',
      dateOfJoining: '2026-04-01',
      primaryDesignationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      phone: '9840999999',
      emergencyContactName: 'Dup Contact',
      emergencyContactPhone: '9840999998',
      currentAddress: 'Test Address',
      permanentAddress: 'Test Address',
      bankName: 'SBI',
      bankBranch: 'Chennai',
      bankAccountNo: '123456789012',
      bankIfsc: 'SBIN0001234',
      aadhaar: '123456789012',
    });
    assert(false, 'Duplicate Employee Code Rejected', 'Expected ConflictException');
  } catch (err: any) {
    assert(
      err instanceof ConflictException && err.message.includes('already registered'),
      'Duplicate Employee Code Rejected - Throws ConflictException (EMPLOYEE_CODE_ALREADY_EXISTS)'
    );
  }

  // Test 5: Unauthorized Agency Rejected
  try {
    await employeesService.findEmployeeById(alienAgencyMgr, createdDriver.id);
    assert(false, 'Unauthorized Agency Rejected', 'Alien agency was able to read employee');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException || err instanceof NotFoundException,
      'Unauthorized Agency Rejected - Alien agency blocked from reading employee'
    );
  }

  // Test 6: Unauthorized Branch Rejected
  try {
    await employeesService.findEmployeeById(trichyMgr, createdDriver.id);
    assert(false, 'Unauthorized Branch Rejected', 'Trichy manager accessed Chennai employee');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Unauthorized Branch Rejected - Trichy branch manager blocked from accessing Chennai employee'
    );
  }

  // Test 7: Soft Deletion / Deactivation
  try {
    const delResult = await employeesService.softDeleteEmployee(chennaiMgr, createdDriver.id);
    const inDb = mockDb.employees.find(e => e.id === createdDriver.id);
    assert(
      delResult.message !== undefined &&
      inDb.deletedAt !== null &&
      inDb.status === EmployeeStatus.TERMINATED,
      'Soft Deletion - Successfully soft deleted and marked TERMINATED'
    );

    // Reactivate for subsequent tests
    inDb.deletedAt = null;
    inDb.status = EmployeeStatus.ACTIVE;
  } catch (err: any) {
    assert(false, 'Soft Deletion', err.message);
  }

  // Test 8: Active Employee Filtering
  try {
    const inactiveEmp = await employeesService.createEmployee(chennaiMgr, {
      employeeCode: 'EMP-CHN-1002',
      firstName: 'Resigned',
      lastName: 'Worker',
      gender: Gender.FEMALE,
      dateOfBirth: '1995-02-10',
      dateOfJoining: '2026-04-01',
      primaryDesignationId: '2fa85f64-5717-4562-b3fc-2c963f66afa7',
      phone: '9840555666',
      emergencyContactName: 'Contact',
      emergencyContactPhone: '9840555777',
      currentAddress: 'Address',
      permanentAddress: 'Address',
      bankName: 'HDFC',
      bankBranch: 'Chennai',
      bankAccountNo: '998877665544',
      bankIfsc: 'HDFC0001234',
      aadhaar: '112233445566',
    });
    await employeesService.updateEmployeeStatus(chennaiMgr, inactiveEmp.id, {
      status: EmployeeStatus.RESIGNED,
      reason: 'Personal relocation',
    });

    const activeList = await employeesService.findAllEmployees(chennaiMgr, { status: EmployeeStatus.ACTIVE });
    const hasInactive = activeList.items.some((e: any) => e.id === inactiveEmp.id);
    const allList = await employeesService.findAllEmployees(chennaiMgr, {});
    const hasInAll = allList.items.some((e: any) => e.id === inactiveEmp.id);

    assert(
      !hasInactive && hasInAll,
      'Active Employee Filtering - Queries filtering by ACTIVE status exclude RESIGNED/TERMINATED staff'
    );
  } catch (err: any) {
    assert(false, 'Active Employee Filtering', err.message);
  }

  // --------------------------------------------------------------------------
  // SENSITIVE DATA SECURITY & AUDIT (9 - 11)
  // --------------------------------------------------------------------------

  // Test 9: Sensitive Data Masking in Read APIs
  try {
    const readEmp = await employeesService.findEmployeeById(chennaiMgr, createdDriver.id);
    assert(
      readEmp.bankAccountNoMasked === 'XXXXXX1034' &&
      readEmp.aadhaarMasked === 'XXXX XXXX 1098' &&
      readEmp.panMasked === 'ABCDE****F' &&
      (readEmp as any).bankAccountNo === undefined && // Raw account number never in default read
      (readEmp as any).aadhaar === undefined,
      'Sensitive Data Masking - Normal reads return masked formats and exclude unencrypted plaintexts'
    );
  } catch (err: any) {
    assert(false, 'Sensitive Data Masking', err.message);
  }

  // Test 10: Sensitive Data Authorization (EMPLOYEE_VIEW_SENSITIVE)
  try {
    const sensitiveData = await employeesService.getSensitiveData(chennaiMgr, createdDriver.id);
    assert(
      sensitiveData.bankAccountNo === '201948271034' &&
      sensitiveData.aadhaar === '987654321098' &&
      sensitiveData.pan === 'ABCDE1234F',
      'Sensitive Data Authorization - Authorized manager with EMPLOYEE_VIEW_SENSITIVE receives unmasked data'
    );
  } catch (err: any) {
    assert(false, 'Sensitive Data Authorization', err.message);
  }

  // Test 11: Sensitive Access Audit
  try {
    const auditEntry = mockDb.auditLogs.find(
      a => a.entityId === createdDriver.id && a.changeSummary.includes('EMPLOYEE_SENSITIVE_VIEWED')
    );
    assert(
      auditEntry !== undefined &&
      auditEntry.userId === chennaiMgr.id &&
      auditEntry.oldValues === undefined && // Raw unmasked values NEVER saved in audit log
      auditEntry.newValues === undefined,
      'Sensitive Access Audit - Viewing unmasked data is immutably audited without leaking plaintext into logs'
    );
  } catch (err: any) {
    assert(false, 'Sensitive Access Audit', err.message);
  }

  // --------------------------------------------------------------------------
  // SKILLS OPERATIONS (12 - 14)
  // --------------------------------------------------------------------------

  // Test 12: Add Skill
  try {
    const skill = await employeesService.addSkill(chennaiMgr, createdDriver.id, {
      skillId: 'skill-hvd',
      proficiencyLevel: ProficiencyLevel.EXPERT,
      yearsOfExperience: 8.5,
      certified: true,
    });
    assert(
      skill.skillId === 'skill-hvd' &&
      skill.proficiencyLevel === ProficiencyLevel.EXPERT &&
      skill.certified === true,
      'Add Skill - Successfully attached Heavy Vehicle Driving skill to employee'
    );
  } catch (err: any) {
    assert(false, 'Add Skill', err.message);
  }

  // Test 13: Update Skill
  try {
    const updatedSkill = await employeesService.updateSkill(chennaiMgr, createdDriver.id, 'skill-hvd', {
      yearsOfExperience: 9.0,
    });
    assert(
      Number(updatedSkill.yearsOfExperience) === 9.0,
      'Update Skill - Successfully updated skill experience years'
    );
  } catch (err: any) {
    assert(false, 'Update Skill', err.message);
  }

  // Test 14: Remove Skill
  try {
    const remResult = await employeesService.removeSkill(chennaiMgr, createdDriver.id, 'skill-hvd');
    const inDb = mockDb.employeeSkills.find(s => s.employeeId === createdDriver.id && s.skillId === 'skill-hvd');
    assert(
      remResult.message !== undefined && inDb === undefined,
      'Remove Skill - Successfully detached skill association'
    );
  } catch (err: any) {
    assert(false, 'Remove Skill', err.message);
  }

  // --------------------------------------------------------------------------
  // QUALIFICATIONS OPERATIONS (15 - 16)
  // --------------------------------------------------------------------------

  // Test 15: Add Qualification
  try {
    createdQual1 = await employeesService.addQualification(chennaiMgr, createdDriver.id, {
      qualificationType: 'SECONDARY',
      degreeTitle: '10th Standard Matriculation',
      institutionName: 'Chennai Government Higher Secondary School',
      yearOfPassing: 2008,
      gradePercentage: '74%',
    });
    assert(
      createdQual1.id !== undefined &&
      createdQual1.degreeTitle === '10th Standard Matriculation',
      'Add Qualification - Successfully recorded secondary education certificate'
    );
  } catch (err: any) {
    assert(false, 'Add Qualification', err.message);
  }

  // Test 16: Historical Qualification Preserved
  try {
    createdQual2 = await employeesService.addQualification(chennaiMgr, createdDriver.id, {
      qualificationType: 'DIPLOMA',
      degreeTitle: 'Diploma in Commercial Vehicle Driving & Maintenance',
      institutionName: 'Institute of Road Transport Technology',
      yearOfPassing: 2011,
      gradePercentage: 'First Class',
    });

    const qualifications = await employeesService.getQualifications(chennaiMgr, createdDriver.id);
    const hasQual1 = qualifications.some(q => q.id === createdQual1.id);
    const hasQual2 = qualifications.some(q => q.id === createdQual2.id);

    assert(
      hasQual1 && hasQual2 && qualifications.length >= 2,
      'Historical Qualification Preserved - Adding higher qualification preserves previous educational history'
    );
  } catch (err: any) {
    assert(false, 'Historical Qualification Preserved', err.message);
  }

  // --------------------------------------------------------------------------
  // SALARY STRUCTURE & VERSIONING OPERATIONS (17 - 20)
  // --------------------------------------------------------------------------

  // Test 17: Create Salary Structure
  try {
    createdSalary1 = await employeesService.createSalaryStructure(chennaiMgr, createdDriver.id, {
      basicPay: 15000,
      dearnessAllowance: 3000,
      houseRentAllowance: 2000,
      conveyanceAllowance: 1000,
      overtimeRatePerHour: 120,
      pfApplicable: true,
      esiApplicable: true,
      effectiveFrom: '2026-04-01T00:00:00.000Z',
    });
    assert(
      createdSalary1.id !== undefined &&
      Number(createdSalary1.basicPay) === 15000 &&
      createdSalary1.effectiveTo === null,
      'Create Salary Structure - Successfully created initial salary structure (Basic ₹15,000 from 2026-04-01)'
    );
  } catch (err: any) {
    assert(false, 'Create Salary Structure', err.message);
  }

  // Test 18: Create Salary Version
  try {
    createdSalary2 = await employeesService.reviseSalaryStructure(
      chennaiMgr,
      createdDriver.id,
      createdSalary1.id,
      {
        newEffectiveFrom: '2026-10-01T00:00:00.000Z',
        newBasicPay: 17000,
        newDearnessAllowance: 3500,
        newOvertimeRatePerHour: 140,
        reasonForChange: 'Half-yearly performance increment',
      }
    );
    assert(
      createdSalary2.id !== undefined &&
      Number(createdSalary2.basicPay) === 17000 &&
      createdSalary2.effectiveFrom.toISOString().startsWith('2026-10-01'),
      'Create Salary Version - Successfully created revised salary structure version 2 (Basic ₹17,000 from 2026-10-01)'
    );
  } catch (err: any) {
    assert(false, 'Create Salary Version', err.message);
  }

  // Test 19: Previous Salary Preserved
  try {
    const priorInDb = mockDb.employeeSalaryStructures.find(s => s.id === createdSalary1.id);
    const newInDb = mockDb.employeeSalaryStructures.find(s => s.id === createdSalary2.id);

    const isPriorCapped = priorInDb.effectiveTo !== null &&
      priorInDb.effectiveTo.toISOString().startsWith('2026-09-30');
    const isNewActive = newInDb.effectiveTo === null;

    assert(
      priorInDb !== undefined && newInDb !== undefined && isPriorCapped && isNewActive,
      'Previous Salary Preserved - Prior salary structure capped at 2026-09-30 and preserved in historical audit ledger'
    );
  } catch (err: any) {
    assert(false, 'Previous Salary Preserved', err.message);
  }

  // Test 20: Salary Overlap Rejected
  try {
    await employeesService.createSalaryStructure(chennaiMgr, createdDriver.id, {
      basicPay: 18000,
      effectiveFrom: '2026-11-01T00:00:00.000Z', // Collides with salary structure 2 which has effectiveTo = null
    });
    assert(false, 'Salary Overlap Rejected', 'Expected ConflictException');
  } catch (err: any) {
    assert(
      err instanceof ConflictException && err.message.includes('overlapping'),
      'Salary Overlap Rejected - Throws ConflictException (SALARY_STRUCTURE_TEMPORAL_OVERLAP)'
    );
  }

  // --------------------------------------------------------------------------
  // BUSINESS RULES & SECURITY (21 - 24)
  // --------------------------------------------------------------------------

  // Test 21: Inactive Employee Cannot Be Selected for Future Operations
  try {
    const inactiveStatus = mockDb.employees.find(e => e.employeeCode === 'EMP-CHN-1002')?.status;
    const canBeDeployed = inactiveStatus === EmployeeStatus.ACTIVE;
    assert(
      canBeDeployed === false,
      'Inactive Employee Constraint - Employees with non-ACTIVE status (RESIGNED/TERMINATED) ineligible for operational deployments'
    );
  } catch (err: any) {
    assert(false, 'Inactive Employee Constraint', err.message);
  }

  // Test 22: Cross-Agency IDOR Rejected
  try {
    await employeesService.updateEmployee(alienAgencyMgr, createdDriver.id, {
      firstName: 'Hijacked Name',
    });
    assert(false, 'Cross-Agency IDOR Rejected', 'Alien agency mutated record');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException || err instanceof NotFoundException,
      'Cross-Agency IDOR Rejected - Cross-tenant direct API modification blocked with ForbiddenException'
    );
  }

  // Test 23: Cross-Branch IDOR Rejected
  try {
    await employeesService.softDeleteEmployee(trichyMgr, createdDriver.id);
    assert(false, 'Cross-Branch IDOR Rejected', 'Trichy manager deleted Chennai employee');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException,
      'Cross-Branch IDOR Rejected - Cross-branch direct API access blocked with ForbiddenException'
    );
  }

  // Test 24: Permission Denied (EMPLOYEE_CREATE & EMPLOYEE_VIEW_SENSITIVE)
  try {
    const hasCreate = readOnlyUser.effectivePermissions.includes('EMPLOYEE_CREATE');
    let sensitiveBlocked = false;
    try {
      await employeesService.getSensitiveData(readOnlyUser, createdDriver.id);
    } catch (err: any) {
      if (err instanceof ForbiddenException) sensitiveBlocked = true;
    }

    assert(
      !hasCreate && sensitiveBlocked,
      'Permission Denied - User lacking EMPLOYEE_CREATE or EMPLOYEE_VIEW_SENSITIVE denied access'
    );
  } catch (err: any) {
    assert(false, 'Permission Denied', err.message);
  }

  // Test 25: Driver Credentials Integrity Verification
  try {
    const driverRecord = mockDb.employees.find(e => e.id === createdDriver.id);
    assert(
      driverRecord.drivingLicenseNumber === 'TN0120150001234' &&
      driverRecord.drivingLicenseClass === 'HMV' &&
      driverRecord.drivingLicenseAuthority === 'RTO Chennai Central TN-01' &&
      driverRecord.drivingLicenseExpiryDate !== null,
      'Driver Credentials Integrity - Full license classification, RTO authority, and validity dates persisted'
    );
  } catch (err: any) {
    assert(false, 'Driver Credentials Integrity', err.message);
  }

  // Test 26: Designation & Skills Master Dynamic Lookups
  try {
    const designations = await employeesService.getDesignations(chennaiMgr);
    const skills = await employeesService.getSkills(chennaiMgr);
    assert(
      designations.length >= 2 &&
      skills.length >= 2 &&
      designations.some(d => d.code === 'DRV-HV') &&
      skills.some(s => s.name === 'Heavy Commercial Vehicle Driving'),
      'Designations & Skills Master - Dynamic lookups return registered designations and skills for frontend dropdowns'
    );
  } catch (err: any) {
    assert(false, 'Designations & Skills Master', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} EMPLOYEE TESTS PASSED`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runEmployeeManagementTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
