import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectRefundDto {
  @ApiPropertyOptional({
    description: 'Rejection reason',
    example: 'Refund request does not meet policy requirements',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

