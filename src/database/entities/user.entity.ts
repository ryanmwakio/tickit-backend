import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { Order } from './order.entity';
import { Organiser } from './organiser.entity';
import { Staff } from './staff.entity';
import { SupportTicket } from './support-ticket.entity';
import { Role } from './role.entity';

export enum UserRole {
  ATTENDEE = 'ATTENDEE',
  ORGANISER = 'ORGANISER',
  PROMOTER = 'PROMOTER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum TwoFactorType {
  SMS = 'SMS',
  TOTP = 'TOTP',
}

@Entity('users')
@Index(['email'])
@Index(['phoneNumber'])
@Index(['status', 'activeRole'])
export class User {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ length: 191, nullable: true, unique: true })
  email?: string;

  @Column({ length: 32, nullable: true, unique: true })
  phoneNumber?: string;

  @Column({ name: 'password_hash', length: 255, nullable: true })
  passwordHash?: string;

  @Column({ length: 60, nullable: true })
  firstName?: string;

  @Column({ length: 60, nullable: true })
  lastName?: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ type: 'text', nullable: true })
  roles: string; // Comma-separated roles (deprecated - use roles relation)

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  rolesList?: Role[];

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ATTENDEE,
  })
  activeRole: UserRole;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ type: 'enum', enum: TwoFactorType, nullable: true })
  twoFactorType?: TwoFactorType;

  @Column({ length: 255, nullable: true })
  twoFactorSecret?: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ length: 10, nullable: true })
  preferredLanguage?: string;

  @Column({ type: 'json', nullable: true })
  notificationPreferences?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens?: RefreshToken[];

  @OneToMany(() => Order, (order) => order.buyer)
  orders?: Order[];

  @OneToMany(() => Organiser, (organiser) => organiser.owner)
  organisers?: Organiser[];

  @OneToMany(() => Staff, (staff) => staff.user)
  staffPositions?: Staff[];

  @OneToMany(() => SupportTicket, (ticket) => ticket.user)
  supportTickets?: SupportTicket[];
}

