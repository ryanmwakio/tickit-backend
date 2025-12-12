import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getMe(@CurrentUser() user: User) {
    return this.usersService.toResponseDto(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(
    @Body() updateDto: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      preferredLanguage?: string;
      notificationPreferences?: Record<string, any>;
    },
    @CurrentUser() user: User,
  ) {
    const updated = await this.usersService.update(user.id, updateDto);
    return this.usersService.toResponseDto(updated);
  }

  @Patch('me/role')
  @ApiOperation({ summary: 'Update user active role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateRole(
    @Body('role') role: UserRole,
    @CurrentUser() user: User,
  ) {
    const updated = await this.usersService.update(user.id, { activeRole: role });
    return this.usersService.toResponseDto(updated);
  }
}

