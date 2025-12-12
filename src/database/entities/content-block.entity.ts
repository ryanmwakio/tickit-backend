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

export enum ContentType {
  TEXT = 'TEXT',
  HTML = 'HTML',
  MARKDOWN = 'MARKDOWN',
  JSON = 'JSON',
}

@Entity('content_blocks')
@Index(['lastModifiedById'])
@Index(['key'])
@Index(['section'])
export class ContentBlock {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ length: 100 })
  key: string;

  @Column({ length: 50 })
  section: string;

  @Column({ length: 100 })
  category: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: ContentType,
    default: ContentType.TEXT,
  })
  type: ContentType;

  @Column({ length: 50, nullable: true })
  locale?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'char', length: 36, nullable: true })
  lastModifiedById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lastModifiedById' })
  lastModifiedBy?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

