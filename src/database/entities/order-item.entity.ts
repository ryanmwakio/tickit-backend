import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { TicketType } from './ticket-type.entity';
import { Ticket } from './ticket.entity';

@Entity('order_items')
@Index(['orderId'])
@Index(['ticketTypeId'])
export class OrderItem {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ type: 'char', length: 36 })
  ticketTypeId: string;

  @ManyToOne(() => TicketType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType?: TicketType;

  @Column({ length: 150 })
  ticketTypeName: string;

  @Column()
  quantity: number;

  @Column({ type: 'bigint' })
  unitPriceCents: number;

  @Column({ type: 'bigint' })
  totalPriceCents: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @OneToMany(() => Ticket, (ticket) => ticket.orderItem)
  tickets?: Ticket[];
}

