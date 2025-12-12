import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendTicketsDto {
  @ApiProperty({
    description: 'Method to resend tickets',
    enum: ['email', 'sms'],
    example: 'email',
  })
  @IsNotEmpty()
  @IsEnum(['email', 'sms'])
  method: 'email' | 'sms';
}

