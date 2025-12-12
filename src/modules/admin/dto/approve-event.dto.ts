import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveEventDto {
  @ApiPropertyOptional({
    description: 'Reason for rejection (required if rejecting)',
    example: 'Event content does not meet platform guidelines',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

