import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MedicalRecord } from './entities/medical-record.entity';
import { Prescriptions } from './entities/prescriptions.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { MedicalRecordController } from './medical-record.controller';
import { MedicalRecordService } from './medical-record.service';
import { EncryptionService } from '../common/encryption.service';
import { MedicalRecordAccessPolicy } from './policy/medical-record-access.policy';
import { PatientsModule } from '../patients/patients.module';
import { ExternalDoctorRequest } from '../external-doctors/entities/external-doctor-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicalRecord,
      Prescriptions,
      Patient,
      User,
      ExternalDoctorRequest,
    ]),
    forwardRef(() => PatientsModule),
  ],
  controllers: [MedicalRecordController],
  providers: [
    MedicalRecordService,
    EncryptionService,
    MedicalRecordAccessPolicy,
  ],
  exports: [MedicalRecordService],
})
export class MedicalRecordModule {}
