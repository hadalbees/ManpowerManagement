import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
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
import {
  CreateReplacementDto,
  UpdateReplacementDto,
  ApproveReplacementDto,
  RejectReplacementDto,
  CancelReplacementDto,
  CompleteReplacementDto,
  ReplacementQueryDto,
} from './dto/replacements.dto';

@Injectable()
export class ReplacementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  }

  // ==========================================
  // 1. CREATE / DISPATCH REPLACEMENT
  // ==========================================

  async createReplacement(dto: CreateReplacementDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const absentEmployeeId = dto.absentEmployeeId || dto.originalEmployeeId;

    if (!absentEmployeeId) {
      throw new BadRequestException('absentEmployeeId or originalEmployeeId is required');
    }

    if (absentEmployeeId === dto.replacementEmployeeId) {
      throw new BadRequestException('An employee cannot be dispatched to replace themselves');
    }

    // 1. Validate Original Employee
    const originalEmployee = await this.prisma.employee.findFirst({
      where: { id: absentEmployeeId, agencyId, deletedAt: null },
    });
    if (!originalEmployee) {
      throw new NotFoundException('Original employee not found or unauthorized');
    }
    if (user.branchId && originalEmployee.branchId !== user.branchId) {
      throw new ForbiddenException('Original employee belongs to a different branch');
    }

    // 2. Validate Replacement Employee
    const replacementEmployee = await this.prisma.employee.findFirst({
      where: { id: dto.replacementEmployeeId, agencyId, deletedAt: null },
      include: {
        primaryDesignation: true,
      },
    });
    if (!replacementEmployee) {
      throw new NotFoundException('Replacement employee not found or unauthorized');
    }
    if (user.branchId && replacementEmployee.branchId !== user.branchId) {
      throw new ForbiddenException('Replacement employee belongs to a different branch');
    }
    if (replacementEmployee.status !== 'ACTIVE') {
      throw new BadRequestException(
        `REPLACEMENT_EMPLOYEE_NOT_ACTIVE: Replacement employee status is '${replacementEmployee.status}', must be 'ACTIVE'`,
      );
    }

    // 3. Validate Date Boundaries
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('End date must be greater than or equal to start date');
    }

    const startDateObj = this.parseDate(dto.startDate);
    const endDateObj = this.parseDate(dto.endDate);

    // 4. Validate Referenced Deployment
    const originalDeployment = await this.prisma.employeeDeployment.findFirst({
      where: {
        id: dto.originalDeploymentId,
        employeeId: absentEmployeeId,
        agencyId,
        deletedAt: null,
      },
      include: {
        designation: true,
        client: true,
        clientSite: true,
      },
    });

    if (!originalDeployment) {
      throw new NotFoundException(
        'Referenced original deployment not found or does not belong to the original employee',
      );
    }

    // Deployment Date Boundary Check
    const depStartDate = new Date(originalDeployment.startDate);
    if (startDateObj < depStartDate) {
      throw new BadRequestException(
        `REPLACEMENT_DATES_OUTSIDE_DEPLOYMENT: Replacement startDate (${dto.startDate}) cannot be earlier than deployment start (${originalDeployment.startDate.toISOString().slice(0, 10)})`,
      );
    }
    if (originalDeployment.endDate) {
      const depEndDate = new Date(originalDeployment.endDate);
      if (endDateObj > depEndDate) {
        throw new BadRequestException(
          `REPLACEMENT_DATES_OUTSIDE_DEPLOYMENT: Replacement endDate (${dto.endDate}) cannot exceed deployment end (${originalDeployment.endDate.toISOString().slice(0, 10)})`,
        );
      }
    }

    // 5. Check Replacement Employee Deployment Conflicts
    const conflictingDeployment = await this.prisma.employeeDeployment.findFirst({
      where: {
        employeeId: dto.replacementEmployeeId,
        agencyId,
        status: DeploymentStatus.ACTIVE,
        deletedAt: null,
        startDate: { lte: endDateObj },
        OR: [{ endDate: null }, { endDate: { gte: startDateObj } }],
      },
      include: { client: true, clientSite: true },
    });

    if (conflictingDeployment) {
      throw new ConflictException(
        `REPLACEMENT_DEPLOYMENT_CONFLICT: Replacement employee has an active deployment at ${conflictingDeployment.client.companyName} overlapping this period`,
      );
    }

    // 6. Check Replacement Employee Overlapping Replacements
    const overlappingReplacement = await this.prisma.replacement.findFirst({
      where: {
        replacementEmployeeId: dto.replacementEmployeeId,
        status: ReplacementStatus.DISPATCHED,
        startDate: { lte: endDateObj },
        endDate: { gte: startDateObj },
      },
    });

    if (overlappingReplacement) {
      throw new ConflictException(
        `REPLACEMENT_OVERLAP_CONFLICT: Replacement employee is already assigned to another active replacement from ${overlappingReplacement.startDate.toISOString().slice(0, 10)} to ${overlappingReplacement.endDate.toISOString().slice(0, 10)}`,
      );
    }

    // 7. Check Replacement Employee Leave Conflicts
    const conflictingLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId: dto.replacementEmployeeId,
        status: LeaveStatus.APPROVED,
        deletedAt: null,
        startDate: { lte: endDateObj },
        endDate: { gte: startDateObj },
      },
    });

    if (conflictingLeave) {
      throw new ConflictException(
        `REPLACEMENT_LEAVE_CONFLICT: Replacement employee has an APPROVED leave from ${conflictingLeave.startDate.toISOString().slice(0, 10)} to ${conflictingLeave.endDate.toISOString().slice(0, 10)}`,
      );
    }

    // 8. Designation & Driving License Eligibility
    const isDriverRequired =
      originalDeployment.designation.category === DesignationCategory.DRIVER ||
      Boolean(originalDeployment.vehicleId);

    if (isDriverRequired) {
      if (!replacementEmployee.drivingLicenseNumber || replacementEmployee.drivingLicenseNumber.trim() === '') {
        throw new BadRequestException(
          'DRIVER_LICENCE_REQUIRED: Deployment requires a driver role, but replacement employee has no driving licence on file',
        );
      }

      if (replacementEmployee.drivingLicenseExpiryDate) {
        const licenseExpiry = new Date(replacementEmployee.drivingLicenseExpiryDate);
        if (licenseExpiry < endDateObj) {
          throw new BadRequestException(
            `EXPIRED_DRIVING_LICENCE: Replacement employee's driving licence expires on ${replacementEmployee.drivingLicenseExpiryDate.toISOString().slice(0, 10)}, before replacement end date`,
          );
        }
      }
    }

    // 9. Create Replacement Record in DISPATCHED status
    const created = await this.prisma.replacement.create({
      data: {
        originalDeploymentId: dto.originalDeploymentId,
        absentEmployeeId,
        replacementEmployeeId: dto.replacementEmployeeId,
        startDate: startDateObj,
        endDate: endDateObj,
        replacementType: dto.replacementType || ReplacementType.TEMPORARY,
        reason: dto.reason,
        status: ReplacementStatus.DISPATCHED,
        dispatchedById: user.id,
      },
      include: {
        originalDeployment: {
          include: {
            client: true,
            clientSite: true,
            designation: true,
          },
        },
        absentEmployee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            branchId: true,
          },
        },
        replacementEmployee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            branchId: true,
          },
        },
        dispatchedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // 10. Audit Log
    await this.auditService.record({
      agencyId,
      branchId: originalEmployee.branchId,
      userId: user.id,
      entityName: 'Replacement',
      entityId: created.id,
      action: AuditAction.CREATE,
      changeSummary: `REPLACEMENT_DISPATCHED: Dispatched ${replacementEmployee.employeeCode} to replace ${originalEmployee.employeeCode} at ${originalDeployment.client.companyName} (${dto.startDate} to ${dto.endDate})`,
      newValues: {
        id: created.id,
        originalDeploymentId: dto.originalDeploymentId,
        absentEmployeeId,
        replacementEmployeeId: dto.replacementEmployeeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: ReplacementStatus.DISPATCHED,
      },
    });

    return created;
  }

  // ==========================================
  // 2. QUERY REPLACEMENTS
  // ==========================================

  async getReplacements(query: ReplacementQueryDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || query.branchId;

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {
      originalDeployment: {
        agencyId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
    };

    if (query.originalEmployeeId) where.absentEmployeeId = query.originalEmployeeId;
    if (query.replacementEmployeeId) where.replacementEmployeeId = query.replacementEmployeeId;
    if (query.deploymentId) where.originalDeploymentId = query.deploymentId;
    if (query.status) where.status = query.status;

    if (query.clientId) where.originalDeployment.clientId = query.clientId;
    if (query.clientSiteId) where.originalDeployment.clientSiteId = query.clientSiteId;

    if (query.startDate || query.endDate) {
      if (query.startDate && query.endDate) {
        where.startDate = { lte: this.parseDate(query.endDate) };
        where.endDate = { gte: this.parseDate(query.startDate) };
      } else if (query.startDate) {
        where.endDate = { gte: this.parseDate(query.startDate) };
      } else if (query.endDate) {
        where.startDate = { lte: this.parseDate(query.endDate) };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.replacement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          originalDeployment: {
            include: {
              client: true,
              clientSite: true,
              designation: true,
            },
          },
          absentEmployee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              branchId: true,
              branch: {
                select: { id: true, branchName: true, branchCode: true },
              },
            },
          },
          replacementEmployee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              branchId: true,
              branch: {
                select: { id: true, branchName: true, branchCode: true },
              },
            },
          },
          dispatchedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.replacement.count({ where }),
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

  async getReplacementById(id: string, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const replacement = await this.prisma.replacement.findUnique({
      where: { id },
      include: {
        originalDeployment: {
          include: {
            client: true,
            clientSite: true,
            designation: true,
            vehicle: true,
          },
        },
        absentEmployee: {
          include: {
            branch: true,
            primaryDesignation: true,
          },
        },
        replacementEmployee: {
          include: {
            branch: true,
            primaryDesignation: true,
          },
        },
        dispatchedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!replacement || replacement.originalDeployment.agencyId !== agencyId) {
      throw new NotFoundException('Replacement record not found');
    }
    if (user.branchId && replacement.originalDeployment.branchId !== user.branchId) {
      throw new ForbiddenException('Replacement record belongs to a different branch');
    }

    return replacement;
  }

  // ==========================================
  // 3. UPDATE PENDING/DISPATCHED REPLACEMENT
  // ==========================================

  async updateReplacement(id: string, dto: UpdateReplacementDto, user: AuthenticatedUserContext) {
    const replacement = await this.getReplacementById(id, user);

    if (replacement.status === ReplacementStatus.COMPLETED || replacement.status === ReplacementStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update a replacement with status '${replacement.status}'`);
    }

    const startDateStr = dto.startDate || replacement.startDate.toISOString().slice(0, 10);
    const endDateStr = dto.endDate || replacement.endDate.toISOString().slice(0, 10);

    if (endDateStr < startDateStr) {
      throw new BadRequestException('End date must be greater than or equal to start date');
    }

    const startDateObj = this.parseDate(startDateStr);
    const endDateObj = this.parseDate(endDateStr);

    // Revalidate deployment boundaries
    const depStartDate = new Date(replacement.originalDeployment.startDate);
    if (startDateObj < depStartDate) {
      throw new BadRequestException('Replacement startDate cannot be earlier than deployment start');
    }
    if (replacement.originalDeployment.endDate) {
      const depEndDate = new Date(replacement.originalDeployment.endDate);
      if (endDateObj > depEndDate) {
        throw new BadRequestException('Replacement endDate cannot exceed deployment end');
      }
    }

    // Revalidate replacement employee overlaps (excluding self)
    const overlapping = await this.prisma.replacement.findFirst({
      where: {
        id: { not: id },
        replacementEmployeeId: replacement.replacementEmployeeId,
        status: ReplacementStatus.DISPATCHED,
        startDate: { lte: endDateObj },
        endDate: { gte: startDateObj },
      },
    });

    if (overlapping) {
      throw new ConflictException('REPLACEMENT_OVERLAP_CONFLICT: Modified dates conflict with another active replacement');
    }

    const updated = await this.prisma.replacement.update({
      where: { id },
      data: {
        startDate: startDateObj,
        endDate: endDateObj,
        reason: dto.reason !== undefined ? dto.reason : replacement.reason,
      },
      include: {
        originalDeployment: {
          include: { client: true, clientSite: true },
        },
        absentEmployee: true,
        replacementEmployee: true,
        dispatchedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: replacement.originalDeployment.branchId,
      userId: user.id,
      entityName: 'Replacement',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `REPLACEMENT_UPDATED: Modified replacement schedule for ${replacement.replacementEmployee.employeeCode}`,
      oldValues: {
        startDate: replacement.startDate,
        endDate: replacement.endDate,
        reason: replacement.reason,
      },
      newValues: {
        startDate: startDateObj,
        endDate: endDateObj,
        reason: updated.reason,
      },
    });

    return updated;
  }

  // ==========================================
  // 4. APPROVAL WORKFLOW
  // ==========================================

  async approveReplacement(id: string, dto: ApproveReplacementDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    return this.prisma.$transaction(async (tx) => {
      const replacement = await tx.replacement.findUnique({
        where: { id },
        include: {
          originalDeployment: {
            include: { designation: true, client: true },
          },
          absentEmployee: true,
          replacementEmployee: true,
        },
      });

      if (!replacement || replacement.originalDeployment.agencyId !== agencyId) {
        throw new NotFoundException('Replacement record not found');
      }
      if (user.branchId && replacement.originalDeployment.branchId !== user.branchId) {
        throw new ForbiddenException('Replacement record belongs to a different branch');
      }
      if (replacement.status === ReplacementStatus.COMPLETED || replacement.status === ReplacementStatus.CANCELLED) {
        throw new BadRequestException(`Cannot approve a replacement with status '${replacement.status}'`);
      }

      // Re-validate temporal overlap
      const overlapping = await tx.replacement.findFirst({
        where: {
          id: { not: id },
          replacementEmployeeId: replacement.replacementEmployeeId,
          status: ReplacementStatus.DISPATCHED,
          startDate: { lte: replacement.endDate },
          endDate: { gte: replacement.startDate },
        },
      });
      if (overlapping) {
        throw new ConflictException('REPLACEMENT_OVERLAP_CONFLICT: Replacement employee has an active overlapping dispatch');
      }

      const updated = await tx.replacement.update({
        where: { id },
        data: {
          status: ReplacementStatus.DISPATCHED,
        },
        include: {
          originalDeployment: { include: { client: true, clientSite: true } },
          absentEmployee: true,
          replacementEmployee: true,
          dispatchedBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      await this.auditService.record({
        agencyId,
        branchId: replacement.originalDeployment.branchId,
        userId: user.id,
        entityName: 'Replacement',
        entityId: id,
        action: AuditAction.APPROVE,
        changeSummary: `REPLACEMENT_APPROVED: Approved replacement of ${replacement.absentEmployee.employeeCode} by ${replacement.replacementEmployee.employeeCode}`,
        oldValues: { status: replacement.status },
        newValues: { status: ReplacementStatus.DISPATCHED, comments: dto.comments },
      });

      return updated;
    });
  }

  // ==========================================
  // 5. REJECTION WORKFLOW
  // ==========================================

  async rejectReplacement(id: string, dto: RejectReplacementDto, user: AuthenticatedUserContext) {
    const replacement = await this.getReplacementById(id, user);

    if (replacement.status === ReplacementStatus.COMPLETED) {
      throw new BadRequestException('Cannot reject an already completed replacement');
    }

    if (!dto.rejectionReason || dto.rejectionReason.trim() === '') {
      throw new BadRequestException('rejectionReason is mandatory when rejecting replacement');
    }

    const updated = await this.prisma.replacement.update({
      where: { id },
      data: {
        status: ReplacementStatus.CANCELLED,
      },
      include: {
        originalDeployment: { include: { client: true, clientSite: true } },
        absentEmployee: true,
        replacementEmployee: true,
        dispatchedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: replacement.originalDeployment.branchId,
      userId: user.id,
      entityName: 'Replacement',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `REPLACEMENT_REJECTED: Rejected replacement for ${replacement.absentEmployee.employeeCode}. Reason: ${dto.rejectionReason}`,
      oldValues: { status: replacement.status },
      newValues: { status: ReplacementStatus.CANCELLED, rejectionReason: dto.rejectionReason },
    });

    return updated;
  }

  // ==========================================
  // 6. CANCELLATION WORKFLOW
  // ==========================================

  async cancelReplacement(id: string, dto: CancelReplacementDto, user: AuthenticatedUserContext) {
    const replacement = await this.getReplacementById(id, user);

    if (replacement.status === ReplacementStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel an already completed historical replacement');
    }
    if (replacement.status === ReplacementStatus.CANCELLED) {
      throw new BadRequestException('Replacement is already cancelled');
    }

    const updated = await this.prisma.replacement.update({
      where: { id },
      data: {
        status: ReplacementStatus.CANCELLED,
      },
      include: {
        originalDeployment: { include: { client: true, clientSite: true } },
        absentEmployee: true,
        replacementEmployee: true,
        dispatchedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: replacement.originalDeployment.branchId,
      userId: user.id,
      entityName: 'Replacement',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `REPLACEMENT_CANCELLED: Cancelled replacement for ${replacement.absentEmployee.employeeCode}. Reason: ${dto.cancellationReason || 'User request'}`,
      oldValues: { status: replacement.status },
      newValues: { status: ReplacementStatus.CANCELLED, cancellationReason: dto.cancellationReason },
    });

    return updated;
  }

  // ==========================================
  // 7. COMPLETION WORKFLOW
  // ==========================================

  async completeReplacement(id: string, dto: CompleteReplacementDto, user: AuthenticatedUserContext) {
    const replacement = await this.getReplacementById(id, user);

    if (replacement.status === ReplacementStatus.COMPLETED) {
      return replacement;
    }
    if (replacement.status === ReplacementStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled replacement');
    }

    const updated = await this.prisma.replacement.update({
      where: { id },
      data: {
        status: ReplacementStatus.COMPLETED,
      },
      include: {
        originalDeployment: { include: { client: true, clientSite: true } },
        absentEmployee: true,
        replacementEmployee: true,
        dispatchedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: replacement.originalDeployment.branchId,
      userId: user.id,
      entityName: 'Replacement',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `REPLACEMENT_COMPLETED: Formally closed replacement of ${replacement.absentEmployee.employeeCode} by ${replacement.replacementEmployee.employeeCode}`,
      oldValues: { status: replacement.status },
      newValues: { status: ReplacementStatus.COMPLETED, notes: dto.notes },
    });

    return updated;
  }

  // ==========================================
  // 8. ATTENDANCE INTEGRATION
  // ==========================================

  /**
   * Records shift attendance for the replacement employee, retaining original deployment context
   */
  async recordReplacementAttendance(
    replacementId: string,
    shiftBusinessDateStr: string,
    user: AuthenticatedUserContext,
    workedHours = 8.0,
    supervisorRemarks?: string,
  ) {
    const replacement = await this.getReplacementById(replacementId, user);

    if (replacement.status !== ReplacementStatus.DISPATCHED) {
      throw new BadRequestException(`Cannot record attendance for replacement with status '${replacement.status}'`);
    }

    const businessDateObj = this.parseDate(shiftBusinessDateStr);
    if (businessDateObj < replacement.startDate || businessDateObj > replacement.endDate) {
      throw new BadRequestException(
        `ATTENDANCE_DATE_OUTSIDE_REPLACEMENT: Date ${shiftBusinessDateStr} falls outside replacement window`,
      );
    }

    // Check duplicate attendance for replacement employee on this date
    const existing = await this.prisma.attendance.findFirst({
      where: {
        employeeId: replacement.replacementEmployeeId,
        shiftBusinessDate: businessDateObj,
      },
    });

    if (existing) {
      throw new ConflictException(
        `DUPLICATE_ATTENDANCE: Attendance already recorded for replacement worker on ${shiftBusinessDateStr}`,
      );
    }

    // Create attendance record:
    // - employeeId = replacementEmployeeId (the worker who actually attended!)
    // - deploymentId = originalDeploymentId (retains client & site context!)
    const attendance = await this.prisma.attendance.create({
      data: {
        agencyId: replacement.originalDeployment.agencyId,
        branchId: replacement.originalDeployment.branchId,
        employeeId: replacement.replacementEmployeeId,
        deploymentId: replacement.originalDeploymentId,
        clientId: replacement.originalDeployment.clientId,
        clientSiteId: replacement.originalDeployment.clientSiteId,
        shiftBusinessDate: businessDateObj,
        status: AttendanceStatus.PRESENT,
        scheduledHours: 8.0,
        workedHours,
        overtimeHours: Math.max(0, workedHours - 8.0),
        recordedMethod: AttendanceMethod.WEB_MANUAL,
        recordedById: user.id,
        supervisorRemarks: supervisorRemarks || `Replacement shift for ${replacement.absentEmployee.employeeCode}`,
        isApproved: true,
        approvedById: user.id,
        isLocked: false,
      },
    });

    return attendance;
  }
}
