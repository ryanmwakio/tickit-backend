import { IsNotEmpty, IsUUID, IsString, IsNumber, IsOptional, Min, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MpesaExpressDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+254712345678',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +254712345678)',
  })
  phoneNumber: string;

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

