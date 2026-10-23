import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Patient } from '../entities/patient.entity';

@Injectable()
export class PatientAccessPolicy {
  constructor(
    @InjectRepository(Patient)
    private readonly patientsRepository: Repository<Patient>,
  ) {}

  async canView(user: AuthenticatedUser, patientId: string): Promise<boolean> {
    const patient = await this.findPatientScope(patientId);

    if (!patient) return false;
    if (this.hasRole(user, UserRole.SUPER_ADMIN)) return true;
    if (this.hasRole(user, UserRole.SERVICE_HEAD)) return false;

    if (this.hasRole(user, UserRole.INTERNAL_DOCTOR)) {
      return (
        this.isInUserService(patient, user) ||
        this.isAssignedDoctor(patient, user)
      );
    }

    if (this.hasRole(user, UserRole.ADMISSION_AGENT)) {
      return this.isInUserService(patient, user);
    }

    return false;
  }

  async canUpdate(
    user: AuthenticatedUser,
    patientId: string,
  ): Promise<boolean> {
    const patient = await this.findPatientScope(patientId);

    if (!patient) return false;
    if (this.hasRole(user, UserRole.SUPER_ADMIN)) return true;
    if (this.hasRole(user, UserRole.SERVICE_HEAD)) return false;

    if (
      this.hasRole(user, UserRole.ADMISSION_AGENT) ||
      this.hasRole(user, UserRole.INTERNAL_DOCTOR)
    ) {
      return this.isInUserService(patient, user);
    }

    return false;
  }

  async canDelete(
    user: AuthenticatedUser,
    patientId: string,
  ): Promise<boolean> {
    const patient = await this.findPatientScope(patientId);

    if (!patient) return false;
    return this.hasRole(user, UserRole.SUPER_ADMIN);
  }

  async canManageServices(
    user: AuthenticatedUser,
    patientId: string,
  ): Promise<boolean> {
    const patient = await this.findPatientScope(patientId);

    if (!patient) return false;
    if (this.hasRole(user, UserRole.SUPER_ADMIN)) return true;
    if (this.hasRole(user, UserRole.SERVICE_HEAD)) return false;

    if (this.hasRole(user, UserRole.ADMISSION_AGENT)) {
      return this.isInUserService(patient, user);
    }

    return false;
  }

  private async findPatientScope(patientId: string): Promise<Patient | null> {
    return this.patientsRepository.findOne({
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

  private isInUserService(patient: Patient, user: AuthenticatedUser): boolean {
    if (!user.serviceId) return false;

    return (
      patient.services?.some((service) => service.id === user.serviceId) ??
      false
    );
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
