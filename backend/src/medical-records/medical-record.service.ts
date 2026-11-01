import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MedicalRecord } from './entities/medical-record.entity';
import { Prescriptions } from './entities/prescriptions.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecordResponseDto } from './dto/medical-record-response.dto';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { EncryptionService } from '../common/encryption.service';
import { UserRole } from '../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { MedicalRecordAccessPolicy } from './policy/medical-record-access.policy';
import { toMedicalRecordResponse } from './medical-record-response.mapper';

const MEDICAL_RECORD_ENCRYPTED_FIELDS = [
  'title',
  'content',
  'diagnosis',
] as const;

const PRESCRIPTION_ENCRYPTED_FIELDS = [
  'medication',
  'dose',
  'frequency',
  'duration',
] as const;

const PATIENT_ENCRYPTED_FIELDS = [
  'phoneNumber',
  'nationalNumber',
  'insuranceNumber',
] as const;

@Injectable()
export class MedicalRecordService {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly recordRepo: Repository<MedicalRecord>,
    @InjectRepository(Prescriptions)
    private readonly prescriptionRepo: Repository<Prescriptions>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly encryptionService: EncryptionService,
    private readonly accessPolicy: MedicalRecordAccessPolicy,
  ) {}

  private encryptMedicalRecordData(
    recordData: Partial<MedicalRecord>,
  ): Partial<MedicalRecord> {
    const encrypted: Partial<MedicalRecord> = { ...recordData };

    for (const field of MEDICAL_RECORD_ENCRYPTED_FIELDS) {
      if (recordData[field]) {
        encrypted[field] = this.encryptionService.encrypt(recordData[field]);
      }
    }

    if (recordData.allergies?.length) {
      encrypted.allergies = this.encryptionService
        .encrypt(JSON.stringify(recordData.allergies))
        .split(',');
    }

    return encrypted;
  }

  private decryptMedicalRecordData(record: MedicalRecord): MedicalRecord {
    const decrypted: MedicalRecord = { ...record };

    for (const field of MEDICAL_RECORD_ENCRYPTED_FIELDS) {
      if (record[field]) {
        try {
          decrypted[field] = this.encryptionService.decrypt(record[field]);
        } catch {
          decrypted[field] = `[DECRYPTION ERROR: ${field}]`;
        }
      }
    }

    if (record.allergies?.length) {
      try {
        decrypted.allergies = JSON.parse(
          this.encryptionService.decrypt(record.allergies.join(',')),
        ) as string[];
      } catch {
        decrypted.allergies = record.allergies;
      }
    }

    return decrypted;
  }

  private encryptPrescription(
    prescription: Partial<Prescriptions>,
  ): Partial<Prescriptions> {
    const encrypted: Partial<Prescriptions> = { ...prescription };

    for (const field of PRESCRIPTION_ENCRYPTED_FIELDS) {
      if (field in prescription) {
        const raw =
          prescription[field] !== null && prescription[field] !== undefined
            ? String(prescription[field])
            : '';
        encrypted[field] = this.encryptionService.encrypt(raw);
      }
    }

    return encrypted;
  }

  private decryptPrescription(
    prescription: Prescriptions,
  ): Prescriptions & { name?: string; dosage?: string } {
    const decrypted: Prescriptions & { name?: string; dosage?: string } = {
      ...prescription,
    };

    for (const field of PRESCRIPTION_ENCRYPTED_FIELDS) {
      if (prescription[field]) {
        try {
          decrypted[field] = this.encryptionService.decrypt(
            prescription[field],
          );
        } catch {
          decrypted[field] = `[DECRYPTION ERROR: ${field}]`;
        }
      }
    }

    if (decrypted.medication) {
      decrypted.name = decrypted.medication;
    }
    if (decrypted.dose) {
      decrypted.dosage = decrypted.dose;
    }

    return decrypted;
  }

  private decryptPrescriptionsArray(
    prescriptions: Prescriptions[],
  ): Prescriptions[] {
    if (!prescriptions || prescriptions.length === 0) return [];
    return prescriptions.map((prescription) =>
      this.decryptPrescription(prescription),
    );
  }

  private decryptPatientData(patient: Patient): Patient {
    for (const field of PATIENT_ENCRYPTED_FIELDS) {
      if (patient[field]) {
        try {
          patient[field] = this.encryptionService.decrypt(patient[field]);
        } catch {
          patient[field] = `[DECRYPTION ERROR: ${field}]`;
        }
      }
    }
    return patient;
  }

  private decryptUserData(user: User): User {
    if (user.fullName) {
      user.fullName = this.encryptionService.decrypt(user.fullName);
    }
    if (user.phoneNumber) {
      user.phoneNumber = this.encryptionService.decrypt(user.phoneNumber);
    }
    return user;
  }

  private toDecryptedRecord(record: MedicalRecord): MedicalRecord {
    if (record.patient) {
      record.patient = this.decryptPatientData(record.patient);
    }

    const decrypted = this.decryptMedicalRecordData(record);
    decrypted.prescriptions = this.decryptPrescriptionsArray(
      record.prescriptions || [],
    );
    decrypted.responsibleDoctors = (record.responsibleDoctors || []).map(
      (doctor) => this.decryptUserData(doctor),
    );

    return decrypted;
  }

  private toResponse(record: MedicalRecord): MedicalRecordResponseDto {
    return toMedicalRecordResponse(this.toDecryptedRecord(record));
  }

  private hasRole(user: AuthenticatedUser, role: UserRole): boolean {
    return (user.roles ?? []).includes(role);
  }

  async createForActor(
    dto: CreateMedicalRecordDto,
    user: AuthenticatedUser,
  ): Promise<MedicalRecordResponseDto> {
    const allowed = await this.accessPolicy.canCreate(user, dto.patientId);

    if (!allowed) {
      if (
        this.hasRole(user, UserRole.SUPER_ADMIN) ||
        this.hasRole(user, UserRole.INTERNAL_DOCTOR)
      ) {
        throw new NotFoundException('Patient not found');
      }
      throw new ForbiddenException();
    }

    return this.create(dto, user.id);
  }

  createInitialRecord(
    patientId: string,
    authorId: string,
  ): Promise<MedicalRecordResponseDto> {
    return this.create({ patientId }, authorId);
  }

  private async create(
    createDto: CreateMedicalRecordDto,
    authorId: string,
  ): Promise<MedicalRecordResponseDto> {
    const patient = await this.patientRepo.findOne({
      where: { id: createDto.patientId },
    });
    if (!patient) {
      throw new NotFoundException(
        `Patient with ID ${createDto.patientId} not found`,
      );
    }

    const encryptedData: Partial<MedicalRecord> = {};
    for (const field of MEDICAL_RECORD_ENCRYPTED_FIELDS) {
      const value = createDto[field];
      if (value) {
        encryptedData[field] = this.encryptionService.encrypt(value);
      }
    }
    if (createDto.allergies?.length) {
      encryptedData.allergies = this.encryptionService
        .encrypt(JSON.stringify(createDto.allergies))
        .split(',');
    }
    if (createDto.recordDate) {
      encryptedData.recordDate = new Date(createDto.recordDate);
    }

    const record = this.recordRepo.create({
      ...encryptedData,
      patient,
      authorId,
    });
    const savedRecord = await this.recordRepo.save(record);

    if (createDto.responsibleDoctors?.length) {
      const doctors = await this.userRepo.findByIds(
        createDto.responsibleDoctors,
      );
      await this.recordRepo
        .createQueryBuilder()
        .relation(MedicalRecord, 'responsibleDoctors')
        .of(savedRecord.id)
        .add(doctors.map((doctor) => doctor.id));
    }

    if (createDto.prescriptions?.length) {
      const prescriptions = await Promise.all(
        createDto.prescriptions.map((prescriptionDto) => {
          const encryptedPrescription =
            this.encryptPrescription(prescriptionDto);
          return this.prescriptionRepo.save(
            this.prescriptionRepo.create({
              ...encryptedPrescription,
              medicalRecord: savedRecord,
            }),
          );
        }),
      );
      savedRecord.prescriptions = prescriptions;
    }

    const completeRecord = await this.recordRepo.findOne({
      where: { id: savedRecord.id },
      relations: ['patient', 'responsibleDoctors', 'prescriptions'],
    });

    if (!completeRecord) {
      throw new Error('Failed to fetch saved medical record');
    }

    return this.toResponse(completeRecord);
  }

  async findAllForActor(
    user: AuthenticatedUser,
  ): Promise<MedicalRecordResponseDto[]> {
    if (this.hasRole(user, UserRole.SUPER_ADMIN)) {
      return this.findAll();
    }
    if (this.hasRole(user, UserRole.INTERNAL_DOCTOR)) {
      return this.findForInternalDoctor(user);
    }
    throw new ForbiddenException();
  }

  private async findForInternalDoctor(
    user: AuthenticatedUser,
  ): Promise<MedicalRecordResponseDto[]> {
    const query = this.recordRepo
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.patient', 'patient')
      .leftJoinAndSelect('patient.services', 'services')
      .leftJoinAndSelect('record.responsibleDoctors', 'responsibleDoctors')
      .leftJoinAndSelect('record.prescriptions', 'prescriptions')
      .where('responsibleDoctors.id = :userId', { userId: user.id });

    if (user.serviceId) {
      query.orWhere('services.id = :serviceId', {
        serviceId: user.serviceId,
      });
    }

    const records = await query.distinct(true).getMany();
    return records.map((record) => this.toResponse(record));
  }

  private async findAll(): Promise<MedicalRecordResponseDto[]> {
    const records = await this.recordRepo.find({
      relations: ['patient', 'responsibleDoctors', 'prescriptions'],
    });

    return records.map((record) => this.toResponse(record));
  }

  async countPatientsForDoctor(
    doctorId: string,
    user: AuthenticatedUser,
  ): Promise<number> {
    this.assertDoctorScope(user, doctorId);

    const result = await this.recordRepo
      .createQueryBuilder('mr')
      .innerJoin('mr.responsibleDoctors', 'doc')
      .innerJoin('mr.patient', 'patient')
      .where('doc.id = :doctorId', { doctorId })
      .select('COUNT(DISTINCT patient.id)', 'count')
      .getRawOne<{ count: string }>();

    return Number(result?.count ?? 0);
  }

  async getPatientsForDoctor(
    doctorId: string,
    user: AuthenticatedUser,
  ): Promise<MedicalRecordResponseDto[]> {
    this.assertDoctorScope(user, doctorId);

    if (user.serviceId) {
      const patients = await this.patientRepo
        .createQueryBuilder('patient')
        .innerJoin('patient.services', 'service')
        .where('service.id = :serviceId', { serviceId: user.serviceId })
        .getMany();

      return patients.map((patient) =>
        this.toResponse({
          id: crypto.randomUUID(),
          patient,
          title: '',
          content: '',
          diagnosis: '',
          allergies: [],
          recordDate: new Date(),
          responsibleDoctors: [],
          prescriptions: [],
          authorId: user.id,
          createdAt: new Date(),
        } as any),
      );
    }

    const records = await this.recordRepo
      .createQueryBuilder('mr')
      .innerJoin(
        'medical_record_doctors',
        'mrd',
        'mrd.medical_record_id = mr.id AND mrd.doctor_id = :doctorId',
        { doctorId },
      )
      .innerJoinAndSelect('mr.patient', 'patient')
      .leftJoinAndSelect('mr.responsibleDoctors', 'responsibleDoctors')
      .leftJoinAndSelect('mr.prescriptions', 'prescriptions')
      .getMany();

    return records.map((record) => this.toResponse(record));
  }

  private assertDoctorScope(user: AuthenticatedUser, doctorId: string): void {
    if (!this.accessPolicy.canViewDoctorRecords(user, doctorId)) {
      throw new NotFoundException('Doctor not found');
    }
  }

  async findOneForActor(
    id: string,
    user: AuthenticatedUser,
  ): Promise<MedicalRecordResponseDto> {
    if (!(await this.accessPolicy.canView(user, id))) {
      throw new NotFoundException('Medical record not found');
    }

    return this.findOne(id);
  }

  private async findOne(id: string): Promise<MedicalRecordResponseDto> {
    const record = await this.recordRepo.findOne({
      where: { id },
      relations: ['patient', 'responsibleDoctors', 'prescriptions'],
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    return this.toResponse(record);
  }

  async findByPatientForActor(
    patientId: string,
    user: AuthenticatedUser,
  ): Promise<MedicalRecordResponseDto[]> {
    if (!(await this.accessPolicy.canViewByPatient(user, patientId))) {
      throw new NotFoundException('Patient not found');
    }

    const records = await this.recordRepo.find({
      where: { patient: { id: patientId } },
      relations: ['patient', 'responsibleDoctors', 'prescriptions'],
      order: { recordDate: 'DESC' },
    });

    return records.map((record) => this.toResponse(record));
  }

  async updateForActor(
    id: string,
    dto: UpdateMedicalRecordDto,
    user: AuthenticatedUser,
  ): Promise<MedicalRecordResponseDto> {
    if (!(await this.accessPolicy.canUpdate(user, id))) {
      throw new ForbiddenException();
    }

    return this.update(id, dto);
  }

  private async update(
    id: string,
    dto: UpdateMedicalRecordDto,
  ): Promise<MedicalRecordResponseDto> {
    const record = await this.recordRepo.findOne({
      where: { id },
      relations: ['prescriptions', 'responsibleDoctors', 'patient'],
    });

    if (!record) {
      throw new NotFoundException(`Medical record with ID ${id} not found`);
    }

    const {
      recordDate,
      responsibleDoctors,
      prescriptions,
      ...fieldsToEncrypt
    } = dto;
    const recordDateValue = recordDate ? new Date(recordDate) : undefined;
    const dataToEncrypt = { ...fieldsToEncrypt, recordDate: recordDateValue };

    const encryptedData = this.encryptMedicalRecordData(dataToEncrypt);
    Object.assign(record, encryptedData);
    record.recordDate = encryptedData.recordDate ?? record.recordDate;

    if (responsibleDoctors?.length) {
      const doctors = await this.userRepo.findByIds(responsibleDoctors);
      record.responsibleDoctors = doctors;
    } else if (
      responsibleDoctors === null ||
      (Array.isArray(responsibleDoctors) && responsibleDoctors.length === 0)
    ) {
      record.responsibleDoctors = [];
    }

    if (prescriptions !== undefined) {
      const existingPrescriptions = record.prescriptions || [];

      const prescriptionsToDelete = existingPrescriptions.filter(
        (existingPrescription) =>
          !prescriptions.some(
            (prescription) => prescription.id === existingPrescription.id,
          ),
      );
      if (prescriptionsToDelete.length) {
        await this.prescriptionRepo.remove(prescriptionsToDelete);
      }

      record.prescriptions = await Promise.all(
        prescriptions.map(async (prescriptionDto) => {
          const encryptedPrescription =
            this.encryptPrescription(prescriptionDto);
          const prescriptionData: Partial<Prescriptions> = {
            ...encryptedPrescription,
            medicalRecord: record,
          };

          if (prescriptionDto.id) {
            const existingPrescription = existingPrescriptions.find(
              (existing) => existing.id === prescriptionDto.id,
            );
            if (existingPrescription) {
              return this.prescriptionRepo.save({
                ...existingPrescription,
                ...prescriptionData,
              });
            }
          }
          return this.prescriptionRepo.save(
            this.prescriptionRepo.create(prescriptionData),
          );
        }),
      );
    }

    const updatedRecord = await this.recordRepo.save(record);
    const completeRecord = await this.recordRepo.findOne({
      where: { id: updatedRecord.id },
      relations: ['patient', 'responsibleDoctors', 'prescriptions'],
    });

    if (!completeRecord) {
      throw new NotFoundException('Medical record not found');
    }

    return this.toResponse(completeRecord);
  }

  async removeForActor(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    if (!this.accessPolicy.canDelete(user)) {
      throw new ForbiddenException();
    }

    await this.remove(id);
    return { success: true };
  }

  private async remove(id: string): Promise<void> {
    const record = await this.recordRepo.findOne({ where: { id } });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    await this.recordRepo.remove(record);
  }
}
