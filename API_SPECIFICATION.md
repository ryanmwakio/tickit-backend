# TixHub API Specification

## Standardized Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "requestId": "optional-request-id"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2025-01-15T10:30:00.000Z",
  "requestId": "optional-request-id"
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request",
  "validationErrors": {
    "field": ["error message"]
  },
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/api/v1/endpoint",
  "requestId": "optional-request-id"
}
```

## API Endpoints

### Authentication

#### POST /auth/signup
**Description:** Register a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "phoneNumber": "+254712345678",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `ApiResponseDto<{ user: UserResponseDto, tokens: TokenResponseDto }>`

---

#### POST /auth/login
**Description:** Authenticate user and get access tokens

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
OR
```json
{
  "phoneNumber": "+254712345678",
  "password": "securePassword123"
}
```

**Response:** `ApiResponseDto<{ user: UserResponseDto, tokens: TokenResponseDto }>`

---

#### POST /auth/refresh
**Description:** Refresh access token using refresh token

**Request Body:**
```json
{
  "refreshToken": "refresh_token_string"
}
```

**Response:** `ApiResponseDto<{ tokens: TokenResponseDto }>`

---

#### POST /auth/verify-phone
**Description:** Verify phone number with OTP

**Request Body:**
```json
{
  "phoneNumber": "+254712345678",
  "otp": "123456"
}
```

**Response:** `ApiResponseDto<{ verified: boolean }>`

---

#### POST /auth/send-otp
**Description:** Send OTP to phone number

**Request Body:**
```json
{
  "phoneNumber": "+254712345678"
}
```

**Response:** `ApiResponseDto<{ sent: boolean, expiresIn: number }>`

---

#### POST /auth/social
**Description:** Social login (Google, Facebook, etc.)

**Request Body:**
```json
{
  "provider": "google",
  "accessToken": "provider_access_token",
  "idToken": "provider_id_token"
}
```

**Response:** `ApiResponseDto<{ user: UserResponseDto, tokens: TokenResponseDto }>`

---

### Events & Catalog

#### GET /events
**Description:** List/search events with filters

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `query` (string) - Search term
- `category` (string) - Filter by category
- `region` (string) - Filter by region/location
- `dateFrom` (ISO 8601) - Filter events from date
- `dateTo` (ISO 8601) - Filter events to date
- `priceMin` (number) - Minimum price in cents
- `priceMax` (number) - Maximum price in cents
- `status` (string) - Filter by status (PUBLISHED, DRAFT, etc.)
- `sortBy` (string) - Sort by: date, price-low, price-high, title

**Response:** `PaginatedResponseDto<EventResponseDto[]>`

---

#### GET /events/:id
**Description:** Get event details by ID

**Response:** `ApiResponseDto<EventResponseDto>`

---

#### GET /events/slug/:slug
**Description:** Get event details by slug

**Response:** `ApiResponseDto<EventResponseDto>`

---

#### POST /events
**Description:** Create new event (Organiser only)

**Headers:** `Authorization: Bearer <token>`, `X-Idempotency-Key: <uuid>`

**Request Body:**
```json
{
  "title": "Event Title",
  "description": "Event description",
  "category": "Music",
  "venueId": "venue-uuid",
  "startsAt": "2025-12-12T18:00:00+03:00",
  "endsAt": "2025-12-12T23:00:00+03:00",
  "timezone": "Africa/Nairobi",
  "capacity": 1000,
  "coverImageUrl": "https://...",
  "imageGalleryUrls": ["https://..."],
  "tags": ["tag1", "tag2"],
  "salesStartsAt": "2025-11-01T00:00:00+03:00",
  "salesEndsAt": "2025-12-11T23:59:59+03:00",
  "visibility": "PUBLIC",
  "metadata": {}
}
```

**Response:** `ApiResponseDto<EventResponseDto>`

---

#### PUT /events/:id
**Description:** Update event (Organiser owner only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as POST /events (all fields optional)

**Response:** `ApiResponseDto<EventResponseDto>`

---

#### DELETE /events/:id
**Description:** Delete event (Organiser owner only)

**Headers:** `Authorization: Bearer <token>`

**Response:** `ApiResponseDto<{ deleted: boolean }>`

---

### Checkout & Orders

#### POST /checkout
**Description:** Create order and initiate checkout

**Headers:** `Authorization: Bearer <token>`, `X-Idempotency-Key: <uuid>` (required)

**Request Body:**
```json
{
  "organiserId": "organiser-uuid",
  "items": [
    {
      "ticketTypeId": "ticket-type-uuid",
      "quantity": 2,
      "attendees": [
        {
          "name": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "+254712345678"
        }
      ]
    }
  ],
  "payment": {
    "method": "mpesa_express",
    "metadata": {
      "phone": "+254712345678"
    }
  },
  "metadata": {
    "promoCode": "EARLYBIRD"
  }
}
```

**Response:** `ApiResponseDto<{ order: OrderResponseDto, paymentInstructions?: any }>`

---

#### GET /orders
**Description:** List user's orders

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string) - Filter by status

**Response:** `PaginatedResponseDto<OrderResponseDto[]>`

---

#### GET /orders/:id
**Description:** Get order details with tickets

**Headers:** `Authorization: Bearer <token>`

**Response:** `ApiResponseDto<OrderResponseDto>`

---

#### POST /orders/:id/resend
**Description:** Resend tickets via email/SMS

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "method": "email" // or "sms"
}
```

