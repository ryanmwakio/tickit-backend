import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventVisibility, EventStatus } from '../../../database/entities/event.entity';

export class EventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organiserId: string;

  @ApiPropertyOptional()
  venueId?: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiProperty({ enum: EventVisibility })
  visibility: EventVisibility;

  @ApiProperty({ enum: EventStatus })
  status: EventStatus;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiPropertyOptional()
  timezone?: string;

  @ApiPropertyOptional()
  capacity?: number;

  @ApiPropertyOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  imageGalleryUrls?: string[];

  @ApiPropertyOptional()
  salesStartsAt?: Date;

  @ApiPropertyOptional()
  salesEndsAt?: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  organiser?: {
    id: string;
    name: string;
    logoUrl?: string;
  };

  @ApiPropertyOptional()
  venue?: {
    id: string;
    name: string;
    address: string;
    city: string;
  };

  @ApiPropertyOptional({ type: [Object] })
  ticketTypes?: any[];

  @ApiPropertyOptional()
  featured?: boolean;

  @ApiPropertyOptional()
  livePulse?: boolean;

  @ApiPropertyOptional()
  hotRightNow?: boolean;
}

