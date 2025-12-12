import { IsOptional, IsString, IsObject } from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestEmail?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    pageUrl?: string;
    [key: string]: any;
  };
}

