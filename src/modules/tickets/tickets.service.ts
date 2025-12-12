import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from '../../database/entities/ticket.entity';
import { User } from '../../database/entities/user.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { PdfService } from '../../common/services/pdf.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    private usersService: UsersService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private pdfService: PdfService,
  ) {}

  async findAll(
    userId: string | undefined,
    page: number = 1,
    limit: number = 20,
    status?: TicketStatus,
    eventId?: string,
    trackingId?: string,
  ): Promise<{
    data: Ticket[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Log query parameters for debugging
    this.logger.debug(`Finding tickets: userId=${userId}, eventId=${eventId}, trackingId=${trackingId}, status=${status}`);
    const queryBuilder = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('ticket.event', 'event')
      .leftJoinAndSelect('ticket.orderItem', 'orderItem')
      .leftJoinAndSelect('orderItem.order', 'order'); // Load order relation for frontend

    // Build WHERE conditions
    const whereConditions: string[] = [];
    const whereParams: Record<string, any> = {};

    // If userId is provided, filter by ownerId (for logged-in users)
    // Also check for guest tickets (ownerId IS NULL) with trackingId if provided
    if (userId) {
      if (trackingId) {
        // User is logged in but may have guest tickets - check both
        whereConditions.push(
          '(ticket.ownerId = :userId OR (ticket.ownerId IS NULL AND (JSON_EXTRACT(order.metadata, "$.deviceId") = :trackingId OR JSON_EXTRACT(order.metadata, "$.trackingId") = :trackingId)))',
        );
        whereParams.userId = userId;
        whereParams.trackingId = trackingId;
      } else {
        // Only check for tickets owned by this user
        whereConditions.push('ticket.ownerId = :userId');
        whereParams.userId = userId;
      }
    } else if (trackingId) {
      // For guest users, filter by trackingId in order metadata
      // Guest tickets have ownerId = NULL, so we need to check both conditions
      whereConditions.push('ticket.ownerId IS NULL'); // Guest tickets have no owner
      whereConditions.push(
        '(JSON_EXTRACT(order.metadata, "$.deviceId") = :trackingId OR JSON_EXTRACT(order.metadata, "$.trackingId") = :trackingId)',
      );
      whereParams.trackingId = trackingId;
    } else {
      // If neither userId nor trackingId, return empty
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // Apply WHERE conditions
    if (whereConditions.length > 0) {
      queryBuilder.where(whereConditions.join(' AND '), whereParams);
    }

    if (status) {
      queryBuilder.andWhere('ticket.status = :status', { status });
    }

    if (eventId) {
      // Use direct eventId field for faster queries
      queryBuilder.andWhere('ticket.eventId = :eventId', { eventId });
    }

    queryBuilder.orderBy('ticket.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [tickets, total] = await queryBuilder.getManyAndCount();

    return {
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['ticketType', 'event', 'orderItem', 'orderItem.order', 'owner'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (userId && ticket.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  async findByTicketNumber(ticketNumber: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { ticketNumber },
      relations: ['ticketType', 'event', 'owner'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async transfer(
    ticketId: string,
    transferDto: { email?: string; phoneNumber?: string },
    userId: string,
  ): Promise<Ticket> {
    const ticket = await this.findOne(ticketId, userId);

    if (ticket.status !== TicketStatus.ACTIVE) {
      throw new ForbiddenException('Ticket cannot be transferred');
    }

    // Find new owner by email or phone
    let newOwner: User | null = null;
    if (transferDto.email) {
      newOwner = await this.usersService.findByEmail(transferDto.email);
    } else if (transferDto.phoneNumber) {
      newOwner = await this.usersService.findByPhone(transferDto.phoneNumber);
    } else {
      throw new BadRequestException('Either email or phoneNumber is required');
    }

    if (!newOwner) {
      throw new NotFoundException('Recipient user not found. They must have an account.');
    }

    if (newOwner.id === userId) {
      throw new BadRequestException('Cannot transfer ticket to yourself');
    }

    const oldOwnerId = ticket.ownerId;
    ticket.ownerId = newOwner.id;
    ticket.transferredAt = new Date();
    ticket.status = TicketStatus.TRANSFERRED;

    const savedTicket = await this.ticketRepository.save(ticket);

    // Notify both old and new owners (async, non-blocking)
    Promise.resolve().then(async () => {
      try {
        // Notify new owner
        if (newOwner.id) {
          this.notificationsService.createNotification({
            userId: newOwner.id,
            title: 'Ticket Transferred to You',
            message: `You received a ticket for ${ticket.event?.title || 'an event'}. Check your tickets to view it.`,
            type: NotificationType.TICKET_TRANSFERRED,
            metadata: {
              ticketId: savedTicket.id,
              eventId: ticket.eventId,
              link: `/tickets/${savedTicket.id}`,
            },
          }).catch((err) => {
            this.logger.warn(`Failed to notify new ticket owner: ${err.message}`);
          });
        }

        // Notify old owner
        if (oldOwnerId) {
          this.notificationsService.createNotification({
            userId: oldOwnerId,
            title: 'Ticket Transferred',
            message: `Your ticket for ${ticket.event?.title || 'an event'} has been transferred to ${newOwner.email || newOwner.phoneNumber || 'another user'}.`,
            type: NotificationType.TICKET_TRANSFERRED,
            metadata: {
              ticketId: savedTicket.id,
              eventId: ticket.eventId,
              link: `/tickets`,
            },
          }).catch((err) => {
            this.logger.warn(`Failed to notify old ticket owner: ${err.message}`);
          });
        }
      } catch (error) {
        this.logger.error(`Error sending transfer notifications: ${error}`);
      }
    });

    return savedTicket;
  }

  async voidTicket(ticketId: string, reason: string, userId: string): Promise<Ticket> {
    const ticket = await this.findOne(ticketId, userId);

    ticket.status = TicketStatus.VOIDED;
    ticket.voidedAt = new Date();
    ticket.voidReason = reason;

    return this.ticketRepository.save(ticket);
  }

  async generateTicketPDF(ticketId: string, userId?: string): Promise<Buffer> {
    // For guest users, userId will be undefined
    // findOne will allow access if ticket has no ownerId (guest ticket)
    const ticket = await this.findOne(ticketId, userId);

    if (!ticket.event) {
      throw new NotFoundException('Event information not found for this ticket');
    }

    if (!ticket.ticketType) {
      throw new NotFoundException('Ticket type information not found for this ticket');
    }

    const event = ticket.event;
    const attendeeName = ticket.owner
      ? `${ticket.owner.firstName || ''} ${ticket.owner.lastName || ''}`.trim() || 'Guest'
      : 'Guest';

    // Format event date
    const eventDate = new Date(event.startsAt).toLocaleDateString('en-KE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Format price
    const priceCents = ticket.ticketType.priceCents || 0;
    const price = priceCents > 0 ? `KES ${(priceCents / 100).toLocaleString()}` : 'Free';

    // Get order number from order item
    let orderNumber = 'N/A';
    if (ticket.orderItem?.order) {
      orderNumber = ticket.orderItem.order.orderNumber || 'N/A';
    }

    return this.pdfService.generateTicketPDF({
      eventTitle: event.title,
      ticketNumber: ticket.ticketNumber,
      attendeeName,
      eventDate,
      eventLocation: event.venue?.address || event.venue?.name || 'Location TBA',
      qrCodeDataUrl: ticket.qrCode,
      ticketType: ticket.ticketType.name,
      price,
      orderNumber,
    });
  }
}

