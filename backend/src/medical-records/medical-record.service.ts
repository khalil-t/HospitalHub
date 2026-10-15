import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MedicalRecord } from './entities/medical-record.entity';
import { Prescriptions } from './entities/prescriptions.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { EncryptionService } from '../common/encryption.service';

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

    return decrypted;
  }

  async create(createDto: CreateMedicalRecordDto): Promise<MedicalRecord> {
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

    return this.toDecryptedRecord(completeRecord);
  }

  async findAll(): Promise<MedicalRecord[]> {
    const records = await this.recordRepo.find({
      relations: ['patient', 'responsibleDoctors', 'prescriptions'],
    });

    return records.map((record) => this.toDecryptedRecord(record));
  }

  async countPatientsForDoctor(doctorId: string): Promise<number> {
    const result = await this.recordRepo
      .createQueryBuilder('mr')
      .innerJoin('mr.responsibleDoctors', 'doc')
      .innerJoin('mr.patient', 'patient')
      .where('doc.id = :doctorId', { doctorId })
      .select('COUNT(DISTINCT patient.id)', 'count')
      .getRawOne<{ count: string }>();

    return Number(result?.count ?? 0);
  }

  async getPatientsForDoctor(doctorId: string): Promise<MedicalRecord[]> {
    const records = await this.recordRepo
      .createQueryBuilder('mr')
      .innerJoin(
        'medical_record_doctors',
        'mrd',
        'mrd.medical_record_id = mr.id AND mrd.doctor_id = :doctorId',
        { doctorId },
      )
      .innerJoinAndSelect('mr.patient', 'patient')
      .leftJoinAndSelect('mr.prescriptions', 'prescriptions')
      .getMany();

    return records.map((record) => this.toDecryptedRecord(record));
  }

  async findOne(id: string): Promise<MedicalRecord> {
    const record = await this.recordRepo.findOne({
      where: { id },
      relations: ['patient', 'responsibleDoctors', 'prescriptions'],
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    return this.toDecryptedRecord(record);
  }

  async findByPatient(patientId: string): Promise<MedicalRecord | null> {
    const record = await this.recordRepo.findOne({
      where: { patient: { id: patientId } },
      relations: ['patient', 'responsibleDoctors', 'prescriptions'],
      order: { recordDate: 'DESC' },
    });

    if (!record) return null;

    const decrypted = this.toDecryptedRecord(record);

    if (record.responsibleDoctors?.length) {
      decrypted.responsibleDoctors = record.responsibleDoctors.map((doctor) =>
        this.decryptUserData(doctor),
      );
    }

    return decrypted;
  }

  async update(
    id: string,
    dto: UpdateMedicalRecordDto,
  ): Promise<MedicalRecord> {
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

    return this.toDecryptedRecord(updatedRecord);
  }

  async remove(id: string) {
    const record = await this.findOne(id);
    return this.recordRepo.remove(record);
  }
}
