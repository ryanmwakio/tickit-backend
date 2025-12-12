import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { TicketType } from '../../database/entities/ticket-type.entity';
import { Ticket, TicketStatus } from '../../database/entities/ticket.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../../database/entities/payment.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentsService } from '../payments/payments.service';
import { RedisService } from '../../common/services/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeNotificationService } from '../../common/services/realtime-notification.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(TicketType)
    private ticketTypeRepository: Repository<TicketType>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private paymentsService: PaymentsService,
    private redisService: RedisService,
    private notificationsService: NotificationsService,
    private realtimeNotificationService: RealtimeNotificationService,
    private dataSource: DataSource,
  ) {}

  async create(buyerId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate ticket types and check availability
      const ticketTypes = await Promise.all(
        createOrderDto.items.map((item) =>
          this.ticketTypeRepository.findOne({
            where: { id: item.ticketTypeId },
            relations: ['event'],
          }),
        ),
      );

      for (let i = 0; i < ticketTypes.length; i++) {
        const ticketType = ticketTypes[i];
        if (!ticketType) {
          throw new NotFoundException(`Ticket type ${createOrderDto.items[i].ticketTypeId} not found`);
        }

        const available = ticketType.quantityTotal - ticketType.quantitySold;
        if (available < createOrderDto.items[i].quantity) {
          throw new BadRequestException(`Insufficient tickets for ${ticketType.name}`);
        }
      }

      // Calculate total
      let totalAmountCents = 0;
      const orderItems: OrderItem[] = [];

      for (let i = 0; i < createOrderDto.items.length; i++) {
        const item = createOrderDto.items[i];
        const ticketType = ticketTypes[i];
        
        if (!ticketType) {
          throw new NotFoundException(`Ticket type not found for item ${i}`);
        }
        
        const unitPrice = ticketType.priceCents;
        const totalPrice = unitPrice * item.quantity;
        totalAmountCents += totalPrice;

        const orderItem = this.orderItemRepository.create({
          id: uuidv4(),
          ticketTypeId: ticketType.id,
          ticketTypeName: ticketType.name,
          quantity: item.quantity,
          unitPriceCents: unitPrice,
          totalPriceCents: totalPrice,
        });
        orderItems.push(orderItem);
      }

      // Create order
      const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const order = this.orderRepository.create({
        id: uuidv4(),
        buyerId,
        organiserId: createOrderDto.organiserId,
        orderNumber,
        status: OrderStatus.PENDING,
        totalAmountCents,
        currency: 'KES',
        metadata: createOrderDto.metadata,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items
      for (const orderItem of orderItems) {
        orderItem.orderId = savedOrder.id;
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedOrder.id, buyerId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: string, userId?: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['buyer', 'organiser', 'items', 'items.ticketType', 'items.tickets', 'payments'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Access control:
    // - If userId is provided, it must match buyerId (logged-in user)
    // - If userId is not provided and buyerId is null, allow access (guest order)
    // - If userId is not provided but buyerId exists, deny access (trying to access another user's order)
    if (userId) {
      if (order.buyerId && order.buyerId !== userId) {
        throw new ForbiddenException('Access denied');
      }
    } else {
      // Guest trying to access order - only allow if order is also a guest order
      if (order.buyerId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return order;
  }

  async findAll(
    userId: string,
    organiserId?: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: any = { buyerId: userId };
    if (organiserId) {
      where.organiserId = organiserId;
    }
    if (status) {
      where.status = status;
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      relations: ['organiser', 'buyer', 'items', 'items.ticketType', 'items.ticketType.event', 'items.tickets', 'payments'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async checkout(
    buyerId: string | undefined,
    checkoutDto: CheckoutDto,
    idempotencyKey: string,
    ipAddress?: string,
  ): Promise<{ order: Order; paymentInstructions?: any }> {
    // Check idempotency key
    const idempotencyCheck = await this.redisService.checkIdempotencyKey(idempotencyKey, 3600);
    
    if (!idempotencyCheck.isNew) {
      // This is a duplicate request, return cached response if available
      if (idempotencyCheck.cachedResponse) {
        return idempotencyCheck.cachedResponse;
      }
      throw new ConflictException('Duplicate request detected');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Hold IDs for cleanup on error
    const holdIds: string[] = [];

    try {
      // Hold seats in Redis first to prevent overselling
      // Use queryRunner.manager for all queries within transaction
      const ticketTypes = await Promise.all(
        checkoutDto.items.map((item) =>
          queryRunner.manager.findOne(TicketType, {
            where: { id: item.ticketTypeId },
            relations: ['event'],
          }),
        ),
      );

      for (let i = 0; i < ticketTypes.length; i++) {
        const ticketType = ticketTypes[i];
        if (!ticketType) {
          throw new NotFoundException(`Ticket type ${checkoutDto.items[i].ticketTypeId} not found`);
        }

        // Get current hold count
        const holdCount = await this.redisService.getHoldCount(
          ticketType.eventId,
          ticketType.id,
        );

        // Check availability including holds
        const available = ticketType.quantityTotal - ticketType.quantitySold - holdCount;
        if (available < checkoutDto.items[i].quantity) {
          // Release any holds we created
          for (const holdId of holdIds) {
            await this.redisService.releaseSeatHold(holdId);
          }
          throw new ConflictException(`Insufficient tickets for ${ticketType.name}`);
        }

        // Create seat hold
        const holdId = await this.redisService.holdSeats(
          ticketType.eventId,
          ticketType.id,
          checkoutDto.items[i].quantity,
          600, // 10 minutes TTL
        );
        holdIds.push(holdId);
      }

      // Now proceed with order creation using pessimistic locks
      // Use queryRunner.manager for pessimistic locks within transaction
      const lockedTicketTypes = await Promise.all(
        checkoutDto.items.map((item) =>
          queryRunner.manager.findOne(TicketType, {
            where: { id: item.ticketTypeId },
            relations: ['event'],
            lock: { mode: 'pessimistic_write' },
          }),
        ),
      );

      // Validate locked ticket types
      for (let i = 0; i < lockedTicketTypes.length; i++) {
        if (!lockedTicketTypes[i]) {
          throw new NotFoundException(`Ticket type ${checkoutDto.items[i].ticketTypeId} not found`);
        }
      }

      // Calculate total (apply promo code if provided)
      let totalAmountCents = 0;
      const orderItems: OrderItem[] = [];

      for (let i = 0; i < checkoutDto.items.length; i++) {
        const item = checkoutDto.items[i];
        const ticketType = lockedTicketTypes[i];
        
        if (!ticketType) {
          throw new NotFoundException(`Ticket type ${item.ticketTypeId} not found`);
        }
        
        const unitPrice = ticketType.priceCents;
        const totalPrice = unitPrice * item.quantity;
        totalAmountCents += totalPrice;

        const orderItem = queryRunner.manager.create(OrderItem, {
          id: uuidv4(),
          ticketTypeId: ticketType.id,
          ticketTypeName: ticketType.name,
          quantity: item.quantity,
          unitPriceCents: unitPrice,
          totalPriceCents: totalPrice,
        });
        orderItems.push(orderItem);
      }

      // Apply promo code discount if provided in metadata
      let discountCents = 0;
      if (checkoutDto.metadata?.promoCode) {
        // Promo code validation will be handled in a separate service call
        // For now, store the promo code in order metadata for later processing
        // TODO: Integrate PromoCodesService properly via dependency injection
      }

      // Create order
      const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const order = queryRunner.manager.create(Order, {
        id: uuidv4(),
        buyerId,
        organiserId: checkoutDto.organiserId,
        orderNumber,
        status: OrderStatus.PENDING,
        totalAmountCents,
        currency: 'KES',
        metadata: {
          ...checkoutDto.metadata,
          idempotencyKey,
        },
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items
      for (const orderItem of orderItems) {
        orderItem.orderId = savedOrder.id;
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();

      // Release seat holds since order is created
      for (const holdId of holdIds) {
        await this.redisService.releaseSeatHold(holdId);
      }

      // If skipPayment is true, automatically mark order as paid and generate tickets
      // COMPLETELY SKIP all payment processing
      if (checkoutDto.skipPayment) {
        this.logger.log(`Skipping payment for order ${savedOrder.id} (development mode - no payment processing)`);
        const markAsPaidUserId = buyerId || 'system';
        const orderWithRelations = await this.markAsPaid(savedOrder.id, markAsPaidUserId);
        return {
          order: orderWithRelations,
          paymentInstructions: {
            skipped: true,
            message: 'Payment skipped in development mode',
          },
        };
      }

      // Only process payment if skipPayment is false
      // Initiate payment based on method
      // Payment service failures should not prevent order creation
      let paymentInstructions: any;
      if (checkoutDto.payment.method === 'mpesa_express') {
        const phoneNumber = checkoutDto.payment.metadata?.phone;
        if (!phoneNumber) {
          throw new BadRequestException('Phone number required for MPesa Express');
        }
        try {
          const paymentResult = await this.paymentsService.processMpesaExpress(
            savedOrder.id,
            phoneNumber,
          );
          paymentInstructions = {
            checkoutToken: paymentResult.checkoutToken,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
          };
        } catch (paymentError: any) {
          // Log payment error but don't fail the order
          // Order is already created, user can retry payment later
          this.logger.error(`Payment initiation failed for order ${savedOrder.id}: ${paymentError.message}`);
          paymentInstructions = {
            error: 'Payment initiation failed. Please retry payment.',
            orderId: savedOrder.id,
          };
        }
      }

      const orderWithRelations = await this.findOne(savedOrder.id, buyerId);
      const response = {
        order: orderWithRelations,
        paymentInstructions,
      };

      // Cache response for idempotency
      await this.redisService.cacheIdempotencyResponse(idempotencyKey, response, 3600);

      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      // Release seat holds on error
      for (const holdId of holdIds) {
        await this.redisService.releaseSeatHold(holdId);
      }
      
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async resendTickets(orderId: string, userId: string, method: 'email' | 'sms'): Promise<{ sent: boolean }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, buyerId: userId },
      relations: ['items', 'items.ticketType', 'items.ticketType.event', 'buyer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Order must be paid to resend tickets');
    }

    // Get all tickets for this order
    const tickets = await this.ticketRepository.find({
      where: { orderItem: { orderId: order.id } },
      relations: ['ticketType', 'ticketType.event', 'orderItem'],
    });

    if (tickets.length === 0) {
      throw new BadRequestException('No tickets found for this order');
    }

    let sent = false;
    if (method === 'email' && order.buyer?.email) {
      for (const ticket of tickets) {
        try {
          const sentResult = await this.notificationsService.sendTicketEmail(
            order.buyer.email!,
            ticket.ticketNumber,
            ticket.ticketType?.event?.title || 'Event',
            ticket.qrCode,
            {
              ticketId: ticket.id,
              ticketType: ticket.ticketType?.name,
            },
          );
          sent = sentResult;
        } catch (error: any) {
          this.logger.error(`Failed to resend ticket email for order ${orderId}: ${error.message}`);
          // Continue with other tickets even if one fails
        }
      }
    } else if (method === 'sms' && order.buyer?.phoneNumber) {
      // Send SMS with ticket link
      const message = `Your tickets for ${tickets[0].ticketType?.event?.title || 'event'}: ${tickets.map(t => t.ticketNumber).join(', ')}`;
      sent = await this.notificationsService.sendSMS(order.buyer.phoneNumber, message);
    } else {
      throw new BadRequestException(`Cannot send via ${method}: ${method === 'email' ? 'email' : 'phone number'} not available`);
    }

    return { sent };
  }

  async markAsPaid(orderId: string, userId: string): Promise<Order> {
    // For system operations (skipPayment), bypass access control
    const order = userId === 'system' 
      ? await this.orderRepository.findOne({
          where: { id: orderId },
          relations: ['buyer', 'organiser', 'items', 'items.ticketType', 'items.tickets', 'payments'],
        })
      : await this.findOne(orderId, userId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in pending status');
    }

    // Update ticket types sold count (can be done in parallel)
    const incrementPromises = (order.items || []).map((item) =>
      this.ticketTypeRepository.increment(
        { id: item.ticketTypeId },
        'quantitySold',
        item.quantity,
      ),
    );
    await Promise.all(incrementPromises);

    // Generate tickets (this is the critical path - must be fast)
    await this.generateTickets(order);

    // Create mock payment record if this is a skipPayment operation
    if (userId === 'system') {
      const mockPayment = this.paymentRepository.create({
        id: uuidv4(),
        orderId: order.id,
        transactionId: `MOCK-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        method: PaymentMethod.MPESA, // Default to MPesa, can be changed based on checkoutDto if needed
        status: PaymentStatus.COMPLETED,
        amountCents: order.totalAmountCents,
        currency: order.currency || 'KES',
        metadata: {
          skipped: true,
          message: 'Payment skipped in development mode',
        },
      });
      // Save payment in background (non-blocking) to speed up response
      this.paymentRepository.save(mockPayment).catch((error) => {
        this.logger.warn(`Failed to save mock payment for order ${order.id}:`, error);
      });
      this.logger.log(`Created mock payment record ${mockPayment.id} for order ${order.id}`);
    }

    // Update order status immediately (before payment record) so tickets are available
    order.status = OrderStatus.PAID;
    await this.orderRepository.save(order);

    // Send real-time notification for order payment
    // For system operations, reload order without access control
    const orderWithRelations = userId === 'system'
      ? await this.orderRepository.findOne({
          where: { id: orderId },
          relations: ['buyer', 'organiser', 'items', 'items.ticketType', 'items.ticketType.event', 'items.tickets', 'payments'],
        })
      : await this.findOne(orderId, userId);

    if (!orderWithRelations) {
      throw new NotFoundException('Order not found after payment');
    }

    if (orderWithRelations.items && orderWithRelations.items.length > 0) {
      const firstItem = orderWithRelations.items[0];
      const eventId = firstItem.ticketType?.eventId;
      const eventTitle = firstItem.ticketType?.event?.title || 'Event';
      
      if (eventId && order.organiserId) {
        // Only send notification if we have a real userId (not 'system')
        if (userId !== 'system') {
          await this.realtimeNotificationService.notifyOrderPaid(
            orderId,
            order.orderNumber,
            eventId,
            eventTitle,
            userId,
            order.organiserId,
          );
        }
      }
    }

    return orderWithRelations;
  }

  private async generateTickets(order: Order): Promise<void> {
    const startTime = Date.now();
    try {
      // Reload order with items and buyer
      const orderWithItems = await this.orderRepository.findOne({
        where: { id: order.id },
        relations: ['items', 'items.ticketType', 'items.ticketType.event', 'buyer'],
      });

      if (!orderWithItems || !orderWithItems.items) {
        this.logger.warn(`Order ${order.id} has no items, skipping ticket generation`);
        return;
      }

      // Prepare all tickets first (non-blocking operations)
      const ticketsToCreate: Array<{
        ticket: Ticket;
        qrCode: string;
        eventName: string;
        ticketTypeName: string;
        eventId?: string;
        buyerId?: string;
      }> = [];

      // Generate QR codes in parallel for better performance
      const qrCodePromises: Promise<void>[] = [];

      for (const item of orderWithItems.items) {
        for (let i = 0; i < item.quantity; i++) {
          const ticketId = uuidv4();
          const ticketNumber = `TKT${Date.now()}${Math.floor(Math.random() * 1000000)}`;
          const qrPayload = JSON.stringify({
            ticketId,
            orderId: order.id,
            ticketNumber,
            eventId: item.ticketType?.eventId,
          });

          // Generate QR code asynchronously with optimized settings for speed
          // Using smaller size and lower error correction for faster generation
          const qrPromise = QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'M', // Medium error correction (faster than 'H')
            margin: 1,
            width: 200, // Smaller size for faster generation
          }).then((qrCode) => {
            const ticket = this.ticketRepository.create({
              id: ticketId,
              orderItemId: item.id,
              ticketTypeId: item.ticketTypeId,
              eventId: item.ticketType?.eventId || item.ticketType?.event?.id || '',
              ticketNumber,
              qrCode,
              ownerId: order.buyerId,
              status: TicketStatus.ACTIVE,
            });

            ticketsToCreate.push({
              ticket,
              qrCode,
              eventName: item.ticketType?.event?.title || 'Event',
              ticketTypeName: item.ticketType?.name || 'Ticket',
              eventId: item.ticketType?.eventId,
              buyerId: order.buyerId,
            });
          }).catch((error) => {
            this.logger.error(`Failed to generate QR code for ticket ${ticketId}:`, error);
            // Create ticket without QR code (will be regenerated later if needed)
            const ticket = this.ticketRepository.create({
              id: ticketId,
              orderItemId: item.id,
              ticketTypeId: item.ticketTypeId,
              eventId: item.ticketType?.eventId || item.ticketType?.event?.id || '',
              ticketNumber,
              qrCode: '', // Empty QR code, will be set later
              ownerId: order.buyerId,
              status: TicketStatus.ACTIVE,
            });
            ticketsToCreate.push({
              ticket,
              qrCode: '',
              eventName: item.ticketType?.event?.title || 'Event',
              ticketTypeName: item.ticketType?.name || 'Ticket',
              eventId: item.ticketType?.eventId,
              buyerId: order.buyerId,
            });
          });

          qrCodePromises.push(qrPromise);
        }
      }

      // Wait for all QR codes to be generated (with timeout to prevent hanging)
      const qrCodeTimeout = Promise.race([
        Promise.all(qrCodePromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('QR code generation timeout')), 5000)
        ),
      ]).catch((error) => {
        this.logger.warn(`QR code generation timeout or error for order ${order.id}, creating tickets without QR codes:`, error);
        // Create tickets without QR codes if generation fails
        if (!orderWithItems || !orderWithItems.items) return;
        for (const item of orderWithItems.items) {
          for (let i = 0; i < item.quantity; i++) {
            const ticketId = uuidv4();
            const ticketNumber = `TKT${Date.now()}${Math.floor(Math.random() * 1000000)}`;
            const ticket = this.ticketRepository.create({
              id: ticketId,
              orderItemId: item.id,
              ticketTypeId: item.ticketTypeId,
              eventId: item.ticketType?.eventId || item.ticketType?.event?.id || '',
              ticketNumber,
              qrCode: '', // Will be generated later if needed
              ownerId: order.buyerId,
              status: TicketStatus.ACTIVE,
            });
            ticketsToCreate.push({
              ticket,
              qrCode: '',
              eventName: item.ticketType?.event?.title || 'Event',
              ticketTypeName: item.ticketType?.name || 'Ticket',
              eventId: item.ticketType?.eventId,
              buyerId: order.buyerId,
            });
          }
        }
      });

      await qrCodeTimeout;

      // Save all tickets in batch for better performance
      if (ticketsToCreate.length > 0) {
        const ticketsToSave = ticketsToCreate.map((t) => t.ticket);
        const savedTickets = await this.ticketRepository.save(ticketsToSave);
        
        this.logger.log(`Successfully generated ${savedTickets.length} tickets for order ${order.id} in ${Date.now() - startTime}ms`);

        // Send notifications asynchronously (fire-and-forget) to avoid blocking
        // This ensures tickets are saved even if notifications fail
        // Use Promise.resolve().then() to make it truly non-blocking
        Promise.resolve().then(async () => {
          try {
            // Create in-app notification for ticket generation (sent when tickets are created)
            if (orderWithItems.buyerId && ticketsToCreate.length > 0) {
              const firstTicketData = ticketsToCreate[0];
              const eventName = firstTicketData.eventName || 'event';
              
              // Send TICKET_CREATED notification when tickets are generated
              this.notificationsService.createNotification({
                userId: orderWithItems.buyerId,
                title: 'Tickets Generated',
                message: `Your ${savedTickets.length} ticket${savedTickets.length > 1 ? 's' : ''} for ${eventName} ${savedTickets.length > 1 ? 'have' : 'has'} been generated!`,
                type: NotificationType.TICKET_CREATED,
                metadata: {
                  orderId: orderWithItems.id,
                  ticketIds: savedTickets.map(t => t.id),
                  eventId: firstTicketData.eventId,
                  link: `/orders/${orderWithItems.id}`,
                },
              }).catch((error) => {
                this.logger.warn(`Failed to create ticket created notification:`, error);
              });

              // Also send TICKET_DELIVERED notification (for backward compatibility and clarity)
              this.notificationsService.createNotification({
                userId: orderWithItems.buyerId,
                title: 'Tickets Delivered',
                message: `Your ${savedTickets.length} ticket${savedTickets.length > 1 ? 's' : ''} for ${eventName} ${savedTickets.length > 1 ? 'have' : 'has'} been delivered!`,
                type: NotificationType.TICKET_DELIVERED,
                metadata: {
                  orderId: orderWithItems.id,
                  ticketIds: savedTickets.map(t => t.id),
                  eventId: firstTicketData.eventId,
                  link: `/orders/${orderWithItems.id}`,
                },
              }).catch((error) => {
                this.logger.warn(`Failed to create ticket delivery notification:`, error);
              });
            }

            // Send real-time notifications (non-blocking)
            const notificationPromises = savedTickets.map((savedTicket, i) => {
              const ticketData = ticketsToCreate[i];
              
              if (ticketData.buyerId && ticketData.eventId) {
                return this.realtimeNotificationService.notifyTicketCreated(
                  savedTicket.id,
                  savedTicket.ticketNumber,
                  ticketData.eventId,
                  ticketData.eventName,
                  ticketData.buyerId,
                ).catch((error) => {
                  this.logger.warn(`Failed to send real-time notification for ticket ${savedTicket.id}:`, error);
                });
              }
              return Promise.resolve();
            });

            await Promise.allSettled(notificationPromises);

            // Send email notifications (non-blocking)
            if (orderWithItems.buyer && orderWithItems.buyer.email) {
              const emailPromises = savedTickets.map((savedTicket, i) => {
                const ticketData = ticketsToCreate[i];
                
                return this.notificationsService.sendTicketEmail(
                  orderWithItems.buyer!.email!,
                  savedTicket.ticketNumber,
                  ticketData.eventName,
                  ticketData.qrCode || savedTicket.qrCode,
                  {
                    ticketId: savedTicket.id,
                    ticketType: ticketData.ticketTypeName,
                  },
                ).catch((error) => {
                  this.logger.warn(`Failed to send email for ticket ${savedTicket.id}:`, error);
                });
              });

              await Promise.allSettled(emailPromises);
            }
          } catch (error) {
            this.logger.error(`Error in background notification tasks for order ${order.id}:`, error);
          }
        }).catch((error) => {
          this.logger.error(`Critical error in background notification tasks for order ${order.id}:`, error);
        });
      }
    } catch (error) {
      this.logger.error(`Failed to generate tickets for order ${order.id}:`, error);
      // Don't throw - we want the order to be marked as paid even if ticket generation partially fails
      // Tickets can be regenerated later if needed
    }
  }
}

