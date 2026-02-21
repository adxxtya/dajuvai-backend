import { Router } from 'express';
import { DataSource } from 'typeorm';
import { ProductController } from '../../controllers/product.controller';

/**
 * Create vendor routes with dependency injection
 * 
 * @param dataSource - TypeORM DataSource for database access
 * @returns Express Router with vendor routes
 */
export function createVendorRoutes(dataSource: DataSource): Router {
  const router = Router();
  const productController = new ProductController(dataSource);

  /**
   * @route GET /api/v1/vendors/:vendorId/products
   * @desc Get products by vendor ID
   * @access Public
   */
  router.get('/:vendorId/products', productController.getProductsByVendorId.bind(productController));

  /**
   * @route GET /api/v1/vendors/:vendorId/products/export
   * @desc Export vendor products to Excel
   * @access Public
   */
  router.get('/:vendorId/products/export', productController.exportVendorProductsToExcel.bind(productController));

  return router;
}
