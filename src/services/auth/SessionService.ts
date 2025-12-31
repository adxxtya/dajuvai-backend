import bcrypt from 'bcrypt';
import { Request } from 'express';
import { LessThan } from 'typeorm';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';
import { SessionRepository } from '../../repositories/SessionRepository';
import { BCRYPT_ROUNDS } from '../../config/constants';

/**
 * SessionService handles session management operations
 * Manages refresh token storage, validation, and revocation
 */
export class SessionService {
  constructor(private sessionRepository: SessionRepository) {}
  
  /**
   * Create a new session for a user
   * 
   * @param user - User entity
   * @param refreshToken - Refresh token to store (will be hashed)
   * @param req - Express request object for user agent and IP
   * @returns Created session
   */
  async createSession(user: User, refreshToken: string, req: Request): Promise<Session> {
    // Hash the refresh token before storing
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    
    // Calculate expiry date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Create session entity
    const session = new Session();
    session.userId = user.id;
    session.refreshTokenHash = refreshTokenHash;
    session.userAgent = req.headers['user-agent'] || null;
    session.ipAddress = req.ip || null;
    session.expiresAt = expiresAt;
    session.isRevoked = false;
    
    // Save and return
    return this.sessionRepository.save(session);
  }
  
  /**
   * Find a valid (non-revoked, non-expired) session by ID
   * 
   * @param sessionId - Session ID
   * @returns Session or null if not found or invalid
   */
  async findValidSession(sessionId: string): Promise<Session | null> {
    return this.sessionRepository.findValidSession(sessionId);
  }
  
  /**
   * Revoke a session by ID
   * 
   * @param sessionId - Session ID to revoke
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, { isRevoked: true });
  }
  
  /**
   * Revoke all sessions for a user
   * Useful when user changes password or wants to logout from all devices
   * 
   * @param userId - User ID
   */
  async revokeAllUserSessions(userId: number): Promise<void> {
    const sessions = await this.sessionRepository.findByUserId(userId);
    
    // Update all sessions to revoked
    const updatePromises = sessions.map(session =>
      this.sessionRepository.update(session.id, { isRevoked: true })
    );
    
    await Promise.all(updatePromises);
  }
  
  /**
   * Verify a refresh token against a session
   * 
   * @param sessionId - Session ID
   * @param refreshToken - Refresh token to verify
   * @returns True if token matches, false otherwise
   */
  async verifyRefreshToken(sessionId: string, refreshToken: string): Promise<boolean> {
    const session = await this.findValidSession(sessionId);
    
    if (!session) {
      return false;
    }
    
    // Compare the provided token with the stored hash
    return bcrypt.compare(refreshToken, session.refreshTokenHash);
  }
  
  /**
   * Clean up expired sessions
   * Should be run periodically (e.g., daily cron job)
   */
  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    
    // Find all expired sessions
    const expiredSessions = await this.sessionRepository.findMany({
      where: {
        expiresAt: LessThan(now),
      },
    });
    
    // Delete them
    const deletePromises = expiredSessions.map(session =>
      this.sessionRepository.delete(session.id)
    );
    
    await Promise.all(deletePromises);
  }
}

