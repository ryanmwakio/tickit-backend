import { IsNotEmpty, IsString, IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidatePromoCodeDto {
  @ApiProperty({
    description: 'Promo code to validate',
    example: 'EARLYBIRD2024',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Organiser ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  organiserId: string;

  @ApiProperty({
    description: 'Order amount in cents',
    example: 10000,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  orderAmountCents: number;
}

