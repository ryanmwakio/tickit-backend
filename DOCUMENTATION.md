# TixHub Backend - Complete Documentation

This document aggregates all backend documentation in one place.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [API Specification](#api-specification)
4. [Database & Migrations](#database--migrations)
5. [Error Handling & Service Isolation](#error-handling--service-isolation)
6. [Real-Time Notifications & Live Streaming](#real-time-notifications--live-streaming)
7. [Architecture](#architecture)
8. [Configuration](#configuration)
9. [Deployment](#deployment)
10. [Testing & Seeding](#testing--seeding)

---

## Overview

TixHub is a comprehensive event & ticketing platform backend built with NestJS, TypeORM, and MySQL. The system provides a complete REST API for managing events, tickets, orders, payments, and more, with real-time notifications and live streaming capabilities.

### Key Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens, role-based access control
- **User Management**: Complete user profiles with multi-role support
- **Event Management**: Full CRUD for events, venues, and ticket types with advanced filtering
- **Order Processing**: Complete order lifecycle management with checkout flow
- **Payment Integration**: Payment processing structure ready for MPesa, card payments, and other gateways
- **Real-time Updates**: WebSocket support for live updates
- **Ticket Management**: QR code generation, check-in, transfers
- **Support System**: Ticket support with messaging
- **Analytics**: Event analytics and reporting
- **Admin Dashboard**: Full admin capabilities with platform-wide statistics
- **Organiser Dashboard**: Organiser-specific analytics and management
- **Event Approval Workflow**: Admin approval system for events
- **Live Streaming**: Live streaming for events

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **MySQL** 8.0+ (or MariaDB 10.3+)
- **Redis** (optional, for caching and queues)
- **TypeScript** 5.0+

### Installation

1. **Navigate to backend directory**
   ```bash
   cd tixhub-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Create MySQL database**
   ```bash
   mysql -u root -p
   CREATE DATABASE tixhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```

5. **Seed users (optional)**
   ```bash
   npm run seed:users
   ```

6. **Start the application**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:5000`

### API Documentation

Once the server is running:
- **Swagger UI**: `http://localhost:5000/api/docs`
- **Health Check**: `http://localhost:5000/api/v1/health`
- **Base API URL**: `http://localhost:5000/api/v1`

---

## API Specification

### Authentication Endpoints

- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (revoke refresh token)
- `GET /api/v1/auth/me` - Get current user

### Event Management

- `GET /api/v1/events` - List events (with filters, search, pagination)
- `GET /api/v1/events/:id` - Get event by ID
- `GET /api/v1/events/slug/:slug` - Get event by slug
- `POST /api/v1/events` - Create event (Organiser only)
- `PUT /api/v1/events/:id` - Update event (Organiser owner)
- `DELETE /api/v1/events/:id` - Delete event (Organiser owner)
- `POST /api/v1/events/:id/request-approval` - Request approval (Organiser)

### Event Approval (Admin)

- `POST /api/v1/admin/events/:id/approve` - Approve event (Admin only)
- `POST /api/v1/admin/events/:id/reject` - Reject event (Admin only)

### Live Streaming

- `POST /api/v1/live-streaming/events/:id/start` - Start live stream (Organiser)
- `POST /api/v1/live-streaming/events/:id/mark-live` - Mark stream as live
- `POST /api/v1/live-streaming/events/:id/stop` - Stop live stream
- `GET /api/v1/live-streaming/events/:id/info` - Get stream info

### Orders & Tickets

- `POST /api/v1/orders/checkout` - Create order and initiate checkout
- `GET /api/v1/orders` - List user orders
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders/:id/resend` - Resend tickets via email/SMS
- `GET /api/v1/tickets` - List user tickets
- `GET /api/v1/tickets/:id` - Get ticket by ID
- `POST /api/v1/tickets/:id/transfer` - Transfer ticket

### Payments

- `POST /api/v1/payments/mpesa/express` - Initiate MPesa Express payment
- `POST /api/v1/payments/mpesa/confirm` - MPesa webhook handler
- `POST /api/v1/payments/card` - Process card payment

### Admin Endpoints

- `GET /api/v1/admin/dashboard/stats` - Platform statistics (Admin only)
- `GET /api/v1/admin/users` - List all users (Admin only)
- `GET /api/v1/admin/events` - List all events (Admin only)
- `GET /api/v1/admin/payments` - List all payments (Admin only)
- `GET /api/v1/admin/refunds` - List all refunds (Admin only)

**Total: 60+ endpoints**

For complete API documentation, see `API_SPECIFICATION.md` or visit `/api/docs` when the server is running.

---

## Database & Migrations

### Database Schema

The application uses TypeORM with MySQL. In development mode, tables are auto-created (`synchronize: true`). For production, use migrations.

### Key Entities (19 total)

- `User` - User accounts with multi-role support
- `Role` - User roles (ATTENDEE, ORGANISER, PROMOTER, STAFF, ADMIN)
- `Organiser` - Event organisers
- `Event` - Events with visibility and status
- `Venue` - Event venues
- `TicketType` - Ticket types for events
- `Order` - Orders
- `OrderItem` - Order line items
- `Ticket` - Individual tickets with QR codes
- `Payment` - Payment records
- `Checkin` - Check-in records
- `SupportTicket` - Support tickets
- `SupportTicketMessage` - Support ticket messages
- `Refund` - Refund records
- `PromoCode` - Promo codes
- `ContentBlock` - CMS content blocks
- `Staff` - Staff members
- `RefreshToken` - Refresh tokens for authentication
- `ResaleListing` - Resale ticket listings

### Migrations

Migrations are located in `src/migrations/`:

- `1765063127361-InitialSchema.ts` - Initial database schema
- `1765063410311-AddRolesTable.ts` - Roles table and user-role relationships

### Running Migrations

```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

For detailed migration documentation, see `MIGRATIONS.md`.

---

## Error Handling & Service Isolation

The system implements comprehensive error handling and service isolation to ensure robustness.

### Service Isolation Utility

Located in `src/common/utils/service-isolation.util.ts`:

- **`isolatedServiceCall()`** - Wraps service calls with timeout, retry, and error isolation
- **`CircuitBreaker`** - Implements circuit breaker pattern for external services
- **Pre-configured Circuit Breakers**:
  - Redis: 5 failures threshold, 60s reset timeout
  - MPesa: 3 failures threshold, 120s reset timeout
  - Notifications: 10 failures threshold, 30s reset timeout
  - Payments: 3 failures threshold, 120s reset timeout

### Error Handling Strategy

**Critical Services** (failures throw errors):
- Database operations (TypeORM)
- Core business logic validation
- Authentication/authorization

**Non-Critical Services** (failures logged, operation continues):
- Redis caching (fail-open)
- Email/SMS notifications
- Payment initiation (payment record created, can retry)
- Analytics/logging

### Timeout Configuration

- Redis operations: 2 seconds
- Email/SMS: 10 seconds
- MPesa API: 15 seconds
- Payment callbacks: 10 seconds

### Retry Strategy

- Default retries: 1 retry for most operations
- Exponential backoff: 100ms * 2^attempt, max 1000ms
- Circuit breaker: Prevents retries when service is down

For detailed error handling documentation, see `ERROR_HANDLING_SUMMARY.md` and `SERVICE_ISOLATION.md`.

---

## Real-Time Notifications & Live Streaming

### Real-Time Notification System

The system includes comprehensive real-time notifications via WebSocket.

#### Notification Types

- **Event Notifications**: `EVENT_PENDING_APPROVAL`, `EVENT_APPROVED`, `EVENT_REJECTED`, `EVENT_LIVE_STARTED`, `EVENT_LIVE_ENDED`
- **Ticket Notifications**: `TICKET_CREATED`, `TICKET_SOLD`, `TICKET_TRANSFERRED`
- **Order Notifications**: `ORDER_CREATED`, `ORDER_PAID`, `ORDER_REFUNDED`
- **Payment Notifications**: `PAYMENT_PENDING`, `PAYMENT_COMPLETED`, `PAYMENT_FAILED`
- **Refund Notifications**: `REFUND_REQUESTED`, `REFUND_APPROVED`, `REFUND_REJECTED`

#### WebSocket Rooms

- `user:{userId}` - Personal user notifications
- `admins` - Admin notifications
- `organiser:{organiserId}` - Organiser notifications
- `event:{eventId}` - Event-specific notifications

#### WebSocket Events

**Client → Server**:
- `join-user-room` - Join personal user room
- `join-admin-room` - Join admin room
- `join-organiser-room` - Join organiser room
- `join-event-room` - Join event room
- `start-live-stream` - Start live streaming
- `stop-live-stream` - Stop live streaming

**Server → Client**:
- `notification` - Real-time notification payload
- `live-stream-started` - Live stream started
- `live-stream-ended` - Live stream ended
- `viewer-count-update` - Viewer count update

### Event Approval Workflow

1. Organiser creates/updates event with `PUBLISHED` status
2. System automatically changes to `PENDING_APPROVAL`
3. Real-time notification sent to all admins
4. Admin approves/rejects via admin endpoints
5. Real-time notification sent to organiser

### Live Streaming

- Start/stop live streaming for events
- Real-time viewer count tracking
- Stream URL and key management
- Automatic notifications when streams start/end
- WebSocket integration for real-time updates

For detailed real-time features documentation, see `REALTIME_NOTIFICATIONS.md` and `REALTIME_FEATURES_SUMMARY.md`.

---

## Architecture

### Project Structure

```
src/
├── common/              # Shared utilities
│   ├── decorators/      # @CurrentUser, @Roles, @Public
│   ├── filters/         # Exception filters
│   ├── guards/          # JwtAuthGuard, RolesGuard
│   ├── interceptors/    # Interceptors
│   ├── services/        # Common services (Redis, OTP, MPesa, Notifications)
│   ├── types/           # Type definitions
│   └── utils/           # Utilities (password, UUID, service isolation)
├── config/              # Configuration files
├── database/
│   ├── entities/        # TypeORM entities (19 entities)
│   ├── migrations/      # Database migrations
│   └── seeds/           # Database seeds
├── modules/              # Feature modules (20+ modules)
│   ├── auth/            # Authentication
│   ├── users/           # User management
│   ├── events/          # Event management
│   ├── orders/          # Order processing
│   ├── tickets/         # Ticket management
│   ├── payments/        # Payment processing
│   ├── admin/           # Admin dashboard
│   ├── websocket/       # WebSocket gateway
│   └── live-streaming/  # Live streaming
└── main.ts              # Application entry point
```

### Module Organization

Each feature module typically contains:
- `*.module.ts` - Module definition
- `*.service.ts` - Business logic
- `*.controller.ts` - HTTP endpoints
- `dto/` - Data transfer objects
- Tests (when implemented)

---

## Configuration

### Required Environment Variables

```env
# Application
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

# Database (REQUIRED)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=tixhub

# JWT (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_ACCESS_TTL=3600
JWT_REFRESH_TTL=2592000
JWT_ISSUER=TixHub

# Redis (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Optional Environment Variables

```env
# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@tixhub.com

# SMS (Optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# MPesa (Optional)
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=

# Streaming (Optional)
STREAM_BASE_URL=rtmp://stream.tixhub.com/live
```

**⚠️ Important**: Never commit `.env` file to version control.

---

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set strong `JWT_SECRET` (minimum 32 characters)
- [ ] Set `synchronize: false` in database config (use migrations)
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Set up Redis for caching (optional)
- [ ] Configure proper database credentials
- [ ] Set up SSL/TLS
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging

### Production Build

```bash
npm run build
npm run start:prod
```

---

## Testing & Seeding

### Database Seeding

Seed users with default test accounts:

```bash
npm run seed:users
```

This creates:
- 2 Admin users (admin@tixhub.com, superadmin@tixhub.com)
- 3 Organiser users (organiser1@tixhub.com, organiser2@tixhub.com, promoter@tixhub.com)
- 2 Staff users (staff1@tixhub.com, staff2@tixhub.com)
- 5 Regular users (user1@tixhub.com through user5@tixhub.com)

**Default password for all seeded users**: `Password123!`

### Test Users

- **Admin**: admin@tixhub.com / Password123!
- **Organiser**: organiser1@tixhub.com / Password123!
- **User**: user1@tixhub.com / Password123!

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": {...},
  "timestamp": "2025-12-06T20:00:00.000Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request",
  "timestamp": "2025-12-06T20:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

---

## Security

- **JWT token authentication** with short-lived access tokens
- **Password hashing** with bcrypt (12 rounds)
- **Rate limiting** configured (100 requests/minute)
- **CORS configuration** for allowed origins
- **Helmet** for security headers
- **Input validation** with class-validator
- **No sensitive data** in code - all in `.env`
- **Role-based access control** (RBAC)

---

## Performance

- Efficient database queries with proper indexing
- Connection pooling configured
- Pagination on all list endpoints
- Optimized relations loading
- Redis caching ready
- Query optimization
- Service isolation prevents cascading failures

---

## Troubleshooting

### Database Connection Issues
- Verify database credentials in `.env`
- Ensure MySQL is running
- Check database exists: `SHOW DATABASES;`

### JWT Errors
- Ensure `JWT_SECRET` is set in `.env`
- Verify secret is at least 32 characters
- Check token expiration

### CORS Issues
- Verify `CORS_ORIGIN` in `.env` matches frontend URL
- Check browser console for CORS errors

### Service Failures
- Check logs in `logs/error.log`
- Verify Redis connection (if using)
- Check circuit breaker states
- Review service isolation logs

---

## Related Documentation

- `API_SPECIFICATION.md` - Complete API endpoint documentation
- `ERROR_HANDLING_SUMMARY.md` - Error handling implementation details
- `SERVICE_ISOLATION.md` - Service isolation patterns
- `REALTIME_NOTIFICATIONS.md` - Real-time notifications guide
- `REALTIME_FEATURES_SUMMARY.md` - Real-time features summary
- `MIGRATIONS.md` - Database migration guide
- `RUNNING_STATUS.md` - Service status and quick commands

---

## License

Private - TixHub Platform

---

**Built with NestJS, TypeORM, MySQL, TypeScript, and Socket.IO**

