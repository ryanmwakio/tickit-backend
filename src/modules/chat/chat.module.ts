import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatBotService } from './services/chat-bot.service';
import { AiChatService } from './services/ai-chat.service';
import { ChatSession } from '../../database/entities/chat-session.entity';
import { ChatMessage } from '../../database/entities/chat-message.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ChatSession, ChatMessage]),
    WebSocketModule,
    NotificationsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatBotService, AiChatService],
  exports: [ChatService, ChatBotService, AiChatService],
})
export class ChatModule {}

