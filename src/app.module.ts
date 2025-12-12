import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import appConfig from './config/app.config';
import redisConfig from './config/redis.config';
import { initDatabase } from './database/init-database';

// Common Module
import { CommonModule } from './common/common.module';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganisersModule } from './modules/organisers/organisers.module';
import { EventsModule } from './modules/events/events.module';
import { VenuesModule } from './modules/venues/venues.module';
import { TicketTypesModule } from './modules/ticket-types/ticket-types.module';
import { OrdersModule } from './modules/orders/orders.module';
import { OrderItemsModule } from './modules/order-items/order-items.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CheckinsModule } from './modules/checkins/checkins.module';
import { SupportTicketsModule } from './modules/support-tickets/support-tickets.module';
import { StaffModule } from './modules/staff/staff.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { PromoCodesModule } from './modules/promo-codes/promo-codes.module';
import { ContentBlocksModule } from './modules/content-blocks/content-blocks.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { AdminModule } from './modules/admin/admin.module';
import { ResaleModule } from './modules/resale/resale.module';
import { LiveStreamingModule } from './modules/live-streaming/live-streaming.module';
import { ChatModule } from './modules/chat/chat.module';
import { FeaturesModule } from './modules/features/features.module';
import { OrganiserApplicationsModule } from './modules/organiser-applications/organiser-applications.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, appConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        if (!dbConfig) {
          throw new Error('Database configuration is missing');
        }

        // Initialize database (create if doesn't exist) before TypeORM connection
        await initDatabase({
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
        });

        return dbConfig;
      },
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Task Scheduling
    ScheduleModule.forRoot(),

    // Queue Management (Bull/Redis)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          db: configService.get('redis.db'),
        },
      }),
      inject: [ConfigService],
    }),

    // Common Services
    CommonModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    OrganisersModule,
    EventsModule,
    VenuesModule,
    TicketTypesModule,
    OrdersModule,
    OrderItemsModule,
    TicketsModule,
    PaymentsModule,
    CheckinsModule,
    SupportTicketsModule,
    StaffModule,
    RefundsModule,
    PromoCodesModule,
    ContentBlocksModule,
    AnalyticsModule,
    NotificationsModule,
    WebSocketModule,
    AdminModule,
    ResaleModule,
    LiveStreamingModule,
    ChatModule,
    FeaturesModule,
    OrganiserApplicationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

