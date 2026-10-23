import { MedicalRecord } from './entities/medical-record.entity';
import {
  MedicalRecordDoctorDto,
  MedicalRecordPatientDto,
  MedicalRecordPrescriptionDto,
  MedicalRecordResponseDto,
} from './dto/medical-record-response.dto';

const toPatient = (record: MedicalRecord): MedicalRecordPatientDto | null => {
  if (!record.patient) return null;

  return {
    id: record.patient.id,
    firstName: record.patient.firstName,
    lastName: record.patient.lastName,
    dob: record.patient.dob ?? null,
    gender: record.patient.gender ?? null,
    phoneNumber: record.patient.phoneNumber ?? null,
  };
};

const toDoctor = (doctor: {
  id: string;
  fullName?: string;
}): MedicalRecordDoctorDto => ({
  id: doctor.id,
  fullName: doctor.fullName ?? null,
});

const toPrescription = (prescription: {
  id: string;
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  createdAt: Date;
}): MedicalRecordPrescriptionDto => ({
  id: prescription.id,
  medication: prescription.medication,
  dose: prescription.dose,
  frequency: prescription.frequency,
  duration: prescription.duration,
  createdAt: prescription.createdAt,
});

export function toMedicalRecordResponse(
  record: MedicalRecord,
): MedicalRecordResponseDto {
  return {
    id: record.id,
    patientId: record.patient?.id ?? null,
    patient: toPatient(record),
    authorId: record.authorId ?? null,
    responsibleDoctors: (record.responsibleDoctors ?? []).map(toDoctor),
    title: record.title ?? null,
    content: record.content ?? null,
    diagnosis: record.diagnosis ?? null,
    allergies: record.allergies ?? [],
    recordDate: record.recordDate ?? null,
    prescriptions: (record.prescriptions ?? []).map(toPrescription),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt ?? null,
  };
}
