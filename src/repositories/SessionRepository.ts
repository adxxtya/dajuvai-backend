import { DataSource, EntityManager, FindManyOptions, FindOneOptions, MoreThan, Repository, SelectQueryBuilder } from 'typeorm';
import { Session } from '../entities/session.entity';
import { IRepository } from './IRepository';

/**
 * SessionRepository handles database operations for Session entities
 * Implements IRepository interface for standardized data access
 */
export class SessionRepository implements IRepository<Session> {
  private repository: Repository<Session>;
  
  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(Session);
  }
  
  /**
   * Get the repository instance (with optional transaction manager)
   */
  private getRepository(manager?: EntityManager): Repository<Session> {
    return manager ? manager.getRepository(Session) : this.repository;
  }
  
  /**
   * Find a session by its ID
   */
  async findById(id: string, manager?: EntityManager): Promise<Session | null> {
    const repo = this.getRepository(manager);
    return repo.findOne({ where: { id } });
  }
  
  /**
   * Find a single session matching the given options
   */
  async findOne(options: FindOneOptions<Session>, manager?: EntityManager): Promise<Session | null> {
    const repo = this.getRepository(manager);
    return repo.findOne(options);
  }
  
  /**
   * Find multiple sessions matching the given options
   */
  async findMany(options: FindManyOptions<Session>, manager?: EntityManager): Promise<Session[]> {
    const repo = this.getRepository(manager);
    return repo.find(options);
  }
  
  /**
   * Find sessions and count total matching the given options
   */
  async findAndCount(options: FindManyOptions<Session>, manager?: EntityManager): Promise<[Session[], number]> {
    const repo = this.getRepository(manager);
    return repo.findAndCount(options);
  }
  
  /**
   * Save a session (create or update)
   */
  async save(entity: Session, manager?: EntityManager): Promise<Session> {
    const repo = this.getRepository(manager);
    return repo.save(entity);
  }
  
  /**
   * Update a session by ID
   */
  async update(id: string, data: Partial<Session>, manager?: EntityManager): Promise<Session> {
    const repo = this.getRepository(manager);
    await repo.update(id, data as any);
    
    const updated = await this.findById(id, manager);
    if (!updated) {
      throw new Error(`Session with ID ${id} not found after update`);
    }
    
    return updated;
  }
  
  /**
   * Delete a session by ID
   */
  async delete(id: string, manager?: EntityManager): Promise<void> {
    const repo = this.getRepository(manager);
    await repo.delete(id);
  }
  
  /**
   * Create a query builder for complex queries
   */
  createQueryBuilder(alias: string, manager?: EntityManager): SelectQueryBuilder<Session> {
    const repo = this.getRepository(manager);
    return repo.createQueryBuilder(alias);
  }
  
  /**
   * Find a valid (non-revoked, non-expired) session by ID
   * 
   * @param sessionId - Session ID
   * @param manager - Optional EntityManager for transactions
   * @returns Session or null if not found or invalid
   */
  async findValidSession(sessionId: string, manager?: EntityManager): Promise<Session | null> {
    const repo = this.getRepository(manager);
    
    return repo.findOne({
      where: {
        id: sessionId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });
  }
  
  /**
   * Find all sessions for a user
   * 
   * @param userId - User ID
   * @param manager - Optional EntityManager for transactions
   * @returns Array of sessions
   */
  async findByUserId(userId: number, manager?: EntityManager): Promise<Session[]> {
    const repo = this.getRepository(manager);
    
    return repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}

