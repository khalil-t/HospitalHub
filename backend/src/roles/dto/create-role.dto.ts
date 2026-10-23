import { IsEnum, IsString, IsOptional, IsArray, IsUUID } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateRoleDto {
  @IsEnum(UserRole)
  name: UserRole;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
