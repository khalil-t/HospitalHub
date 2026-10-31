import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  Ip,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { LogAction } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('log')
  async logAction(
    @Body() logData: CreateAuditLogDto,
    @Request()
    req: { user?: AuthenticatedUser; headers: Record<string, string> },
    @Ip() ip: string,
  ) {
    const user = req.user ?? null;

    await this.auditService.createLog(
      logData.action as LogAction,
      logData.resource,
      logData.resourceId,
      user as any,
      ip || '127.0.0.1',
      req.headers['user-agent'] || 'Unknown',
      logData.details || '',
    );

    return { success: true };
  }

  @Get('logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_CLERK)
  async getLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() actor?: AuthenticatedUser,
  ) {
    const filters = {
      action,
      resource,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.auditService.getLogs(
      parseInt(page),
      parseInt(limit),
      filters,
      this.actorRole(actor!),
    );
  }

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_CLERK)
  async getSecurityDashboard(@CurrentUser() actor: AuthenticatedUser) {
    return this.auditService.getSecurityDashboard(this.actorRole(actor));
  }

  @Get('threats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_CLERK)
  async getThreats(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @CurrentUser() actor?: AuthenticatedUser,
  ) {
    return this.auditService.getThreats(
      parseInt(page),
      parseInt(limit),
      this.actorRole(actor!),
    );
  }

  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_CLERK)
  async getStatistics(@CurrentUser() actor: AuthenticatedUser) {
    return this.auditService.getStatistics(this.actorRole(actor));
  }

  @Get('export')
  @Roles(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_CLERK)
  async exportLogs(
    @Query('format') format: string = 'json',
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() actor?: AuthenticatedUser,
  ) {
    const filters = {
      action,
      resource,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.auditService.exportLogs(
      format,
      filters,
      this.actorRole(actor!),
    );
  }

  @Post('seed-test-logs')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async seedTestLogs(@CurrentUser() actor: AuthenticatedUser) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    const systemUser = await this.auditService.getSystemUser();

    const testLogs = [
      {
        action: LogAction.LOGIN,
        resource: 'authentication',
        details: 'Test login entry',
      },
      {
        action: LogAction.PATIENT_CREATED,
        resource: 'patient',
        details: 'Test patient creation',
      },
      {
        action: LogAction.RECORD_VIEWED,
        resource: 'medical_record',
        details: 'Test record view',
      },
    ];

    for (const log of testLogs) {
      await this.auditService.createLog(
        log.action,
        log.resource,
        undefined,
        actor as any,
        '127.0.0.1',
        'Test User Agent',
        log.details || '',
      );
    }

    return { message: 'Test logs created successfully' };
  }

  private actorRole(actor: AuthenticatedUser): string {
    return actor.roles.includes(UserRole.SUPER_ADMIN)
      ? UserRole.SUPER_ADMIN
      : UserRole.VERIFICATION_CLERK;
  }
}
