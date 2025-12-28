import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../database/entities/event.entity';
import { RealtimeNotificationService } from '../../common/services/realtime-notification.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LiveStreamingService {
  private readonly logger = new Logger(LiveStreamingService.name);

  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private notificationService: RealtimeNotificationService,
    private wsGateway: WebSocketGateway,
  ) {}

  /**
   * Start live streaming for an event
   */
  async startStream(
    eventId: string,
    userId: string,
    streamUrl?: string,
  ): Promise<{
    eventId: string;
    streamUrl: string;
    streamKey: string;
    status: string;
  }> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['organiser'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Verify user is organiser or admin
    if (event.organiserId !== userId) {
      // TODO: Check if user is admin
      throw new ForbiddenException('Only the event organiser can start live streaming');
    }

    if (event.streamStatus === 'live') {
      throw new BadRequestException('Stream is already live');
    }

    // Generate stream key if not provided
    const streamKey = event.streamKey || `stream-${eventId}-${uuidv4()}`;
    
    // Use provided streamUrl or generate one
    const finalStreamUrl = streamUrl || event.streamUrl || this.generateStreamUrl(eventId, streamKey);

    // Update event with stream info
    event.streamUrl = finalStreamUrl;
    event.streamKey = streamKey;
    event.streamStatus = 'starting';
    event.streamStartedAt = new Date();
    event.viewerCount = 0;

    await this.eventRepository.save(event);

    // Notify all users following this event
    await this.notificationService.notifyLiveStreamStarted(
      eventId,
      event.title,
      finalStreamUrl,
    );

    // Broadcast to event room
    this.wsGateway.broadcastToRoom(`event:${eventId}`, 'live-stream-started', {
      eventId,
      streamUrl: finalStreamUrl,
      eventTitle: event.title,
      timestamp: new Date(),
    });

    this.logger.log(`Live stream started for event ${eventId}`);

    return {
      eventId,
      streamUrl: finalStreamUrl,
      streamKey,
      status: 'starting',
    };
  }

  /**
   * Mark stream as live (called after stream actually starts)
   */
  async markStreamLive(eventId: string, userId: string): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== userId) {
      throw new ForbiddenException('Only the event organiser can control streaming');
    }

    event.streamStatus = 'live';
    await this.eventRepository.save(event);

    this.wsGateway.broadcastToRoom(`event:${eventId}`, 'live-stream-status', {
      eventId,
      status: 'live',
      timestamp: new Date(),
    });
  }

  /**
   * Stop live streaming
   */
  async stopStream(eventId: string, userId: string): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== userId) {
      throw new ForbiddenException('Only the event organiser can stop streaming');
    }

    if (event.streamStatus !== 'live' && event.streamStatus !== 'starting') {
      throw new BadRequestException('Stream is not active');
    }

    event.streamStatus = 'ended';
    event.streamEndedAt = new Date();
    event.viewerCount = 0;

    await this.eventRepository.save(event);

    await this.notificationService.notifyLiveStreamEnded(eventId, event.title);

    this.wsGateway.broadcastToRoom(`event:${eventId}`, 'live-stream-ended', {
      eventId,
      eventTitle: event.title,
      timestamp: new Date(),
    });

    this.logger.log(`Live stream stopped for event ${eventId}`);
  }

  /**
   * Get stream info
   */
  async getStreamInfo(eventId: string): Promise<{
    eventId: string;
    streamUrl?: string;
    status: string;
    viewerCount: number;
    startedAt?: Date;
  }> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      eventId,
      streamUrl: event.streamUrl,
      status: event.streamStatus || 'idle',
      viewerCount: event.viewerCount || 0,
      startedAt: event.streamStartedAt,
    };
  }

  /**
   * Update viewer count (called periodically)
   */
  async updateViewerCount(eventId: string, count: number): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (event) {
      event.viewerCount = count;
      await this.eventRepository.save(event);

      // Broadcast updated count
      this.wsGateway.broadcastToRoom(`event:${eventId}`, 'viewer-count-update', {
        eventId,
        viewerCount: count,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Generate stream URL (can be customized for different streaming providers)
   */
  private generateStreamUrl(eventId: string, streamKey: string): string {
    // Default: RTMP URL format
    // In production, integrate with streaming service (e.g., AWS IVS, Mux, Wowza)
    const baseUrl = process.env.STREAM_BASE_URL || 'rtmp://stream.tickit.com/live';
    return `${baseUrl}/${streamKey}`;
  }
}

