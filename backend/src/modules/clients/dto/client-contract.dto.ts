import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsBoolean,
  Length,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BillingCycle, ContractStatus } from '@prisma/client';

export class CreateClientContractDto {
  @IsString()
  @IsNotEmpty({ message: 'Contract number is required' })
  @Length(2, 50)
  @Transform(({ value }) => value?.trim().toUpperCase())
  contractNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Contract title is required' })
  @Length(2, 150)
  title: string;

  @IsDateString({}, { message: 'Start date must be a valid ISO date' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid ISO date' })
  endDate: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  noticePeriodDays?: number = 30;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle = BillingCycle.MONTHLY;

  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus = ContractStatus.ACTIVE;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean = false;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateClientContractDto {
  @IsString()
  @IsOptional()
  @Length(2, 150)
  title?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  noticePeriodDays?: number;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
