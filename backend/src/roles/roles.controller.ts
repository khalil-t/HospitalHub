import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Roles(UserRole.SUPER_ADMIN)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Get()
  findAllRoles() {
    return this.rolesService.findAllRoles();
  }

  @Get(':id')
  findRole(@Param('id') id: string) {
    return this.rolesService.findRoleById(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
  }

  @Patch(':id')
  updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, updateRoleDto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Post(':userId/assign/:roleId')
  assignRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rolesService.assignRole(userId, roleId, actor);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Patch(':userId/update/:roleId')
  updateUserRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rolesService.updateUserRole(userId, roleId, actor);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.SERVICE_HEAD)
  @Delete(':userId/remove/:roleId')
  removeRoleFromUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rolesService.removeRole(userId, roleId, actor);
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
