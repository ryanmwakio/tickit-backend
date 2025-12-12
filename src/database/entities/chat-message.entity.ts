import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { User } from './user.entity';

export enum MessageSenderType {
  USER = 'USER',
  BOT = 'BOT',
  AGENT = 'AGENT',
}

@Entity('chat_messages')
@Index(['sessionId'])
@Index(['sessionId', 'createdAt'])
@Index(['senderType'])
export class ChatMessage {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ type: 'char', length: 36, name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => ChatSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id', referencedColumnName: 'id' })
  session?: ChatSession;

  @Column({
    type: 'enum',
    enum: MessageSenderType,
    name: 'sender_type',
  })
  senderType: MessageSenderType;

  @Column({ type: 'char', length: 36, nullable: true, name: 'user_id' })
  userId?: string; // For USER or AGENT messages

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    quickReplies?: string[];
    attachments?: Array<{
      type: string;
      url: string;
      name?: string;
    }>;
    intent?: string;
    confidence?: number;
    [key: string]: any;
  };

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

