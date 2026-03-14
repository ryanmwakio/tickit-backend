import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsNumber, Min, IsOptional, IsEmail, IsIn } from 'class-validator';

export class IntaSendCheckoutDto {
  @ApiProperty({ description: 'Order ID' })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Customer first name' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Customer last name' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Customer email', example: 'customer@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Amount in shillings/cents', example: 1000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'KES', default: 'KES' })
  @IsOptional()
  @IsString()
  @IsIn(['KES', 'USD', 'GBP', 'EUR'])
  currency?: string;

  @ApiPropertyOptional({ description: 'Customer phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Payment method', enum: ['M-PESA', 'CARD-PAYMENT'] })
  @IsOptional()
  @IsIn(['M-PESA', 'CARD-PAYMENT'])
  method?: 'M-PESA' | 'CARD-PAYMENT';

  @ApiPropertyOptional({ description: 'Redirect URL after payment' })
  @IsOptional()
  @IsString()
  redirectUrl?: string;
}

export class IntaSendMpesaStkPushDto {
  @ApiProperty({ description: 'Order ID' })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Customer first name' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Customer last name' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Customer email', example: 'customer@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Amount in shillings/cents', example: 1000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Customer phone number (M-Pesa number)', example: '254712345678' })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;
}

export class IntaSendStatusDto {
  @ApiProperty({ description: 'Invoice ID from IntaSend' })
  @IsNotEmpty()
  @IsString()
  invoiceId: string;
}

