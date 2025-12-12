import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPhoneDto {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+254712345678',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +254712345678)',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'OTP code sent to phone',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4,8}$/, {
    message: 'OTP must be 4-8 digits',
  })
  otp: string;
}

export class SendOtpDto {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+254712345678',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +254712345678)',
  })
  phoneNumber: string;
}

