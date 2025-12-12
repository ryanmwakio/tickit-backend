import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email or phone number',
    example: 'admin@tixhub.com',
  })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'Password', example: 'Admin@123' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Two-factor authentication code' })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}

