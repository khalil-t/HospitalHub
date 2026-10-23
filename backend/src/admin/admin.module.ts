import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { AppMailerModule } from '../mailer/mailer.module';

@Module({
  imports: [UsersModule, AppMailerModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
