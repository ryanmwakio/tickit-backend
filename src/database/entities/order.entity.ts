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
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';
import { Refund } from './refund.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

@Entity('orders')
@Index(['buyerId'])
@Index(['organiserId'])
@Index(['status'])
@Index(['buyerId', 'status'])
@Index(['createdAt'])
export class Order {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36, nullable: true })
  buyerId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyerId' })
  buyer?: User;

  @Column({ type: 'char', length: 36 })
  organiserId: string;

  @ManyToOne(() => Organiser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organiserId' })
  organiser?: Organiser;

  @Column({ length: 50, unique: true })
  orderNumber: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'bigint' })
  totalAmountCents: number;

  @Column({ length: 10, default: 'KES' })
  currency: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => OrderItem, (item) => item.order)
  items?: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments?: Payment[];

  @OneToMany(() => Refund, (refund) => refund.order)
  refunds?: Refund[];
}

