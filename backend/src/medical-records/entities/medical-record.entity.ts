import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  JoinTable,
  ManyToOne,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';
import { Prescriptions } from './prescriptions.entity';

@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patient, (patient) => patient.medicalRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'medical_record_doctors',
    joinColumn: { name: 'medical_record_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'doctor_id', referencedColumnName: 'id' },
  })
  responsibleDoctors?: User[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId?: string;

  @Column({ nullable: true })
  title?: string;

  @Column('text', { nullable: true })
  content?: string;

  @Column('text', { nullable: true })
  diagnosis?: string;

  @Column('simple-array', { nullable: true })
  allergies?: string[];

  @Column({ name: 'record_date', default: () => 'CURRENT_TIMESTAMP' })
  recordDate?: Date;

  @OneToMany(() => Prescriptions, (rx) => rx.medicalRecord)
  prescriptions?: Prescriptions[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
