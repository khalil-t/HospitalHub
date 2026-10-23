import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ExternalDoctorsService } from './external-doctors.service';
import { CreateExternalDoctorRequestDto } from './dto/create-external-doctor-request.dto';
import { ReviewExternalDoctorRequestDto } from './dto/review-external-doctor-request.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('external-doctors')
export class ExternalDoctorsController {
  constructor(
    private readonly externalDoctorsService: ExternalDoctorsService,
  ) {}

  @Public()
  @Post('request')
  async createRequest(@Body() createDto: CreateExternalDoctorRequestDto) {
    return this.externalDoctorsService.createRequest(createDto);
  }

  @Get('requests')
  @Roles(UserRole.SUPER_ADMIN)
  async getAllRequests(@Query('status') status?: string) {
    return this.externalDoctorsService.findAll(status);
  }

  @Get('requests/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async getRequest(@Param('id') id: string) {
    return this.externalDoctorsService.findOne(id);
  }

  @Post('requests/:id/review')
  @Roles(UserRole.SUPER_ADMIN)
  async reviewRequest(
    @Param('id') id: string,
    @Body() reviewDto: ReviewExternalDoctorRequestDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    if (!req.user) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.externalDoctorsService.reviewRequest(id, reviewDto, req.user);
  }

  @Post('check-expired')
  async checkExpiredAccounts() {
    return this.externalDoctorsService.checkExpiredAccounts();
  }

  @Post('deactivate-expired')
  @Roles(UserRole.SUPER_ADMIN)
  async deactivateExpired() {
    return this.externalDoctorsService.deactivateExpiredAccounts();
  }

  @Get('patients/:email')
  async getPatientsByDoctorEmail(@Param('email') email: string) {
    return this.externalDoctorsService.getMyPatients(email);
  }
}
