import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';

export enum ReportType {
  EMPLOYEE_MASTER = 'EMPLOYEE_MASTER',
  CLIENT_SUMMARY = 'CLIENT_SUMMARY',
  OPERATIONS_MUSTER = 'OPERATIONS_MUSTER',
  PAYROLL_SUMMARY = 'PAYROLL_SUMMARY',
  BILLING_RECEIVABLES = 'BILLING_RECEIVABLES',
  COMPLIANCE_STATUS = 'COMPLIANCE_STATUS',
}

export enum ReportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
}

export class ReportFilterDto {
  @IsEnum(ReportType)
  @IsNotEmpty()
  reportType: ReportType;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat = ReportFormat.JSON;
}
