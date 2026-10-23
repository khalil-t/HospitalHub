import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersRepository } from '../users/repositories/user.repository';
import { ServicesRepository } from '../services/repositories/service.repository';
import { EncryptionService } from '../common/encryption.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailerService: MailerService,
    private readonly servicesRepository: ServicesRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  private encryptUserData(userData: Partial<User>): Partial<User> {
    const encrypted: Partial<User> = { ...userData };

    if (encrypted.fullName) {
      encrypted.fullName = this.encryptionService.encrypt(encrypted.fullName);
    }

    if (encrypted.phoneNumber) {
      encrypted.phoneNumber = this.encryptionService.encrypt(
        encrypted.phoneNumber,
      );
    }

    return encrypted;
  }

  private decryptUserData(user: User): User {
    if (user.fullName) {
      user.fullName = this.encryptionService.decrypt(user.fullName);
    }

    if (user.phoneNumber) {
      user.phoneNumber = this.encryptionService.decrypt(user.phoneNumber);
    }

    return user;
  }

  async addUser(form: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(form.password, 10);

    const service = await this.servicesRepository.findById(form.serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    const encryptedData = this.encryptUserData({
      username: form.username,
      email: form.email,
      fullName: form.fullName,
      phoneNumber: form.phoneNumber,
    });

    const newUser = await this.usersRepository.create({
      ...encryptedData,
      hashedPassword,
      service,
    });

    const decryptedUser = this.decryptUserData(newUser);

    await this.mailerService.sendMail({
      to: decryptedUser.email,
      subject: 'Your account is ready!',
      text: `Hello ${decryptedUser.fullName}, your password is: ${form.password}`,
      html: `<p>Hello <b>${decryptedUser.fullName}</b></p>
             <p>Your password is: <b>${form.password}</b></p>
             <p>Please log in to access the platform.</p>`,
    });

    return decryptedUser;
  }

  async getUsers(): Promise<User[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => this.decryptUserData(user));
  }

  async updateUser(id: string, form: Partial<CreateUserDto>): Promise<User> {
    const encryptedData = this.encryptUserData({
      username: form.username,
      email: form.email,
      fullName: form.fullName,
      phoneNumber: form.phoneNumber,
    });

    const updated = await this.usersRepository.update(id, encryptedData);

    return this.decryptUserData(updated);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.usersRepository.delete(id);
  }
}
