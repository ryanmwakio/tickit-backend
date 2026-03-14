import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from '../../database/entities/payment.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { MpesaService } from '../../common/services/mpesa.service';
import { IntaSendService } from '../../common/services/intasend.service';
import { isolatedServiceCall, circuitBreakers } from '../../common/utils/service-isolation.util';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { ConfigService } from '@nestjs/config';
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
    private intasendService: IntaSendService,
    private configService: ConfigService,
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
    useIntasend: boolean = true, // Default to IntaSend
  ): Promise<{
    checkoutToken: string;
    payment: Payment;
    invoiceId?: string;
    checkoutUrl?: string;
  }> {
    const order = await this.orderRepository.findOne({ 
      where: { id: orderId },
      relations: ['buyer'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const amount = amountCents || order.totalAmountCents;
    const amountInShillings = amount / 100; // IntaSend expects amount in shillings (decimal)

    // Create payment record
    const payment = await this.create({
      orderId,
      method: PaymentMethod.MPESA,
      amountCents: amount,
      currency: order.currency,
      metadata: { phoneNumber, method: 'express', provider: useIntasend ? 'intasend' : 'mpesa' },
    });

    // Use IntaSend if enabled, otherwise fall back to direct MPesa
    if (useIntasend) {
      try {
        // Get customer info from buyer or order metadata (for guest checkout)
        const buyer = order.buyer;
        let firstName = buyer?.firstName || 'Customer';
        let lastName = buyer?.lastName || '';
        let email = buyer?.email || 'customer@tickit.co.ke';

        // For guest checkout, try to get customer info from order metadata
        if (!buyer && order.metadata) {
          const customerInfo = order.metadata.customerInfo || order.metadata;
          firstName = customerInfo.firstName || customerInfo.first_name || firstName;
          lastName = customerInfo.lastName || customerInfo.last_name || lastName;
          email = customerInfo.email || email;
        }

        // Ensure we have at least a first name
        if (!firstName || firstName === 'Customer') {
          firstName = 'Guest';
        }

        const apiRef = `ORDER-${order.orderNumber}-${payment.id}`;
        const appUrl = this.configService.get('app.url') || process.env.APP_URL || 'https://tickit.co.ke';

        // Format phone number properly before sending
        let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove all non-digits
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '254' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('254')) {
          formattedPhone = '254' + formattedPhone;
        }

        // Trigger IntaSend M-Pesa STK Push
        const stkResponse = await this.intasendService.mpesaStkPush({
          first_name: firstName,
          last_name: lastName || 'User',
          email: email,
          amount: amountInShillings,
          phone_number: formattedPhone,
          api_ref: apiRef,
          host: appUrl,
        });

        // Store IntaSend response in payment metadata
        const invoiceId = stkResponse.invoice?.invoice_id || stkResponse.invoice?.id;
        payment.metadata = {
          ...payment.metadata,
          intasendResponse: stkResponse,
          intasendInvoiceId: invoiceId,
          apiRef: apiRef,
          formattedPhone: formattedPhone,
        };
        payment.transactionId = invoiceId || apiRef;
        await this.paymentRepository.save(payment);

        this.logger.log(`IntaSend M-Pesa STK Push initiated. Invoice ID: ${invoiceId}, Order: ${order.orderNumber}, Phone: ${formattedPhone}`);

        // Check if STK push was actually sent (mpesa_reference should be populated if sent)
        if (!stkResponse.invoice?.mpesa_reference) {
          this.logger.warn(`STK Push initiated but mpesa_reference is null. Invoice: ${invoiceId}. This may be normal in test mode - the STK push may be sent asynchronously.`);
          
          // In test mode, wait a moment and check status
          if (this.configService.get('intasend.testMode')) {
            this.logger.log(`Test mode: Waiting 2 seconds and checking payment status for invoice ${invoiceId}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
              const statusResponse = await this.intasendService.checkStatus(invoiceId);
              this.logger.log(`Status check result: ${JSON.stringify(statusResponse.invoice)}`);
              
              // Handle different states
              if (statusResponse.invoice?.state === 'FAILED') {
                this.logger.error(`STK Push failed: ${statusResponse.invoice?.failed_reason || 'Unknown error'} (Code: ${statusResponse.invoice?.failed_code})`);
                payment.status = PaymentStatus.FAILED;
                payment.metadata = {
                  ...payment.metadata,
                  intasendStatusCheck: statusResponse,
                  failedReason: statusResponse.invoice?.failed_reason,
                  failedCode: statusResponse.invoice?.failed_code,
                  failedCodeLink: statusResponse.invoice?.failed_code_link,
                };
                await this.paymentRepository.save(payment);
                
                // Send notification about failure
                if (order.buyerId) {
                  this.notificationsService.createNotification({
                    userId: order.buyerId,
                    title: 'Payment Failed',
                    message: `M-Pesa payment failed: ${statusResponse.invoice?.failed_reason || 'Please try again.'}`,
                    type: NotificationType.PAYMENT_FAILED,
                    metadata: {
                      orderId: order.id,
                      amount: payment.amountCents,
                      paymentMethod: payment.method,
                      link: `/orders/${order.id}`,
                      failedReason: statusResponse.invoice?.failed_reason,
                    },
                  }).catch((err) => this.logger.error(`Failed to create payment notification: ${err.message}`));
                }
              } else if (statusResponse.invoice?.state === 'PROCESSING') {
                // STK push is being processed by M-Pesa
                this.logger.log(`STK Push is PROCESSING - M-Pesa is handling the request. Invoice: ${invoiceId}`);
                payment.metadata = {
                  ...payment.metadata,
                  intasendStatusCheck: statusResponse,
                  processing: true,
                };
                await this.paymentRepository.save(payment);
              } else if (statusResponse.invoice?.state === 'COMPLETED') {
                this.logger.log(`Payment completed! M-Pesa reference: ${statusResponse.invoice?.mpesa_reference}`);
                payment.status = PaymentStatus.COMPLETED;
                payment.transactionId = statusResponse.invoice?.mpesa_reference || invoiceId;
                payment.metadata = {
                  ...payment.metadata,
                  intasendStatusCheck: statusResponse,
                  mpesaReference: statusResponse.invoice.mpesa_reference,
                  completedAt: statusResponse.invoice?.updated_at || new Date().toISOString(),
                };
                await this.paymentRepository.save(payment);
                
                // Update order status
                if (order.status === OrderStatus.PENDING) {
                  order.status = OrderStatus.PAID;
                  await this.orderRepository.save(order);
                }
              } else if (statusResponse.invoice?.mpesa_reference) {
                // STK push was sent (has mpesa_reference but still pending)
                payment.metadata = {
                  ...payment.metadata,
                  intasendStatusCheck: statusResponse,
                  mpesaReference: statusResponse.invoice.mpesa_reference,
                };
                await this.paymentRepository.save(payment);
                this.logger.log(`M-Pesa reference found: ${statusResponse.invoice.mpesa_reference} - STK push sent, waiting for user confirmation`);
              }
            } catch (statusError: any) {
              this.logger.warn(`Status check failed: ${statusError.message}`);
            }
          }
        }

        return {
          checkoutToken: invoiceId || apiRef,
          payment,
          invoiceId: invoiceId,
        };
      } catch (error: any) {
        this.logger.error(`IntaSend M-Pesa STK Push failed: ${error.message}`);
        // Fall back to direct MPesa if IntaSend fails
        if (error.message?.includes('not configured')) {
          throw new BadRequestException('Payment service not configured. Please contact support.');
        }
        // Continue to fallback MPesa service
      }
    }

    // Fallback to direct MPesa service
    const stkResult = await isolatedServiceCall(
      'Payments.processMpesaExpress',
      () => circuitBreakers.mpesa.execute(() =>
        this.mpesaService.initiateStkPush(
          phoneNumber,
          amountInShillings,
          order.orderNumber,
          `Payment for order ${order.orderNumber}`,
        )
      ),
      {
        timeout: 15000, // 15 seconds for MPesa
        retries: 1,
        critical: false,
        fallback: async () => {
          this.logger.warn(`MPesa service unavailable for order ${orderId}, payment record created but not initiated`);
          return {
            checkoutRequestID: `STUB-${payment.id}`,
            merchantRequestID: `STUB-${payment.id}`,
          };
        },
      },
    );

    if (stkResult) {
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
    token: string, // Not used by IntaSend checkout link
    amountCents?: number,
    useIntasend: boolean = true,
  ): Promise<{
    payment: Payment;
    invoiceId?: string;
    checkoutUrl?: string;
  }> {
    const order = await this.orderRepository.findOne({ 
      where: { id: orderId },
      relations: ['buyer'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const amount = amountCents || order.totalAmountCents;
    const amountInShillings = amount / 100; // IntaSend expects amount in shillings (decimal)

    // Create payment record
    const payment = await this.create({
      orderId,
      method: PaymentMethod.CARD,
      amountCents: amount,
      currency: order.currency,
      metadata: { token: '[REDACTED]', provider: useIntasend ? 'intasend' : 'direct' },
    });

    // Use IntaSend for card payments
    if (useIntasend) {
      try {
        const buyer = order.buyer;
        let firstName = buyer?.firstName || 'Customer';
        let lastName = buyer?.lastName || '';
        let email = buyer?.email || 'customer@tickit.co.ke';
        let phoneNumber = buyer?.phoneNumber;

        // For guest checkout, try to get customer info from order metadata
        if (!buyer && order.metadata) {
          const customerInfo = order.metadata.customerInfo || order.metadata;
          firstName = customerInfo.firstName || customerInfo.first_name || firstName;
          lastName = customerInfo.lastName || customerInfo.last_name || lastName;
          email = customerInfo.email || email;
          phoneNumber = customerInfo.phoneNumber || phoneNumber;
        }

        const apiRef = `ORDER-${order.orderNumber}-${payment.id}`;
        const appUrl = this.configService.get('app.url') || process.env.APP_URL || 'https://tickit.co.ke';
        const redirectUrl = `${appUrl}/orders/${order.id}/payment-success`;

        // Create IntaSend checkout link for card payment
        const checkoutResponse = await this.intasendService.createCheckout({
          first_name: firstName,
          last_name: lastName || 'User',
          email: email,
          amount: amountInShillings,
          currency: order.currency || 'KES',
          api_ref: apiRef,
          phone_number: phoneNumber,
          method: 'CARD-PAYMENT',
          redirect_url: redirectUrl,
          host: appUrl,
        });

        const invoiceId = checkoutResponse.invoice?.invoice_id || checkoutResponse.invoice?.id;
        const checkoutUrl = this.intasendService.getCheckoutUrl(checkoutResponse);

        // Store IntaSend response in payment metadata
        payment.metadata = {
          ...payment.metadata,
          intasendResponse: checkoutResponse,
          intasendInvoiceId: invoiceId,
          apiRef: apiRef,
        };
        payment.transactionId = invoiceId || apiRef;
        await this.paymentRepository.save(payment);

        return {
          payment,
          invoiceId: invoiceId,
          checkoutUrl: checkoutUrl,
        };
      } catch (error: any) {
        this.logger.error(`IntaSend card payment failed: ${error.message}`);
        if (error.message?.includes('not configured')) {
          throw new BadRequestException('Payment service not configured. Please contact support.');
        }
        throw error;
      }
    }

    // Fallback: mark as pending if IntaSend not used
    payment.status = PaymentStatus.PENDING;
    await this.paymentRepository.save(payment);

    return { payment };
  }

  /**
   * Initiate multi-method payment (M-Pesa or Card) via IntaSend
   */
  async initiateIntasendPayment(
    orderId: string,
    customerInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string;
    },
    amountCents?: number,
    method?: 'M-PESA' | 'CARD-PAYMENT',
    redirectUrl?: string,
  ): Promise<{
    payment: Payment;
    invoiceId: string;
    checkoutUrl?: string;
  }> {
    const order = await this.orderRepository.findOne({ 
      where: { id: orderId },
      relations: ['buyer'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const amount = amountCents || order.totalAmountCents;
    const amountInShillings = amount / 100; // IntaSend expects amount in shillings (decimal)

    // Determine payment method
    const paymentMethod = method === 'CARD-PAYMENT' ? PaymentMethod.CARD : PaymentMethod.MPESA;

    // Create payment record
    const payment = await this.create({
      orderId,
      method: paymentMethod,
      amountCents: amount,
      currency: order.currency,
      metadata: { 
        provider: 'intasend',
        customerInfo: customerInfo,
      },
    });

    try {
      const apiRef = `ORDER-${order.orderNumber}-${payment.id}`;
      const appUrl = this.configService.get('app.url') || process.env.APP_URL || 'https://tickit.co.ke';
      const finalRedirectUrl = redirectUrl || `${appUrl}/orders/${order.id}/payment-success`;

      if (method === 'M-PESA' && customerInfo.phoneNumber) {
        // Use M-Pesa STK Push for M-Pesa payments
        const stkResponse = await this.intasendService.mpesaStkPush({
          first_name: customerInfo.firstName,
          last_name: customerInfo.lastName || 'User',
          email: customerInfo.email,
          amount: amountInShillings,
          phone_number: customerInfo.phoneNumber.replace(/\D/g, ''),
          api_ref: apiRef,
          host: appUrl,
        });

        const invoiceId = stkResponse.invoice?.invoice_id || stkResponse.invoice?.id;

        payment.metadata = {
          ...payment.metadata,
          intasendResponse: stkResponse,
          intasendInvoiceId: invoiceId,
          apiRef: apiRef,
        };
        payment.transactionId = invoiceId || apiRef;
        await this.paymentRepository.save(payment);

        return {
          payment,
          invoiceId: invoiceId || apiRef,
        };
      } else {
        // Use checkout link for card payments or multi-method
        const checkoutResponse = await this.intasendService.createCheckout({
          first_name: customerInfo.firstName,
          last_name: customerInfo.lastName || 'User',
          email: customerInfo.email,
          amount: amountInShillings,
          currency: order.currency || 'KES',
          api_ref: apiRef,
          phone_number: customerInfo.phoneNumber,
          method: method, // 'M-PESA' or 'CARD-PAYMENT' or undefined for all methods
          redirect_url: finalRedirectUrl,
          host: appUrl,
        });

        const invoiceId = checkoutResponse.invoice?.invoice_id || checkoutResponse.invoice?.id;
        const checkoutUrl = this.intasendService.getCheckoutUrl(checkoutResponse);

        payment.metadata = {
          ...payment.metadata,
          intasendResponse: checkoutResponse,
          intasendInvoiceId: invoiceId,
          apiRef: apiRef,
        };
        payment.transactionId = invoiceId || apiRef;
        await this.paymentRepository.save(payment);

        return {
          payment,
          invoiceId: invoiceId || apiRef,
          checkoutUrl: checkoutUrl,
        };
      }
    } catch (error: any) {
      this.logger.error(`IntaSend payment initiation failed: ${error.message}`);
      payment.status = PaymentStatus.FAILED;
      payment.metadata = {
        ...payment.metadata,
        error: error.message,
      };
      await this.paymentRepository.save(payment);
      throw new BadRequestException(`Payment initiation failed: ${error.message}`);
    }
  }

  /**
   * Check payment status via IntaSend invoice ID
   */
  async checkIntasendPaymentStatus(invoiceId: string): Promise<{
    status: PaymentStatus;
    payment: Payment | null;
  }> {
    try {
      const statusResponse = await this.intasendService.checkStatus(invoiceId);
      
      // Find payment by invoice ID or transaction ID
      const payments = await this.paymentRepository.find({
        where: {},
      });

      const payment = payments.find(p => 
        p.metadata && ((p.metadata as any).intasendInvoiceId === invoiceId || p.transactionId === invoiceId)
      );

      if (!payment) {
        this.logger.warn(`Payment not found for IntaSend invoice ID: ${invoiceId}`);
        return {
          status: PaymentStatus.PENDING,
          payment: null,
        };
      }

      // Map IntaSend state to PaymentStatus
      let newStatus: PaymentStatus = PaymentStatus.PENDING;
      const intasendState = statusResponse.invoice?.state?.toUpperCase();
      if (intasendState === 'COMPLETED') {
        newStatus = PaymentStatus.COMPLETED;
      } else if (intasendState === 'FAILED') {
        newStatus = PaymentStatus.FAILED;
      } else if (intasendState === 'PROCESSING') {
        // PROCESSING means STK push was sent and M-Pesa is handling it
        // Keep as PENDING until we get COMPLETED or FAILED
        newStatus = PaymentStatus.PENDING;
        this.logger.log(`Payment is PROCESSING - STK push sent to M-Pesa, waiting for user confirmation. Invoice: ${invoiceId}`);
      }

      // Update payment status if changed
      if (payment.status !== newStatus) {
        payment.status = newStatus;
        if (newStatus === PaymentStatus.COMPLETED) {
          // Verify amount matches
          const expectedAmount = payment.amountCents / 100;
          const actualAmount = parseFloat(String(statusResponse.invoice?.value || '0'));
          if (Math.abs(actualAmount - expectedAmount) > 0.01) {
            this.logger.warn(`Amount mismatch for payment ${payment.id}. Expected: ${expectedAmount}, Got: ${actualAmount}`);
          }

          payment.transactionId = statusResponse.invoice?.invoice_id || invoiceId;
          payment.metadata = {
            ...payment.metadata,
            intasendStatus: statusResponse,
            completedAt: statusResponse.invoice?.updated_at || new Date().toISOString(),
            channel: statusResponse.invoice?.provider || 'Unknown',
          };

          // Update order status
          const order = await this.orderRepository.findOne({
            where: { id: payment.orderId },
          });
          if (order && order.status === OrderStatus.PENDING) {
            order.status = OrderStatus.PAID;
            await this.orderRepository.save(order);
          }
        } else if (newStatus === PaymentStatus.FAILED) {
          payment.metadata = {
            ...payment.metadata,
            intasendStatus: statusResponse,
            failedReason: statusResponse.invoice?.failed_reason || 'Payment failed',
            failedCode: statusResponse.invoice?.failed_code,
            failedCodeLink: statusResponse.invoice?.failed_code_link,
          };
          
          // Send payment failed notification
          const order = await this.orderRepository.findOne({
            where: { id: payment.orderId },
            relations: ['buyer'],
          });
          if (order?.buyerId) {
            this.notificationsService.createNotification({
              userId: order.buyerId,
              title: 'Payment Failed',
              message: `Payment for order ${order.orderNumber} failed. ${statusResponse.invoice?.failed_reason || 'Please try again.'}`,
              type: NotificationType.PAYMENT_FAILED,
              metadata: {
                orderId: order.id,
                amount: payment.amountCents,
                paymentMethod: payment.method,
                link: `/orders/${order.id}`,
                failedReason: statusResponse.invoice?.failed_reason,
              },
            }).catch((err) => this.logger.error(`Failed to create payment notification: ${err.message}`));
          }
        }
        await this.paymentRepository.save(payment);
      }

      return {
        status: newStatus,
        payment,
      };
    } catch (error: any) {
      this.logger.error(`IntaSend status check failed: ${error.message}`);
      throw new BadRequestException(`Payment status check failed: ${error.message}`);
    }
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
    this.logger.log(`Received webhook from provider: ${provider}`);

    if (provider === 'intasend') {
      return this.handleIntasendWebhook(payload, headers);
    }

    // TODO: Verify webhook signature based on provider
    // TODO: Process webhook based on provider type
    // TODO: Update payment/order status accordingly

    // Stub implementation
    return true;
  }

  /**
   * Handle IntaSend webhook (POST request with invoice data)
   * IntaSend sends webhooks when payment status changes
   */
  async handleIntasendWebhook(webhookPayload: any, headers: any): Promise<boolean> {
    try {
      this.logger.log(`IntaSend webhook received: ${JSON.stringify(webhookPayload)}`);

      // IntaSend webhook typically contains invoice data
      const invoiceId = webhookPayload.invoice_id || webhookPayload.invoice?.invoice_id || webhookPayload.invoice?.id;
      const apiRef = webhookPayload.api_ref || webhookPayload.invoice?.api_ref;

      if (!invoiceId && !apiRef) {
        this.logger.warn('IntaSend webhook missing invoice ID or API reference');
        return false;
      }

      // Verify payment status by checking with IntaSend API
      const statusResponse = await this.intasendService.checkStatus(invoiceId || apiRef);

      // Find payment by invoice ID or API reference
      const payments = await this.paymentRepository.find({
        where: {},
      });

      const payment = payments.find(p => {
        const metadata = p.metadata as any;
        return (
          metadata?.intasendInvoiceId === invoiceId ||
          metadata?.intasendInvoiceId === apiRef ||
          metadata?.apiRef === apiRef ||
          p.transactionId === invoiceId ||
          p.transactionId === apiRef
        );
      });

      if (!payment) {
        this.logger.warn(`Payment not found for IntaSend invoice ID: ${invoiceId || apiRef}`);
        return false;
      }

      // Map IntaSend state to PaymentStatus
      const intasendState = statusResponse.invoice?.state?.toUpperCase();
      let paymentStatus: PaymentStatus;

      if (intasendState === 'COMPLETED') {
        paymentStatus = PaymentStatus.COMPLETED;
      } else if (intasendState === 'FAILED') {
        paymentStatus = PaymentStatus.FAILED;
      } else {
        paymentStatus = PaymentStatus.PENDING;
      }

      // Update payment status
      if (payment.status !== paymentStatus) {
        payment.status = paymentStatus;

        if (paymentStatus === PaymentStatus.COMPLETED) {
          // Verify amount matches
          const expectedAmount = payment.amountCents / 100;
          const actualAmount = parseFloat(String(statusResponse.invoice?.value || '0'));
          if (Math.abs(actualAmount - expectedAmount) > 0.01) {
            this.logger.warn(`Amount mismatch for payment ${payment.id}. Expected: ${expectedAmount}, Got: ${actualAmount}`);
          }

          payment.transactionId = statusResponse.invoice?.invoice_id || invoiceId;
          payment.metadata = {
            ...payment.metadata,
            intasendWebhook: webhookPayload,
            intasendStatus: statusResponse,
            completedAt: statusResponse.invoice?.updated_at || new Date().toISOString(),
            channel: statusResponse.invoice?.provider || 'Unknown',
          };

          // Update order status
          const order = await this.orderRepository.findOne({
            where: { id: payment.orderId },
            relations: ['buyer'],
          });
          if (order && order.status === OrderStatus.PENDING) {
            order.status = OrderStatus.PAID;
            await this.orderRepository.save(order);

            // Send payment successful notification
            if (order.buyerId) {
              this.notificationsService.createNotification({
                userId: order.buyerId,
                title: 'Payment Successful',
                message: `Your payment of ${order.currency} ${(payment.amountCents / 100).toLocaleString()} for order ${order.orderNumber} was successful.`,
                type: NotificationType.PAYMENT_SUCCESSFUL,
                metadata: {
                  orderId: order.id,
                  amount: payment.amountCents,
                  paymentMethod: payment.method,
                  link: `/orders/${order.id}`,
                },
              }).catch((err) => this.logger.error(`Failed to create payment notification: ${err.message}`));
            }
          }
        } else if (paymentStatus === PaymentStatus.FAILED) {
          payment.metadata = {
            ...payment.metadata,
            intasendWebhook: webhookPayload,
            intasendStatus: statusResponse,
            failedReason: statusResponse.invoice?.failed_reason || 'Payment failed',
          };
        }

        await this.paymentRepository.save(payment);
      }

      return true;
    } catch (error: any) {
      this.logger.error(`IntaSend webhook processing failed: ${error.message}`, error.stack);
      return false;
    }
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

