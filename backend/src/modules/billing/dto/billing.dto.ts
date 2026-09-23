import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  IsInt,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  InvoiceStatus,
  InvoiceAdjustmentType,
  PaymentMode,
  BillingModel,
} from '@prisma/client';

export class GenerateInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsUUID()
  @IsNotEmpty()
  branchId!: string;

  @IsDateString()
  @IsNotEmpty()
  billingPeriodStart!: string;

  @IsDateString()
  @IsNotEmpty()
  billingPeriodEnd!: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate!: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

export class CreateInvoiceAdjustmentDto {
  @IsUUID()
  @IsNotEmpty()
  invoiceId!: string;

  @IsEnum(InvoiceAdjustmentType)
  noteType!: InvoiceAdjustmentType;

  @IsDateString()
  @IsNotEmpty()
  issueDate!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  subtotalAmount!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  cgstAmount?: number = 0;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  sgstAmount?: number = 0;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  igstAmount?: number = 0;
}

export class RecordClientPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  invoiceId!: string;

  @IsDateString()
  @IsNotEmpty()
  paymentDate!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amountReceived!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  tdsDeducted?: number = 0;

  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @IsString()
  @IsNotEmpty()
  referenceTransactionId!: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class InvoiceQueryDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

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

export class PaymentQueryDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;

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
