import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateClientSiteDto {
  @IsString()
  @IsNotEmpty({ message: 'Site code is required' })
  @Length(2, 20)
  @Transform(({ value }) => value?.trim().toUpperCase())
  siteCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Site name is required' })
  @Length(2, 120)
  siteName: string;

  @IsString()
  @IsNotEmpty({ message: 'Site address is required' })
  address: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @Length(2, 50)
  city: string;

  @IsString()
  @IsNotEmpty({ message: 'State code is required' })
  @Length(2, 2)
  stateCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Pincode is required' })
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Invalid Indian 6-digit PIN code' })
  pincode: string;

  @IsString()
  @IsOptional()
  @Length(2, 100)
  siteSupervisorName?: string;

  @IsString()
  @IsOptional()
  siteSupervisorPhone?: string;
}

export class UpdateClientSiteDto {
  @IsString()
  @IsOptional()
  @Length(2, 120)
  siteName?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @Length(2, 50)
  city?: string;

  @IsString()
  @IsOptional()
  @Length(2, 2)
  stateCode?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Invalid Indian 6-digit PIN code' })
  pincode?: string;

  @IsString()
  @IsOptional()
  @Length(2, 100)
  siteSupervisorName?: string;

  @IsString()
  @IsOptional()
  siteSupervisorPhone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
