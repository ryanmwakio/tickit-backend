import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  refreshTokenExpiresIn: number;
}

export class LoginResponseDto {
  @ApiProperty()
  tokens: TokenResponseDto;

  @ApiProperty()
  user: UserResponseDto;

  @ApiPropertyOptional()
  requiresTwoFactor?: boolean;

  @ApiPropertyOptional()
  message?: string;
}

export class SignupResponseDto {
  @ApiProperty()
  tokens: TokenResponseDto;

  @ApiProperty()
  user: UserResponseDto;

  @ApiPropertyOptional()
  phoneVerification?: {
    phoneNumber: string;
    expiresAt: Date;
  };
}

