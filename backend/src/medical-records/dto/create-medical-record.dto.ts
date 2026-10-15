import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrescriptionDto } from './prescription.dto';

export class CreateMedicalRecordDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  responsibleDoctors?: string[];

  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionDto)
  readonly prescriptions?: PrescriptionDto[];
}
