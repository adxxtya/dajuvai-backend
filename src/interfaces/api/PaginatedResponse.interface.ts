import { ApiResponse } from './ApiResponse.interface';

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  /**
   * Current page number
   */
  page: number;
  
  /**
   * Number of items per page
   */
  limit: number;
  
  /**
   * Total number of items
   */
  total: number;
  
  /**
   * Total number of pages
   */
  totalPages: number;
  
  /**
   * Whether there is a next page
   */
  hasNextPage: boolean;
  
  /**
   * Whether there is a previous page
   */
  hasPreviousPage: boolean;
}

/**
 * Paginated response interface
 * Extends ApiResponse with pagination metadata
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  /**
   * Pagination metadata
   */
  meta: PaginationMeta & Record<string, any>;
}

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  /**
   * Page number (1-indexed)
   */
  page: number;
  
  /**
   * Number of items per page
   */
  limit: number;
  
  /**
   * Field to sort by
   */
  sortBy?: string;
  
  /**
   * Sort order (asc or desc)
   */
  sortOrder?: 'asc' | 'desc';
}
