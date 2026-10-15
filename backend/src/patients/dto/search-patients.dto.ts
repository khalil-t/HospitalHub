import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export class SearchPatientsDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  dobFrom?: string;

  @IsOptional()
  @IsDateString()
  dobTo?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  gender?: string;
}
