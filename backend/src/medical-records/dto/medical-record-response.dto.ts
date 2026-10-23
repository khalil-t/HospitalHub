export class MedicalRecordPatientDto {
  id: string;
  firstName: string;
  lastName: string;
  dob: Date | null;
  gender: string | null;
  phoneNumber: string | null;
}

export class MedicalRecordDoctorDto {
  id: string;
  fullName: string | null;
}

export class MedicalRecordPrescriptionDto {
  id: string;
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  createdAt: Date;
}

export class MedicalRecordResponseDto {
  id: string;
  patientId: string | null;
  patient: MedicalRecordPatientDto | null;
  authorId: string | null;
  responsibleDoctors: MedicalRecordDoctorDto[];
  title: string | null;
  content: string | null;
  diagnosis: string | null;
  allergies: string[];
  recordDate: Date | null;
  prescriptions: MedicalRecordPrescriptionDto[];
  createdAt: Date;
  updatedAt: Date | null;
}
