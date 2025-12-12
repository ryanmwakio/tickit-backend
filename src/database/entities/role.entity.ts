import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('roles')
@Index(['name'], { unique: true })
export class Role {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ length: 50, unique: true })
  name: string; // ATTENDEE, ORGANISER, PROMOTER, STAFF, ADMIN

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  permissions?: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToMany(() => User, (user) => user.roles)
  users?: User[];
}

