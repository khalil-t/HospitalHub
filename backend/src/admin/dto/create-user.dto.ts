import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  password: string;

  @IsUUID()
  serviceId: string;

  @IsOptional()
  @IsArray()
  roleIds?: string[];

  @IsOptional()
  @IsString()
  @Length(8, 20)
  @Matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im, {
    message: 'Phone number format is invalid',
  })
  phoneNumber?: string;
}
