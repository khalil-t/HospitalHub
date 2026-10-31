import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User])],
  providers: [AuditService, EncryptionService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
