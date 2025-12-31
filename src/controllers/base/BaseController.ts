import { Response } from 'express';
import { ResponseBuilder } from '../../utils/helpers/ResponseBuilder';
import { ErrorCode } from '../../utils/errors/ErrorCodes';

/**
 * BaseController provides common response methods for all controllers
 * Ensures consistent API response format across the application
 * 
 * Requirements: 13.3, 13.5
 */
export abstract class BaseController {
  /**
   * Send a successful response
   * 
   * @param res - Express response object
   * @param data - Response data
   * @param message - Optional success message
   * @param statusCode - HTTP status code (default: 200)
   */
  protected sendSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
  ): void {
    const requestId = (res.req as any).requestId;
    const response = ResponseBuilder.success(data, message, {
      requestId,
      timestamp: new Date().toISOString(),
    });
    
    res.status(statusCode).json(response);
  }
  
  /**
   * Send an error response
   * 
   * @param res - Express response object
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param code - Error code
   * @param details - Additional error details
   */
  protected sendError(
    res: Response,
    message: string,
    statusCode: number = 500,
    code?: ErrorCode,
    details?: any
  ): void {
    const requestId = (res.req as any).requestId;
    const response = ResponseBuilder.error(message, code, details, {
      requestId,
      timestamp: new Date().toISOString(),
    });
    
    res.status(statusCode).json(response);
  }
  
  /**
   * Send a created response (201)
   * 
   * @param res - Express response object
   * @param data - Created resource data
   * @param message - Optional success message
   */
  protected sendCreated<T>(
    res: Response,
    data: T,
    message?: string
  ): void {
    const requestId = (res.req as any).requestId;
    const response = ResponseBuilder.created(data, message);
    response.meta = {
      ...response.meta,
      requestId,
      timestamp: new Date().toISOString(),
    };
    
    res.status(201).json(response);
  }
  
  /**
   * Send a no content response (204)
   * 
   * @param res - Express response object
   * @param message - Optional message
   */
  protected sendNoContent(res: Response, message?: string): void {
    const requestId = (res.req as any).requestId;
    const response = ResponseBuilder.noContent(message);
    response.meta = {
      requestId,
      timestamp: new Date().toISOString(),
    };
    
    res.status(204).json(response);
  }
  
  /**
   * Send a paginated response
   * 
   * @param res - Express response object
   * @param data - Array of items
   * @param page - Current page number
   * @param limit - Items per page
   * @param total - Total number of items
   * @param statusCode - HTTP status code (default: 200)
   */
  protected sendPaginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    statusCode: number = 200
  ): void {
    const requestId = (res.req as any).requestId;
    const response = ResponseBuilder.paginated(data, page, limit, total, {
      requestId,
      timestamp: new Date().toISOString(),
    });
    
    res.status(statusCode).json(response);
  }
}

