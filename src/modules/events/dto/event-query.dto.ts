import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus, EventVisibility } from '../../../database/entities/event.entity';

export class EventQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search term (title, description)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Tag filter' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ enum: EventStatus, description: 'Status filter' })
  @IsOptional()
  @Transform(({ value }) => {
    // Transform string to uppercase to match enum values
    if (typeof value === 'string') {
      const upperValue = value.toUpperCase();
      if (Object.values(EventStatus).includes(upperValue as EventStatus)) {
        return upperValue as EventStatus;
      }
    }
    return value;
  })
  @IsEnum(EventStatus, { message: 'Status must be a valid EventStatus enum value' })
  status?: EventStatus;

  @ApiPropertyOptional({ enum: EventVisibility, description: 'Visibility filter' })
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @ApiPropertyOptional({ description: 'Organiser ID filter' })
  @IsOptional()
  @IsString()
  organiserId?: string;

  @ApiPropertyOptional({ description: 'Venue ID filter' })
  @IsOptional()
  @IsString()
  venueId?: string;

  @ApiPropertyOptional({ description: 'Start date from (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startsFrom?: string;

  @ApiPropertyOptional({ description: 'Start date to (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startsTo?: string;

  @ApiPropertyOptional({ description: 'City filter' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Sort field', example: 'startsAt', default: 'startsAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'startsAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], description: 'Sort order', default: 'ASC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';

  @ApiPropertyOptional({ description: 'Filter by featured events', type: Boolean })
  @IsOptional()
  @Type(() => Boolean)
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Filter by live pulse events', type: Boolean })
  @IsOptional()
  @Type(() => Boolean)
  livePulse?: boolean;

  @ApiPropertyOptional({ description: 'Filter by hot right now events', type: Boolean })
  @IsOptional()
  @Type(() => Boolean)
  hotRightNow?: boolean;
}

