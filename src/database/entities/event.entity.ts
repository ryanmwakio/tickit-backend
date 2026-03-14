import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Organiser } from './organiser.entity';
import { Venue } from './venue.entity';
import { TicketType } from './ticket-type.entity';
import { TicketDesign } from './ticket-design.entity';
import { SeatMap } from './seat-map.entity';

export enum EventVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  UNLISTED = 'UNLISTED',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('events')
@Index(['organiserId'])
@Index(['status'])
@Index(['category'])
@Index(['status', 'startsAt'])
@Index(['visibility', 'status'])
export class Event {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  organiserId: string;

  @ManyToOne(() => Organiser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organiserId' })
  organiser?: Organiser;

  @Column({ type: 'char', length: 36, nullable: true })
  venueId?: string;

  @ManyToOne(() => Venue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'venueId' })
  venue?: Venue;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 250, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 100, nullable: true })
  category?: string;

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({
    type: 'enum',
    enum: EventVisibility,
    default: EventVisibility.PUBLIC,
  })
  visibility: EventVisibility;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column()
  startsAt: Date;

  @Column()
  endsAt: Date;

  @Column({ length: 50, nullable: true })
  timezone?: string;

  @Column({ nullable: true })
  capacity?: number;

  @Column({ length: 500, nullable: true })
  coverImageUrl?: string;

  @Column({ name: 'image_gallery_urls', type: 'json', nullable: true })
  imageGalleryUrls?: string[];

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  salesStartsAt?: Date;

  @Column({ nullable: true })
  salesEndsAt?: Date;

  // Live streaming fields
  @Column({ type: 'text', nullable: true })
  streamUrl?: string;

  @Column({ type: 'text', nullable: true })
  streamKey?: string;

  @Column({
    type: 'enum',
    enum: ['idle', 'starting', 'live', 'ended'],
    default: 'idle',
    nullable: true,
  })
  streamStatus?: 'idle' | 'starting' | 'live' | 'ended';

  @Column({ nullable: true })
  streamStartedAt?: Date;

  @Column({ nullable: true })
  streamEndedAt?: Date;

  @Column({ type: 'int', default: 0 })
  viewerCount: number;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'boolean', default: false })
  livePulse: boolean;

  @Column({ type: 'boolean', default: false })
  hotRightNow: boolean;

  // Ticket design and seat map
  @Column({ type: 'char', length: 36, nullable: true })
  ticketDesignId?: string;

  @ManyToOne(() => TicketDesign, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ticketDesignId' })
  ticketDesign?: TicketDesign;

  @Column({ type: 'char', length: 36, nullable: true })
  seatMapId?: string;

  @ManyToOne(() => SeatMap, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'seatMapId' })
  seatMap?: SeatMap;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => TicketType, (ticketType) => ticketType.event)
  ticketTypes?: TicketType[];
}

