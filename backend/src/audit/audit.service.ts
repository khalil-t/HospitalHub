import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, LogAction } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';

interface AuditLogFilters {
  action?: string;
  resource?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createLog(
    action: LogAction,
    resource: string,
    resourceId: string | undefined,
    user: User | undefined | null,
    ipAddress: string,
    userAgent: string,
    details: string,
    oldValues?: any,
    newValues?: any,
    status: string = 'SUCCESS',
  ): Promise<AuditLog> {
    let validUser: User | undefined = undefined;
    if (user && user.id) {
      const userInDb = await this.userRepository.findOne({
        where: { id: user.id },
      });
      if (userInDb) {
        validUser = userInDb;
      }
    }

    const logData = {
      action,
      resource,
      resourceId: resourceId || undefined,
      user: validUser,
      ipAddress,
      userAgent,
      details,
      oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
      newValues: newValues ? JSON.stringify(newValues) : undefined,
      status,
    };

    const log = this.auditLogRepository.create(logData);
    return await this.auditLogRepository.save(log);
  }

  async logAuthentication(
    action: LogAction.LOGIN | LogAction.LOGOUT | LogAction.FAILED_LOGIN,
    user: User | null,
    ipAddress: string,
    userAgent: string,
    details: string,
  ) {
    return this.createLog(
      action,
      'authentication',
      user?.id?.toString(),
      user,
      ipAddress,
      userAgent,
      details,
    );
  }

  async logPatientAction(
    action: LogAction,
    patientId: string,
    user: User,
    ipAddress: string,
    userAgent: string,
    details: string,
    oldValues?: any,
    newValues?: any,
  ) {
    return this.createLog(
      action,
      'patient',
      patientId,
      user,
      ipAddress,
      userAgent,
      details,
      oldValues,
      newValues,
    );
  }

  async logMedicalRecordAction(
    action: LogAction,
    recordId: string,
    user: User,
    ipAddress: string,
    userAgent: string,
    details: string,
    oldValues?: any,
    newValues?: any,
  ) {
    return this.createLog(
      action,
      'medical_record',
      recordId,
      user,
      ipAddress,
      userAgent,
      details,
      oldValues,
      newValues,
    );
  }

  async logUserAction(
    action: LogAction,
    targetUserId: string,
    user: User,
    ipAddress: string,
    userAgent: string,
    details: string,
    oldValues?: any,
    newValues?: any,
  ) {
    return this.createLog(
      action,
      'user',
      targetUserId,
      user,
      ipAddress,
      userAgent,
      details,
      oldValues,
      newValues,
    );
  }

  async logDashboardAccess(
    dashboardType: string,
    user: User,
    ipAddress: string,
    userAgent: string,
  ) {
    return this.createLog(
      LogAction.DASHBOARD_ACCESSED,
      'dashboard',
      dashboardType,
      user,
      ipAddress,
      userAgent,
      `Accessed ${dashboardType} dashboard`,
    );
  }

  async logPageVisit(
    pageName: string,
    user: User,
    ipAddress: string,
    userAgent: string,
  ) {
    return this.createLog(
      LogAction.PAGE_VISITED,
      'page',
      pageName,
      user,
      ipAddress,
      userAgent,
      `Visited ${pageName} page`,
    );
  }

  async logSearch(
    searchTerm: string,
    resultsCount: number,
    user: User,
    ipAddress: string,
    userAgent: string,
  ) {
    return this.createLog(
      LogAction.SEARCH_PERFORMED,
      'search',
      undefined,
      user,
      ipAddress,
      userAgent,
      `Searched for "${searchTerm}" - ${resultsCount} results found`,
    );
  }

  async logDataExport(
    dataType: string,
    format: string,
    user: User,
    ipAddress: string,
    userAgent: string,
  ) {
    return this.createLog(
      LogAction.DATA_EXPORTED,
      'export',
      undefined,
      user,
      ipAddress,
      userAgent,
      `Exported ${dataType} data as ${format}`,
    );
  }

  async getSystemUser(): Promise<User | undefined> {
    const user = await this.userRepository.findOne({
      where: { email: 'admin@system.local' },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      return undefined;
    }

    return user;
  }

  async getLogs(
    page: number = 1,
    limit: number = 50,
    filters: AuditLogFilters = {},
  ): Promise<{ data: any[]; total: number }> {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions');

    if (filters.action) {
      query.andWhere('log.action = :action', { action: filters.action });
    }

    if (filters.resource) {
      query.andWhere('log.resource ILIKE :resource', {
        resource: `%${filters.resource}%`,
      });
    }

    if (filters.userId) {
      query.andWhere('log.user_id = :userId', { userId: filters.userId });
    }

    if (filters.startDate) {
      query.andWhere('log.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('log.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    const total = await query.getCount();

    const logs = await query
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const enrichedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      statusCode: log.statusCode,
      status: log.status,
      oldValues: log.oldValues as unknown,
      newValues: log.newValues as unknown,
      user: log.user
        ? {
            id: log.user.id,
            username: log.user.username,
            fullName: log.user.fullName,
            email: log.user.email,
          }
        : null,
    }));

    return { data: enrichedLogs, total };
  }

  async getSecurityDashboard() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - 7));

    const todayLogs = await this.auditLogRepository.count({
      where: { createdAt: startOfDay },
    });

    const weekLogs = await this.auditLogRepository.count({
      where: { createdAt: startOfWeek },
    });

    const failedLogins = await this.auditLogRepository.count({
      where: { action: LogAction.FAILED_LOGIN, createdAt: startOfDay },
    });

    return {
      todayLogs,
      weekLogs,
      failedLogins,
      totalLogs: await this.auditLogRepository.count(),
    };
  }

  async getThreats(page: number = 1, limit: number = 50) {
    const threatActions = [
      LogAction.FAILED_LOGIN,
      LogAction.UNAUTHORIZED_ACCESS,
      LogAction.PERMISSION_DENIED,
      LogAction.SUSPICIOUS_ACTIVITY,
    ];

    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.action IN (:...actions)', { actions: threatActions })
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [threats, total] = await query.getManyAndCount();

    return {
      data: threats.map((threat) => ({
        id: threat.id,
        action: threat.action,
        resource: threat.resource,
        details: threat.details,
        ipAddress: threat.ipAddress,
        userAgent: threat.userAgent,
        createdAt: threat.createdAt,
        user: threat.user
          ? {
              id: threat.user.id,
              username: threat.user.username,
              email: threat.user.email,
            }
          : null,
      })),
      total,
    };
  }

  async getStatistics() {
    const totalLogs = await this.auditLogRepository.count();

    const actionStats = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action')
      .getRawMany<{ action: LogAction; count: string }>();

    const resourceStats = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.resource', 'resource')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.resource')
      .getRawMany<{ resource: string; count: string }>();

    return {
      totalLogs,
      actionStats: actionStats.map((stat) => ({
        action: stat.action,
        count: parseInt(stat.count),
      })),
      resourceStats: resourceStats.map((stat) => ({
        resource: stat.resource,
        count: parseInt(stat.count),
      })),
    };
  }
}
