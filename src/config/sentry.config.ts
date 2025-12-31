import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { setupExpressErrorHandler } from '@sentry/node';
import { Express, Request, Response, NextFunction } from 'express';
import logger from './logger.config';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * 
 * @returns boolean indicating if Sentry was initialized
 */
export function initializeSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  
  // Skip Sentry initialization if DSN is not configured
  if (!dsn) {
    logger.warn('⚠️  SENTRY_DSN is not configured. Error tracking will be disabled.');
    return false;
  }
  
  try {
    Sentry.init({
      dsn,
      environment,
      
      // Integrations
      integrations: [
        // Enable HTTP tracing
        Sentry.httpIntegration(),
        
        // Enable Express integration
        Sentry.expressIntegration(),
        
        // Enable profiling
        nodeProfilingIntegration(),
      ],
      
      // Performance Monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      
      // Profiling
      profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
      
      // Filter sensitive data before sending to Sentry
      beforeSend(event, hint) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }
        
        // Remove sensitive cookies
        if (event.request?.cookies) {
          event.request.cookies = {};
        }
        
        // Filter out specific error types if needed
        const error = hint.originalException;
        if (error instanceof Error) {
          // Don't send validation errors to Sentry (too noisy)
          if (error.name === 'ValidationError' || error.name === 'ZodError') {
            return null;
          }
        }
        
        return event;
      },
      
      // Ignore specific errors
      ignoreErrors: [
        // Browser errors
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        
        // Network errors
        'NetworkError',
        'Network request failed',
        
        // Common user errors
        'Unauthorized',
        'Forbidden',
        'Not Found',
      ],
      
      // Release tracking (optional)
      release: process.env.SENTRY_RELEASE || undefined,
      
      // Debug mode in development
      debug: environment === 'development',
    });
    
    logger.info('✅ Sentry initialized successfully', {
      environment,
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    });
    
    return true;
  } catch (error) {
    logger.error('❌ Failed to initialize Sentry', error);
    return false;
  }
}

/**
 * Add Sentry middleware to Express app
 * Must be called after app is created but before routes are defined
 * 
 * @param app - Express application instance
 */
export function addSentryMiddleware(app: Express): void {
  const dsn = process.env.SENTRY_DSN;
  
  // Skip if Sentry is not configured
  if (!dsn) {
    return;
  }
  
  // Sentry v10+ automatically instruments Express when expressIntegration() is used in init()
  // No need for separate middleware - it's handled by the integration
  
  logger.info('✅ Sentry Express integration enabled (via expressIntegration in init)');
}

/**
 * Add Sentry error handler to Express app
 * Must be called after all routes are defined but before other error handlers
 * 
 * @param app - Express application instance
 */
export function addSentryErrorHandler(app: Express): void {
  const dsn = process.env.SENTRY_DSN;
  
  // Skip if Sentry is not configured
  if (!dsn) {
    return;
  }
  
  // Setup Express error handler for Sentry v10+
  setupExpressErrorHandler(app);
  
  logger.info('✅ Sentry error handler added to Express app');
}

/**
 * Manually capture an exception to Sentry
 * 
 * @param error - Error to capture
 * @param context - Additional context
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  
  if (context) {
    Sentry.setContext('additional', context);
  }
  
  Sentry.captureException(error);
}

/**
 * Manually capture a message to Sentry
 * 
 * @param message - Message to capture
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  
  if (context) {
    Sentry.setContext('additional', context);
  }
  
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 * 
 * @param user - User information
 */
export function setUserContext(user: {
  id: number | string;
  email?: string;
  username?: string;
  role?: string;
}): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  
  Sentry.setUser({
    id: user.id.toString(),
    email: user.email,
    username: user.username,
    role: user.role,
  });
}

/**
 * Clear user context from Sentry
 */
export function clearUserContext(): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * 
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category
 * @param level - Severity level
 * @param data - Additional data
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Flush Sentry events (useful before shutdown)
 * 
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves when flush is complete
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  if (!process.env.SENTRY_DSN) {
    return true;
  }
  
  try {
    await Sentry.close(timeout);
    logger.info('✅ Sentry events flushed successfully');
    return true;
  } catch (error) {
    logger.error('❌ Failed to flush Sentry events', error);
    return false;
  }
}

export default Sentry;
