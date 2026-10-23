export class PermissionResponseDto {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
}

export class RoleResponseDto {
  id: string;
  name: string;
  description: string;
  permissions: PermissionResponseDto[];
  createdAt: Date;
}

export class RoleOptionDto {
  id: string;
  name: string;
  description: string;
}
