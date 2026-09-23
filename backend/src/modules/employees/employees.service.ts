import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  UpdateEmployeeStatusDto,
  EmployeeQueryDto,
} from './dto/employee.dto';
import {
  AddEmployeeSkillDto,
  UpdateEmployeeSkillDto,
} from './dto/employee-skill.dto';
import {
  CreateEmployeeQualificationDto,
  UpdateEmployeeQualificationDto,
} from './dto/employee-qualification.dto';
import {
  CreateSalaryStructureDto,
  ReviseSalaryStructureDto,
} from './dto/employee-salary-structure.dto';
import { EmployeeStatus, AuditAction, Prisma } from '@prisma/client';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authzService: AuthorizationService,
    private readonly auditService: AuditService,
    private readonly encryptionService: EncryptionService,
  ) {}

  // ==========================================
  // 1. EMPLOYEE MASTER CRUD
  // ==========================================

  async createEmployee(user: AuthenticatedUserContext, dto: CreateEmployeeDto) {
    // 1. Branch scoping resolution
    let targetBranchId: string;
    if (user.branchId) {
      if (dto.branchId && dto.branchId !== user.branchId) {
        throw new ForbiddenException({
          code: 'AUTH_FORBIDDEN_BRANCH_ACCESS',
          message: 'You cannot create employees for another branch.',
        });
      }
      targetBranchId = user.branchId;
    } else {
      if (dto.branchId) {
        const branch = await this.prisma.agencyBranch.findFirst({
          where: { id: dto.branchId, agencyId: user.agencyId, deletedAt: null },
        });
        if (!branch) {
          throw new BadRequestException('The designated branch does not belong to your agency.');
        }
        targetBranchId = dto.branchId;
      } else {
        const hqBranch = await this.prisma.agencyBranch.findFirst({
          where: { agencyId: user.agencyId, isHeadquarters: true, deletedAt: null },
        });
        if (!hqBranch) {
          throw new BadRequestException('No default branch found. Please specify branchId.');
        }
        targetBranchId = hqBranch.id;
      }
    }

    // 2. Uniqueness verification for Employee Code
    const existingCode = await this.prisma.employee.findFirst({
      where: {
        agencyId: user.agencyId,
        employeeCode: dto.employeeCode.trim().toUpperCase(),
        deletedAt: null,
      },
    });

    if (existingCode) {
      throw new ConflictException({
        code: 'EMPLOYEE_CODE_ALREADY_EXISTS',
        message: `Employee code [${dto.employeeCode}] is already registered in this agency.`,
      });
    }

    // 3. Designation validation
    const designation = await this.prisma.designation.findFirst({
      where: {
        id: dto.primaryDesignationId,
        agencyId: user.agencyId,
        isActive: true,
      },
    });

    if (!designation) {
      throw new BadRequestException('Designation does not exist or is inactive.');
    }

    // 4. Encrypt sensitive identity & banking values
    const bankAccountNoEncrypted = this.encryptionService.encrypt(dto.bankAccountNo.trim());
    const bankAccountNoMasked = this.encryptionService.maskBankAccount(dto.bankAccountNo.trim());

    const aadhaarEncrypted = this.encryptionService.encrypt(dto.aadhaar.trim());
    const aadhaarMasked = this.encryptionService.maskAadhaar(dto.aadhaar.trim());

    let panEncrypted: string | null = null;
    let panMasked: string | null = null;
    if (dto.pan) {
      panEncrypted = this.encryptionService.encrypt(dto.pan.trim().toUpperCase());
      panMasked = this.encryptionService.maskPan(dto.pan.trim().toUpperCase());
    }

    // 5. Persist Employee
    const employee = await this.prisma.employee.create({
      data: {
        agencyId: user.agencyId,
        branchId: targetBranchId,
        employeeCode: dto.employeeCode.trim().toUpperCase(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        dateOfJoining: new Date(dto.dateOfJoining),
        primaryDesignationId: designation.id,
        phone: dto.phone.trim(),
        alternatePhone: dto.alternatePhone?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
        emergencyContactName: dto.emergencyContactName.trim(),
        emergencyContactPhone: dto.emergencyContactPhone.trim(),
        currentAddress: dto.currentAddress.trim(),
        permanentAddress: dto.permanentAddress.trim(),
        maritalStatus: dto.maritalStatus || null,
        bloodGroup: dto.bloodGroup?.trim().toUpperCase() || null,
        drivingLicenseNumber: dto.drivingLicenseNumber?.trim().toUpperCase() || null,
        drivingLicenseClass: dto.drivingLicenseClass?.trim().toUpperCase() || null,
        drivingLicenseIssueDate: dto.drivingLicenseIssueDate ? new Date(dto.drivingLicenseIssueDate) : null,
        drivingLicenseExpiryDate: dto.drivingLicenseExpiryDate ? new Date(dto.drivingLicenseExpiryDate) : null,
        drivingLicenseAuthority: dto.drivingLicenseAuthority?.trim() || null,
        bankName: dto.bankName.trim(),
        bankBranch: dto.bankBranch.trim(),
        bankAccountNoEncrypted,
        bankAccountNoMasked,
        bankIfsc: dto.bankIfsc.trim().toUpperCase(),
        panEncrypted,
        panMasked,
        aadhaarEncrypted,
        aadhaarMasked,
        uanNumber: dto.uanNumber?.trim() || null,
        esicIpNumber: dto.esicIpNumber?.trim() || null,
        status: EmployeeStatus.ACTIVE,
      },
      include: {
        branch: { select: { id: true, branchName: true, branchCode: true } },
        primaryDesignation: { select: { id: true, name: true, code: true, category: true } },
      },
    });

    // 6. Audit Log (Never log raw sensitive data)
    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: targetBranchId,
      userId: user.id,
      entityName: 'Employee',
      entityId: employee.id,
      action: AuditAction.CREATE,
      changeSummary: `Employee [${employee.employeeCode}] (${employee.firstName} ${employee.lastName}) registered.`,
      newValues: {
        employeeCode: employee.employeeCode,
        designation: designation.name,
        branchId: targetBranchId,
      },
    });

    return this.sanitizeEmployee(employee);
  }

  async findAllEmployees(user: AuthenticatedUserContext, query: EmployeeQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.EmployeeWhereInput = {
      deletedAt: null,
    };

    if (query.status) {
      baseWhere.status = query.status;
    }

    if (query.designationId) {
      baseWhere.primaryDesignationId = query.designationId;
    }

    if (query.search) {
      const term = query.search.trim();
      baseWhere.OR = [
        { employeeCode: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    const where = this.authzService.applyTenantFilter(user, baseWhere);

    if (query.branchId && !user.branchId) {
      where.branchId = query.branchId;
    }

    const [total, items] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, branchName: true, branchCode: true } },
          primaryDesignation: { select: { id: true, name: true, code: true, category: true } },
        },
      }),
    ]);

    return {
      items: items.map((emp) => this.sanitizeEmployee(emp)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findEmployeeById(user: AuthenticatedUserContext, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        agencyId: user.agencyId,
        deletedAt: null,
      },
      include: {
        branch: { select: { id: true, branchName: true, branchCode: true } },
        primaryDesignation: { select: { id: true, name: true, code: true, category: true } },
        skills: {
          include: { skill: { select: { id: true, name: true, category: true } } },
        },
        qualifications: {
          orderBy: { yearOfPassing: 'desc' },
        },
        salaryStructures: {
          where: { deletedAt: null },
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException({
        code: 'EMPLOYEE_NOT_FOUND',
        message: `Employee with ID [${id}] not found.`,
      });
    }

    this.authzService.validateBranchAccess(user, employee.branchId);

    return this.sanitizeEmployee(employee);
  }

  /**
   * Retrieves unmasked sensitive banking and statutory data.
   * Strictly gated by EMPLOYEE_VIEW_SENSITIVE permission and audited.
   */
  async getSensitiveData(user: AuthenticatedUserContext, id: string) {
    const hasPermission = user.effectivePermissions.includes('EMPLOYEE_VIEW_SENSITIVE') ||
      user.roleSlug === 'super-admin';

    if (!hasPermission) {
      throw new ForbiddenException({
        code: 'AUTH_FORBIDDEN_SENSITIVE_VIEW',
        message: 'You do not have permission to view unmasked sensitive employee records.',
      });
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        agencyId: user.agencyId,
        deletedAt: null,
      },
      select: {
        id: true,
        agencyId: true,
        branchId: true,
        employeeCode: true,
        bankName: true,
        bankBranch: true,
        bankAccountNoEncrypted: true,
        bankIfsc: true,
        panEncrypted: true,
        aadhaarEncrypted: true,
        uanNumber: true,
        esicIpNumber: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee record not found.');
    }

    this.authzService.validateBranchAccess(user, employee.branchId);

    // Decrypt sensitive records
    const decryptedBankAccountNo = this.encryptionService.decrypt(employee.bankAccountNoEncrypted);
    const decryptedAadhaar = this.encryptionService.decrypt(employee.aadhaarEncrypted);
    const decryptedPan = employee.panEncrypted
      ? this.encryptionService.decrypt(employee.panEncrypted)
      : null;

    // Audit log access (Never log raw sensitive values!)
    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'Employee',
      entityId: employee.id,
      action: AuditAction.OVERRIDE,
      changeSummary: `EMPLOYEE_SENSITIVE_VIEWED: Unmasked sensitive records viewed for employee [${employee.employeeCode}] by user [${user.email}].`,
    });

    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      bankName: employee.bankName,
      bankBranch: employee.bankBranch,
      bankAccountNo: decryptedBankAccountNo,
      bankIfsc: employee.bankIfsc,
      pan: decryptedPan,
      aadhaar: decryptedAadhaar,
      uanNumber: employee.uanNumber,
      esicIpNumber: employee.esicIpNumber,
    };
  }

  async updateEmployee(user: AuthenticatedUserContext, id: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, agencyId: user.agencyId, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    this.authzService.validateBranchAccess(user, employee.branchId);

    const updateData: Prisma.EmployeeUpdateInput = {};

    if (dto.firstName) updateData.firstName = dto.firstName.trim();
    if (dto.lastName) updateData.lastName = dto.lastName.trim();
    if (dto.gender) updateData.gender = dto.gender;
    if (dto.dateOfBirth) updateData.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.dateOfJoining) updateData.dateOfJoining = new Date(dto.dateOfJoining);
    if (dto.dateOfLeaving) updateData.dateOfLeaving = new Date(dto.dateOfLeaving);
    if (dto.phone) updateData.phone = dto.phone.trim();
    if (dto.alternatePhone !== undefined) updateData.alternatePhone = dto.alternatePhone?.trim() || null;
    if (dto.email !== undefined) updateData.email = dto.email?.trim().toLowerCase() || null;
    if (dto.emergencyContactName) updateData.emergencyContactName = dto.emergencyContactName.trim();
    if (dto.emergencyContactPhone) updateData.emergencyContactPhone = dto.emergencyContactPhone.trim();
    if (dto.currentAddress) updateData.currentAddress = dto.currentAddress.trim();
    if (dto.permanentAddress) updateData.permanentAddress = dto.permanentAddress.trim();
    if (dto.maritalStatus !== undefined) updateData.maritalStatus = dto.maritalStatus;
    if (dto.bloodGroup !== undefined) updateData.bloodGroup = dto.bloodGroup?.trim().toUpperCase() || null;

    // Driver details
    if (dto.drivingLicenseNumber !== undefined) updateData.drivingLicenseNumber = dto.drivingLicenseNumber?.trim().toUpperCase() || null;
    if (dto.drivingLicenseClass !== undefined) updateData.drivingLicenseClass = dto.drivingLicenseClass?.trim().toUpperCase() || null;
    if (dto.drivingLicenseIssueDate !== undefined) updateData.drivingLicenseIssueDate = dto.drivingLicenseIssueDate ? new Date(dto.drivingLicenseIssueDate) : null;
    if (dto.drivingLicenseExpiryDate !== undefined) updateData.drivingLicenseExpiryDate = dto.drivingLicenseExpiryDate ? new Date(dto.drivingLicenseExpiryDate) : null;
    if (dto.drivingLicenseAuthority !== undefined) updateData.drivingLicenseAuthority = dto.drivingLicenseAuthority?.trim() || null;

    // Primary designation change
    if (dto.primaryDesignationId) {
      const designation = await this.prisma.designation.findFirst({
        where: { id: dto.primaryDesignationId, agencyId: user.agencyId, isActive: true },
      });
      if (!designation) throw new BadRequestException('Invalid designation.');
      updateData.primaryDesignation = { connect: { id: designation.id } };
    }

    // Banking details
    if (dto.bankName) updateData.bankName = dto.bankName.trim();
    if (dto.bankBranch) updateData.bankBranch = dto.bankBranch.trim();
    if (dto.bankIfsc) updateData.bankIfsc = dto.bankIfsc.trim().toUpperCase();
    if (dto.bankAccountNo) {
      updateData.bankAccountNoEncrypted = this.encryptionService.encrypt(dto.bankAccountNo.trim());
      updateData.bankAccountNoMasked = this.encryptionService.maskBankAccount(dto.bankAccountNo.trim());
    }

    // Statutory identifiers
    if (dto.pan) {
      updateData.panEncrypted = this.encryptionService.encrypt(dto.pan.trim().toUpperCase());
      updateData.panMasked = this.encryptionService.maskPan(dto.pan.trim().toUpperCase());
    }
    if (dto.aadhaar) {
      updateData.aadhaarEncrypted = this.encryptionService.encrypt(dto.aadhaar.trim());
      updateData.aadhaarMasked = this.encryptionService.maskAadhaar(dto.aadhaar.trim());
    }
    if (dto.uanNumber !== undefined) updateData.uanNumber = dto.uanNumber?.trim() || null;
    if (dto.esicIpNumber !== undefined) updateData.esicIpNumber = dto.esicIpNumber?.trim() || null;

    const updated = await this.prisma.employee.update({
      where: { id: employee.id },
      data: updateData,
      include: {
        branch: { select: { id: true, branchName: true, branchCode: true } },
        primaryDesignation: { select: { id: true, name: true, code: true, category: true } },
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'Employee',
      entityId: employee.id,
      action: AuditAction.UPDATE,
      changeSummary: `Employee profile updated for [${employee.employeeCode}].`,
    });

    return this.sanitizeEmployee(updated);
  }

  async updateEmployeeStatus(user: AuthenticatedUserContext, id: string, dto: UpdateEmployeeStatusDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, agencyId: user.agencyId, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    this.authzService.validateBranchAccess(user, employee.branchId);

    const updateData: Prisma.EmployeeUpdateInput = {
      status: dto.status,
    };

    if (dto.dateOfLeaving) {
      updateData.dateOfLeaving = new Date(dto.dateOfLeaving);
    } else if (dto.status === EmployeeStatus.TERMINATED || dto.status === EmployeeStatus.RESIGNED) {
      updateData.dateOfLeaving = new Date();
    }

    const updated = await this.prisma.employee.update({
      where: { id: employee.id },
      data: updateData,
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'Employee',
      entityId: employee.id,
      action: AuditAction.UPDATE,
      changeSummary: `Employee status changed from [${employee.status}] to [${dto.status}]. Reason: ${dto.reason || 'N/A'}`,
    });

    return {
      id: updated.id,
      employeeCode: updated.employeeCode,
      status: updated.status,
      dateOfLeaving: updated.dateOfLeaving,
    };
  }

  async softDeleteEmployee(user: AuthenticatedUserContext, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, agencyId: user.agencyId, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    this.authzService.validateBranchAccess(user, employee.branchId);

    // Business Rule: Check for active deployments
    const activeDeploymentsCount = await this.prisma.employeeDeployment.count({
      where: {
        employeeId: id,
        status: 'ACTIVE',
      },
    });

    if (activeDeploymentsCount > 0) {
      throw new BadRequestException({
        code: 'EMPLOYEE_HAS_ACTIVE_DEPLOYMENTS',
        message: 'Cannot delete or deactivate an employee with active client deployments. Please reassign or conclude active deployments first.',
      });
    }

    await this.prisma.employee.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: EmployeeStatus.TERMINATED,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'Employee',
      entityId: id,
      action: AuditAction.DELETE,
      changeSummary: `Employee [${employee.employeeCode}] soft-deleted and marked as TERMINATED.`,
    });

    return {
      message: `Employee [${employee.employeeCode}] has been deactivated and soft-deleted successfully.`,
    };
  }

  // ==========================================
  // 2. SKILL OPERATIONS
  // ==========================================

  async addSkill(user: AuthenticatedUserContext, employeeId: string, dto: AddEmployeeSkillDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    this.authzService.validateBranchAccess(user, employee.branchId);

    const skill = await this.prisma.skill.findFirst({
      where: { id: dto.skillId, agencyId: user.agencyId },
    });
    if (!skill) throw new BadRequestException('Skill does not exist in this agency.');

    const employeeSkill = await this.prisma.employeeSkill.create({
      data: {
        employeeId: employee.id,
        skillId: skill.id,
        proficiencyLevel: dto.proficiencyLevel,
        yearsOfExperience: dto.yearsOfExperience ?? 0,
        certified: dto.certified ?? false,
      },
      include: {
        skill: { select: { id: true, name: true, category: true } },
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'EmployeeSkill',
      entityId: `${employee.id}:${skill.id}`,
      action: AuditAction.CREATE,
      changeSummary: `Skill [${skill.name}] added for employee [${employee.employeeCode}].`,
    });

    return employeeSkill;
  }

  async updateSkill(
    user: AuthenticatedUserContext,
    employeeId: string,
    skillId: string,
    dto: UpdateEmployeeSkillDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    this.authzService.validateBranchAccess(user, employee.branchId);

    const updated = await this.prisma.employeeSkill.update({
      where: {
        employeeId_skillId: { employeeId: employee.id, skillId },
      },
      data: {
        proficiencyLevel: dto.proficiencyLevel,
        yearsOfExperience: dto.yearsOfExperience,
        certified: dto.certified,
      },
      include: {
        skill: { select: { id: true, name: true, category: true } },
      },
    });

    return updated;
  }

  async removeSkill(user: AuthenticatedUserContext, employeeId: string, skillId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    this.authzService.validateBranchAccess(user, employee.branchId);

    await this.prisma.employeeSkill.delete({
      where: {
        employeeId_skillId: { employeeId: employee.id, skillId },
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'EmployeeSkill',
      entityId: `${employee.id}:${skillId}`,
      action: AuditAction.DELETE,
      changeSummary: `Skill removed for employee [${employee.employeeCode}].`,
    });

    return { message: 'Skill removed successfully.' };
  }

  // ==========================================
  // 3. QUALIFICATION OPERATIONS
  // ==========================================

  async addQualification(
    user: AuthenticatedUserContext,
    employeeId: string,
    dto: CreateEmployeeQualificationDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    this.authzService.validateBranchAccess(user, employee.branchId);

    const qualification = await this.prisma.employeeQualification.create({
      data: {
        employeeId: employee.id,
        qualificationType: dto.qualificationType.trim(),
        degreeTitle: dto.degreeTitle.trim(),
        institutionName: dto.institutionName.trim(),
        yearOfPassing: dto.yearOfPassing,
        gradePercentage: dto.gradePercentage?.trim() || null,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'EmployeeQualification',
      entityId: qualification.id,
      action: AuditAction.CREATE,
      changeSummary: `Qualification [${qualification.degreeTitle}] added for employee [${employee.employeeCode}].`,
    });

    return qualification;
  }

  async getQualifications(user: AuthenticatedUserContext, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    this.authzService.validateBranchAccess(user, employee.branchId);

    return this.prisma.employeeQualification.findMany({
      where: { employeeId: employee.id },
      orderBy: { yearOfPassing: 'desc' },
    });
  }

  async updateQualification(
    user: AuthenticatedUserContext,
    employeeId: string,
    qualId: string,
    dto: UpdateEmployeeQualificationDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    this.authzService.validateBranchAccess(user, employee.branchId);

    const updated = await this.prisma.employeeQualification.update({
      where: { id: qualId },
      data: {
        qualificationType: dto.qualificationType?.trim(),
        degreeTitle: dto.degreeTitle?.trim(),
        institutionName: dto.institutionName?.trim(),
        yearOfPassing: dto.yearOfPassing,
        gradePercentage: dto.gradePercentage?.trim(),
      },
    });

    return updated;
  }

  async removeQualification(user: AuthenticatedUserContext, employeeId: string, qualId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    this.authzService.validateBranchAccess(user, employee.branchId);

    await this.prisma.employeeQualification.delete({
      where: { id: qualId },
    });

    return { message: 'Qualification removed successfully.' };
  }

  // ==========================================
  // 4. SALARY STRUCTURE OPERATIONS & VERSIONING
  // ==========================================

  async getSalaryStructures(user: AuthenticatedUserContext, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    this.authzService.validateBranchAccess(user, employee.branchId);

    return this.prisma.employeeSalaryStructure.findMany({
      where: { employeeId: employee.id, deletedAt: null },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async createSalaryStructure(
    user: AuthenticatedUserContext,
    employeeId: string,
    dto: CreateSalaryStructureDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    this.authzService.validateBranchAccess(user, employee.branchId);

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new BadRequestException('Effective to date must be strictly after effective from date.');
    }

    // Check temporal overlap with existing active structures
    const existingStructures = await this.prisma.employeeSalaryStructure.findMany({
      where: { employeeId: employee.id, deletedAt: null },
    });

    const newFromTime = effectiveFrom.getTime();
    const newToTime = effectiveTo ? effectiveTo.getTime() : Infinity;

    for (const s of existingStructures) {
      const sFromTime = new Date(s.effectiveFrom).getTime();
      const sToTime = s.effectiveTo ? new Date(s.effectiveTo).getTime() : Infinity;

      if (newFromTime <= sToTime && newToTime >= sFromTime) {
        throw new ConflictException({
          code: 'SALARY_STRUCTURE_TEMPORAL_OVERLAP',
          message: 'An active salary structure already exists for this employee in an overlapping date window. Use reviseSalaryStructure to supersede an existing structure.',
        });
      }
    }

    const structure = await this.prisma.employeeSalaryStructure.create({
      data: {
        employeeId: employee.id,
        basicPay: dto.basicPay,
        dearnessAllowance: dto.dearnessAllowance ?? 0,
        houseRentAllowance: dto.houseRentAllowance ?? 0,
        conveyanceAllowance: dto.conveyanceAllowance ?? 0,
        specialAllowance: dto.specialAllowance ?? 0,
        overtimeRatePerHour: dto.overtimeRatePerHour ?? 0,
        pfApplicable: dto.pfApplicable ?? true,
        pfOptOutRule: dto.pfOptOutRule || null,
        esiApplicable: dto.esiApplicable ?? true,
        ptApplicable: dto.ptApplicable ?? true,
        lwfApplicable: dto.lwfApplicable ?? true,
        effectiveFrom,
        effectiveTo,
        reasonForChange: dto.reasonForChange || 'Initial salary structure',
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'EmployeeSalaryStructure',
      entityId: structure.id,
      action: AuditAction.CREATE,
      changeSummary: `Salary structure created for [${employee.employeeCode}]: Basic ₹${dto.basicPay} effective ${dto.effectiveFrom}`,
    });

    return structure;
  }

  /**
   * Revises an existing salary structure by closing the active record
   * on the day before the new rate begins and opening the new active structure atomically.
   */
  async reviseSalaryStructure(
    user: AuthenticatedUserContext,
    employeeId: string,
    structureId: string,
    dto: ReviseSalaryStructureDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    this.authzService.validateBranchAccess(user, employee.branchId);

    const oldStructure = await this.prisma.employeeSalaryStructure.findFirst({
      where: { id: structureId, employeeId: employee.id, deletedAt: null },
    });

    if (!oldStructure) {
      throw new NotFoundException('Existing salary structure not found.');
    }

    const newFrom = new Date(dto.newEffectiveFrom);
    if (newFrom <= new Date(oldStructure.effectiveFrom)) {
      throw new BadRequestException({
        code: 'INVALID_REVISION_DATE',
        message: `New effective date [${dto.newEffectiveFrom}] must be strictly after previous effective start date [${oldStructure.effectiveFrom.toISOString().slice(0, 10)}].`,
      });
    }

    // Previous structure closes the day before the new structure starts
    const dayBefore = new Date(newFrom.getTime() - 24 * 60 * 60 * 1000);

    const newStructure = await this.prisma.$transaction(async (tx) => {
      // 1. Close previous active structure
      await tx.employeeSalaryStructure.update({
        where: { id: oldStructure.id },
        data: {
          effectiveTo: dayBefore,
        },
      });

      // 2. Insert new active structure
      return tx.employeeSalaryStructure.create({
        data: {
          employeeId: employee.id,
          basicPay: dto.newBasicPay,
          dearnessAllowance: dto.newDearnessAllowance ?? Number(oldStructure.dearnessAllowance),
          houseRentAllowance: dto.newHouseRentAllowance ?? Number(oldStructure.houseRentAllowance),
          conveyanceAllowance: dto.newConveyanceAllowance ?? Number(oldStructure.conveyanceAllowance),
          specialAllowance: dto.newSpecialAllowance ?? Number(oldStructure.specialAllowance),
          overtimeRatePerHour: dto.newOvertimeRatePerHour ?? Number(oldStructure.overtimeRatePerHour),
          pfApplicable: dto.pfApplicable !== undefined ? dto.pfApplicable : oldStructure.pfApplicable,
          esiApplicable: dto.esiApplicable !== undefined ? dto.esiApplicable : oldStructure.esiApplicable,
          ptApplicable: dto.ptApplicable !== undefined ? dto.ptApplicable : oldStructure.ptApplicable,
          lwfApplicable: dto.lwfApplicable !== undefined ? dto.lwfApplicable : oldStructure.lwfApplicable,
          effectiveFrom: newFrom,
          effectiveTo: null, // Open-ended active structure
          reasonForChange: dto.reasonForChange || 'Annual revision / increment',
        },
      });
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'EmployeeSalaryStructure',
      entityId: newStructure.id,
      action: AuditAction.UPDATE,
      changeSummary: `Salary revision for [${employee.employeeCode}]: Basic ₹${oldStructure.basicPay} -> ₹${dto.newBasicPay} effective ${dto.newEffectiveFrom}`,
      oldValues: { basicPay: oldStructure.basicPay, effectiveTo: dayBefore },
      newValues: { basicPay: newStructure.basicPay, effectiveFrom: newStructure.effectiveFrom },
    });

    return newStructure;
  }

  // ==========================================
  // 5. MASTER DATA LOOKUPS (DESIGNATIONS & SKILLS)
  // ==========================================

  async getDesignations(user: AuthenticatedUserContext) {
    return this.prisma.designation.findMany({
      where: {
        agencyId: user.agencyId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getSkills(user: AuthenticatedUserContext) {
    return this.prisma.skill.findMany({
      where: {
        agencyId: user.agencyId,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ==========================================
  // VEHICLE ASSIGNMENT HISTORY
  // ==========================================

  async getVehicleHistory(user: AuthenticatedUserContext, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId: user.agencyId, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    this.authzService.validateBranchAccess(user, employee.branchId);

    return this.prisma.vehicleAssignment.findMany({
      where: { employeeId, deletedAt: null },
      orderBy: { startDatetime: 'desc' },
      include: {
        vehicle: {
          select: {
            id: true,
            vehicleRegistrationNumber: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleType: true,
            fuelType: true,
            status: true,
          },
        },
        clientSite: {
          select: { id: true, siteName: true, siteCode: true },
        },
        assignedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  // ==========================================
  // HELPER: SANITIZATION
  // ==========================================

  private sanitizeEmployee(employee: any) {
    const {
      bankAccountNoEncrypted,
      aadhaarEncrypted,
      panEncrypted,
      ...safeFields
    } = employee;
    return safeFields;
  }
}
