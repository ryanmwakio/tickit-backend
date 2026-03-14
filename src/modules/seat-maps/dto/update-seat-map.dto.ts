import { PartialType } from '@nestjs/swagger';
import { CreateSeatMapDto } from './create-seat-map.dto';

export class UpdateSeatMapDto extends PartialType(CreateSeatMapDto) {}

