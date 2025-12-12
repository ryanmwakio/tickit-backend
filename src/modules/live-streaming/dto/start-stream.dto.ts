import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartStreamDto {
  @ApiPropertyOptional({
    description: 'Stream URL (optional, will be generated if not provided)',
    example: 'rtmp://stream.tixhub.com/live/stream-key-123',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  streamUrl?: string;
}

