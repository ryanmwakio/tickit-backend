import { IsNotEmpty, IsString, IsOptional, IsDateString, IsEnum, IsNumber, IsArray, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventVisibility, EventStatus } from '../../../database/entities/event.entity';

export class CreateEventDto {
  @ApiProperty({ description: 'Event title', example: 'Nairobi Music Festival 2025' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Event slug (auto-generated if not provided)', example: 'nairobi-music-festival-2025' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  slug?: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Event category', example: 'Music' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Event tags', type: [String], example: ['music', 'festival'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ enum: EventVisibility, default: EventVisibility.PUBLIC })
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @ApiProperty({ enum: EventStatus, default: EventStatus.DRAFT })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiProperty({ description: 'Event start date/time', example: '2025-12-12T18:00:00+03:00' })
  @IsNotEmpty()
  @IsDateString()
  startsAt: string;

  @ApiProperty({ description: 'Event end date/time', example: '2025-12-12T23:00:00+03:00' })
  @IsNotEmpty()
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'Africa/Nairobi' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Event capacity' })
  @IsOptional()
  @IsNumber()
  capacity?: number;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'Gallery image URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageGalleryUrls?: string[];

  @ApiPropertyOptional({ description: 'Sales start date/time' })
  @IsOptional()
  @IsDateString()
  salesStartsAt?: string;

  @ApiPropertyOptional({ description: 'Sales end date/time' })
  @IsOptional()
  @IsDateString()
  salesEndsAt?: string;

  @ApiPropertyOptional({ description: 'Venue ID' })
  @IsOptional()
  @IsString()
  venueId?: string;

  @ApiPropertyOptional({ description: 'Ticket Design ID' })
  @IsOptional()
  @IsString()
  ticketDesignId?: string;

  @ApiPropertyOptional({ description: 'Seat Map ID' })
  @IsOptional()
  @IsString()
  seatMapId?: string;

  @ApiPropertyOptional({ 
    description: 'Additional metadata', 
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