**Response:** `ApiResponseDto<{ sent: boolean }>`

---

### Payments

#### POST /payments/mpesa/express
**Description:** Initiate MPesa Express (STK Push) payment

**Headers:** `Authorization: Bearer <token>`, `X-Idempotency-Key: <uuid>`

**Request Body:**
```json
{
  "orderId": "order-uuid",
  "phoneNumber": "+254712345678",
  "amountCents": 50000
}
```

**Response:** `ApiResponseDto<{ checkoutToken: string, expiresAt: string }>`

---

#### POST /payments/mpesa/confirm
**Description:** Webhook handler for MPesa confirmation (called by Safaricom)

**Request Body:** MPesa callback payload

**Response:** `ApiResponseDto<{ processed: boolean }>`

---

#### POST /payments/card
**Description:** Process card payment

**Headers:** `Authorization: Bearer <token>`, `X-Idempotency-Key: <uuid>`

**Request Body:**
```json
{
  "orderId": "order-uuid",
  "token": "payment_token_from_gateway",
  "amountCents": 50000
}
```

**Response:** `ApiResponseDto<{ payment: PaymentResponseDto }>`

---

#### POST /webhooks/:provider
**Description:** Generic webhook receiver for payment providers

**Request Body:** Provider-specific payload

**Response:** `ApiResponseDto<{ received: boolean }>`

---

### Tickets

#### GET /tickets
**Description:** List user's tickets

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string) - Filter by status
- `eventId` (string) - Filter by event

**Response:** `PaginatedResponseDto<TicketResponseDto[]>`

---

#### GET /tickets/:id
**Description:** Get ticket details by ID

**Headers:** `Authorization: Bearer <token>`

**Response:** `ApiResponseDto<TicketResponseDto>`

---

#### GET /tickets/number/:ticketNumber
**Description:** Get ticket by ticket number

**Headers:** `Authorization: Bearer <token>`

**Response:** `ApiResponseDto<TicketResponseDto>`

---

#### POST /tickets/:id/transfer
**Description:** Transfer ticket to another user

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "recipient@example.com",
  "phoneNumber": "+254712345678"
}
```

**Response:** `ApiResponseDto<{ ticket: TicketResponseDto }>`

---

#### POST /tickets/:id/void
**Description:** Void a ticket (Organiser/Admin only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "reason": "Refund requested"
}
```

**Response:** `ApiResponseDto<{ ticket: TicketResponseDto }>`

---

### Check-in / Scanner

#### POST /scanner/scan
**Description:** Scan ticket QR code for check-in

**Headers:** `Authorization: Bearer <token>` (Staff role required)

**Request Body:**
```json
{
  "code": "qr_code_string",
  "gateId": "gate-uuid-optional"
}
```

**Response:** `ApiResponseDto<{ ticket: TicketResponseDto, checkin: CheckinResponseDto, valid: boolean }>`

---

#### POST /scanner/batch-scan
**Description:** Batch upload scans (for offline sync)

**Headers:** `Authorization: Bearer <token>` (Staff role required)

**Request Body:**
```json
{
  "scans": [
    {
      "code": "qr_code_string",
      "scannedAt": "2025-01-15T10:30:00.000Z",
      "gateId": "gate-uuid"
    }
  ]
}
```

**Response:** `ApiResponseDto<{ results: Array<{ code: string, status: string, error?: string }> }>`

---

#### GET /events/:eventId/manifest
**Description:** Get event check-in manifest (CSV download)

**Headers:** `Authorization: Bearer <token>` (Organiser/Staff role required)

**Query Parameters:**
- `format` (string) - csv or json (default: csv)

**Response:** CSV file or `ApiResponseDto<CheckinManifestResponseDto>`

---

#### GET /events/:eventId/checkins
**Description:** Get event check-ins list

**Headers:** `Authorization: Bearer <token>` (Organiser/Staff role required)

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:** `PaginatedResponseDto<CheckinResponseDto[]>`

---

### Resale & Marketplace

