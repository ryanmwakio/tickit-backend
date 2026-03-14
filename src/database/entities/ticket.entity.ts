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
import { OrderItem } from './order-item.entity';
import { TicketType } from './ticket-type.entity';
import { Event } from './event.entity';
import { User } from './user.entity';
import { Checkin } from './checkin.entity';

export enum TicketStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  VOIDED = 'VOIDED',
  CHECKED_IN = 'CHECKED_IN',
  TRANSFERRED = 'TRANSFERRED',
}

@Entity('tickets')
@Index(['qrCode'])
@Index(['ownerId'])
@Index(['status'])
@Index(['ownerId', 'status'])
@Index(['eventId'])
@Index(['eventId', 'ownerId'])
export class Ticket {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  orderItemId: string;

  @ManyToOne(() => OrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderItemId' })
  orderItem?: OrderItem;

  @Column({ type: 'char', length: 36 })
  ticketTypeId: string;

  @ManyToOne(() => TicketType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType?: TicketType;

  @Column({ type: 'char', length: 36 })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event?: Event;

  @Column({ length: 100, unique: true })
  ticketNumber: string;

  @Column({ type: 'text' })
  qrCode: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.PENDING,
  })
  status: TicketStatus;

  @Column({ type: 'char', length: 36, nullable: true })
  ownerId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @Column({ nullable: true })
  voidedAt?: Date;

  @Column({ length: 500, nullable: true })
  voidReason?: string;

  @Column({ nullable: true })
  transferredAt?: Date;

  // Seat information (if event has seat map)
  @Column({ type: 'char', length: 36, nullable: true })
  seatId?: string;

  @Column({ length: 100, nullable: true })
  seatSection?: string;

  @Column({ length: 50, nullable: true })
  seatRow?: string;

  @Column({ length: 50, nullable: true })
  seatNumber?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Checkin, (checkin) => checkin.ticket)
  checkins?: Checkin[];
}

