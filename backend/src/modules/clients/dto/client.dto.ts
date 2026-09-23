import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsInt,
  IsEnum,
  Length,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ClientStatus } from '@prisma/client';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  @Length(2, 150)
  companyName: string;

  @IsString()
  @IsNotEmpty({ message: 'Legal entity name is required' })
  @Length(2, 200)
  legalName: string;

  @IsString()
  @IsNotEmpty({ message: 'Client code is required' })
  @Length(2, 20)
  @Transform(({ value }) => value?.trim().toUpperCase())
  clientCode: string;

  @IsString()
  @IsNotEmpty({ message: 'PAN is required' })
  @Length(10, 10, { message: 'PAN must be exactly 10 characters' })
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'Invalid PAN format (expected e.g. AABCA1234F)',
  })
  @Transform(({ value }) => value?.trim().toUpperCase())
  pan: string;

  @IsString()
  @IsNotEmpty({ message: 'GSTIN is required' })
  @Length(15, 15, { message: 'GSTIN must be exactly 15 characters' })
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid Indian GSTIN format',
  })
  @Transform(({ value }) => value?.trim().toUpperCase())
  gstin: string;

  @IsString()
  @IsNotEmpty({ message: 'State code is required' })
  @Length(2, 2, { message: 'State code must be 2 digits (e.g. 33 for TN)' })
  stateCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Billing address is required' })
  billingAddress: string;

  @IsString()
  @IsNotEmpty({ message: 'Primary contact person name is required' })
  contactPersonName: string;

  @IsEmail({}, { message: 'Invalid primary contact email format' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  contactEmail: string;

  @IsString()
  @IsNotEmpty({ message: 'Primary contact phone is required' })
  contactPhone: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(180)
  paymentTermsDays?: number = 30;

  @IsString()
  @IsOptional()
  branchId?: string; // If user is agency-wide, they can assign a branch; otherwise derived from context
}

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  @Length(2, 150)
  companyName?: string;

  @IsString()
  @IsOptional()
  @Length(2, 200)
  legalName?: string;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsString()
  @IsOptional()
  contactPersonName?: string;

  @IsEmail({}, { message: 'Invalid contact email format' })
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(180)
  paymentTermsDays?: number;

  @IsString()
  @IsOptional()
  branchId?: string;
}

export class UpdateClientStatusDto {
  @IsEnum(ClientStatus, { message: 'Invalid client status. Must be ACTIVE, INACTIVE, or BLACKLISTED' })
  status: ClientStatus;
}

export class ClientQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
