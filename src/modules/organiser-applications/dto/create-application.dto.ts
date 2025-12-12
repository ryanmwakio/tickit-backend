import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganiserApplicationDto {
  @ApiProperty({ description: 'Full name', example: 'Jane Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Organisation name', example: 'Skyline Events' })
  @IsNotEmpty()
  @IsString()
  organisation: string;

  @ApiProperty({ description: 'Email address', example: 'jane@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+254712345678' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ description: 'Event details', example: 'Date, venue, expected capacity, payment flows needed...' })
  @IsNotEmpty()
  @IsString()
  eventDetails: string;
}



