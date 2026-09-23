import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PayrollBatchStatus,
  StatutoryRuleType,
  StatutoryCalcMethod,
  RoundingMethod,
  AdvanceStatus,
} from '@prisma/client';

export class CreatePayrollBatchDto {
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year!: number;
}

export class CalculatePayrollBatchDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class LockPayrollBatchDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class FinalizePayrollBatchDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class PayrollBatchQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsEnum(PayrollBatchStatus)
  status?: PayrollBatchStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class SalaryCalculationQueryDto {
  @IsOptional()
  @IsUUID()
  payrollBatchId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}

export class CreateSalaryAdvanceDto {
  @IsUUID()
  @IsNotEmpty()
  employeeId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Type(() => Number)
  advanceAmount!: number;

  @IsDateString()
  @IsNotEmpty()
  disbursedDate!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  repaymentStartMonth!: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  repaymentStartYear!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  totalInstallments!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Type(() => Number)
  monthlyDeductionAmount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SalaryAdvanceQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsEnum(AdvanceStatus)
  status?: AdvanceStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}

export class CreateStatutoryRuleDto {
  @IsEnum(StatutoryRuleType)
  ruleType!: StatutoryRuleType;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  wageCeiling?: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Type(() => Number)
  employeeContributionPct!: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Type(() => Number)
  employerContributionPct!: number;

  @IsEnum(StatutoryCalcMethod)
  calculationMethod!: StatutoryCalcMethod;

  @IsOptional()
  @IsEnum(RoundingMethod)
  roundingMethod?: RoundingMethod;

  @IsObject()
  ruleConfig!: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStatutoryRuleDto {
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  wageCeiling?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Type(() => Number)
  employeeContributionPct?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Type(() => Number)
  employerContributionPct?: number;

  @IsOptional()
  @IsObject()
  ruleConfig?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StatutoryRuleQueryDto {
  @IsOptional()
  @IsEnum(StatutoryRuleType)
  ruleType?: StatutoryRuleType;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class PayslipQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
