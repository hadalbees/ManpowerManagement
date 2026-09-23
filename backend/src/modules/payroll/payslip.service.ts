import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PayslipQueryDto } from './dto/payroll.dto';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';

@Injectable()
export class PayslipService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a unique, transaction-safe payslip number: {BRANCH_CODE}/PAY/{YEAR}{MONTH}/{SEQUENCE}
   */
  async generatePayslipNumber(branchCode: string, year: number, month: number): Promise<string> {
    const monthStr = month.toString().padStart(2, '0');
    const prefix = `${branchCode}/PAY/${year}${monthStr}/`;

    // Count existing payslips for this prefix to calculate next sequence
    const existingCount = await this.prisma.payslip.count({
      where: {
        payslipNumber: { startsWith: prefix },
      },
    });

    const seq = (existingCount + 1).toString().padStart(4, '0');
    return `${prefix}${seq}`;
  }

  /**
   * Generates payslips for all calculations in a locked/approved payroll batch
   */
  async generatePayslipsForBatch(payrollBatchId: string, user: AuthenticatedUserContext) {
    const batch = await this.prisma.payrollBatch.findUnique({
      where: { id: payrollBatchId },
      include: {
        branch: true,
        calculations: {
          include: {
            employee: {
              include: { primaryDesignation: true, branch: true },
            },
            payslip: true,
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Payroll batch not found');
    }

    const branchCode = batch.branch.branchCode;
    const year = batch.year;
    const month = batch.month;

    const generatedPayslips = [];

    for (const calc of batch.calculations) {
      if (calc.payslip) {
        generatedPayslips.push(calc.payslip);
        continue;
      }

      const payslipNumber = await this.generatePayslipNumber(branchCode, year, month);

      const snapshotData = {
        payslipNumber,
        batchNumber: batch.batchNumber,
        employee: {
          id: calc.employee.id,
          employeeCode: calc.employee.employeeCode,
          name: `${calc.employee.firstName} ${calc.employee.lastName}`,
          designation: calc.employee.primaryDesignation?.name || 'Staff',
          branch: batch.branch.branchName,
          joiningDate: calc.employee.dateOfJoining,
          uan: calc.employee.uanNumber,
          esic: calc.employee.esicIpNumber,
          bankAccountMasked: calc.bankAccountNoSnapshot,
          bankIfsc: calc.bankIfscSnapshot,
        },
        period: {
          month,
          year,
          calendarDays: calc.totalCalendarDays,
          presentDays: Number(calc.presentDays),
          paidLeaveDays: Number(calc.paidLeaveDays),
          unpaidLeaveDays: Number(calc.unpaidLeaveDays),
          weekOffDays: Number(calc.weekOffDays),
          payableDays: Number(calc.payableDays),
          overtimeHours: Number(calc.overtimeHours),
        },
        earnings: {
          basic: Number(calc.basicEarned),
          da: Number(calc.daEarned),
          hra: Number(calc.hraEarned),
          conveyance: Number(calc.conveyanceEarned),
          specialAllowance: Number(calc.specialAllowanceEarned),
          overtimeAmount: Number(calc.overtimeAmount),
          grossSalary: Number(calc.grossSalary),
        },
        deductions: {
          epfEmployee: Number(calc.epfEmployee),
          esicEmployee: Number(calc.esicEmployee),
          professionalTax: Number(calc.professionalTax),
          lwfEmployee: Number(calc.lwfEmployee),
          advanceDeduction: Number(calc.advanceDeduction),
          otherDeductions: Number(calc.otherDeductions),
          totalDeductions: Number(calc.totalDeductions),
        },
        netSalary: Number(calc.netSalary),
        employerContributions: {
          epfEmployer: Number(calc.epfEmployer),
          epfEpsEmployer: Number(calc.epfEpsEmployer),
          esicEmployer: Number(calc.esicEmployer),
        },
        statutoryRulesSnapshot: {
          epf: {
            employeeDeduction: Number(calc.epfEmployee),
            employerContribution: Number(calc.epfEmployer),
            epsContribution: Number(calc.epfEpsEmployer),
          },
          esic: {
            employeeDeduction: Number(calc.esicEmployee),
            employerContribution: Number(calc.esicEmployer),
          },
          professionalTax: {
            deduction: Number(calc.professionalTax),
          },
          labourWelfareFund: {
            employeeDeduction: Number(calc.lwfEmployee),
          },
        },
      };

      const payslip = await this.prisma.payslip.create({
        data: {
          salaryCalculationId: calc.id,
          employeeId: calc.employeeId,
          payslipNumber,
          month,
          year,
          snapshotData,
          isPublished: true,
          publishedAt: new Date(),
        },
      });

      generatedPayslips.push(payslip);
    }

    return generatedPayslips;
  }

  /**
   * Queries payslips with pagination and tenant/branch security
   */
  async getPayslips(query: PayslipQueryDto, user: AuthenticatedUserContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      employee: {
        agencyId: user.agencyId,
        ...(user.branchId ? { branchId: user.branchId } : {}),
      },
    };

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.month) where.month = query.month;
    if (query.year) where.year = query.year;

    const [items, total] = await Promise.all([
      this.prisma.payslip.findMany({
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
          salaryCalculation: true,
        },
      }),
      this.prisma.payslip.count({ where }),
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

  /**
   * Fetches single payslip by ID with access control
   */
  async getPayslipById(id: string, user: AuthenticatedUserContext) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          include: { branch: true, primaryDesignation: true },
        },
        salaryCalculation: {
          include: {
            payrollBatch: true,
            salaryStructure: true,
          },
        },
      },
    });

    if (!payslip || payslip.employee.agencyId !== user.agencyId) {
      throw new NotFoundException('Payslip not found');
    }

    if (user.branchId && payslip.employee.branchId !== user.branchId) {
      throw new NotFoundException('Payslip belongs to a different branch');
    }

    return payslip;
  }
}
