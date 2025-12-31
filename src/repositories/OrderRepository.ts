import { DataSource, EntityManager, FindManyOptions, FindOneOptions, Repository, SelectQueryBuilder } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from '../entities/order.entity';
import { IRepository } from './IRepository';

/**
 * Order query options interface
 */
export interface OrderQueryOptions {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  sortBy?: 'createdAt' | 'totalPrice' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * OrderRepository handles database operations for Order entities
 * Implements IRepository interface for standardized data access
 */
export class OrderRepository implements IRepository<Order> {
  private repository: Repository<Order>;
  
  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(Order);
  }
  
  /**
   * Get the repository instance (with optional transaction manager)
   */
  private getRepository(manager?: EntityManager): Repository<Order> {
    return manager ? manager.getRepository(Order) : this.repository;
  }
  
  /**
   * Find an order by its ID with all relations
   */
  async findById(id: number, manager?: EntityManager): Promise<Order | null> {
    const repo = this.getRepository(manager);
    
    // Eager load all relations in a single query
    return repo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.product', 'product')
      .leftJoinAndSelect('orderItems.variant', 'variant')
      .leftJoinAndSelect('order.orderedBy', 'orderedBy')
      .leftJoinAndSelect('order.shippingAddress', 'shippingAddress')
      .where('order.id = :id', { id })
      .getOne();
  }
  
  /**
   * Find a single order matching the given options
   */
  async findOne(options: FindOneOptions<Order>, manager?: EntityManager): Promise<Order | null> {
    const repo = this.getRepository(manager);
    return repo.findOne(options);
  }
  
  /**
   * Find multiple orders matching the given options
   */
  async findMany(options: FindManyOptions<Order>, manager?: EntityManager): Promise<Order[]> {
    const repo = this.getRepository(manager);
    return repo.find(options);
  }
  
  /**
   * Find orders and count total matching the given options
   */
  async findAndCount(options: FindManyOptions<Order>, manager?: EntityManager): Promise<[Order[], number]> {
    const repo = this.getRepository(manager);
    return repo.findAndCount(options);
  }
  
  /**
   * Save an order (create or update)
   */
  async save(entity: Order, manager?: EntityManager): Promise<Order> {
    const repo = this.getRepository(manager);
    return repo.save(entity);
  }
  
  /**
   * Update an order by ID
   */
  async update(id: number, data: Partial<Order>, manager?: EntityManager): Promise<Order> {
    const repo = this.getRepository(manager);
    await repo.update(id, data as any);
    
    const updated = await this.findById(id, manager);
    if (!updated) {
      throw new Error(`Order with ID ${id} not found after update`);
    }
    
    return updated;
  }
  
  /**
   * Delete an order by ID
   */
  async delete(id: number, manager?: EntityManager): Promise<void> {
    const repo = this.getRepository(manager);
    await repo.delete(id);
  }
  
  /**
   * Create a query builder for complex queries
   */
  createQueryBuilder(alias: string, manager?: EntityManager): SelectQueryBuilder<Order> {
    const repo = this.getRepository(manager);
    return repo.createQueryBuilder(alias);
  }
  
