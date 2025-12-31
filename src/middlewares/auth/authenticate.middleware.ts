import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { TokenService } from '../../services/auth/TokenService';
import { User } from '../../entities/user.entity';
import { Vendor } from '../../entities/vendor.entity';
import { APIError } from '../../utils/errors/ApiError';
import { ErrorCode } from '../../utils/errors/ErrorCodes';

/**
 * Extend Express Request to include user and vendor
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
      vendor?: Vendor;
    }
  }
}

/**
 * Authentication type
 */
type AuthType = 'user' | 'vendor' | 'combined';

/**
 * Create authentication middleware
 * 
 * @param type - Type of authentication ('user', 'vendor', or 'combined')
 * @param dataSource - TypeORM DataSource for database access
 * @returns Express middleware function
 */
export function authenticate(type: AuthType, dataSource: DataSource) {
  const tokenService = new TokenService();
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        throw APIError.unauthorized(
          'Authorization header is required',
          ErrorCode.AUTHENTICATION_FAILED
        );
      }
      
      // Check if it's a Bearer token
      if (!authHeader.startsWith('Bearer ')) {
        throw APIError.unauthorized(
          'Invalid authorization format. Expected: Bearer <token>',
          ErrorCode.INVALID_TOKEN
        );
      }
      
      // Extract token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      if (!token) {
        throw APIError.unauthorized(
          'Access token is required',
          ErrorCode.AUTHENTICATION_FAILED
        );
      }
      
      // Verify token
      const decoded = tokenService.verifyAccessToken(token);
      
      // Load user or vendor based on type
      if (type === 'user' || type === 'combined') {
        const userRepository = dataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { id: decoded.id } });
        
        if (user) {
          req.user = user;
          
          // If type is 'user', we're done
          if (type === 'user') {
            return next();
          }
        } else if (type === 'user') {
          // User type required but not found
          throw APIError.unauthorized(
            'User not found',
            ErrorCode.USER_NOT_FOUND
          );
        }
      }
      
      if (type === 'vendor' || type === 'combined') {
        const vendorRepository = dataSource.getRepository(Vendor);
        const vendor = await vendorRepository.findOne({ where: { id: decoded.id } });
        
        if (vendor) {
          req.vendor = vendor;
          
          // If type is 'vendor', we're done
          if (type === 'vendor') {
            return next();
          }
        } else if (type === 'vendor') {
          // Vendor type required but not found
          throw APIError.unauthorized(
            'Vendor not found',
            ErrorCode.RESOURCE_NOT_FOUND
          );
        }
      }
      
      // For combined type, at least one should be found
      if (type === 'combined' && !req.user && !req.vendor) {
        throw APIError.unauthorized(
          'User or vendor not found',
          ErrorCode.AUTHENTICATION_FAILED
        );
      }
      
      next();
    } catch (error) {
      // Pass error to error handler middleware
      next(error);
    }
  };
}

/**
 * Convenience function for user authentication
 */
export function authenticateUser(dataSource: DataSource) {
  return authenticate('user', dataSource);
}

/**
 * Convenience function for vendor authentication
 */
export function authenticateVendor(dataSource: DataSource) {
  return authenticate('vendor', dataSource);
}

/**
 * Convenience function for combined authentication (user or vendor)
 */
export function authenticateCombined(dataSource: DataSource) {
  return authenticate('combined', dataSource);
}

