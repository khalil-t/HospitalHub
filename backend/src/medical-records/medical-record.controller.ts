import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { MedicalRecordService } from './medical-record.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('medical-records')
export class MedicalRecordController {
  constructor(private readonly service: MedicalRecordService) {}

  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SERVICE_HEAD,
    UserRole.INTERNAL_DOCTOR,
    UserRole.RADIOLOGIST,
    UserRole.LABORATORY_TECHNICIAN,
  )
  @Post()
  create(
    @Body() dto: CreateMedicalRecordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createForActor(dto, user);
  }

  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SERVICE_HEAD,
    UserRole.INTERNAL_DOCTOR,
    UserRole.EXTERNAL_DOCTOR,
    UserRole.RADIOLOGIST,
    UserRole.LABORATORY_TECHNICIAN,
  )
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAllForActor(user);
  }

  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SERVICE_HEAD,
    UserRole.INTERNAL_DOCTOR,
    UserRole.EXTERNAL_DOCTOR,
    UserRole.RADIOLOGIST,
    UserRole.LABORATORY_TECHNICIAN,
  )
  @Get('patient/:id')
  async getByPatient(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const record = await this.service.findByPatientForActor(id, user);

    if (!record) {
      return {
        record: null,
        message: 'No medical record found for this patient',
      };
    }

    return record;
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.INTERNAL_DOCTOR)
  @Get('doctor/:id/patients-count')
  countPatients(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.countPatientsForDoctor(id, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.INTERNAL_DOCTOR)
  @Get('doctor/:doctorId/patients')
  getPatientsForDoctor(
    @Param('doctorId') doctorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getPatientsForDoctor(doctorId, user);
  }

  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SERVICE_HEAD,
    UserRole.INTERNAL_DOCTOR,
    UserRole.EXTERNAL_DOCTOR,
    UserRole.ADMISSION_AGENT,
    UserRole.VERIFICATION_CLERK,
    UserRole.RADIOLOGIST,
    UserRole.LABORATORY_TECHNICIAN,
  )
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOneForActor(id, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.INTERNAL_DOCTOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateForActor(id, dto, user);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeForActor(id, user);
  }
}
