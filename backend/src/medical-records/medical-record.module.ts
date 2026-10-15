import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MedicalRecord } from './entities/medical-record.entity';
import { Prescriptions } from './entities/prescriptions.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { MedicalRecordController } from './medical-record.controller';
import { MedicalRecordService } from './medical-record.service';
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalRecord, Prescriptions, Patient, User]),
  ],
  controllers: [MedicalRecordController],
  providers: [MedicalRecordService, EncryptionService],
  exports: [MedicalRecordService],
})
export class MedicalRecordModule {}
