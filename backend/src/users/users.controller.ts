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
  Ip,
  Req,
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
import { AuditService } from '../audit/audit.service';
import { LogAction } from '../audit/entities/audit-log.entity';

interface AuditRequest {
  user?: AuthenticatedUser;
  headers: Record<string, string>;
  ip?: string;
}

function safeUser(user: any): any {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: (user.roles ?? []).map((r: any) => r.name),
    isActive: user.isActive,
    serviceId: user.service?.id ?? null,
  };
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: AuditRequest,
    @Ip() ip: string,
  ) {
    const result = await this.usersService.create(createUserDto, actor);

    await this.auditService
      .logUserAction(
        LogAction.USER_CREATED,
        result.id,
        actor,
        ip || req.ip || '127.0.0.1',
        req.headers['user-agent'] || 'Unknown',
        `User created: ${result.username}`,
        undefined,
        safeUser(result),
      )
      .catch(() => undefined);

    return result;
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
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: AuditRequest,
    @Ip() ip: string,
  ) {
    const previous = await this.usersService.findOne(id);
    const result = await this.usersService.update(id, updateUserDto, actor);

    await this.auditService
      .logUserAction(
        LogAction.USER_UPDATED,
        id,
        actor,
        ip || req.ip || '127.0.0.1',
        req.headers['user-agent'] || 'Unknown',
        `User updated: ${previous.username}`,
        safeUser(previous),
        safeUser(result),
      )
      .catch(() => undefined);

    return result;
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: AuditRequest,
    @Ip() ip: string,
  ) {
    const previous = await this.usersService.findOne(id);

    await this.usersService.remove(id, actor);

    await this.auditService
      .logUserAction(
        LogAction.USER_DELETED,
        id,
        actor,
        ip || req.ip || '127.0.0.1',
        req.headers['user-agent'] || 'Unknown',
        `User deleted: ${previous.username}`,
        safeUser(previous),
        undefined,
      )
      .catch(() => undefined);
  }
}
