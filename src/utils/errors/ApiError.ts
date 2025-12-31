import { ErrorCode, getStatusCodeForErrorCode } from './ErrorCodes';

/**
 * Custom API Error class for standardized error handling
 * Extends the built-in Error class with additional properties
 */
export class APIError extends Error {
  public readonly status: number;
  public readonly code?: ErrorCode;
  public readonly details?: any;
  public readonly isOperational: boolean;
  
  /**
   * Create a new API Error
   * 
   * @param status - HTTP status code
   * @param message - Error message
   * @param code - Error code for client identification
   * @param details - Additional error details (validation errors, etc.)
   * @param isOperational - Whether this is an operational error (true) or programming error (false)
   */
  constructor(
    status: number,
    message: string,
    code?: ErrorCode,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message: string, code?: ErrorCode, details?: any): APIError {
    return new APIError(400, message, code || ErrorCode.INVALID_INPUT, details);
  }
  
  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message: string = 'Unauthorized', code?: ErrorCode): APIError {
    return new APIError(401, message, code || ErrorCode.AUTHENTICATION_FAILED);
  }
  
  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message: string = 'Access forbidden', code?: ErrorCode): APIError {
    return new APIError(403, message, code || ErrorCode.UNAUTHORIZED_ACCESS);
  }
  
  /**
   * Create a 404 Not Found error
   */
  static notFound(message: string = 'Resource not found', code?: ErrorCode): APIError {
    return new APIError(404, message, code || ErrorCode.RESOURCE_NOT_FOUND);
  }
  
  /**
   * Create a 409 Conflict error
   */
  static conflict(message: string, code?: ErrorCode, details?: any): APIError {
    return new APIError(409, message, code || ErrorCode.DUPLICATE_RESOURCE, details);
  }
  
  /**
   * Create a 422 Unprocessable Entity error (validation)
   */
  static validation(message: string, details?: any): APIError {
    return new APIError(422, message, ErrorCode.VALIDATION_ERROR, details);
  }
  
  /**
   * Create a 429 Too Many Requests error
   */
  static tooManyRequests(message: string = 'Too many requests', retryAfter?: number): APIError {
    return new APIError(
      429,
      message,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      retryAfter ? { retryAfter } : undefined
    );
  }
  
  /**
   * Create a 500 Internal Server Error
   */
  static internal(message: string = 'Internal server error', code?: ErrorCode): APIError {
    return new APIError(
      500,
      message,
      code || ErrorCode.INTERNAL_SERVER_ERROR,
      undefined,
      false // Programming error
    );
  }
  
  /**
   * Create an error from ErrorCode
   */
  static fromErrorCode(code: ErrorCode, message?: string, details?: any): APIError {
    const status = getStatusCodeForErrorCode(code);
    return new APIError(status, message || code, code, details);
  }
}
