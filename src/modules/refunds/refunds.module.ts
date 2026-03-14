import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Refund } from '../../database/entities/refund.entity';
import { Order } from '../../database/entities/order.entity';
import { Payment } from '../../database/entities/payment.entity';
import { Ticket } from '../../database/entities/ticket.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Refund, Order, Payment, Ticket, Organiser]),
    NotificationsModule,
  ],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}

