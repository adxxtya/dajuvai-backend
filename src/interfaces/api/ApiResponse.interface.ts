/**
 * Standard API response interface
 * All successful API responses should follow this structure
 */
export interface ApiResponse<T = any> {
  /**
   * Indicates if the request was successful
   */
  success: boolean;
  
  /**
   * Response data
   */
  data: T;
  
  /**
   * Optional message describing the response
   */
  message?: string;
  
  /**
   * Optional metadata (pagination, request ID, etc.)
   */
  meta?: Record<string, any>;
}

/**
 * Error response interface
 * All error responses should follow this structure
 */
export interface ErrorResponse {
  /**
   * Always false for error responses
   */
  success: false;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Error code for client identification
   */
  code?: string;
  
  /**
   * Additional error details (validation errors, etc.)
   */
  details?: any;
  
  /**
   * Stack trace (only in development)
   */
  stack?: string;
  
  /**
   * Metadata (request ID, timestamp, etc.)
   */
  meta?: Record<string, any>;
}
