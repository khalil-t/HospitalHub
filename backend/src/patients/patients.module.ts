import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Patient } from './entities/patient.entity';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';

import { ServicesModule } from '../services/services.module';
import { UsersModule } from '../users/users.module';
import { EncryptionService } from '../common/encryption.service';
import { MedicalRecordModule } from '../medical-records/medical-record.module';
import { PatientsRepository } from './repositories/PatientsRepository';
import { PatientAccessPolicy } from './policy/patient-access.policy';
import { ExternalDoctorRequest } from '../external-doctors/entities/external-doctor-request.entity';
import { MedicalRecord } from '../medical-records/entities/medical-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, ExternalDoctorRequest, MedicalRecord]),
    ServicesModule,
    UsersModule,
    forwardRef(() => MedicalRecordModule),
  ],
  controllers: [PatientsController],
  providers: [
    PatientsService,
    EncryptionService,
    PatientsRepository,
    PatientAccessPolicy,
  ],
  exports: [
    PatientsRepository,
    PatientsService,
    PatientAccessPolicy,
    TypeOrmModule,
  ],
})
export class PatientsModule {}
