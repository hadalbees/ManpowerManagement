import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentEntityType, ExpiryAlertStatus } from '@prisma/client';

export enum ComplianceExpiryStatus {
  VALID = 'VALID',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export class AcknowledgeAlertDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ComplianceQueryDto {
  @IsEnum(DocumentEntityType)
  @IsOptional()
  entityType?: DocumentEntityType;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsEnum(ComplianceExpiryStatus)
  @IsOptional()
  status?: ComplianceExpiryStatus;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(365)
  @IsOptional()
  withinDays?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
