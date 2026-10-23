import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { ServicesModule } from '../services/services.module';
import { AppMailerModule } from '../mailer/mailer.module';
import { ServicesRepository } from '../services/repositories/service.repository';
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [UsersModule, ServicesModule, AppMailerModule],
  controllers: [AdminController],
  providers: [AdminService, ServicesRepository, EncryptionService],
})
export class AdminModule {}
