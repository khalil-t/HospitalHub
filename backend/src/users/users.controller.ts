import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterAdminResponseDto } from './dto/register-admin-response.dto';
import { AdminExistsResponseDto } from './dto/admin-exists-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.create(createUserDto, actor);
  }

  @Public()
  @Post('register')
  async register(
    @Body() registerAdminDto: RegisterAdminDto,
  ): Promise<RegisterAdminResponseDto> {
    return this.usersService.registerAdmin(registerAdminDto);
  }

  @Public()
  @Get('admin-exists')
  async checkAdminExists(): Promise<AdminExistsResponseDto> {
    return this.usersService.checkAdminExists();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Get('assignable-roles')
  findAssignableRoles(@CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.findAssignableRoles(actor);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Get()
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('service') serviceId?: string,
    @Query('roleName') roleName?: string,
  ) {
    return this.usersService.findAll(serviceId, roleName, actor);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.findOneForActor(id, actor);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.update(id, updateUserDto, actor);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.usersService.remove(id, actor);
  }
}
