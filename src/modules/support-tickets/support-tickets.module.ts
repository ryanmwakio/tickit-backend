import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicketsService } from './support-tickets.service';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicket } from '../../database/entities/support-ticket.entity';
import { SupportTicketMessage } from '../../database/entities/support-ticket-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket, SupportTicketMessage])],
  controllers: [SupportTicketsController],
  providers: [SupportTicketsService],
  exports: [SupportTicketsService],
})
export class SupportTicketsModule {}

