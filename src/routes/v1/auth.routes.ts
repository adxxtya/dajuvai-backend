import { Router } from 'express';
import { DataSource } from 'typeorm';
import { SignupController } from '../../controllers/auth/SignupController';
import { LoginController } from '../../controllers/auth/LoginController';
import { PasswordController } from '../../controllers/auth/PasswordController';
import { AuthService } from '../../services/auth/AuthService';
import { validateBody } from '../../middlewares/validation/validate.middleware';
import { authenticateUser } from '../../middlewares/auth/authenticate.middleware';
import { authRateLimiterMiddleware } from '../../middlewares/auth/rateLimiter.middleware';
import {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from '../../utils/validation/schemas/auth.schemas';

/**
 * Create authentication routes
 * 
 * @param dataSource - TypeORM DataSource for database access
 * @param authService - AuthService instance
 * @returns Express Router with authentication routes
 */
export function createAuthRoutes(dataSource: DataSource, authService: AuthService): Router {
  const router = Router();
  
  // Initialize controllers
  const signupController = new SignupController(authService);
  const loginController = new LoginController(authService);
  const passwordController = new PasswordController(authService);
  
  /**
   * @route POST /api/v1/auth/register
   * @desc Register a new user
   * @access Public
   */
  router.post(
    '/register',
    validateBody(signupSchema),
    signupController.signup
  );
  
  /**
   * @route POST /api/v1/auth/login
   * @desc Login user and get tokens
   * @access Public
   * @rateLimit 5 requests per 15 minutes
   */
  router.post(
    '/login',
    authRateLimiterMiddleware,
    validateBody(loginSchema),
    loginController.login
  );
  
  /**
   * @route POST /api/v1/auth/logout
   * @desc Logout user and revoke session
   * @access Authenticated
   */
  router.post(
    '/logout',
    authenticateUser(dataSource),
    loginController.logout
  );
  
  /**
   * @route POST /api/v1/auth/refresh
   * @desc Refresh access token using refresh token
   * @access Public
   */
  router.post(
    '/refresh',
    validateBody(refreshTokenSchema),
    loginController.refreshToken
  );
  
  /**
   * @route POST /api/v1/auth/forgot-password
   * @desc Request password reset email
   * @access Public
   * @rateLimit 5 requests per 15 minutes
   */
  router.post(
    '/forgot-password',
    authRateLimiterMiddleware,
    validateBody(forgotPasswordSchema),
    passwordController.forgotPassword
  );
  
  /**
   * @route POST /api/v1/auth/reset-password
   * @desc Reset password using reset token
   * @access Public
   */
  router.post(
    '/reset-password',
    validateBody(resetPasswordSchema),
    passwordController.resetPassword
  );
  
  /**
   * @route POST /api/v1/auth/change-password
   * @desc Change password for authenticated user
   * @access Authenticated
   */
  router.post(
    '/change-password',
    authenticateUser(dataSource),
    validateBody(changePasswordSchema),
    passwordController.changePassword
  );
  
  return router;
}
