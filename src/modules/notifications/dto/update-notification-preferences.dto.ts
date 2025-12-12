import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  eventChanges?: boolean;

  @IsOptional()
  @IsBoolean()
  organizerMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  systemNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  promoAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  ticketReminders?: boolean;
}

