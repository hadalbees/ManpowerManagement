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
import { AuditAction, VehicleStatus, VehicleType, FuelType } from '@prisma/client';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  UpdateVehicleStatusDto,
  VehicleQueryDto,
} from './dto/vehicle.dto';
import {
  AssignVehicleDto,
  EndVehicleAssignmentDto,
} from './dto/vehicle-assignment.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Normalizes Indian vehicle registration numbers consistently.
   * Converts to uppercase, strips whitespace and special punctuation (e.g. 'TN 01 AB 1234' -> 'TN01AB1234').
   */
  normalizeRegistrationNumber(reg: string): string {
    if (!reg) return '';
    return reg.trim().toUpperCase().replace(/[\s\-_]/g, '');
  }

  // ==========================================
  // METADATA & CONFIGURATION
  // ==========================================

  getVehicleTypes() {
    return [
      { code: 'SEDAN', label: 'Sedan' },
      { code: 'SUV', label: 'Sports Utility Vehicle (SUV)' },
      { code: 'BUS', label: 'Commercial Passenger Bus' },
      { code: 'VAN', label: 'Van / Minivan' },
      { code: 'TRUCK', label: 'Heavy Goods Truck' },
      { code: 'AUTO', label: 'Auto Rickshaw' },
    ];
  }

  getFuelTypes() {
    return [
      { code: 'DIESEL', label: 'Diesel' },
      { code: 'PETROL', label: 'Petrol' },
      { code: 'CNG', label: 'Compressed Natural Gas (CNG)' },
      { code: 'ELECTRIC', label: 'Electric (EV)' },
    ];
  }

  getVehicleStatuses() {
    return [
      { code: 'AVAILABLE', label: 'Available for Assignment' },
      { code: 'ASSIGNED', label: 'Assigned to Driver' },
      { code: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
      { code: 'GROUNDED', label: 'Grounded / Retired' },
    ];
  }

  // ==========================================
  // VEHICLE MASTER CRUD
  // ==========================================

  async createVehicle(dto: CreateVehicleDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || dto.branchId;

    if (!branchId) {
      throw new BadRequestException('Branch ID is required for vehicle assignment');
    }

    // Verify branch belongs to user's agency
    const branch = await this.prisma.agencyBranch.findFirst({
      where: { id: branchId, agencyId, deletedAt: null },
    });
    if (!branch) {
      throw new ForbiddenException('Selected branch does not belong to your agency');
    }

    const normalizedReg = this.normalizeRegistrationNumber(dto.vehicleRegistrationNumber);

    // Verify registration uniqueness
    const existing = await this.prisma.vehicle.findUnique({
      where: {
        agencyId_vehicleRegistrationNumber: {
          agencyId,
          vehicleRegistrationNumber: normalizedReg,
        },
      },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        `Vehicle with registration number ${normalizedReg} already exists in this agency`,
      );
    }

    // Verify client if provided
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, agencyId, deletedAt: null },
      });
      if (!client) {
        throw new NotFoundException('Specified client organization not found');
      }
    }

    const vehicle = await this.prisma.vehicle.create({
      data: {
        agencyId,
        branchId,
        clientId: dto.clientId || null,
        vehicleRegistrationNumber: normalizedReg,
        vehicleMake: dto.vehicleMake.trim(),
        vehicleModel: dto.vehicleModel.trim(),
        vehicleType: dto.vehicleType as VehicleType,
        fuelType: dto.fuelType as FuelType,
        chassisNumber: dto.chassisNumber.trim().toUpperCase(),
        engineNumber: dto.engineNumber.trim().toUpperCase(),
        manufacturingYear: dto.manufacturingYear,
        currentOdometerKm: dto.currentOdometerKm || 0,
        status: VehicleStatus.AVAILABLE,
      },
      include: {
        branch: { select: { id: true, branchName: true, branchCode: true } },
        client: { select: { id: true, companyName: true, clientCode: true } },
      },
    });

    await this.auditService.record({
      agencyId,
      branchId,
      userId: user.id,
      entityName: 'Vehicle',
      entityId: vehicle.id,
      action: AuditAction.CREATE,
      newValues: {
        registration: vehicle.vehicleRegistrationNumber,
        make: vehicle.vehicleMake,
        model: vehicle.vehicleModel,
        status: vehicle.status,
      },
      changeSummary: `VEHICLE_CREATED: Registered fleet vehicle ${vehicle.vehicleRegistrationNumber}`,
    });

    return vehicle;
  }

  async getVehicles(query: VehicleQueryDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchFilter = user.branchId || query.branchId;

    const where: any = {
      agencyId,
      deletedAt: null,
    };

    if (branchFilter) {
      where.branchId = branchFilter;
    }

    if (query.vehicleType) {
      where.vehicleType = query.vehicleType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.fuelType) {
      where.fuelType = query.fuelType;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.search) {
      const s = query.search.trim();
      const normalizedSearch = this.normalizeRegistrationNumber(s);
      where.OR = [
        { vehicleRegistrationNumber: { contains: normalizedSearch, mode: 'insensitive' } },
        { vehicleMake: { contains: s, mode: 'insensitive' } },
        { vehicleModel: { contains: s, mode: 'insensitive' } },
        { chassisNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, branchName: true, branchCode: true } },
          client: { select: { id: true, companyName: true, clientCode: true } },
          assignments: {
            where: { deletedAt: null, endDatetime: null },
            take: 1,
            orderBy: { startDatetime: 'desc' },
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
            },
          },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    const formatted = items.map((v: any) => {
      const activeAssignment = v.assignments?.[0] || null;
      return {
        ...v,
        currentAssignment: activeAssignment,
      };
    });

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVehicleById(id: string, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const vehicle: any = await this.prisma.vehicle.findFirst({
      where: { id, agencyId, deletedAt: null },
      include: {
        branch: { select: { id: true, branchName: true, branchCode: true } },
        client: { select: { id: true, companyName: true, clientCode: true } },
        assignments: {
          where: { deletedAt: null },
          orderBy: { startDatetime: 'desc' },
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                phone: true,
                status: true,
                drivingLicenseNumber: true,
                drivingLicenseClass: true,
              },
            },
            clientSite: { select: { id: true, siteName: true, siteCode: true } },
            assignedBy: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    if (user.branchId && vehicle.branchId !== user.branchId) {
      throw new ForbiddenException('Access to vehicle in another branch is unauthorized');
    }

    // Identify current active assignment (endDatetime is null or in future)
    const now = new Date();
    const currentAssignment =
      vehicle.assignments?.find((a: any) => !a.endDatetime || new Date(a.endDatetime) > now) || null;

    // Retrieve linked polymorphic documents
    const documents = await this.prisma.document.findMany({
      where: {
        agencyId,
        entityType: 'VEHICLE',
        entityId: id,
        deletedAt: null,
      },
      include: {
        documentType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...vehicle,
      currentAssignment,
      documents,
    };
  }

  async updateVehicle(id: string, dto: UpdateVehicleDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, agencyId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    if (user.branchId && vehicle.branchId !== user.branchId) {
      throw new ForbiddenException('Access to vehicle in another branch is unauthorized');
    }

    // Verify client if changed
    if (dto.clientId !== undefined && dto.clientId !== null) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, agencyId, deletedAt: null },
      });
      if (!client) {
        throw new NotFoundException('Specified client organization not found');
      }
    }

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        vehicleMake: dto.vehicleMake ? dto.vehicleMake.trim() : undefined,
        vehicleModel: dto.vehicleModel ? dto.vehicleModel.trim() : undefined,
        vehicleType: dto.vehicleType ? (dto.vehicleType as VehicleType) : undefined,
        fuelType: dto.fuelType ? (dto.fuelType as FuelType) : undefined,
        chassisNumber: dto.chassisNumber ? dto.chassisNumber.trim().toUpperCase() : undefined,
        engineNumber: dto.engineNumber ? dto.engineNumber.trim().toUpperCase() : undefined,
        manufacturingYear: dto.manufacturingYear || undefined,
        currentOdometerKm: dto.currentOdometerKm !== undefined ? dto.currentOdometerKm : undefined,
        clientId: dto.clientId !== undefined ? dto.clientId : undefined,
      },
      include: {
        branch: { select: { id: true, branchName: true, branchCode: true } },
        client: { select: { id: true, companyName: true, clientCode: true } },
      },
    });

    await this.auditService.record({
      agencyId,
      branchId: vehicle.branchId,
      userId: user.id,
      entityName: 'Vehicle',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: {
        make: vehicle.vehicleMake,
        model: vehicle.vehicleModel,
        odometer: vehicle.currentOdometerKm,
      },
      newValues: {
        make: updated.vehicleMake,
        model: updated.vehicleModel,
        odometer: updated.currentOdometerKm,
      },
      changeSummary: `VEHICLE_UPDATED: Updated technical attributes of ${vehicle.vehicleRegistrationNumber}`,
    });

    return updated;
  }

  async updateVehicleStatus(id: string, dto: UpdateVehicleStatusDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, agencyId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    if (user.branchId && vehicle.branchId !== user.branchId) {
      throw new ForbiddenException('Access to vehicle in another branch is unauthorized');
    }

    const oldStatus = vehicle.status;
    const newStatus = dto.status as VehicleStatus;

    // Check if grounding or placing under maintenance while active assignment exists
    if (newStatus === VehicleStatus.GROUNDED || newStatus === VehicleStatus.UNDER_MAINTENANCE) {
      const activeAssignment = await this.prisma.vehicleAssignment.findFirst({
        where: {
          vehicleId: id,
          deletedAt: null,
          endDatetime: null,
        },
      });

      if (activeAssignment) {
        throw new BadRequestException(
          `Cannot transition vehicle to ${newStatus} while an active driver assignment exists. End the assignment first.`,
        );
      }
    }

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: { status: newStatus },
      include: {
        branch: { select: { id: true, branchName: true, branchCode: true } },
      },
    });

    await this.auditService.record({
      agencyId,
      branchId: vehicle.branchId,
      userId: user.id,
      entityName: 'Vehicle',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus, remarks: dto.remarks },
      changeSummary: `VEHICLE_STATUS_CHANGED: Transitioned ${vehicle.vehicleRegistrationNumber} from ${oldStatus} to ${newStatus}`,
    });

    return updated;
  }

  async deleteVehicle(id: string, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, agencyId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    if (user.branchId && vehicle.branchId !== user.branchId) {
      throw new ForbiddenException('Access to vehicle in another branch is unauthorized');
    }

    // Invariant: Cannot soft delete if active assignments exist
    const activeAssignment = await this.prisma.vehicleAssignment.findFirst({
      where: {
        vehicleId: id,
        deletedAt: null,
        OR: [
          { endDatetime: null },
          { endDatetime: { gt: new Date() } },
        ],
      },
    });

    if (activeAssignment) {
      throw new ConflictException(
        'VEHICLE_HAS_ACTIVE_ASSIGNMENTS: Cannot deactivate vehicle while currently assigned to a driver',
      );
    }

    await this.prisma.vehicle.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: VehicleStatus.GROUNDED,
      },
    });

    await this.auditService.record({
      agencyId,
      branchId: vehicle.branchId,
      userId: user.id,
      entityName: 'Vehicle',
      entityId: id,
      action: AuditAction.DELETE,
      changeSummary: `VEHICLE_DELETED: Soft-deleted vehicle ${vehicle.vehicleRegistrationNumber}`,
    });

    return { message: `Vehicle ${vehicle.vehicleRegistrationNumber} successfully deactivated` };
  }

  // ==========================================
  // VEHICLE ASSIGNMENTS (TEMPORAL LEDGER)
  // ==========================================

  async assignVehicle(vehicleId: string, dto: AssignVehicleDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, agencyId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    if (user.branchId && vehicle.branchId !== user.branchId) {
      throw new ForbiddenException('Access to vehicle in another branch is unauthorized');
    }

    // Business Rule 3: Only AVAILABLE vehicle can receive a new assignment
    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestException(
        `Vehicle ${vehicle.vehicleRegistrationNumber} cannot receive assignments in status ${vehicle.status}. Must be AVAILABLE.`,
      );
    }

    // Business Rule 4: Validate employee
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, agencyId, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Assigned employee not found');
    }

    if (user.branchId && employee.branchId !== user.branchId) {
      throw new ForbiddenException('Cannot assign an employee from another branch');
    }

    if (employee.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Employee ${employee.employeeCode} cannot receive assignments in status ${employee.status}. Must be ACTIVE.`,
      );
    }

    const startDt = new Date(dto.startDatetime);
    const endDt = dto.endDatetime ? new Date(dto.endDatetime) : null;

    if (endDt && endDt <= startDt) {
      throw new BadRequestException('End datetime must be strictly after start datetime');
    }

    // Business Rule 7: Vehicle Assignment Overlap Check
    // Check if vehicle has any overlapping active assignment
    const overlappingVehicle = await this.prisma.vehicleAssignment.findFirst({
      where: {
        vehicleId,
        deletedAt: null,
        OR: [
          // If existing is open-ended
          {
            endDatetime: null,
            ...(endDt ? { startDatetime: { lte: endDt } } : {}),
          },
          // If existing has end date
          {
            endDatetime: { gte: startDt },
            ...(endDt ? { startDatetime: { lte: endDt } } : {}),
          },
        ],
      },
    });

    if (overlappingVehicle) {
      throw new ConflictException(
        'VEHICLE_ASSIGNMENT_TEMPORAL_OVERLAP: Vehicle already has an active driver assignment for the requested period',
      );
    }

    // Business Rule 8: Driver Conflict Check
    // The same employee cannot be concurrently assigned to another vehicle
    const overlappingDriver = await this.prisma.vehicleAssignment.findFirst({
      where: {
        employeeId: dto.employeeId,
        deletedAt: null,
        OR: [
          {
            endDatetime: null,
            ...(endDt ? { startDatetime: { lte: endDt } } : {}),
          },
          {
            endDatetime: { gte: startDt },
            ...(endDt ? { startDatetime: { lte: endDt } } : {}),
          },
        ],
      },
    });

    if (overlappingDriver) {
      throw new ConflictException(
        'EMPLOYEE_ALREADY_ASSIGNED_TO_VEHICLE: Employee is already assigned to another vehicle for this period',
      );
    }

    // Execute Assignment Creation within Interactive Transaction
    const assignment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vehicleAssignment.create({
        data: {
          vehicleId,
          employeeId: dto.employeeId,
          clientSiteId: dto.clientSiteId || null,
          startDatetime: startDt,
          endDatetime: endDt,
          startOdometerKm: dto.startOdometerKm,
          handoverConditionNotes: dto.handoverConditionNotes ? dto.handoverConditionNotes.trim() : null,
          reasonForChange: dto.reasonForChange ? dto.reasonForChange.trim() : null,
          assignedById: user.id,
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
          vehicle: {
            select: {
              id: true,
              vehicleRegistrationNumber: true,
              vehicleMake: true,
              vehicleModel: true,
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

      // Update vehicle status to ASSIGNED and update odometer if start odometer is higher
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          status: VehicleStatus.ASSIGNED,
          currentOdometerKm: Math.max(vehicle.currentOdometerKm, dto.startOdometerKm),
        },
      });

      return created;
    });

    await this.auditService.record({
      agencyId,
      branchId: vehicle.branchId,
      userId: user.id,
      entityName: 'VehicleAssignment',
      entityId: assignment.id,
      action: AuditAction.CREATE,
      newValues: {
        vehicleId,
        employeeId: dto.employeeId,
        startDatetime: dto.startDatetime,
        startOdometer: dto.startOdometerKm,
      },
      changeSummary: `VEHICLE_ASSIGNMENT_CREATED: Assigned vehicle ${vehicle.vehicleRegistrationNumber} to employee ${employee.employeeCode}`,
    });

    return assignment;
  }

  async endVehicleAssignment(
    vehicleId: string,
    assignmentId: string,
    dto: EndVehicleAssignmentDto,
    user: AuthenticatedUserContext,
  ) {
    const agencyId = user.agencyId;

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, agencyId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    if (user.branchId && vehicle.branchId !== user.branchId) {
      throw new ForbiddenException('Access to vehicle in another branch is unauthorized');
    }

    const assignment = await this.prisma.vehicleAssignment.findFirst({
      where: { id: assignmentId, vehicleId, deletedAt: null },
      include: { employee: true },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found for this vehicle`);
    }

    if (assignment.endDatetime && new Date(assignment.endDatetime) <= new Date()) {
      throw new BadRequestException('This vehicle assignment has already been ended');
    }

    const endDt = new Date(dto.endDatetime);
    if (endDt <= new Date(assignment.startDatetime)) {
      throw new BadRequestException('End datetime must be after assignment start datetime');
    }

    if (dto.endOdometerKm < assignment.startOdometerKm) {
      throw new BadRequestException(
        `End odometer (${dto.endOdometerKm} km) cannot be less than start odometer (${assignment.startOdometerKm} km)`,
      );
    }

    const endedAssignment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleAssignment.update({
        where: { id: assignmentId },
        data: {
          endDatetime: endDt,
          endOdometerKm: dto.endOdometerKm,
          returnConditionNotes: dto.returnConditionNotes ? dto.returnConditionNotes.trim() : null,
          reasonForChange: dto.reasonForChange ? dto.reasonForChange.trim() : assignment.reasonForChange,
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
          vehicle: true,
        },
      });

      // Reset vehicle status to AVAILABLE and update current odometer
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          status: VehicleStatus.AVAILABLE,
          currentOdometerKm: Math.max(vehicle.currentOdometerKm, dto.endOdometerKm),
        },
      });

      return updated;
    });

    await this.auditService.record({
      agencyId,
      branchId: vehicle.branchId,
      userId: user.id,
      entityName: 'VehicleAssignment',
      entityId: assignmentId,
      action: AuditAction.UPDATE,
      oldValues: {
        startDatetime: assignment.startDatetime,
        startOdometer: assignment.startOdometerKm,
      },
      newValues: {
        endDatetime: dto.endDatetime,
        endOdometer: dto.endOdometerKm,
        returnNotes: dto.returnConditionNotes,
      },
      changeSummary: `VEHICLE_ASSIGNMENT_ENDED: Completed return of vehicle ${vehicle.vehicleRegistrationNumber} from employee ${assignment.employee.employeeCode}`,
    });

    return endedAssignment;
  }

  async getVehicleAssignments(vehicleId: string, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, agencyId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    if (user.branchId && vehicle.branchId !== user.branchId) {
      throw new ForbiddenException('Access to vehicle in another branch is unauthorized');
    }

    return this.prisma.vehicleAssignment.findMany({
      where: { vehicleId, deletedAt: null },
      orderBy: { startDatetime: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            phone: true,
            drivingLicenseNumber: true,
            drivingLicenseClass: true,
          },
        },
        clientSite: { select: { id: true, siteName: true, siteCode: true } },
        assignedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async getEmployeeVehicleHistory(employeeId: string, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, agencyId, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (user.branchId && employee.branchId !== user.branchId) {
      throw new ForbiddenException('Access to employee records in another branch is unauthorized');
    }

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
        clientSite: { select: { id: true, siteName: true, siteCode: true } },
        assignedBy: { select: { id: true, fullName: true } },
      },
    });
  }
}
