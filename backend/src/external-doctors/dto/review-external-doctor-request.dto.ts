import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewExternalDoctorRequestDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
