import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Request } from 'express';
import { User } from '../../entities/user.entity';
import { UserRepository } from '../../repositories/UserRepository';
import { TokenService, TokenPair } from './TokenService';
import { SessionService } from './SessionService';
import { APIError } from '../../utils/errors/ApiError';
import { ErrorCode } from '../../utils/errors/ErrorCodes';
import { BCRYPT_ROUNDS, TOKEN_EXPIRY } from '../../config/constants';

/**
 * Signup input interface
 */
export interface SignupInput {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

/**
 * Authentication result interface
 */
export interface AuthResult {
  user: User;
  tokens: TokenPair;
  sessionId: string;
}

/**
 * AuthService handles authentication business logic
 * Manages user signup, login, logout, token refresh, and password operations
 */
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private tokenService: TokenService,
    private sessionService: SessionService
  ) {}
  
  /**
   * Register a new user
   * 
   * @param data - Signup data
   * @returns User, tokens, and session ID
   * @throws APIError if email already exists
   */
  async signup(data: SignupInput): Promise<AuthResult> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw APIError.conflict(
        'Email already registered',
        ErrorCode.EMAIL_ALREADY_EXISTS
      );
    }
    
    // Check if phone number already exists (if provided)
    if (data.phoneNumber) {
      const existingPhone = await this.userRepository.findByPhoneNumber(data.phoneNumber);
      if (existingPhone) {
        throw APIError.conflict(
          'Phone number already registered',
          ErrorCode.PHONE_ALREADY_EXISTS
        );
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    
    // Generate verification token
    const verificationCode = crypto.randomBytes(32).toString('hex');
    const verificationCodeExpire = new Date(Date.now() + TOKEN_EXPIRY.VERIFICATION_CODE);
    
    // Create user
    const user = new User();
    user.email = data.email;
    user.password = hashedPassword;
    user.fullName = data.fullName;
    user.phoneNumber = data.phoneNumber || null;
    user.verificationCode = verificationCode;
    user.verificationCodeExpire = verificationCodeExpire;
    user.isVerified = false;
    
    const savedUser = await this.userRepository.save(user);
    
    // Generate tokens
    const tokens = this.tokenService.generateTokenPair(savedUser);
    
    // Create session (we need a request object, but for signup we'll create a minimal one)
    // In real implementation, this should receive the actual request
    const mockReq = { headers: {}, ip: '' } as Request;
    const session = await this.sessionService.createSession(savedUser, tokens.refreshToken, mockReq);
    
    return {
      user: savedUser,
      tokens,
      sessionId: session.id,
    };
  }
  
  /**
   * Authenticate a user with email and password
   * 
   * @param email - User email
   * @param password - User password
   * @param req - Express request object
   * @returns User, tokens, and session ID
   * @throws APIError if credentials are invalid or user is not verified
   */
  async login(email: string, password: string, req: Request): Promise<AuthResult> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw APIError.unauthorized(
        'Invalid email or password',
        ErrorCode.INVALID_CREDENTIALS
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw APIError.unauthorized(
        'Invalid email or password',
        ErrorCode.INVALID_CREDENTIALS
      );
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      throw APIError.forbidden(
        'Please verify your email before logging in',
        ErrorCode.AUTHENTICATION_FAILED
      );
    }
    
    // Generate tokens
    const tokens = this.tokenService.generateTokenPair(user);
    
    // Create session
    const session = await this.sessionService.createSession(user, tokens.refreshToken, req);
    
    return {
      user,
      tokens,
      sessionId: session.id,
    };
  }
  
  /**
   * Logout a user by revoking their session
   * 
   * @param userId - User ID
   * @param sessionId - Session ID to revoke
   */
  async logout(userId: number, sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId);
  }
  
  /**
   * Refresh access token using refresh token
   * 
   * @param refreshToken - Refresh token
   * @param sessionId - Session ID
   * @returns New token pair
   * @throws APIError if refresh token is invalid or session is revoked
   */
  async refreshToken(refreshToken: string, sessionId: string): Promise<TokenPair> {
    // Verify refresh token format
    const decoded = this.tokenService.verifyRefreshToken(refreshToken);
    
    // Find and validate session
    const session = await this.sessionService.findValidSession(sessionId);
    if (!session) {
      throw APIError.unauthorized(
        'Session not found or has been revoked',
        ErrorCode.SESSION_REVOKED
      );
    }
    
    // Verify refresh token matches session
    const isTokenValid = await this.sessionService.verifyRefreshToken(sessionId, refreshToken);
    if (!isTokenValid) {
      throw APIError.unauthorized(
        'Invalid refresh token',
        ErrorCode.INVALID_TOKEN
      );
    }
    
    // Get user
    const user = await this.userRepository.findById(decoded.id);
    if (!user) {
      throw APIError.notFound(
        'User not found',
        ErrorCode.USER_NOT_FOUND
      );
    }
    
    // Generate new access token (keep same refresh token)
    const accessToken = this.tokenService.generateAccessToken(user);
    
    return {
      accessToken,
      refreshToken, // Return the same refresh token
    };
  }
  
  /**
   * Change user password
   * 
   * @param userId - User ID
   * @param oldPassword - Current password
   * @param newPassword - New password
   * @throws APIError if old password is incorrect
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw APIError.notFound(
        'User not found',
        ErrorCode.USER_NOT_FOUND
      );
    }
    
    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password || '');
    if (!isOldPasswordValid) {
      throw APIError.badRequest(
        'Current password is incorrect',
        ErrorCode.INVALID_CREDENTIALS
      );
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    
    // Update user password
    await this.userRepository.update(userId, { password: hashedPassword });
    
    // Revoke all sessions for security
    await this.sessionService.revokeAllUserSessions(userId);
  }
}

