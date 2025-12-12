export enum NotificationType {
  // Event notifications
  EVENT_PENDING_APPROVAL = 'EVENT_PENDING_APPROVAL',
  EVENT_APPROVED = 'EVENT_APPROVED',
  EVENT_REJECTED = 'EVENT_REJECTED',
  EVENT_GOING_LIVE = 'EVENT_GOING_LIVE',
  EVENT_LIVE_STARTED = 'EVENT_LIVE_STARTED',
  EVENT_LIVE_ENDED = 'EVENT_LIVE_ENDED',
  
  // Ticket notifications
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_SOLD = 'TICKET_SOLD',
  TICKET_TRANSFERRED = 'TICKET_TRANSFERRED',
  
  // Order notifications
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_REFUNDED = 'ORDER_REFUNDED',
  
  // Payment notifications
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // Refund notifications
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_REJECTED = 'REFUND_REJECTED',
  
  // System notifications
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  MAINTENANCE = 'MAINTENANCE',
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId?: string; // Target user ID (null for broadcast)
  eventId?: string;
  orderId?: string;
  ticketId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  read?: boolean;
}

export interface LiveStreamInfo {
  eventId: string;
  streamUrl: string;
  streamKey: string;
  status: 'idle' | 'starting' | 'live' | 'ended';
  viewerCount: number;
  startedAt?: Date;
  endedAt?: Date;
}

