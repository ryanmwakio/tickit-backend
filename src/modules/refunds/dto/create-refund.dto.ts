import { IsNotEmpty, IsUUID, IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundPriority } from '../../../database/entities/refund.entity';

export class CreateRefundDto {
  @ApiProperty({
    description: 'Order ID to refund',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Refund reason',
    example: 'Event cancelled',
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Refund priority',
    enum: RefundPriority,
    default: RefundPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(RefundPriority)
  priority?: RefundPriority;
}

