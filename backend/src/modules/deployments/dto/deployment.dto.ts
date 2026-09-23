import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DeploymentStatus } from '@prisma/client';

export class CreateDeploymentDto {
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @IsUUID()
  @IsNotEmpty()
  clientSiteId: string;

  @IsUUID()
  @IsNotEmpty()
  designationId: string;

  @IsUUID()
  @IsNotEmpty()
  billingRateId: string;

  @IsUUID()
  @IsNotEmpty()
  salaryStructureId: string;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in format YYYY-MM-DD' })
  startDate: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in format YYYY-MM-DD' })
  endDate?: string;

  @IsString()
  @IsOptional()
  shiftName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'shiftStartTime must be in format HH:mm or HH:mm:ss' })
  shiftStartTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'shiftEndTime must be in format HH:mm or HH:mm:ss' })
  shiftEndTime?: string;

  @IsBoolean()
  @IsOptional()
  isNightShift?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  scheduledWorkdays?: number[];

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class UpdateDeploymentDto {
  @IsString()
  @IsOptional()
  shiftName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'shiftStartTime must be in format HH:mm or HH:mm:ss' })
  shiftStartTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'shiftEndTime must be in format HH:mm or HH:mm:ss' })
  shiftEndTime?: string;

  @IsBoolean()
  @IsOptional()
  isNightShift?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  scheduledWorkdays?: number[];

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class EndDeploymentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in format YYYY-MM-DD' })
  endDate: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class ReassignDeploymentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effectiveDate must be in format YYYY-MM-DD' })
  effectiveDate: string;

  @IsUUID()
  @IsNotEmpty()
  newClientId: string;

  @IsUUID()
  @IsNotEmpty()
  newClientSiteId: string;

  @IsUUID()
  @IsNotEmpty()
  newDesignationId: string;

  @IsUUID()
  @IsNotEmpty()
  newBillingRateId: string;

  @IsUUID()
  @IsNotEmpty()
  newSalaryStructureId: string;

  @IsUUID()
  @IsOptional()
  newVehicleId?: string;

  @IsString()
  @IsOptional()
  newShiftName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'newShiftStartTime must be in format HH:mm or HH:mm:ss' })
  newShiftStartTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'newShiftEndTime must be in format HH:mm or HH:mm:ss' })
  newShiftEndTime?: string;

  @IsBoolean()
  @IsOptional()
  newIsNightShift?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  newScheduledWorkdays?: number[];

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class DeploymentQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  clientSiteId?: string;

  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  designationId?: string;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsEnum(DeploymentStatus)
  @IsOptional()
  status?: DeploymentStatus;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  activeOnly?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
