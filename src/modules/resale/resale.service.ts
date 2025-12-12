import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ResaleListing, ResaleListingStatus } from '../../database/entities/resale-listing.entity';
import { Ticket, TicketStatus } from '../../database/entities/ticket.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { TicketsService } from '../tickets/tickets.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { RedisService } from '../../common/services/redis.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ResaleService {
  constructor(
    @InjectRepository(ResaleListing)
    private resaleListingRepository: Repository<ResaleListing>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private ticketsService: TicketsService,
    private ordersService: OrdersService,
    private paymentsService: PaymentsService,
    private redisService: RedisService,
    private dataSource: DataSource,
  ) {}

  async createListing(ticketId: string, priceCents: number, sellerId: string): Promise<ResaleListing> {
    const ticket = await this.ticketsService.findOne(ticketId, sellerId);

    if (ticket.status !== TicketStatus.ACTIVE) {
      throw new BadRequestException('Only active tickets can be listed for resale');
    }

    if (ticket.ownerId !== sellerId) {
      throw new ForbiddenException('You can only list your own tickets');
    }

    // Check if ticket is already listed
    const existingListing = await this.resaleListingRepository.findOne({
      where: { ticketId, status: ResaleListingStatus.ACTIVE },
    });

    if (existingListing) {
      throw new ConflictException('Ticket is already listed for resale');
    }

    // Get event ID from ticket
    const ticketWithEvent = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['ticketType', 'ticketType.event'],
    });

    const listing = this.resaleListingRepository.create({
      id: uuidv4(),
      ticketId,
      sellerId,
      eventId: ticketWithEvent?.ticketType?.eventId,
      priceCents,
      currency: 'KES',
      status: ResaleListingStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    return this.resaleListingRepository.save(listing);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    eventId?: string;
    priceMin?: number;
    priceMax?: number;
  }): Promise<{
    data: ResaleListing[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, eventId, priceMin, priceMax } = query;

    const queryBuilder = this.resaleListingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.ticket', 'ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('ticketType.event', 'event')
      .leftJoinAndSelect('listing.seller', 'seller')
      .where('listing.status = :status', { status: ResaleListingStatus.ACTIVE })
      .andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > :now)', { now: new Date() });

    if (eventId) {
      queryBuilder.andWhere('listing.eventId = :eventId', { eventId });
    }

    if (priceMin) {
      queryBuilder.andWhere('listing.priceCents >= :priceMin', { priceMin });
    }

    if (priceMax) {
      queryBuilder.andWhere('listing.priceCents <= :priceMax', { priceMax });
    }

    queryBuilder
      .orderBy('listing.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [listings, total] = await queryBuilder.getManyAndCount();

    return {
      data: listings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async purchaseListing(
    listingId: string,
    buyerId: string,
    paymentMethod: { method: string; metadata?: any },
    idempotencyKey: string,
  ): Promise<{ order: Order; ticket: Ticket }> {
    // Check idempotency
    const idempotencyCheck = await this.redisService.checkIdempotencyKey(idempotencyKey, 3600);
    if (!idempotencyCheck.isNew) {
      if (idempotencyCheck.cachedResponse) {
        return idempotencyCheck.cachedResponse;
      }
      throw new ConflictException('Duplicate request detected');
    }

    const listing = await this.resaleListingRepository.findOne({
      where: { id: listingId },
      relations: ['ticket', 'ticket.ticketType', 'ticket.ticketType.event', 'seller'],
    });

    if (!listing) {
      throw new NotFoundException('Resale listing not found');
    }

    if (listing.status !== ResaleListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not active');
    }

    if (listing.sellerId === buyerId) {
      throw new BadRequestException('Cannot purchase your own listing');
    }

    if (listing.expiresAt && listing.expiresAt < new Date()) {
      listing.status = ResaleListingStatus.EXPIRED;
      await this.resaleListingRepository.save(listing);
      throw new BadRequestException('Listing has expired');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the listing
      const lockedListing = await queryRunner.manager.findOne(ResaleListing, {
        where: { id: listingId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedListing || lockedListing.status !== ResaleListingStatus.ACTIVE) {
        throw new ConflictException('Listing is no longer available');
      }

      // Create order for resale purchase
      const orderNumber = `RSL${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const order = queryRunner.manager.create(Order, {
        id: uuidv4(),
        buyerId,
        organiserId: listing.ticket?.ticketType?.event?.organiserId || '',
        orderNumber,
        status: OrderStatus.PENDING,
        totalAmountCents: listing.priceCents,
        currency: listing.currency,
        metadata: {
          resaleListingId: listingId,
          originalTicketId: listing.ticketId,
          idempotencyKey,
        },
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Process payment
      if (paymentMethod.method === 'mpesa_express') {
        const phoneNumber = paymentMethod.metadata?.phone;
        if (!phoneNumber) {
          throw new BadRequestException('Phone number required for MPesa Express');
        }
        await this.paymentsService.processMpesaExpress(savedOrder.id, phoneNumber, listing.priceCents);
      } else {
        throw new BadRequestException('Unsupported payment method');
      }

      // Update listing status
      lockedListing.status = ResaleListingStatus.SOLD;
      await queryRunner.manager.save(lockedListing);

      // Transfer ticket to buyer
      const ticket = await queryRunner.manager.findOne(Ticket, {
        where: { id: listing.ticketId },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      ticket.ownerId = buyerId;
      ticket.transferredAt = new Date();
      ticket.status = TicketStatus.TRANSFERRED;
      await queryRunner.manager.save(ticket);

      await queryRunner.commitTransaction();

      const retrievedOrder = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['items', 'buyer'],
      });

      const updatedTicket = await this.ticketRepository.findOne({
        where: { id: ticket.id },
        relations: ['ticketType', 'ticketType.event', 'owner'],
      });

      if (!retrievedOrder || !updatedTicket) {
        throw new NotFoundException('Failed to retrieve order or ticket after purchase');
      }

      const response = {
        order: retrievedOrder,
        ticket: updatedTicket,
      };

      // Cache response for idempotency
      await this.redisService.cacheIdempotencyResponse(idempotencyKey, response, 3600);

      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelListing(listingId: string, sellerId: string): Promise<void> {
    const listing = await this.resaleListingRepository.findOne({
      where: { id: listingId, sellerId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found or access denied');
    }

    if (listing.status !== ResaleListingStatus.ACTIVE) {
      throw new BadRequestException('Only active listings can be cancelled');
    }

    listing.status = ResaleListingStatus.CANCELLED;
    await this.resaleListingRepository.save(listing);
  }
}

