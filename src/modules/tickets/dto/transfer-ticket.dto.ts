import { IsOptional, IsString, IsEmail, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TransferTicketDto {
  @ApiPropertyOptional({
    description: 'Email address of the new ticket owner',
    example: 'newowner@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number of the new ticket owner (E.164 format)',
    example: '+254712345678',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +254712345678)',
  })
  phoneNumber?: string;
}

