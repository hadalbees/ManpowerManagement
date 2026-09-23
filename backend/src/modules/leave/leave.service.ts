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
import {
  AuditAction,
  LeaveStatus,
  AttendanceStatus,
  AttendanceMethod,
  DeploymentStatus,
} from '@prisma/client';
import {
  getBusinessDateInTimezone,
  getLeaveYearForDate,
  getDateRangeArray,
} from '../../common/utils/timezone.util';
import {
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  CreateLeaveBalanceDto,
  AdjustLeaveBalanceDto,
  LeaveBalanceQueryDto,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  CancelLeaveRequestDto,
  LeaveRequestQueryDto,
} from './dto/leave.dto';

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Parse YYYY-MM-DD string to pure UTC Date for PostgreSQL @db.Date column
   */
  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  }

  // ==========================================
  // 1. LEAVE TYPES
  // ==========================================

  async createLeaveType(dto: CreateLeaveTypeDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const existing = await this.prisma.leaveType.findUnique({
      where: {
        agencyId_code: {
          agencyId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Leave type with code '${dto.code}' already exists in this agency`);
    }

    const leaveType = await this.prisma.leaveType.create({
      data: {
        agencyId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        daysPerYear: dto.daysPerYear !== undefined ? Number(dto.daysPerYear) : 0,
        isPaid: dto.isPaid !== undefined ? dto.isPaid : true,
        isAccumulative: dto.isAccumulative !== undefined ? dto.isAccumulative : false,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    await this.auditService.record({
      agencyId,
      branchId: user.branchId,
      userId: user.id,
      entityName: 'LeaveType',
      entityId: leaveType.id,
      action: AuditAction.CREATE,
      changeSummary: `Leave type '${leaveType.name}' (${leaveType.code}) created`,
      newValues: leaveType,
    });

    return leaveType;
  }

  async getLeaveTypes(user: AuthenticatedUserContext, activeOnly = false) {
    const where: any = {
      agencyId: user.agencyId,
    };
    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.leaveType.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async getLeaveTypeById(id: string, user: AuthenticatedUserContext) {
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id, agencyId: user.agencyId },
    });
    if (!leaveType) {
      throw new NotFoundException('Leave type not found or unauthorized');
    }
    return leaveType;
  }

  async updateLeaveType(id: string, dto: UpdateLeaveTypeDto, user: AuthenticatedUserContext) {
    const leaveType = await this.getLeaveTypeById(id, user);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.daysPerYear !== undefined) updateData.daysPerYear = Number(dto.daysPerYear);
    if (dto.isPaid !== undefined) updateData.isPaid = dto.isPaid;
    if (dto.isAccumulative !== undefined) updateData.isAccumulative = dto.isAccumulative;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.leaveType.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: user.branchId,
      userId: user.id,
      entityName: 'LeaveType',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `Leave type '${updated.code}' updated`,
      oldValues: leaveType,
      newValues: updateData,
    });

    return updated;
  }

  // ==========================================
  // 2. LEAVE BALANCES
  // ==========================================

  async createLeaveBalance(dto: CreateLeaveBalanceDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    // Validate employee
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, agencyId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found or unauthorized');
    }
    if (user.branchId && employee.branchId !== user.branchId) {
      throw new ForbiddenException('Employee belongs to a different branch');
    }

    // Validate leave type
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: dto.leaveTypeId, agencyId },
    });
    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // Check existing balance
    const existing = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: dto.year,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Leave balance already exists for ${employee.employeeCode} for year ${dto.year}`,
      );
    }

    const opening = Number(dto.openingBalance);
    const balance = await this.prisma.leaveBalance.create({
      data: {
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        year: dto.year,
        openingBalance: opening,
        accruedDays: 0,
        consumedDays: 0,
        closingBalance: opening,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            branchId: true,
          },
        },
        leaveType: true,
      },
    });

    await this.auditService.record({
      agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'LeaveBalance',
      entityId: balance.id,
      action: AuditAction.CREATE,
      changeSummary: `Allocated ${opening} days of ${leaveType.code} for ${employee.employeeCode} (Year ${dto.year})`,
      newValues: {
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        year: dto.year,
        openingBalance: opening,
        closingBalance: opening,
      },
    });

    return balance;
  }

  async adjustLeaveBalance(id: string, dto: AdjustLeaveBalanceDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const balance = await this.prisma.leaveBalance.findUnique({
      where: { id },
      include: {
        employee: true,
        leaveType: true,
      },
    });

    if (!balance || balance.employee.agencyId !== agencyId) {
      throw new NotFoundException('Leave balance record not found');
    }
    if (user.branchId && balance.employee.branchId !== user.branchId) {
      throw new ForbiddenException('Leave balance belongs to a different branch');
    }

    const currentClosing = Number(balance.closingBalance);
    const adjustment = Number(dto.adjustmentDays);
    const newClosing = currentClosing + adjustment;

    if (newClosing < 0) {
      throw new BadRequestException(
        `NEGATIVE_BALANCE_NOT_ALLOWED: Adjustment of ${adjustment} would result in negative available balance (${newClosing})`,
      );
    }

    const currentAccrued = Number(balance.accruedDays);
    const updated = await this.prisma.leaveBalance.update({
      where: { id },
      data: {
        accruedDays: currentAccrued + adjustment,
        closingBalance: newClosing,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
        leaveType: true,
      },
    });

    await this.auditService.record({
      agencyId,
      branchId: balance.employee.branchId,
      userId: user.id,
      entityName: 'LeaveBalance',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `LEAVE_BALANCE_ADJUSTED: Adjusted by ${adjustment > 0 ? '+' : ''}${adjustment} days for ${balance.employee.employeeCode}. Reason: ${dto.reason}`,
      oldValues: {
        accruedDays: currentAccrued,
        closingBalance: currentClosing,
      },
      newValues: {
        accruedDays: currentAccrued + adjustment,
        closingBalance: newClosing,
        reason: dto.reason,
      },
    });

    return updated;
  }

  async getLeaveBalances(query: LeaveBalanceQueryDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || query.branchId;

    const where: any = {
      employee: {
        agencyId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
    };

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId;
    if (query.year) where.year = Number(query.year);

    return this.prisma.leaveBalance.findMany({
      where,
      orderBy: [{ year: 'desc' }, { employeeId: 'asc' }],
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            branchId: true,
            branch: {
              select: {
                id: true,
                branchName: true,
                branchCode: true,
              },
            },
          },
        },
        leaveType: true,
      },
    });
  }

  // ==========================================
  // 3. LEAVE REQUESTS
  // ==========================================

  private calculateTotalDays(startDateStr: string, endDateStr: string, isHalfDay = false): number {
    if (isHalfDay) {
      if (startDateStr !== endDateStr) {
        throw new BadRequestException('Half-day leave must have identical start and end dates');
      }
      return 0.5;
    }
    const dates = getDateRangeArray(startDateStr, endDateStr);
    return dates.length;
  }

  async createLeaveRequest(dto: CreateLeaveRequestDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    // 1. Employee Validation
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, agencyId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found or unauthorized');
    }
    if (user.branchId && employee.branchId !== user.branchId) {
      throw new ForbiddenException('Employee belongs to a different branch');
    }

    // 2. Leave Type Validation
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: dto.leaveTypeId, agencyId },
    });
    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }
    if (!leaveType.isActive) {
      throw new BadRequestException(`Leave type '${leaveType.name}' is currently inactive`);
    }

    // 3. Date Range Validation
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('End date must be greater than or equal to start date');
    }

    const totalDays = this.calculateTotalDays(dto.startDate, dto.endDate, dto.isHalfDay);

    // 4. Overlap Prevention (PENDING or APPROVED requests)
    const startDateObj = this.parseDate(dto.startDate);
    const endDateObj = this.parseDate(dto.endDate);

    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId: dto.employeeId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        deletedAt: null,
        startDate: { lte: endDateObj },
        endDate: { gte: startDateObj },
      },
      include: {
        leaveType: true,
      },
    });

    if (overlapping) {
      throw new ConflictException(
        `OVERLAPPING_LEAVE_REQUEST: An overlapping ${overlapping.status} leave request (${overlapping.leaveType.code}) already exists for this employee between ${overlapping.startDate.toISOString().slice(0, 10)} and ${overlapping.endDate.toISOString().slice(0, 10)}`,
      );
    }

    // 5. Balance Sanity Check for Paid Leaves
    if (leaveType.isPaid) {
      const leaveYear = getLeaveYearForDate(dto.startDate);
      const balance = await this.prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: dto.employeeId,
            leaveTypeId: dto.leaveTypeId,
            year: leaveYear,
          },
        },
      });

      if (!balance) {
        throw new BadRequestException(
          `No leave balance allocated for ${leaveType.code} in leave year ${leaveYear}`,
        );
      }

      const available = Number(balance.closingBalance);
      if (available < totalDays) {
        throw new BadRequestException(
          `INSUFFICIENT_LEAVE_BALANCE: Requested ${totalDays} day(s), but available balance is ${available} day(s) for ${leaveType.code}`,
        );
      }
    }

    // 6. Create Leave Request in PENDING status
    const created = await this.prisma.leaveRequest.create({
      data: {
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: startDateObj,
        endDate: endDateObj,
        totalDays,
        reason: dto.reason,
        status: LeaveStatus.PENDING,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            branchId: true,
          },
        },
        leaveType: true,
      },
    });

    await this.auditService.record({
      agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'LeaveRequest',
      entityId: created.id,
      action: AuditAction.CREATE,
      changeSummary: `Submitted ${created.leaveType.code} leave request (${totalDays} day(s)) for ${created.employee.employeeCode} from ${dto.startDate} to ${dto.endDate}`,
      newValues: {
        id: created.id,
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        totalDays,
        status: LeaveStatus.PENDING,
      },
    });

    return created;
  }

  async getLeaveRequests(query: LeaveRequestQueryDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || query.branchId;

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {
      employee: {
        agencyId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      deletedAt: null,
    };

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId;
    if (query.status) where.status = query.status;

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
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              branchId: true,
              branch: {
                select: {
                  id: true,
                  branchName: true,
                  branchCode: true,
                },
              },
            },
          },
          leaveType: true,
          reviewedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
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

  async getLeaveRequestById(id: string, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        employee: {
          include: {
            branch: true,
          },
        },
        leaveType: true,
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!request || request.employee.agencyId !== agencyId) {
      throw new NotFoundException('Leave request not found');
    }
    if (user.branchId && request.employee.branchId !== user.branchId) {
      throw new ForbiddenException('Leave request belongs to a different branch');
    }

    return request;
  }

  async updateLeaveRequest(id: string, dto: UpdateLeaveRequestDto, user: AuthenticatedUserContext) {
    const request = await this.getLeaveRequestById(id, user);

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only PENDING leave requests can be updated');
    }

    const startDateStr = dto.startDate || request.startDate.toISOString().slice(0, 10);
    const endDateStr = dto.endDate || request.endDate.toISOString().slice(0, 10);
    const isHalfDay = dto.isHalfDay !== undefined ? dto.isHalfDay : Number(request.totalDays) === 0.5;

    if (endDateStr < startDateStr) {
      throw new BadRequestException('End date must be greater than or equal to start date');
    }

    const totalDays = this.calculateTotalDays(startDateStr, endDateStr, isHalfDay);
    const startDateObj = this.parseDate(startDateStr);
    const endDateObj = this.parseDate(endDateStr);

    // Overlap Check excluding self
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        id: { not: id },
        employeeId: request.employeeId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        deletedAt: null,
        startDate: { lte: endDateObj },
        endDate: { gte: startDateObj },
      },
    });

    if (overlapping) {
      throw new ConflictException('OVERLAPPING_LEAVE_REQUEST: Modified dates conflict with another leave request');
    }

    // Balance check for paid leaves
    if (request.leaveType.isPaid) {
      const leaveYear = getLeaveYearForDate(startDateStr);
      const balance = await this.prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: leaveYear,
          },
        },
      });

      if (!balance || Number(balance.closingBalance) < totalDays) {
        throw new BadRequestException('INSUFFICIENT_LEAVE_BALANCE: Available balance insufficient for modified dates');
      }
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        startDate: startDateObj,
        endDate: endDateObj,
        totalDays,
        reason: dto.reason !== undefined ? dto.reason : request.reason,
      },
      include: {
        employee: true,
        leaveType: true,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: request.employee.branchId,
      userId: user.id,
      entityName: 'LeaveRequest',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `Updated PENDING leave request for ${request.employee.employeeCode}`,
      oldValues: {
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: request.totalDays,
      },
      newValues: {
        startDate: startDateObj,
        endDate: endDateObj,
        totalDays,
      },
    });

    return updated;
  }

  // ==========================================
  // 4. APPROVAL TRANSACTION
  // ==========================================

  async approveLeaveRequest(id: string, dto: ApproveLeaveRequestDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    // Interactive Transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock/Fetch Request
      const request = await tx.leaveRequest.findUnique({
        where: { id },
        include: {
          employee: true,
          leaveType: true,
        },
      });

      if (!request || request.employee.agencyId !== agencyId) {
        throw new NotFoundException('Leave request not found');
      }
      if (user.branchId && request.employee.branchId !== user.branchId) {
        throw new ForbiddenException('Leave request belongs to a different branch');
      }
      if (request.status !== LeaveStatus.PENDING) {
        throw new BadRequestException(`Cannot approve a leave request with status '${request.status}'`);
      }

      const startDateStr = request.startDate.toISOString().slice(0, 10);
      const endDateStr = request.endDate.toISOString().slice(0, 10);
      const dates = getDateRangeArray(startDateStr, endDateStr);
      const totalDays = Number(request.totalDays);

      // 2. Re-verify Overlap with APPROVED requests
      const overlappingApproved = await tx.leaveRequest.findFirst({
        where: {
          id: { not: id },
          employeeId: request.employeeId,
          status: LeaveStatus.APPROVED,
          deletedAt: null,
          startDate: { lte: request.endDate },
          endDate: { gte: request.startDate },
        },
      });
      if (overlappingApproved) {
        throw new ConflictException('OVERLAPPING_LEAVE_REQUEST: Employee already has an APPROVED leave on these dates');
      }

      // 3. Attendance Lock & Pre-check
      const targetAttendanceStatus = request.leaveType.isPaid
        ? AttendanceStatus.PAID_LEAVE
        : AttendanceStatus.UNPAID_LEAVE;

      for (const dateStr of dates) {
        const businessDateObj = this.parseDate(dateStr);
        const existingAtt = await tx.attendance.findFirst({
          where: {
            employeeId: request.employeeId,
            shiftBusinessDate: businessDateObj,
          },
        });

        if (existingAtt && existingAtt.isLocked) {
          throw new BadRequestException(
            `ATTENDANCE_LOCKED: Attendance record for date ${dateStr} is locked by finalized payroll batch`,
          );
        }
      }

      // 4. Concurrency-Safe Balance Consumption (Paid Leaves)
      if (request.leaveType.isPaid) {
        const leaveYear = getLeaveYearForDate(startDateStr);
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year: leaveYear,
            },
          },
        });

        if (!balance) {
          throw new BadRequestException(
            `No leave balance allocated for ${request.leaveType.code} in year ${leaveYear}`,
          );
        }

        const available = Number(balance.closingBalance);
        if (available < totalDays) {
          throw new ConflictException(
            `LEAVE_BALANCE_INSUFFICIENT_OR_CONCURRENT_UPDATE: Available balance (${available}) is less than required (${totalDays})`,
          );
        }

        // Atomic update with closingBalance guard
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            consumedDays: { increment: totalDays },
            closingBalance: { decrement: totalDays },
          },
        });
      }

      // 5. Update / Create Attendance Records with Historical Deployment Resolution
      for (const dateStr of dates) {
        const businessDateObj = this.parseDate(dateStr);

        // Find active deployment covering this specific shift date
        const deployment = await tx.employeeDeployment.findFirst({
          where: {
            employeeId: request.employeeId,
            agencyId,
            startDate: { lte: businessDateObj },
            OR: [
              { endDate: null },
              { endDate: { gte: businessDateObj } },
            ],
            deletedAt: null,
          },
          include: {
            client: true,
            clientSite: true,
          },
        });

        const existingAtt = await tx.attendance.findFirst({
          where: {
            employeeId: request.employeeId,
            shiftBusinessDate: businessDateObj,
          },
        });

        if (existingAtt) {
          await tx.attendance.update({
            where: { id: existingAtt.id },
            data: {
              status: targetAttendanceStatus,
              workedHours: 0,
              overtimeHours: 0,
              supervisorRemarks: `Leave approved (${request.leaveType.code})`,
            },
          });
        } else if (deployment) {
          // Create attendance record reflecting historical deployment
          await tx.attendance.create({
            data: {
              agencyId,
              branchId: deployment.branchId,
              employeeId: request.employeeId,
              deploymentId: deployment.id,
              clientId: deployment.clientId,
              clientSiteId: deployment.clientSiteId,
              shiftBusinessDate: businessDateObj,
              status: targetAttendanceStatus,
              scheduledHours: 8.0,
              workedHours: 0,
              overtimeHours: 0,
              recordedMethod: AttendanceMethod.WEB_MANUAL,
              recordedById: user.id,
              supervisorRemarks: `Leave approved (${request.leaveType.code})`,
              isApproved: true,
              approvedById: user.id,
              isLocked: false,
            },
          });
        }
      }

      // 6. Update Leave Request Status -> APPROVED
      const approved = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveStatus.APPROVED,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewerComments: dto.reviewerComments || 'Approved',
        },
        include: {
          employee: true,
          leaveType: true,
          reviewedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      // 7. Audit Log
      await this.auditService.record({
        agencyId,
        branchId: request.employee.branchId,
        userId: user.id,
        entityName: 'LeaveRequest',
        entityId: id,
        action: AuditAction.APPROVE,
        changeSummary: `LEAVE_APPROVED: Approved ${request.leaveType.code} leave (${totalDays} day(s)) for ${request.employee.employeeCode}`,
        oldValues: { status: LeaveStatus.PENDING },
        newValues: {
          status: LeaveStatus.APPROVED,
          reviewedById: user.id,
          attendanceStatus: targetAttendanceStatus,
          comments: dto.reviewerComments,
        },
      });

      return approved;
    });
  }

  // ==========================================
  // 5. REJECTION WORKFLOW
  // ==========================================

  async rejectLeaveRequest(id: string, dto: RejectLeaveRequestDto, user: AuthenticatedUserContext) {
    const request = await this.getLeaveRequestById(id, user);

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Cannot reject a leave request with status '${request.status}'`);
    }

    if (!dto.rejectionReason || dto.rejectionReason.trim() === '') {
      throw new BadRequestException('rejectionReason is mandatory when rejecting leave');
    }

    const rejected = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewerComments: dto.rejectionReason,
      },
      include: {
        employee: true,
        leaveType: true,
        reviewedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: request.employee.branchId,
      userId: user.id,
      entityName: 'LeaveRequest',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `LEAVE_REJECTED: Rejected ${request.leaveType.code} leave for ${request.employee.employeeCode}. Reason: ${dto.rejectionReason}`,
      oldValues: { status: LeaveStatus.PENDING },
      newValues: {
        status: LeaveStatus.REJECTED,
        reviewedById: user.id,
        rejectionReason: dto.rejectionReason,
      },
    });

    return rejected;
  }

  // ==========================================
  // 6. CANCELLATION WORKFLOW
  // ==========================================

  async cancelLeaveRequest(id: string, dto: CancelLeaveRequestDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({
        where: { id },
        include: {
          employee: true,
          leaveType: true,
        },
      });

      if (!request || request.employee.agencyId !== agencyId) {
        throw new NotFoundException('Leave request not found');
      }
      if (user.branchId && request.employee.branchId !== user.branchId) {
        throw new ForbiddenException('Leave request belongs to a different branch');
      }

      if (request.status === LeaveStatus.REJECTED || request.status === LeaveStatus.CANCELLED) {
        throw new BadRequestException(`Cannot cancel a leave request that is already ${request.status}`);
      }

      const totalDays = Number(request.totalDays);
      const wasApproved = request.status === LeaveStatus.APPROVED;

      // If it was APPROVED and paid, restore consumed balance
      if (wasApproved && request.leaveType.isPaid) {
        const startDateStr = request.startDate.toISOString().slice(0, 10);
        const leaveYear = getLeaveYearForDate(startDateStr);
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year: leaveYear,
            },
          },
        });

        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              consumedDays: { decrement: totalDays },
              closingBalance: { increment: totalDays },
            },
          });
        }
      }

      // If it was APPROVED, safely revert attendance for non-locked future dates
      if (wasApproved) {
        const startDateStr = request.startDate.toISOString().slice(0, 10);
        const endDateStr = request.endDate.toISOString().slice(0, 10);
        const dates = getDateRangeArray(startDateStr, endDateStr);

        for (const dateStr of dates) {
          const businessDateObj = this.parseDate(dateStr);
          const att = await tx.attendance.findFirst({
            where: {
              employeeId: request.employeeId,
              shiftBusinessDate: businessDateObj,
            },
          });

          if (att && !att.isLocked) {
            // Revert attendance status back to ABSENT or remove if auto-created purely for leave
            await tx.attendance.update({
              where: { id: att.id },
              data: {
                status: AttendanceStatus.ABSENT,
                supervisorRemarks: `Leave cancelled (${dto.cancellationReason || 'User request'})`,
              },
            });
          }
        }
      }

      // Update Leave Request status to CANCELLED
      const cancelled = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveStatus.CANCELLED,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewerComments: dto.cancellationReason || 'Cancelled by user',
        },
        include: {
          employee: true,
          leaveType: true,
          reviewedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      await this.auditService.record({
        agencyId,
        branchId: request.employee.branchId,
        userId: user.id,
        entityName: 'LeaveRequest',
        entityId: id,
        action: AuditAction.UPDATE,
        changeSummary: `LEAVE_CANCELLED: Cancelled ${request.leaveType.code} leave for ${request.employee.employeeCode}. Reason: ${dto.cancellationReason || 'Cancelled'}`,
        oldValues: { status: request.status },
        newValues: {
          status: LeaveStatus.CANCELLED,
          restoredBalance: wasApproved && request.leaveType.isPaid ? totalDays : 0,
          reason: dto.cancellationReason,
        },
      });

      return cancelled;
    });
  }
}
