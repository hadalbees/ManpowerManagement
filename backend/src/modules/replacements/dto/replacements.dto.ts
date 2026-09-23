import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  Matches,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReplacementType, ReplacementStatus } from '@prisma/client';

export class CreateReplacementDto {
  @IsUUID()
  @IsNotEmpty()
  originalDeploymentId: string;

  @IsUUID()
  @IsOptional()
  absentEmployeeId?: string;

  @IsUUID()
  @IsOptional()
  originalEmployeeId?: string;

  @IsUUID()
  @IsNotEmpty()
  replacementEmployeeId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in YYYY-MM-DD format' })
  endDate: string;

  @IsEnum(ReplacementType)
  @IsOptional()
  replacementType?: ReplacementType = ReplacementType.TEMPORARY;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateReplacementDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in YYYY-MM-DD format' })
  endDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ApproveReplacementDto {
  @IsString()
  @IsOptional()
  comments?: string;
}

export class RejectReplacementDto {
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason is mandatory when rejecting replacement' })
  rejectionReason: string;
}

export class CancelReplacementDto {
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}

export class CompleteReplacementDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReplacementQueryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @IsUUID()
  @IsOptional()
  originalEmployeeId?: string;

  @IsUUID()
  @IsOptional()
  replacementEmployeeId?: string;

  @IsUUID()
  @IsOptional()
  deploymentId?: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  clientSiteId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsEnum(ReplacementStatus)
  @IsOptional()
  status?: ReplacementStatus;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;
}
