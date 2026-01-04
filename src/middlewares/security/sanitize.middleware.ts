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
 * Check if a string is a URL
 */
function isURL(value: string): boolean {
  if (typeof value !== 'string') return false;
  
  // Check if it's a valid URL
  try {
    // Check for common URL patterns
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//')) {
      return true;
    }
    // Check if it looks like a Cloudinary URL or other CDN
    if (value.includes('cloudinary.com') || value.includes('res.cloudinary')) {
      return true;
    }
  } catch (e) {
    return false;
  }
  
  return false;
}

/**
 * Check if a field name suggests it contains a URL
 */
function isURLField(fieldName: string): boolean {
  const urlFieldPatterns = [
    'url', 'image', 'images', 'photo', 'avatar', 'thumbnail',
    'productImages', 'variantImages', 'categoryImage', 'bannerImage',
    'src', 'href', 'link', 'uri'
  ];
  
  const lowerFieldName = fieldName.toLowerCase();
  return urlFieldPatterns.some(pattern => lowerFieldName.includes(pattern.toLowerCase()));
}

/**
 * Sanitize a single string value
 * Uses validator.escape() to prevent XSS attacks
 * Skips URLs to prevent breaking them
 * 
 * @param value - String to sanitize
 * @param fieldName - Optional field name to check if it's a URL field
 * @returns Sanitized string
 */
function sanitizeString(value: string, fieldName?: string): string {
  if (typeof value !== 'string') {
    return value;
  }

  // Don't sanitize URLs
  if (isURL(value) || (fieldName && isURLField(fieldName))) {
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
 * @param fieldName - Optional field name for context
 * @returns Sanitized data with same structure
 */
function sanitizeValue(data: any, fieldName?: string): any {
  // Handle null and undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle strings
  if (typeof data === 'string') {
    return sanitizeString(data, fieldName);
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeValue(item, fieldName));
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized: any = {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Don't sanitize the key if it's a URL field
        const sanitizedKey = isURLField(key) ? key : sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeValue(data[key], key);
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

    // Sanitize query parameters
    // In Express 5, req.query is read-only, so we need to sanitize in place
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitizeValue(req.query);
      // Delete existing keys and add sanitized ones
      for (const key in req.query) {
        if (Object.prototype.hasOwnProperty.call(req.query, key)) {
          delete (req.query as any)[key];
        }
      }
      for (const key in sanitizedQuery) {
        if (Object.prototype.hasOwnProperty.call(sanitizedQuery, key)) {
          (req.query as any)[key] = sanitizedQuery[key];
        }
      }
    }

    // Sanitize URL parameters
    // In Express 5, req.params is read-only, so we need to sanitize in place
    if (req.params && typeof req.params === 'object') {
      const sanitizedParams = sanitizeValue(req.params);
      // Delete existing keys and add sanitized ones
      for (const key in req.params) {
        if (Object.prototype.hasOwnProperty.call(req.params, key)) {
          delete (req.params as any)[key];
        }
      }
      for (const key in sanitizedParams) {
        if (Object.prototype.hasOwnProperty.call(sanitizedParams, key)) {
          (req.params as any)[key] = sanitizedParams[key];
        }
      }
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
        // Delete existing keys and add trimmed ones
        for (const key in req.query) {
          if (Object.prototype.hasOwnProperty.call(req.query, key)) {
            delete (req.query as any)[key];
          }
        }
        for (const key in trimmedQuery) {
          if (Object.prototype.hasOwnProperty.call(trimmedQuery, key)) {
            (req.query as any)[key] = trimmedQuery[key];
          }
        }
      }

      if (req.params && typeof req.params === 'object') {
        const trimmedParams = trimWhitespace(req.params);
        // Delete existing keys and add trimmed ones
        for (const key in req.params) {
          if (Object.prototype.hasOwnProperty.call(req.params, key)) {
            delete (req.params as any)[key];
          }
        }
        for (const key in trimmedParams) {
          if (Object.prototype.hasOwnProperty.call(trimmedParams, key)) {
            (req.params as any)[key] = trimmedParams[key];
          }
        }
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
