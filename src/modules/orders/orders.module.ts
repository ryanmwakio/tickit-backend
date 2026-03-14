import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SeatMapsModule } from '../seat-maps/seat-maps.module';
import { CommonModule } from '../../common/common.module';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { TicketType } from '../../database/entities/ticket-type.entity';
import { Ticket } from '../../database/entities/ticket.entity';
import { Payment } from '../../database/entities/payment.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, TicketType, Ticket, Payment, User]),
    PaymentsModule,
    NotificationsModule,
    SeatMapsModule,
    CommonModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

