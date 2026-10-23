import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  UserResponseDto,
  UserSummaryDto,
} from '../users/dto/user-response.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
  ) {}

  async addUser(
    form: CreateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto | UserSummaryDto> {
    const createdUser = await this.usersService.create(form, actor);

    await this.mailerService.sendMail({
      to: createdUser.email,
      subject: 'Your account is ready!',
      text: `Hello ${createdUser.fullName}, your password is: ${form.password}`,
      html: `<p>Hello <b>${createdUser.fullName}</b></p>
             <p>Your password is: <b>${form.password}</b></p>
             <p>Please log in to access the platform.</p>`,
    });

    return createdUser;
  }

  async getUsers(
    actor: AuthenticatedUser,
  ): Promise<Array<UserResponseDto | UserSummaryDto>> {
    return this.usersService.findAll(undefined, undefined, actor);
  }

  async updateUser(
    id: string,
    form: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto | UserSummaryDto> {
    return this.usersService.update(id, form, actor);
  }

  async deleteUser(id: string, actor: AuthenticatedUser): Promise<void> {
    await this.usersService.remove(id, actor);
  }
}