#### POST /resale/list
**Description:** List ticket for resale

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "ticketId": "ticket-uuid",
  "priceCents": 60000
}
```

**Response:** `ApiResponseDto<{ listing: ResaleListingResponseDto }>`

---

#### GET /resale/listings
**Description:** Search resale listings

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `eventId` (string) - Filter by event
- `priceMin` (number) - Minimum price
- `priceMax` (number) - Maximum price

**Response:** `PaginatedResponseDto<ResaleListingResponseDto[]>`

---

#### POST /resale/:listingId/buy
**Description:** Purchase resale ticket

**Headers:** `Authorization: Bearer <token>`, `X-Idempotency-Key: <uuid>`

**Request Body:**
```json
{
  "payment": {
    "method": "mpesa_express",
    "metadata": {
      "phone": "+254712345678"
    }
  }
}
```

**Response:** `ApiResponseDto<{ order: OrderResponseDto, ticket: TicketResponseDto }>`

---

### Organisers

#### GET /organisers
**Description:** List organisers

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:** `PaginatedResponseDto<OrganiserResponseDto[]>`

---

#### GET /organisers/:id
**Description:** Get organiser details

**Response:** `ApiResponseDto<OrganiserResponseDto>`

---

#### POST /organisers
**Description:** Create organiser profile

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Organiser Name",
  "description": "Description",
  "logoUrl": "https://..."
}
```

**Response:** `ApiResponseDto<OrganiserResponseDto>`

---

#### PUT /organisers/:id
**Description:** Update organiser (Owner only)

**Headers:** `Authorization: Bearer <token>`

**Response:** `ApiResponseDto<OrganiserResponseDto>`

---

### Venues

#### GET /venues
**Description:** List venues

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `organiserId` (string) - Filter by organiser

**Response:** `PaginatedResponseDto<VenueResponseDto[]>`

---

#### GET /venues/:id
**Description:** Get venue details

**Response:** `ApiResponseDto<VenueResponseDto>`

---

#### POST /venues
**Description:** Create venue (Organiser/Admin)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Venue Name",
  "address": "Full address",
  "city": "Nairobi",
  "latitude": -1.2921,
  "longitude": 36.8219,
  "capacity": 1000,
  "amenities": ["parking", "wifi"]
}
```

**Response:** `ApiResponseDto<VenueResponseDto>`

---

### Ticket Types

#### GET /ticket-types/events/:eventId
**Description:** List ticket types for an event

**Response:** `ApiResponseDto<TicketTypeResponseDto[]>`

---

#### GET /ticket-types/:id
**Description:** Get ticket type details

**Response:** `ApiResponseDto<TicketTypeResponseDto>`

---

#### POST /ticket-types/events/:eventId
**Description:** Create ticket type (Organiser owner)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "VIP",
  "description": "VIP ticket",
  "priceCents": 50000,
  "currency": "KES",
  "capacity": 100,
  "startSale": "2025-11-01T00:00:00+03:00",
  "endSale": "2025-12-11T23:59:59+03:00",
  "refundable": true
}
```

**Response:** `ApiResponseDto<TicketTypeResponseDto>`

---

### Users

#### GET /users/me
**Description:** Get current user profile

**Headers:** `Authorization: Bearer <token>`

**Response:** `ApiResponseDto<UserResponseDto>`

---

#### PATCH /users/me
**Description:** Update current user profile

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "avatarUrl": "https://..."
}
```

**Response:** `ApiResponseDto<UserResponseDto>`

---

### Analytics

#### GET /analytics/events/:eventId
**Description:** Get event analytics

**Headers:** `Authorization: Bearer <token>` (Organiser owner/Admin)

**Response:** `ApiResponseDto<EventAnalyticsResponseDto>`

---

#### GET /analytics/organisers/:organiserId
**Description:** Get organiser analytics

**Headers:** `Authorization: Bearer <token>` (Organiser owner/Admin)

**Response:** `ApiResponseDto<OrganiserAnalyticsResponseDto>`

---

### Admin

#### GET /admin/dashboard/stats
**Description:** Platform statistics (Admin only)

**Headers:** `Authorization: Bearer <token>` (Admin role required)

**Response:** `ApiResponseDto<AdminDashboardStatsResponseDto>`

---

## Common Headers

- `Authorization: Bearer <jwt_token>` - Required for authenticated endpoints
- `X-Idempotency-Key: <uuid>` - Required for POST /checkout, payment endpoints
- `Content-Type: application/json` - Required for POST/PUT/PATCH requests

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., seat unavailable)
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## Notes

- All timestamps are in ISO 8601 format
- All monetary amounts are in cents (smallest currency unit)
- All UUIDs are 36-character strings
- Pagination is 1-indexed
- Maximum page size is 100 items per request

