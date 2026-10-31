import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ExternalDoctorsService } from './external-doctors.service';
import { CreateExternalDoctorRequestDto } from './dto/create-external-doctor-request.dto';
import { ReviewExternalDoctorRequestDto } from './dto/review-external-doctor-request.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('external-doctors')
export class ExternalDoctorsController {
  constructor(
    private readonly externalDoctorsService: ExternalDoctorsService,
  ) {}

  @Public()
  @Throttle({
    default: {
      limit: Number(process.env.EXTERNAL_DOCTOR_REQUEST_LIMIT) || 5,
      ttl: Number(process.env.EXTERNAL_DOCTOR_REQUEST_TTL_MS) || 60000,
    },
  })
  @Post('request')
  async createRequest(@Body() dto: CreateExternalDoctorRequestDto) {
    if (dto.website && dto.website.trim() !== '') {
      return { message: 'Request submitted successfully' };
    }
    return this.externalDoctorsService.createRequest(dto);
  }

  @Get('requests')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMISSION_AGENT)
  async getAllRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    const roles = user.roles || [];
    if (roles.includes(UserRole.SUPER_ADMIN)) {
      return this.externalDoctorsService.findAll(status);
    }
    if (roles.includes(UserRole.ADMISSION_AGENT)) {
      return this.externalDoctorsService.findAllForIntake(status);
    }
    throw new ForbiddenException('Access denied');
  }

  @Get('requests/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMISSION_AGENT)
  async getRequest(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalDoctorsService.findOneForActor(id, user);
  }

  @Post('requests/:id/review')
  @Roles(UserRole.SUPER_ADMIN)
  async reviewRequest(
    @Param('id') id: string,
    @Body() reviewDto: ReviewExternalDoctorRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalDoctorsService.reviewRequest(id, reviewDto, user);
  }

  @Post('check-expired')
  @Roles(UserRole.SUPER_ADMIN)
  async checkExpiredAccounts() {
    return this.externalDoctorsService.checkExpiredAccounts();
  }

  @Post('deactivate-expired')
  @Roles(UserRole.SUPER_ADMIN)
  async deactivateExpired() {
    return this.externalDoctorsService.deactivateExpiredAccounts();
  }

  @Post(':email/patients/:patientId')
  @Roles(UserRole.SUPER_ADMIN)
  async sharePatient(
    @Param('email') email: string,
    @Param('patientId') patientId: string,
  ) {
    return this.externalDoctorsService.addPatientForDoctor(email, patientId);
  }

  @Delete(':email/patients/:patientId')
  @Roles(UserRole.SUPER_ADMIN)
  async unsharePatient(
    @Param('email') email: string,
    @Param('patientId') patientId: string,
  ) {
    return this.externalDoctorsService.removePatientForDoctor(email, patientId);
  }

  @Get('patients/:email')
  async getPatientsByDoctorEmail(
    @Param('email') email: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalDoctorsService.getPatientsByDoctorEmail(email, user);
  }
}
