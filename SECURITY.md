# Security Audit & Mitigations

This document summarizes security considerations and mitigations for the Tickit backend API.

## Implemented mitigations

### 1. Authentication & authorization
- **JWT + Guards**: All non-public routes use `JwtAuthGuard`. Admin routes use `RolesGuard` with `@Roles(UserRole.ADMIN)` (and where needed, `UserRole.ORGANISER`).
- **Ownership checks**: Ticket, order, refund, and support-ticket resources enforce ownership in services (e.g. `ticket.ownerId === userId`, `order.buyerId === userId`).
- **Multi-tenant (organiser) isolation**: Refund approve/reject for ORGANISER role is scoped to the current user’s organiser profile (`refund.order.organiserId` must match their organiser id).

### 2. IDOR prevention
- **UUIDs**: Resource IDs use UUIDs (`UuidParamDto`) where applied to avoid enumeration.
- **Ticket by ID**: `TicketsService.findOne(id, userId)` enforces `ticket.ownerId === userId` (or guest tickets with no owner).
- **Ticket by number**: `findByTicketNumber` now requires auth and enforces ownership so only the ticket owner (or guest ticket) can access by number.
- **Orders**: `OrdersService.findOne(id, buyerId)` enforces buyer or guest-order rules.
- **Refunds**: `findOne(id, userId)` enforces `refund.order.buyerId === userId`; approve/reject for organisers is scoped by organiser.

### 3. Input validation & mass assignment
- **ValidationPipe**: Global pipe with `whitelist: true` and `forbidNonWhitelisted: true` to strip and reject unknown fields.
- **DTOs**: Controllers use class-validator DTOs (e.g. `CreateRefundDto`, `CreateSupportTicketDto`) so only allowed fields are accepted.

### 4. Rate limiting & abuse
- **Global throttle**: `ThrottlerGuard` is registered as `APP_GUARD` (100 requests per minute per IP by default).
- **Auth endpoints**: Stricter limits:
  - Login: 10 requests/minute
  - Signup: 5 requests/minute
  - Send OTP: 5 requests/minute
  - Verify phone: 10 requests/minute

### 5. Other security measures
- **Helmet**: Enabled in `main.ts`.
- **CORS**: Configured with explicit origins (and dev localhost handling).
- **Secrets**: Configuration via environment variables (e.g. `.env`); no hardcoded secrets in code.
- **Structured logging**: File logger and error handling for diagnostics without logging sensitive payloads in plain text.

## Route ordering (API enumeration)

- **Support tickets**: The `GET admin/all` route is declared **before** `GET :id` so that `admin/all` is matched correctly and not as `id = 'admin'`.

## Recommendations (ongoing)

1. **File uploads**: If you add attachments (e.g. for support tickets), enforce type/size limits, store outside webroot (e.g. S3), and scan for malware.
2. **Sensitive data**: Avoid logging request/response bodies that may contain PII or tokens; mask or redact in logs where needed.
3. **Dependencies**: Run `npm audit` and keep dependencies updated (e.g. Dependabot).
4. **Admin DTOs**: Consider replacing inline body types in admin user create/update with DTOs and explicit validation for roles/metadata.
5. **OrganiserId in support tickets**: `CreateSupportTicketDto` allows optional `organiserId`; consider validating that the user is allowed to attach the ticket to that organiser (e.g. they are the organiser or have a relation).

## Summary

- Authentication and ownership are enforced on tickets, orders, refunds, and support tickets.
- Refund approve/reject is scoped for organisers to their own events.
- Global and auth-specific throttling is in place.
- Validation and DTOs limit mass assignment and invalid input.
- UUIDs and service-level checks reduce IDOR and enumeration risk.
