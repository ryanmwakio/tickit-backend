import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('venues')
export class Venue {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ length: 500 })
  address: string;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 100, default: 'Kenya' })
  country: string;

  @Column({ length: 20, nullable: true })
  postalCode?: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  capacity?: number;

  @Column({ type: 'json', nullable: true })
  amenities?: Record<string, any>;

  @Column({ name: 'image_urls', type: 'json', nullable: true })
  imageUrls?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Event, (event) => event.venue)
  events?: Event[];
}

