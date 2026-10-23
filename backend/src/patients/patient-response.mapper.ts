import { Patient } from './entities/patient.entity';
import { PatientListItemDto } from './dto/patient-list-item.dto';
import { PatientDetailDto } from './dto/patient-detail.dto';

export function toPatientListItem(
  patient: Pick<Patient, 'id' | 'firstName' | 'lastName'>,
): PatientListItemDto {
  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
  };
}

export function toPatientDetail(patient: Patient): PatientDetailDto {
  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dob: patient.dob ?? null,
    gender: patient.gender ?? null,
    phoneNumber: patient.phoneNumber ?? null,
    nationalNumber: patient.nationalNumber ?? null,
    insuranceNumber: patient.insuranceNumber ?? null,
    services: (patient.services ?? []).map((service) => ({
      id: service.id,
      code: service.code,
      name: service.name,
    })),
  };
}
