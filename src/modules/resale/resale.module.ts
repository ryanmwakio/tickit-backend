import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResaleListing } from '../../database/entities/resale-listing.entity';
import { Ticket } from '../../database/entities/ticket.entity';
import { Order } from '../../database/entities/order.entity';
import { ResaleController } from './resale.controller';
import { ResaleService } from './resale.service';
import { TicketsModule } from '../tickets/tickets.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResaleListing, Ticket, Order]),
    TicketsModule,
    OrdersModule,
    PaymentsModule,
    CommonModule,
  ],
  controllers: [ResaleController],
  providers: [ResaleService],
  exports: [ResaleService],
})
export class ResaleModule {}

