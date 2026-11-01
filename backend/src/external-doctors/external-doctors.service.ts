import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalDoctorRequest } from './entities/external-doctor-request.entity';
import { CreateExternalDoctorRequestDto } from './dto/create-external-doctor-request.dto';
import { ReviewExternalDoctorRequestDto } from './dto/review-external-doctor-request.dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import * as crypto from 'crypto';
import { EmailService } from '../users/email.service';
import { UsersRepository } from '../users/repositories/user.repository';
import { PatientsRepository } from '../patients/repositories/PatientsRepository';
import { Patient } from '../patients/entities/patient.entity';
import { EncryptionService } from '../common/encryption.service';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class ExternalDoctorsService implements OnModuleInit, OnModuleDestroy {
  private expirationInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly usersRepository: UsersRepository,
    @InjectRepository(ExternalDoctorRequest)
    private externalDoctorRequestRepository: Repository<ExternalDoctorRequest>,
    private usersService: UsersService,
    private emailService: EmailService,
    private readonly patientsRepository: PatientsRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  async findByEmail(email: string) {
    return this.externalDoctorRequestRepository.findOne({ where: { email } });
  }

  private decryptPatientData(patient: Patient): Patient {
    if (patient.phoneNumber) {
      patient.phoneNumber = this.encryptionService.decrypt(patient.phoneNumber);
    }
    if (patient.nationalNumber) {
      patient.nationalNumber = this.encryptionService.decrypt(
        patient.nationalNumber,
      );
    }
    if (patient.insuranceNumber) {
      patient.insuranceNumber = this.encryptionService.decrypt(
        patient.insuranceNumber,
      );
    }
    return patient;
  }

  onModuleInit() {
    this.expirationInterval = setInterval(
      () => {
        void this.deactivateExpiredAccounts().catch(() => undefined);
      },
      15 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
      this.expirationInterval = null;
    }
  }

  async createRequest(
    createDto: CreateExternalDoctorRequestDto,
  ): Promise<{ message: string }> {
    const email = createDto.email?.toLowerCase().trim();

    const existingRequest = await this.externalDoctorRequestRepository
      .createQueryBuilder('request')
      .where('LOWER(request.email) = :email', { email })
      .getOne();

    if (existingRequest) {
      return { message: 'Request submitted successfully' };
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      return { message: 'Request submitted successfully' };
    }

    const request = this.externalDoctorRequestRepository.create({
      firstName: createDto.firstName,
      lastName: createDto.lastName,
      email,
      phoneNumber: createDto.phoneNumber,
      specialization: createDto.specialization,
      licenseNumber: createDto.licenseNumber,
      institution: createDto.institution,
      reasonForAccess: createDto.reasonForAccess,
      requestedPatientNames: createDto.requestedPatientNames,
      status: 'pending',
    });

    await this.externalDoctorRequestRepository.save(request);
    return { message: 'Request submitted successfully' };
  }

  async findAll(status?: string): Promise<ExternalDoctorRequest[]> {
    const query =
      this.externalDoctorRequestRepository.createQueryBuilder('request');

    query.leftJoinAndSelect('request.reviewedBy', 'reviewer');
    query.leftJoinAndSelect('request.createdUser', 'user');

    if (status) {
      query.andWhere('request.status = :status', { status });
    }

    return query.orderBy('request.createdAt', 'DESC').getMany();
  }

  private toIntakeProjection(request: ExternalDoctorRequest) {
    return {
      id: request.id,
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      phoneNumber: request.phoneNumber,
      specialization: request.specialization,
      institution: request.institution,
      reasonForAccess: request.reasonForAccess,
      requestedPatientNames: request.requestedPatientNames,
      status: request.status,
      rejectionReason: request.rejectionReason,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  async findAllForIntake(status?: string): Promise<any[]> {
    const query =
      this.externalDoctorRequestRepository.createQueryBuilder('request');

    query.leftJoinAndSelect('request.reviewedBy', 'reviewer');
    query.leftJoinAndSelect('request.createdUser', 'user');

    if (status) {
      query.andWhere('request.status = :status', { status });
    }

    const requests = await query.orderBy('request.createdAt', 'DESC').getMany();

    return requests.map((request) => this.toIntakeProjection(request));
  }

  async findOneForActor(
    id: string,
    user: AuthenticatedUser,
  ): Promise<
    ExternalDoctorRequest | ReturnType<typeof this.toIntakeProjection>
  > {
    const roles = user.roles || [];

    if (roles.includes(UserRole.SUPER_ADMIN)) {
      return this.findOne(id);
    }

    if (roles.includes(UserRole.ADMISSION_AGENT)) {
      const request = await this.findOne(id);
      return this.toIntakeProjection(request);
    }

    throw new ForbiddenException('Access denied');
  }

  async findOne(id: string): Promise<ExternalDoctorRequest> {
    const request = await this.externalDoctorRequestRepository.findOne({
      where: { id },
      relations: ['reviewedBy', 'createdUser'],
    });

    if (!request) {
      throw new NotFoundException(
        `Demande de médecin externe non trouvée: ${id}`,
      );
    }

    return request;
  }

  async reviewRequest(
    id: string,
    reviewDto: ReviewExternalDoctorRequestDto,
    adminUser: AuthenticatedUser,
  ): Promise<ExternalDoctorRequest> {
    const request = await this.findOne(id);

    if (request.status !== 'pending') {
      return request;
    }

    const reviewer = await this.usersRepository.findOneById(adminUser.id);

    if (!reviewer) {
      throw new BadRequestException('No valid admin users found in the system');
    }

    request.reviewedBy = reviewer;

    request.status = reviewDto.approved ? 'approved' : 'rejected';
    request.rejectionReason = reviewDto.rejectionReason ?? undefined;

    if (reviewDto.approved) {
      const { user: newUser, tempPassword } =
        await this.createTemporaryAccount(request);
      request.createdUser = newUser;
      await this.sendApprovalEmail(request, newUser, tempPassword);
    } else {
      await this.sendRejectionEmail(request);
    }

    return this.externalDoctorRequestRepository.save(request);
  }

  private async createTemporaryAccount(
    request: ExternalDoctorRequest,
  ): Promise<{ user: User; tempPassword: string }> {
    const tempPassword = crypto.randomBytes(8).toString('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    request.accountExpiresAt = expiresAt;

    const createUserDto = {
      username:
        request.email.split('@')[0] +
        '_ext_' +
        crypto.randomBytes(3).toString('hex'),
      email: request.email,
      fullName: `${request.firstName} ${request.lastName}`,
      password: tempPassword,
      phoneNumber: request.phoneNumber,
      roleIds: [],
    };

    const newUser =
      await this.usersService.createExternalDoctorUser(createUserDto);

    return { user: newUser, tempPassword };
  }

  async deactivateExpiredAccounts(): Promise<{ deactivatedCount: number }> {
    const expiredRequests = await this.externalDoctorRequestRepository.find({
      where: {
        status: 'approved',
      },
      relations: ['createdUser'],
    });

    let deactivatedCount = 0;

    for (const request of expiredRequests) {
      if (
        request.accountExpiresAt &&
        new Date() > request.accountExpiresAt &&
        request.createdUser
      ) {
        const userToRemove = request.createdUser;

        await this.usersService['usersRepository'].remove(userToRemove);

        await this.externalDoctorRequestRepository.remove(request);

        deactivatedCount++;
      }
    }

    return { deactivatedCount };
  }

  async checkExpiredAccounts(): Promise<{
    expiredAccounts: Array<{ email: string; expiresAt: Date }>;
    deactivatedCount: number;
  }> {
    const approvedRequests = await this.externalDoctorRequestRepository.find({
      where: {
        status: 'approved',
      },
      relations: ['createdUser'],
    });

    const expiredAccounts = approvedRequests
      .filter(
        (req) =>
          req.accountExpiresAt &&
          new Date() > req.accountExpiresAt &&
          req.createdUser,
      )
      .map((req) => {
        if (!req.createdUser) {
          throw new Error('createdUser is missing');
        }

        return {
          email: req.createdUser.email,
          expiresAt: req.accountExpiresAt ?? new Date(),
        };
      });

    const { deactivatedCount } = await this.deactivateExpiredAccounts();

    return {
      expiredAccounts,
      deactivatedCount,
    };
  }

  private async sendApprovalEmail(
    request: ExternalDoctorRequest,
    user: User,
    tempPassword: string,
  ): Promise<void> {
    await this.emailService
      .sendWelcomeEmail(
        request.email,
        `${request.firstName} ${request.lastName}`,
        request.email,
        tempPassword,
      )
      .catch(() => undefined);
  }

  private async sendRejectionEmail(
    request: ExternalDoctorRequest,
  ): Promise<void> {
    await this.emailService
      .sendEmail({
        to: request.email,
        subject: 'Votre demande de médecin externe a été refusée',
        html: `
          <h2>Notification de Demande</h2>
          <p>Malheureusement, votre demande de médecin externe a été refusée.</p>
          ${request.rejectionReason ? `<p><strong>Raison:</strong> ${request.rejectionReason}</p>` : ''}
          <p>Si vous avez des questions, veuillez contacter l'administration.</p>
        `,
      })
      .catch(() => undefined);
  }

  async addPatientForDoctor(doctorEmail: string, patientId: string) {
    const doctor = await this.externalDoctorRequestRepository.findOne({
      where: { email: doctorEmail.toLowerCase().trim() },
      relations: ['patients'],
    });

    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.status !== 'approved')
      throw new BadRequestException('Doctor not approved');

    const patient = await this.patientsRepository.findOneById(patientId);

    if (!patient) throw new NotFoundException('Patient not found');

    if (!doctor.patients) {
      doctor.patients = [];
    }

    const alreadyAdded = doctor.patients.some((p) => p.id === patient.id);
    if (!alreadyAdded) {
      doctor.patients.push(patient);
    }

    await this.externalDoctorRequestRepository.save(doctor);

    return doctor;
  }

  async removePatientForDoctor(doctorEmail: string, patientId: string) {
    const doctor = await this.externalDoctorRequestRepository.findOne({
      where: { email: doctorEmail.toLowerCase().trim() },
      relations: ['patients'],
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    doctor.patients = (doctor.patients ?? []).filter(
      (patient) => patient.id !== patientId,
    );

    await this.externalDoctorRequestRepository.save(doctor);

    return { message: 'Patient unshared successfully' };
  }

  async getMyPatients(doctorEmail: string) {
    const doctor = await this.externalDoctorRequestRepository.findOne({
      where: { email: doctorEmail.toLowerCase().trim() },
      relations: ['patients'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.status !== 'approved') {
      throw new ForbiddenException('Access denied');
    }

    return (doctor.patients ?? []).map((patient) =>
      this.decryptPatientData(patient),
    );
  }

  async getPatientsByDoctorEmail(email: string, user: AuthenticatedUser) {
    const roles = user.roles || [];
    if (roles.includes(UserRole.SUPER_ADMIN)) {
      return this.getMyPatients(email);
    }
    if (roles.includes(UserRole.EXTERNAL_DOCTOR)) {
      if (user.email?.toLowerCase() !== email.toLowerCase()) {
        throw new NotFoundException('Doctor not found');
      }
      return this.getMyPatients(email);
    }
    throw new ForbiddenException('Access denied');
  }
}
