import { IsString, IsOptional, IsUUID } from 'class-validator';

export class PrescriptionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  medication: string;

  @IsString()
  dose: string;

  @IsString()
  frequency: string;

  @IsString()
  duration: string;
}
