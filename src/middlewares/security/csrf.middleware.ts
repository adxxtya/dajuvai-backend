import { Request, Response, NextFunction } from 'express';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';
import logger from '../../config/logger.config';

/**
 * CSRF protection configuration
 * Uses cookies to store CSRF tokens
 */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  },
});

/**
 * Cookie parser middleware
 * Required for CSRF protection to work with cookies
 */
export const csrfCookieParser = cookieParser();

/**
 * CSRF protection middleware
 * Validates CSRF tokens for state-changing requests (POST, PUT, PATCH, DELETE)
 * 
 * Usage:
 *   // Apply to specific routes
 *   router.post('/create', csrfProtectionMiddleware, createController);
 * 
 *   // Or apply to all state-changing routes
 *   app.use(csrfProtectionMiddleware);
 */
export const csrfProtectionMiddleware = csrfProtection;

/**
 * CSRF token generation endpoint handler
 * Generates and returns a CSRF token for the client
 * 
 * Usage:
 *   router.get('/csrf-token', getCsrfToken);
 * 
 * Response:
 *   { csrfToken: "token-value" }
 */
export function getCsrfToken(req: Request, res: Response): void {
  try {
    // The csrfToken() method is added by the csrf middleware
    const token = (req as any).csrfToken();

    res.json({
      success: true,
      data: {
        csrfToken: token,
      },
      message: 'CSRF token generated successfully',
    });
  } catch (error) {
    logger.error('Failed to generate CSRF token:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate CSRF token',
      },
    });
  }
}

/**
 * Conditional CSRF protection middleware
 * Only applies CSRF protection to state-changing methods
 * Skips GET, HEAD, and OPTIONS requests
 * 
 * Usage:
 *   app.use(conditionalCsrfProtection);
 */
export function conditionalCsrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip CSRF protection for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Apply CSRF protection for state-changing methods
  csrfProtection(req, res, next);
}

/**
 * CSRF error handler middleware
 * Provides user-friendly error messages for CSRF failures
 * 
 * Usage:
 *   app.use(csrfErrorHandler);
 */
export function csrfErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed', {
      method: req.method,
      url: req.url,
      ip: req.ip,
    });

    res.status(403).json({
      success: false,
      error: {
        message: 'Invalid or missing CSRF token',
        code: 'CSRF_VALIDATION_FAILED',
      },
    });
    return;
  }

  // Pass other errors to the next error handler
  next(err);
}

/**
 * Initialize CSRF protection
 * Sets up cookie parser and CSRF middleware
 * 
 * @returns Object with middleware array and error handler
 */
export function initializeCsrfProtection(): {
  middleware: Array<(req: Request, res: Response, next: NextFunction) => void>;
  errorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
} {
  logger.info('✅ CSRF protection initialized');

  return {
    middleware: [csrfCookieParser, conditionalCsrfProtection],
    errorHandler: csrfErrorHandler,
  };
}

/**
 * CSRF protection for specific routes
 * Use this when you want to apply CSRF protection to specific routes only
 * 
 * Usage:
 *   router.post('/create', protectRoute, createController);
 */
export function protectRoute(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  csrfProtection(req, res, next);
}
