import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalDoctorsService } from './external-doctors.service';
import { ExternalDoctorsController } from './external-doctors.controller';
import { ExternalDoctorRequest } from './entities/external-doctor-request.entity';
import { UsersModule } from '../users/users.module';
import { PatientsModule } from '../patients/patients.module';
import { AppMailerModule } from '../mailer/mailer.module';
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [
    PatientsModule,
    TypeOrmModule.forFeature([ExternalDoctorRequest]),
    UsersModule,
    AppMailerModule,
  ],
  controllers: [ExternalDoctorsController],
  providers: [ExternalDoctorsService, EncryptionService],
  exports: [ExternalDoctorsService],
})
export class ExternalDoctorsModule {}
