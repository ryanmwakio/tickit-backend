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
import { Event } from './event.entity';
import { Organiser } from './organiser.entity';
import { User } from './user.entity';

export enum FeaturedRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('featured_requests')
@Index(['eventId'])
@Index(['organiserId'])
@Index(['status'])
export class FeaturedRequest {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event?: Event;

  @Column({ type: 'char', length: 36 })
  organiserId: string;

  @ManyToOne(() => Organiser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organiserId' })
  organiser?: Organiser;

  @Column({ type: 'char', length: 36 })
  requestedBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestedBy' })
  requester?: User;

  @Column({
    type: 'enum',
    enum: FeaturedRequestStatus,
    default: FeaturedRequestStatus.PENDING,
  })
  status: FeaturedRequestStatus;

  @Column({ type: 'int' })
  days: number; // Number of days to feature

  @Column({ type: 'bigint' })
  costCents: number; // Total cost in cents

  @Column({ type: 'bigint', nullable: true })
  costPerDayCents?: number; // Cost per day used for calculation

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'char', length: 36, nullable: true })
  reviewedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: User;

  @Column({ type: 'text', nullable: true })
  reviewNotes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

