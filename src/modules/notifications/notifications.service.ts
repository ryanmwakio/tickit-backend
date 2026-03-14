import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as nodemailer from 'nodemailer';
import { Notification } from '../../database/entities/notification.entity';
import { NotificationPreference } from '../../database/entities/notification-preference.entity';
import { NotificationType } from '../../database/entities/notification.entity';
import { OtpService } from '../../common/services/otp.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { isolatedServiceCall, circuitBreakers } from '../../common/utils/service-isolation.util';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
    private configService: ConfigService,
    private otpService: OtpService,
    private wsGateway: WebSocketGateway,
  ) {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

    if (smtpHost && smtpPort && smtpUser && smtpPassword) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
    }
  }

  /**
   * Create and send a notification to a user
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    // Check user preferences
    const preferences = await this.getUserPreferences(dto.userId);
    
    // Create notification in database
    const notification = this.notificationRepository.create({
      id: uuidv4(),
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      metadata: dto.metadata || {},
      isRead: false,
    });

    const saved = await this.notificationRepository.save(notification);

    // Send real-time notification via WebSocket if in-app is enabled
    if (preferences?.inApp !== false) {
      try {
        this.wsGateway.broadcastToRoom(
          `user:${dto.userId}`,
          'notification:new',
          {
            id: saved.id,
            title: saved.title,
            message: saved.message,
            type: saved.type,
            metadata: saved.metadata,
            createdAt: saved.createdAt,
          },
        );
      } catch (error) {
        this.logger.warn(`Failed to send WebSocket notification: ${error.message}`);
      }
    }

    // Send email if enabled and appropriate
    if (preferences?.email && this.shouldSendEmail(dto.type, preferences)) {
      this.sendEmailNotification(dto.userId, saved).catch((err) =>
        this.logger.error(`Failed to send email notification: ${err.message}`),
      );
    }

    // Send SMS if enabled and appropriate
    if (preferences?.sms && this.shouldSendSMS(dto.type, preferences)) {
      this.sendSMSNotification(dto.userId, saved).catch((err) =>
        this.logger.error(`Failed to send SMS notification: ${err.message}`),
      );
    }

    return saved;
  }

  /**
   * Get notifications for a user with pagination and filtering
   */
  async getUserNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<{ data: Notification[]; total: number; page: number; limit: number }> {
    const { type, isRead, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (isRead !== undefined) {
      // Ensure it's a proper boolean (DTO should have transformed it, but safety check)
      const isReadBoolean = typeof isRead === 'boolean' 
        ? isRead 
        : (isRead === 'true' || isRead === true);
      this.logger.debug(`Filtering notifications by isRead: ${isReadBoolean} (original: ${isRead}, type: ${typeof isRead})`);
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: isReadBoolean });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );

    return { count: result.affected || 0 };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  /**
   * Get or create user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferenceRepository.create({
        id: uuidv4(),
        userId,
      });
      preferences = await this.preferenceRepository.save(preferences);
    }

    return preferences;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    let preferences = await this.getUserPreferences(userId);

    // Update fields
    Object.assign(preferences, dto);

    return this.preferenceRepository.save(preferences);
  }

  /**
   * Check if email should be sent based on notification type and preferences
   */
  private shouldSendEmail(
    type: NotificationType,
    preferences: NotificationPreference,
  ): boolean {
    // Always send critical notifications
    if (
      [
        NotificationType.PAYMENT_FAILED,
        NotificationType.ACCOUNT_CHANGED,
        NotificationType.EVENT_CANCELLED,
      ].includes(type)
    ) {
      return true;
    }

    // Check category preferences
    if (
      [
        NotificationType.PAYMENT_SUCCESSFUL,
        NotificationType.PAYMENT_FAILED,
        NotificationType.TICKET_DELIVERED,
        NotificationType.REFUND_PROCESSED,
      ].includes(type)
    ) {
      return preferences.paymentUpdates;
    }

    if (
      [
        NotificationType.EVENT_DATE_CHANGE,
        NotificationType.EVENT_VENUE_CHANGE,
        NotificationType.EVENT_TIME_CHANGE,
        NotificationType.EVENT_CANCELLED,
      ].includes(type)
    ) {
      return preferences.eventChanges;
    }

    if (
      [
        NotificationType.ORGANIZER_MESSAGE,
        NotificationType.ORGANIZER_ANNOUNCEMENT,
      ].includes(type)
    ) {
      return preferences.organizerMessages;
    }

    if (
      [
        NotificationType.NEW_EVENTS_SUGGESTED,
        NotificationType.EARLY_BIRD_TICKETS,
        NotificationType.DISCOUNT_AVAILABLE,
        NotificationType.TRENDING_EVENTS,
      ].includes(type)
    ) {
      return preferences.promoAllowed;
    }

    return preferences.systemNotifications;
  }

  /**
   * Check if SMS should be sent
   */
  private shouldSendSMS(
    type: NotificationType,
    preferences: NotificationPreference,
  ): boolean {
    // Only send SMS for critical notifications
    const criticalTypes = [
      NotificationType.PAYMENT_FAILED,
      NotificationType.EVENT_CANCELLED,
      NotificationType.ACCOUNT_CHANGED,
    ];

    return criticalTypes.includes(type) && preferences.systemNotifications;
  }

  /**
   * Send email notification (async, non-blocking)
   */
  private async sendEmailNotification(
    userId: string,
    notification: Notification,
  ): Promise<void> {
    // In a real implementation, you'd fetch user email from user service
    // For now, we'll use the existing email sending logic
    // This would be enhanced with user lookup
    this.logger.log(`Email notification queued for user ${userId}`);
  }

  /**
   * Send SMS notification (async, non-blocking)
   */
  private async sendSMSNotification(
    userId: string,
    notification: Notification,
  ): Promise<void> {
    // In a real implementation, you'd fetch user phone from user service
    this.logger.log(`SMS notification queued for user ${userId}`);
  }

  // Legacy email/SMS methods (kept for compatibility)
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.emailTransporter) {
      this.logger.warn('Email transporter not configured, skipping email send');
      return false;
    }

    const result = await isolatedServiceCall(
      'Notifications.sendEmail',
      () => circuitBreakers.notifications.execute(async () => {
        await this.emailTransporter!.sendMail({
          from: this.configService.get<string>('SMTP_FROM') || 'noreply@tickit.com',
          to,
          subject,
          text: text || html.replace(/<[^>]*>/g, ''),
          html,
        });
        return true;
      }),
      { timeout: 10000, retries: 1, critical: false, fallback: async () => false },
    );

    return result ?? false;
  }

  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    const result = await isolatedServiceCall(
      'Notifications.sendSMS',
      () => circuitBreakers.notifications.execute(async () => {
        // Use OTP service or implement SMS sending
        return true;
      }),
      { timeout: 10000, retries: 1, critical: false, fallback: async () => false },
    );

    return result ?? false;
  }

  async sendTicketEmail(
    to: string,
    ticketNumber: string,
    eventName: string,
    qrCodeDataUrl: string,
    ticketDetails: any,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Ticket - ${eventName}</title>
      </head>
      <body>
        <h1>Your Ticket</h1>
        <p>Event: ${eventName}</p>
        <p>Ticket Number: ${ticketNumber}</p>
        <img src="${qrCodeDataUrl}" alt="QR Code" />
        <p>Please present this QR code at the event entrance.</p>
      </body>
      </html>
    `;

    return this.sendEmail(to, `Your Ticket for ${eventName}`, html);
  }

  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    eventName: string,
    totalAmount: number,
    currency: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
      </head>
      <body>
        <h1>Order Confirmed</h1>
        <p>Order Number: ${orderNumber}</p>
        <p>Event: ${eventName}</p>
        <p>Total: ${currency} ${(totalAmount / 100).toFixed(2)}</p>
        <p>Your tickets will be sent to this email shortly.</p>
      </body>
      </html>
    `;

    return this.sendEmail(to, `Order Confirmation - ${orderNumber}`, html);
  }
}
