import { Router } from 'express';
import { DataSource } from 'typeorm';
import { UserProfileController } from '../../controllers/user/UserProfileController';
import { UserAddressController } from '../../controllers/user/UserAddressController';
import { authenticateUser } from '../../middlewares/auth/authenticate.middleware';
import { validateBody } from '../../middlewares/validation/validate.middleware';
import { z } from 'zod';

/**
 * User profile update schema
 */
const updateProfileSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  fullName: z.string().min(2).max(100).optional(),
  phoneNumber: z.string().regex(/^(\+977)?[0-9]{10}$/).optional(),
});

/**
 * Address schema
 */
const addAddressSchema = z.object({
  fullName: z.string().min(2).max(100),
  phoneNumber: z.string().regex(/^(\+977)?[0-9]{10}$/),
  addressLine1: z.string().min(5).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  postalCode: z.string().min(4).max(10),
  country: z.string().min(2).max(100).default('Nepal'),
  isDefault: z.boolean().optional(),
});

/**
 * Create user routes
 * 
 * @param dataSource - TypeORM DataSource for database access
 * @returns Express Router with user routes
 */
export function createUserRoutes(dataSource: DataSource): Router {
  const router = Router();
  
  // Initialize controllers
  const profileController = new UserProfileController(dataSource);
  const addressController = new UserAddressController(dataSource);
  
  // All user routes require authentication
  router.use(authenticateUser(dataSource));
  
  /**
   * @route GET /api/v1/users/me
   * @desc Get authenticated user's profile
   * @access Authenticated
   */
  router.get('/me', profileController.getProfile);
  
  /**
   * @route PUT /api/v1/users/me
   * @desc Update authenticated user's profile
   * @access Authenticated
   */
  router.put(
    '/me',
    validateBody(updateProfileSchema),
    profileController.updateProfile
  );
  
  /**
   * @route DELETE /api/v1/users/me
   * @desc Delete authenticated user's account
   * @access Authenticated
   */
  router.delete('/me', profileController.deleteAccount);
  
  /**
   * @route GET /api/v1/users/me/addresses
   * @desc Get all addresses for authenticated user
   * @access Authenticated
   */
  router.get('/me/addresses', addressController.getAddresses);
  
  /**
   * @route POST /api/v1/users/me/addresses
   * @desc Add new address for authenticated user
   * @access Authenticated
   */
  router.post(
    '/me/addresses',
    validateBody(addAddressSchema),
    addressController.addAddress
  );
  
  return router;
}
