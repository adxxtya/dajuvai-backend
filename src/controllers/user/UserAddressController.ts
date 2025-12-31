import { Response } from 'express';
import { BaseController } from '../base/BaseController';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { APIError } from '../../utils/errors/ApiError';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { DataSource } from 'typeorm';
import { Address } from '../../entities/address.entity';

/**
 * UserAddressController handles user address operations
 * Requirements: 13.1, 13.3
 */
export class UserAddressController extends BaseController {
  private addressRepository;
  
  constructor(private dataSource: DataSource) {
    super();
    this.addressRepository = dataSource.getRepository(Address);
  }
  
  /**
   * Get all addresses for authenticated user
   * 
   * @route GET /api/v1/users/me/addresses
   * @access Authenticated
   */
  getAddresses = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw APIError.unauthorized('User not authenticated');
    }
    
    // Get all addresses for user
    const addresses = await this.addressRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    
    // Send success response
    this.sendSuccess(res, addresses, 'Addresses retrieved successfully');
  });
  
  /**
   * Add new address for authenticated user
   * 
   * @route POST /api/v1/users/me/addresses
   * @access Authenticated
   */
  addAddress = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw APIError.unauthorized('User not authenticated');
    }
    
    const {
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body as {
      fullName: string;
      phoneNumber: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isDefault?: boolean;
    };
    
    // If this is set as default, unset other default addresses
    if (isDefault) {
      await this.addressRepository.update(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }
    
    // Create new address
    const address = this.addressRepository.create({
      userId,
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault: isDefault || false,
    });
    
    await this.addressRepository.save(address);
    
    // Send created response
    this.sendCreated(res, address, 'Address added successfully');
  });
}
