import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { getRedisClient, isRedisAvailable } from '../../config/redis.config';
import { RATE_LIMITS } from '../../config/constants';
import { APIError } from '../../utils/ApiError.utils';
import logger from '../../config/logger.config';

/**
 * Rate limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes, blocks for 1 hour on exceed
 */
let authRateLimiter: RateLimiterRedis | null = null;

/**
 * Rate limiter for general API endpoints
 * Limits: 100 requests per 1 minute
 */
let apiRateLimiter: RateLimiterRedis | null = null;

/**
 * Initialize rate limiters with Redis
 * Called during application startup
 */
export function initializeRateLimiters(): void {
  const redisClient = getRedisClient();

  if (!redisClient || !isRedisAvailable()) {
    logger.warn('⚠️  Rate limiters not initialized: Redis is not available');
    return;
  }

  try {
    // Authentication rate limiter
    authRateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'auth_limit',
      points: RATE_LIMITS.AUTH.POINTS,
      duration: RATE_LIMITS.AUTH.DURATION,
      blockDuration: RATE_LIMITS.AUTH.BLOCK_DURATION,
    });

    // API rate limiter
    apiRateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'api_limit',
      points: RATE_LIMITS.API.POINTS,
      duration: RATE_LIMITS.API.DURATION,
    });

    logger.info('✅ Rate limiters initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize rate limiters:', error);
  }
}

/**
 * Get client identifier from request
 * Uses IP address as the primary identifier
 */
function getClientIdentifier(req: Request): string {
  // Try to get real IP from proxy headers
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // Fallback to connection remote address
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Handle rate limit exceeded
 * Throws APIError with 429 status and retry information
 */
function handleRateLimitExceeded(
  rateLimiterRes: RateLimiterRes,
  identifier: string,
  type: 'auth' | 'api'
): never {
  const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

  logger.warn(`Rate limit exceeded for ${type}`, {
    identifier,
    retryAfter,
    remainingPoints: rateLimiterRes.remainingPoints,
  });

  const error = new APIError(
    429,
    `Too many ${type === 'auth' ? 'authentication' : 'API'} requests. Please try again later.`
  );

  // Attach retry information to error for middleware to use
  (error as any).retryAfter = retryAfter;

  throw error;
}

/**
 * Authentication rate limiter middleware
 * Applies strict rate limiting to authentication endpoints
 * 
 * Usage:
 *   router.post('/login', authRateLimiterMiddleware, loginController);
 */
export async function authRateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip rate limiting if Redis is not available (graceful degradation)
  if (!authRateLimiter || !isRedisAvailable()) {
    logger.debug('Auth rate limiter skipped: Redis not available');
    return next();
  }

  const identifier = getClientIdentifier(req);

  try {
    const rateLimiterRes = await authRateLimiter.consume(identifier);

    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMITS.AUTH.POINTS);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
    );

    next();
  } catch (error) {
    if (error instanceof Error && 'remainingPoints' in error) {
      // Rate limit exceeded
      const rateLimiterRes = error as unknown as RateLimiterRes;
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

      // Set retry-after header
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', RATE_LIMITS.AUTH.POINTS);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
      );

      handleRateLimitExceeded(rateLimiterRes, identifier, 'auth');
    }

    // Other errors (Redis connection issues, etc.)
    logger.error('Auth rate limiter error:', error);
    // Continue without rate limiting on error (graceful degradation)
    next();
  }
}

/**
 * API rate limiter middleware
 * Applies general rate limiting to all API endpoints
 * 
 * Usage:
 *   app.use('/api', apiRateLimiterMiddleware);
 */
export async function apiRateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip rate limiting if Redis is not available (graceful degradation)
  if (!apiRateLimiter || !isRedisAvailable()) {
    logger.debug('API rate limiter skipped: Redis not available');
    return next();
  }

  const identifier = getClientIdentifier(req);

  try {
    const rateLimiterRes = await apiRateLimiter.consume(identifier);

    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMITS.API.POINTS);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
    );

    next();
  } catch (error) {
    if (error instanceof Error && 'remainingPoints' in error) {
      // Rate limit exceeded
      const rateLimiterRes = error as unknown as RateLimiterRes;
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

      // Set retry-after header
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', RATE_LIMITS.API.POINTS);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
      );

      handleRateLimitExceeded(rateLimiterRes, identifier, 'api');
    }

    // Other errors (Redis connection issues, etc.)
    logger.error('API rate limiter error:', error);
    // Continue without rate limiting on error (graceful degradation)
    next();
  }
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or manual intervention
 */
export async function resetRateLimit(
  identifier: string,
  type: 'auth' | 'api' = 'api'
): Promise<void> {
  const limiter = type === 'auth' ? authRateLimiter : apiRateLimiter;

  if (!limiter) {
    logger.warn('Cannot reset rate limit: Rate limiter not initialized');
    return;
  }

  try {
    await limiter.delete(identifier);
    logger.info(`Rate limit reset for ${type}:`, identifier);
  } catch (error) {
    logger.error('Failed to reset rate limit:', error);
  }
}
