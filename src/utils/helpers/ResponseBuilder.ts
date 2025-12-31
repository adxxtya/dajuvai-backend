import { ApiResponse, ErrorResponse } from '../../interfaces/api/ApiResponse.interface';
import { PaginatedResponse, PaginationMeta } from '../../interfaces/api/PaginatedResponse.interface';
import { ErrorCode } from '../errors/ErrorCodes';

/**
 * Response builder utility for standardized API responses
 * Provides static methods to create consistent response structures
 */
export class ResponseBuilder {
  /**
   * Build a successful response
   * 
   * @param data - Response data
   * @param message - Optional success message
   * @param meta - Optional metadata
   * @returns Standardized success response
   * 
   * @example
   * ```typescript
   * return res.json(ResponseBuilder.success(user, 'User retrieved successfully'));
   * ```
   */
  static success<T>(
    data: T,
    message?: string,
    meta?: Record<string, any>
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      meta,
    };
  }
  
  /**
   * Build a paginated response
   * 
   * @param data - Array of items
   * @param page - Current page number
   * @param limit - Items per page
   * @param total - Total number of items
   * @param additionalMeta - Additional metadata
   * @returns Standardized paginated response
   * 
   * @example
   * ```typescript
   * const [products, total] = await productRepo.findAndCount({ skip, take });
   * return res.json(ResponseBuilder.paginated(products, page, limit, total));
   * ```
   */
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    additionalMeta?: Record<string, any>
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    const paginationMeta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };
    
    return {
      success: true,
      data,
      meta: {
        ...paginationMeta,
        ...additionalMeta,
      },
    };
  }
  
  /**
   * Build an error response
   * 
   * @param message - Error message
   * @param code - Error code
   * @param details - Additional error details
   * @param meta - Optional metadata
   * @returns Standardized error response
   * 
   * @example
   * ```typescript
   * return res.status(400).json(
   *   ResponseBuilder.error('Validation failed', ErrorCode.VALIDATION_ERROR, errors)
   * );
   * ```
   */
  static error(
    message: string,
    code?: ErrorCode,
    details?: any,
    meta?: Record<string, any>
  ): ErrorResponse {
    return {
      success: false,
      message,
      code,
      details,
      meta,
    };
  }
  
  /**
   * Build a created response (201)
   * 
   * @param data - Created resource data
   * @param message - Optional success message
   * @returns Standardized success response
   * 
   * @example
   * ```typescript
   * return res.status(201).json(ResponseBuilder.created(user, 'User created successfully'));
   * ```
   */
  static created<T>(data: T, message?: string): ApiResponse<T> {
    return this.success(data, message || 'Resource created successfully');
  }
  
  /**
   * Build a no content response (204)
   * Used for successful operations that don't return data
   * 
   * @param message - Optional message
   * @returns Standardized success response with null data
   * 
   * @example
   * ```typescript
   * await userService.delete(id);
   * return res.status(204).json(ResponseBuilder.noContent('User deleted successfully'));
   * ```
   */
  static noContent(message?: string): ApiResponse<null> {
    return {
      success: true,
      data: null,
      message: message || 'Operation completed successfully',
    };
  }
  
  /**
   * Build a response with custom status message
   * 
   * @param data - Response data
   * @param message - Status message
   * @param meta - Optional metadata
   * @returns Standardized success response
   */
  static withMessage<T>(
    data: T,
    message: string,
    meta?: Record<string, any>
  ): ApiResponse<T> {
    return this.success(data, message, meta);
  }
}
