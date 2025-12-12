import { IsNotEmpty, IsString, IsArray, ValidateNested, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ description: 'Ticket type ID' })
  @IsNotEmpty()
  @IsUUID()
  ticketTypeId: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ description: 'Attendee names', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendeeNames?: string[];
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Organiser ID' })
  @IsNotEmpty()
  @IsUUID()
  organiserId: string;

  @ApiProperty({ description: 'Order items', type: [OrderItemDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Promo code' })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({ description: 'Payment method', example: 'MPESA' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Idempotency key' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ 
    description: 'Additional metadata', 
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

