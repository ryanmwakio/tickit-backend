import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ChatMessage } from './chat-message.entity';

export enum ChatSessionStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
  CLOSED = 'CLOSED',
}

@Entity('chat_sessions')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
export class ChatSession {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36, nullable: true, name: 'user_id' })
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ length: 100, nullable: true, name: 'guest_id' })
  guestId?: string; // For anonymous users

  @Column({ length: 100, nullable: true, name: 'guest_name' })
  guestName?: string;

  @Column({ length: 255, nullable: true, name: 'guest_email' })
  guestEmail?: string;

  @Column({
    type: 'enum',
    enum: ChatSessionStatus,
    default: ChatSessionStatus.ACTIVE,
  })
  status: ChatSessionStatus;

  @Column({ type: 'char', length: 36, nullable: true, name: 'assigned_to_id' })
  assignedToId?: string; // Support agent ID if escalated

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    pageUrl?: string;
    [key: string]: any;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => ChatMessage, (message) => message.session)
  messages?: ChatMessage[];
}

