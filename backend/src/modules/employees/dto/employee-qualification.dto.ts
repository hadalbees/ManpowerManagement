import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Length,
  Min,
  Max,
} from 'class-validator';

export class CreateEmployeeQualificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Qualification type is required' })
  @Length(2, 50)
  qualificationType: string;

  @IsString()
  @IsNotEmpty({ message: 'Degree/Certificate title is required' })
  @Length(2, 100)
  degreeTitle: string;

  @IsString()
  @IsNotEmpty({ message: 'Institution or Board name is required' })
  @Length(2, 150)
  institutionName: string;

  @IsInt({ message: 'Year of passing must be an integer year' })
  @Min(1950)
  @Max(2035)
  yearOfPassing: number;

  @IsString()
  @IsOptional()
  @Length(1, 15)
  gradePercentage?: string;
}

export class UpdateEmployeeQualificationDto {
  @IsString()
  @IsOptional()
  @Length(2, 50)
  qualificationType?: string;

  @IsString()
  @IsOptional()
  @Length(2, 100)
  degreeTitle?: string;

  @IsString()
  @IsOptional()
  @Length(2, 150)
  institutionName?: string;

  @IsInt()
  @IsOptional()
  @Min(1950)
  @Max(2035)
  yearOfPassing?: number;

  @IsString()
  @IsOptional()
  @Length(1, 15)
  gradePercentage?: string;
}
