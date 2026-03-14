import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganisersService } from "./organisers.service";
import { OrganisersController } from "./organisers.controller";
import { AdminOrganisersController } from "./admin-organisers.controller";
import { OrganiserDashboardService } from "./organiser-dashboard.service";
import { OrganiserDashboardController } from "./organiser-dashboard.controller";
import { Organiser } from "../../database/entities/organiser.entity";
import { Event } from "../../database/entities/event.entity";
import { Order } from "../../database/entities/order.entity";
import { Ticket } from "../../database/entities/ticket.entity";
import { Checkin } from "../../database/entities/checkin.entity";
import { Payment } from "../../database/entities/payment.entity";
import { Refund } from "../../database/entities/refund.entity";
import { User } from "../../database/entities/user.entity";
import { FeaturedRequest } from "../../database/entities/featured-request.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { CommonModule } from "../../common/common.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organiser,
      Event,
      Order,
      Ticket,
      Checkin,
      Payment,
      Refund,
      User,
      FeaturedRequest,
    ]),
    NotificationsModule,
    CommonModule,
    forwardRef(() => EventsModule),
  ],
  controllers: [
    OrganisersController,
    AdminOrganisersController,
    OrganiserDashboardController,
  ],
  providers: [OrganisersService, OrganiserDashboardService],
  exports: [OrganisersService, OrganiserDashboardService],
})
export class OrganisersModule {}
