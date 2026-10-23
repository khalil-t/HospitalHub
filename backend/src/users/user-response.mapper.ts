import { Role } from '../roles/entities/role.entity';
import { User } from './entities/user.entity';
import {
  UserResponseDto,
  UserRoleDto,
  UserServiceDto,
  UserSummaryDto,
} from './dto/user-response.dto';

function toUserRoleDto(role: Role): UserRoleDto {
  return {
    id: role.id,
    name: role.name,
  };
}

function toUserServiceDto(user: User): UserServiceDto | null {
  if (!user.service) {
    return null;
  }
  return {
    id: user.service.id,
    name: user.service.name,
  };
}

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    roles: (user.roles ?? []).map(toUserRoleDto),
    service: toUserServiceDto(user),
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export function toUserSummary(user: User): UserSummaryDto {
  return {
    id: user.id,
    fullName: user.fullName,
    roles: (user.roles ?? []).map(toUserRoleDto),
    service: toUserServiceDto(user),
  };
}
