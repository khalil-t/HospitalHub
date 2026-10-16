import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalDoctorRequest } from './entities/external-doctor-request.entity';
import { CreateExternalDoctorRequestDto } from './dto/create-external-doctor-request.dto';
import { ReviewExternalDoctorRequestDto } from './dto/review-external-doctor-request.dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { MailerService } from '@nestjs-modules/mailer';
import * as crypto from 'crypto';
import { UsersRepository } from '../users/repositories/user.repository';
import { PatientsRepository } from '../patients/repositories/PatientsRepository';
import { Patient } from '../patients/entities/patient.entity';
import { EncryptionService } from '../common/encryption.service';

@Injectable()
export class ExternalDoctorsService implements OnModuleInit, OnModuleDestroy {
  private expirationInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly usersRepository: UsersRepository,
    @InjectRepository(ExternalDoctorRequest)
    private externalDoctorRequestRepository: Repository<ExternalDoctorRequest>,
    private usersService: UsersService,
    private mailerService: MailerService,
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
  ): Promise<ExternalDoctorRequest> {
    const existingRequest = await this.externalDoctorRequestRepository.findOne({
      where: { email: createDto.email },
    });

    if (existingRequest) {
      throw new ConflictException('Une demande existe déjà avec cet email');
    }

    const request = this.externalDoctorRequestRepository.create({
      ...createDto,
      status: 'pending',
    });

    return this.externalDoctorRequestRepository.save(request);
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
      const allUsers = await this.usersRepository.findAll();
      const fallbackAdmin = allUsers.find((user) => user.isActive);

      if (fallbackAdmin) {
        request.reviewedBy = fallbackAdmin;
      } else {
        throw new BadRequestException(
          'No valid admin users found in the system. ' +
            'Please check your database and create an admin user first.',
        );
      }
    } else {
      request.reviewedBy = reviewer;
    }

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
      username: request.email.split('@')[0] + '_ext',
      email: request.email,
      fullName: `${request.firstName} ${request.lastName}`,
      password: tempPassword,
      phoneNumber: request.phoneNumber,
      roleIds: [],
    };

    const newUser = await this.usersService.create(createUserDto);

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
    try {
      await this.mailerService.sendMail({
        to: request.email,
        subject: 'Votre demande de médecin externe a été approuvée',
        html: `
          <h2>Bienvenue!</h2>
          <p>Votre demande de médecin externe a été approuvée par l'administrateur.</p>
          <p><strong>Détails de votre compte temporaire:</strong></p>
          <ul>
            <li>Email: ${request.email}</li>
            <li>Mot de passe temporaire: ${tempPassword}</li>
            <li>Ce compte expirera dans 24 heures</li>
          </ul>
          <p>Vous pouvez maintenant vous connecter et consulter les dossiers médicaux comme les autres médecins.</p>
          <p>À bientôt!</p>
        `,
      });
    } catch {
      return;
    }
  }

  private async sendRejectionEmail(
    request: ExternalDoctorRequest,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: request.email,
        subject: 'Votre demande de médecin externe a été refusée',
        html: `
          <h2>Notification de Demande</h2>
          <p>Malheureusement, votre demande de médecin externe a été refusée.</p>
          ${request.rejectionReason ? `<p><strong>Raison:</strong> ${request.rejectionReason}</p>` : ''}
          <p>Si vous avez des questions, veuillez contacter l'administration.</p>
        `,
      });
    } catch {
      return;
    }
  }

  async addPatientForDoctor(doctorEmail: string, patientId: string) {
    const doctor = await this.externalDoctorRequestRepository.findOne({
      where: { email: doctorEmail },
      relations: ['patients'],
    });

    if (!doctor) throw new Error('Doctor not found');
    if (doctor.status !== 'approved') throw new Error('Doctor not approved');

    const patient = await this.usersRepository.findOneById(patientId);

    if (!patient) throw new Error('Patient not found');

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

  async getMyPatients(doctorEmail: string) {
    const doctor = await this.externalDoctorRequestRepository.findOne({
      where: { email: doctorEmail },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (!doctor.requestedPatientNames) {
      return [];
    }

    const patientNames = doctor.requestedPatientNames
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);

    const patients =
      await this.patientsRepository.findByFullNames(patientNames);

    return patients.map((patient) => this.decryptPatientData(patient));
  }
}
