import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsEnum,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeaveStatus } from '@prisma/client';

// ==========================================
// LEAVE TYPE DTOS
// ==========================================

export class CreateLeaveTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must be uppercase alphanumeric (e.g., CL, SL, LOP)' })
  code: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  daysPerYear?: number = 0;

  @IsBoolean()
  @IsOptional()
  isPaid?: boolean = true;

  @IsBoolean()
  @IsOptional()
  isAccumulative?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateLeaveTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  daysPerYear?: number;

  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @IsBoolean()
  @IsOptional()
  isAccumulative?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ==========================================
// LEAVE BALANCE DTOS
// ==========================================

export class CreateLeaveBalanceDto {
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @IsUUID()
  @IsNotEmpty()
  leaveTypeId: string;

  @IsNumber()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBalance: number;
}

export class AdjustLeaveBalanceDto {
  @IsNumber()
  @Type(() => Number)
  adjustmentDays: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class LeaveBalanceQueryDto {
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  leaveTypeId?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  year?: number;

  @IsUUID()
  @IsOptional()
  branchId?: string;
}

// ==========================================
// LEAVE REQUEST DTOS
// ==========================================

export class CreateLeaveRequestDto {
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @IsUUID()
  @IsNotEmpty()
  leaveTypeId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in YYYY-MM-DD format' })
  endDate: string;

  @IsBoolean()
  @IsOptional()
  isHalfDay?: boolean = false;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateLeaveRequestDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in YYYY-MM-DD format' })
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  isHalfDay?: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ApproveLeaveRequestDto {
  @IsString()
  @IsOptional()
  reviewerComments?: string;
}

export class RejectLeaveRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason is mandatory when rejecting leave' })
  rejectionReason: string;
}

export class CancelLeaveRequestDto {
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}

export class LeaveRequestQueryDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  leaveTypeId?: string;

  @IsEnum(LeaveStatus)
  @IsOptional()
  status?: LeaveStatus;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;
}
