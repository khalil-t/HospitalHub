import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { LogAction } from '../entities/audit-log.entity';
import { User } from '../../users/entities/user.entity';

interface AuditRequest {
  url: string;
  method: string;
  ip?: string;
  headers: Record<string, string | undefined>;
  connection?: { remoteAddress?: string };
  user?: User;
}

const SKIP_ROUTES = ['/health', '/metrics', '/favicon.ico', '/'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditRequest>();

    if (
      SKIP_ROUTES.some((route) => request.url === route) ||
      request.url.startsWith('/health') ||
      request.url.startsWith('/metrics')
    ) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(request, 'SUCCESS', Date.now() - startTime);
        },
        error: (error: unknown) => {
          this.logRequest(
            request,
            'ERROR',
            Date.now() - startTime,
            this.toMessage(error),
          );
        },
      }),
    );
  }

  private logRequest(
    request: AuditRequest,
    status: string,
    duration: number,
    errorMessage?: string,
  ): void {
    const { method, url, user } = request;

    const action = this.getActionFromMethodAndUrl(method, url);
    const resource = this.getResourceFromUrl(url);

    const details = `${method} ${url} - ${status} (${duration}ms)${
      errorMessage ? ` - Error: ${errorMessage}` : ''
    }`;

    void this.auditService
      .createLog(
        action,
        resource,
        this.getResourceId(url),
        user ?? null,
        request.ip || request.connection?.remoteAddress || 'Unknown',
        request.headers['user-agent'] || 'Unknown',
        details,
      )
      .catch(() => undefined);
  }

  private toMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getActionFromMethodAndUrl(method: string, url: string): LogAction {
    if (url.includes('/patients') && method === 'POST')
      return LogAction.PATIENT_CREATED;
    if (url.includes('/patients') && method === 'GET')
      return LogAction.PATIENT_VIEWED;
    if (url.includes('/patients') && method === 'PUT')
      return LogAction.PATIENT_UPDATED;
    if (url.includes('/patients') && method === 'DELETE')
      return LogAction.PATIENT_DELETED;
    if (url.includes('/medical-records') && method === 'POST')
      return LogAction.RECORD_CREATED;
    if (url.includes('/medical-records') && method === 'GET')
      return LogAction.RECORD_VIEWED;
    if (url.includes('/users') && method === 'POST')
      return LogAction.USER_CREATED;
    if (url.includes('/dashboard')) return LogAction.DASHBOARD_ACCESSED;
    if (url.includes('/search')) return LogAction.SEARCH_PERFORMED;
    if (url.includes('/export')) return LogAction.DATA_EXPORTED;

    const methodMap: Record<string, LogAction> = {
      GET: LogAction.VIEW,
      POST: LogAction.CREATE,
      PUT: LogAction.UPDATE,
      PATCH: LogAction.UPDATE,
      DELETE: LogAction.DELETE,
    };

    return methodMap[method] ?? LogAction.VIEW;
  }

  private getResourceFromUrl(url: string): string {
    const segments = url.split('/').filter(Boolean);
    return segments[0] || 'unknown';
  }

  private getResourceId(url: string): string | undefined {
    const segments = url.split('/').filter(Boolean);
    const id = segments.find(
      (segment) =>
        /^\d+$/.test(segment) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          segment,
        ),
    );
    return id;
  }
}
