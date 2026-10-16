import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Ip,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { LogAction } from './entities/audit-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @UseGuards(JwtAuthGuard)
  @Post('log')
  async logAction(
    @Body()
    logData: {
      action: string;
      resource: string;
      resourceId?: string;
      details: string;
      oldValues?: any;
      newValues?: any;
    },
    @Request() req: { user?: User; headers: Record<string, string> },
    @Ip() ip: string,
  ) {
    try {
      const action = logData.action as LogAction;

      await this.auditService.createLog(
        action,
        logData.resource,
        logData.resourceId,
        req.user,
        ip || '127.0.0.1',
        req.headers['user-agent'] || 'Unknown',
        logData.details,
        logData.oldValues,
        logData.newValues,
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('logs')
  async getLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      action,
      resource,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.auditService.getLogs(parseInt(page), parseInt(limit), filters);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async getSecurityDashboard() {
    return this.auditService.getSecurityDashboard();
  }

  @UseGuards(JwtAuthGuard)
  @Get('threats')
  async getThreats(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.auditService.getThreats(parseInt(page), parseInt(limit));
  }

  @UseGuards(JwtAuthGuard)
  @Get('statistics')
  async getStatistics() {
    return this.auditService.getStatistics();
  }

  @UseGuards(JwtAuthGuard)
  @Get('export')
  async exportLogs(
    @Query('format') format: string = 'json',
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      action,
      resource,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const { data } = await this.auditService.getLogs(1, 10000, filters);

    if (format === 'csv') {
      return this.convertToCSV(data as Record<string, unknown>[]);
    }

    return data as Record<string, unknown>[];
  }

  private convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return value.replace(/"/g, '""');
          if (typeof value === 'number' || typeof value === 'boolean')
            return String(value);
          return JSON.stringify(value);
        })
        .join(','),
    );

    return [csvHeaders, ...csvRows].join('\n');
  }

  @Post('seed-test-logs')
  async seedTestLogs() {
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
        systemUser,
        '127.0.0.1',
        'Test User Agent',
        log.details,
      );
    }

    return { message: 'Test logs created successfully' };
  }
}
