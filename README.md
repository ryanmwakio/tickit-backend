# TixHub Backend API

A comprehensive event & ticketing platform backend built with NestJS, TypeORM, and MySQL. This backend provides a complete REST API for managing events, tickets, orders, payments, and more.

## 🚀 Features

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

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **MySQL** 8.0+ (or MariaDB 10.3+)
- **Redis** (optional, for caching and queues)
- **TypeScript** 5.0+

## 🛠️ Installation

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

5. **Start the application**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

Once the server is running:
- **Swagger UI**: `http://localhost:5000/api/docs`
- **Health Check**: `http://localhost:5000/health`
- **Base API URL**: `http://localhost:5000/api/v1`

## 🏗️ Project Structure

```
src/
├── common/              # Shared utilities
│   ├── decorators/      # @CurrentUser, @Roles, @Public
│   ├── filters/         # Exception filters
│   ├── guards/          # JwtAuthGuard, RolesGuard
│   ├── interceptors/    # Interceptors
│   ├── pipes/           # Validation pipes
│   └── utils/           # Password, UUID utilities
├── config/              # Configuration files (uses .env)
├── database/
│   ├── entities/        # TypeORM entities (17 entities)
│   ├── migrations/      # Database migrations
│   └── seeds/           # Database seeds
├── modules/              # Feature modules (20 modules)
│   ├── auth/            # Authentication
│   ├── users/           # User management
│   ├── events/          # Event management
│   ├── organisers/      # Organiser management
│   ├── orders/          # Order processing
│   ├── tickets/         # Ticket management
│   ├── payments/        # Payment processing
│   ├── checkins/        # Check-in system
│   ├── admin/           # Admin dashboard
│   ├── analytics/       # Analytics
│   ├── support-tickets/ # Support system
│   ├── content-blocks/  # CMS
│   └── websocket/       # WebSocket gateway
└── main.ts              # Application entry point
```

## 🔐 Authentication

The API uses JWT authentication. Include the token in requests:

```bash
Authorization: Bearer <access_token>
```

### Authentication Endpoints

- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (revoke refresh token)
- `GET /api/v1/auth/me` - Get current user

## 📦 Core Modules

### Auth Module
Handles authentication, JWT tokens, and user sessions with refresh token support.

### Users Module
User profile management, role switching, and user operations.

### Events Module
Event creation, management, and discovery with advanced filtering, search, and pagination.

### Orders Module
Order processing, checkout flow, and order management with ticket generation.

### Tickets Module
Ticket generation, QR codes, transfers, and validation.

### Payments Module
Payment processing structure, ready for MPesa integration, card payments, and webhooks.

### Organisers Module
Organiser profiles, management, and dashboard endpoints.

### Checkins Module
Ticket check-in system for events with QR scanning and duplicate detection.

### Admin Module
Platform-wide admin dashboard with statistics, user management, event oversight, and payment monitoring.

### Analytics Module
Event analytics, organiser analytics, and sales trends.

### Support Tickets Module
Customer support ticket system with messaging and status management.

### WebSocket Module
Real-time updates via WebSocket connections with JWT authentication.

## 🗄️ Database

The application uses MySQL with TypeORM. Entities are defined in `src/database/entities/`.

### Key Entities (17 total)

- `User` - User accounts with multi-role support
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

## 🔧 Configuration

**All configuration uses environment variables via `.env` file. No sensitive data is hardcoded.**

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
SMTP_PASS=

