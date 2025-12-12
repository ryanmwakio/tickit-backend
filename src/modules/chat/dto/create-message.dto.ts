import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    guestName?: string;
    guestEmail?: string;
    pageUrl?: string;
    [key: string]: any;
  };
}

