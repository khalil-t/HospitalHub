import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { MedicalRecord } from '../entities/medical-record.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { PatientAccessPolicy } from '../../patients/policy/patient-access.policy';

@Injectable()
export class MedicalRecordAccessPolicy {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly recordRepo: Repository<MedicalRecord>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly patientAccessPolicy: PatientAccessPolicy,
  ) {}

  async canView(user: AuthenticatedUser, recordId: string): Promise<boolean> {
    const record = await this.recordRepo.findOne({
      where: { id: recordId },
      relations: ['patient'],
    });

    if (!record?.patient) return false;

    return this.canViewPatient(user, record.patient.id);
  }

  async canViewByPatient(
    user: AuthenticatedUser,
    patientId: string,
  ): Promise<boolean> {
    return this.canViewPatient(user, patientId);
  }

  private async canViewPatient(
    user: AuthenticatedUser,
    patientId: string,
  ): Promise<boolean> {
    if (this.hasRole(user, UserRole.SUPER_ADMIN)) return true;
    if (!this.hasRole(user, UserRole.INTERNAL_DOCTOR)) return false;
    return this.patientAccessPolicy.canView(user, patientId);
  }

  async canCreate(
    user: AuthenticatedUser,
    patientId: string,
  ): Promise<boolean> {
    const patient = await this.findPatientScope(patientId);
    if (!patient) return false;

    if (this.hasRole(user, UserRole.SUPER_ADMIN)) return true;
    if (this.hasRole(user, UserRole.INTERNAL_DOCTOR)) {
      return this.isAssignedDoctor(patient, user);
    }

    return false;
  }

  async canUpdate(user: AuthenticatedUser, recordId: string): Promise<boolean> {
    const record = await this.recordRepo.findOne({
      where: { id: recordId },
    });

    if (!record) return false;
    if (this.hasRole(user, UserRole.SUPER_ADMIN)) return true;

    return (
      this.hasRole(user, UserRole.INTERNAL_DOCTOR) &&
      record.authorId === user.id
    );
  }

  canDelete(user: AuthenticatedUser): boolean {
    return this.hasRole(user, UserRole.SUPER_ADMIN);
  }

  canListRecords(user: AuthenticatedUser): boolean {
    return (
      this.hasRole(user, UserRole.SUPER_ADMIN) ||
      this.hasRole(user, UserRole.INTERNAL_DOCTOR)
    );
  }

  canViewDoctorRecords(user: AuthenticatedUser, doctorId: string): boolean {
    if (this.hasRole(user, UserRole.SUPER_ADMIN)) return true;
    return this.hasRole(user, UserRole.INTERNAL_DOCTOR) && user.id === doctorId;
  }

  private async findPatientScope(patientId: string): Promise<Patient | null> {
    return this.patientRepo.findOne({
      where: { id: patientId },
      relations: [
        'services',
        'medicalRecords',
        'medicalRecords.responsibleDoctors',
      ],
    });
  }

  private hasRole(user: AuthenticatedUser, role: UserRole): boolean {
    return (user.roles ?? []).includes(role);
  }

  private isAssignedDoctor(patient: Patient, user: AuthenticatedUser): boolean {
    return (
      patient.medicalRecords?.some(
        (record) =>
          record.responsibleDoctors?.some((doctor) => doctor.id === user.id) ??
          false,
      ) ?? false
    );
  }
}
