import { IsNotEmpty, IsString, IsArray, IsNumber, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSeatDto {
  @ApiProperty({ description: 'Section name', example: 'A' })
  @IsNotEmpty()
  @IsString()
  section: string;

  @ApiPropertyOptional({ description: 'Row identifier', example: '1' })
  @IsOptional()
  @IsString()
  row?: string;

  @ApiProperty({ description: 'Seat number', example: '1' })
  @IsNotEmpty()
  @IsString()
  number: string;

  @ApiProperty({ description: 'X position on map' })
  @IsNotEmpty()
  @IsNumber()
  positionX: number;

  @ApiProperty({ description: 'Y position on map' })
  @IsNotEmpty()
  @IsNumber()
  positionY: number;

  @ApiPropertyOptional({ description: 'Seat price in cents (overrides ticket type price)' })
  @IsOptional()
  @IsNumber()
  priceCents?: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ 
    description: 'Seat type',
    enum: ['standard', 'vip', 'accessible', 'premium', 'restricted'],
    default: 'standard'
  })
  @IsOptional()
  @IsEnum(['standard', 'vip', 'accessible', 'premium', 'restricted'])
  type?: 'standard' | 'vip' | 'accessible' | 'premium' | 'restricted';
}

export class CreateSeatsDto {
  @ApiProperty({ description: 'Seat map ID' })
  @IsNotEmpty()
  @IsString()
  seatMapId: string;

  @ApiProperty({ description: 'Array of seats to create', type: [CreateSeatDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSeatDto)
  seats: CreateSeatDto[];
}

