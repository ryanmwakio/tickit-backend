import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from '../../database/entities/payment.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { MpesaService } from '../../common/services/mpesa.service';
import { isolatedServiceCall, circuitBreakers } from '../../common/utils/service-isolation.util';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private mpesaService: MpesaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async create(createDto: {
    orderId: string;
    method: PaymentMethod;
    amountCents: number;
    currency?: string;
    transactionId?: string;
    metadata?: Record<string, any>;
  }): Promise<Payment> {
    const order = await this.orderRepository.findOne({ where: { id: createDto.orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const payment = this.paymentRepository.create({
      id: uuidv4(),
      orderId: createDto.orderId,
      transactionId: createDto.transactionId || uuidv4(),
      method: createDto.method,
      amountCents: createDto.amountCents,
      currency: createDto.currency || 'KES',
      status: PaymentStatus.PENDING,
      metadata: createDto.metadata,
    });

    return this.paymentRepository.save(payment);
  }

  async findAll(orderId?: string): Promise<Payment[]> {
    const where: any = {};
    if (orderId) where.orderId = orderId;

    return this.paymentRepository.find({
      where,
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updateStatus(id: string, status: PaymentStatus, transactionId?: string): Promise<Payment> {
    const payment = await this.findOne(id);
    const previousStatus = payment.status;
    payment.status = status;
    if (transactionId) {
      payment.transactionId = transactionId;
    }
    const saved = await this.paymentRepository.save(payment);

    // Send notifications on status change
    if (previousStatus !== status) {
      const order = await this.orderRepository.findOne({
        where: { id: payment.orderId },
      });

      if (order?.buyerId) {
        if (status === PaymentStatus.COMPLETED) {
          this.notificationsService.createNotification({
            userId: order.buyerId,
            title: 'Payment Successful',
            message: `Your payment of KES ${(payment.amountCents / 100).toLocaleString()} was successful.`,
            type: NotificationType.PAYMENT_SUCCESSFUL,
            metadata: {
              orderId: order.id,
              amount: payment.amountCents,
              paymentMethod: payment.method,
              link: `/orders/${order.id}`,
            },
          }).catch((err) => this.logger.error(`Failed to create payment notification: ${err.message}`));
        } else if (status === PaymentStatus.FAILED) {
          this.notificationsService.createNotification({
            userId: order.buyerId,
            title: 'Payment Failed',
            message: `Payment for order ${order.orderNumber} failed. Please try again.`,
            type: NotificationType.PAYMENT_FAILED,
            metadata: {
              orderId: order.id,
              amount: payment.amountCents,
              paymentMethod: payment.method,
              link: `/orders/${order.id}`,
            },
          }).catch((err) => this.logger.error(`Failed to create payment notification: ${err.message}`));
        }
      }
    }

    return saved;
  }

  async processMpesaExpress(
    orderId: string,
    phoneNumber: string,
    amountCents?: number,
  ): Promise<{
    checkoutToken: string;
    payment: Payment;
  }> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const amount = amountCents || order.totalAmountCents;

    // Create payment record
    const payment = await this.create({
      orderId,
      method: PaymentMethod.MPESA,
      amountCents: amount,
      currency: order.currency,
      metadata: { phoneNumber, method: 'express' },
    });

    // Use circuit breaker for MPesa API call
    const stkResult = await isolatedServiceCall(
      'Payments.processMpesaExpress',
      () => circuitBreakers.mpesa.execute(() =>
        this.mpesaService.initiateStkPush(
          phoneNumber,
          Math.floor(amount / 100), // Convert cents to shillings
          order.orderNumber,
          `Payment for order ${order.orderNumber}`,
        )
      ),
      {
        timeout: 15000, // 15 seconds for MPesa
        retries: 1,
        critical: false, // Non-critical - payment record is created, can retry later
        fallback: async () => {
          // Return a stub response if MPesa is down
          this.logger.warn(`MPesa service unavailable for order ${orderId}, payment record created but not initiated`);
          return {
            checkoutRequestID: `STUB-${payment.id}`,
            merchantRequestID: `STUB-${payment.id}`,
          };
        },
      },
    );

    if (stkResult) {
      // Store checkout request ID in payment metadata
      payment.metadata = {
        ...payment.metadata,
        checkoutRequestID: stkResult.checkoutRequestID,
        merchantRequestID: stkResult.merchantRequestID,
      };
      await this.paymentRepository.save(payment);

      return {
        checkoutToken: stkResult.checkoutRequestID,
        payment,
      };
    } else {
      // MPesa service unavailable - mark payment as pending for manual retry
      payment.status = PaymentStatus.PENDING;
      payment.metadata = {
        ...payment.metadata,
        error: 'MPesa service temporarily unavailable',
      };
      await this.paymentRepository.save(payment);
      
      throw new BadRequestException('Payment service temporarily unavailable. Please try again later.');
    }
  }

  async processCardPayment(
    orderId: string,
    token: string,
    amountCents?: number,
  ): Promise<Payment> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const amount = amountCents || order.totalAmountCents;

    // Create payment record
    const payment = await this.create({
      orderId,
      method: PaymentMethod.CARD,
      amountCents: amount,
      currency: order.currency,
      metadata: { token: '[REDACTED]' }, // Don't store raw token
    });

    // TODO: Integrate with card payment gateway (Stripe, etc.)
    // For now, mark as pending
    payment.status = PaymentStatus.PENDING;
    await this.paymentRepository.save(payment);

    return payment;
  }

  async handleMpesaCallback(callbackData: any): Promise<boolean> {
    try {
      // Use circuit breaker for MPesa callback processing
      const result = await isolatedServiceCall(
        'Payments.handleMpesaCallback',
        () => circuitBreakers.mpesa.execute(() => this.mpesaService.processCallback(callbackData)),
        {
          timeout: 10000,
          retries: 1,
          critical: false, // Non-critical - can retry callback processing
        },
      );

      if (!result) {
        this.logger.error('Failed to process MPesa callback - service unavailable');
        return false;
      }

      // Find payment by checkout request ID
      const checkoutRequestID = result.checkoutRequestID || callbackData.Body?.stkCallback?.CheckoutRequestID;
      if (!checkoutRequestID) {
        return false;
      }

      const payment = await this.paymentRepository.findOne({
        where: { metadata: { checkoutRequestID } } as any,
        relations: ['order'],
      });

      if (!payment) {
        return false;
      }

      // Update payment status based on result code
      if (result.resultCode === '0') {
        // Success
        payment.status = PaymentStatus.COMPLETED;
        if (result.mpesaReceiptNumber) {
          payment.transactionId = result.mpesaReceiptNumber;
        }
        payment.metadata = {
          ...payment.metadata,
          mpesaReceiptNumber: result.mpesaReceiptNumber,
          transactionDate: result.transactionDate,
          phoneNumber: result.phoneNumber,
        };

        // Reload order with relations
        const order = await this.orderRepository.findOne({
          where: { id: payment.orderId },
          relations: ['buyer'],
        });

        // Update order status
        if (order) {
          order.status = OrderStatus.PAID;
          await this.orderRepository.save(order);

          // Send payment successful notification
          if (order.buyerId) {
            this.notificationsService.createNotification({
              userId: order.buyerId,
              title: 'Payment Successful',
              message: `Your payment of KES ${(payment.amountCents / 100).toLocaleString()} for order ${order.orderNumber} was successful.`,
              type: NotificationType.PAYMENT_SUCCESSFUL,
              metadata: {
                orderId: order.id,
                amount: payment.amountCents,
                paymentMethod: 'MPesa',
                link: `/orders/${order.id}`,
              },
            }).catch((err) => this.logger.error(`Failed to create payment notification: ${err.message}`));
          }
        }
      } else {
        // Failed
        payment.status = PaymentStatus.FAILED;
        payment.metadata = {
          ...payment.metadata,
          errorCode: result.resultCode,
          errorMessage: result.resultDesc,
        };

        // Reload order for notification
        const order = await this.orderRepository.findOne({
          where: { id: payment.orderId },
        });

        // Send payment failed notification
        if (order?.buyerId) {
          this.notificationsService.createNotification({
            userId: order.buyerId,
            title: 'Payment Failed',
            message: `Payment for order ${order.orderNumber} failed. Please try again.`,
            type: NotificationType.PAYMENT_FAILED,
            metadata: {
              orderId: order.id,
              amount: payment.amountCents,
              paymentMethod: 'MPesa',
              link: `/orders/${order.id}`,
            },
          }).catch((err) => this.logger.error(`Failed to create payment notification: ${err.message}`));
        }
      }

      await this.paymentRepository.save(payment);
      return true;
    } catch (error) {
      return false;
    }
  }

  async handleWebhook(provider: string, payload: any, headers: any): Promise<boolean> {
    // TODO: Verify webhook signature based on provider
    // TODO: Process webhook based on provider type
    // TODO: Update payment/order status accordingly

    // Stub implementation
    return true;
  }

  async confirmMpesaPayment(paymentId: string, transactionId: string): Promise<Payment> {
    const payment = await this.findOne(paymentId);

    if (payment.method !== PaymentMethod.MPESA) {
      throw new BadRequestException('Payment is not MPesa');
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.transactionId = transactionId;
    await this.paymentRepository.save(payment);

    // Update order status
    const order = await this.orderRepository.findOne({ where: { id: payment.orderId } });
    if (order) {
      order.status = OrderStatus.PAID;
      await this.orderRepository.save(order);
    }

    return payment;
  }
}

