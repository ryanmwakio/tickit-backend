import { IsNotEmpty, IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty({
    description: 'Ticket ID to list for resale',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  ticketId: string;

  @ApiProperty({
    description: 'Resale price in cents',
    example: 5000,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  priceCents: number;
}

