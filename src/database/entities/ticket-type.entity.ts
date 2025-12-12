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
import { Event } from './event.entity';
import { OrderItem } from './order-item.entity';

@Entity('ticket_types')
@Index(['eventId'])
@Index(['eventId', 'salesStartsAt', 'salesEndsAt'])
export class TicketType {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event?: Event;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'bigint' })
  priceCents: number;

  @Column({ length: 10, default: 'KES' })
  currency: string;

  @Column()
  quantityTotal: number;

  @Column({ default: 0 })
  quantitySold: number;

  @Column({ nullable: true })
  minPerOrder?: number;

  @Column({ nullable: true })
  maxPerOrder?: number;

  @Column({ default: true })
  isRefundable: boolean;

  @Column({ nullable: true })
  salesStartsAt?: Date;

  @Column({ nullable: true })
  salesEndsAt?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => OrderItem, (orderItem) => orderItem.ticketType)
  orderItems?: OrderItem[];
}

