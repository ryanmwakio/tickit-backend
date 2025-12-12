import { IsOptional, IsString, IsEnum, IsNumber, IsDateString, IsBoolean, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PromoCodeType } from '../../../database/entities/promo-code.entity';

export class UpdatePromoCodeDto {
  @ApiPropertyOptional({
    description: 'Promo code (unique identifier)',
    example: 'EARLYBIRD2024',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    description: 'Description of the promo code',
    example: 'Early bird discount for 2024 events',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Promo code type',
    enum: PromoCodeType,
  })
  @IsOptional()
  @IsEnum(PromoCodeType)
  type?: PromoCodeType;

  @ApiPropertyOptional({
    description: 'Discount value (percentage or fixed amount)',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  value?: number;

  @ApiPropertyOptional({
    description: 'Valid from date (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'Valid until date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of uses',
    example: 100,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({
    description: 'Whether the promo code is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

