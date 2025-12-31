import { EntityManager, FindManyOptions, FindOneOptions, SelectQueryBuilder } from 'typeorm';

/**
 * Base repository interface for standardized data access
 * All repositories should implement this interface for consistency
 * 
 * @template T - Entity type
 */
export interface IRepository<T> {
  /**
   * Find an entity by its ID
   * 
   * @param id - Entity ID
   * @param manager - Optional EntityManager for transactions
   * @returns Entity or null if not found
   */
  findById(id: number | string, manager?: EntityManager): Promise<T | null>;
  
  /**
   * Find a single entity matching the given options
   * 
   * @param options - TypeORM find options
   * @param manager - Optional EntityManager for transactions
   * @returns Entity or null if not found
   */
  findOne(options: FindOneOptions<T>, manager?: EntityManager): Promise<T | null>;
  
  /**
   * Find multiple entities matching the given options
   * 
   * @param options - TypeORM find options
   * @param manager - Optional EntityManager for transactions
   * @returns Array of entities
   */
  findMany(options: FindManyOptions<T>, manager?: EntityManager): Promise<T[]>;
  
  /**
   * Find entities and count total matching the given options
   * 
   * @param options - TypeORM find options
   * @param manager - Optional EntityManager for transactions
   * @returns Tuple of [entities, total count]
   */
  findAndCount(options: FindManyOptions<T>, manager?: EntityManager): Promise<[T[], number]>;
  
  /**
   * Save an entity (create or update)
   * 
   * @param entity - Entity to save
   * @param manager - Optional EntityManager for transactions
   * @returns Saved entity
   */
  save(entity: T, manager?: EntityManager): Promise<T>;
  
  /**
   * Update an entity by ID
   * 
   * @param id - Entity ID
   * @param data - Partial entity data to update
   * @param manager - Optional EntityManager for transactions
   * @returns Updated entity
   */
  update(id: number | string, data: Partial<T>, manager?: EntityManager): Promise<T>;
  
  /**
   * Delete an entity by ID
   * 
   * @param id - Entity ID
   * @param manager - Optional EntityManager for transactions
   */
  delete(id: number | string, manager?: EntityManager): Promise<void>;
  
  /**
   * Create a query builder for complex queries
   * 
   * @param alias - Table alias
   * @param manager - Optional EntityManager for transactions
   * @returns SelectQueryBuilder instance
   */
  createQueryBuilder(alias: string, manager?: EntityManager): SelectQueryBuilder<T>;
}

