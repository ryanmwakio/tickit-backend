import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Refund, RefundStatus, RefundPriority } from '../../database/entities/refund.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Payment, PaymentStatus } from '../../database/entities/payment.entity';
import { Ticket, TicketStatus } from '../../database/entities/ticket.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefundsService {
  constructor(
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async create(
    orderId: string,
    reason: string,
    userId: string,
    priority: RefundPriority = RefundPriority.NORMAL,
  ): Promise<Refund> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, buyerId: userId },
      relations: ['items', 'payments'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    // Check if refund already exists
    const existingRefund = await this.refundRepository.findOne({
      where: { orderId, status: RefundStatus.PENDING },
    });

    if (existingRefund) {
      throw new BadRequestException('Refund request already exists for this order');
    }

    // Get the payment
    const payment = order.payments?.find((p) => p.status === PaymentStatus.COMPLETED);
    if (!payment) {
      throw new BadRequestException('No completed payment found for this order');
    }

    const refundNumber = `REF${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const refund = this.refundRepository.create({
      id: uuidv4(),
      orderId,
      refundNumber,
      status: RefundStatus.PENDING,
      priority,
      amountCents: order.totalAmountCents,
      currency: order.currency,
      reason,
      metadata: {
        paymentId: payment.id,
        requestedBy: userId,
      },
    });

    return this.refundRepository.save(refund);
  }

  async findAll(
    query: {
      page?: number;
      limit?: number;
      status?: RefundStatus;
      orderId?: string;
      userId?: string;
    },
  ): Promise<{
    data: Refund[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, status, orderId, userId } = query;

    const queryBuilder = this.refundRepository
      .createQueryBuilder('refund')
      .leftJoinAndSelect('refund.order', 'order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('refund.processedBy', 'processedBy');

    if (status) {
      queryBuilder.andWhere('refund.status = :status', { status });
    }

    if (orderId) {
      queryBuilder.andWhere('refund.orderId = :orderId', { orderId });
    }

    if (userId) {
      queryBuilder.andWhere('order.buyerId = :userId', { userId });
    }

    queryBuilder
      .orderBy('refund.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [refunds, total] = await queryBuilder.getManyAndCount();

    return {
      data: refunds,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string): Promise<Refund> {
    const refund = await this.refundRepository.findOne({
      where: { id },
      relations: ['order', 'order.buyer', 'processedBy'],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (userId && refund.order?.buyerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return refund;
  }

  async approve(id: string, processedById: string, allowedOrganiserId?: string): Promise<Refund> {
    const refund = await this.refundRepository.findOne({
      where: { id },
      relations: ['order', 'order.buyer', 'processedBy'],
    });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Refund is not in pending status');
    }
    // Multi-tenant: organisers may only approve refunds for their own events
    if (allowedOrganiserId != null && refund.order?.organiserId !== allowedOrganiserId) {
      throw new ForbiddenException('Access denied: refund is not for your organiser account');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update refund status
      refund.status = RefundStatus.APPROVED;
      refund.processedById = processedById;
      refund.processedAt = new Date();
      await queryRunner.manager.save(refund);

      // Process refund (initiate payment reversal)
      refund.status = RefundStatus.PROCESSING;
      await queryRunner.manager.save(refund);

      // TODO: Integrate with payment provider to process refund
      // For now, mark as completed after processing
      refund.status = RefundStatus.COMPLETED;
      await queryRunner.manager.save(refund);

      // Update order status
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: refund.orderId },
      });

      if (order) {
        order.status = OrderStatus.REFUNDED;
        await queryRunner.manager.save(order);
      }

      // Void all tickets in the order
      const orderWithItems = await queryRunner.manager.findOne(Order, {
        where: { id: refund.orderId },
        relations: ['items'],
      });

      if (orderWithItems?.items) {
        for (const item of orderWithItems.items) {
          const tickets = await queryRunner.manager.find(Ticket, {
            where: { orderItemId: item.id },
          });

          for (const ticket of tickets) {
            ticket.status = TicketStatus.VOIDED;
            ticket.voidedAt = new Date();
            ticket.voidReason = `Refund: ${refund.reason}`;
            await queryRunner.manager.save(ticket);
          }
        }
      }

      await queryRunner.commitTransaction();

      // Send refund processed notification to the order buyer
      if (order?.buyerId) {
        this.notificationsService.createNotification({
          userId: order.buyerId,
          title: 'Refund Processed',
          message: `Your refund of KES ${(refund.amountCents / 100).toLocaleString()} for order ${order.orderNumber} has been processed.`,
          type: NotificationType.REFUND_PROCESSED,
          metadata: {
            refundId: refund.id,
            orderId: order.id,
            amount: refund.amountCents,
            link: `/orders/${order.id}`,
          },
        }).catch((err) => {
          console.error(`Failed to create refund notification: ${err.message}`);
        });
      }

      return refund;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reject(id: string, processedById: string, reason?: string, allowedOrganiserId?: string): Promise<Refund> {
    const refund = await this.refundRepository.findOne({
      where: { id },
      relations: ['order', 'order.buyer', 'processedBy'],
    });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Refund is not in pending status');
    }
    // Multi-tenant: organisers may only reject refunds for their own events
    if (allowedOrganiserId != null && refund.order?.organiserId !== allowedOrganiserId) {
      throw new ForbiddenException('Access denied: refund is not for your organiser account');
    }

    refund.status = RefundStatus.REJECTED;
    refund.processedById = processedById;
    refund.processedAt = new Date();
    if (reason) {
      refund.metadata = {
        ...refund.metadata,
        rejectionReason: reason,
      };
    }

    return this.refundRepository.save(refund);
  }
}

