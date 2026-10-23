import { Permission } from './entities/permissions.entity';
import { Role } from './entities/role.entity';
import {
  PermissionResponseDto,
  RoleOptionDto,
  RoleResponseDto,
} from './dto/role-response.dto';

function toPermissionResponse(permission: Permission): PermissionResponseDto {
  return {
    id: permission.id,
    name: permission.name,
    description: permission.description,
    createdAt: permission.createdAt,
  };
}

export function toRoleResponse(role: Role): RoleResponseDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: (role.permissions ?? []).map(toPermissionResponse),
    createdAt: role.createdAt,
  };
}

export function toRoleOption(role: Role): RoleOptionDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
  };
}

export function toPermissionResponseDto(
  permission: Permission,
): PermissionResponseDto {
  return toPermissionResponse(permission);
}
