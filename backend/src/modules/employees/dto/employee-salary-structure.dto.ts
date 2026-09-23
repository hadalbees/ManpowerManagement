import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsString,
  Min,
  Length,
} from 'class-validator';

export class CreateSalaryStructureDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Basic pay must be a valid amount' })
  @Min(0.01, { message: 'Basic pay must be greater than 0' })
  basicPay: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  dearnessAllowance?: number = 0.00;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  houseRentAllowance?: number = 0.00;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  conveyanceAllowance?: number = 0.00;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  specialAllowance?: number = 0.00;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  overtimeRatePerHour?: number = 0.00;

  @IsBoolean()
  @IsOptional()
  pfApplicable?: boolean = true;

  @IsString()
  @IsOptional()
  @Length(2, 30)
  pfOptOutRule?: string;

  @IsBoolean()
  @IsOptional()
  esiApplicable?: boolean = true;

  @IsBoolean()
  @IsOptional()
  ptApplicable?: boolean = true;

  @IsBoolean()
  @IsOptional()
  lwfApplicable?: boolean = true;

  @IsDateString({}, { message: 'Effective from must be a valid ISO date' })
  effectiveFrom: string;

  @IsDateString({}, { message: 'Effective to must be a valid ISO date' })
  @IsOptional()
  effectiveTo?: string;

  @IsString()
  @IsOptional()
  @Length(2, 255)
  reasonForChange?: string;
}

export class ReviseSalaryStructureDto {
  @IsDateString({}, { message: 'New effective from must be a valid ISO date' })
  newEffectiveFrom: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'New basic pay must be a valid amount' })
  @Min(0.01, { message: 'New basic pay must be greater than 0' })
  newBasicPay: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  newDearnessAllowance?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  newHouseRentAllowance?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  newConveyanceAllowance?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  newSpecialAllowance?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  newOvertimeRatePerHour?: number;

  @IsBoolean()
  @IsOptional()
  pfApplicable?: boolean;

  @IsBoolean()
  @IsOptional()
  esiApplicable?: boolean;

  @IsBoolean()
  @IsOptional()
  ptApplicable?: boolean;

  @IsBoolean()
  @IsOptional()
  lwfApplicable?: boolean;

  @IsString()
  @IsOptional()
  @Length(2, 255)
  reasonForChange?: string;
}
