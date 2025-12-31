import { DataSource, EntityManager, FindManyOptions, FindOneOptions, Repository, SelectQueryBuilder, LessThan } from 'typeorm';
import { Product } from '../entities/product.entity';
import { IRepository } from './IRepository';

/**
 * Product query options interface
 */
export interface ProductQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  subcategoryId?: number;
  vendorId?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'name' | 'createdAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

/**
 * ProductRepository handles database operations for Product entities
 * Implements IRepository interface for standardized data access
 */
export class ProductRepository implements IRepository<Product> {
  private repository: Repository<Product>;
  
  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(Product);
  }
  
  /**
   * Get the repository instance (with optional transaction manager)
   */
  private getRepository(manager?: EntityManager): Repository<Product> {
    return manager ? manager.getRepository(Product) : this.repository;
  }
  
  /**
   * Find a product by its ID
   */
  async findById(id: number, manager?: EntityManager): Promise<Product | null> {
    const repo = this.getRepository(manager);
    
    // Use selective field loading and proper joins
    return repo
      .createQueryBuilder('product')
      .select([
        'product.id',
        'product.name',
        'product.miniDescription',
        'product.longDescription',
        'product.basePrice',
        'product.finalPrice',
        'product.discount',
        'product.discountType',
        'product.stock',
        'product.status',
        'product.productImages',
        'product.hasVariants',
        'product.version',
        'product.created_at',
        'product.updated_at',
      ])
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .addSelect(['subcategory.id', 'subcategory.name'])
      .leftJoinAndSelect('product.brand', 'brand')
      .addSelect(['brand.id', 'brand.name'])
      .leftJoinAndSelect('product.variants', 'variants')
      .where('product.id = :id', { id })
      .getOne();
  }
  
  /**
   * Find a single product matching the given options
   */
  async findOne(options: FindOneOptions<Product>, manager?: EntityManager): Promise<Product | null> {
    const repo = this.getRepository(manager);
    return repo.findOne(options);
  }
  
  /**
   * Find multiple products matching the given options
   */
  async findMany(options: FindManyOptions<Product>, manager?: EntityManager): Promise<Product[]> {
    const repo = this.getRepository(manager);
    return repo.find(options);
  }
  
  /**
   * Find products and count total matching the given options
   */
  async findAndCount(options: FindManyOptions<Product>, manager?: EntityManager): Promise<[Product[], number]> {
    const repo = this.getRepository(manager);
    return repo.findAndCount(options);
  }
  
  /**
   * Save a product (create or update)
   */
  async save(entity: Product, manager?: EntityManager): Promise<Product> {
    const repo = this.getRepository(manager);
    return repo.save(entity);
  }
  
  /**
   * Update a product by ID
   */
  async update(id: number, data: Partial<Product>, manager?: EntityManager): Promise<Product> {
    const repo = this.getRepository(manager);
    await repo.update(id, data as any);
    
    const updated = await this.findById(id, manager);
    if (!updated) {
      throw new Error(`Product with ID ${id} not found after update`);
    }
    
    return updated;
  }
  
  /**
   * Delete a product by ID
   */
  async delete(id: number, manager?: EntityManager): Promise<void> {
    const repo = this.getRepository(manager);
    await repo.delete(id);
  }
  
  /**
   * Create a query builder for complex queries
   */
  createQueryBuilder(alias: string, manager?: EntityManager): SelectQueryBuilder<Product> {
    const repo = this.getRepository(manager);
    return repo.createQueryBuilder(alias);
  }
  
  /**
   * Find products by vendor with pagination
   * 
   * @param vendorId - Vendor ID
   * @param options - Query options
   * @param manager - Optional EntityManager for transactions
   * @returns Tuple of [products, total count]
   */
  async findByVendor(
    vendorId: number,
    options: ProductQueryOptions = {},
    manager?: EntityManager
  ): Promise<[Product[], number]> {
    const qb = this.createQueryBuilder('product', manager);
    
    // Select only required fields
    qb.select([
      'product.id',
      'product.name',
      'product.miniDescription',
      'product.basePrice',
      'product.finalPrice',
      'product.discount',
      'product.stock',
      'product.status',
      'product.productImages',
      'product.hasVariants',
    ]);
    
    // Add joins
    qb.leftJoinAndSelect('product.subcategory', 'subcategory');
    qb.addSelect(['subcategory.id', 'subcategory.name']);
    
    // Filter by vendor
    qb.where('product.vendorId = :vendorId', { vendorId });
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    
    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    qb.orderBy(`product.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    
    return qb.getManyAndCount();
  }
  
  /**
   * Find products by category with pagination
   * 
   * @param categoryId - Category ID
   * @param options - Query options
   * @param manager - Optional EntityManager for transactions
   * @returns Tuple of [products, total count]
   */
  async findByCategory(
    categoryId: number,
    options: ProductQueryOptions = {},
    manager?: EntityManager
  ): Promise<[Product[], number]> {
    const qb = this.createQueryBuilder('product', manager);
    
    // Select only required fields
    qb.select([
      'product.id',
      'product.name',
      'product.miniDescription',
      'product.basePrice',
      'product.finalPrice',
      'product.discount',
      'product.stock',
      'product.status',
      'product.productImages',
    ]);
    
    // Join with subcategory and category
    qb.leftJoin('product.subcategory', 'subcategory');
    qb.leftJoin('subcategory.category', 'category');
    qb.where('category.id = :categoryId', { categoryId });
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    
    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    qb.orderBy(`product.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    
    return qb.getManyAndCount();
  }
  
  /**
   * Find products by subcategory with pagination
   * 
   * @param subcategoryId - Subcategory ID
   * @param options - Query options
   * @param manager - Optional EntityManager for transactions
   * @returns Tuple of [products, total count]
   */
  async findBySubcategory(
    subcategoryId: number,
    options: ProductQueryOptions = {},
    manager?: EntityManager
  ): Promise<[Product[], number]> {
    const qb = this.createQueryBuilder('product', manager);
    
    // Select only required fields
    qb.select([
      'product.id',
      'product.name',
      'product.miniDescription',
      'product.basePrice',
      'product.finalPrice',
      'product.discount',
      'product.stock',
      'product.status',
      'product.productImages',
    ]);
    
    // Filter by subcategory
    qb.where('product.subcategoryId = :subcategoryId', { subcategoryId });
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    
    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    qb.orderBy(`product.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    
    return qb.getManyAndCount();
  }
  
  /**
   * Search products by name and description
   * 
   * @param query - Search query
   * @param options - Query options
   * @param manager - Optional EntityManager for transactions
   * @returns Tuple of [products, total count]
   */
  async search(
    query: string,
    options: ProductQueryOptions = {},
    manager?: EntityManager
  ): Promise<[Product[], number]> {
    const qb = this.createQueryBuilder('product', manager);
    
    // Select only required fields
    qb.select([
      'product.id',
      'product.name',
      'product.miniDescription',
      'product.basePrice',
      'product.finalPrice',
      'product.discount',
      'product.stock',
      'product.status',
      'product.productImages',
    ]);
    
    // Search in name and description
    qb.where(
      '(LOWER(product.name) LIKE LOWER(:query) OR LOWER(product.miniDescription) LIKE LOWER(:query) OR LOWER(product.longDescription) LIKE LOWER(:query))',
      { query: `%${query}%` }
    );
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    
    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    qb.orderBy(`product.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    
    return qb.getManyAndCount();
  }
  
  /**
   * Find products with low stock
   * 
   * @param threshold - Stock threshold (default: 10)
   * @param manager - Optional EntityManager for transactions
   * @returns Array of products with low stock
   */
  async findWithLowStock(threshold: number = 10, manager?: EntityManager): Promise<Product[]> {
    const repo = this.getRepository(manager);
    
    return repo.find({
      where: {
        stock: LessThan(threshold),
        hasVariants: false, // Only check products without variants
      },
      select: [
        'id',
        'name',
        'stock',
        'vendorId',
      ],
      order: {
        stock: 'ASC',
      },
    });
  }
}

