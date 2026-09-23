import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ProficiencyLevel } from '@prisma/client';

export class AddEmployeeSkillDto {
  @IsUUID('4', { message: 'Invalid skill ID' })
  @IsNotEmpty({ message: 'Skill ID is required' })
  skillId: string;

  @IsEnum(ProficiencyLevel)
  @IsOptional()
  proficiencyLevel?: ProficiencyLevel = ProficiencyLevel.INTERMEDIATE;

  @IsNumber({ maxDecimalPlaces: 1 })
  @IsOptional()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number = 0;

  @IsBoolean()
  @IsOptional()
  certified?: boolean = false;
}

export class UpdateEmployeeSkillDto {
  @IsEnum(ProficiencyLevel)
  @IsOptional()
  proficiencyLevel?: ProficiencyLevel;

  @IsNumber({ maxDecimalPlaces: 1 })
  @IsOptional()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;

  @IsBoolean()
  @IsOptional()
  certified?: boolean;
}
