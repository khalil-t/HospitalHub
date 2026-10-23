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

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient]),
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
