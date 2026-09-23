import { IsOptional, IsUUID, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsFilterDto {
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  year?: number;
}
