import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SeatMap } from './seat-map.entity';
import { Ticket } from './ticket.entity';

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  BLOCKED = 'BLOCKED',
  DISABLED = 'DISABLED',
}

@Entity('seats')
@Index(['seatMapId'])
@Index(['seatMapId', 'section', 'row', 'number'])
@Index(['status'])
@Index(['ticketId'])
export class Seat {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  seatMapId: string;

  @ManyToOne(() => SeatMap, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seatMapId' })
  seatMap?: SeatMap;

  @Column({ length: 100 })
  section: string;

  @Column({ length: 50, nullable: true })
  row?: string;

  @Column({ length: 50 })
  number: string;

  // Seat position in the map
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  positionX: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  positionY: number;

  // Seat pricing (can override ticket type price)
  @Column({ type: 'bigint', nullable: true })
  priceCents?: number;

  @Column({ length: 10, default: 'KES' })
  currency: string;

  // Seat type/category
  @Column({
    type: 'enum',
    enum: ['standard', 'vip', 'accessible', 'premium', 'restricted'],
    default: 'standard',
  })
  type: 'standard' | 'vip' | 'accessible' | 'premium' | 'restricted';

  // Seat status
  @Column({
    type: 'enum',
    enum: SeatStatus,
    default: SeatStatus.AVAILABLE,
  })
  status: SeatStatus;

  // Link to ticket if sold
  @Column({ type: 'char', length: 36, nullable: true })
  ticketId?: string;

  @OneToOne(() => Ticket, { nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket?: Ticket;

  // Reservation info
  @Column({ type: 'char', length: 36, nullable: true })
  reservedBy?: string; // User ID or session ID

  @Column({ nullable: true })
  reservedUntil?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

