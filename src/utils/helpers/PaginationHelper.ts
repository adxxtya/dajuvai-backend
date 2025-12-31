import { PAGINATION } from '../../config/constants';
import { PaginatedResponse } from '../../interfaces/api/PaginatedResponse.interface';

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * PaginationHelper utility class
 * Provides methods for parsing pagination parameters and building paginated responses
 * 
 * Requirements: 13.3, 13.4, 13.5, 16.2
 */
export class PaginationHelper {
  /**
   * Default pagination values
   */
  static readonly DEFAULT_PAGE = PAGINATION.DEFAULT_PAGE;
  static readonly DEFAULT_LIMIT = PAGINATION.DEFAULT_LIMIT;
  static readonly MAX_LIMIT = PAGINATION.MAX_LIMIT;
  
  /**
   * Parse and validate pagination parameters from query string
   * 
   * @param query - Query object from request
   * @returns Validated pagination parameters
   * 
   * @example
   * const params = PaginationHelper.parsePaginationParams(req.query);
   * // { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }
   */
  static parsePaginationParams(query: any): PaginationParams {
    // Parse page number
    let page = parseInt(query.page, 10);
    if (isNaN(page) || page < 1) {
      page = this.DEFAULT_PAGE;
    }
    
    // Parse limit
    let limit = parseInt(query.limit, 10);
    if (isNaN(limit) || limit < 1) {
      limit = this.DEFAULT_LIMIT;
    }
    
    // Enforce maximum limit
    if (limit > this.MAX_LIMIT) {
      limit = this.MAX_LIMIT;
    }
    
    // Parse sort parameters
    const sortBy = query.sortBy || undefined;
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    
    return {
      page,
      limit,
      sortBy,
      sortOrder,
    };
  }
  
  /**
   * Build paginated response with metadata
   * 
   * @param data - Array of items for current page
   * @param total - Total number of items across all pages
   * @param params - Pagination parameters used for the query
   * @returns Paginated response object
   * 
   * @example
   * const response = PaginationHelper.buildResponse(products, 150, { page: 2, limit: 20 });
   * // {
   * //   data: [...],
   * //   meta: {
   * //     page: 2,
   * //     limit: 20,
   * //     total: 150,
   * //     totalPages: 8,
   * //     hasNextPage: true,
   * //     hasPreviousPage: true
   * //   }
   * // }
   */
  static buildResponse<T>(
    data: T[],
    total: number,
    params: PaginationParams
  ): { data: T[]; meta: PaginationMeta } {
    const { page, limit } = params;
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limit);
    
    // Determine if there are more pages
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }
  
  /**
   * Calculate skip value for database queries
   * 
   * @param page - Current page number
   * @param limit - Items per page
   * @returns Number of items to skip
   * 
   * @example
   * const skip = PaginationHelper.calculateSkip(3, 20);
   * // 40 (skip first 2 pages = 40 items)
   */
  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }
  
  /**
   * Validate pagination parameters
   * Throws error if parameters are invalid
   * 
   * @param page - Page number
   * @param limit - Items per page
   * @throws Error if parameters are invalid
   */
  static validateParams(page: number, limit: number): void {
    if (page < 1) {
      throw new Error('Page number must be at least 1');
    }
    
    if (limit < 1) {
      throw new Error('Limit must be at least 1');
    }
    
    if (limit > this.MAX_LIMIT) {
      throw new Error(`Limit cannot exceed ${this.MAX_LIMIT}`);
    }
  }
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
