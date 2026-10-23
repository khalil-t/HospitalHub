export class PatientServiceSummaryDto {
  id: string;
  code: string;
  name: string;
}

export class PatientDetailDto {
  id: string;
  firstName: string;
  lastName: string;
  dob: Date | null;
  gender: string | null;
  phoneNumber: string | null;
  nationalNumber: string | null;
  insuranceNumber: string | null;
  services: PatientServiceSummaryDto[];
}
