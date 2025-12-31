import { Request, Response } from 'express';
import { BaseController } from '../base/BaseController';
import { AuthService } from '../../services/auth/AuthService';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { APIError } from '../../utils/ApiError.utils';
import { ErrorCode } from '../../utils/errors/ErrorCodes';
import { AuthRequest } from '../../middlewares/auth.middleware';

/**
 * LoginController handles user authentication
 * Requirements: 13.1, 13.3
 */
export class LoginController extends BaseController {
  constructor(private authService: AuthService) {
    super();
  }
  
  /**
   * Handle user login
   * 
   * @route POST /api/v1/auth/login
   * @access Public
   */
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      throw new APIError(400, 'Email and password are required');
    }
    
    // Call auth service to authenticate user
    const result = await this.authService.login(email, password, req);
    
    // Send 200 OK response with tokens
    this.sendSuccess(res, {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
      tokens: result.tokens,
      sessionId: result.sessionId,
    }, 'Login successful');
  });
  
  /**
   * Handle user logout
   * 
   * @route POST /api/v1/auth/logout
   * @access Authenticated
   */
  logout = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const sessionId = (req.body as any).sessionId || req.headers['x-session-id'];
    
    if (!userId) {
      throw new APIError(401, 'User not authenticated');
    }
    
    if (!sessionId) {
      throw new APIError(400, 'Session ID is required');
    }
    
    // Call auth service to revoke session
    await this.authService.logout(userId, sessionId as string);
    
    // Send 204 No Content response
    this.sendNoContent(res, 'Logout successful');
  });
  
  /**
   * Handle token refresh
   * 
   * @route POST /api/v1/auth/refresh
   * @access Public
   */
  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken, sessionId } = req.body;
    
    // Validate required fields
    if (!refreshToken || !sessionId) {
      throw new APIError(400, 'Refresh token and session ID are required');
    }
    
    // Call auth service to refresh tokens
    const tokens = await this.authService.refreshToken(refreshToken, sessionId);
    
    // Send 200 OK response with new tokens
    this.sendSuccess(res, { tokens }, 'Token refreshed successfully');
  });
}

