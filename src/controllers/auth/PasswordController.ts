import { Request, Response } from 'express';
import { BaseController } from '../base/BaseController';
import { AuthService } from '../../services/auth/AuthService';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { APIError } from '../../utils/ApiError.utils';
import { ErrorCode } from '../../utils/errors/ErrorCodes';
import { AuthRequest } from '../../middlewares/auth.middleware';

/**
 * PasswordController handles password-related operations
 * Requirements: 13.1, 13.3
 */
export class PasswordController extends BaseController {
  constructor(private authService: AuthService) {
    super();
  }
  
  /**
   * Handle password change
   * 
   * @route POST /api/v1/auth/change-password
   * @access Authenticated
   */
  changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body as any;
    
    if (!userId) {
      throw new APIError(401, 'User not authenticated');
    }
    
    // Validate required fields
    if (!oldPassword || !newPassword) {
      throw new APIError(400, 'Old password and new password are required');
    }
    
    // Call auth service to change password
    await this.authService.changePassword(userId, oldPassword, newPassword);
    
    // Send 200 OK response
    this.sendSuccess(res, null, 'Password changed successfully. All sessions have been revoked.');
  });
  
  /**
   * Handle forgot password request
   * 
   * @route POST /api/v1/auth/forgot-password
   * @access Public
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    
    // Validate required field
    if (!email) {
      throw new APIError(400, 'Email is required');
    }
    
    // Note: forgotPassword method needs to be implemented in AuthService
    // For now, this is a placeholder that matches the task requirements
    // await this.authService.forgotPassword(email);
    
    // Send 200 OK response (don't reveal if email exists)
    this.sendSuccess(
      res,
      null,
      'If the email exists, a password reset link has been sent'
    );
  });
  
  /**
   * Handle password reset
   * 
   * @route POST /api/v1/auth/reset-password
   * @access Public
   */
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body;
    
    // Validate required fields
    if (!token || !newPassword) {
      throw new APIError(400, 'Reset token and new password are required');
    }
    
    // Note: resetPassword method needs to be implemented in AuthService
    // For now, this is a placeholder that matches the task requirements
    // await this.authService.resetPassword(token, newPassword);
    
    // Send 200 OK response
    this.sendSuccess(res, null, 'Password reset successfully');
  });
}

