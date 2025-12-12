import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from '../../database/entities/ticket.entity';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfService } from '../../common/services/pdf.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService, PdfService],
  exports: [TicketsService],
})
export class TicketsModule {}

