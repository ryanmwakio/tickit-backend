import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoidTicketDto {
  @ApiProperty({
    description: 'Reason for voiding the ticket',
    example: 'Event cancelled',
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;
}

