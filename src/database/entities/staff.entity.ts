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
import { User } from './user.entity';
import { Organiser } from './organiser.entity';

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('staff')
@Index(['userId'])
@Index(['organiserId'])
export class Staff {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'char', length: 36 })
  organiserId: string;

  @ManyToOne(() => Organiser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organiserId' })
  organiser?: Organiser;

  @Column({ length: 100, nullable: true })
  department?: string;

  @Column({ length: 100, nullable: true })
  title?: string;

  @Column({
    type: 'enum',
    enum: StaffStatus,
    default: StaffStatus.ACTIVE,
  })
  status: StaffStatus;

  @Column({ type: 'json', nullable: true })
  permissions?: string[];

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

