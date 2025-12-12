import { IsNotEmpty, IsString, IsEnum, IsOptional, IsEmail, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({
    description: 'Recipient email or phone number',
    example: 'user@example.com or +254712345678',
  })
  @IsNotEmpty()
  @IsString()
  to: string;

  @ApiProperty({
    description: 'Notification type',
    enum: ['email', 'sms'],
    example: 'email',
  })
  @IsNotEmpty()
  @IsEnum(['email', 'sms'])
  type: 'email' | 'sms';

  @ApiPropertyOptional({
    description: 'Subject (for email)',
    example: 'Your Ticket Confirmation',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Your ticket has been confirmed.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}

