import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../../entities/user.entity';
import { APIError } from '../../utils/errors/ApiError';
import { ErrorCode } from '../../utils/errors/ErrorCodes';

/**
 * Create authorization middleware
 * Checks if the authenticated user has one of the required roles
 * 
 * @param roles - Array of allowed user roles
 * @returns Express middleware function
 * 
 * @example
 * // Allow only admins
 * router.get('/admin/users', authenticate('user'), authorize(UserRole.ADMIN), controller.getUsers);
 * 
 * @example
 * // Allow admins and staff
 * router.get('/admin/orders', authenticate('user'), authorize(UserRole.ADMIN, UserRole.STAFF), controller.getOrders);
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw APIError.unauthorized(
          'Authentication required',
          ErrorCode.AUTHENTICATION_FAILED
        );
      }
      
      // Get user with proper typing
      const user = req.user as User;
      
      // Check if user has one of the required roles
      if (!roles.includes(user.role)) {
        throw APIError.forbidden(
          'You do not have permission to access this resource',
          ErrorCode.INSUFFICIENT_PERMISSIONS
        );
      }
      
      // User is authorized
      next();
    } catch (error) {
      // Pass error to error handler middleware
      next(error);
    }
  };
}

/**
 * Convenience function to require admin role
 */
export function requireAdmin() {
  return authorize(UserRole.ADMIN);
}

/**
 * Convenience function to require staff role (admin or staff)
 */
export function requireStaff() {
  return authorize(UserRole.ADMIN, UserRole.STAFF);
}

/**
 * Convenience function to require user role (any authenticated user)
 */
export function requireUser() {
  return authorize(UserRole.USER, UserRole.ADMIN, UserRole.STAFF);
}

