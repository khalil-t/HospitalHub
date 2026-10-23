import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('new_med')
  createUser(@Body() form: CreateUserDto) {
    return this.adminService.addUser(form);
  }

  @Get('users')
  getAllUsers() {
    return this.adminService.getUsers();
  }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() form: CreateUserDto) {
    return this.adminService.updateUser(id, form);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
