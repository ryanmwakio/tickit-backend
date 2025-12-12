import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { EventsModule } from '../events/events.module';
import { User } from '../../database/entities/user.entity';
import { Event } from '../../database/entities/event.entity';
import { Order } from '../../database/entities/order.entity';
import { Ticket } from '../../database/entities/ticket.entity';
import { Checkin } from '../../database/entities/checkin.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { Payment } from '../../database/entities/payment.entity';
import { Refund } from '../../database/entities/refund.entity';
import { PromoCode } from '../../database/entities/promo-code.entity';
import { FeaturedRequest } from '../../database/entities/featured-request.entity';
import { OrganiserApplication } from '../../database/entities/organiser-application.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommonModule } from '../../common/common.module';
import { OrganiserApplicationsModule } from '../organiser-applications/organiser-applications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Event,
      Order,
      Ticket,
      Checkin,
      Organiser,
      Payment,
      Refund,
      PromoCode,
      FeaturedRequest,
      OrganiserApplication,
    ]),
    EventsModule,
    NotificationsModule,
    CommonModule,
    OrganiserApplicationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

