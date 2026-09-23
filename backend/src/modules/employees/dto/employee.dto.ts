import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  Length,
  Matches,
  IsInt,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Gender, MaritalStatus, EmployeeStatus } from '@prisma/client';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'Employee code is required' })
  @Length(2, 20)
  @Transform(({ value }) => value?.trim().toUpperCase())
  employeeCode: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @Length(1, 60)
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @Length(1, 60)
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @IsEnum(Gender, { message: 'Gender must be MALE, FEMALE, or OTHER' })
  gender: Gender;

  @IsDateString({}, { message: 'Date of birth must be a valid ISO date' })
  dateOfBirth: string;

  @IsDateString({}, { message: 'Date of joining must be a valid ISO date' })
  dateOfJoining: string;

  @IsUUID('4', { message: 'Invalid primary designation ID' })
  @IsNotEmpty({ message: 'Primary designation is required' })
  primaryDesignationId: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Length(10, 20)
  phone: string;

  @IsString()
  @IsOptional()
  @Length(10, 20)
  alternatePhone?: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Emergency contact name is required' })
  @Length(2, 100)
  emergencyContactName: string;

  @IsString()
  @IsNotEmpty({ message: 'Emergency contact phone is required' })
  @Length(10, 20)
  emergencyContactPhone: string;

  @IsString()
  @IsNotEmpty({ message: 'Current address is required' })
  currentAddress: string;

  @IsString()
  @IsNotEmpty({ message: 'Permanent address is required' })
  permanentAddress: string;

  @IsEnum(MaritalStatus)
  @IsOptional()
  maritalStatus?: MaritalStatus;

  @IsString()
  @IsOptional()
  @Length(2, 5)
  @Transform(({ value }) => value?.trim().toUpperCase())
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  branchId?: string; // If user is agency-wide, they can assign a branch

  // Driver Credentials (Optional for non-drivers, mandatory for drivers)
  @IsString()
  @IsOptional()
  @Length(5, 30)
  @Transform(({ value }) => value?.trim().toUpperCase())
  drivingLicenseNumber?: string;

  @IsString()
  @IsOptional()
  @Length(2, 30)
  drivingLicenseClass?: string; // e.g. LMV, HMV, TRANS

  @IsDateString()
  @IsOptional()
  drivingLicenseIssueDate?: string;

  @IsDateString()
  @IsOptional()
  drivingLicenseExpiryDate?: string;

  @IsString()
  @IsOptional()
  @Length(2, 80)
  drivingLicenseAuthority?: string; // e.g. RTO Chennai Central

  // Banking Details
  @IsString()
  @IsNotEmpty({ message: 'Bank name is required' })
  @Length(2, 100)
  bankName: string;

  @IsString()
  @IsNotEmpty({ message: 'Bank branch is required' })
  @Length(2, 100)
  bankBranch: string;

  @IsString()
  @IsNotEmpty({ message: 'Bank account number is required' })
  @Length(8, 25)
  bankAccountNo: string;

  @IsString()
  @IsNotEmpty({ message: 'Bank IFSC is required' })
  @Length(11, 11, { message: 'Bank IFSC must be exactly 11 characters' })
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid Indian Bank IFSC format (e.g. SBIN0001234)' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  bankIfsc: string;

  // Statutory Identifiers
  @IsString()
  @IsOptional()
  @Length(10, 10, { message: 'PAN must be exactly 10 characters' })
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid Indian PAN format (e.g. AABCA1234F)' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  pan?: string;

  @IsString()
  @IsNotEmpty({ message: 'Aadhaar number is required' })
  @Matches(/^[0-9]{12}$/, { message: 'Aadhaar must be exactly 12 digits' })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ''))
  aadhaar: string;

  @IsString()
  @IsOptional()
  @Length(12, 12, { message: 'UAN must be 12 digits' })
  uanNumber?: string;

  @IsString()
  @IsOptional()
  @Length(17, 17, { message: 'ESIC IP Number must be 17 digits' })
  esicIpNumber?: string;
}

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  @Length(1, 60)
  firstName?: string;

  @IsString()
  @IsOptional()
  @Length(1, 60)
  lastName?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsDateString()
  @IsOptional()
  dateOfJoining?: string;

  @IsDateString()
  @IsOptional()
  dateOfLeaving?: string;

  @IsUUID('4')
  @IsOptional()
  primaryDesignationId?: string;

  @IsString()
  @IsOptional()
  @Length(10, 20)
  phone?: string;

  @IsString()
  @IsOptional()
  @Length(10, 20)
  alternatePhone?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsString()
  @IsOptional()
  @Length(2, 100)
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  @Length(10, 20)
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  currentAddress?: string;

  @IsString()
  @IsOptional()
  permanentAddress?: string;

  @IsEnum(MaritalStatus)
  @IsOptional()
  maritalStatus?: MaritalStatus;

  @IsString()
  @IsOptional()
  @Length(2, 5)
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  // Driver Credentials
  @IsString()
  @IsOptional()
  @Length(5, 30)
  @Transform(({ value }) => value?.trim().toUpperCase())
  drivingLicenseNumber?: string;

  @IsString()
  @IsOptional()
  @Length(2, 30)
  drivingLicenseClass?: string;

  @IsDateString()
  @IsOptional()
  drivingLicenseIssueDate?: string;

  @IsDateString()
  @IsOptional()
  drivingLicenseExpiryDate?: string;

  @IsString()
  @IsOptional()
  @Length(2, 80)
  drivingLicenseAuthority?: string;

  // Banking
  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankBranch?: string;

  @IsString()
  @IsOptional()
  @Length(8, 25)
  bankAccountNo?: string;

  @IsString()
  @IsOptional()
  @Length(11, 11)
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
  @Transform(({ value }) => value?.trim().toUpperCase())
  bankIfsc?: string;

  // Statutory
  @IsString()
  @IsOptional()
  @Length(10, 10)
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
  @Transform(({ value }) => value?.trim().toUpperCase())
  pan?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{12}$/)
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ''))
  aadhaar?: string;

  @IsString()
  @IsOptional()
  @Length(12, 12)
  uanNumber?: string;

  @IsString()
  @IsOptional()
  @Length(17, 17)
  esicIpNumber?: string;
}

export class UpdateEmployeeStatusDto {
  @IsEnum(EmployeeStatus, { message: 'Invalid employee status' })
  status: EmployeeStatus;

  @IsDateString()
  @IsOptional()
  dateOfLeaving?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class EmployeeQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsUUID('4')
  designationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
