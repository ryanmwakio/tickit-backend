import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { CommonModule } from '../../common/common.module';
import { Notification } from '../../database/entities/notification.entity';
import { NotificationPreference } from '../../database/entities/notification-preference.entity';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference]),
    CommonModule,
    WebSocketModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

