import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

const DEFAULT_LOGIN_THROTTLE_TTL_MS = 60000;
const DEFAULT_LOGIN_THROTTLE_LIMIT = 5;

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const configuredTtl = Number(
          configService.get<string>('THROTTLE_LOGIN_TTL_MS', '60000'),
        );
        const configuredLimit = Number(
          configService.get<string>('THROTTLE_LOGIN_LIMIT', '5'),
        );
        const ttl =
          Number.isFinite(configuredTtl) && configuredTtl > 0
            ? configuredTtl
            : DEFAULT_LOGIN_THROTTLE_TTL_MS;
        const limit =
          Number.isInteger(configuredLimit) && configuredLimit > 0
            ? configuredLimit
            : DEFAULT_LOGIN_THROTTLE_LIMIT;

        return {
          errorMessage: 'Too many login attempts. Please try again later.',
          throttlers: [{ name: 'login', ttl, limit }],
        };
      },
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not set.');
        }
        return {
          secret,
          signOptions: { expiresIn: 900 },
        };
      },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, RolesGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, RolesGuard],
})
export class AuthModule {}
