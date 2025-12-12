# Real-Time Notifications & Live Streaming

## Overview

The system now includes comprehensive real-time notifications and live streaming capabilities for events.

## Real-Time Notifications

### Notification Types

The system supports the following notification types:

- **Event Notifications**:
  - `EVENT_PENDING_APPROVAL` - Event submitted for admin approval
  - `EVENT_APPROVED` - Event approved by admin
  - `EVENT_REJECTED` - Event rejected by admin
  - `EVENT_GOING_LIVE` - Event about to start
  - `EVENT_LIVE_STARTED` - Live stream started
  - `EVENT_LIVE_ENDED` - Live stream ended

- **Ticket Notifications**:
  - `TICKET_CREATED` - New ticket created
  - `TICKET_SOLD` - Ticket sold (organiser notification)
  - `TICKET_TRANSFERRED` - Ticket transferred to another user

- **Order Notifications**:
  - `ORDER_CREATED` - New order created
  - `ORDER_PAID` - Order payment confirmed
  - `ORDER_REFUNDED` - Order refunded

- **Payment Notifications**:
  - `PAYMENT_PENDING` - Payment pending
  - `PAYMENT_COMPLETED` - Payment completed
  - `PAYMENT_FAILED` - Payment failed

- **Refund Notifications**:
  - `REFUND_REQUESTED` - Refund requested
  - `REFUND_APPROVED` - Refund approved
  - `REFUND_REJECTED` - Refund rejected

### WebSocket Rooms

Users automatically join rooms based on their role and context:

- **User Rooms**: `user:{userId}` - Personal notifications
- **Admin Room**: `admins` - All admin notifications
- **Organiser Rooms**: `organiser:{organiserId}` - Organiser-specific notifications
- **Event Rooms**: `event:{eventId}` - Event-specific notifications (live streams, updates)

### WebSocket Events

#### Client → Server

- `join-room` - Join a specific room
- `leave-room` - Leave a room
- `join-user-room` - Join personal user room (auto-joins on connection)
- `join-admin-room` - Join admin room (requires admin role)
- `join-organiser-room` - Join organiser room
- `join-event-room` - Join event room for live updates
- `leave-event-room` - Leave event room
- `start-live-stream` - Start live streaming (organiser/admin only)
- `stop-live-stream` - Stop live streaming (organiser/admin only)

#### Server → Client

- `notification` - Real-time notification payload
- `live-stream-started` - Live stream started event
- `live-stream-ended` - Live stream ended event
- `live-stream-status` - Stream status update
- `viewer-count-update` - Viewer count update

## Event Approval Workflow

### Flow

1. **Organiser creates/updates event** with status `PUBLISHED`
   - System automatically changes status to `PENDING_APPROVAL`
   - Real-time notification sent to all admins

2. **Admin receives notification** in admin room
   - Notification includes event details and organiser info
   - Admin can approve or reject from admin dashboard

3. **Admin approves/rejects event**
   - If approved: Status changes to `APPROVED`, then can be `PUBLISHED`
   - If rejected: Status changes to `REJECTED` with optional reason
   - Real-time notification sent to organiser

4. **Organiser receives notification** in organiser room
   - Can see approval/rejection status
   - Can make changes and resubmit if rejected

### API Endpoints

#### Organiser Endpoints

- `POST /events/:id/request-approval` - Request approval for draft event
- `POST /events` - Create event (auto-requests approval if status is PUBLISHED)

#### Admin Endpoints

- `POST /admin/events/:id/approve` - Approve event
- `POST /admin/events/:id/reject` - Reject event (with optional reason)

## Live Streaming

### Features

- Start/stop live streaming for events
- Real-time viewer count updates
- Stream URL and key management
- Automatic notifications when stream starts/ends
- Integration with streaming providers (RTMP, HLS, etc.)

### API Endpoints

- `POST /live-streaming/events/:id/start` - Start live stream
- `POST /live-streaming/events/:id/mark-live` - Mark stream as live
- `POST /live-streaming/events/:id/stop` - Stop live stream
- `GET /live-streaming/events/:id/info` - Get stream info

### Stream Status

- `idle` - No stream active
- `starting` - Stream is starting
- `live` - Stream is live
- `ended` - Stream has ended

### Database Fields

Events now include:
- `streamUrl` - Stream URL for viewers
- `streamKey` - Stream key for broadcaster
- `streamStatus` - Current stream status
- `streamStartedAt` - When stream started
- `streamEndedAt` - When stream ended
- `viewerCount` - Current viewer count

## Integration Points

### Events Service

- Event creation automatically requests approval if status is PUBLISHED
- Approval/rejection sends real-time notifications
- Event status changes trigger notifications

### Orders Service

- Ticket creation sends real-time notification to buyer
- Order payment sends notifications to both buyer and organiser
- Real-time updates for order status changes

### Live Streaming Service

- Stream start/stop broadcasts to event room
- Viewer count updates in real-time
- Automatic notifications when stream status changes

## Frontend Integration

### WebSocket Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join user room
socket.emit('join-user-room');

// Join event room
socket.emit('join-event-room', { eventId: 'event-id' });

// Listen for notifications
socket.on('notification', (payload) => {
  console.log('New notification:', payload);
});

// Listen for live stream updates
socket.on('live-stream-started', (data) => {
  console.log('Stream started:', data);
});
```

### Notification Display

Notifications should be displayed in:
- Admin dashboard (approval requests)
- Organiser dashboard (approval status, ticket sales)
- User dashboard (ticket confirmations, order updates)
- Event pages (live stream status)

## Configuration

### Environment Variables

```env
# WebSocket
CORS_ORIGIN=http://localhost:3000

# Streaming (optional)
STREAM_BASE_URL=rtmp://stream.tixhub.com/live
```

## Future Enhancements

- [ ] Notification history/archive
- [ ] Notification preferences per user
- [ ] Push notifications (mobile)
- [ ] Email fallback for offline users
- [ ] Stream recording/playback
- [ ] Multi-camera streaming
- [ ] Chat integration during live streams
- [ ] Analytics for stream performance

