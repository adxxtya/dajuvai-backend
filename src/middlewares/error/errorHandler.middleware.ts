import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { APIError } from '../../utils/errors/ApiError';
import { ErrorCode } from '../../utils/errors/ErrorCodes';
import { ResponseBuilder } from '../../utils/helpers/ResponseBuilder';
import logger, { logError } from '../../config/logger.config';
import { captureException } from '../../config/sentry.config';

/**
 * Centralized error handler middleware
 * Handles all errors thrown in the application and sends standardized responses
 * 
 * Must be registered as the last middleware in the Express app
 * 
 * @param err - Error object
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get request ID if available
  const requestId = (req as any).requestId || 'unknown';
  
  // Determine if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle APIError instances
  if (err instanceof APIError) {
    const response = ResponseBuilder.error(
      err.message,
      err.code,
      err.details,
      {
        requestId,
        ...(isDevelopment && err.stack ? { stack: err.stack } : {}),
      }
    );
    
    // Log operational errors at appropriate level
    if (err.status >= 500) {
      logError('API Error (5xx)', err, {
        requestId,
        url: req.url,
        method: req.method,
        status: err.status,
        code: err.code,
      });
      
      // Send to Sentry for server errors
      if (!isDevelopment) {
        captureException(err, {
          requestId,
          url: req.url,
          method: req.method,
          userId: (req as any).user?.id,
        });
      }
    } else {
      logger.warn('API Error (4xx)', {
        message: err.message,
        code: err.code,
        status: err.status,
        requestId,
        url: req.url,
        method: req.method,
      });
    }
    
    res.status(err.status).json(response);
    return;
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((error) => ({
      field: error.path.join('.'),
      message: error.message,
      code: error.code,
    }));
    
    const response = ResponseBuilder.error(
      'Validation failed',
      ErrorCode.VALIDATION_ERROR,
      { errors: formattedErrors },
      { requestId }
    );
    
    logger.warn('Validation Error', {
      errors: formattedErrors,
      requestId,
      url: req.url,
      method: req.method,
    });
    
    res.status(400).json(response);
    return;
  }
  
  // Handle TypeORM/Database errors
  if (err.name === 'QueryFailedError' || err.name === 'EntityNotFoundError') {
    logError('Database Error', err, {
      requestId,
      url: req.url,
      method: req.method,
    });
    
    // Don't expose database details in production
    const message = isDevelopment
      ? err.message
      : 'A database error occurred';
    
    const response = ResponseBuilder.error(
      message,
      ErrorCode.DATABASE_ERROR,
      isDevelopment ? { originalError: err.message } : undefined,
      { requestId }
    );
    
    // Send to Sentry
    if (!isDevelopment) {
      captureException(err, {
        requestId,
        url: req.url,
        method: req.method,
      });
    }
    
    res.status(500).json(response);
    return;
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const response = ResponseBuilder.error(
      'Invalid token',
      ErrorCode.INVALID_TOKEN,
      undefined,
      { requestId }
    );
    
    logger.warn('JWT Error', {
      message: err.message,
      requestId,
      url: req.url,
      method: req.method,
    });
    
    res.status(401).json(response);
    return;
  }
  
  if (err.name === 'TokenExpiredError') {
    const response = ResponseBuilder.error(
      'Token expired',
      ErrorCode.TOKEN_EXPIRED,
      undefined,
      { requestId }
    );
    
    logger.warn('JWT Token Expired', {
      requestId,
      url: req.url,
      method: req.method,
    });
    
    res.status(401).json(response);
    return;
  }
  
  // Handle Multer file upload errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    let code = ErrorCode.UPLOAD_FAILED;
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds the maximum allowed limit';
      code = ErrorCode.FILE_TOO_LARGE;
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
    }
    
    const response = ResponseBuilder.error(
      message,
      code,
      { originalError: err.message },
      { requestId }
    );
    
    logger.warn('File Upload Error', {
      message: err.message,
      code: err.code,
      requestId,
      url: req.url,
      method: req.method,
    });
    
    res.status(400).json(response);
    return;
  }
  
  // Handle unexpected errors
  logError('Unexpected Error', err, {
    requestId,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    userId: (req as any).user?.id,
  });
  
  // Send to Sentry for unexpected errors
  if (!isDevelopment) {
    captureException(err, {
      requestId,
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id,
    });
  }
  
  // Generic error response
  const response = ResponseBuilder.error(
    isDevelopment ? err.message : 'An unexpected error occurred',
    ErrorCode.INTERNAL_SERVER_ERROR,
    isDevelopment ? { originalError: err.message } : undefined,
    {
      requestId,
      ...(isDevelopment && err.stack ? { stack: err.stack } : {}),
    }
  );
  
  res.status(err.status || 500).json(response);
};

/**
 * Handle 404 Not Found errors
 * Should be registered before the error handler middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = APIError.notFound(
    `Route ${req.method} ${req.url} not found`,
    ErrorCode.RESOURCE_NOT_FOUND
  );
  
  next(error);
};
