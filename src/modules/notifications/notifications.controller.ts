import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for logged-in user' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async getAll(
    @CurrentUser() user: User,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.getUserNotifications(user.id, query);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @HttpCode(HttpStatus.OK)
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    await this.notificationsService.deleteNotification(user.id, id);
    return { success: true };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  async getPreferences(@CurrentUser() user: User) {
    return this.notificationsService.getUserPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }
}
