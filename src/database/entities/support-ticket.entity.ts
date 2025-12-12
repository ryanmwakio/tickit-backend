import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organiser } from './organiser.entity';
import { SupportTicketMessage } from './support-ticket-message.entity';

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  PENDING_CUSTOMER = 'PENDING_CUSTOMER',
}

export enum SupportTicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('support_tickets')
@Index(['userId'])
@Index(['organiserId'])
@Index(['assignedToId'])
export class SupportTicket {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'char', length: 36, nullable: true })
  organiserId?: string;

  @ManyToOne(() => Organiser, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organiserId' })
  organiser?: Organiser;

  @Column({ length: 200 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: SupportTicketStatus,
    default: SupportTicketStatus.OPEN,
  })
  status: SupportTicketStatus;

  @Column({
    type: 'enum',
    enum: SupportTicketPriority,
    default: SupportTicketPriority.MEDIUM,
  })
  priority: SupportTicketPriority;

  @Column({ length: 50, nullable: true })
  category?: string;

  @Column({ type: 'char', length: 36, nullable: true })
  assignedToId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo?: User;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => SupportTicketMessage, (message) => message.ticket)
  messages?: SupportTicketMessage[];
}

