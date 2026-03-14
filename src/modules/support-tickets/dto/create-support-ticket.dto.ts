import { IsString, IsOptional, IsEnum, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupportTicketPriority } from '../../../database/entities/support-ticket.entity';

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(1, { message: 'Subject is required' })
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(1, { message: 'Description is required' })
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsUUID()
  organiserId?: string;
}
