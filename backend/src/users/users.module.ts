import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersRepository } from './repositories/user.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesModule } from '../roles/roles.module';
import { ServicesModule } from '../services/services.module';
import { EncryptionService } from '../common/encryption.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RolesModule,
    ServicesModule,
    AuditModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, EncryptionService],
  exports: [UsersRepository, UsersService, TypeOrmModule],
})
export class UsersModule {}
