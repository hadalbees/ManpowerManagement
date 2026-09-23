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
import { AuditAction, AttendanceStatus, AttendanceMethod, DeploymentStatus } from '@prisma/client';
import {
  getBusinessDateInTimezone,
  getDayOfWeekInTimezone,
  calculateHoursFromClockTimes,
} from '../../common/utils/timezone.util';
import {
  RecordAttendanceDto,
  UpdateAttendanceDto,
  ApproveAttendanceDto,
  BulkRecordAttendanceDto,
  AttendanceQueryDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Parse YYYY-MM-DD string to pure UTC Date for PostgreSQL @db.Date column
   */
  private parseBusinessDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  }

  // ==========================================
  // RECORD ATTENDANCE (SINGLE SHIFT)
  // ==========================================

  async recordAttendance(dto: RecordAttendanceDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const businessDateObj = this.parseBusinessDate(dto.shiftBusinessDate);

    // 1. Validate Employee
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, agencyId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found or unauthorized');
    }
    if (user.branchId && employee.branchId !== user.branchId) {
      throw new ForbiddenException('Employee belongs to a different branch');
    }

    // 2. Validate Deployment & Historical Integrity
    let deployment: any;
    if (dto.deploymentId) {
      deployment = await this.prisma.employeeDeployment.findFirst({
        where: { id: dto.deploymentId, agencyId, deletedAt: null },
        include: {
          client: true,
          clientSite: true,
          shifts: true,
        },
      });
    } else {
      // Auto-resolve active deployment on this business date
      deployment = await this.prisma.employeeDeployment.findFirst({
        where: {
          employeeId: dto.employeeId,
          agencyId,
          startDate: { lte: businessDateObj },
          OR: [
            { endDate: null },
            { endDate: { gte: businessDateObj } },
          ],
          status: DeploymentStatus.ACTIVE,
          deletedAt: null,
        },
        include: {
          client: true,
          clientSite: true,
          shifts: true,
        },
      });
    }

    if (!deployment) {
      throw new NotFoundException('No active or specified deployment found for employee on this date');
    }
    if (deployment.employeeId !== dto.employeeId) {
      throw new BadRequestException('Deployment does not belong to the selected employee');
    }
    if (user.branchId && deployment.branchId !== user.branchId) {
      throw new ForbiddenException('Deployment belongs to a different branch');
    }

    // 3. Deployment Date Range Validation
    const depStart = new Date(deployment.startDate);
    const depEnd = deployment.endDate ? new Date(deployment.endDate) : null;
    if (businessDateObj < depStart) {
      throw new BadRequestException('Attendance date precedes the deployment start date');
    }
    if (depEnd && businessDateObj > depEnd) {
      throw new BadRequestException('Attendance date is after the deployment ended');
    }

    // 4. Exact Uniqueness Check on (employeeId, shiftBusinessDate)
    const existing = await this.prisma.attendance.findFirst({
      where: {
        employeeId: dto.employeeId,
        shiftBusinessDate: businessDateObj,
      },
    });
    if (existing) {
      throw new ConflictException(
        'ATTENDANCE_ALREADY_RECORDED: Attendance has already been recorded for this employee on this business date',
      );
    }

    // 5. Scheduled Workday Verification via DeploymentShift
    const dayOfWeek = getDayOfWeekInTimezone(dto.shiftBusinessDate);
    const scheduledShift = deployment.shifts.find((s) => s.dayOfWeek === dayOfWeek);
    const isScheduledWorkday = scheduledShift ? scheduledShift.isScheduledWorkday : true;

    // 6. Hours Calculation
    const scheduledHours = dto.scheduledHours !== undefined ? Number(dto.scheduledHours) : 8.0;
    let workedHours = dto.workedHours !== undefined ? Number(dto.workedHours) : 0;
    let overtimeHours = dto.overtimeHours !== undefined ? Number(dto.overtimeHours) : 0;

    const breakMinutes = scheduledShift ? (scheduledShift.breakMinutes || 0) : 0;

    if (dto.clockInTime && dto.clockOutTime) {
      if (new Date(dto.clockOutTime).getTime() <= new Date(dto.clockInTime).getTime()) {
        throw new BadRequestException('Clock out time must be strictly after clock in time');
      }
      const calculated = calculateHoursFromClockTimes(
        dto.clockInTime,
        dto.clockOutTime,
        scheduledHours,
        breakMinutes,
      );
      workedHours = dto.workedHours !== undefined ? Number(dto.workedHours) : calculated.workedHours;
      overtimeHours = dto.overtimeHours !== undefined ? Number(dto.overtimeHours) : calculated.overtimeHours;
    } else {
      if (dto.status === AttendanceStatus.PRESENT) {
        workedHours = dto.workedHours !== undefined ? Number(dto.workedHours) : scheduledHours;
      } else if (dto.status === AttendanceStatus.HALF_DAY) {
        workedHours = dto.workedHours !== undefined ? Number(dto.workedHours) : scheduledHours / 2;
      } else {
        workedHours = 0;
        overtimeHours = 0;
      }
    }

    // If worked on a scheduled rest day / week off, auto-flag overtime if worked
    if (!isScheduledWorkday && workedHours > 0 && overtimeHours === 0) {
      overtimeHours = workedHours; // Full rest day work counted as overtime
    }

    // 7. Create Attendance Record
    const created = await this.prisma.attendance.create({
      data: {
        agencyId,
        branchId: deployment.branchId,
        employeeId: dto.employeeId,
        deploymentId: deployment.id,
        clientId: deployment.clientId,
        clientSiteId: deployment.clientSiteId,
        shiftBusinessDate: businessDateObj,
        clockInTime: dto.clockInTime ? new Date(dto.clockInTime) : null,
        clockOutTime: dto.clockOutTime ? new Date(dto.clockOutTime) : null,
        status: dto.status,
        scheduledHours,
        workedHours,
        overtimeHours,
        recordedMethod: dto.recordedMethod || AttendanceMethod.WEB_MANUAL,
        recordedById: user.id,
        supervisorRemarks: dto.supervisorRemarks || null,
        isApproved: false,
        isLocked: false,
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
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
          },
        },
        clientSite: {
          select: {
            id: true,
            siteCode: true,
            siteName: true,
          },
        },
        deployment: {
          select: {
            id: true,
            shiftName: true,
            isNightShift: true,
            status: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // 8. Audit Logging
    await this.auditService.record({
      agencyId,
      branchId: deployment.branchId,
      userId: user.id,
      entityName: 'Attendance',
      entityId: created.id,
      action: AuditAction.CREATE,
      changeSummary: `Attendance recorded for ${created.employee.employeeCode} on ${dto.shiftBusinessDate} (${dto.status}, ${workedHours}h worked)`,
      newValues: {
        id: created.id,
        employeeId: dto.employeeId,
        deploymentId: deployment.id,
        status: dto.status,
        workedHours,
        overtimeHours,
        shiftBusinessDate: dto.shiftBusinessDate,
      },
    });

    return created;
  }

  // ==========================================
  // BULK RECORD ATTENDANCE (MUSTER ROLL)
  // ==========================================

  async bulkRecordAttendance(dto: BulkRecordAttendanceDto, user: AuthenticatedUserContext) {
    const results = [];
    const errors = [];

    for (const record of dto.records) {
      try {
        const item = await this.recordAttendance(
          {
            ...record,
            shiftBusinessDate: dto.shiftBusinessDate,
          },
          user,
        );
        results.push(item);
      } catch (err: any) {
        errors.push({
          employeeId: record.employeeId,
          error: err.message,
        });
      }
    }

    return {
      recordedCount: results.length,
      failedCount: errors.length,
      results,
      errors,
    };
  }

  // ==========================================
  // QUERY ATTENDANCE RECORDS
  // ==========================================

  async getAttendanceRecords(query: AttendanceQueryDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || query.branchId;

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {
      agencyId,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (query.clientId) where.clientId = query.clientId;
    if (query.clientSiteId) where.clientSiteId = query.clientSiteId;
    if (query.deploymentId) where.deploymentId = query.deploymentId;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    if (query.isApproved !== undefined) where.isApproved = query.isApproved;
    if (query.isLocked !== undefined) where.isLocked = query.isLocked;

    if (query.startDate || query.endDate) {
      where.shiftBusinessDate = {};
      if (query.startDate) where.shiftBusinessDate.gte = this.parseBusinessDate(query.startDate);
      if (query.endDate) where.shiftBusinessDate.lte = this.parseBusinessDate(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ shiftBusinessDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          // Always resolve through original historical deployment
          deployment: {
            select: {
              id: true,
              shiftName: true,
              isNightShift: true,
              startDate: true,
              endDate: true,
              status: true,
              designation: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              clientCode: true,
              companyName: true,
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
          recordedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.attendance.count({ where }),
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
  // GET ATTENDANCE DOSSIER
  // ==========================================

  async getAttendanceById(id: string, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const record = await this.prisma.attendance.findFirst({
      where: { id, agencyId },
      include: {
        employee: true,
        deployment: {
          include: {
            designation: true,
            vehicle: true,
            billingRate: true,
            salaryStructure: true,
          },
        },
        client: true,
        clientSite: true,
        recordedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
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

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    if (user.branchId && record.branchId !== user.branchId) {
      throw new ForbiddenException('You do not have access to attendance records in this branch');
    }

    return record;
  }

  // ==========================================
  // UPDATE ATTENDANCE (HOURS & REMARKS)
  // ==========================================

  async updateAttendance(id: string, dto: UpdateAttendanceDto, user: AuthenticatedUserContext) {
    const record = await this.getAttendanceById(id, user);

    if (record.isLocked) {
      throw new BadRequestException(
        'ATTENDANCE_LOCKED: Attendance record is locked by finalized payroll batch and cannot be modified',
      );
    }

    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.clockInTime !== undefined) updateData.clockInTime = dto.clockInTime ? new Date(dto.clockInTime) : null;
    if (dto.clockOutTime !== undefined) updateData.clockOutTime = dto.clockOutTime ? new Date(dto.clockOutTime) : null;
    if (dto.workedHours !== undefined) updateData.workedHours = Number(dto.workedHours);
    if (dto.overtimeHours !== undefined) updateData.overtimeHours = Number(dto.overtimeHours);
    if (dto.supervisorRemarks !== undefined) updateData.supervisorRemarks = dto.supervisorRemarks;

    // Recalculate if both clock times provided
    if (updateData.clockInTime && updateData.clockOutTime && dto.workedHours === undefined) {
      const calculated = calculateHoursFromClockTimes(
        updateData.clockInTime,
        updateData.clockOutTime,
        Number(record.scheduledHours),
      );
      updateData.workedHours = calculated.workedHours;
      updateData.overtimeHours = calculated.overtimeHours;
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: record.branchId,
      userId: user.id,
      entityName: 'Attendance',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `Attendance updated for ${record.employee.employeeCode} on ${getBusinessDateInTimezone(record.shiftBusinessDate)}`,
      oldValues: {
        status: record.status,
        workedHours: Number(record.workedHours),
        overtimeHours: Number(record.overtimeHours),
      },
      newValues: updateData,
    });

    return this.getAttendanceById(id, user);
  }

  // ==========================================
  // SUPERVISOR APPROVAL
  // ==========================================

  async approveAttendance(id: string, dto: ApproveAttendanceDto, user: AuthenticatedUserContext) {
    const record = await this.getAttendanceById(id, user);

    if (record.isLocked) {
      throw new BadRequestException('Cannot approve or modify locked attendance record');
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        isApproved: dto.isApproved,
        approvedById: dto.isApproved ? user.id : null,
        supervisorRemarks: dto.supervisorRemarks ?? record.supervisorRemarks,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: record.branchId,
      userId: user.id,
      entityName: 'Attendance',
      entityId: id,
      action: AuditAction.APPROVE,
      changeSummary: `Attendance ${dto.isApproved ? 'approved' : 'unapproved'} by supervisor ${user.fullName}`,
      newValues: {
        isApproved: dto.isApproved,
        approvedById: dto.isApproved ? user.id : null,
      },
    });

    return this.getAttendanceById(id, user);
  }

  // ==========================================
  // DAILY SITE MUSTER ROLL MATRIX
  // ==========================================

  async getDailyMusterRoll(siteId: string, dateStr: string, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId;
    const businessDateObj = this.parseBusinessDate(dateStr);

    // 1. Find all active deployments at site on dateStr
    const deployments = await this.prisma.employeeDeployment.findMany({
      where: {
        clientSiteId: siteId,
        agencyId,
        ...(branchId ? { branchId } : {}),
        startDate: { lte: businessDateObj },
        OR: [
          { endDate: null },
          { endDate: { gte: businessDateObj } },
        ],
        deletedAt: null,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        designation: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            vehicleRegistrationNumber: true,
          },
        },
        shifts: true,
      },
    });

    // 2. Find any already recorded attendances for these deployments on dateStr
    const attendances = await this.prisma.attendance.findMany({
      where: {
        clientSiteId: siteId,
        shiftBusinessDate: businessDateObj,
        agencyId,
      },
    });

    const dayOfWeek = getDayOfWeekInTimezone(dateStr);

    // 3. Map into structured muster roll list
    const muster = deployments.map((dep) => {
      const existingAttendance = attendances.find((a) => a.deploymentId === dep.id);
      const scheduledShift = dep.shifts.find((s) => s.dayOfWeek === dayOfWeek);
      const isScheduledWorkday = scheduledShift ? scheduledShift.isScheduledWorkday : true;

      return {
        deploymentId: dep.id,
        employee: dep.employee,
        designation: dep.designation,
        vehicle: dep.vehicle,
        shiftName: dep.shiftName,
        isNightShift: dep.isNightShift,
        isScheduledWorkday,
        attendance: existingAttendance || null,
      };
    });

    return {
      siteId,
      date: dateStr,
      dayOfWeek,
      totalDeployments: deployments.length,
      recordedCount: attendances.length,
      muster,
    };
  }
}
