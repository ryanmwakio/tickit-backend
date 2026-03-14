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
import { Organiser } from './organiser.entity';
import { Seat } from './seat.entity';

@Entity('seat_maps')
@Index(['organiserId'])
@Index(['eventId'])
export class SeatMap {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  organiserId: string;

  @ManyToOne(() => Organiser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organiserId' })
  organiser?: Organiser;

  @Column({ type: 'char', length: 36 })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event?: Event;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Seat map configuration
  @Column({ type: 'json' })
  mapConfig: {
    // Map dimensions
    width?: number; // in pixels or units
    height?: number; // in pixels or units
    scale?: number; // scale factor
    
    // Background
    backgroundColor?: string;
    backgroundImage?: string;
    
    // Stage/Area configuration
    stage?: {
      enabled: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
      width?: number;
      height?: number;
      label?: string;
      color?: string;
    };
    
    // Sections configuration
    sections?: Array<{
      id: string;
      name: string;
      color?: string;
      labelColor?: string;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      rows?: Array<{
        id: string;
        name: string;
        seats?: Array<{
          id: string;
          number: string;
          type?: 'standard' | 'vip' | 'accessible' | 'premium';
        }>;
      }>;
    }>;
    
    // Legend
    legend?: {
      enabled: boolean;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      items?: Array<{
        label: string;
        color: string;
      }>;
    };
    
    // Labels
    labels?: {
      enabled: boolean;
      showSectionNames?: boolean;
      showRowNames?: boolean;
      showSeatNumbers?: boolean;
      fontSize?: number;
      fontColor?: string;
    };
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Seat, (seat) => seat.seatMap)
  seats?: Seat[];
}

