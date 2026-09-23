import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsUUID,
  Min,
} from 'class-validator';
import { BillingModel } from '@prisma/client';

export class CreateClientBillingRateDto {
  @IsUUID('4', { message: 'Invalid designation ID' })
  @IsNotEmpty({ message: 'Designation is required' })
  designationId: string;

  @IsUUID('4', { message: 'Invalid client site ID' })
  @IsOptional()
  clientSiteId?: string;

  @IsEnum(BillingModel, { message: 'Invalid billing model' })
  billingModel: BillingModel;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Rate amount must be a number' })
  @Min(0.01, { message: 'Rate amount must be greater than 0' })
  rateAmount: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(1)
  standardShiftHours?: number = 8.00;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  otHourlyRate?: number = 0.00;

  @IsDateString({}, { message: 'Effective from must be a valid ISO date' })
  effectiveFrom: string;

  @IsDateString({}, { message: 'Effective to must be a valid ISO date' })
  @IsOptional()
  effectiveTo?: string;
}

export class CreateRateVersionDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'New rate amount must be a valid positive number' })
  @Min(0.01, { message: 'New rate amount must be greater than 0' })
  newRateAmount: number;

  @IsDateString({}, { message: 'New effective from must be a valid ISO date' })
  newEffectiveFrom: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  newOtHourlyRate?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(1)
  newStandardShiftHours?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateClientBillingRateDto {
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
