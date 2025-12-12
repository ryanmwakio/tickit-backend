import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../database/entities/user.entity';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ type: [String] })
  roles: string[];

  @ApiProperty({ enum: UserRole })
  activeRole: UserRole;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty()
  isPhoneVerified: boolean;

  @ApiProperty()
  twoFactorEnabled: boolean;

  @ApiPropertyOptional()
  preferredLanguage?: string;

  @ApiPropertyOptional()
  notificationPreferences?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

