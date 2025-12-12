import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { isolatedServiceCall, circuitBreakers } from '../utils/service-isolation.util';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = this.configService.get('redis');
    
    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subscriber = this.client.duplicate();
    this.publisher = this.client.duplicate();

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis client error:', error);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
  }

  /**
   * Get value from Redis
   */
  async get(key: string): Promise<string | null> {
    return isolatedServiceCall(
      'Redis.get',
      () => circuitBreakers.redis.execute(() => this.client.get(key)),
      { timeout: 2000, retries: 1, critical: false },
    );
  }

  /**
   * Set value in Redis with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    const result = await isolatedServiceCall(
      'Redis.set',
      () => circuitBreakers.redis.execute(async () => {
        if (ttlSeconds) {
          await this.client.setex(key, ttlSeconds, value);
        } else {
          await this.client.set(key, value);
        }
        return true;
      }),
      { timeout: 2000, retries: 1, critical: false },
    );
    return result ?? false;
  }

  /**
   * Delete key from Redis
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set key with expiration if not exists (NX = Not eXists)
   */
  async setnx(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } else {
        const result = await this.client.set(key, value, 'NX');
        return result === 'OK';
      }
    } catch (error) {
      this.logger.error(`Error setting NX key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Error incrementing key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      this.logger.error(`Error decrementing key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check and set idempotency key
   * Returns true if key was set (first request), false if already exists (duplicate)
   */
  async checkIdempotencyKey(key: string, ttlSeconds: number = 3600): Promise<{
    isNew: boolean;
    cachedResponse?: any;
  }> {
    const idempotencyKey = `idempotency:${key}`;
    const cachedResponseKey = `idempotency:response:${key}`;

    try {
      // Check if key already exists - use circuit breaker for critical operation
      const exists = await isolatedServiceCall(
        'Redis.checkIdempotencyKey.exists',
        () => circuitBreakers.redis.execute(() => this.exists(idempotencyKey)),
        { timeout: 2000, retries: 1, critical: false, fallback: async () => false },
      ) ?? false;
      
      if (exists) {
        // Key exists, this is a duplicate request
        // Try to get cached response if available
        const cachedResponse = await this.get(cachedResponseKey);
        return {
          isNew: false,
          cachedResponse: cachedResponse ? JSON.parse(cachedResponse) : undefined,
        };
      }

      // Set the idempotency key
      await this.set(idempotencyKey, '1', ttlSeconds);
      
      return { isNew: true };
    } catch (error: any) {
      this.logger.error(`Error checking idempotency key ${key}: ${error.message}`);
      // On error, allow the request to proceed (fail open) - better than blocking legitimate requests
      return { isNew: true };
    }
  }

  /**
   * Cache response for idempotency key
   */
  async cacheIdempotencyResponse(key: string, response: any, ttlSeconds: number = 3600): Promise<void> {
    const cachedResponseKey = `idempotency:response:${key}`;
    try {
      await this.set(cachedResponseKey, JSON.stringify(response), ttlSeconds);
    } catch (error) {
      this.logger.error(`Error caching idempotency response ${key}:`, error);
    }
  }

  /**
   * Create distributed lock
   */
  async acquireLock(lockKey: string, ttlSeconds: number = 10): Promise<string | null> {
    const lockValue = `${Date.now()}-${Math.random()}`;
    const acquired = await this.setnx(`lock:${lockKey}`, lockValue, ttlSeconds);
    
    if (acquired) {
      return lockValue;
    }
    
    return null;
  }

  /**
   * Release distributed lock
   */
  async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
    try {
      // Use Lua script to ensure we only delete our own lock
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await this.client.eval(script, 1, `lock:${lockKey}`, lockValue);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error releasing lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Store seat hold
   */
  async holdSeats(eventId: string, ticketTypeId: string, quantity: number, ttlSeconds: number = 600): Promise<string> {
    const holdId = `hold:${eventId}:${ticketTypeId}:${Date.now()}:${Math.random()}`;
    const holdKey = `seat:hold:${holdId}`;
    
    try {
      await this.set(holdKey, JSON.stringify({
        eventId,
        ticketTypeId,
        quantity,
        createdAt: new Date().toISOString(),
      }), ttlSeconds);
      
      // Increment hold count for this ticket type
      await this.incr(`seat:holds:${eventId}:${ticketTypeId}`);
      
      return holdId;
    } catch (error) {
      this.logger.error(`Error holding seats:`, error);
      throw error;
    }
  }

  /**
   * Release seat hold
   */
  async releaseSeatHold(holdId: string): Promise<boolean> {
    const holdKey = `seat:hold:${holdId}`;
    
    try {
      const holdData = await this.get(holdKey);
      if (!holdData) {
        return false;
      }

      const hold = JSON.parse(holdData);
      await this.del(holdKey);
      
      // Decrement hold count
      await this.decr(`seat:holds:${hold.eventId}:${hold.ticketTypeId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error releasing seat hold ${holdId}:`, error);
      return false;
    }
  }

  /**
   * Get current hold count for ticket type
   */
  async getHoldCount(eventId: string, ticketTypeId: string): Promise<number> {
    try {
      const count = await this.get(`seat:holds:${eventId}:${ticketTypeId}`);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      this.logger.error(`Error getting hold count:`, error);
      return 0;
    }
  }
}

