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
import { Event } from './event.entity';
import { Staff } from './staff.entity';
import { PromoCode } from './promo-code.entity';
import { SupportTicket } from './support-ticket.entity';

@Entity('organisers')
@Index(['ownerId'])
export class Organiser {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ length: 255, nullable: true })
  logoUrl?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Event, (event) => event.organiser)
  events?: Event[];

  @OneToMany(() => Staff, (staff) => staff.organiser)
  staff?: Staff[];

  @OneToMany(() => PromoCode, (promo) => promo.organiser)
  promoCodes?: PromoCode[];

  @OneToMany(() => SupportTicket, (ticket) => ticket.organiser)
  supportTickets?: SupportTicket[];
}

