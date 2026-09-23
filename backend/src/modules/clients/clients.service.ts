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
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientQueryDto,
} from './dto/client.dto';
import {
  CreateClientSiteDto,
  UpdateClientSiteDto,
} from './dto/client-site.dto';
import {
  CreateClientContractDto,
  UpdateClientContractDto,
} from './dto/client-contract.dto';
import {
  CreateClientBillingRateDto,
  CreateRateVersionDto,
  UpdateClientBillingRateDto,
} from './dto/client-billing-rate.dto';
import { ClientStatus, AuditAction, Prisma } from '@prisma/client';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authzService: AuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================
  // 1. CLIENT MASTER OPERATIONS
  // ==========================================

  async createClient(user: AuthenticatedUserContext, dto: CreateClientDto) {
    // 1. Branch scoping resolution
    let targetBranchId: string;
    if (user.branchId) {
      if (dto.branchId && dto.branchId !== user.branchId) {
        throw new ForbiddenException({
          code: 'AUTH_FORBIDDEN_BRANCH_ACCESS',
          message: 'You cannot create clients for another branch.',
        });
      }
      targetBranchId = user.branchId;
    } else {
      // Agency-wide user can designate a branch, or default to agency HQ
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

    // 2. Uniqueness checks
    const existingCode = await this.prisma.client.findFirst({
      where: {
        agencyId: user.agencyId,
        clientCode: dto.clientCode.trim().toUpperCase(),
        deletedAt: null,
      },
    });
    if (existingCode) {
      throw new ConflictException({
        code: 'CLIENT_CODE_ALREADY_EXISTS',
        message: `Client code [${dto.clientCode}] is already registered in this agency.`,
      });
    }

    const existingGstin = await this.prisma.client.findFirst({
      where: {
        agencyId: user.agencyId,
        gstin: dto.gstin.trim().toUpperCase(),
        deletedAt: null,
      },
    });
    if (existingGstin) {
      throw new ConflictException({
        code: 'CLIENT_GSTIN_ALREADY_EXISTS',
        message: `A client with GSTIN [${dto.gstin}] is already registered.`,
      });
    }

    // 3. Create client
    const client = await this.prisma.client.create({
      data: {
        agencyId: user.agencyId,
        branchId: targetBranchId,
        clientCode: dto.clientCode.trim().toUpperCase(),
        companyName: dto.companyName.trim(),
        legalName: dto.legalName.trim(),
        pan: dto.pan.trim().toUpperCase(),
        gstin: dto.gstin.trim().toUpperCase(),
        stateCode: dto.stateCode.trim(),
        billingAddress: dto.billingAddress.trim(),
        contactPersonName: dto.contactPersonName.trim(),
        contactEmail: dto.contactEmail.trim().toLowerCase(),
        contactPhone: dto.contactPhone.trim(),
        paymentTermsDays: dto.paymentTermsDays ?? 30,
        status: ClientStatus.ACTIVE,
      },
      include: {
        branch: {
          select: { id: true, branchName: true, branchCode: true },
        },
      },
    });

    // 4. Record Audit Log
    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: targetBranchId,
      userId: user.id,
      entityName: 'Client',
      entityId: client.id,
      action: AuditAction.CREATE,
      changeSummary: `Client [${client.companyName}] created with code [${client.clientCode}]`,
      newValues: { clientCode: client.clientCode, companyName: client.companyName },
    });

    return client;
  }

  async findAllClients(user: AuthenticatedUserContext, query: ClientQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    // Apply baseline tenant filter (guarantees agencyId & branchId for branch-scoped users)
    const where: Prisma.ClientWhereInput = this.authzService.applyTenantFilter(user, {
      deletedAt: null,
    });

    // Optional authorized branch filter for agency-wide users
    if (query.branchId) {
      this.authzService.validateBranchAccess(user, query.branchId);
      where.branchId = query.branchId;
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // Search
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { companyName: { contains: s, mode: 'insensitive' } },
        { legalName: { contains: s, mode: 'insensitive' } },
        { clientCode: { contains: s, mode: 'insensitive' } },
        { gstin: { contains: s, mode: 'insensitive' } },
        { pan: { contains: s, mode: 'insensitive' } },
        { contactPersonName: { contains: s, mode: 'insensitive' } },
        { contactEmail: { contains: s, mode: 'insensitive' } },
        { contactPhone: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: {
            select: { id: true, branchName: true, branchCode: true },
          },
          _count: {
            select: {
              sites: { where: { deletedAt: null } },
              contracts: { where: { deletedAt: null } },
              billingRates: { where: { deletedAt: null, isActive: true } },
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findClientById(user: AuthenticatedUserContext, id: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        agencyId: user.agencyId,
        deletedAt: null,
      },
      include: {
        branch: {
          select: { id: true, branchName: true, branchCode: true, city: true },
        },
        sites: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        contracts: {
          where: { deletedAt: null },
          orderBy: { startDate: 'desc' },
        },
        billingRates: {
          where: { deletedAt: null },
          orderBy: [{ designationId: 'asc' }, { effectiveFrom: 'desc' }],
          include: {
            designation: {
              select: { id: true, name: true, code: true, category: true },
            },
            clientSite: {
              select: { id: true, siteName: true, siteCode: true },
            },
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException({
        code: 'CLIENT_NOT_FOUND',
        message: 'Client not found or has been deactivated.',
      });
    }

    // Branch isolation check
    this.authzService.validateBranchAccess(user, client.branchId);

    return client;
  }

  async updateClient(user: AuthenticatedUserContext, id: string, dto: UpdateClientDto) {
    const client = await this.findClientById(user, id);

    // If branchId is changing, ensure user has agency-wide authorization
    let targetBranchId = client.branchId;
    if (dto.branchId && dto.branchId !== client.branchId) {
      if (user.branchId) {
        throw new ForbiddenException({
          code: 'AUTH_FORBIDDEN_BRANCH_TRANSFER',
          message: 'Branch-scoped users cannot transfer clients between branches.',
        });
      }
      const branchExists = await this.prisma.agencyBranch.findFirst({
        where: { id: dto.branchId, agencyId: user.agencyId, deletedAt: null },
      });
      if (!branchExists) {
        throw new BadRequestException('Target branch is invalid.');
      }
      targetBranchId = dto.branchId;
    }

    const updated = await this.prisma.client.update({
      where: { id: client.id },
      data: {
        companyName: dto.companyName?.trim() ?? client.companyName,
        legalName: dto.legalName?.trim() ?? client.legalName,
        billingAddress: dto.billingAddress?.trim() ?? client.billingAddress,
        contactPersonName: dto.contactPersonName?.trim() ?? client.contactPersonName,
        contactEmail: dto.contactEmail?.trim().toLowerCase() ?? client.contactEmail,
        contactPhone: dto.contactPhone?.trim() ?? client.contactPhone,
        paymentTermsDays: dto.paymentTermsDays ?? client.paymentTermsDays,
        branchId: targetBranchId,
      },
      include: {
        branch: { select: { id: true, branchName: true, branchCode: true } },
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: updated.branchId,
      userId: user.id,
      entityName: 'Client',
      entityId: updated.id,
      action: AuditAction.UPDATE,
      changeSummary: `Client [${updated.companyName}] details updated`,
      oldValues: { companyName: client.companyName, contactEmail: client.contactEmail },
      newValues: { companyName: updated.companyName, contactEmail: updated.contactEmail },
    });

    return updated;
  }

  async updateClientStatus(user: AuthenticatedUserContext, id: string, status: ClientStatus) {
    const client = await this.findClientById(user, id);

    const updated = await this.prisma.client.update({
      where: { id: client.id },
      data: { status },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: client.branchId,
      userId: user.id,
      entityName: 'Client',
      entityId: client.id,
      action: AuditAction.UPDATE,
      changeSummary: `Client status changed from ${client.status} to ${status}`,
      oldValues: { status: client.status },
      newValues: { status },
    });

    return updated;
  }

  async softDeleteClient(user: AuthenticatedUserContext, id: string) {
    const client = await this.findClientById(user, id);

    // Business rule: Check if client has active deployments
    const activeDeploymentsCount = await this.prisma.employeeDeployment.count({
      where: {
        clientId: client.id,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (activeDeploymentsCount > 0) {
      throw new BadRequestException({
        code: 'CLIENT_HAS_ACTIVE_DEPLOYMENTS',
        message: `Cannot deactivate client with ${activeDeploymentsCount} active worker deployment(s). Reassign or conclude deployments first.`,
      });
    }

    // Soft delete
    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        deletedAt: new Date(),
        status: ClientStatus.INACTIVE,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: client.branchId,
      userId: user.id,
      entityName: 'Client',
      entityId: client.id,
      action: AuditAction.DELETE,
      changeSummary: `Client [${client.companyName}] soft-deleted`,
    });

    return { message: 'Client soft-deleted successfully' };
  }

  // ==========================================
  // 2. CLIENT SITE OPERATIONS
  // ==========================================

  async createSite(user: AuthenticatedUserContext, clientId: string, dto: CreateClientSiteDto) {
    const client = await this.findClientById(user, clientId);

    // Verify site code uniqueness under this client
    const existingSite = await this.prisma.clientSite.findFirst({
      where: {
        clientId: client.id,
        siteCode: dto.siteCode.trim().toUpperCase(),
        deletedAt: null,
      },
    });

    if (existingSite) {
      throw new ConflictException({
        code: 'SITE_CODE_ALREADY_EXISTS',
        message: `Site code [${dto.siteCode}] already exists for this client.`,
      });
    }

    const site = await this.prisma.clientSite.create({
      data: {
        clientId: client.id,
        siteCode: dto.siteCode.trim().toUpperCase(),
        siteName: dto.siteName.trim(),
        address: dto.address.trim(),
        city: dto.city.trim(),
        stateCode: dto.stateCode.trim(),
        pincode: dto.pincode.trim(),
        siteSupervisorName: dto.siteSupervisorName?.trim() || null,
        siteSupervisorPhone: dto.siteSupervisorPhone?.trim() || null,
        isActive: true,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: client.branchId,
      userId: user.id,
      entityName: 'ClientSite',
      entityId: site.id,
      action: AuditAction.CREATE,
      changeSummary: `Site [${site.siteName}] created for client [${client.companyName}]`,
      newValues: { siteCode: site.siteCode, siteName: site.siteName },
    });

    return site;
  }

  async findSitesByClient(user: AuthenticatedUserContext, clientId: string) {
    const client = await this.findClientById(user, clientId);
    return this.prisma.clientSite.findMany({
      where: {
        clientId: client.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSiteById(user: AuthenticatedUserContext, clientId: string, siteId: string) {
    await this.findClientById(user, clientId);

    const site = await this.prisma.clientSite.findFirst({
      where: {
        id: siteId,
        clientId,
        deletedAt: null,
      },
    });

    if (!site) {
      throw new NotFoundException({
        code: 'SITE_NOT_FOUND',
        message: 'Client site not found or has been deactivated.',
      });
    }

    return site;
  }

  async updateSite(
    user: AuthenticatedUserContext,
    clientId: string,
    siteId: string,
    dto: UpdateClientSiteDto,
  ) {
    const site = await this.findSiteById(user, clientId, siteId);

    const updated = await this.prisma.clientSite.update({
      where: { id: site.id },
      data: {
        siteName: dto.siteName?.trim() ?? site.siteName,
        address: dto.address?.trim() ?? site.address,
        city: dto.city?.trim() ?? site.city,
        stateCode: dto.stateCode?.trim() ?? site.stateCode,
        pincode: dto.pincode?.trim() ?? site.pincode,
        siteSupervisorName: dto.siteSupervisorName !== undefined ? dto.siteSupervisorName?.trim() : site.siteSupervisorName,
        siteSupervisorPhone: dto.siteSupervisorPhone !== undefined ? dto.siteSupervisorPhone?.trim() : site.siteSupervisorPhone,
        isActive: dto.isActive !== undefined ? dto.isActive : site.isActive,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: user.branchId,
      userId: user.id,
      entityName: 'ClientSite',
      entityId: updated.id,
      action: AuditAction.UPDATE,
      changeSummary: `Site [${updated.siteName}] updated`,
    });

    return updated;
  }

  async deleteSite(user: AuthenticatedUserContext, clientId: string, siteId: string) {
    const site = await this.findSiteById(user, clientId, siteId);

    // Verify no active deployments at this site
    const activeDeployments = await this.prisma.employeeDeployment.count({
      where: { clientSiteId: site.id, status: 'ACTIVE', deletedAt: null },
    });
    if (activeDeployments > 0) {
      throw new BadRequestException({
        code: 'SITE_HAS_ACTIVE_DEPLOYMENTS',
        message: `Cannot delete site with ${activeDeployments} active worker deployment(s).`,
      });
    }

    await this.prisma.clientSite.update({
      where: { id: site.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: user.branchId,
      userId: user.id,
      entityName: 'ClientSite',
      entityId: site.id,
      action: AuditAction.DELETE,
      changeSummary: `Site [${site.siteName}] soft-deleted`,
    });

    return { message: 'Site deactivated successfully' };
  }

  // ==========================================
  // 3. CLIENT CONTRACT OPERATIONS
  // ==========================================

  async createContract(user: AuthenticatedUserContext, clientId: string, dto: CreateClientContractDto) {
    const client = await this.findClientById(user, clientId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (startDate >= endDate) {
      throw new BadRequestException('Contract start date must be before end date.');
    }

    // Check contract number uniqueness
    const existing = await this.prisma.clientContract.findFirst({
      where: {
        clientId: client.id,
        contractNumber: dto.contractNumber.trim().toUpperCase(),
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONTRACT_NUMBER_ALREADY_EXISTS',
        message: `Contract number [${dto.contractNumber}] already exists for this client.`,
      });
    }

    const contract = await this.prisma.clientContract.create({
      data: {
        clientId: client.id,
        contractNumber: dto.contractNumber.trim().toUpperCase(),
        title: dto.title.trim(),
        startDate,
        endDate,
        noticePeriodDays: dto.noticePeriodDays ?? 30,
        billingCycle: dto.billingCycle ?? 'MONTHLY',
        status: dto.status ?? 'ACTIVE',
        autoRenew: dto.autoRenew ?? false,
        notes: dto.notes?.trim() || null,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: client.branchId,
      userId: user.id,
      entityName: 'ClientContract',
      entityId: contract.id,
      action: AuditAction.CREATE,
      changeSummary: `Contract [${contract.contractNumber}] created (${dto.startDate} to ${dto.endDate})`,
    });

    return contract;
  }

  async findContractsByClient(user: AuthenticatedUserContext, clientId: string) {
    const client = await this.findClientById(user, clientId);
    return this.prisma.clientContract.findMany({
      where: {
        clientId: client.id,
        deletedAt: null,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async updateContract(
    user: AuthenticatedUserContext,
    clientId: string,
    contractId: string,
    dto: UpdateClientContractDto,
  ) {
    await this.findClientById(user, clientId);

    const contract = await this.prisma.clientContract.findFirst({
      where: { id: contractId, clientId, deletedAt: null },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found.');
    }

    const updated = await this.prisma.clientContract.update({
      where: { id: contract.id },
      data: {
        title: dto.title?.trim() ?? contract.title,
        endDate: dto.endDate ? new Date(dto.endDate) : contract.endDate,
        noticePeriodDays: dto.noticePeriodDays ?? contract.noticePeriodDays,
        billingCycle: dto.billingCycle ?? contract.billingCycle,
        status: dto.status ?? contract.status,
        autoRenew: dto.autoRenew !== undefined ? dto.autoRenew : contract.autoRenew,
        notes: dto.notes !== undefined ? dto.notes?.trim() : contract.notes,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: user.branchId,
      userId: user.id,
      entityName: 'ClientContract',
      entityId: updated.id,
      action: AuditAction.UPDATE,
      changeSummary: `Contract [${updated.contractNumber}] updated`,
    });

    return updated;
  }

  // ==========================================
  // 4. CLIENT BILLING RATES & VERSIONING
  // ==========================================

  async createBillingRate(user: AuthenticatedUserContext, clientId: string, dto: CreateClientBillingRateDto) {
    const client = await this.findClientById(user, clientId);

    // Verify designation exists in agency
    const designation = await this.prisma.designation.findFirst({
      where: { id: dto.designationId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!designation) {
      throw new BadRequestException('Designation not found in this agency.');
    }

    // If siteId provided, verify it belongs to this client
    if (dto.clientSiteId) {
      await this.findSiteById(user, client.id, dto.clientSiteId);
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (effectiveTo && effectiveFrom >= effectiveTo) {
      throw new BadRequestException('Effective from must be before effective to.');
    }

    // Check temporal overlap on the same logical rate card:
    // (clientId, designationId, clientSiteId, billingModel)
    const activeRates = await this.prisma.clientBillingRate.findMany({
      where: {
        clientId: client.id,
        designationId: dto.designationId,
        clientSiteId: dto.clientSiteId || null,
        billingModel: dto.billingModel,
        isActive: true,
        deletedAt: null,
      },
    });

    for (const existing of activeRates) {
      const existingFrom = existing.effectiveFrom;
      const existingTo = existing.effectiveTo || new Date('9999-12-31');
      const newTo = effectiveTo || new Date('9999-12-31');

      const overlaps = effectiveFrom <= existingTo && newTo >= existingFrom;
      if (overlaps) {
        throw new ConflictException({
          code: 'RATE_CARD_TEMPORAL_OVERLAP',
          message: `An active billing rate already overlaps with this effective window (${existing.effectiveFrom.toISOString().slice(0, 10)} to ${existing.effectiveTo ? existing.effectiveTo.toISOString().slice(0, 10) : 'Open'}).`,
        });
      }
    }

    const rate = await this.prisma.clientBillingRate.create({
      data: {
        clientId: client.id,
        clientSiteId: dto.clientSiteId || null,
        designationId: dto.designationId,
        billingModel: dto.billingModel,
        rateAmount: dto.rateAmount,
        standardShiftHours: dto.standardShiftHours ?? 8.00,
        otHourlyRate: dto.otHourlyRate ?? 0.00,
        effectiveFrom,
        effectiveTo,
        isActive: true,
      },
      include: {
        designation: { select: { id: true, name: true, code: true } },
        clientSite: { select: { id: true, siteName: true, siteCode: true } },
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: client.branchId,
      userId: user.id,
      entityName: 'ClientBillingRate',
      entityId: rate.id,
      action: AuditAction.CREATE,
      changeSummary: `Billing rate created for [${designation.name}]: ₹${dto.rateAmount} (${dto.billingModel})`,
    });

    return rate;
  }

  async findBillingRatesByClient(user: AuthenticatedUserContext, clientId: string) {
    const client = await this.findClientById(user, clientId);
    return this.prisma.clientBillingRate.findMany({
      where: {
        clientId: client.id,
        deletedAt: null,
      },
      include: {
        designation: { select: { id: true, name: true, code: true } },
        clientSite: { select: { id: true, siteName: true, siteCode: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * Transactional Rate Versioning:
   * Supersedes an active rate by closing it on (newEffectiveFrom - 1 day)
   * and inserting the new rate starting on newEffectiveFrom.
   */
  async createNewRateVersion(
    user: AuthenticatedUserContext,
    clientId: string,
    rateId: string,
    dto: CreateRateVersionDto,
  ) {
    const client = await this.findClientById(user, clientId);

    const oldRate = await this.prisma.clientBillingRate.findFirst({
      where: { id: rateId, clientId: client.id, deletedAt: null },
      include: { designation: true },
    });

    if (!oldRate) {
      throw new NotFoundException('Billing rate not found.');
    }

    const newFrom = new Date(dto.newEffectiveFrom);
    if (newFrom <= oldRate.effectiveFrom) {
      throw new BadRequestException({
        code: 'INVALID_VERSION_DATE',
        message: `New rate effective date [${dto.newEffectiveFrom}] must be strictly after previous effective start [${oldRate.effectiveFrom.toISOString().slice(0, 10)}].`,
      });
    }

    // Previous rate closes the day before the new rate begins
    const dayBefore = new Date(newFrom.getTime() - 24 * 60 * 60 * 1000);

    // Execute atomic version rotation in a transaction
    const newRate = await this.prisma.$transaction(async (tx) => {
      // 1. Close previous active rate
      await tx.clientBillingRate.update({
        where: { id: oldRate.id },
        data: {
          effectiveTo: dayBefore,
        },
      });

      // 2. Create new active version
      return tx.clientBillingRate.create({
        data: {
          clientId: client.id,
          clientSiteId: oldRate.clientSiteId,
          designationId: oldRate.designationId,
          billingModel: oldRate.billingModel,
          rateAmount: dto.newRateAmount,
          standardShiftHours: dto.newStandardShiftHours ?? Number(oldRate.standardShiftHours),
          otHourlyRate: dto.newOtHourlyRate ?? Number(oldRate.otHourlyRate),
          effectiveFrom: newFrom,
          effectiveTo: null, // Open active version
          isActive: true,
        },
        include: {
          designation: { select: { id: true, name: true, code: true } },
          clientSite: { select: { id: true, siteName: true, siteCode: true } },
        },
      });
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: client.branchId,
      userId: user.id,
      entityName: 'ClientBillingRate',
      entityId: newRate.id,
      action: AuditAction.UPDATE,
      changeSummary: `Rate revision for [${oldRate.designation?.name || 'Designation'}]: ₹${oldRate.rateAmount} -> ₹${dto.newRateAmount} effective ${dto.newEffectiveFrom}`,
      oldValues: { rateAmount: oldRate.rateAmount, effectiveTo: dayBefore },
      newValues: { rateAmount: newRate.rateAmount, effectiveFrom: newRate.effectiveFrom },
    });

    return newRate;
  }

  async deactivateBillingRate(
    user: AuthenticatedUserContext,
    clientId: string,
    rateId: string,
    dto: UpdateClientBillingRateDto,
  ) {
    const client = await this.findClientById(user, clientId);

    const rate = await this.prisma.clientBillingRate.findFirst({
      where: { id: rateId, clientId: client.id, deletedAt: null },
    });

    if (!rate) {
      throw new NotFoundException('Billing rate not found.');
    }

    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : new Date();

    const updated = await this.prisma.clientBillingRate.update({
      where: { id: rate.id },
      data: {
        effectiveTo,
        isActive: dto.isActive !== undefined ? dto.isActive : false,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: client.branchId,
      userId: user.id,
      entityName: 'ClientBillingRate',
      entityId: updated.id,
      action: AuditAction.UPDATE,
      changeSummary: `Billing rate closed effective ${effectiveTo.toISOString().slice(0, 10)}`,
    });

    return updated;
  }
}
