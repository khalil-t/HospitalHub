import { IsUUID, IsNotEmpty } from 'class-validator';

export class PatientServiceDto {
  @IsNotEmpty()
  @IsUUID()
  serviceId: string;
}
