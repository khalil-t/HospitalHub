import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ServicesModule } from './services/services.module';
import { PatientsModule } from './patients/patients.module';
import { MedicalRecordModule } from './medical-records/medical-record.module';
import { ExternalDoctorsModule } from './external-doctors/external-doctors.module';
import { AuditModule } from './audit/audit.module';
import { AppMailerModule } from './mailer/mailer.module';
import { EmailModule } from './users/email.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity.{ts,js}'],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    UsersModule,
    RolesModule,
    AuthModule,
    ServicesModule,
    PatientsModule,
    MedicalRecordModule,
    ExternalDoctorsModule,
    AuditModule,
    AppMailerModule,
    EmailModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
