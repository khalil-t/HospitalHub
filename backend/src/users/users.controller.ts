import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterAdminResponseDto } from './dto/register-admin-response.dto';
import { AdminExistsResponseDto } from './dto/admin-exists-response.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
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

  @Get()
  findAll(
    @Query('service') serviceId?: string,
    @Query('roleName') roleName?: string,
  ) {
    return this.usersService.findAll(serviceId, roleName);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
