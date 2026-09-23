import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  IsISO8601,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssignVehicleDto {
  @IsUUID('4')
  @IsNotEmpty()
  employeeId: string;

  @IsISO8601()
  @IsNotEmpty()
  startDatetime: string;

  @IsOptional()
  @IsISO8601()
  endDatetime?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  startOdometerKm: number;

  @IsOptional()
  @IsUUID('4')
  clientSiteId?: string;

  @IsOptional()
  @IsString()
  handoverConditionNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reasonForChange?: string;
}

export class EndVehicleAssignmentDto {
  @IsISO8601()
  @IsNotEmpty()
  endDatetime: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  endOdometerKm: number;

  @IsOptional()
  @IsString()
  returnConditionNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reasonForChange?: string;
}

export class UpdateVehicleAssignmentDto {
  @IsOptional()
  @IsString()
  handoverConditionNotes?: string;

  @IsOptional()
  @IsString()
  returnConditionNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reasonForChange?: string;
}
