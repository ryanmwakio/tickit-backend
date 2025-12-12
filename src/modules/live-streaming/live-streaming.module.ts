import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveStreamingService } from './live-streaming.service';
import { LiveStreamingController } from './live-streaming.controller';
import { Event } from '../../database/entities/event.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event]),
    WebSocketModule,
    CommonModule,
  ],
  controllers: [LiveStreamingController],
  providers: [LiveStreamingService],
  exports: [LiveStreamingService],
})
export class LiveStreamingModule {}

