import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from './user.entity';

@Entity('checkins')
@Index(['ticketId'])
@Index(['createdAt'])
export class Checkin {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  ticketId: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket?: Ticket;

  @Column({ type: 'char', length: 36, nullable: true })
  staffId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'staffId' })
  staff?: User;

  @Column({ length: 100, nullable: true })
  deviceId?: string;

  @Column({ length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}

