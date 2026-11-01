import { Injectable } from '@nestjs/common';
import { EmailService } from '../users/email.service';
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
    private readonly emailService: EmailService,
  ) {}

  async addUser(
    form: CreateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto | UserSummaryDto> {
    const createdUser = await this.usersService.create(form, actor);

    await this.emailService
      .sendWelcomeEmail(
        createdUser.email,
        createdUser.fullName,
        createdUser.email,
        form.password,
      )
      .catch(() => undefined);

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
