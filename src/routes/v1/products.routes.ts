import { Router } from 'express';
import { DataSource } from 'typeorm';
import { ProductController } from '../../controllers/product.controller';
import { uploadMiddleware } from '../../config/multer.config';
import { authMiddleware, combinedAuthMiddleware, isAdminOrStaff, isAdminOrVendor } from '../../middlewares/auth.middleware';

/**
 * Create product routes with dependency injection
 * 
 * @param dataSource - TypeORM DataSource for database access
 * @returns Express Router with product routes
 */
export function createProductRoutes(dataSource: DataSource): Router {
  const router = Router();
  const productController = new ProductController(dataSource);

  /**
   * @route GET /api/v1/products/:id
   * @desc Get product details by ID
   * @access Public
   */
  router.get('/:id', productController.getProductDetailById.bind(productController));

  /**
   * @route DELETE /api/v1/products/:id
   * @desc Delete product by ID
   * @access Vendor (owner) or Admin
   */
  router.delete(
    '/:id',
    combinedAuthMiddleware,
    isAdminOrVendor,
    productController.deleteProductById.bind(productController)
  );

  /**
   * @route POST /api/v1/products/image/upload
   * @desc Upload product images to Cloudinary
   * @access Authenticated
   */
  router.post(
    '/image/upload',
    uploadMiddleware,
    productController.uplaodImage.bind(productController)
  );

  /**
   * @route GET /api/v1/products/admin/products
   * @desc Get all products for admin
   * @access Admin or Staff
   */
  router.get(
    '/admin/products',
    authMiddleware,
    isAdminOrStaff,
    productController.getAdminProducts.bind(productController)
  );

  return router;
}
