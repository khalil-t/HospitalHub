import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateExternalDoctorRequestDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  reasonForAccess?: string;

  @IsOptional()
  @IsString()
  requestedPatientNames?: string;
}
