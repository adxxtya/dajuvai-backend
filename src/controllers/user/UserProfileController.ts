import { Response } from 'express';
import { BaseController } from '../base/BaseController';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { APIError } from '../../utils/errors/ApiError';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';

/**
 * UserProfileController handles user profile operations
 * Requirements: 13.1, 13.3
 */
export class UserProfileController extends BaseController {
  private userRepository;
  
  constructor(private dataSource: DataSource) {
    super();
    this.userRepository = dataSource.getRepository(User);
  }
  
  /**
   * Get authenticated user's profile
   * 
   * @route GET /api/v1/users/me
   * @access Authenticated
   */
  getProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw APIError.unauthorized('User not authenticated');
    }
    
    // Get user profile from repository
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw APIError.notFound('User not found');
    }
    
    // Send success response (exclude sensitive fields)
    this.sendSuccess(res, {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    }, 'Profile retrieved successfully');
  });
  
  /**
   * Update authenticated user's profile
   * 
   * @route PUT /api/v1/users/me
   * @access Authenticated
   */
  updateProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw APIError.unauthorized('User not authenticated');
    }
    
    const { username, fullName, phoneNumber } = req.body as { username?: string; fullName?: string; phoneNumber?: string };
    
    // Update user profile
    await this.userRepository.update(userId, {
      username,
      fullName,
      phoneNumber,
    });
    
    // Get updated user
    const updatedUser = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!updatedUser) {
      throw APIError.notFound('User not found');
    }
    
    // Send success response
    this.sendSuccess(res, {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      phoneNumber: updatedUser.phoneNumber,
      role: updatedUser.role,
    }, 'Profile updated successfully');
  });
  
  /**
   * Delete authenticated user's account
   * 
   * @route DELETE /api/v1/users/me
   * @access Authenticated
   */
  deleteAccount = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw APIError.unauthorized('User not authenticated');
    }
    
    // Delete user account
    await this.userRepository.delete(userId);
    
    // Send no content response
    this.sendNoContent(res, 'Account deleted successfully');
  });
}
