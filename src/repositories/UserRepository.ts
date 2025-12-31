import { DataSource, EntityManager, FindManyOptions, FindOneOptions, Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../entities/user.entity';
import { IRepository } from './IRepository';

/**
 * UserRepository handles database operations for User entities
 * Implements IRepository interface for standardized data access
 */
export class UserRepository implements IRepository<User> {
  private repository: Repository<User>;
  
  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(User);
  }
  
  /**
   * Get the repository instance (with optional transaction manager)
   */
  private getRepository(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.repository;
  }
  
  /**
   * Find a user by their ID
   */
  async findById(id: number, manager?: EntityManager): Promise<User | null> {
    const repo = this.getRepository(manager);
    return repo.findOne({ where: { id } });
  }
  
  /**
   * Find a single user matching the given options
   */
  async findOne(options: FindOneOptions<User>, manager?: EntityManager): Promise<User | null> {
    const repo = this.getRepository(manager);
    return repo.findOne(options);
  }
  
  /**
   * Find multiple users matching the given options
   */
  async findMany(options: FindManyOptions<User>, manager?: EntityManager): Promise<User[]> {
    const repo = this.getRepository(manager);
    return repo.find(options);
  }
  
  /**
   * Find users and count total matching the given options
   */
  async findAndCount(options: FindManyOptions<User>, manager?: EntityManager): Promise<[User[], number]> {
    const repo = this.getRepository(manager);
    return repo.findAndCount(options);
  }
  
  /**
   * Save a user (create or update)
   */
  async save(entity: User, manager?: EntityManager): Promise<User> {
    const repo = this.getRepository(manager);
    return repo.save(entity);
  }
  
  /**
   * Update a user by ID
   */
  async update(id: number, data: Partial<User>, manager?: EntityManager): Promise<User> {
    const repo = this.getRepository(manager);
    await repo.update(id, data as any);
    
    const updated = await this.findById(id, manager);
    if (!updated) {
      throw new Error(`User with ID ${id} not found after update`);
    }
    
    return updated;
  }
  
  /**
   * Delete a user by ID
   */
  async delete(id: number, manager?: EntityManager): Promise<void> {
    const repo = this.getRepository(manager);
    await repo.delete(id);
  }
  
  /**
   * Create a query builder for complex queries
   */
  createQueryBuilder(alias: string, manager?: EntityManager): SelectQueryBuilder<User> {
    const repo = this.getRepository(manager);
    return repo.createQueryBuilder(alias);
  }
  
  /**
   * Find a user by email address
   * 
   * @param email - Email address
   * @param manager - Optional EntityManager for transactions
   * @returns User or null if not found
   */
  async findByEmail(email: string, manager?: EntityManager): Promise<User | null> {
    const repo = this.getRepository(manager);
    return repo.findOne({ where: { email } });
  }
  
  /**
   * Find a user by phone number
   * 
   * @param phoneNumber - Phone number
   * @param manager - Optional EntityManager for transactions
   * @returns User or null if not found
   */
  async findByPhoneNumber(phoneNumber: string, manager?: EntityManager): Promise<User | null> {
    const repo = this.getRepository(manager);
    return repo.findOne({ where: { phoneNumber } });
  }
  
  /**
   * Find a user by verification token
   * 
   * @param token - Verification token
   * @param manager - Optional EntityManager for transactions
   * @returns User or null if not found
   */
  async findByVerificationToken(token: string, manager?: EntityManager): Promise<User | null> {
    const repo = this.getRepository(manager);
    return repo.findOne({ where: { verificationCode: token } });
  }
  
  /**
   * Find a user by password reset token
   * 
   * @param token - Reset token
   * @param manager - Optional EntityManager for transactions
   * @returns User or null if not found
   */
  async findByResetToken(token: string, manager?: EntityManager): Promise<User | null> {
    const repo = this.getRepository(manager);
    return repo.findOne({ where: { resetToken: token } });
  }
}

