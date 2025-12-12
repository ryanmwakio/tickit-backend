import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindOptionsWhere } from 'typeorm';
import { Event, EventStatus, EventVisibility } from '../../database/entities/event.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { Ticket, TicketStatus } from '../../database/entities/ticket.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { RealtimeNotificationService } from '../../common/services/realtime-notification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { NotificationType as NotificationPayloadType } from '../../common/types/notification.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationService: RealtimeNotificationService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async create(organiserId: string, createEventDto: CreateEventDto, userId: string): Promise<EventResponseDto> {
    // Verify organiser exists and user has access
    const organiser = await this.organiserRepository.findOne({
      where: { id: organiserId, ownerId: userId },
    });

    if (!organiser) {
      throw new ForbiddenException('Organiser not found or access denied');
    }

    // Generate slug if not provided
    let slug = createEventDto.slug;
    if (!slug) {
      slug = this.generateSlug(createEventDto.title);
    }

    // Check if slug exists
    const existingEvent = await this.eventRepository.findOne({ where: { slug } });
    if (existingEvent) {
      slug = `${slug}-${Date.now()}`;
    }

    // Set status to PENDING_APPROVAL if trying to publish
    const initialStatus = createEventDto.status === EventStatus.PUBLISHED
      ? EventStatus.PENDING_APPROVAL
      : (createEventDto.status || EventStatus.DRAFT);

    const event = this.eventRepository.create({
      id: uuidv4(),
      organiserId,
      ...createEventDto,
      slug,
      status: initialStatus,
      startsAt: new Date(createEventDto.startsAt),
      endsAt: new Date(createEventDto.endsAt),
      salesStartsAt: createEventDto.salesStartsAt ? new Date(createEventDto.salesStartsAt) : undefined,
      salesEndsAt: createEventDto.salesEndsAt ? new Date(createEventDto.salesEndsAt) : undefined,
    });

    const saved = await this.eventRepository.save(event);
    const eventEntity = await this.eventRepository.findOne({
      where: { id: saved.id },
      relations: ['organiser', 'venue'],
    });
    if (!eventEntity) {
      throw new NotFoundException('Event not found');
    }

    // Send approval request notification if status is PENDING_APPROVAL
    if (initialStatus === EventStatus.PENDING_APPROVAL) {
      await this.notificationService.notifyEventApprovalRequest(
        saved.id,
        eventEntity.title,
        organiserId,
        organiser?.name || eventEntity.organiser?.name || 'Organiser',
      );
    }

    return this.toResponseDto(eventEntity);
  }

  async findAll(query: EventQueryDto, userId?: string): Promise<{
    data: EventResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search, category, tag, status, visibility, organiserId, venueId, startsFrom, startsTo, city, sortBy = 'startsAt', sortOrder = 'ASC', featured, livePulse, hotRightNow } = query;

    // Log the incoming query to debug
    this.logger.log(`=== findAll called ===`);
    this.logger.log(`status: ${status}, userId: ${userId ? userId : 'UNDEFINED/NULL'}, organiserId: ${organiserId}`);
    this.logger.log(`Full query object: ${JSON.stringify({ status, organiserId, page, limit })}`);
    this.logger.log(`userId type: ${typeof userId}, value: ${userId}`);

    const where: FindOptionsWhere<Event> = {};

    // Visibility filter - only show public events to non-authenticated users
    // BUT: If organiserId is provided, allow status filtering (organizer viewing their own events)
    const isOrganizerRequest = !!organiserId;
    
    if (!userId && !isOrganizerRequest) {
      // For non-authenticated users without organiserId, only show public published events
      where.visibility = EventVisibility.PUBLIC;
      where.status = EventStatus.PUBLISHED;
      this.logger.log('No userId and no organiserId - applying PUBLIC visibility and PUBLISHED status filter (non-authenticated)');
    } else {
      // For authenticated users OR organizer requests, apply filters
      if (userId) {
        this.logger.log(`Authenticated user (userId: ${userId}) - applying custom filters`);
      } else {
        this.logger.log(`Organizer request (organiserId: ${organiserId}) - applying custom filters (no userId)`);
      }
      
      if (visibility) {
        where.visibility = visibility;
        this.logger.log(`Visibility filter applied: ${visibility}`);
      }
      
      // Status filter - ensure it's properly set
      // IMPORTANT: Only apply status filter if explicitly provided, otherwise show all statuses
      if (status !== undefined && status !== null) {
        // Validate status is a valid EventStatus enum value
        const validStatuses = Object.values(EventStatus);
        const statusValue = status as EventStatus;
        
        this.logger.log(`Status filter received: ${status} (raw), ${statusValue} (cast), valid: ${validStatuses.includes(statusValue)}`);
        this.logger.log(`Valid statuses: ${validStatuses.join(', ')}`);
        
        if (validStatuses.includes(statusValue)) {
          // Explicitly set the status in the where clause
          where.status = statusValue;
          this.logger.log(`✓ Status filter APPLIED to where clause: ${statusValue}`);
        } else {
          // Log invalid status but don't throw - just ignore the filter
          this.logger.warn(`✗ Invalid status filter received: ${status}. Valid values: ${validStatuses.join(', ')}`);
          this.logger.warn(`Status will be ignored - showing all statuses`);
        }
      } else {
        this.logger.log(`No status filter provided (status: ${status}) - showing all statuses`);
      }
    }

    if (organiserId) where.organiserId = organiserId;
    if (venueId) where.venueId = venueId;
    if (category) where.category = category;
    if (featured !== undefined) where.featured = featured;
    if (livePulse !== undefined) where.livePulse = livePulse;
    if (hotRightNow !== undefined) where.hotRightNow = hotRightNow;

    // Search
    if (search) {
      where.title = Like(`%${search}%`);
    }

    // Date range
    if (startsFrom || startsTo) {
      where.startsAt = Between(
        startsFrom ? new Date(startsFrom) : new Date(0),
        startsTo ? new Date(startsTo) : new Date('2099-12-31'),
      );
    }

    // Log the where clause before query execution (after all conditions are set)
    this.logger.log(`Final where clause: ${JSON.stringify(where, null, 2)}`);
    this.logger.log(`Query params: page=${page}, limit=${limit}, status=${status}, organiserId=${organiserId}, userId=${userId ? 'EXISTS' : 'MISSING'}`);

    // Ensure status is properly set in where clause if provided
    if (userId) {
      if (status) {
        if (where.status) {
          this.logger.log(`✓ Status filter IS SET in where clause: ${where.status}`);
          if (where.status !== status) {
            this.logger.error(`✗✗✗ STATUS MISMATCH! Requested: ${status}, but where.status is: ${where.status}`);
          }
        } else {
          this.logger.error(`✗✗✗ Status filter NOT SET in where clause despite status=${status} being provided!`);
          this.logger.error(`This means the status validation failed or the status was not applied correctly.`);
        }
      } else {
        this.logger.log(`No status filter requested - where.status should be undefined`);
      }
    } else {
      this.logger.log(`No userId - using default PUBLIC/PUBLISHED filters`);
    }

    const [events, total] = await this.eventRepository.findAndCount({
      where,
      relations: ['organiser', 'venue', 'ticketTypes'],
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Log results for debugging
    if (status) {
      const statusCounts = events.reduce((acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      this.logger.log(`Query returned ${events.length} events. Requested status: ${status}. Actual statuses: ${JSON.stringify(statusCounts)}`);
      
      // Warn if we got events with different status than requested
      if (where.status && events.some(e => e.status !== where.status)) {
        this.logger.error(`✗✗✗ STATUS FILTER MISMATCH! Requested: ${where.status}, but got events with different statuses!`);
        this.logger.error(`First few event statuses: ${events.slice(0, 5).map(e => e.status).join(', ')}`);
      } else if (where.status) {
        this.logger.log(`✓ All returned events match requested status: ${where.status}`);
      }
    } else {
      this.logger.log(`Query returned ${events.length} events (no status filter)`);
    }

    // Filter by tag if provided
    let filteredEvents = events;
    if (tag) {
      filteredEvents = events.filter((e) => e.tags?.includes(tag));
    }

    return {
      data: filteredEvents.map((e) => this.toResponseDto(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(idOrSlug: string, userId?: string): Promise<EventResponseDto> {
    this.logger.debug(`Finding event: ${idOrSlug}, userId: ${userId || 'undefined'}`);
    
    // Try to find by ID first (UUID format)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    
    let event;
    if (isUuid) {
      // Try ID first
      event = await this.eventRepository.findOne({
        where: { id: idOrSlug },
        relations: ['organiser', 'venue', 'ticketTypes'],
      });
    }
    
    // If not found by ID or not a UUID, try slug
    if (!event) {
      event = await this.eventRepository.findOne({
        where: { slug: idOrSlug },
        relations: ['organiser', 'venue', 'ticketTypes'],
      });
    }

    // If still not found, check old slugs in metadata
    // Note: This requires a full table scan, but is necessary for backward compatibility
    // Consider adding a slug_redirects table for better performance at scale
    if (!event) {
      // For findOne, we check all events since authenticated users may access non-published events
      const events = await this.eventRepository.find({
        relations: ['organiser', 'venue', 'ticketTypes'],
      });
      const foundEvent = events.find((e) => {
        const oldSlugs = e.metadata?.oldSlugs || [];
        return oldSlugs.includes(idOrSlug);
      });
      
      if (foundEvent) {
        event = foundEvent;
        this.logger.debug(`Event found by old slug: ${idOrSlug} -> ${event.slug}`);
      }
    }

    if (!event) {
      this.logger.debug(`Event not found in database: ${idOrSlug}`);
      throw new NotFoundException('Event not found');
    }

    this.logger.debug(`Event found: ${event.id}, status: ${event.status}, visibility: ${event.visibility}, organiserId: ${event.organiserId}`);

    // Check visibility and access
    // Public published events are visible to everyone
    if (event.visibility === EventVisibility.PUBLIC && event.status === EventStatus.PUBLISHED) {
      return this.toResponseDto(event);
    }

    // For non-public or non-published events, require authentication
    if (!userId) {
      this.logger.debug(`Access denied: userId is undefined for event ${event.id} (status: ${event.status}, visibility: ${event.visibility})`);
      throw new NotFoundException('Event not found');
    }

    // Check if user is the organiser (owner) of the event
    // For DRAFT, PENDING_APPROVAL, or private events, only the owner can view
    if (event.status !== EventStatus.PUBLISHED || event.visibility !== EventVisibility.PUBLIC) {
      // Ensure organiser relation is loaded
      if (!event.organiser) {
        event = await this.eventRepository.findOne({
          where: { id: event.id },
          relations: ['organiser', 'venue', 'ticketTypes'],
        });
        if (!event || !event.organiser) {
          throw new NotFoundException('Event not found');
        }
      }

      // Check if user owns the organiser (and thus the event)
      if (event.organiser.ownerId !== userId) {
        // User is not the owner, treat as not found for security
        throw new NotFoundException('Event not found');
      }
    }

    return this.toResponseDto(event);
  }

  async findBySlug(slug: string, userId?: string): Promise<EventResponseDto> {
    this.logger.debug(`Finding event by slug: ${slug}, userId: ${userId || 'undefined'}`);
    
    let event = await this.eventRepository.findOne({
      where: { slug },
      relations: ['organiser', 'venue', 'ticketTypes'],
    });

    // If not found by current slug, check old slugs in metadata
    // Note: This requires a full table scan, but is necessary for backward compatibility
    // Consider adding a slug_redirects table for better performance at scale
    if (!event) {
      const events = await this.eventRepository.find({
        relations: ['organiser', 'venue', 'ticketTypes'],
        where: { status: EventStatus.PUBLISHED }, // Only check published events for performance
      });
      const foundEvent = events.find((e) => {
        const oldSlugs = e.metadata?.oldSlugs || [];
        return oldSlugs.includes(slug);
      });
      
      if (foundEvent) {
        event = foundEvent;
        this.logger.debug(`Event found by old slug: ${slug} -> ${event.slug}`);
      }
    }

    if (!event) {
      this.logger.debug(`Event not found in database by slug: ${slug}`);
      throw new NotFoundException('Event not found');
    }

    this.logger.debug(`Event found: ${event.id}, status: ${event.status}, visibility: ${event.visibility}, organiserId: ${event.organiserId}`);

    // Check visibility and access
    // Public published events are visible to everyone
    if (event.visibility === EventVisibility.PUBLIC && event.status === EventStatus.PUBLISHED) {
      return this.toResponseDto(event);
    }

    // For non-public or non-published events, require authentication
    if (!userId) {
      this.logger.debug(`Access denied: userId is undefined for event ${event.id} (status: ${event.status}, visibility: ${event.visibility})`);
      throw new NotFoundException('Event not found');
    }

    // Check if user is the organiser (owner) of the event
    // For DRAFT, PENDING_APPROVAL, or private events, only the owner can view
    if (event.status !== EventStatus.PUBLISHED || event.visibility !== EventVisibility.PUBLIC) {
      // Ensure organiser relation is loaded
      if (!event.organiser) {
        event = await this.eventRepository.findOne({
          where: { id: event.id },
          relations: ['organiser', 'venue', 'ticketTypes'],
        });
        if (!event || !event.organiser) {
          throw new NotFoundException('Event not found');
        }
      }

      // Check if user owns the organiser (and thus the event)
      if (event.organiser.ownerId !== userId) {
        this.logger.debug(`Access denied: user ${userId} does not own organiser ${event.organiserId} (ownerId: ${event.organiser.ownerId})`);
        // User is not the owner, treat as not found for security
        throw new NotFoundException('Event not found');
      }
    }

    return this.toResponseDto(event);
  }

  async update(idOrSlug: string, updateEventDto: UpdateEventDto, userId: string): Promise<EventResponseDto> {
    // Check if it's a UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    
    let event;
    if (isUuid) {
      // Try ID first
      event = await this.eventRepository.findOne({
        where: { id: idOrSlug },
        relations: ['organiser'],
      });
    }
    
    // If not found by ID or not a UUID, try slug
    if (!event) {
      event = await this.eventRepository.findOne({
        where: { slug: idOrSlug },
        relations: ['organiser'],
      });
    }

    if (!event || !event.organiser) {
      throw new NotFoundException('Event not found');
    }
    
    const id = event.id;

    // Check ownership
    if (event.organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Update slug if title changed
    if (updateEventDto.title && updateEventDto.title !== event.title) {
      const oldSlug = event.slug;
      const newSlug = updateEventDto.slug || this.generateSlug(updateEventDto.title);
      const existing = await this.eventRepository.findOne({ where: { slug: newSlug } });
      if (existing && existing.id !== id) {
        updateEventDto.slug = `${newSlug}-${Date.now()}`;
      } else {
        updateEventDto.slug = newSlug;
      }

      // Store old slug in metadata for redirects
      const metadata = event.metadata || {};
      const oldSlugs = metadata.oldSlugs || [];
      if (!oldSlugs.includes(oldSlug)) {
        oldSlugs.push(oldSlug);
      }
      updateEventDto.metadata = {
        ...metadata,
        oldSlugs,
        lastSlugChange: new Date().toISOString(),
      };
    }

    // Track changes for notifications
    const newStartsAt = updateEventDto.startsAt ? new Date(updateEventDto.startsAt) : null;
    const hasDateChange = !!(newStartsAt && newStartsAt.toDateString() !== event.startsAt.toDateString());
    const hasTimeChange = !!(newStartsAt && newStartsAt.getTime() !== event.startsAt.getTime() && !hasDateChange);
    const hasVenueChange = !!(updateEventDto.venueId && updateEventDto.venueId !== event.venueId);
    const isCancelled = !!(updateEventDto.status === EventStatus.CANCELLED && event.status !== EventStatus.CANCELLED);

    // Convert date strings to Date objects
    if (updateEventDto.startsAt) {
      updateEventDto.startsAt = new Date(updateEventDto.startsAt) as any;
    }
    if (updateEventDto.endsAt) {
      updateEventDto.endsAt = new Date(updateEventDto.endsAt) as any;
    }
    if (updateEventDto.salesStartsAt) {
      updateEventDto.salesStartsAt = new Date(updateEventDto.salesStartsAt) as any;
    }
    if (updateEventDto.salesEndsAt) {
      updateEventDto.salesEndsAt = new Date(updateEventDto.salesEndsAt) as any;
    }

    await this.eventRepository.update(id, updateEventDto);
    const updatedEvent = await this.findOne(id, userId);

    // Notify admins that an organiser has edited an event (async, non-blocking)
    this.notifyAdminsOfEventEdit(updatedEvent, event.organiser).catch((err) => {
      this.logger.error(`Failed to notify admins of event edit for event ${event.id}:`, err);
    });

    // Notify ticket holders of changes (async, non-blocking)
    if (hasDateChange || hasTimeChange || hasVenueChange || isCancelled) {
      this.notifyTicketHolders(event.id, {
        hasDateChange,
        hasTimeChange,
        hasVenueChange,
        isCancelled,
        event: updatedEvent,
        originalEvent: event,
      }).catch((err) => {
        console.error(`Failed to notify ticket holders for event ${event.id}:`, err);
      });
    }

    return updatedEvent;
  }

  async delete(id: string, userId: string): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['organiser'],
    });

    if (!event || !event.organiser) {
      throw new NotFoundException('Event not found');
    }

    // Check ownership
    if (event.organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.eventRepository.remove(event);
  }

  /**
   * Request approval for an event (move from DRAFT to PENDING_APPROVAL)
   */
  async requestApproval(eventId: string, userId: string): Promise<EventResponseDto> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['organiser', 'venue'],
    });

    if (!event || !event.organiser) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only draft events can request approval');
    }

    event.status = EventStatus.PENDING_APPROVAL;
    await this.eventRepository.save(event);

    // Notify admins
    await this.notificationService.notifyEventApprovalRequest(
      eventId,
      event.title,
      event.organiserId,
      event.organiser.name || 'Organiser',
    );

    return this.findOne(eventId, userId);
  }

  /**
   * Approve an event (Admin only)
   */
  async approveEvent(eventId: string, adminId: string): Promise<EventResponseDto> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['organiser'],
    });

    if (!event || !event.organiser) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== EventStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Event is not pending approval');
    }

    event.status = EventStatus.APPROVED;
    await this.eventRepository.save(event);

    // Notify organiser
    await this.notificationService.notifyEventApprovalDecision(
      eventId,
      event.title,
      event.organiserId,
      true,
    );

    return this.findOne(eventId, adminId);
  }

  /**
   * Reject an event (Admin only)
   */
  async rejectEvent(eventId: string, adminId: string, reason?: string): Promise<EventResponseDto> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['organiser'],
    });

    if (!event || !event.organiser) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== EventStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Event is not pending approval');
    }

    event.status = EventStatus.REJECTED;
    await this.eventRepository.save(event);

    // Notify organiser
    await this.notificationService.notifyEventApprovalDecision(
      eventId,
      event.title,
      event.organiserId,
      false,
      reason,
    );

    return this.findOne(eventId, adminId);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private toResponseDto(event: Event): EventResponseDto {
    return {
      id: event.id,
      organiserId: event.organiserId,
      venueId: event.venueId,
      title: event.title,
      slug: event.slug,
      description: event.description,
      category: event.category,
      tags: event.tags,
      visibility: event.visibility,
      status: event.status,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      timezone: event.timezone,
      capacity: event.capacity,
      coverImageUrl: event.coverImageUrl,
      imageGalleryUrls: event.imageGalleryUrls,
      salesStartsAt: event.salesStartsAt,
      salesEndsAt: event.salesEndsAt,
      metadata: event.metadata,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      organiser: event.organiser
        ? {
            id: event.organiser.id,
            name: event.organiser.name,
            logoUrl: event.organiser.logoUrl,
          }
        : undefined,
      venue: event.venue
        ? {
            id: event.venue.id,
            name: event.venue.name,
            address: event.venue.address,
            city: event.venue.city,
          }
        : undefined,
      ticketTypes: event.ticketTypes?.map((tt) => ({
        id: tt.id,
        name: tt.name,
        priceCents: tt.priceCents,
        currency: tt.currency,
        quantityTotal: tt.quantityTotal,
        quantitySold: tt.quantitySold,
      })),
      featured: event.featured,
      livePulse: event.livePulse,
      hotRightNow: event.hotRightNow,
    };
  }

  /**
   * Notify all ticket holders of event changes
   */
  private async notifyTicketHolders(
    eventId: string,
    changes: {
      hasDateChange: boolean;
      hasTimeChange: boolean;
      hasVenueChange: boolean;
      isCancelled: boolean;
      event: EventResponseDto;
      originalEvent: Event;
    },
  ): Promise<void> {
    try {
      // Get all unique ticket holders for this event
      const tickets = await this.ticketRepository.find({
        where: { eventId, status: TicketStatus.ACTIVE },
        select: ['ownerId'],
      });

      const uniqueOwnerIds = [...new Set(tickets.map((t) => t.ownerId).filter(Boolean))] as string[];

      if (uniqueOwnerIds.length === 0) {
        return;
      }

      let notificationType: NotificationType;
      let title: string;
      let message: string;

      if (changes.isCancelled) {
        notificationType = NotificationType.EVENT_CANCELLED;
        title = 'Event Cancelled';
        message = `The event "${changes.event.title}" has been cancelled. Your tickets will be refunded.`;
      } else if (changes.hasDateChange) {
        notificationType = NotificationType.EVENT_DATE_CHANGE;
        title = 'Event Date Changed';
        message = `The date for "${changes.event.title}" has been updated. Please check the new date.`;
      } else if (changes.hasTimeChange) {
        notificationType = NotificationType.EVENT_TIME_CHANGE;
        title = 'Event Time Changed';
        message = `The time for "${changes.event.title}" has been updated. Please check the new time.`;
      } else if (changes.hasVenueChange) {
        notificationType = NotificationType.EVENT_VENUE_CHANGE;
        title = 'Event Venue Changed';
        message = `The venue for "${changes.event.title}" has been updated. Please check the new location.`;
      } else {
        return;
      }

      // Send notifications to all ticket holders
      const notificationPromises = uniqueOwnerIds.map((userId) =>
        this.notificationsService.createNotification({
          userId,
          title,
          message,
          type: notificationType,
          metadata: {
            eventId,
            link: `/events/${changes.event.slug}`,
          },
        }),
      );

      await Promise.allSettled(notificationPromises);
    } catch (error) {
      console.error(`Error notifying ticket holders for event ${eventId}:`, error);
    }
  }

  /**
   * Notify all admins when an organiser edits an event
   */
  private async notifyAdminsOfEventEdit(
    event: EventResponseDto,
    organiser: Organiser,
  ): Promise<void> {
    try {
      // Get all admin users
      const adminUsers = await this.userRepository.find({
        where: { activeRole: UserRole.ADMIN },
        select: ['id'],
      });

      if (adminUsers.length === 0) {
        this.logger.warn('No admin users found to notify about event edit');
        return;
      }

      // Send real-time notification to admin room via WebSocket
      await this.notificationService.notifyAdmins({
        id: `event-edit-${event.id}-${Date.now()}`,
        type: NotificationPayloadType.SYSTEM_ALERT,
        title: 'Event Edited by Organiser',
        message: `${organiser.name} has edited the event "${event.title}"`,
        eventId: event.id,
        metadata: {
          organiserId: organiser.id,
          organiserName: organiser.name,
          eventTitle: event.title,
          eventSlug: event.slug,
          action: 'view',
          link: `/admin/events/${event.id}`,
        },
        timestamp: new Date(),
      });

      // Create persistent notifications for each admin
      const notificationPromises = adminUsers.map((admin) =>
        this.notificationsService.createNotification({
          userId: admin.id,
          title: 'Event Edited by Organiser',
          message: `${organiser.name} has edited the event "${event.title}"`,
          type: NotificationType.SYSTEM_ALERT,
          metadata: {
            eventId: event.id,
            organiserId: organiser.id,
            organiserName: organiser.name,
            eventTitle: event.title,
            eventSlug: event.slug,
            link: `/admin/events/${event.id}`,
          },
        }),
      );

      await Promise.allSettled(notificationPromises);
      this.logger.log(`Notified ${adminUsers.length} admin(s) about event edit: ${event.id}`);
    } catch (error) {
      this.logger.error(`Failed to notify admins of event edit: ${error.message}`);
    }
  }
}

