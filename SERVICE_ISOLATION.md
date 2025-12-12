# Service Isolation & Error Handling

This document describes the service isolation and error handling mechanisms implemented to ensure that when one service fails, it does not affect other services.

## Overview

The system uses multiple layers of error isolation:

1. **Circuit Breaker Pattern** - Prevents cascading failures
2. **Timeout Handling** - Prevents hanging requests
3. **Retry Logic** - Automatic retries with exponential backoff
4. **Graceful Degradation** - Non-critical services fail gracefully
5. **Error Isolation** - Services wrapped in try-catch with proper error handling

## Implementation

### Service Isolation Utility

Located in `src/common/utils/service-isolation.util.ts`:

- **`isolatedServiceCall()`** - Wraps service calls with timeout, retry, and error isolation
- **`CircuitBreaker`** - Implements circuit breaker pattern for external services
- **Pre-configured Circuit Breakers**:
  - Redis: 5 failures threshold, 60s reset timeout
  - MPesa: 3 failures threshold, 120s reset timeout
  - Notifications: 10 failures threshold, 30s reset timeout
  - Payments: 3 failures threshold, 120s reset timeout

### Service-Specific Isolation

#### Redis Service

- All Redis operations wrapped with circuit breaker
- Failures return `null` or `false` instead of throwing (fail-open)
- Idempotency checks fail-open to allow requests to proceed
- Seat holds released even if Redis fails

#### Notifications Service

- Email and SMS sending wrapped with circuit breaker
- Failures logged but don't block operations
- Order creation succeeds even if notifications fail
- Tickets can be resent later if initial send fails

#### Payments Service

- MPesa API calls wrapped with circuit breaker
- Payment records created even if MPesa API fails
- Failed payments marked as PENDING for retry
- Order creation succeeds even if payment initiation fails

#### Orders Service

- Payment service failures don't prevent order creation
- Notification failures don't prevent order completion
- Redis failures handled gracefully (fail-open for idempotency)
- All external service calls isolated with try-catch

## Error Handling Strategy

### Critical vs Non-Critical Services

**Critical Services** (failures throw errors):
- Database operations (TypeORM)
- Core business logic validation

**Non-Critical Services** (failures logged, operation continues):
- Redis caching
- Email/SMS notifications
- Payment initiation (payment record created, can retry)
- Analytics/logging

### Fail-Open vs Fail-Closed

**Fail-Open** (default for non-critical):
- Redis idempotency checks
- Notification sending
- Caching operations

**Fail-Closed** (for critical operations):
- Database transactions
- Payment processing (after order created)
- Authentication

## Timeout Configuration

- **Redis operations**: 2 seconds
- **Email/SMS**: 10 seconds
- **MPesa API**: 15 seconds
- **Payment callbacks**: 10 seconds

## Retry Strategy

- **Default retries**: 1 retry for most operations
- **Exponential backoff**: 100ms * 2^attempt, max 1000ms
- **Circuit breaker**: Prevents retries when service is down

## Monitoring

All service failures are logged with:
- Service name
- Error message
- Retry attempts
- Circuit breaker state

Logs are written to:
- Console (development)
- File logger (production)
- Error tracking (if configured)

## Best Practices

1. **Always wrap external service calls** with `isolatedServiceCall()`
2. **Use circuit breakers** for external APIs (MPesa, SMS, Email)
3. **Mark non-critical services** as `critical: false`
4. **Provide fallback functions** for important operations
5. **Log all failures** for monitoring and debugging
6. **Don't let notification failures block core operations**

## Example Usage

```typescript
// Non-critical service (notifications)
const sent = await isolatedServiceCall(
  'Notifications.sendEmail',
  () => circuitBreakers.notifications.execute(() => 
    this.emailService.send(to, subject, body)
  ),
  {
    timeout: 10000,
    retries: 1,
    critical: false,
    fallback: async () => false,
  },
);

// Critical service (database)
const order = await this.orderRepository.save(newOrder);
// No isolation needed - let it throw if database fails
```

