import Redis from 'ioredis';
import logger from './logger.config';

/**
 * Redis client instance for caching and rate limiting
 * Configured with connection pooling and error handling
 */
let redisClient: Redis | null = null;

/**
 * Initialize Redis connection
 * Returns null if REDIS_URL is not configured (graceful degradation)
 */
export function initializeRedis(): Redis | null {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('Redis URL not configured. Caching and rate limiting features will be disabled.');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Reconnect when Redis is in readonly mode
          return true;
        }
        return false;
      },
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis ready to accept commands');
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis connection error:', err);
    });

    redisClient.on('close', () => {
      logger.warn('⚠️  Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Get Redis client instance
 * Returns null if Redis is not configured or connection failed
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
}

/**
 * Check if Redis is available and connected
 */
export function isRedisAvailable(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

// Export the client for direct use
export { redisClient };
