import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class RegisterAdminDto extends PickType(CreateUserDto, [
  'username',
  'email',
  'fullName',
  'password',
  'phoneNumber',
] as const) {}
