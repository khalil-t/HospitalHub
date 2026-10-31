import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { LogAction } from '../audit/entities/audit-log.entity';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

interface AuthRequest {
  user?: AuthenticatedUser;
  headers: Record<string, string>;
  ip?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private auditService: AuditService,
  ) {}

  @Public()
  @Throttle({
    default: {
      limit:
        Number(process.env.THROTTLE_LOGIN_LIMIT) > 0
          ? Number(process.env.THROTTLE_LOGIN_LIMIT)
          : 5,
      ttl:
        Number(process.env.THROTTLE_LOGIN_TTL_MS) > 0
          ? Number(process.env.THROTTLE_LOGIN_TTL_MS)
          : 60000,
    },
  })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @CurrentUser() user: User,
    @Req() req: AuthRequest,
    @Ip() ip: string,
  ) {
    const result = await this.authService.login(user);

    await this.auditService.logAuthentication(
      LogAction.LOGIN,
      user,
      ip || req.ip || '127.0.0.1',
      req.headers['user-agent'] || 'Unknown',
      `User logged in: ${user.email}`,
    );

    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(
      refreshTokenDto.userId,
      refreshTokenDto.refreshToken,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: User,
    @Req() req: AuthRequest,
    @Ip() ip: string,
  ) {
    await this.auditService.logAuthentication(
      LogAction.LOGOUT,
      user,
      ip || req.ip || '127.0.0.1',
      req.headers['user-agent'] || 'Unknown',
      `User logged out: ${user.email}`,
    );

    return this.authService.logout(user.id);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }
}