# SMS (Optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# MPesa (Optional)
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
```

**⚠️ Important**: Never commit `.env` file to version control. Always use `.env.example` as a template.

## 📡 API Endpoints

### Authentication (5 endpoints)
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Users (2 endpoints)
- `GET /api/v1/users/me` - Get user profile
- `PATCH /api/v1/users/me/role` - Update active role

### Organisers (8 endpoints)
- `POST /api/v1/organisers` - Create organiser
- `GET /api/v1/organisers` - List organisers
- `GET /api/v1/organisers/:id` - Get organiser
- `PUT /api/v1/organisers/:id` - Update organiser
- `DELETE /api/v1/organisers/:id` - Delete organiser
- `GET /api/v1/organisers/:id/dashboard/stats` - Dashboard stats
- `GET /api/v1/organisers/:id/events` - Organiser events
- `GET /api/v1/organisers/:id/orders` - Organiser orders
- `GET /api/v1/organisers/:id/refunds` - Organiser refunds

### Events (6 endpoints)
- `GET /api/v1/events` - List events (with filters, search, pagination)
- `GET /api/v1/events/:id` - Get event by ID
- `GET /api/v1/events/slug/:slug` - Get event by slug
- `POST /api/v1/events` - Create event (Organiser only)
- `PUT /api/v1/events/:id` - Update event (Organiser owner)
- `DELETE /api/v1/events/:id` - Delete event (Organiser owner)

### Ticket Types (5 endpoints)
- `GET /api/v1/ticket-types/events/:eventId` - List ticket types
- `GET /api/v1/ticket-types/:id` - Get ticket type
- `POST /api/v1/ticket-types/events/:eventId` - Create ticket type
- `PUT /api/v1/ticket-types/:id` - Update ticket type
- `DELETE /api/v1/ticket-types/:id` - Delete ticket type

### Orders (4 endpoints)
- `POST /api/v1/orders` - Create order (checkout)
- `GET /api/v1/orders` - List user orders
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders/:id/pay` - Mark order as paid

### Tickets (5 endpoints)
- `GET /api/v1/tickets` - List user tickets
- `GET /api/v1/tickets/:id` - Get ticket by ID
- `GET /api/v1/tickets/number/:ticketNumber` - Get ticket by number
- `POST /api/v1/tickets/:id/transfer` - Transfer ticket
- `POST /api/v1/tickets/:id/void` - Void ticket

### Checkins (3 endpoints)
- `POST /api/v1/checkins/scan` - Scan ticket QR code
- `GET /api/v1/checkins/events/:eventId` - Get event checkins
- `GET /api/v1/checkins/events/:eventId/manifest` - Get event manifest

### Venues (5 endpoints)
- `GET /api/v1/venues` - List venues
- `GET /api/v1/venues/:id` - Get venue
- `POST /api/v1/venues` - Create venue (Admin/Organiser)
- `PUT /api/v1/venues/:id` - Update venue (Admin/Organiser)
- `DELETE /api/v1/venues/:id` - Delete venue (Admin only)

### Analytics (3 endpoints)
- `GET /api/v1/analytics/events/:eventId` - Event analytics
- `GET /api/v1/analytics/organisers/:organiserId` - Organiser analytics
- `GET /api/v1/analytics/organisers/:organiserId/sales-trend` - Sales trend

### Admin (5 endpoints)
- `GET /api/v1/admin/dashboard/stats` - Platform statistics (Admin only)
- `GET /api/v1/admin/users` - List all users (Admin only)
- `GET /api/v1/admin/events` - List all events (Admin only)
- `GET /api/v1/admin/payments` - List all payments (Admin only)
- `GET /api/v1/admin/refunds` - List all refunds (Admin only)

### Support Tickets (5 endpoints)
- `POST /api/v1/support-tickets` - Create support ticket
- `GET /api/v1/support-tickets` - List support tickets
- `GET /api/v1/support-tickets/:id` - Get support ticket
- `POST /api/v1/support-tickets/:id/messages` - Add message
- `PUT /api/v1/support-tickets/:id/status` - Update status

### Content Blocks (5 endpoints)
- `GET /api/v1/content-blocks` - List content blocks (Public)
- `GET /api/v1/content-blocks/key/:key` - Get by key (Public)
- `POST /api/v1/content-blocks` - Create (Admin only)
- `PUT /api/v1/content-blocks/:id` - Update (Admin only)
- `DELETE /api/v1/content-blocks/:id` - Delete (Admin only)

### Payments (6 endpoints)
- `POST /api/v1/payments` - Create payment
- `GET /api/v1/payments` - List payments
- `GET /api/v1/payments/:id` - Get payment
- `POST /api/v1/payments/mpesa/express` - Initiate MPesa Express
- `POST /api/v1/payments/mpesa/confirm` - MPesa webhook (Public)
- `PUT /api/v1/payments/:id/status` - Update payment status

