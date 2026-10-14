import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permissions.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { EncryptionService } from '../common/encryption.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission])],
  controllers: [RolesController],
  providers: [RolesService, EncryptionService],
  exports: [RolesService, TypeOrmModule],
})
export class RolesModule {}
