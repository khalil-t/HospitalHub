import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { MedicalRecord } from './medical-record.entity';
import { Exclude } from 'class-transformer';

@Entity('prescriptions')
export class Prescriptions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => MedicalRecord,
    (medicalRecord) => medicalRecord.prescriptions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'medical_record_id' })
  @Exclude()
  medicalRecord: MedicalRecord;

  @Column()
  medication: string;

  @Column()
  dose: string;

  @Column()
  frequency: string;

  @Column()
  duration: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
