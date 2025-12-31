import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import logger from '../../config/logger.config';

/**
 * Helmet middleware configuration
 * Provides comprehensive security headers
 */
export const helmetMiddleware = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for some UI libraries
      scriptSrc: ["'self'"],
      imgSrc: [
        "'self'",
        'data:', // Allow data URIs for inline images
        'https://res.cloudinary.com', // Cloudinary CDN
      ],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // Disable X-Powered-By header
  hidePoweredBy: true,

  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-XSS-Protection (legacy, but still useful for older browsers)
  xssFilter: true,

  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // Permissions-Policy (formerly Feature-Policy)
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
});

/**
 * Additional custom security headers middleware
 * Adds extra security headers not covered by Helmet
 */
export function additionalSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // X-Content-Type-Options: Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options: Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection: Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy: Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy: Control browser features
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  // X-DNS-Prefetch-Control: Control DNS prefetching
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // X-Download-Options: Prevent IE from executing downloads
  res.setHeader('X-Download-Options', 'noopen');

  // X-Permitted-Cross-Domain-Policies: Restrict cross-domain policies
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  next();
}

/**
 * Security headers for API responses
 * Lighter version for API endpoints that don't need full CSP
 */
export function apiSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Basic security headers for API
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Prevent caching of sensitive API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
}

/**
 * Initialize all security headers middleware
 * Returns array of middleware functions to apply
 */
export function initializeSecurityHeaders(): Array<
  (req: Request, res: Response, next: NextFunction) => void
> {
  logger.info('✅ Security headers initialized');

  return [
    helmetMiddleware,
    additionalSecurityHeaders,
  ];
}

/**
 * Development-friendly security headers
 * Relaxed CSP for development environment
 */
export function developmentSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (process.env.NODE_ENV === 'development') {
    // More relaxed headers for development
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Allow same-origin framing
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  } else {
    // Use strict headers in production
    additionalSecurityHeaders(req, res, next);
    return;
  }

  next();
}

/**
 * CORS security headers
 * Additional headers for CORS requests
 */
export function corsSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Vary header to indicate response varies based on Origin
  res.setHeader('Vary', 'Origin');

  // Access-Control-Max-Age for preflight caching
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  next();
}
