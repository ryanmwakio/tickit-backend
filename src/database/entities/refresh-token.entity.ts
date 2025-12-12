import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['userId'])
@Index(['token'])
@Index(['token', 'revokedAt', 'expiresAt'])
export class RefreshToken {
  @PrimaryColumn({ name: 'TokenId', type: 'char', length: 36 })
  tokenId: string;

  @Column({ name: 'UserId', type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'UserId' })
  user?: User;

  @Column({ length: 255 })
  token: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  revokedAt?: Date;

  @Column({ length: 45, nullable: true })
  ipAddress?: string;

  @Column({ length: 500, nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;
}

