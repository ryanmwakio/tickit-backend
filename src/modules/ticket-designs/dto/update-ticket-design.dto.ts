import { PartialType } from '@nestjs/swagger';
import { CreateTicketDesignDto } from './create-ticket-design.dto';

export class UpdateTicketDesignDto extends PartialType(CreateTicketDesignDto) {}

