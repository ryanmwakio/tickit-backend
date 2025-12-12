import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SocialLoginDto {
  @ApiProperty({
    description: 'Social provider name',
    example: 'google',
    enum: ['google', 'facebook', 'apple'],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['google', 'facebook', 'apple'])
  provider: string;

  @ApiProperty({
    description: 'Provider access token',
    example: 'provider_access_token',
  })
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({
    description: 'Provider ID token (for OIDC providers)',
    example: 'provider_id_token',
  })
  @IsOptional()
  @IsString()
  idToken?: string;
}

