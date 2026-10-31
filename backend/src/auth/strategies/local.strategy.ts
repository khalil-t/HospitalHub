import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Req } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { LogAction } from '../../audit/entities/audit-log.entity';

interface StrategyRequest {
  ip?: string;
  headers: Record<string, string | undefined>;
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private auditService: AuditService,
  ) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(
    req: StrategyRequest,
    email: string,
    password: string,
  ): Promise<User> {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      await this.auditService
        .logAuthentication(
          LogAction.FAILED_LOGIN,
          null,
          req.ip || '127.0.0.1',
          req.headers['user-agent'] || 'Unknown',
          `Failed login attempt for ${email}`,
        )
        .catch(() => undefined);

      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
