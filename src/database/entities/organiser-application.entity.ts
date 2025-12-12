import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum OrganiserApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('organiser_applications')
@Index(['status'])
@Index(['createdAt'])
export class OrganiserApplication {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36, nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200 })
  organisation: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 50, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'text' })
  eventDetails: string;

  @Column({
    type: 'enum',
    enum: OrganiserApplicationStatus,
    default: OrganiserApplicationStatus.PENDING,
  })
  status: OrganiserApplicationStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes?: string;

  @Column({ type: 'char', length: 36, nullable: true })
  reviewedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: User;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}



