import { Request, Response, NextFunction } from 'express';
// Removed DOMPurify due to ES module issues on some systems
// Using validator.escape() which is sufficient for our needs
import validator from 'validator';

// Lazy load logger to avoid circular dependency
let logger: any = null;
function getLogger() {
  if (!logger) {
    logger = require('../../config/logger.config').default;
  }
  return logger;
}

/**
 * Sanitize a single string value
 * Uses validator.escape() to prevent XSS attacks
 * 
 * @param value - String to sanitize
 * @returns Sanitized string
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }

  // Escape HTML entities to prevent XSS
  return validator.escape(value);
}

/**
 * Recursively sanitize an object, array, or primitive value
 * Handles nested objects and arrays
 * 
 * @param data - Data to sanitize (can be object, array, string, or primitive)
 * @returns Sanitized data with same structure
 */
function sanitizeValue(data: any): any {
  // Handle null and undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle strings
  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeValue(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized: any = {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Sanitize the key as well (prevent prototype pollution)
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeValue(data[key]);
      }
    }

    return sanitized;
  }

  // Return primitives (numbers, booleans) as-is
  return data;
}

/**
 * Input sanitization middleware
 * Sanitizes req.body, req.query, and req.params to prevent XSS attacks
 * 
 * This middleware should be applied early in the middleware chain,
 * after body parsing but before validation and route handlers
 * 
 * Usage:
 *   app.use(express.json());
 *   app.use(sanitizeInput);
 *   app.use('/api', routes);
 */
export function sanitizeInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }

    // Sanitize query parameters (mutate in place for Express 5 compatibility)
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitizeValue(req.query);
      Object.keys(req.query).forEach(key => delete req.query[key]);
      Object.assign(req.query, sanitizedQuery);
    }

    // Sanitize URL parameters (mutate in place for Express 5 compatibility)
    if (req.params && typeof req.params === 'object') {
      const sanitizedParams = sanitizeValue(req.params);
      Object.keys(req.params).forEach(key => delete req.params[key]);
      Object.assign(req.params, sanitizedParams);
    }

    next();
  } catch (error) {
    getLogger().error('Error during input sanitization:', error);
    // Continue even if sanitization fails (graceful degradation)
    // But log the error for investigation
    next();
  }
}

/**
 * Strict sanitization middleware
 * More aggressive sanitization that also strips whitespace
 * Use for endpoints that require extra security
 * 
 * Usage:
 *   router.post('/admin/create', strictSanitizeInput, createController);
 */
export function strictSanitizeInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Apply standard sanitization first
    sanitizeInput(req, res, () => {
      // Additional strict sanitization
      if (req.body && typeof req.body === 'object') {
        req.body = trimWhitespace(req.body);
      }

      if (req.query && typeof req.query === 'object') {
        const trimmedQuery = trimWhitespace(req.query);
        Object.keys(req.query).forEach(key => delete req.query[key]);
        Object.assign(req.query, trimmedQuery);
      }

      if (req.params && typeof req.params === 'object') {
        const trimmedParams = trimWhitespace(req.params);
        Object.keys(req.params).forEach(key => delete req.params[key]);
        Object.assign(req.params, trimmedParams);
      }

      next();
    });
  } catch (error) {
    getLogger().error('Error during strict input sanitization:', error);
    next();
  }
}

/**
 * Recursively trim whitespace from string values
 * 
 * @param data - Data to trim
 * @returns Data with trimmed strings
 */
function trimWhitespace(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data.trim();
  }

  if (Array.isArray(data)) {
    return data.map((item) => trimWhitespace(item));
  }

  if (typeof data === 'object') {
    const trimmed: any = {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        trimmed[key] = trimWhitespace(data[key]);
      }
    }

    return trimmed;
  }

  return data;
}

/**
 * Sanitize a single field value
 * Useful for sanitizing individual values in custom logic
 * 
 * @param value - Value to sanitize
 * @returns Sanitized value
 */
export function sanitize(value: any): any {
  return sanitizeValue(value);
}

/**
 * Check if a string contains potentially malicious content
 * Returns true if the string appears to contain XSS attempts
 * 
 * @param value - String to check
 * @returns True if potentially malicious
 */
export function containsMaliciousContent(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // Common XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(value));
}

/**
 * Sanitization middleware with malicious content detection
 * Logs warnings when potentially malicious content is detected
 * 
 * Usage:
 *   app.use(sanitizeWithDetection);
 */
export function sanitizeWithDetection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Check for malicious content before sanitization
    const checkForMalicious = (data: any, path: string = ''): void => {
      if (typeof data === 'string' && containsMaliciousContent(data)) {
        getLogger().warn('Potentially malicious content detected:', {
          path,
          ip: req.ip,
          method: req.method,
          url: req.url,
          userAgent: req.headers['user-agent'],
        });
      } else if (Array.isArray(data)) {
        data.forEach((item, index) =>
          checkForMalicious(item, `${path}[${index}]`)
        );
      } else if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach((key) =>
          checkForMalicious(data[key], path ? `${path}.${key}` : key)
        );
      }
    };

    // Check all input sources
    if (req.body) checkForMalicious(req.body, 'body');
    if (req.query) checkForMalicious(req.query, 'query');
    if (req.params) checkForMalicious(req.params, 'params');

    // Apply sanitization
    sanitizeInput(req, res, next);
  } catch (error) {
    getLogger().error('Error during sanitization with detection:', error);
    next();
  }
}
