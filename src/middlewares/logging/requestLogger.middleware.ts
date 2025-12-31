import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../config/logger.config';

/**
 * Extended Request interface with requestId
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Get user ID from authenticated request
 * Supports both user and vendor authentication
 */
function getUserId(req: Request): number | undefined {
  // Check for user authentication
  if (req.user && typeof req.user === 'object' && 'id' in req.user) {
    return (req.user as any).id;
  }

  // Check for vendor authentication
  if ((req as any).vendor && typeof (req as any).vendor === 'object') {
    return (req as any).vendor.id;
  }

  return undefined;
}

/**
 * Get user role from authenticated request
 */
function getUserRole(req: Request): string | undefined {
  if (req.user && typeof req.user === 'object' && 'role' in req.user) {
    return (req.user as any).role;
  }

  if ((req as any).vendor) {
    return 'vendor';
  }

  return undefined;
}

/**
 * Get client IP address from request
 * Handles proxy headers
 */
function getClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Request logging middleware
 * Generates unique request ID, logs incoming requests and responses
 * 
 * Features:
 * - Unique request ID for tracing
 * - Request and response logging
 * - Duration tracking
 * - User context (if authenticated)
 * - IP address and user agent tracking
 * 
 * Usage:
 *   app.use(requestLogger);
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();

  // Set request ID in response header for client tracking
  res.setHeader('X-Request-ID', requestId);

  // Get request metadata
  const method = req.method;
  const url = req.url;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method,
    url,
    ip,
    userAgent,
    userId: getUserId(req),
    role: getUserRole(req),
  });

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    // Calculate request duration
    const duration = Date.now() - (req.startTime || Date.now());
    const statusCode = res.statusCode;

    // Determine log level based on status code
    let logLevel: 'info' | 'warn' | 'error' = 'info';
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    }

    // Log response
    logger[logLevel]('Request completed', {
      requestId,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userId: getUserId(req),
      role: getUserRole(req),
      contentLength: res.getHeader('content-length'),
    });

    // Call the original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}

/**
 * Detailed request logger
 * Includes request body and query parameters (use with caution in production)
 * 
 * Usage:
 *   app.use(detailedRequestLogger);
 */
export function detailedRequestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();

  res.setHeader('X-Request-ID', requestId);

  const method = req.method;
  const url = req.url;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Log incoming request with body and query
  logger.info('Incoming request (detailed)', {
    requestId,
    method,
    url,
    ip,
    userAgent,
    userId: getUserId(req),
    role: getUserRole(req),
    query: req.query,
    body: sanitizeBody(req.body), // Sanitize sensitive data
    headers: sanitizeHeaders(req.headers),
  });

  const originalEnd = res.end;

  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - (req.startTime || Date.now());
    const statusCode = res.statusCode;

    let logLevel: 'info' | 'warn' | 'error' = 'info';
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    }

    logger[logLevel]('Request completed (detailed)', {
      requestId,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userId: getUserId(req),
      role: getUserRole(req),
      contentLength: res.getHeader('content-length'),
    });

    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}

/**
 * Sanitize request body to remove sensitive information
 * Removes passwords, tokens, and other sensitive fields
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'newPassword',
    'oldPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'cvv',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Sanitize request headers to remove sensitive information
 */
function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };

  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ];

  for (const header of sensitiveHeaders) {
    if (header in sanitized) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Performance logging middleware
 * Logs slow requests that exceed a threshold
 * 
 * @param threshold - Duration threshold in milliseconds (default: 1000ms)
 */
export function slowRequestLogger(threshold: number = 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.startTime = Date.now();

    const originalEnd = res.end;

    res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
      const duration = Date.now() - (req.startTime || Date.now());

      if (duration > threshold) {
        logger.warn('Slow request detected', {
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          statusCode: res.statusCode,
          userId: getUserId(req),
        });
      }

      return originalEnd.call(this, chunk, encoding, callback);
    };

    next();
  };
}

/**
 * Error request logger
 * Logs additional details for failed requests
 */
export function errorRequestLogger(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    userId: getUserId(req),
    ip: getClientIp(req),
  });

  next(err);
}

/**
 * Initialize request logging
 * Returns configured middleware
 */
export function initializeRequestLogging(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  logger.info('✅ Request logging initialized');
  return requestLogger;
}
