import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StatutoryService } from './statutory.service';
import { PayslipService } from './payslip.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  PayrollBatchStatus,
  AuditAction,
  AttendanceStatus,
  AdvanceStatus,
  EmployeeStatus,
} from '@prisma/client';
import {
  CreatePayrollBatchDto,
  CalculatePayrollBatchDto,
  LockPayrollBatchDto,
  FinalizePayrollBatchDto,
  PayrollBatchQueryDto,
  SalaryCalculationQueryDto,
  CreateSalaryAdvanceDto,
  SalaryAdvanceQueryDto,
} from './dto/payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly statutoryService: StatutoryService,
    private readonly payslipService: PayslipService,
  ) {}

  // ==========================================
  // 1. PAYROLL BATCH MANAGEMENT
  // ==========================================

  async createBatch(dto: CreatePayrollBatchDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || dto.branchId;

    if (user.branchId && user.branchId !== dto.branchId) {
      throw new ForbiddenException('Cannot create payroll batch for another branch');
    }

    const branch = await this.prisma.agencyBranch.findFirst({
      where: { id: branchId, agencyId, deletedAt: null },
    });
    if (!branch) {
      throw new NotFoundException('Agency branch not found');
    }

    // Check duplicate active batch
    const existing = await this.prisma.payrollBatch.findUnique({
      where: {
        branchId_month_year: {
          branchId,
          month: dto.month,
          year: dto.year,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `PAYROLL_BATCH_EXISTS: Payroll batch already exists for ${branch.branchName} (${dto.month}/${dto.year}) with status '${existing.status}'`,
      );
    }

    const monthStr = dto.month.toString().padStart(2, '0');
    const batchNumber = `${branch.branchCode}/PAYROLL/${dto.year}${monthStr}`;

    const batch = await this.prisma.payrollBatch.create({
      data: {
        agencyId,
        branchId,
        batchNumber,
        month: dto.month,
        year: dto.year,
        status: PayrollBatchStatus.DRAFT,
      },
      include: {
        branch: true,
      },
    });

    await this.auditService.record({
      agencyId,
      branchId,
      userId: user.id,
      entityName: 'PayrollBatch',
      entityId: batch.id,
      action: AuditAction.CREATE,
      changeSummary: `PAYROLL_CREATED: Created batch ${batchNumber} for ${dto.month}/${dto.year}`,
      newValues: { id: batch.id, batchNumber, month: dto.month, year: dto.year },
    });

    return batch;
  }

  async getBatches(query: PayrollBatchQueryDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || query.branchId;

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      agencyId,
      ...(branchId ? { branchId } : {}),
    };

    if (query.month) where.month = query.month;
    if (query.year) where.year = query.year;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.payrollBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          branch: { select: { id: true, branchName: true, branchCode: true } },
          approvedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.payrollBatch.count({ where }),
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

  async getBatchById(id: string, user: AuthenticatedUserContext) {
    const batch = await this.prisma.payrollBatch.findUnique({
      where: { id },
      include: {
        branch: true,
        approvedBy: { select: { id: true, fullName: true, email: true } },
        calculations: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                primaryDesignation: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!batch || batch.agencyId !== user.agencyId) {
      throw new NotFoundException('Payroll batch not found');
    }
    if (user.branchId && batch.branchId !== user.branchId) {
      throw new ForbiddenException('Payroll batch belongs to a different branch');
    }

    return batch;
  }

  // ==========================================
  // 2. CALCULATION ENGINE
  // ==========================================

  async calculateBatch(id: string, dto: CalculatePayrollBatchDto, user: AuthenticatedUserContext) {
    const batch = await this.getBatchById(id, user);

    if (batch.status === PayrollBatchStatus.LOCKED) {
      throw new BadRequestException('PAYROLL_LOCKED: Cannot recalculate a locked payroll batch');
    }

    const { month, year, branchId, agencyId } = batch;
    const totalCalendarDays = new Date(year, month, 0).getDate();
    const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(year, month - 1, totalCalendarDays, 23, 59, 59, 999));

    // Resolve statutory rules for this branch and agency
    const branch = await this.prisma.agencyBranch.findUnique({ where: { id: branchId } });
    const statutoryRules = await this.statutoryService.resolveRulesForPeriod(
      agencyId,
      branch?.stateCode || null,
      periodStart,
    );

    // 1. Fetch eligible employees
    const employees = await this.prisma.employee.findMany({
      where: {
        agencyId,
        branchId,
        deletedAt: null,
        dateOfJoining: { lte: periodEnd },
        OR: [{ dateOfLeaving: null }, { dateOfLeaving: { gte: periodStart } }],
      },
      include: {
        salaryStructures: {
          where: {
            deletedAt: null,
            effectiveFrom: { lte: periodEnd },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
          },
          orderBy: { effectiveFrom: 'desc' },
        },
        salaryAdvances: {
          where: {
            status: AdvanceStatus.ACTIVE,
          },
        },
      },
    });

    let batchTotalGross = 0;
    let batchTotalDeductions = 0;
    let batchTotalNet = 0;
    let processedEmployees = 0;

    for (const employee of employees) {
      const salaryStructure = employee.salaryStructures[0];
      if (!salaryStructure) {
        continue; // Skip worker without salary structure
      }

      // Calculate attendance work records for this employee in this month
      const attendances = await this.prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          shiftBusinessDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      let presentDays = 0;
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      let weekOffDays = 0;
      let overtimeHours = 0;

      for (const att of attendances) {
        if (att.status === AttendanceStatus.PRESENT) {
          presentDays += 1.0;
        } else if (att.status === AttendanceStatus.HALF_DAY) {
          presentDays += 0.5;
        } else if (att.status === AttendanceStatus.PAID_LEAVE) {
          paidLeaveDays += 1.0;
        } else if (att.status === AttendanceStatus.UNPAID_LEAVE || att.status === AttendanceStatus.ABSENT) {
          unpaidLeaveDays += 1.0;
        } else if (att.status === AttendanceStatus.WEEK_OFF || att.status === AttendanceStatus.HOLIDAY) {
          weekOffDays += 1.0;
        }
        overtimeHours += Number(att.overtimeHours);
      }

      const payableDays = Math.min(totalCalendarDays, presentDays + paidLeaveDays + weekOffDays);
      const prorationFactor = totalCalendarDays > 0 ? payableDays / totalCalendarDays : 0;

      // Earnings calculations
      const basicEarned = Number((Number(salaryStructure.basicPay) * prorationFactor).toFixed(2));
      const daEarned = Number((Number(salaryStructure.dearnessAllowance) * prorationFactor).toFixed(2));
      const hraEarned = Number((Number(salaryStructure.houseRentAllowance) * prorationFactor).toFixed(2));
      const conveyanceEarned = Number((Number(salaryStructure.conveyanceAllowance) * prorationFactor).toFixed(2));
      const specialAllowanceEarned = Number(
        (Number(salaryStructure.specialAllowance) * prorationFactor).toFixed(2),
      );
      const overtimeAmount = Number(
        (overtimeHours * Number(salaryStructure.overtimeRatePerHour)).toFixed(2),
      );

      const grossSalary = Number(
        (
          basicEarned +
          daEarned +
          hraEarned +
          conveyanceEarned +
          specialAllowanceEarned +
          overtimeAmount
        ).toFixed(2),
      );

      // Statutory deductions
      const statutories = this.statutoryService.calculateStatutories({
        basicEarned,
        daEarned,
        grossSalary,
        pfApplicable: salaryStructure.pfApplicable,
        esiApplicable: salaryStructure.esiApplicable,
        ptApplicable: salaryStructure.ptApplicable,
        lwfApplicable: salaryStructure.lwfApplicable,
        stateCode: branch?.stateCode,
        ...statutoryRules,
      });

      // Salary advance deduction
      let advanceDeduction = 0;
      for (const advance of employee.salaryAdvances) {
        const canStart =
          advance.repaymentStartYear < year ||
          (advance.repaymentStartYear === year && advance.repaymentStartMonth <= month);

        if (canStart && Number(advance.balanceRemaining) > 0) {
          const installment = Math.min(
            Number(advance.monthlyDeductionAmount),
            Number(advance.balanceRemaining),
          );
          advanceDeduction += installment;
        }
      }

      const otherDeductions = 0.0;
      const totalDeductions = Number(
        (
          statutories.epfEmployee +
          statutories.esicEmployee +
          statutories.professionalTax +
          statutories.lwfEmployee +
          advanceDeduction +
          otherDeductions
        ).toFixed(2),
      );

      const netSalary = Math.max(0, Number((grossSalary - totalDeductions).toFixed(2)));

      // Upsert SalaryCalculation
      await this.prisma.salaryCalculation.upsert({
        where: {
          payrollBatchId_employeeId: {
            payrollBatchId: batch.id,
            employeeId: employee.id,
          },
        },
        update: {
          salaryStructureId: salaryStructure.id,
          month,
          year,
          totalCalendarDays,
          presentDays,
          paidLeaveDays,
          unpaidLeaveDays,
          weekOffDays,
          payableDays,
          overtimeHours,
          basicEarned,
          daEarned,
          hraEarned,
          conveyanceEarned,
          specialAllowanceEarned,
          overtimeAmount,
          grossSalary,
          epfEmployee: statutories.epfEmployee,
          epfEmployer: statutories.epfEmployer,
          epfEpsEmployer: statutories.epfEpsEmployer,
          esicEmployee: statutories.esicEmployee,
          esicEmployer: statutories.esicEmployer,
          professionalTax: statutories.professionalTax,
          lwfEmployee: statutories.lwfEmployee,
          advanceDeduction,
          otherDeductions,
          totalDeductions,
          netSalary,
          bankAccountNoSnapshot: employee.bankAccountNoMasked,
          bankIfscSnapshot: employee.bankIfsc,
        },
        create: {
          payrollBatchId: batch.id,
          employeeId: employee.id,
          salaryStructureId: salaryStructure.id,
          month,
          year,
          totalCalendarDays,
          presentDays,
          paidLeaveDays,
          unpaidLeaveDays,
          weekOffDays,
          payableDays,
          overtimeHours,
          basicEarned,
          daEarned,
          hraEarned,
          conveyanceEarned,
          specialAllowanceEarned,
          overtimeAmount,
          grossSalary,
          epfEmployee: statutories.epfEmployee,
          epfEmployer: statutories.epfEmployer,
          epfEpsEmployer: statutories.epfEpsEmployer,
          esicEmployee: statutories.esicEmployee,
          esicEmployer: statutories.esicEmployer,
          professionalTax: statutories.professionalTax,
          lwfEmployee: statutories.lwfEmployee,
          advanceDeduction,
          otherDeductions,
          totalDeductions,
          netSalary,
          bankAccountNoSnapshot: employee.bankAccountNoMasked,
          bankIfscSnapshot: employee.bankIfsc,
        },
      });

      batchTotalGross += grossSalary;
      batchTotalDeductions += totalDeductions;
      batchTotalNet += netSalary;
      processedEmployees += 1;
    }

    // Update batch aggregates
    const updatedBatch = await this.prisma.payrollBatch.update({
      where: { id: batch.id },
      data: {
        totalEmployees: processedEmployees,
        totalGrossWages: Number(batchTotalGross.toFixed(2)),
        totalDeductions: Number(batchTotalDeductions.toFixed(2)),
        totalNetWages: Number(batchTotalNet.toFixed(2)),
        status: PayrollBatchStatus.REVIEWED,
      },
      include: {
        branch: true,
        calculations: {
          include: {
            employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    await this.auditService.record({
      agencyId,
      branchId,
      userId: user.id,
      entityName: 'PayrollBatch',
      entityId: batch.id,
      action: AuditAction.UPDATE,
      changeSummary: `PAYROLL_CALCULATED: Calculated wages for ${processedEmployees} employees in batch ${batch.batchNumber}`,
      newValues: {
        totalEmployees: processedEmployees,
        totalGrossWages: batchTotalGross,
        totalNetWages: batchTotalNet,
      },
    });

    return updatedBatch;
  }

  // ==========================================
  // 3. LOCK & FINALIZE WORKFLOWS
  // ==========================================

  async lockBatch(id: string, dto: LockPayrollBatchDto, user: AuthenticatedUserContext) {
    const batch = await this.getBatchById(id, user);

    if (batch.status === PayrollBatchStatus.LOCKED) {
      return batch;
    }

    const { month, year, branchId, agencyId } = batch;
    const totalCalendarDays = new Date(year, month, 0).getDate();
    const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(year, month - 1, totalCalendarDays, 23, 59, 59, 999));

    // Update advance balances
    for (const calc of batch.calculations) {
      if (Number(calc.advanceDeduction) > 0) {
        const advances = await this.prisma.salaryAdvance.findMany({
          where: { employeeId: calc.employeeId, status: AdvanceStatus.ACTIVE },
        });
        let remDeduct = Number(calc.advanceDeduction);
        for (const adv of advances) {
          if (remDeduct <= 0) break;
          const toDeduct = Math.min(Number(adv.balanceRemaining), remDeduct);
          const newRecovered = Number(adv.recoveredAmount) + toDeduct;
          const newRemaining = Number(adv.balanceRemaining) - toDeduct;
          await this.prisma.salaryAdvance.update({
            where: { id: adv.id },
            data: {
              recoveredAmount: newRecovered,
              balanceRemaining: newRemaining,
              status: newRemaining <= 0 ? AdvanceStatus.FULLY_RECOVERED : AdvanceStatus.ACTIVE,
            },
          });
          remDeduct -= toDeduct;
        }
      }
    }

    // Lock corresponding attendances
    await this.prisma.attendance.updateMany({
      where: {
        agencyId,
        branchId,
        shiftBusinessDate: { gte: periodStart, lte: periodEnd },
      },
      data: {
        isLocked: true,
      },
    });

    // Update batch status to LOCKED
    const lockedBatch = await this.prisma.payrollBatch.update({
      where: { id },
      data: {
        status: PayrollBatchStatus.LOCKED,
        lockedAt: new Date(),
        approvedById: user.id,
        approvedAt: new Date(),
      },
      include: {
        branch: true,
        calculations: true,
      },
    });

    // Automatically generate payslips for the locked batch
    await this.payslipService.generatePayslipsForBatch(batch.id, user);

    await this.auditService.record({
      agencyId,
      branchId,
      userId: user.id,
      entityName: 'PayrollBatch',
      entityId: id,
      action: AuditAction.LOCK,
      changeSummary: `PAYROLL_LOCKED: Locked payroll batch ${batch.batchNumber} and generated payslips`,
      newValues: { status: PayrollBatchStatus.LOCKED },
    });

    return lockedBatch;
  }

  async finalizeBatch(id: string, dto: FinalizePayrollBatchDto, user: AuthenticatedUserContext) {
    const batch = await this.getBatchById(id, user);

    if (batch.status !== PayrollBatchStatus.LOCKED) {
      return this.lockBatch(id, {}, user);
    }

    return batch;
  }

  // ==========================================
  // 4. SALARY CALCULATIONS QUERY
  // ==========================================

  async getCalculations(query: SalaryCalculationQueryDto, user: AuthenticatedUserContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {
      payrollBatch: {
        agencyId: user.agencyId,
        ...(user.branchId ? { branchId: user.branchId } : {}),
      },
    };

    if (query.payrollBatchId) where.payrollBatchId = query.payrollBatchId;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.month) where.month = query.month;
    if (query.year) where.year = query.year;

    const [items, total] = await Promise.all([
      this.prisma.salaryCalculation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              branch: { select: { id: true, branchName: true, branchCode: true } },
              primaryDesignation: { select: { id: true, name: true } },
            },
          },
          salaryStructure: true,
          payslip: { select: { id: true, payslipNumber: true, isPublished: true } },
        },
      }),
      this.prisma.salaryCalculation.count({ where }),
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
  // 5. SALARY ADVANCE MANAGEMENT
  // ==========================================

  async createAdvance(dto: CreateSalaryAdvanceDto, user: AuthenticatedUserContext) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, agencyId: user.agencyId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found or unauthorized');
    }
    if (user.branchId && employee.branchId !== user.branchId) {
      throw new ForbiddenException('Employee belongs to a different branch');
    }

    const advance = await this.prisma.salaryAdvance.create({
      data: {
        employeeId: dto.employeeId,
        advanceAmount: dto.advanceAmount,
        disbursedDate: new Date(dto.disbursedDate),
        repaymentStartMonth: dto.repaymentStartMonth,
        repaymentStartYear: dto.repaymentStartYear,
        totalInstallments: dto.totalInstallments,
        monthlyDeductionAmount: dto.monthlyDeductionAmount,
        recoveredAmount: 0.0,
        balanceRemaining: dto.advanceAmount,
        status: AdvanceStatus.ACTIVE,
        approvedById: user.id,
        notes: dto.notes,
      },
      include: {
        employee: true,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: employee.branchId,
      userId: user.id,
      entityName: 'SalaryAdvance',
      entityId: advance.id,
      action: AuditAction.CREATE,
      changeSummary: `ADVANCE_CREATED: Disbursed salary advance of ₹${dto.advanceAmount} to ${employee.employeeCode}`,
      newValues: { id: advance.id, amount: dto.advanceAmount },
    });

    return advance;
  }

  async getAdvances(query: SalaryAdvanceQueryDto, user: AuthenticatedUserContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {
      employee: {
        agencyId: user.agencyId,
        ...(user.branchId ? { branchId: user.branchId } : {}),
      },
    };

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.salaryAdvance.findMany({
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
              branch: { select: { id: true, branchName: true, branchCode: true } },
            },
          },
        },
      }),
      this.prisma.salaryAdvance.count({ where }),
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
}
