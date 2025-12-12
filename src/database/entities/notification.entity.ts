import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  // Ticket Purchase Updates
  PAYMENT_SUCCESSFUL = 'PAYMENT_SUCCESSFUL',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  TICKET_DELIVERED = 'TICKET_DELIVERED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  
  // Event Updates
  EVENT_DATE_CHANGE = 'EVENT_DATE_CHANGE',
  EVENT_VENUE_CHANGE = 'EVENT_VENUE_CHANGE',
  EVENT_TIME_CHANGE = 'EVENT_TIME_CHANGE',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  
  // Organizer Messages
  ORGANIZER_MESSAGE = 'ORGANIZER_MESSAGE',
  ORGANIZER_ANNOUNCEMENT = 'ORGANIZER_ANNOUNCEMENT',
  
  // System Notifications
  LOGIN_ALERT = 'LOGIN_ALERT',
  ACCOUNT_CHANGED = 'ACCOUNT_CHANGED',
  SUBSCRIPTION_UPDATE = 'SUBSCRIPTION_UPDATE',
  
  // Promotional Notifications
  NEW_EVENTS_SUGGESTED = 'NEW_EVENTS_SUGGESTED',
  EARLY_BIRD_TICKETS = 'EARLY_BIRD_TICKETS',
  DISCOUNT_AVAILABLE = 'DISCOUNT_AVAILABLE',
  TRENDING_EVENTS = 'TRENDING_EVENTS',
  
  // Legacy types (keep for compatibility)
  EVENT_PENDING_APPROVAL = 'EVENT_PENDING_APPROVAL',
  EVENT_APPROVED = 'EVENT_APPROVED',
  EVENT_REJECTED = 'EVENT_REJECTED',
  EVENT_GOING_LIVE = 'EVENT_GOING_LIVE',
  EVENT_LIVE_STARTED = 'EVENT_LIVE_STARTED',
  EVENT_LIVE_ENDED = 'EVENT_LIVE_ENDED',
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_SOLD = 'TICKET_SOLD',
  TICKET_TRANSFERRED = 'TICKET_TRANSFERRED',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_REFUNDED = 'ORDER_REFUNDED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_REJECTED = 'REFUND_REJECTED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
@Index(['type'])
export class Notification {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    eventId?: string;
    ticketId?: string;
    orderId?: string;
    amount?: number;
    paymentMethod?: string;
    link?: string;
    [key: string]: any;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}

