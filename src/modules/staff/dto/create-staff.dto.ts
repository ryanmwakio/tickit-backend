import { IsNotEmpty, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../database/entities/user.entity';
import { StaffStatus } from '../../../database/entities/staff.entity';

export class CreateStaffDto {
  @ApiProperty({
    description: 'User ID to add as staff',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Organiser ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  organiserId: string;

  @ApiProperty({
    description: 'Staff role',
    enum: UserRole,
    example: UserRole.STAFF,
  })
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Staff status',
    enum: StaffStatus,
    default: StaffStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;
}

