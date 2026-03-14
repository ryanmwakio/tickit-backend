import { IsNotEmpty, IsString, IsOptional, IsObject, IsArray, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSeatMapDto {
  @ApiProperty({ description: 'Seat map name', example: 'Main Hall Seat Map' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Seat map description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Seat map configuration (JSON object)' })
  @IsNotEmpty()
  @IsObject()
  mapConfig: {
    width?: number;
    height?: number;
    scale?: number;
    backgroundColor?: string;
    backgroundImage?: string;
    stage?: {
      enabled: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
      width?: number;
      height?: number;
      label?: string;
      color?: string;
    };
    sections?: Array<{
      id: string;
      name: string;
      color?: string;
      labelColor?: string;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      rows?: Array<{
        id: string;
        name: string;
        seats?: Array<{
          id: string;
          number: string;
          type?: 'standard' | 'vip' | 'accessible' | 'premium';
        }>;
      }>;
    }>;
    legend?: {
      enabled: boolean;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      items?: Array<{
        label: string;
        color: string;
      }>;
    };
    labels?: {
      enabled: boolean;
      showSectionNames?: boolean;
      showRowNames?: boolean;
      showSeatNumbers?: boolean;
      fontSize?: number;
      fontColor?: string;
    };
  };

  @ApiProperty({ description: 'Event ID' })
  @IsNotEmpty()
  @IsString()
  eventId: string;
}

