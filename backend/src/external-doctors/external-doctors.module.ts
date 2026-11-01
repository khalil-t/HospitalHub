import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalDoctorsService } from './external-doctors.service';
import { ExternalDoctorsController } from './external-doctors.controller';
import { ExternalDoctorRequest } from './entities/external-doctor-request.entity';
import { UsersModule } from '../users/users.module';
import { PatientsModule } from '../patients/patients.module';
import { EmailModule } from '../users/email.module';
import { EncryptionService } from '../common/encryption.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    PatientsModule,
    TypeOrmModule.forFeature([ExternalDoctorRequest]),
    UsersModule,
    EmailModule,
  ],
  controllers: [ExternalDoctorsController],
  providers: [ExternalDoctorsService, EncryptionService],
  exports: [ExternalDoctorsService],
})
export class ExternalDoctorsModule {}
