import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway } from '../../modules/websocket/websocket.gateway';
import { NotificationType, NotificationPayload } from '../types/notification.types';

@Injectable()
export class RealtimeNotificationService {
  private readonly logger = new Logger(RealtimeNotificationService.name);

  constructor(private wsGateway: WebSocketGateway) {}

  /**
   * Send notification to a specific user
   */
  async notifyUser(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      // Send to user's personal room
      this.wsGateway.broadcastToRoom(`user:${userId}`, 'notification', payload);
      this.logger.log(`Notification sent to user ${userId}: ${payload.type}`);
    } catch (error: any) {
      this.logger.error(`Failed to send notification to user ${userId}: ${error.message}`);
    }
  }

  /**
   * Send notification to all admins
   */
  async notifyAdmins(payload: NotificationPayload): Promise<void> {
    try {
      this.wsGateway.broadcastToRoom('admins', 'notification', payload);
      this.logger.log(`Admin notification sent: ${payload.type}`);
    } catch (error: any) {
      this.logger.error(`Failed to send admin notification: ${error.message}`);
    }
  }

  /**
   * Send notification to event organisers
   */
  async notifyOrganisers(organiserId: string, payload: NotificationPayload): Promise<void> {
    try {
      this.wsGateway.broadcastToRoom(`organiser:${organiserId}`, 'notification', payload);
      this.logger.log(`Organiser notification sent: ${payload.type}`);
    } catch (error: any) {
      this.logger.error(`Failed to send organiser notification: ${error.message}`);
    }
  }

  /**
   * Broadcast notification to all connected clients
   */
  async broadcast(payload: NotificationPayload): Promise<void> {
    try {
      this.wsGateway.broadcast('notification', payload);
      this.logger.log(`Broadcast notification: ${payload.type}`);
    } catch (error: any) {
      this.logger.error(`Failed to broadcast notification: ${error.message}`);
    }
  }

  /**
   * Send event approval request notification to admins
   */
  async notifyEventApprovalRequest(
    eventId: string,
    eventTitle: string,
    organiserId: string,
    organiserName: string,
  ): Promise<void> {
    const payload: NotificationPayload = {
      id: `event-approval-${eventId}-${Date.now()}`,
      type: NotificationType.EVENT_PENDING_APPROVAL,
      title: 'Event Approval Request',
      message: `${organiserName} has requested approval for event: ${eventTitle}`,
      eventId,
      metadata: {
        organiserId,
        organiserName,
        eventTitle,
        action: 'approve',
      },
      timestamp: new Date(),
    };

    await this.notifyAdmins(payload);
  }

  /**
   * Send event approval/rejection notification to organiser
   */
  async notifyEventApprovalDecision(
    eventId: string,
    eventTitle: string,
    organiserId: string,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    const payload: NotificationPayload = {
      id: `event-decision-${eventId}-${Date.now()}`,
      type: approved ? NotificationType.EVENT_APPROVED : NotificationType.EVENT_REJECTED,
      title: approved ? 'Event Approved' : 'Event Rejected',
      message: approved
        ? `Your event "${eventTitle}" has been approved and is now live!`
        : `Your event "${eventTitle}" has been rejected. ${reason || ''}`,
      eventId,
      metadata: {
        approved,
        reason,
        eventTitle,
      },
      timestamp: new Date(),
    };

    await this.notifyOrganisers(organiserId, payload);
  }

  /**
   * Send ticket created notification
   */
  async notifyTicketCreated(
    ticketId: string,
    ticketNumber: string,
    eventId: string,
    eventTitle: string,
    userId: string,
  ): Promise<void> {
    const payload: NotificationPayload = {
      id: `ticket-created-${ticketId}-${Date.now()}`,
      type: NotificationType.TICKET_CREATED,
      title: 'New Ticket Created',
      message: `Your ticket for "${eventTitle}" has been created: ${ticketNumber}`,
      userId,
      ticketId,
      eventId,
      metadata: {
        ticketNumber,
        eventTitle,
      },
      timestamp: new Date(),
    };

    await this.notifyUser(userId, payload);
  }

  /**
   * Send order paid notification
   */
  async notifyOrderPaid(
    orderId: string,
    orderNumber: string,
    eventId: string,
    eventTitle: string,
    userId: string,
    organiserId: string,
  ): Promise<void> {
    // Notify buyer
    const buyerPayload: NotificationPayload = {
      id: `order-paid-${orderId}-${Date.now()}`,
      type: NotificationType.ORDER_PAID,
      title: 'Order Confirmed',
      message: `Your order ${orderNumber} for "${eventTitle}" has been confirmed!`,
      userId,
      orderId,
      eventId,
      metadata: {
        orderNumber,
        eventTitle,
      },
      timestamp: new Date(),
    };
    await this.notifyUser(userId, buyerPayload);

    // Notify organiser
    const organiserPayload: NotificationPayload = {
      id: `order-paid-org-${orderId}-${Date.now()}`,
      type: NotificationType.TICKET_SOLD,
      title: 'New Ticket Sale',
      message: `New ticket sold for "${eventTitle}" - Order ${orderNumber}`,
      orderId,
      eventId,
      metadata: {
        orderNumber,
        eventTitle,
      },
      timestamp: new Date(),
    };
    await this.notifyOrganisers(organiserId, organiserPayload);
  }

  /**
   * Send live stream started notification
   */
  async notifyLiveStreamStarted(
    eventId: string,
    eventTitle: string,
    streamUrl: string,
  ): Promise<void> {
    const payload: NotificationPayload = {
      id: `live-stream-${eventId}-${Date.now()}`,
      type: NotificationType.EVENT_LIVE_STARTED,
      title: 'Live Stream Started',
      message: `"${eventTitle}" is now streaming live!`,
      eventId,
      metadata: {
        eventTitle,
        streamUrl,
      },
      timestamp: new Date(),
    };

    // Broadcast to all users following this event
    this.wsGateway.broadcastToRoom(`event:${eventId}`, 'live-stream-started', {
      eventId,
      streamUrl,
      eventTitle,
    });
  }

  /**
   * Send live stream ended notification
   */
  async notifyLiveStreamEnded(eventId: string, eventTitle: string): Promise<void> {
    const payload: NotificationPayload = {
      id: `live-stream-ended-${eventId}-${Date.now()}`,
      type: NotificationType.EVENT_LIVE_ENDED,
      title: 'Live Stream Ended',
      message: `The live stream for "${eventTitle}" has ended.`,
      eventId,
      metadata: {
        eventTitle,
      },
      timestamp: new Date(),
    };

    this.wsGateway.broadcastToRoom(`event:${eventId}`, 'live-stream-ended', {
      eventId,
      eventTitle,
    });
  }
}

