import { IsNotEmpty, IsUUID, IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CardPaymentDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Payment token from payment gateway',
    example: 'tok_visa_1234567890',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: 'Payment amount in cents (if different from order total)',
    example: 5000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amountCents?: number;
}

