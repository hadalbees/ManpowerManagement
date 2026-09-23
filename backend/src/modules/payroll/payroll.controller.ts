import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayslipService } from './payslip.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  CreatePayrollBatchDto,
  CalculatePayrollBatchDto,
  LockPayrollBatchDto,
  FinalizePayrollBatchDto,
  PayrollBatchQueryDto,
  SalaryCalculationQueryDto,
  CreateSalaryAdvanceDto,
  SalaryAdvanceQueryDto,
  PayslipQueryDto,
} from './dto/payroll.dto';

@Controller('payroll')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly payslipService: PayslipService,
  ) {}

  // ==========================================
  // 1. PAYROLL BATCHES
  // ==========================================

  @Post('batches')
  @RequirePermission('PAYROLL_CREATE')
  async createBatch(
    @Body() dto: CreatePayrollBatchDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payrollService.createBatch(dto, user);
  }

  @Get('batches')
  @RequirePermission('PAYROLL_READ')
  async getBatches(
    @Query() query: PayrollBatchQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payrollService.getBatches(query, user);
  }

  @Get('batches/:id')
  @RequirePermission('PAYROLL_READ')
  async getBatchById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payrollService.getBatchById(id, user);
  }

  @Post('batches/:id/calculate')
  @RequirePermission('PAYROLL_CALCULATE')
  async calculateBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CalculatePayrollBatchDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payrollService.calculateBatch(id, dto, user);
  }

  @Post('batches/:id/lock')
  @RequirePermission('PAYROLL_LOCK')
  async lockBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LockPayrollBatchDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payrollService.lockBatch(id, dto, user);
  }

  @Post('batches/:id/finalize')
  @RequirePermission('PAYROLL_FINALIZE')
  async finalizeBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizePayrollBatchDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payrollService.finalizeBatch(id, dto, user);
  }

  // ==========================================
  // 2. SALARY CALCULATIONS
  // ==========================================

  @Get('calculations')
  @RequirePermission('PAYROLL_READ')
  async getCalculations(
    @Query() query: SalaryCalculationQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payrollService.getCalculations(query, user);
  }

  // ==========================================
  // 3. SALARY ADVANCES
  // ==========================================

  @Post('advances')
  @RequirePermission('PAYROLL_UPDATE')
  async createAdvance(
    @Body() dto: CreateSalaryAdvanceDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payrollService.createAdvance(dto, user);
  }

  @Get('advances')
  @RequirePermission('PAYROLL_READ')
  async getAdvances(
    @Query() query: SalaryAdvanceQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payrollService.getAdvances(query, user);
  }

  // ==========================================
  // 4. PAYSLIPS
  // ==========================================

  @Get('payslips')
  @RequirePermission('PAYSLIP_READ')
  async getPayslips(
    @Query() query: PayslipQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payslipService.getPayslips(query, user);
  }

  @Get('payslips/:id')
  @RequirePermission('PAYSLIP_READ')
  async getPayslipById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.payslipService.getPayslipById(id, user);
  }
}
