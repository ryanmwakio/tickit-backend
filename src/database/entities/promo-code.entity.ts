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
import { Organiser } from './organiser.entity';

export enum PromoCodeType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

@Entity('promo_codes')
@Index(['organiserId'])
@Index(['code'])
export class PromoCode {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  organiserId: string;

  @ManyToOne(() => Organiser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organiserId' })
  organiser?: Organiser;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PromoCodeType,
  })
  type: PromoCodeType;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  value: number;

  @Column({ nullable: true })
  validFrom?: Date;

  @Column({ nullable: true })
  validUntil?: Date;

  @Column({ nullable: true })
  maxUses?: number;

  @Column({ default: 0 })
  usesCount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

