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
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(createPatientDto);
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
    return this.patientsService.searchByService(
      req.user?.serviceId as string,
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
      user.serviceId as string,
      searchDto,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.findOneWithAccessCheck(id, req.user);
  }

  @Get(':id/medical-records')
  getMedicalRecords(
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.patientsService.getPatientMedicalRecords(id, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientsService.update(id, updatePatientDto);
  }

  @Post(':id/services')
  addService(
    @Param('id') patientId: string,
    @Body() patientServiceDto: PatientServiceDto,
  ) {
    return this.patientsService.addServiceToPatient(
      patientId,
      patientServiceDto.serviceId,
    );
  }

  @Delete(':patientId/services/:serviceId')
  removeService(
    @Param('patientId') patientId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.patientsService.removeServiceFromPatient(patientId, serviceId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: AuthenticatedUser }) {
    return this.patientsService.remove(id, req.user);
  }
}
