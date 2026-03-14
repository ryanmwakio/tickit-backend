import { IsNotEmpty, IsString, IsOptional, IsObject, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDesignDto {
  @ApiProperty({ description: 'Design name', example: 'Premium Ticket Design' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Design description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Design configuration (JSON object)' })
  @IsNotEmpty()
  @IsObject()
  designConfig: {
    layout?: 'portrait' | 'landscape';
    width?: number;
    height?: number;
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundGradient?: {
      type: 'linear' | 'radial';
      colors: string[];
      direction?: string;
    };
    header?: {
      enabled: boolean;
      height?: number;
      backgroundColor?: string;
      logo?: {
        url: string;
        position: 'left' | 'center' | 'right';
        size?: number;
      };
      text?: {
        content: string;
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        fontWeight?: 'normal' | 'bold';
        position: 'left' | 'center' | 'right';
      };
    };
    eventInfo?: {
      enabled: boolean;
      title?: {
        enabled: boolean;
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        fontWeight?: 'normal' | 'bold';
      };
      date?: {
        enabled: boolean;
        format?: string;
        fontSize?: number;
        color?: string;
      };
      time?: {
        enabled: boolean;
        format?: string;
        fontSize?: number;
        color?: string;
      };
      venue?: {
        enabled: boolean;
        fontSize?: number;
        color?: string;
      };
    };
    qrCode?: {
      enabled: boolean;
      size?: number;
      position?: 'left' | 'center' | 'right' | 'bottom';
      margin?: number;
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    };
    ticketDetails?: {
      enabled: boolean;
      ticketNumber?: {
        enabled: boolean;
        label?: string;
        fontSize?: number;
        color?: string;
      };
      ticketType?: {
        enabled: boolean;
        label?: string;
        fontSize?: number;
        color?: string;
      };
      price?: {
        enabled: boolean;
        label?: string;
        fontSize?: number;
        color?: string;
        format?: string;
      };
      seatInfo?: {
        enabled: boolean;
        section?: {
          enabled: boolean;
          label?: string;
        };
        row?: {
          enabled: boolean;
          label?: string;
        };
        seat?: {
          enabled: boolean;
          label?: string;
        };
        fontSize?: number;
        color?: string;
      };
    };
    footer?: {
      enabled: boolean;
      height?: number;
      backgroundColor?: string;
      text?: string;
      fontSize?: number;
      color?: string;
      links?: Array<{
        text: string;
        url: string;
      }>;
    };
    border?: {
      enabled: boolean;
      width?: number;
      color?: string;
      style?: 'solid' | 'dashed' | 'dotted';
      radius?: number;
    };
    watermark?: {
      enabled: boolean;
      text?: string;
      image?: string;
      opacity?: number;
      position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
  };

  @ApiPropertyOptional({ description: 'Event ID (if design is event-specific)', required: false })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({ description: 'Set as default design', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

