import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { ServicesService } from '../services/services.service';
import { UsersService } from '../users/users.service';
import { MedicalRecordService } from '../medical-records/medical-record.service';
import { UserRole } from '../common/enums/user-role.enum';
import { EncryptionService } from '../common/encryption.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    private servicesService: ServicesService,
    private usersService: UsersService,
    private medicalRecordService: MedicalRecordService,
    private encryptionService: EncryptionService,
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

  async create(createPatientDto: CreatePatientDto): Promise<Patient> {
    const {
      firstName,
      lastName,
      dob,
      gender,
      serviceId,
      phoneNumber,
      createdById,
      nationalNumber,
      insuranceNumber,
    } = createPatientDto;

    const createdByUser = await this.usersService.findOne(createdById);

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

    await this.medicalRecordService.create({
      patientId: savedPatient.id,
    });

    return savedPatient;
  }

  async findAll(searchDto?: SearchPatientsDto): Promise<Patient[]> {
    const query = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.services', 'services')
      .leftJoinAndSelect('patient.createdBy', 'createdBy')
      .leftJoinAndSelect('patient.medicalRecords', 'medicalRecords');

    if (searchDto) {
      this.applySearchFilters(query, searchDto);
    }

    const patients = await query.orderBy('patient.lastName', 'ASC').getMany();

    return patients.map((patient) => this.decryptPatientData(patient));
  }

  async findByService(
    serviceId: string,
    searchDto?: SearchPatientsDto,
  ): Promise<Patient[]> {
    const query = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.services', 'services')
      .leftJoinAndSelect('patient.createdBy', 'createdBy')
      .leftJoinAndSelect('patient.medicalRecords', 'medicalRecords')
      .where('services.id = :serviceId', { serviceId });

    if (searchDto) {
      this.applySearchFilters(query, searchDto);
    }

    const patients = await query.orderBy('patient.lastName', 'ASC').getMany();
    return patients.map((patient) => this.decryptPatientData(patient));
  }

  async findPatientsWithoutDoctorFromService(
    serviceId: string,
  ): Promise<Patient[]> {
    const patients = await this.patientRepository
      .createQueryBuilder('patient')
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
      .getMany();

    return patients.map((patient) => this.decryptPatientData(patient));
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

  async findOneWithAccessCheck(
    id: string,
    user: AuthenticatedUser,
  ): Promise<Patient> {
    const patient = await this.findOne(id);

    if (!this.hasAccessToPatient(patient, user)) {
      throw new ForbiddenException('Access denied to this patient');
    }

    return patient;
  }

  async update(
    id: string,
    updatePatientDto: UpdatePatientDto,
  ): Promise<Patient> {
    const patient = await this.findOne(id);

    const { firstName, lastName, dob, gender, serviceId, phoneNumber } =
      updatePatientDto;

    if (firstName !== undefined) patient.firstName = firstName;
    if (lastName !== undefined) patient.lastName = lastName;
    if (gender !== undefined) patient.gender = gender;
    if (phoneNumber !== undefined) patient.phoneNumber = phoneNumber;
    if (dob !== undefined) {
      patient.dob = dob ? new Date(dob) : null;
    }

    if (serviceId) {
      const service = await this.servicesService.findOne(serviceId);
      if (service) {
        if (!patient.services) {
          patient.services = [];
        }

        const serviceExists = patient.services.some((s) => s.id === serviceId);
        if (!serviceExists) {
          patient.services.push(service);
        }
      }
    }
    this.encryptPatientData(patient);
    const updatedPatient = await this.patientRepository.save(patient);
    return this.decryptPatientData(updatedPatient);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const patient = await this.findOneWithAccessCheck(id, user);

    if (
      !user?.roles?.includes(UserRole.SUPER_ADMIN) &&
      !user?.roles?.includes(UserRole.SERVICE_HEAD)
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete patients',
      );
    }

    if (user?.roles?.includes(UserRole.SERVICE_HEAD)) {
      const hasAccessToService = patient.services?.some(
        (service) => service.id === user?.serviceId,
      );
      if (!hasAccessToService) {
        throw new ForbiddenException(
          'You can only delete patients from your department',
        );
      }
    }

    await this.patientRepository.remove(patient);
  }

  async search(searchDto: SearchPatientsDto): Promise<Patient[]> {
    const query = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.services', 'services');

    this.applySearchFilters(query, searchDto);

    const patients = await query.orderBy('patient.lastName', 'ASC').getMany();
    return patients.map((patient) => this.decryptPatientData(patient));
  }

  async searchByService(
    serviceId: string,
    searchDto: SearchPatientsDto,
  ): Promise<Patient[]> {
    const query = this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.services', 'services')
      .where('services.id = :serviceId', { serviceId });

    this.applySearchFilters(query, searchDto);

    const patients = await query.orderBy('patient.lastName', 'ASC').getMany();
    return patients.map((patient) => this.decryptPatientData(patient));
  }

  async getPatientMedicalRecords(
    id: string,
    user: AuthenticatedUser,
  ): Promise<any> {
    const patient = await this.findOneWithAccessCheck(id, user);

    return {
      patient: `${patient.firstName} ${patient.lastName}`,
      medicalRecords: patient.medicalRecords || [],
      accessGranted: true,
    };
  }

  async addServiceToPatient(
    patientId: string,
    serviceId: string,
  ): Promise<Patient> {
    const patient = await this.findOne(patientId);
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

    return this.decryptPatientData(saved);
  }

  async getAllPatientsByService(serviceId: string): Promise<Patient[]> {
    return this.findByService(serviceId);
  }

  async removeServiceFromPatient(
    patientId: string,
    serviceId: string,
  ): Promise<Patient> {
    const patient = await this.findOne(patientId);
    if (patient.services) {
      patient.services = patient.services.filter(
        (service) => service.id !== serviceId,
      );
      return await this.patientRepository.save(patient);
    }

    return patient;
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

  private hasAccessToPatient(
    patient: Patient,
    user: AuthenticatedUser,
  ): boolean {
    if (user?.roles?.includes(UserRole.SUPER_ADMIN)) return true;

    if (
      user?.roles?.includes(UserRole.SERVICE_HEAD) &&
      (!patient.services || patient.services.length === 0)
    ) {
      return true;
    }

    const hasAccessToService = patient.services?.some(
      (service) => service.id === user?.serviceId,
    );
    return hasAccessToService ?? false;
  }
}