  /**
   * Find orders by user with pagination
   * 
   * @param userId - User ID
   * @param options - Query options
   * @param manager - Optional EntityManager for transactions
   * @returns Tuple of [orders, total count]
   */
  async findByUser(
    userId: number,
    options: OrderQueryOptions = {},
    manager?: EntityManager
  ): Promise<[Order[], number]> {
    const qb = this.createQueryBuilder('order', manager);
    
    // Eager load relations
    qb.leftJoinAndSelect('order.orderItems', 'orderItems');
    qb.leftJoinAndSelect('orderItems.product', 'product');
    qb.leftJoinAndSelect('orderItems.variant', 'variant');
    qb.leftJoinAndSelect('order.orderedBy', 'orderedBy');
    qb.leftJoinAndSelect('order.shippingAddress', 'shippingAddress');
    
    // Filter by user
    qb.where('order.orderedById = :userId', { userId });
    
    // Apply status filter if provided
    if (options.status) {
      qb.andWhere('order.status = :status', { status: options.status });
    }
    
    // Apply payment status filter if provided
    if (options.paymentStatus) {
      qb.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: options.paymentStatus });
    }
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    
    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    qb.orderBy(`order.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    
    return qb.getManyAndCount();
  }
  
  /**
   * Find orders by vendor with pagination
   * Filters orders that contain items from the specified vendor
   * 
   * @param vendorId - Vendor ID
   * @param options - Query options
   * @param manager - Optional EntityManager for transactions
   * @returns Tuple of [orders, total count]
   */
  async findByVendor(
    vendorId: number,
    options: OrderQueryOptions = {},
    manager?: EntityManager
  ): Promise<[Order[], number]> {
    const qb = this.createQueryBuilder('order', manager);
    
    // Eager load relations
    qb.leftJoinAndSelect('order.orderItems', 'orderItems');
    qb.leftJoinAndSelect('orderItems.product', 'product');
    qb.leftJoinAndSelect('orderItems.variant', 'variant');
    qb.leftJoinAndSelect('order.orderedBy', 'orderedBy');
    qb.leftJoinAndSelect('order.shippingAddress', 'shippingAddress');
    
    // Filter by vendor - orders that have at least one item from this vendor
    qb.where('product.vendorId = :vendorId', { vendorId });
    
    // Apply status filter if provided
    if (options.status) {
      qb.andWhere('order.status = :status', { status: options.status });
    }
    
    // Apply payment status filter if provided
    if (options.paymentStatus) {
      qb.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: options.paymentStatus });
    }
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    
    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    qb.orderBy(`order.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    
    return qb.getManyAndCount();
  }
  
  /**
   * Find orders by status with pagination
   * 
   * @param status - Order status
   * @param options - Query options
   * @param manager - Optional EntityManager for transactions
   * @returns Tuple of [orders, total count]
   */
  async findByStatus(
    status: OrderStatus,
    options: OrderQueryOptions = {},
    manager?: EntityManager
  ): Promise<[Order[], number]> {
    const qb = this.createQueryBuilder('order', manager);
    
    // Eager load relations
    qb.leftJoinAndSelect('order.orderItems', 'orderItems');
    qb.leftJoinAndSelect('orderItems.product', 'product');
    qb.leftJoinAndSelect('order.orderedBy', 'orderedBy');
    qb.leftJoinAndSelect('order.shippingAddress', 'shippingAddress');
    
    // Filter by status
    qb.where('order.status = :status', { status });
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    
    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    qb.orderBy(`order.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    
    return qb.getManyAndCount();
  }
  
  /**
   * Find orders by payment status with pagination
   * 
   * @param paymentStatus - Payment status
   * @param options - Query options
   * @param manager - Optional EntityManager for transactions
   * @returns Tuple of [orders, total count]
   */
  async findByPaymentStatus(
    paymentStatus: PaymentStatus,
    options: OrderQueryOptions = {},
    manager?: EntityManager
  ): Promise<[Order[], number]> {
    const qb = this.createQueryBuilder('order', manager);
    
    // Eager load relations
    qb.leftJoinAndSelect('order.orderItems', 'orderItems');
    qb.leftJoinAndSelect('orderItems.product', 'product');
    qb.leftJoinAndSelect('order.orderedBy', 'orderedBy');
    qb.leftJoinAndSelect('order.shippingAddress', 'shippingAddress');
    
    // Filter by payment status
    qb.where('order.paymentStatus = :paymentStatus', { paymentStatus });
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    
    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    qb.orderBy(`order.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    
    return qb.getManyAndCount();
  }
  
  /**
   * Find an order by transaction ID
   * Used for payment verification
   * 
   * @param transactionId - Payment transaction ID
   * @param manager - Optional EntityManager for transactions
   * @returns Order or null if not found
   */
  async findByOrderNumber(transactionId: string, manager?: EntityManager): Promise<Order | null> {
    const repo = this.getRepository(manager);
    
    return repo.findOne({
      where: { mTransactionId: transactionId },
      relations: ['orderItems', 'orderItems.product', 'orderedBy', 'shippingAddress'],
    });
  }
}

