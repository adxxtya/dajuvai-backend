import { Request, Response } from 'express';
import { BaseController } from '../base/BaseController';
import { AuthService } from '../../services/auth/AuthService';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { APIError } from '../../utils/ApiError.utils';
import { ErrorCode } from '../../utils/errors/ErrorCodes';

/**
 * SignupController handles user registration
 * Requirements: 13.1, 13.3
 */
export class SignupController extends BaseController {
  constructor(private authService: AuthService) {
    super();
  }
  
  /**
   * Handle user signup
   * 
   * @route POST /api/v1/auth/register
   * @access Public
   */
  signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, fullName, phoneNumber } = req.body;
    
    // Validate required fields
    if (!email || !password || !fullName) {
      throw new APIError(400, 'Email, password, and full name are required');
    }
    
    // Call auth service to create user
    const result = await this.authService.signup({
      email,
      password,
      fullName,
      phoneNumber,
    });
    
    // Send 201 Created response
    this.sendCreated(res, {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
      tokens: result.tokens,
      sessionId: result.sessionId,
    }, 'User registered successfully');
  });
}

