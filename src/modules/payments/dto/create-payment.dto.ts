import { IsNotEmpty, IsUUID, IsEnum, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../database/entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.MPESA,
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment amount in cents (if different from order total)',
    example: 5000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amountCents?: number;

  @ApiPropertyOptional({
    description: 'Payment metadata',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

