import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecruitmentStatus, InterviewResult, CandidateOfferStatus, Gender } from '@prisma/client';

export class CreateCandidateDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  address?: string;

  @IsUUID()
  @IsNotEmpty()
  primaryDesignationId: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  yearsOfExperience?: number;

  @IsString()
  @IsOptional()
  previousEmployer?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsString()
  @IsOptional()
  source?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  expectedSalary?: number;

  @IsDateString()
  @IsOptional()
  availabilityDate?: string;

  @IsString()
  @IsNotEmpty()
  currentCity: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ScreenCandidateDto {
  @IsString()
  @IsNotEmpty()
  screeningNotes: string;

  @IsEnum(RecruitmentStatus)
  @IsOptional()
  nextStage?: RecruitmentStatus = RecruitmentStatus.SCREENING;
}

export class ScheduleInterviewDto {
  @IsUUID()
  @IsNotEmpty()
  interviewerUserId: string;

  @IsString()
  @IsNotEmpty()
  stageName: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsString()
  @IsOptional()
  evaluationNotes?: string;
}

export class EvaluateInterviewDto {
  @IsEnum(InterviewResult)
  @IsNotEmpty()
  result: InterviewResult;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @IsString()
  @IsOptional()
  evaluationNotes?: string;
}

export class EvaluateSkillTestDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsString()
  @IsNotEmpty()
  skillTestNotes: string;

  @IsEnum(RecruitmentStatus)
  @IsOptional()
  nextStage?: RecruitmentStatus = RecruitmentStatus.SKILL_TEST_PASSED;
}

export class CreateOfferDto {
  @IsUUID()
  @IsNotEmpty()
  designationId: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsNumber()
  @Min(1)
  offeredSalary: number;

  @IsDateString()
  @IsNotEmpty()
  joiningDate: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOfferStatusDto {
  @IsEnum(CandidateOfferStatus)
  @IsNotEmpty()
  status: CandidateOfferStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ConvertCandidateToEmployeeDto {
  @IsString()
  @IsOptional()
  employeeCodeOverride?: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfJoining: string;

  @IsNumber()
  @Min(1)
  basicPay: number;

  @IsNumber()
  @IsOptional()
  dearnessAllowance?: number;

  @IsNumber()
  @IsOptional()
  houseRentAllowance?: number;

  @IsNumber()
  @IsOptional()
  conveyanceAllowance?: number;

  @IsNumber()
  @IsOptional()
  specialAllowance?: number;

  @IsString()
  @IsOptional()
  bankAccountNo?: string;

  @IsString()
  @IsOptional()
  bankIfsc?: string;

  @IsString()
  @IsOptional()
  bankName?: string;
}

export class CandidateQueryDto {
  @IsEnum(RecruitmentStatus)
  @IsOptional()
  status?: RecruitmentStatus;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @IsOptional()
  primaryDesignationId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
