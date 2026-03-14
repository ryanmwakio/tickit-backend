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

@Entity('ticket_designs')
@Index(['organiserId'])
@Index(['eventId'])
export class TicketDesign {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  organiserId: string;

  @ManyToOne(() => Organiser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organiserId' })
  organiser?: Organiser;

  @Column({ type: 'char', length: 36, nullable: true })
  eventId?: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'eventId' })
  event?: Event;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Design configuration stored as JSON
  @Column({ type: 'json' })
  designConfig: {
    // Layout settings
    layout?: 'portrait' | 'landscape';
    width?: number; // in mm or pixels
    height?: number; // in mm or pixels
    
    // Background
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundGradient?: {
      type: 'linear' | 'radial';
      colors: string[];
      direction?: string;
    };
    
    // Header section
    header?: {
      enabled: boolean;
      height?: number;
      backgroundColor?: string;
      logo?: {
        url: string;
        position: 'left' | 'center' | 'right';
        size?: number;
      };
      text?: {
        content: string;
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        fontWeight?: 'normal' | 'bold';
        position: 'left' | 'center' | 'right';
      };
    };
    
    // Event info section
    eventInfo?: {
      enabled: boolean;
      title?: {
        enabled: boolean;
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        fontWeight?: 'normal' | 'bold';
      };
      date?: {
        enabled: boolean;
        format?: string;
        fontSize?: number;
        color?: string;
      };
      time?: {
        enabled: boolean;
        format?: string;
        fontSize?: number;
        color?: string;
      };
      venue?: {
        enabled: boolean;
        fontSize?: number;
        color?: string;
      };
    };
    
    // QR Code section
    qrCode?: {
      enabled: boolean;
      size?: number;
      position?: 'left' | 'center' | 'right' | 'bottom';
      margin?: number;
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    };
    
    // Ticket details section
    ticketDetails?: {
      enabled: boolean;
      ticketNumber?: {
        enabled: boolean;
        label?: string;
        fontSize?: number;
        color?: string;
      };
      ticketType?: {
        enabled: boolean;
        label?: string;
        fontSize?: number;
        color?: string;
      };
      price?: {
        enabled: boolean;
        label?: string;
        fontSize?: number;
        color?: string;
        format?: string;
      };
      seatInfo?: {
        enabled: boolean;
        section?: {
          enabled: boolean;
          label?: string;
        };
        row?: {
          enabled: boolean;
          label?: string;
        };
        seat?: {
          enabled: boolean;
          label?: string;
        };
        fontSize?: number;
        color?: string;
      };
    };
    
    // Footer section
    footer?: {
      enabled: boolean;
      height?: number;
      backgroundColor?: string;
      text?: string;
      fontSize?: number;
      color?: string;
      links?: Array<{
        text: string;
        url: string;
      }>;
    };
    
    // Border
    border?: {
      enabled: boolean;
      width?: number;
      color?: string;
      style?: 'solid' | 'dashed' | 'dotted';
      radius?: number;
    };
    
    // Watermark
    watermark?: {
      enabled: boolean;
      text?: string;
      image?: string;
      opacity?: number;
      position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

