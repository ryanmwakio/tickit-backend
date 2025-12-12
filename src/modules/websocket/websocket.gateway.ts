import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WSGateway({
  cors: {
    origin: (() => {
      // Get allowed origins from environment or use defaults
      const corsOrigin = process.env.CORS_ORIGIN;
      const allowedOrigins = corsOrigin 
        ? corsOrigin.split(',').map(o => o.trim())
        : ['http://localhost:3000', 'http://localhost:3001'];
      
      // In development, allow all localhost origins
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        return true; // Allow all origins in development
      }
      
      return allowedOrigins;
    })(),
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  namespace: '/',
})
export class WebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      
      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get('jwt.secret'),
        });
        client.data.userId = payload.sub;
        client.data.user = payload;
      }
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup if needed
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.join(data.room);
    return { event: 'joined', room: data.room };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.leave(data.room);
    return { event: 'left', room: data.room };
  }

  @SubscribeMessage('join-user-room')
  handleJoinUserRoom(@ConnectedSocket() client: Socket) {
    if (client.data.userId) {
      client.join(`user:${client.data.userId}`);
      return { event: 'joined', room: `user:${client.data.userId}` };
    }
    return { event: 'error', message: 'Not authenticated' };
  }

  @SubscribeMessage('join-admin-room')
  handleJoinAdminRoom(@ConnectedSocket() client: Socket) {
    // TODO: Verify user is admin
    if (client.data.user) {
      client.join('admins');
      return { event: 'joined', room: 'admins' };
    }
    return { event: 'error', message: 'Not authorized' };
  }

  @SubscribeMessage('join-organiser-room')
  handleJoinOrganiserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { organiserId: string },
  ) {
    if (client.data.userId) {
      client.join(`organiser:${data.organiserId}`);
      return { event: 'joined', room: `organiser:${data.organiserId}` };
    }
    return { event: 'error', message: 'Not authenticated' };
  }

  @SubscribeMessage('join-event-room')
  handleJoinEventRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    client.join(`event:${data.eventId}`);
    return { event: 'joined', room: `event:${data.eventId}` };
  }

  @SubscribeMessage('leave-event-room')
  handleLeaveEventRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    client.leave(`event:${data.eventId}`);
    return { event: 'left', room: `event:${data.eventId}` };
  }

  // Live streaming handlers
  @SubscribeMessage('start-live-stream')
  handleStartLiveStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string; streamUrl: string },
  ) {
    // TODO: Verify user is organiser or admin
    this.server.to(`event:${data.eventId}`).emit('live-stream-started', {
      eventId: data.eventId,
      streamUrl: data.streamUrl,
      timestamp: new Date(),
    });
    return { event: 'live-stream-started', eventId: data.eventId };
  }

  @SubscribeMessage('stop-live-stream')
  handleStopLiveStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    // TODO: Verify user is organiser or admin
    this.server.to(`event:${data.eventId}`).emit('live-stream-ended', {
      eventId: data.eventId,
      timestamp: new Date(),
    });
    return { event: 'live-stream-ended', eventId: data.eventId };
  }

  // Broadcast to specific room
  broadcastToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Get connected clients in a room
  getRoomClients(room: string): number {
    return this.server.sockets.adapter.rooms.get(room)?.size || 0;
  }
}

