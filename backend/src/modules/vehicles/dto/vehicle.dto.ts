import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum VehicleTypeEnum {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  BUS = 'BUS',
  VAN = 'VAN',
  TRUCK = 'TRUCK',
  AUTO = 'AUTO',
}

export enum FuelTypeEnum {
  DIESEL = 'DIESEL',
  PETROL = 'PETROL',
  CNG = 'CNG',
  ELECTRIC = 'ELECTRIC',
}

export enum VehicleStatusEnum {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  GROUNDED = 'GROUNDED',
}

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  vehicleRegistrationNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  vehicleMake: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  vehicleModel: string;

  @IsEnum(VehicleTypeEnum)
  vehicleType: VehicleTypeEnum;

  @IsEnum(FuelTypeEnum)
  fuelType: FuelTypeEnum;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  chassisNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  engineNumber: string;

  @IsInt()
  @Min(1980)
  @Max(2100)
  @Type(() => Number)
  manufacturingYear: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  currentOdometerKm?: number = 0;

  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicleMake?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicleModel?: string;

  @IsOptional()
  @IsEnum(VehicleTypeEnum)
  vehicleType?: VehicleTypeEnum;

  @IsOptional()
  @IsEnum(FuelTypeEnum)
  fuelType?: FuelTypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  chassisNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  engineNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(2100)
  @Type(() => Number)
  manufacturingYear?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  currentOdometerKm?: number;

  @IsOptional()
  @IsUUID('4')
  clientId?: string;
}

export class UpdateVehicleStatusDto {
  @IsEnum(VehicleStatusEnum)
  status: VehicleStatusEnum;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}

export class VehicleQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(VehicleTypeEnum)
  vehicleType?: VehicleTypeEnum;

  @IsOptional()
  @IsEnum(VehicleStatusEnum)
  status?: VehicleStatusEnum;

  @IsOptional()
  @IsEnum(FuelTypeEnum)
  fuelType?: FuelTypeEnum;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @IsOptional()
  @IsUUID('4')
  clientId?: string;

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
  limit?: number = 10;
}
