import { IsNotEmpty, IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../../../database/entities/payment.entity';

export class UpdatePaymentStatusDto {
  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @IsNotEmpty()
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Transaction ID from payment provider',
    example: 'MPESA1234567890',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}

