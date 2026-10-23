import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Service } from '../../services/entities/department.entity';
import { User } from '../../users/entities/user.entity';
import { MedicalRecord } from '../../medical-records/entities/medical-record.entity';
import { Exclude } from 'class-transformer';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  @Index()
  lastName: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber?: string;

  @Column({ type: 'date', nullable: true })
  dob: Date | null;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true, default: '' })
  nationalNumber: string;

  @Column({ nullable: true, unique: true })
  insuranceNumber?: string;

  @ManyToMany(() => Service, (service) => service.patients)
  @JoinTable({
    name: 'patient_services',
    joinColumn: { name: 'patient_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'service_id', referencedColumnName: 'id' },
  })
  services?: Service[];

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @OneToMany(() => MedicalRecord, (medicalRecord) => medicalRecord.patient)
  @Exclude()
  medicalRecords?: MedicalRecord[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
