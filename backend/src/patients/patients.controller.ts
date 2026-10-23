import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { PatientServiceDto } from './dto/patient-service.dto';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SERVICE_HEAD,
    UserRole.INTERNAL_DOCTOR,
    UserRole.ADMISSION_AGENT,
  )
  @Post()
  create(
    @Body() createPatientDto: CreatePatientDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.patientsService.create(createPatientDto, actor);
  }

  @Get('service/:serviceId/no-doctor')
  getPatientsWithoutDoctor(@Param('serviceId') serviceId: string) {
    return this.patientsService.findPatientsWithoutDoctorFromService(serviceId);
  }

  @Get('service/:serviceId/all')
  getAllPatientsByService(@Param('serviceId') serviceId: string) {
    return this.patientsService.findByService(serviceId);
  }

  @Get('search')
  search(
    @Query() searchDto: SearchPatientsDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const user = req.user;

    if (!user || user.roles?.includes(UserRole.SUPER_ADMIN)) {
      return this.patientsService.search(searchDto);
    }

    return this.patientsService.searchByService(
      user.serviceId ?? undefined,
      searchDto,
    );
  }

  @Get()
  findAll(
    @Query() searchDto: SearchPatientsDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const user = req?.user;

    if (!user || user.roles?.includes(UserRole.SUPER_ADMIN)) {
      return this.patientsService.findAll(searchDto);
    }

    return this.patientsService.findByService(
      user.serviceId ?? undefined,
      searchDto,
    );
  }

  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SERVICE_HEAD,
    UserRole.INTERNAL_DOCTOR,
    UserRole.ADMISSION_AGENT,
  )
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.findOneForActor(id, user);
  }

  @Get(':id/medical-records')
  getMedicalRecords(
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.getPatientMedicalRecords(id, req.user);
  }

  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SERVICE_HEAD,
    UserRole.INTERNAL_DOCTOR,
    UserRole.ADMISSION_AGENT,
  )
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.patientsService.update(id, updatePatientDto, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD, UserRole.ADMISSION_AGENT)
  @Post(':id/services')
  addService(
    @Param('id') patientId: string,
    @Body() patientServiceDto: PatientServiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.patientsService.addServiceToPatient(
      patientId,
      patientServiceDto.serviceId,
      user,
    );
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD, UserRole.ADMISSION_AGENT)
  @Delete(':patientId/services/:serviceId')
  removeService(
    @Param('patientId') patientId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.patientsService.removeServiceFromPatient(
      patientId,
      serviceId,
      user,
    );
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.remove(id, user);
  }
}
