import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './services/redis.service';
import { OtpService } from './services/otp.service';
import { MpesaService } from './services/mpesa.service';
import { RealtimeNotificationService } from './services/realtime-notification.service';
import { WebSocketModule } from '../modules/websocket/websocket.module';

@Global()
@Module({
  imports: [ConfigModule, WebSocketModule],
  providers: [RedisService, OtpService, MpesaService, RealtimeNotificationService],
  exports: [RedisService, OtpService, MpesaService, RealtimeNotificationService],
})
export class CommonModule {}

