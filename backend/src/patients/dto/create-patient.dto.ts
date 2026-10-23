import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  Length,
  IsUUID,
  IsDateString,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 20)
  nationalNumber: string;

  @IsOptional()
  @IsString()
  @Length(6, 20)
  insuranceNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im)
  phoneNumber?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @Matches(/^(M|F)$/i)
  gender?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
