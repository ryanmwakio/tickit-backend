import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsUUID,
  IsObject,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttendeeDto {
  @ApiPropertyOptional({ description: 'Attendee name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Attendee email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Attendee phone number (E.164 format)', example: '+254712345678' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class CheckoutItemDto {
  @ApiProperty({ description: 'Ticket type ID' })
  @IsNotEmpty()
  @IsUUID()
  ticketTypeId: string;

  @ApiProperty({ description: 'Quantity', example: 2, minimum: 1, maximum: 100 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Attendee information',
    type: [AttendeeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  attendees?: AttendeeDto[];

  @ApiPropertyOptional({ 
    description: 'Selected seat IDs (for events with seat maps). Must match quantity.',
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  seatIds?: string[];
}

export class PaymentMethodDto {
  @ApiProperty({
    description: 'Payment method',
    enum: ['mpesa_express', 'mpesa_paybill', 'card', 'wallet'],
    example: 'mpesa_express',
  })
  @IsNotEmpty()
  @IsEnum(['mpesa_express', 'mpesa_paybill', 'card', 'wallet'])
  method: string;

  @ApiPropertyOptional({
    description: 'Payment metadata (e.g., phone number for MPesa)',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CheckoutDto {
  @ApiProperty({ description: 'Organiser ID' })
  @IsNotEmpty()
  @IsUUID()
  organiserId: string;

  @ApiProperty({
    description: 'Order items',
    type: [CheckoutItemDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiProperty({
    description: 'Payment information',
    type: PaymentMethodDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PaymentMethodDto)
  payment: PaymentMethodDto;

  @ApiPropertyOptional({
    description: 'Additional metadata (e.g., promo code)',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Skip payment processing (for development/demo mode)',
    default: false,
  })
  @IsOptional()
  skipPayment?: boolean;
}

