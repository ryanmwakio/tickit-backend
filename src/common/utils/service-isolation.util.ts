import { Logger } from '@nestjs/common';

const logger = new Logger('ServiceIsolation');

export interface ServiceCallOptions {
  timeout?: number;
  retries?: number;
  fallback?: () => Promise<any>;
  critical?: boolean; // If true, failure will throw; if false, will log and return fallback
}

/**
 * Wraps service calls with timeout, retry, and error isolation
 * Prevents one service failure from affecting others
 */
export async function isolatedServiceCall<T>(
  serviceName: string,
  call: () => Promise<T>,
  options: ServiceCallOptions = {},
): Promise<T | null> {
  const {
    timeout = 5000, // 5 seconds default timeout
    retries = 0,
    fallback,
    critical = false,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Service call to ${serviceName} timed out after ${timeout}ms`));
        }, timeout);
      });

      // Race between the actual call and timeout
      const result = await Promise.race([call(), timeoutPromise]);

      // Success - return result
      if (attempt > 0) {
        logger.warn(`${serviceName} succeeded on retry attempt ${attempt + 1}`);
      }

      return result as T;
    } catch (error: any) {
      lastError = error;
      const isTimeout = error.message?.includes('timed out');
      const isLastAttempt = attempt === retries;

      if (isTimeout) {
        logger.warn(`${serviceName} call timed out (attempt ${attempt + 1}/${retries + 1})`);
      } else {
        logger.warn(`${serviceName} call failed (attempt ${attempt + 1}/${retries + 1}): ${error.message}`);
      }

      // If this is the last attempt, handle failure
      if (isLastAttempt) {
        if (critical) {
          // Critical service - throw error
          logger.error(`${serviceName} failed after ${retries + 1} attempts. This is a critical service.`);
          throw error;
        } else {
          // Non-critical service - log and return fallback or null
          logger.error(`${serviceName} failed after ${retries + 1} attempts. Using fallback or returning null.`);
          
          if (fallback) {
            try {
              return await fallback();
            } catch (fallbackError: any) {
              logger.error(`${serviceName} fallback also failed: ${fallbackError.message}`);
              return null;
            }
          }
          
          return null;
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  if (critical) {
    throw lastError || new Error(`${serviceName} failed unexpectedly`);
  }
  return null;
}

/**
 * Circuit breaker pattern for external service calls
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly name: string,
    private readonly failureThreshold = 5,
    private readonly resetTimeout = 60000, // 1 minute
  ) {}

  async execute<T>(call: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        logger.log(`${this.name} circuit breaker: Attempting to close (HALF_OPEN)`);
      } else {
        throw new Error(`${this.name} circuit breaker is OPEN. Service unavailable.`);
      }
    }

    try {
      const result = await call();
      
      // Success - reset failures and close circuit if it was half-open
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
        logger.log(`${this.name} circuit breaker: Closed after successful call`);
      } else {
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        logger.error(`${this.name} circuit breaker: OPENED after ${this.failures} failures`);
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
  }
}

// Circuit breakers for external services
export const circuitBreakers = {
  redis: new CircuitBreaker('Redis', 5, 60000),
  mpesa: new CircuitBreaker('MPesa', 3, 120000),
  notifications: new CircuitBreaker('Notifications', 10, 30000),
  payments: new CircuitBreaker('Payments', 3, 120000),
};

