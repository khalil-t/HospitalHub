import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(M|F|Other)$/i)
  gender?: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  @Matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im, {
    message: 'Phone number format is invalid',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
