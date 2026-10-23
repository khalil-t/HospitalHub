export class UserRoleDto {
  id: string;
  name: string;
}

export class UserServiceDto {
  id: string;
  name: string;
}

export class UserResponseDto {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  roles: UserRoleDto[];
  service: UserServiceDto | null;
  isActive: boolean;
  createdAt: Date;
}

export class UserSummaryDto {
  id: string;
  fullName: string;
  roles: UserRoleDto[];
  service: UserServiceDto | null;
}
