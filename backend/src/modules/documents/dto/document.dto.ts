import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentEntityType, VerificationStatus } from '@prisma/client';

export class CreateDocumentTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(DocumentEntityType)
  applicableEntity: DocumentEntityType;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresExpiryDate?: boolean;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  defaultAlertDays?: number[];
}

export class UploadDocumentDto {
  @IsUUID()
  @IsNotEmpty()
  documentTypeId: string;

  @IsEnum(DocumentEntityType)
  @IsNotEmpty()
  entityType: DocumentEntityType;

  @IsUUID()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  issuedBy?: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsNotEmpty()
  originalFileName: string;

  @IsNumber()
  @Min(1)
  fileSizeBytes: number;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsOptional()
  s3StorageKey?: string;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateDocumentVersionDto {
  @IsString()
  @IsNotEmpty()
  originalFileName: string;

  @IsNumber()
  @Min(1)
  fileSizeBytes: number;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsOptional()
  s3StorageKey?: string;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class VerifyDocumentDto {
  @IsEnum(VerificationStatus)
  @IsNotEmpty()
  status: VerificationStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class DocumentQueryDto {
  @IsEnum(DocumentEntityType)
  @IsOptional()
  entityType?: DocumentEntityType;

  @IsUUID()
  @IsOptional()
  entityId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsEnum(VerificationStatus)
  @IsOptional()
  verificationStatus?: VerificationStatus;

  @IsString()
  @IsOptional()
  search?: string;

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
