import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SupportTicket } from './support-ticket.entity';
import { User } from './user.entity';

@Entity('support_ticket_messages')
@Index(['ticketId'])
@Index(['userId'])
@Index(['createdAt'])
export class SupportTicketMessage {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  ticketId: string;

  @ManyToOne(() => SupportTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket?: SupportTicket;

  @Column({ type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  isInternal: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

