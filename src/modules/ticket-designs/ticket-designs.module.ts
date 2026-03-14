import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketDesignsService } from './ticket-designs.service';
import { TicketDesignsController } from './ticket-designs.controller';
import { TicketDesign } from '../../database/entities/ticket-design.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { Event } from '../../database/entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketDesign, Organiser, Event])],
  controllers: [TicketDesignsController],
  providers: [TicketDesignsService],
  exports: [TicketDesignsService],
})
export class TicketDesignsModule {}

