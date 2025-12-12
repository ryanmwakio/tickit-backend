import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Event } from '../../database/entities/event.entity';
import { Order } from '../../database/entities/order.entity';
import { Ticket } from '../../database/entities/ticket.entity';
import { Checkin } from '../../database/entities/checkin.entity';
import { Payment } from '../../database/entities/payment.entity';
import { Organiser } from '../../database/entities/organiser.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Order, Ticket, Checkin, Payment, Organiser]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

