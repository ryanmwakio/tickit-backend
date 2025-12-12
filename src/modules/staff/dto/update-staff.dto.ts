import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../database/entities/user.entity';
import { StaffStatus } from '../../../database/entities/staff.entity';

export class UpdateStaffDto {
  @ApiPropertyOptional({
    description: 'Staff role',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Staff status',
    enum: StaffStatus,
  })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;
}

