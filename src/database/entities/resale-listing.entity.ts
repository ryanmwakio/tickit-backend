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
import { Ticket } from './ticket.entity';
import { User } from './user.entity';

export enum ResaleListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('resale_listings')
@Index(['ticketId'])
@Index(['sellerId'])
@Index(['status'])
@Index(['eventId'])
export class ResaleListing {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  ticketId: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket?: Ticket;

  @Column({ type: 'char', length: 36 })
  sellerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller?: User;

  @Column({ type: 'char', length: 36, nullable: true })
  eventId?: string;

  @Column({ type: 'bigint' })
  priceCents: number;

  @Column({ length: 10, default: 'KES' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ResaleListingStatus,
    default: ResaleListingStatus.ACTIVE,
  })
  status: ResaleListingStatus;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

