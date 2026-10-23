import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('new_med')
  createUser(
    @Body() form: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.adminService.addUser(form, actor);
  }

  @Get('users')
  getAllUsers(@CurrentUser() actor: AuthenticatedUser) {
    return this.adminService.getUsers(actor);
  }

  @Put('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() form: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.adminService.updateUser(id, form, actor);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.adminService.deleteUser(id, actor);
  }
}
