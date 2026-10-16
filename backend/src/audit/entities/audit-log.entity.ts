import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum LogAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',

  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',

  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',

  PATIENT_CREATED = 'PATIENT_CREATED',
  PATIENT_VIEWED = 'PATIENT_VIEWED',
  PATIENT_UPDATED = 'PATIENT_UPDATED',
  PATIENT_DELETED = 'PATIENT_DELETED',
  PATIENT_SEARCHED = 'PATIENT_SEARCHED',

  RECORD_CREATED = 'RECORD_CREATED',
  RECORD_VIEWED = 'RECORD_VIEWED',
  RECORD_UPDATED = 'RECORD_UPDATED',
  RECORD_DELETED = 'RECORD_DELETED',
  RECORD_SHARED = 'RECORD_SHARED',
  RECORD_EXPORTED = 'RECORD_EXPORTED',

  DASHBOARD_ACCESSED = 'DASHBOARD_ACCESSED',
  PAGE_VISITED = 'PAGE_VISITED',
  SEARCH_PERFORMED = 'SEARCH_PERFORMED',
  FILTER_APPLIED = 'FILTER_APPLIED',
  REPORT_GENERATED = 'REPORT_GENERATED',
  DATA_EXPORTED = 'DATA_EXPORTED',

  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DOWNLOADED = 'FILE_DOWNLOADED',
  FILE_DELETED = 'FILE_DELETED',

  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',

  EXTERNAL_REQUEST_CREATED = 'EXTERNAL_REQUEST_CREATED',
  EXTERNAL_REQUEST_APPROVED = 'EXTERNAL_REQUEST_APPROVED',
  EXTERNAL_REQUEST_REJECTED = 'EXTERNAL_REQUEST_REJECTED',
  EXTERNAL_DOCTOR_REQUEST = 'EXTERNAL_DOCTOR_REQUEST',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LogAction,
  })
  action: LogAction;

  @Column()
  resource: string;

  @Column({ nullable: true })
  resourceId?: string;

  @Column({ nullable: true, type: 'text' })
  details?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true, type: 'jsonb' })
  oldValues?: any;

  @Column({ nullable: true, type: 'jsonb' })
  newValues?: any;

  @ManyToOne(() => User, { nullable: true, eager: true })
  user?: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  statusCode?: number;

  @Column({ default: 'SUCCESS' })
  status: string;
}
