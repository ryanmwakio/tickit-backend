import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notification_preferences')
@Index(['userId'], { unique: true })
export class NotificationPreference {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  // Channel preferences
  @Column({ type: 'boolean', default: true, name: 'email_enabled' })
  email: boolean;

  @Column({ type: 'boolean', default: true, name: 'sms_enabled' })
  sms: boolean;

  @Column({ type: 'boolean', default: true, name: 'in_app_enabled' })
  inApp: boolean;

  @Column({ type: 'boolean', default: true, name: 'push_enabled' })
  push: boolean;

  // Category preferences
  @Column({ type: 'boolean', default: true, name: 'payment_updates' })
  paymentUpdates: boolean;

  @Column({ type: 'boolean', default: true, name: 'event_changes' })
  eventChanges: boolean;

  @Column({ type: 'boolean', default: true, name: 'organizer_messages' })
  organizerMessages: boolean;

  @Column({ type: 'boolean', default: true, name: 'system_notifications' })
  systemNotifications: boolean;

  @Column({ type: 'boolean', default: true, name: 'promo_allowed' })
  promoAllowed: boolean;

  @Column({ type: 'boolean', default: true, name: 'ticket_reminders' })
  ticketReminders: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}

