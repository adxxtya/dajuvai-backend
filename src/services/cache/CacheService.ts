import { Redis } from 'ioredis';
import { getRedisClient, isRedisAvailable } from '../../config/redis.config';
import logger from '../../config/logger.config';

/**
 * CacheService provides Redis-based caching with graceful degradation
 * 
 * This service implements a cache-aside pattern with the following features:
 * - JSON serialization/deserialization for complex objects
 * - TTL (Time To Live) support for automatic expiration
 * - Pattern-based cache invalidation
 * - Graceful degradation when Redis is unavailable
 * - Error handling that logs but doesn't throw (fail-safe)
 * 
 * Requirements: 8.1, 8.2, 8.3
 */
export class CacheService {
  private static warningLogged = false;
  private redisClient: Redis | null;

  constructor() {
    this.redisClient = getRedisClient();
    
    if (!this.redisClient && !CacheService.warningLogged) {
      logger.warn('CacheService initialized without Redis connection. Caching will be disabled.');
      CacheService.warningLogged = true;
    }
  }

  /**
   * Get a value from cache and parse it as JSON
   * 
   * @param key - Cache key
   * @returns Parsed value or null if not found or error occurs
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redisClient || !isRedisAvailable()) {
      logger.debug(`Cache miss (Redis unavailable): ${key}`);
      return null;
    }

    try {
      const value = await this.redisClient.get(key);
      
      if (value === null) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key "${key}":`, error);
      // Graceful degradation - return null on error
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   * 
   * @param key - Cache key
   * @param value - Value to cache (will be JSON stringified)
   * @param ttl - Time to live in seconds (default: 3600 = 1 hour)
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!this.redisClient || !isRedisAvailable()) {
      logger.debug(`Cache set skipped (Redis unavailable): ${key}`);
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redisClient.setex(key, ttl, serialized);
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Cache set error for key "${key}":`, error);
      // Graceful degradation - don't throw, just log
    }
  }

  /**
   * Delete a single key from cache
   * 
   * @param key - Cache key to delete
   */
  async del(key: string): Promise<void> {
    if (!this.redisClient || !isRedisAvailable()) {
      logger.debug(`Cache delete skipped (Redis unavailable): ${key}`);
      return;
    }

    try {
      await this.redisClient.del(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error(`Cache delete error for key "${key}":`, error);
      // Graceful degradation - don't throw, just log
    }
  }

  /**
   * Invalidate all keys matching a pattern
   * 
   * Uses SCAN to find keys matching the pattern and deletes them in batches
   * This is more efficient than KEYS for large datasets
   * 
   * @param pattern - Redis pattern (e.g., "products:*", "user:123:*")
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.redisClient || !isRedisAvailable()) {
      logger.debug(`Cache invalidate pattern skipped (Redis unavailable): ${pattern}`);
      return;
    }

    try {
      const keys: string[] = [];
      let cursor = '0';

      // Use SCAN to find all matching keys
      do {
        const [nextCursor, foundKeys] = await this.redisClient.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      // Delete keys in batches if any were found
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        logger.debug(`Cache invalidated pattern "${pattern}": ${keys.length} keys deleted`);
      } else {
        logger.debug(`Cache invalidate pattern "${pattern}": no keys found`);
      }
    } catch (error) {
      logger.error(`Cache invalidate pattern error for "${pattern}":`, error);
      // Graceful degradation - don't throw, just log
    }
  }

  /**
   * Check if a key exists in cache
   * 
   * @param key - Cache key to check
   * @returns true if key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    if (!this.redisClient || !isRedisAvailable()) {
      logger.debug(`Cache exists check skipped (Redis unavailable): ${key}`);
      return false;
    }

    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key "${key}":`, error);
      // Graceful degradation - return false on error
      return false;
    }
  }

  /**
   * Get multiple keys at once
   * 
   * @param keys - Array of cache keys
   * @returns Array of parsed values (null for missing keys)
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.redisClient || !isRedisAvailable() || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await this.redisClient.mget(...keys);
      return values.map((value) => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error(`Cache mget error for keys:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once
   * 
   * @param entries - Array of [key, value, ttl] tuples
   */
  async mset(entries: Array<[string, any, number?]>): Promise<void> {
    if (!this.redisClient || !isRedisAvailable() || entries.length === 0) {
      return;
    }

    try {
      // Use pipeline for batch operations
      const pipeline = this.redisClient.pipeline();
      
      for (const [key, value, ttl] of entries) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await pipeline.exec();
      logger.debug(`Cache mset: ${entries.length} keys set`);
    } catch (error) {
      logger.error(`Cache mset error:`, error);
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  async clear(): Promise<void> {
    if (!this.redisClient || !isRedisAvailable()) {
      logger.debug('Cache clear skipped (Redis unavailable)');
      return;
    }

    try {
      await this.redisClient.flushdb();
      logger.warn('Cache cleared: all keys deleted');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }
}
