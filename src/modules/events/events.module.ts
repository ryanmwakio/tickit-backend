import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventsService } from "./events.service";
import { EventsController } from "./events.controller";
import { EventSchedulerService } from "./event-scheduler.service";
import { Event } from "../../database/entities/event.entity";
import { Organiser } from "../../database/entities/organiser.entity";
import { Ticket } from "../../database/entities/ticket.entity";
import { Order } from "../../database/entities/order.entity";
import { User } from "../../database/entities/user.entity";
import { CommonModule } from "../../common/common.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OptionalAuthInterceptor } from "../../common/interceptors/optional-auth.interceptor";
import { PdfService } from "../../common/services/pdf.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Organiser, Ticket, Order, User]),
    CommonModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: any) => ({
        secret: configService.get("jwt.secret"),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    EventSchedulerService,
    OptionalAuthInterceptor,
    PdfService,
  ],
  exports: [EventsService],
})
export class EventsModule {}
