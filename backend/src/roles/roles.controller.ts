import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Ip,
  Req,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { LogAction } from '../audit/entities/audit-log.entity';

interface AuditRequest {
  user?: AuthenticatedUser;
  headers: Record<string, string>;
  ip?: string;
}

@Roles(UserRole.SUPER_ADMIN)
@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAllRoles() {
    return this.rolesService.findAllRoles();
  }

  @Get(':id')
  findRole(@Param('id') id: string) {
    return this.rolesService.findRoleById(id);
  }

  @Patch(':id')
  updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, updateRoleDto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Post(':userId/assign/:roleId')
  async assignRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: AuditRequest,
    @Ip() ip: string,
  ) {
    const target = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    const oldRoles = target?.roles.map((r) => r.name) ?? [];

    const result = await this.rolesService.assignRole(userId, roleId, actor);

    await this.auditService
      .logUserAction(
        LogAction.ROLE_ASSIGNED,
        userId,
        actor,
        ip || req.ip || '127.0.0.1',
        req.headers['user-agent'] || 'Unknown',
        `Role ${roleId} assigned to user ${userId}`,
        oldRoles,
        (result as { roles?: { name: string }[] })?.roles?.map((r) => r.name),
      )
      .catch(() => undefined);

    return result;
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Patch(':userId/update/:roleId')
  async updateUserRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: AuditRequest,
    @Ip() ip: string,
  ) {
    const target = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    const oldRoles = target?.roles.map((r) => r.name) ?? [];

    const result = await this.rolesService.updateUserRole(
      userId,
      roleId,
      actor,
    );

    await this.auditService
      .logUserAction(
        LogAction.ROLE_ASSIGNED,
        userId,
        actor,
        ip || req.ip || '127.0.0.1',
        req.headers['user-agent'] || 'Unknown',
        `User ${userId} role updated to ${roleId}`,
        oldRoles,
        (result as { roles?: { name: string }[] })?.roles?.map((r) => r.name),
      )
      .catch(() => undefined);

    return result;
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Delete(':userId/remove/:roleId')
  async removeRoleFromUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: AuditRequest,
    @Ip() ip: string,
  ) {
    const target = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    const oldRoles = target?.roles.map((r) => r.name) ?? [];

    const result = await this.rolesService.removeRole(userId, roleId, actor);

    await this.auditService
      .logUserAction(
        LogAction.ROLE_REMOVED,
        userId,
        actor,
        ip || req.ip || '127.0.0.1',
        req.headers['user-agent'] || 'Unknown',
        `Role ${roleId} removed from user ${userId}`,
        oldRoles,
        (result as { roles?: { name: string }[] })?.roles?.map((r) => r.name),
      )
      .catch(() => undefined);

    return result;
  }

  @Post('permissions')
  createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    return this.rolesService.createPermission(createPermissionDto);
  }

  @Get('permissions/all')
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Post(':id/permissions')
  assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(
      id,
      assignPermissionsDto.permissionIds,
    );
  }

  @Delete(':id/permissions/:permissionId')
  removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolesService.removePermission(id, permissionId);
  }

  @Get('name/:name')
  findRoleByName(@Param('name') name: string) {
    return this.rolesService.findRoleByName(name);
  }
}
