import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { NotificationType } from '../../../database/entities/notification.entity';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsObject()
  metadata?: {
    eventId?: string;
    ticketId?: string;
    orderId?: string;
    amount?: number;
    paymentMethod?: string;
    link?: string;
    [key: string]: any;
  };
}

