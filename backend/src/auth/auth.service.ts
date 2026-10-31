import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.hashedPassword,
      );

      if (!isPasswordValid) {
        return null;
      }

      if (!user.isActive) {
        return null;
      }

      return user;
    } catch {
      return null;
    }
  }

  async login(user: User) {
    const fullUser = await this.usersService.findOne(user.id);

    const roles = fullUser.roles?.map((role) => role.name) || [];
    const isExternalDoctor = roles.includes(UserRole.EXTERNAL_DOCTOR);

    const payload = {
      email: fullUser.email,
      username: fullUser.username,
      sub: fullUser.id,
      fullName: fullUser.fullName,
      roles,
      serviceId: fullUser.service?.id || null,
      isExternalDoctor,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign({
      sub: fullUser.id,
      email: fullUser.email,
    });

    await this.usersService.setRefreshToken(fullUser.id, refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      user: {
        id: fullUser.id,
        username: fullUser.username,
        email: fullUser.email,
        fullName: fullUser.fullName,
        roles: fullUser.roles?.map((role) => role.name) || [],
        service: fullUser.service
          ? {
              id: fullUser.service.id,
              name: fullUser.service.name,
              code: fullUser.service.code,
            }
          : null,
        isExternalDoctor,
      },
    };
  }

  async refreshToken(userId: string, refreshToken: string) {
    try {
      const decoded = this.jwtService.verify<{ sub: string }>(refreshToken);

      if (decoded.sub !== userId) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findOne(userId);

      if (!user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (!user.refreshToken || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.login(user);
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        await this.usersService.removeRefreshToken(userId);
        throw new UnauthorizedException('Refresh token expired');
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    try {
      await this.usersService.removeRefreshToken(userId);
      return { message: 'Successfully logged out' };
    } catch {
      throw new BadRequestException('Logout failed');
    }
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findOne(userId);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      roles:
        user.roles?.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
        })) || [],
      service: user.service
        ? {
            id: user.service.id,
            name: user.service.name,
            code: user.service.code,
            description: user.service.description,
          }
        : null,
      createdAt: user.createdAt,
    };
  }
}
