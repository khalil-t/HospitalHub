import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { Exclude } from 'class-transformer';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => User, (user) => user.service)
  @Exclude()
  users: User[];

  @ManyToMany(() => Patient, (patient) => patient.services)
  patients: Patient[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
