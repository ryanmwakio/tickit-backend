import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Organiser } from './organiser.entity';

@Entity('workspace_settings')
@Unique(['userId', 'key'])
@Index(['userId'])
@Index(['organiserId'])
export class WorkspaceSettings {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'char', length: 36, nullable: true })
  organiserId?: string;

  @ManyToOne(() => Organiser, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'organiserId' })
  organiser?: Organiser;

  @Column({ length: 100 })
  key: string;

  @Column({ type: 'json', nullable: true })
  value: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