**Total: 60+ endpoints**

## 🏃 Running the Application

### Development
```bash
npm run start:dev
```
The API will be available at `http://localhost:5000`

### Production
```bash
npm run build
npm run start:prod
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 Scripts

- `npm run build` - Build the application
- `npm run start:dev` - Start in development mode (watch mode)
- `npm run start:prod` - Start in production mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run migration:generate` - Generate migration
- `npm run migration:run` - Run migrations
- `npm run migration:revert` - Revert last migration

## 🚀 Deployment

1. **Set production environment variables** in `.env`
2. **Build the application**: `npm run build`
3. **Run migrations** (when set up): `npm run migration:run`
4. **Start the application**: `npm run start:prod`

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

## 🔒 Security

- **JWT token authentication** with short-lived access tokens
- **Password hashing** with bcrypt (12 rounds)
- **Rate limiting** configured (100 requests/minute)
- **CORS configuration** for allowed origins
- **Helmet** for security headers
- **Input validation** with class-validator
- **No sensitive data** in code - all in `.env`
- **Role-based access control** (RBAC)

## 📈 Performance

- Efficient database queries with proper indexing
- Connection pooling configured
- Pagination on all list endpoints
- Optimized relations loading
- Redis caching ready
- Query optimization

## 🎯 Frontend Integration

### Admin Dashboard
- `/admin/dashboard/stats` - Platform statistics
- `/admin/users` - User management
- `/admin/events` - Event oversight
- `/admin/payments` - Payment monitoring
- `/admin/refunds` - Refund management

### Organiser Dashboard
- `/organisers/:id/dashboard/stats` - Organiser statistics
- `/organisers/:id/events` - Organiser events
- `/organisers/:id/orders` - Order management
- `/organisers/:id/refunds` - Refund management

### Events Pages
- `/events` - Event listing with filters
- `/events/:id` - Event details
- `/events/slug/:slug` - Event by slug
- `/ticket-types/events/:eventId` - Event ticket types

### User Management
- `/users/me` - User profile
- `/users/me/role` - Update active role
- `/tickets` - User tickets
- `/orders` - User orders

## 🔄 API Versioning

All endpoints are versioned under `/api/v1`. The structure supports future versions:
- Current: `/api/v1/...`
- Future: `/api/v2/...` (folder structure ready)

## 📊 Response Formats

### Success Response
```json
{
  "id": "uuid",
  "data": {...},
  "createdAt": "2025-12-06T20:00:00.000Z",
  "updatedAt": "2025-12-06T20:00:00.000Z"
}
```

### Paginated Response
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request",
  "timestamp": "2025-12-06T20:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

## 🔐 Authorization

- **Public**: No authentication required
- **Auth Required**: JWT token required
- **Admin Only**: Requires ADMIN role
- **Organiser Only**: Requires ORGANISER role and ownership
- **Staff Only**: Requires STAFF role

## 🗄️ Database Schema

The application uses TypeORM with MySQL. In development mode, tables are auto-created (`synchronize: true`). For production, use migrations.

### Key Relationships

- User (1) → (N) Organisers
- Organiser (1) → (N) Events
- Event (1) → (N) TicketTypes
- Event (1) → (1) Venue
- Order (1) → (N) OrderItems
- OrderItem (1) → (N) Tickets
- Ticket (1) → (N) Checkins
- User (1) → (N) Orders
- Order (1) → (N) Payments

## 🚨 Error Handling

All errors are handled by a global exception filter that returns consistent error responses. Validation errors are automatically formatted.

## 📚 Swagger Documentation

Interactive API documentation is available at `/api/docs` when the server is running. It includes:
- All endpoints
- Request/response schemas
- Authentication requirements
- Try-it-out functionality

## 🔧 Troubleshooting

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

## 📄 License

Private - TixHub Platform

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

---

**Built with NestJS, TypeORM, MySQL, and TypeScript**
