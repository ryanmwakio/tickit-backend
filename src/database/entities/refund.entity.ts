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
import { Order } from './order.entity';
import { User } from './user.entity';

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export enum RefundPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('refunds')
@Index(['orderId'])
@Index(['processedById'])
export class Refund {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ length: 50 })
  refundNumber: string;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({
    type: 'enum',
    enum: RefundPriority,
    default: RefundPriority.NORMAL,
  })
  priority: RefundPriority;

  @Column({ type: 'bigint' })
  amountCents: number;

  @Column({ length: 10, default: 'KES' })
  currency: string;

  @Column({ length: 500, nullable: true })
  reason?: string;

  @Column({ type: 'char', length: 36, nullable: true })
  processedById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processedById' })
  processedBy?: User;

  @Column({ nullable: true })
  processedAt?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

