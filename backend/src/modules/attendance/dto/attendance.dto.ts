import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AttendanceStatus, AttendanceMethod } from '@prisma/client';

export class RecordAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @IsUUID()
  @IsNotEmpty()
  deploymentId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'shiftBusinessDate must be in format YYYY-MM-DD' })
  shiftBusinessDate: string;

  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: AttendanceStatus;

  @IsString()
  @IsOptional()
  clockInTime?: string;

  @IsString()
  @IsOptional()
  clockOutTime?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  @IsOptional()
  scheduledHours?: number = 8.0;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  @IsOptional()
  workedHours?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  @IsOptional()
  overtimeHours?: number = 0.0;

  @IsEnum(AttendanceMethod)
  @IsOptional()
  recordedMethod?: AttendanceMethod = AttendanceMethod.WEB_MANUAL;

  @IsString()
  @IsOptional()
  supervisorRemarks?: string;
}

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsString()
  @IsOptional()
  clockInTime?: string;

  @IsString()
  @IsOptional()
  clockOutTime?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  @IsOptional()
  workedHours?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  @IsOptional()
  overtimeHours?: number;

  @IsString()
  @IsOptional()
  supervisorRemarks?: string;
}

export class ApproveAttendanceDto {
  @IsBoolean()
  @IsNotEmpty()
  isApproved: boolean;

  @IsString()
  @IsOptional()
  supervisorRemarks?: string;
}

export class BulkRecordAttendanceDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'shiftBusinessDate must be in format YYYY-MM-DD' })
  shiftBusinessDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordAttendanceDto)
  records: RecordAttendanceDto[];
}

export class AttendanceQueryDto {
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  clientSiteId?: string;

  @IsUUID()
  @IsOptional()
  deploymentId?: string;

  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in format YYYY-MM-DD' })
  startDate?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in format YYYY-MM-DD' })
  endDate?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isApproved?: boolean;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;

  @Type(() => Number)
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;
}
