import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('external_doctor_requests')
export class ExternalDoctorRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  specialization?: string;

  @Column({ nullable: true })
  licenseNumber?: string;

  @Column({ nullable: true })
  institution?: string;

  @Column({ nullable: true, type: 'text' })
  reasonForAccess?: string;

  @Column({ nullable: true, type: 'text' })
  requestedPatientNames?: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ nullable: true })
  rejectionReason?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy?: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_user_id' })
  createdUser?: User;

  @Column({ nullable: true })
  accountExpiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'external_doctor_patients',
    joinColumn: { name: 'doctor_request_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'patient_id', referencedColumnName: 'id' },
  })
  patients?: User[];
}
