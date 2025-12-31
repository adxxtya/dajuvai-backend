import jwt from 'jsonwebtoken';
import { User } from '../../entities/user.entity';
import { getJwtSecret, getRefreshSecret, getTokenConfig, JWT_ALGORITHM, JWT_ISSUER, JWT_AUDIENCE } from '../../config/jwt.config';
import { APIError } from '../../utils/errors/ApiError';
import { ErrorCode } from '../../utils/errors/ErrorCodes';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  type?: 'refresh';
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

/**
 * Token pair interface
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * TokenService handles JWT token generation and verification
 * Provides methods for creating and validating access and refresh tokens
 */
export class TokenService {
  /**
   * Generate an access token for a user
   * 
   * @param user - User entity
   * @returns JWT access token string
   */
  generateAccessToken(user: User): string {
    const tokenConfig = getTokenConfig(user.role as any);
    const secret = getJwtSecret();
    
    const payload: Partial<JwtPayload> = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    
    return jwt.sign(payload, secret, {
      expiresIn: tokenConfig.ACCESS_TOKEN_EXPIRY,
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }
  
  /**
   * Generate a refresh token for a user
   * 
   * @param user - User entity
   * @returns JWT refresh token string
   */
  generateRefreshToken(user: User): string {
    const tokenConfig = getTokenConfig(user.role as any);
    const secret = getRefreshSecret();
    
    const payload: Partial<JwtPayload> = {
      id: user.id,
      type: 'refresh',
    };
    
    return jwt.sign(payload, secret, {
      expiresIn: tokenConfig.REFRESH_TOKEN_EXPIRY,
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }
  
  /**
   * Generate both access and refresh tokens for a user
   * 
   * @param user - User entity
   * @returns Object containing both access and refresh tokens
   */
  generateTokenPair(user: User): TokenPair {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }
  
  /**
   * Verify and decode an access token
   * 
   * @param token - JWT access token string
   * @returns Decoded JWT payload
   * @throws APIError if token is invalid or expired
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const secret = getJwtSecret();
      
      const decoded = jwt.verify(token, secret, {
        algorithms: [JWT_ALGORITHM],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as JwtPayload;
      
      // Ensure this is not a refresh token
      if (decoded.type === 'refresh') {
        throw APIError.unauthorized(
          'Invalid token type. Expected access token.',
          ErrorCode.INVALID_TOKEN
        );
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw APIError.unauthorized(
          'Access token has expired',
          ErrorCode.TOKEN_EXPIRED
        );
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        throw APIError.unauthorized(
          'Invalid access token',
          ErrorCode.INVALID_TOKEN
        );
      }
      
      // Re-throw if it's already an APIError
      if (error instanceof APIError) {
        throw error;
      }
      
      // Unknown error
      throw APIError.internal('Token verification failed');
    }
  }
  
  /**
   * Verify and decode a refresh token
   * 
   * @param token - JWT refresh token string
   * @returns Decoded JWT payload
   * @throws APIError if token is invalid or expired
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      const secret = getRefreshSecret();
      
      const decoded = jwt.verify(token, secret, {
        algorithms: [JWT_ALGORITHM],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as JwtPayload;
      
      // Ensure this is a refresh token
      if (decoded.type !== 'refresh') {
        throw APIError.unauthorized(
          'Invalid token type. Expected refresh token.',
          ErrorCode.INVALID_TOKEN
        );
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw APIError.unauthorized(
          'Refresh token has expired',
          ErrorCode.TOKEN_EXPIRED
        );
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        throw APIError.unauthorized(
          'Invalid refresh token',
          ErrorCode.INVALID_TOKEN
        );
      }
      
      // Re-throw if it's already an APIError
      if (error instanceof APIError) {
        throw error;
      }
      
      // Unknown error
      throw APIError.internal('Token verification failed');
    }
  }
}

