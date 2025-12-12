import { IsNotEmpty, IsString, IsEnum, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentMetadataDto {
  @ApiPropertyOptional({ description: 'Phone number for MPesa', example: '+254712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Additional payment metadata', type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;
}

export class PurchaseListingDto {
  @ApiProperty({
    description: 'Payment method',
    enum: ['mpesa_express', 'mpesa_paybill', 'card', 'wallet'],
    example: 'mpesa_express',
  })
  @IsNotEmpty()
  @IsEnum(['mpesa_express', 'mpesa_paybill', 'card', 'wallet'])
  method: string;

  @ApiPropertyOptional({
    description: 'Payment metadata',
    type: PaymentMetadataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentMetadataDto)
  metadata?: PaymentMetadataDto;
}

