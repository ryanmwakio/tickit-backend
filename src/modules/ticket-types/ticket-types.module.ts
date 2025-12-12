import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketTypesService } from './ticket-types.service';
import { TicketTypesController } from './ticket-types.controller';
import { TicketType } from '../../database/entities/ticket-type.entity';
import { Event } from '../../database/entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketType, Event])],
  controllers: [TicketTypesController],
  providers: [TicketTypesService],
  exports: [TicketTypesService],
})
export class TicketTypesModule {}

