import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { RefundStatus, RefundPriority } from '../../../database/entities/refund.entity';

export class RefundQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by refund status',
    enum: RefundStatus,
  })
  @IsOptional()
  @IsEnum(RefundStatus, { message: 'Invalid refund status' })
  status?: RefundStatus;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: RefundPriority,
  })
  @IsOptional()
  @IsEnum(RefundPriority, { message: 'Invalid refund priority' })
  priority?: RefundPriority;

  @ApiPropertyOptional({
    description: 'Filter by order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}

