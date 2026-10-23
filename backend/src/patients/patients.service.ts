import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { ServicesService } from '../services/services.service';
import { UsersService } from '../users/users.service';
import { MedicalRecordService } from '../medical-records/medical-record.service';
import { EncryptionService } from '../common/encryption.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PatientListItemDto } from './dto/patient-list-item.dto';
import { PatientDetailDto } from './dto/patient-detail.dto';
import { toPatientDetail, toPatientListItem } from './patient-response.mapper';
import { PatientAccessPolicy } from './policy/patient-access.policy';

const MAX_PATIENT_LIST_RESULTS = 100;

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    private servicesService: ServicesService,
    private usersService: UsersService,
    private medicalRecordService: MedicalRecordService,
    private encryptionService: EncryptionService,
    private patientAccessPolicy: PatientAccessPolicy,
  ) {}

  private encryptPatientData(patient: Partial<Patient>): void {
    if (patient.phoneNumber) {
      patient.phoneNumber = this.encryptionService.encrypt(patient.phoneNumber);
    }

    if (patient.nationalNumber) {
      patient.nationalNumber = this.encryptionService.encrypt(
        patient.nationalNumber,
      );
    }

    if (patient.insuranceNumber) {
      patient.insuranceNumber = this.encryptionService.encrypt(
        patient.insuranceNumber,
      );
    }
  }

  private decryptPatientData(patient: Patient): Patient {
    if (patient.phoneNumber) {
      patient.phoneNumber = this.encryptionService.decrypt(patient.phoneNumber);
    }
    if (patient.nationalNumber) {
      patient.nationalNumber = this.encryptionService.decrypt(
        patient.nationalNumber,
      );
    }
    if (patient.insuranceNumber) {
      patient.insuranceNumber = this.encryptionService.decrypt(
        patient.insuranceNumber,
      );
    }
    return patient;
  }

  async create(
    createPatientDto: CreatePatientDto,
    actor: AuthenticatedUser,
  ): Promise<PatientListItemDto> {
    const {
      firstName,
      lastName,
      dob,
      gender,
      serviceId,
      phoneNumber,
      nationalNumber,
      insuranceNumber,
    } = createPatientDto;

    const createdByUser = await this.usersService.findOne(actor.id);

    const services: any[] = [];

    if (serviceId) {
      const foundService = await this.servicesService.findOne(serviceId);
      if (foundService) services.push(foundService);
    }

    const patient = this.patientRepository.create({
      firstName,
      lastName,
      gender,
      phoneNumber,
      services,
      createdBy: createdByUser,
      dob: dob ? new Date(dob) : null,
      nationalNumber,
      insuranceNumber,
    });

    this.encryptPatientData(patient);

    const savedPatient = await this.patientRepository.save(patient);

    await this.medicalRecordService.createInitialRecord(
      savedPatient.id,
      actor.id,
    );

    return toPatientListItem(savedPatient);
  }

  async findAll(searchDto?: SearchPatientsDto): Promise<PatientListItemDto[]> {
    const query = this.patientRepository
      .createQueryBuilder('patient')
      .select(['patient.id', 'patient.firstName', 'patient.lastName'])
      .distinct(true)
      .leftJoin('patient.services', 'services');

    if (searchDto) {
      this.applySearchFilters(query, searchDto);
    }

    const patients = await query
      .orderBy('patient.lastName', 'ASC')
      .take(MAX_PATIENT_LIST_RESULTS)
      .getMany();

    return patients.map(toPatientListItem);
  }

  async findByService(
    serviceId: string | undefined,
    searchDto?: SearchPatientsDto,
  ): Promise<PatientListItemDto[]> {
    if (!serviceId) {
      return [];
    }

    const query = this.patientRepository
      .createQueryBuilder('patient')
      .select(['patient.id', 'patient.firstName', 'patient.lastName'])
      .innerJoin('patient.services', 'services')
      .where('services.id = :serviceId', { serviceId });

    if (searchDto) {
      this.applySearchFilters(query, searchDto);
    }

    const patients = await query
      .orderBy('patient.lastName', 'ASC')
      .take(MAX_PATIENT_LIST_RESULTS)
      .getMany();
    return patients.map(toPatientListItem);
  }

  async findPatientsWithoutDoctorFromService(
    serviceId: string,
  ): Promise<PatientListItemDto[]> {
    const patients = await this.patientRepository
      .createQueryBuilder('patient')
      .select(['patient.id', 'patient.firstName', 'patient.lastName'])
      .innerJoin('patient.services', 'service')
      .where('service.id = :serviceId', { serviceId })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('medicalRecord.patient_id')
          .from('medical_records', 'medicalRecord')
          .innerJoin(
            'medical_record_doctors',
            'mrd',
            'mrd.medical_record_id = medicalRecord.id',
          )
          .innerJoin('users', 'doctor', 'doctor.id = mrd.doctor_id')
          .where('medicalRecord.patient_id = patient.id')
          .andWhere('doctor.serviceId = :serviceId', { serviceId })
          .getQuery();

        return 'NOT EXISTS ' + subQuery;
      })
      .orderBy('patient.lastName', 'ASC')
      .take(MAX_PATIENT_LIST_RESULTS)
      .getMany();

    return patients.map(toPatientListItem);
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { id },
      relations: ['services', 'createdBy', 'medicalRecords'],
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return this.decryptPatientData(patient);
  }

  async findOneForActor(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PatientDetailDto> {
    const patient = await this.findOne(id);
    const canView = await this.patientAccessPolicy.canView(user, id);

    if (!canView) {
      throw new NotFoundException('Patient not found');
    }

    return toPatientDetail(patient);
  }

  async update(
    id: string,
    updatePatientDto: UpdatePatientDto,
    user: AuthenticatedUser,
  ): Promise<PatientDetailDto> {
    const patient = await this.findOne(id);
    const canUpdate = await this.patientAccessPolicy.canUpdate(user, id);

    if (!canUpdate) {
      throw new NotFoundException('Patient not found');
    }

    const { firstName, lastName, dob, gender, phoneNumber } = updatePatientDto;

    if (firstName !== undefined) patient.firstName = firstName;
    if (lastName !== undefined) patient.lastName = lastName;
    if (gender !== undefined) patient.gender = gender;
    if (phoneNumber !== undefined) patient.phoneNumber = phoneNumber;
    if (dob !== undefined) {
      patient.dob = dob ? new Date(dob) : null;
    }

    this.encryptPatientData(patient);
    const updatedPatient = await this.patientRepository.save(patient);
    return toPatientDetail(this.decryptPatientData(updatedPatient));
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const patient = await this.findOne(id);
    const canDelete = await this.patientAccessPolicy.canDelete(user, id);

    if (!canDelete) {
      throw new NotFoundException('Patient not found');
    }

    await this.patientRepository.remove(patient);
  }

  async search(searchDto: SearchPatientsDto): Promise<PatientListItemDto[]> {
    const query = this.patientRepository
      .createQueryBuilder('patient')
      .select(['patient.id', 'patient.firstName', 'patient.lastName'])
      .distinct(true)
      .leftJoin('patient.services', 'services');

    this.applySearchFilters(query, searchDto);

    const patients = await query
      .orderBy('patient.lastName', 'ASC')
      .take(MAX_PATIENT_LIST_RESULTS)
      .getMany();
    return patients.map(toPatientListItem);
  }

  async searchByService(
    serviceId: string | undefined,
    searchDto: SearchPatientsDto,
  ): Promise<PatientListItemDto[]> {
    if (!serviceId) {
      return [];
    }

    const query = this.patientRepository
      .createQueryBuilder('patient')
      .select(['patient.id', 'patient.firstName', 'patient.lastName'])
      .innerJoin('patient.services', 'services')
      .where('services.id = :serviceId', { serviceId });

    this.applySearchFilters(query, searchDto);

    const patients = await query
      .orderBy('patient.lastName', 'ASC')
      .take(MAX_PATIENT_LIST_RESULTS)
      .getMany();
    return patients.map(toPatientListItem);
  }

  async getPatientMedicalRecords(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{
    patient: string;
    medicalRecords: unknown[];
    accessGranted: boolean;
  }> {
    const records = await this.medicalRecordService.findByPatientForActor(
      id,
      user,
    );
    const patient = await this.findOne(id);

    return {
      patient: `${patient.firstName} ${patient.lastName}`,
      medicalRecords: records,
      accessGranted: true,
    };
  }

  async addServiceToPatient(
    patientId: string,
    serviceId: string,
    user: AuthenticatedUser,
  ): Promise<PatientDetailDto> {
    const patient = await this.findOne(patientId);
    const canManage = await this.patientAccessPolicy.canManageServices(
      user,
      patientId,
    );

    if (!canManage) {
      throw new NotFoundException('Patient not found');
    }

    const service = await this.servicesService.findOne(serviceId);

    if (!patient.services) {
      patient.services = [];
    }

    const serviceExists = patient.services.some((s) => s.id === serviceId);

    if (!serviceExists) {
      patient.services.push(service);
    }

    this.encryptPatientData(patient);

    const saved = await this.patientRepository.save(patient);

    return toPatientDetail(this.decryptPatientData(saved));
  }

  async getAllPatientsByService(
    serviceId: string,
  ): Promise<PatientListItemDto[]> {
    return this.findByService(serviceId);
  }

  async removeServiceFromPatient(
    patientId: string,
    serviceId: string,
    user: AuthenticatedUser,
  ): Promise<PatientDetailDto> {
    const patient = await this.findOne(patientId);
    const canManage = await this.patientAccessPolicy.canManageServices(
      user,
      patientId,
    );

    if (!canManage) {
      throw new NotFoundException('Patient not found');
    }

    if (patient.services) {
      patient.services = patient.services.filter(
        (service) => service.id !== serviceId,
      );
      const saved = await this.patientRepository.save(patient);
      return toPatientDetail(this.decryptPatientData(saved));
    }

    return toPatientDetail(patient);
  }

  private applySearchFilters(
    query: SelectQueryBuilder<Patient>,
    searchDto: SearchPatientsDto,
  ): void {
    if (searchDto.firstName && searchDto.lastName) {
      query.andWhere(
        `(patient.first_name ILIKE :firstName AND patient.last_name ILIKE :lastName)
       OR
       (patient.first_name ILIKE :lastName AND patient.last_name ILIKE :firstName)`,
        {
          firstName: `%${searchDto.firstName}%`,
          lastName: `%${searchDto.lastName}%`,
        },
      );
    } else if (searchDto.firstName) {
      query.andWhere(
        'patient.first_name ILIKE :name OR patient.last_name ILIKE :name',
        { name: `%${searchDto.firstName}%` },
      );
    }

    if (searchDto.dobFrom && searchDto.dobTo) {
      query.andWhere('patient.dob BETWEEN :dobFrom AND :dobTo', {
        dobFrom: searchDto.dobFrom,
        dobTo: searchDto.dobTo,
      });
    }

    if (searchDto.serviceId) {
      query.andWhere('services.id = :serviceId', {
        serviceId: searchDto.serviceId,
      });
    }
  }
}
