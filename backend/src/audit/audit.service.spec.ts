import { Repository } from 'typeorm';
import { EncryptionService } from '../../common/encryption.service';
import { User } from '../../users/entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditService } from './audit.service';

const REDACTED = '[REDACTED]';

interface LogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  statusCode: number | null;
  status: string;
  oldValues: unknown;
  newValues: unknown;
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string;
  } | null;
}

function logEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: '00000000-0000-4000-8000-000000000401',
    action: 'VIEW',
    resource: 'patient',
    resourceId: null,
    details: 'Sensitive PHI detail',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    statusCode: 200,
    status: 'SUCCESS',
    oldValues: 'encrypted-old',
    newValues: 'encrypted-new',
    user: {
      id: '00000000-0000-4000-8000-000000000201',
      username: 'fake.user',
      fullName: 'Fake User',
      email: 'fake.user@example.test',
    },
    ...overrides,
  };
}

function createService(logs: LogEntry[]): AuditService {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(logs.length),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(logs),
    where: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([logs, logs.length]),
  };

  const auditLogRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  } as unknown as Repository<AuditLog>;

  const userRepository = {} as Repository<User>;

  const encryptionService = {
    decrypt: jest.fn((value: string) => {
      if (value === 'encrypted-old') {
        return '{"phoneNumber":"000"}';
      }
      if (value === 'encrypted-new') {
        return '{"phoneNumber":"111"}';
      }
      return value;
    }),
    encrypt: jest.fn((value: string) => value),
  } as unknown as EncryptionService;

  return new AuditService(
    auditLogRepository,
    userRepository,
    encryptionService,
  );
}

describe('AuditService PHI redaction', () => {
  it('redacts details and values for the verification clerk', async () => {
    const service = createService([logEntry()]);

    const result = await service.getLogs(1, 50, {}, 'verification_clerk');

    expect(result.data[0].details).toBe(REDACTED);
    expect(result.data[0].oldValues).toBe(REDACTED);
    expect(result.data[0].newValues).toBe(REDACTED);
    expect(result.data[0].resource).toBe('patient');
    expect(result.data[0].user).toEqual(logEntry().user);
  });

  it('does not mark absent fields as redacted for the verification clerk', async () => {
    const service = createService([
      logEntry({ details: null, oldValues: null, newValues: null }),
    ]);

    const result = await service.getLogs(1, 50, {}, 'verification_clerk');

    expect(result.data[0].details).toBeUndefined();
    expect(result.data[0].oldValues).toBeUndefined();
    expect(result.data[0].newValues).toBeUndefined();
  });

  it('decrypts audit values for a super admin', async () => {
    const service = createService([logEntry()]);

    const result = await service.getLogs(1, 50, {}, 'super_admin');

    expect(result.data[0].details).toBe('Sensitive PHI detail');
    expect(result.data[0].oldValues).toEqual({ phoneNumber: '000' });
    expect(result.data[0].newValues).toEqual({ phoneNumber: '111' });
  });

  it('leaves logs untouched for other roles', async () => {
    const service = createService([logEntry()]);

    const result = await service.getLogs(1, 50, {}, 'internal_doctor');

    expect(result.data[0].details).toBe('Sensitive PHI detail');
    expect(result.data[0].oldValues).toBe('encrypted-old');
    expect(result.data[0].newValues).toBe('encrypted-new');
  });

  it('applies the same redaction to threat entries', async () => {
    const service = createService([logEntry({ action: 'FAILED_LOGIN' })]);

    const result = await service.getThreats(1, 50, 'verification_clerk');

    expect(result.data[0].details).toBe(REDACTED);
  });

  it('keeps pagination totals', async () => {
    const service = createService([logEntry(), logEntry()]);

    const result = await service.getLogs(2, 1, {}, 'verification_clerk');

    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
  });
});
