import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditAction, DeploymentStatus, VehicleStatus } from '@prisma/client';
import {
  CreateDeploymentDto,
  UpdateDeploymentDto,
  EndDeploymentDto,
  ReassignDeploymentDto,
  DeploymentQueryDto,
} from './dto/deployment.dto';

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper: format Date to YYYY-MM-DD
   */
  private formatDate(d: Date | string): string {
    if (typeof d === 'string') return d.substring(0, 10);
    return d.toISOString().substring(0, 10);
  }

  /**
   * Helper: parse time string HH:mm or HH:mm:ss to a Date object with time component
   */
  private parseTimeString(timeStr?: string): Date {
    const d = new Date('1970-01-01T00:00:00Z');
    if (!timeStr) return d;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    const seconds = parseInt(parts[2] || '0', 10);
    d.setUTCHours(hours, minutes, seconds, 0);
    return d;
  }

  /**
   * Helper: compute day before a given YYYY-MM-DD date
   */
  private getPreviousDateString(dateStr: string): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return date.toISOString().substring(0, 10);
  }

  // ==========================================
  // DEPLOYMENT MASTER CREATION
  // ==========================================

  async createDeployment(dto: CreateDeploymentDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || dto.branchId;

    if (!branchId) {
      throw new BadRequestException('Branch ID is required for deployment');
    }

    // 1. Verify branch belongs to user's agency
    const branch = await this.prisma.agencyBranch.findFirst({
      where: { id: branchId, agencyId, deletedAt: null },
    });
    if (!branch) {
      throw new ForbiddenException('Selected branch does not belong to your agency');
    }

    // 2. Validate Employee
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, agencyId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found or unauthorized');
    }
    if (user.branchId && employee.branchId !== user.branchId) {
      throw new ForbiddenException('Employee belongs to a different branch');
    }
    if (employee.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Employee is not active and cannot be deployed (current status: ${employee.status})`,
      );
    }

    // 3. Validate Client
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, agencyId, deletedAt: null },
    });
    if (!client) {
      throw new NotFoundException('Client not found or unauthorized');
    }
    if (user.branchId && client.branchId !== user.branchId) {
      throw new ForbiddenException('Client belongs to a different branch');
    }
    if (client.status !== 'ACTIVE') {
      throw new BadRequestException('Client is not active and cannot accept deployments');
    }

    // 4. Validate Client Site (Cross-client site validation)
    const clientSite = await this.prisma.clientSite.findFirst({
      where: { id: dto.clientSiteId, clientId: dto.clientId, deletedAt: null },
    });
    if (!clientSite) {
      throw new BadRequestException('Selected site does not belong to the selected client');
    }

    // 5. Validate Designation
    const designation = await this.prisma.designation.findFirst({
      where: { id: dto.designationId, agencyId, deletedAt: null },
    });
    if (!designation) {
      throw new NotFoundException('Designation not found or unauthorized');
    }

    // 6. Validate Vehicle (Optional)
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, agencyId, deletedAt: null },
      });
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found or unauthorized');
      }
      if (user.branchId && vehicle.branchId !== user.branchId) {
        throw new ForbiddenException('Vehicle belongs to a different branch');
      }
      if (
        vehicle.status === VehicleStatus.UNDER_MAINTENANCE ||
        vehicle.status === VehicleStatus.GROUNDED
      ) {
        throw new BadRequestException(
          `Vehicle is currently not operational (${vehicle.status})`,
        );
      }
    }

    // 7. Validate Date Range
    const startDateObj = new Date(dto.startDate);
    let endDateObj: Date | null = null;
    if (dto.endDate) {
      endDateObj = new Date(dto.endDate);
      if (endDateObj < startDateObj) {
        throw new BadRequestException('End date cannot be earlier than start date');
      }
    }

    // 8. Validate Client Billing Rate
    const billingRate = await this.prisma.clientBillingRate.findFirst({
      where: { id: dto.billingRateId, clientId: dto.clientId, deletedAt: null },
    });
    if (!billingRate) {
      throw new BadRequestException('Selected billing rate does not belong to the selected client');
    }
    if (!billingRate.isActive) {
      throw new BadRequestException('Selected billing rate is inactive');
    }
    if (billingRate.designationId !== dto.designationId) {
      throw new BadRequestException('Billing rate designation does not match deployment designation');
    }
    if (billingRate.clientSiteId && billingRate.clientSiteId !== dto.clientSiteId) {
      throw new BadRequestException('Billing rate is specific to another site');
    }
    if (startDateObj < new Date(billingRate.effectiveFrom)) {
      throw new BadRequestException('Billing rate is not yet effective on deployment start date');
    }
    if (billingRate.effectiveTo && startDateObj > new Date(billingRate.effectiveTo)) {
      throw new BadRequestException('Billing rate has expired before deployment start date');
    }

    // 9. Validate Employee Salary Structure
    const salaryStructure = await this.prisma.employeeSalaryStructure.findFirst({
      where: { id: dto.salaryStructureId, employeeId: dto.employeeId, deletedAt: null },
    });
    if (!salaryStructure) {
      throw new BadRequestException('Salary structure does not belong to the selected employee');
    }
    if (startDateObj < new Date(salaryStructure.effectiveFrom)) {
      throw new BadRequestException('Salary structure is not yet effective on deployment start date');
    }
    if (salaryStructure.effectiveTo && startDateObj > new Date(salaryStructure.effectiveTo)) {
      throw new BadRequestException('Salary structure has expired before deployment start date');
    }

    // 10. Temporal Non-Overlap Check for Employee
    await this.assertNoTemporalOverlap(dto.employeeId, startDateObj, endDateObj);

    // 11. Shift Times & Cross-Midnight Calculation
    const shiftStartTime = this.parseTimeString(dto.shiftStartTime || '09:00:00');
    const shiftEndTime = this.parseTimeString(dto.shiftEndTime || '18:00:00');
    let isNightShift = dto.isNightShift ?? false;
    if (dto.shiftStartTime && dto.shiftEndTime && dto.shiftEndTime < dto.shiftStartTime) {
      isNightShift = true;
    }

    // 12. Create Deployment Record & Scheduled Shifts
    const deployment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.employeeDeployment.create({
        data: {
          agencyId,
          branchId,
          employeeId: dto.employeeId,
          clientId: dto.clientId,
          clientSiteId: dto.clientSiteId,
          designationId: dto.designationId,
          billingRateId: dto.billingRateId,
          salaryStructureId: dto.salaryStructureId,
          vehicleId: dto.vehicleId || null,
          startDate: startDateObj,
          endDate: endDateObj,
          shiftName: dto.shiftName || 'GENERAL',
          shiftStartTime,
          shiftEndTime,
          isNightShift,
          status: DeploymentStatus.ACTIVE,
        },
      });

      // Scheduled workdays (default Mon-Sat: [1, 2, 3, 4, 5, 6])
      const workdays = dto.scheduledWorkdays && dto.scheduledWorkdays.length > 0
        ? dto.scheduledWorkdays
        : [1, 2, 3, 4, 5, 6];

      for (let day = 1; day <= 7; day++) {
        await tx.deploymentShift.create({
          data: {
            deploymentId: created.id,
            dayOfWeek: day,
            isScheduledWorkday: workdays.includes(day),
          },
        });
      }

      return created;
    });

    // 13. Audit Log
    await this.auditService.record({
      agencyId,
      branchId,
      userId: user.id,
      entityName: 'EmployeeDeployment',
      entityId: deployment.id,
      action: AuditAction.CREATE,
      changeSummary: `Deployment created for employee ${employee.employeeCode} at client ${client.companyName} (${clientSite.siteName})`,
      newValues: {
        id: deployment.id,
        employeeId: dto.employeeId,
        clientId: dto.clientId,
        clientSiteId: dto.clientSiteId,
        designationId: dto.designationId,
        vehicleId: dto.vehicleId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        remarks: dto.remarks,
      },
    });

    return this.getDeploymentById(deployment.id, user);
  }

  // ==========================================
  // TEMPORAL OVERLAP CHECK
  // ==========================================

  private async assertNoTemporalOverlap(
    employeeId: string,
    newStart: Date,
    newEnd: Date | null,
    excludeDeploymentId?: string,
  ): Promise<void> {
    const existingDeployments = await this.prisma.employeeDeployment.findMany({
      where: {
        employeeId,
        status: DeploymentStatus.ACTIVE,
        deletedAt: null,
        ...(excludeDeploymentId ? { id: { not: excludeDeploymentId } } : {}),
      },
    });

    for (const d of existingDeployments) {
      const existingStart = new Date(d.startDate);
      const existingEnd = d.endDate ? new Date(d.endDate) : null;

      // Check interval overlap: [A, B] overlaps [C, D] iff A <= D and C <= B
      const overlaps =
        (!newEnd || existingStart <= newEnd) &&
        (!existingEnd || newStart <= existingEnd);

      if (overlaps) {
        throw new ConflictException(
          'EMPLOYEE_DEPLOYMENT_TEMPORAL_OVERLAP: Employee already has an active deployment overlapping this time window',
        );
      }
    }
  }

  // ==========================================
  // QUERY & DIRECTORY LISTING
  // ==========================================

  async getDeployments(query: DeploymentQueryDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || query.branchId;

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      agencyId,
      deletedAt: null,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (query.clientId) where.clientId = query.clientId;
    if (query.clientSiteId) where.clientSiteId = query.clientSiteId;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.designationId) where.designationId = query.designationId;
    if (query.vehicleId) where.vehicleId = query.vehicleId;

    if (query.activeOnly) {
      where.status = DeploymentStatus.ACTIVE;
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { employee: { firstName: { contains: term, mode: 'insensitive' } } },
        { employee: { lastName: { contains: term, mode: 'insensitive' } } },
        { employee: { employeeCode: { contains: term, mode: 'insensitive' } } },
        { client: { companyName: { contains: term, mode: 'insensitive' } } },
        { clientSite: { siteName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.employeeDeployment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              phone: true,
              status: true,
            },
          },
          client: {
            select: {
              id: true,
              clientCode: true,
              companyName: true,
              status: true,
            },
          },
          clientSite: {
            select: {
              id: true,
              siteCode: true,
              siteName: true,
              city: true,
            },
          },
          designation: {
            select: {
              id: true,
              name: true,
              code: true,
              category: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              vehicleRegistrationNumber: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleType: true,
              status: true,
            },
          },
          billingRate: {
            select: {
              id: true,
              rateAmount: true,
              billingModel: true,
              effectiveFrom: true,
              effectiveTo: true,
            },
          },
          salaryStructure: {
            select: {
              id: true,
              basicPay: true,
              specialAllowance: true,
              effectiveFrom: true,
              effectiveTo: true,
            },
          },
          shifts: {
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      }),
      this.prisma.employeeDeployment.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // GET DEPLOYMENT DOSSIER
  // ==========================================

  async getDeploymentById(id: string, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const deployment = await this.prisma.employeeDeployment.findFirst({
      where: { id, agencyId, deletedAt: null },
      include: {
        employee: true,
        client: true,
        clientSite: true,
        designation: true,
        vehicle: true,
        billingRate: true,
        salaryStructure: true,
        shifts: {
          orderBy: { dayOfWeek: 'asc' },
        },
        branch: {
          select: {
            id: true,
            branchName: true,
            branchCode: true,
          },
        },
      },
    });

    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }

    if (user.branchId && deployment.branchId !== user.branchId) {
      throw new ForbiddenException('You do not have access to deployments in this branch');
    }

    // Retrieve recent audit history for deployment
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityName: 'EmployeeDeployment',
        entityId: id,
        agencyId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return {
      ...deployment,
      auditLogs,
    };
  }

  // ==========================================
  // UPDATE METADATA (NON-CORE RELATIONSHIPS)
  // ==========================================

  async updateDeployment(
    id: string,
    dto: UpdateDeploymentDto,
    user: AuthenticatedUserContext,
  ) {
    const deployment = await this.getDeploymentById(id, user);

    const oldSnapshot = {
      shiftName: deployment.shiftName,
      shiftStartTime: deployment.shiftStartTime,
      shiftEndTime: deployment.shiftEndTime,
      isNightShift: deployment.isNightShift,
    };

    const updateData: any = {};
    if (dto.shiftName) updateData.shiftName = dto.shiftName;
    if (dto.shiftStartTime) updateData.shiftStartTime = this.parseTimeString(dto.shiftStartTime);
    if (dto.shiftEndTime) updateData.shiftEndTime = this.parseTimeString(dto.shiftEndTime);
    if (dto.isNightShift !== undefined) updateData.isNightShift = dto.isNightShift;

    await this.prisma.$transaction(async (tx) => {
      await tx.employeeDeployment.update({
        where: { id },
        data: updateData,
      });

      if (dto.scheduledWorkdays && dto.scheduledWorkdays.length > 0) {
        for (let day = 1; day <= 7; day++) {
          await tx.deploymentShift.upsert({
            where: {
              deploymentId_dayOfWeek: {
                deploymentId: id,
                dayOfWeek: day,
              },
            },
            create: {
              deploymentId: id,
              dayOfWeek: day,
              isScheduledWorkday: dto.scheduledWorkdays.includes(day),
            },
            update: {
              isScheduledWorkday: dto.scheduledWorkdays.includes(day),
            },
          });
        }
      }
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: deployment.branchId,
      userId: user.id,
      entityName: 'EmployeeDeployment',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `Deployment configuration updated${dto.remarks ? `: ${dto.remarks}` : ''}`,
      oldValues: oldSnapshot,
      newValues: updateData,
    });

    return this.getDeploymentById(id, user);
  }

  // ==========================================
  // SAFE END DEPLOYMENT
  // ==========================================

  async endDeployment(id: string, dto: EndDeploymentDto, user: AuthenticatedUserContext) {
    const deployment = await this.getDeploymentById(id, user);

    if (deployment.status !== DeploymentStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot end deployment with status ${deployment.status}. Only ACTIVE deployments can be ended.`,
      );
    }

    const endDateObj = new Date(dto.endDate);
    const startDateObj = new Date(deployment.startDate);
    if (endDateObj < startDateObj) {
      throw new BadRequestException('End date cannot be earlier than start date');
    }

    const updated = await this.prisma.employeeDeployment.update({
      where: { id },
      data: {
        endDate: endDateObj,
        status: DeploymentStatus.COMPLETED,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: deployment.branchId,
      userId: user.id,
      entityName: 'EmployeeDeployment',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `Deployment ended historically on ${dto.endDate}. Reason: ${dto.reason}${dto.remarks ? ` (${dto.remarks})` : ''}`,
      oldValues: {
        status: deployment.status,
        endDate: deployment.endDate,
      },
      newValues: {
        status: DeploymentStatus.COMPLETED,
        endDate: dto.endDate,
        reason: dto.reason,
        remarks: dto.remarks,
      },
    });

    return this.getDeploymentById(id, user);
  }

  // ==========================================
  // TRANSACTIONAL ATOMIC REASSIGNMENT
  // ==========================================

  async reassignDeployment(
    id: string,
    dto: ReassignDeploymentDto,
    user: AuthenticatedUserContext,
  ) {
    const oldDeployment = await this.getDeploymentById(id, user);

    if (oldDeployment.status !== DeploymentStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot reassign deployment with status ${oldDeployment.status}. Only ACTIVE deployments can be reassigned.`,
      );
    }

    const effectiveDateObj = new Date(dto.effectiveDate);
    const oldStartObj = new Date(oldDeployment.startDate);

    if (effectiveDateObj < oldStartObj) {
      throw new BadRequestException(
        'Reassignment effective date cannot be earlier than previous deployment start date',
      );
    }

    const agencyId = user.agencyId;
    const branchId = oldDeployment.branchId;

    // Validate new client
    const newClient = await this.prisma.client.findFirst({
      where: { id: dto.newClientId, agencyId, deletedAt: null },
    });
    if (!newClient) {
      throw new NotFoundException('Target client not found or unauthorized');
    }
    if (user.branchId && newClient.branchId !== user.branchId) {
      throw new ForbiddenException('Target client belongs to a different branch');
    }
    if (newClient.status !== 'ACTIVE') {
      throw new BadRequestException('Target client is not active');
    }

    // Validate new client site
    const newSite = await this.prisma.clientSite.findFirst({
      where: { id: dto.newClientSiteId, clientId: dto.newClientId, deletedAt: null },
    });
    if (!newSite) {
      throw new BadRequestException('Target site does not belong to the selected client');
    }

    // Validate new designation
    const newDesignation = await this.prisma.designation.findFirst({
      where: { id: dto.newDesignationId, agencyId, deletedAt: null },
    });
    if (!newDesignation) {
      throw new NotFoundException('Target designation not found or unauthorized');
    }

    // Validate optional new vehicle
    if (dto.newVehicleId) {
      const newVehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.newVehicleId, agencyId, deletedAt: null },
      });
      if (!newVehicle) {
        throw new NotFoundException('Target vehicle not found or unauthorized');
      }
      if (user.branchId && newVehicle.branchId !== user.branchId) {
        throw new ForbiddenException('Target vehicle belongs to a different branch');
      }
      if (
        newVehicle.status === VehicleStatus.UNDER_MAINTENANCE ||
        newVehicle.status === VehicleStatus.GROUNDED
      ) {
        throw new BadRequestException(
          `Target vehicle is not operational (${newVehicle.status})`,
        );
      }
    }

    // Validate new billing rate
    const newBillingRate = await this.prisma.clientBillingRate.findFirst({
      where: { id: dto.newBillingRateId, clientId: dto.newClientId, deletedAt: null },
    });
    if (!newBillingRate) {
      throw new BadRequestException('Target billing rate does not belong to selected client');
    }
    if (!newBillingRate.isActive) {
      throw new BadRequestException('Target billing rate is inactive');
    }
    if (newBillingRate.designationId !== dto.newDesignationId) {
      throw new BadRequestException('Target billing rate designation does not match deployment designation');
    }
    if (newBillingRate.clientSiteId && newBillingRate.clientSiteId !== dto.newClientSiteId) {
      throw new BadRequestException('Target billing rate is specific to another site');
    }
    if (effectiveDateObj < new Date(newBillingRate.effectiveFrom)) {
      throw new BadRequestException('Target billing rate is not yet effective on reassignment date');
    }
    if (newBillingRate.effectiveTo && effectiveDateObj > new Date(newBillingRate.effectiveTo)) {
      throw new BadRequestException('Target billing rate has expired before reassignment date');
    }

    // Validate new salary structure
    const newSalaryStructure = await this.prisma.employeeSalaryStructure.findFirst({
      where: { id: dto.newSalaryStructureId, employeeId: oldDeployment.employeeId, deletedAt: null },
    });
    if (!newSalaryStructure) {
      throw new BadRequestException('Salary structure does not belong to the deployed employee');
    }
    if (effectiveDateObj < new Date(newSalaryStructure.effectiveFrom)) {
      throw new BadRequestException('Salary structure is not yet effective on reassignment date');
    }
    if (newSalaryStructure.effectiveTo && effectiveDateObj > new Date(newSalaryStructure.effectiveTo)) {
      throw new BadRequestException('Salary structure has expired before reassignment date');
    }

    // Check temporal overlap excluding current deployment
    await this.assertNoTemporalOverlap(
      oldDeployment.employeeId,
      effectiveDateObj,
      null,
      oldDeployment.id,
    );

    // Compute previous deployment end date:
    // If effectiveDate > oldStart, cap at day before. If effectiveDate === oldStart, cap at effectiveDate.
    let priorEndDateObj = effectiveDateObj;
    if (dto.effectiveDate > this.formatDate(oldDeployment.startDate)) {
      priorEndDateObj = new Date(this.getPreviousDateString(dto.effectiveDate));
    }

    // Shift settings
    const shiftStartTime = this.parseTimeString(dto.newShiftStartTime || '09:00:00');
    const shiftEndTime = this.parseTimeString(dto.newShiftEndTime || '18:00:00');
    let isNightShift = dto.newIsNightShift ?? false;
    if (dto.newShiftStartTime && dto.newShiftEndTime && dto.newShiftEndTime < dto.newShiftStartTime) {
      isNightShift = true;
    }

    // Atomic Transaction: End previous as TRANSFERRED, create new as ACTIVE
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. End previous deployment
      await tx.employeeDeployment.update({
        where: { id: oldDeployment.id },
        data: {
          endDate: priorEndDateObj,
          status: DeploymentStatus.TRANSFERRED,
        },
      });

      // 2. Create new deployment
      const newDeployment = await tx.employeeDeployment.create({
        data: {
          agencyId,
          branchId,
          employeeId: oldDeployment.employeeId,
          clientId: dto.newClientId,
          clientSiteId: dto.newClientSiteId,
          designationId: dto.newDesignationId,
          billingRateId: dto.newBillingRateId,
          salaryStructureId: dto.newSalaryStructureId,
          vehicleId: dto.newVehicleId || null,
          startDate: effectiveDateObj,
          endDate: null,
          shiftName: dto.newShiftName || 'GENERAL',
          shiftStartTime,
          shiftEndTime,
          isNightShift,
          status: DeploymentStatus.ACTIVE,
        },
      });

      // 3. Create shifts for new deployment
      const workdays = dto.newScheduledWorkdays && dto.newScheduledWorkdays.length > 0
        ? dto.newScheduledWorkdays
        : [1, 2, 3, 4, 5, 6];

      for (let day = 1; day <= 7; day++) {
        await tx.deploymentShift.create({
          data: {
            deploymentId: newDeployment.id,
            dayOfWeek: day,
            isScheduledWorkday: workdays.includes(day),
          },
        });
      }

      return newDeployment;
    });

    // Audit reassignment on both records
    await this.auditService.record({
      agencyId,
      branchId,
      userId: user.id,
      entityName: 'EmployeeDeployment',
      entityId: oldDeployment.id,
      action: AuditAction.UPDATE,
      changeSummary: `Employee reassigned to new deployment ${result.id} effective ${dto.effectiveDate}. Reason: ${dto.reason}`,
      oldValues: {
        status: oldDeployment.status,
        endDate: oldDeployment.endDate,
      },
      newValues: {
        status: DeploymentStatus.TRANSFERRED,
        endDate: this.formatDate(priorEndDateObj),
        transferredToDeploymentId: result.id,
        reason: dto.reason,
      },
    });

    await this.auditService.record({
      agencyId,
      branchId,
      userId: user.id,
      entityName: 'EmployeeDeployment',
      entityId: result.id,
      action: AuditAction.CREATE,
      changeSummary: `Reassigned deployment created for employee ${oldDeployment.employee.employeeCode} at client ${newClient.companyName}`,
      newValues: {
        reassignedFromDeploymentId: oldDeployment.id,
        startDate: dto.effectiveDate,
        clientId: dto.newClientId,
        clientSiteId: dto.newClientSiteId,
        designationId: dto.newDesignationId,
        vehicleId: dto.newVehicleId,
        reason: dto.reason,
        remarks: dto.remarks,
      },
    });

    return this.getDeploymentById(result.id, user);
  }

  // ==========================================
  // METADATA & LOOKUP OPTIONS FOR FRONTEND
  // ==========================================

  async getDeploymentOptions(
    user: AuthenticatedUserContext,
    clientId?: string,
    employeeId?: string,
  ) {
    const agencyId = user.agencyId;
    const branchId = user.branchId;

    const [clients, designations, vehicles] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          agencyId,
          ...(branchId ? { branchId } : {}),
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          id: true,
          clientCode: true,
          companyName: true,
          sites: {
            where: { deletedAt: null },
            select: {
              id: true,
              siteCode: true,
              siteName: true,
              city: true,
            },
          },
        },
        orderBy: { companyName: 'asc' },
      }),
      this.prisma.designation.findMany({
        where: {
          agencyId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          code: true,
          category: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        where: {
          agencyId,
          ...(branchId ? { branchId } : {}),
          status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.ASSIGNED] },
          deletedAt: null,
        },
        select: {
          id: true,
          vehicleRegistrationNumber: true,
          vehicleMake: true,
          vehicleModel: true,
          vehicleType: true,
          status: true,
        },
        orderBy: { vehicleRegistrationNumber: 'asc' },
      }),
    ]);

    // Active employees for deployment
    const employees = await this.prisma.employee.findMany({
      where: {
        agencyId,
        ...(branchId ? { branchId } : {}),
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        primaryDesignationId: true,
        salaryStructures: {
          where: { deletedAt: null },
          select: {
            id: true,
            basicPay: true,
            specialAllowance: true,
            effectiveFrom: true,
            effectiveTo: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    let clientBillingRates: any[] = [];
    if (clientId) {
      clientBillingRates = await this.prisma.clientBillingRate.findMany({
        where: {
          clientId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          designationId: true,
          clientSiteId: true,
          rateAmount: true,
          billingModel: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      });
    }

    return {
      clients,
      designations,
      vehicles,
      employees,
      clientBillingRates,
    };
  }
}
