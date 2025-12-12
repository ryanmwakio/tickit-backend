import { IsNotEmpty, IsArray, ValidateNested, IsString, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScanEntryDto {
  @ApiProperty({
    description: 'QR code or ticket identifier',
    example: 'TKT1234567890',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Timestamp when the scan occurred (ISO 8601)',
    example: '2024-01-01T12:00:00Z',
  })
  @IsNotEmpty()
  @IsString()
  scannedAt: string;

  @ApiPropertyOptional({
    description: 'Gate ID where the scan occurred',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  gateId?: string;
}

export class BatchScanDto {
  @ApiProperty({
    description: 'Array of scan entries',
    type: [ScanEntryDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScanEntryDto)
  scans: ScanEntryDto[];
}

