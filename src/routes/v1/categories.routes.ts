import { Router } from 'express';
import { DataSource } from 'typeorm';
import multer from 'multer';
import { ProductController } from '../../controllers/product.controller';
import { CategoryController } from '../../controllers/category.controller';
import { SubcategoryController } from '../../controllers/subcategory.controller';
import { authMiddleware, combinedAuthMiddleware, isAdminOrStaff, isAdminOrVendor } from '../../middlewares/auth.middleware';
import { multerOptions } from '../../config/multer.config';
import { validateZod } from '../../middlewares/auth.middleware';
import { createCategorySchema, updateCategorySchema } from '../../utils/zod_validations/category.zod';
import { createSubCategorySchema, updateSubcategorySchema } from '../../utils/zod_validations/subcategory.zod';

/**
 * Create category routes with dependency injection
 * 
 * @param dataSource - TypeORM DataSource for database access
 * @returns Express Router with category routes
 */
export function createCategoryRoutes(dataSource: DataSource): Router {
  const router = Router();
  const productController = new ProductController(dataSource);
  const categoryController = new CategoryController();
  const subcategoryController = new SubcategoryController();
  const upload = multer(multerOptions);

  // ===== CATEGORY ROUTES =====

  /**
   * @route POST /api/v1/categories
   * @desc Create a new category
   * @access Admin or Staff
   */
  router.post(
    '/',
    authMiddleware,
    isAdminOrStaff,
    upload.single('image'),
    validateZod(createCategorySchema),
    categoryController.createCategory.bind(categoryController)
  );

  /**
   * @route GET /api/v1/categories
   * @desc Get all categories
   * @access Public
   */
  router.get('/', categoryController.getCategories.bind(categoryController));

  /**
   * @route GET /api/v1/categories/:id
   * @desc Get category by ID
   * @access Public
   */
  router.get('/:id', categoryController.getCategoryById.bind(categoryController));

  /**
   * @route PUT /api/v1/categories/:id
   * @desc Update a category
   * @access Admin or Staff
   */
  router.put(
    '/:id',
    authMiddleware,
    isAdminOrStaff,
    upload.single('image'),
    validateZod(updateCategorySchema),
    categoryController.updateCategory.bind(categoryController)
  );

  /**
   * @route GET /api/v1/categories/search/name
   * @desc Search categories by name
   * @access Admin or Staff
   */
  router.get(
    '/search/name',
    authMiddleware,
    isAdminOrStaff,
    categoryController.searchCategories.bind(categoryController)
  );

  /**
   * @route DELETE /api/v1/categories/:id
   * @desc Delete a category
   * @access Admin or Staff
   */
  router.delete(
    '/:id',
    authMiddleware,
    isAdminOrStaff,
    categoryController.deleteCategory.bind(categoryController)
  );

  // ===== SUBCATEGORY ROUTES =====

  /**
   * @route POST /api/v1/categories/:categoryId/subcategories
   * @desc Create a subcategory
   * @access Admin or Staff
   */
  router.post(
    '/:categoryId/subcategories',
    authMiddleware,
    isAdminOrStaff,
    upload.single('image'),
    validateZod(createSubCategorySchema),
    subcategoryController.createSubcategory.bind(subcategoryController)
  );

  /**
   * @route GET /api/v1/categories/:categoryId/subcategories
   * @desc Get subcategories by category
   * @access Public
   */
  router.get(
    '/:categoryId/subcategories',
    subcategoryController.getSubcategories.bind(subcategoryController)
  );

  /**
   * @route GET /api/v1/categories/:categoryId/subcategories/:id
   * @desc Get a subcategory by ID
   * @access Public
   */
  router.get(
    '/:categoryId/subcategories/:id',
    subcategoryController.getSubcategoryById.bind(subcategoryController)
  );

  /**
   * @route PUT /api/v1/categories/:categoryId/subcategories/:id
   * @desc Update a subcategory
   * @access Admin or Staff
   */
  router.put(
    '/:categoryId/subcategories/:id',
    authMiddleware,
    isAdminOrStaff,
    upload.single('image'),
    validateZod(updateSubcategorySchema),
    subcategoryController.updateSubcategory.bind(subcategoryController)
  );

  /**
   * @route DELETE /api/v1/categories/:categoryId/subcategories/:id
   * @desc Delete a subcategory
   * @access Admin or Staff
   */
  router.delete(
    '/:categoryId/subcategories/:id',
    authMiddleware,
    isAdminOrStaff,
    subcategoryController.deleteSubcategory.bind(subcategoryController)
  );

  // ===== PRODUCT ROUTES (under categories) =====

  /**
   * @route POST /api/v1/categories/:categoryId/subcategories/:subcategoryId/products
   * @desc Create a product
   * @access Vendor or Admin
   */
  router.post(
    '/:categoryId/subcategories/:subcategoryId/products',
    combinedAuthMiddleware,
    isAdminOrVendor,
    productController.createProduct.bind(productController)
  );

  /**
   * @route GET /api/v1/categories/:categoryId/subcategories/:subcategoryId/products/:id
   * @desc Get product by ID
   * @access Public
   */
  router.get(
    '/:categoryId/subcategories/:subcategoryId/products/:id',
    productController.getProductDetailById.bind(productController)
  );

  /**
   * @route GET /api/v1/categories/all/products
   * @desc Get all products with pagination
   * @access Public
   */
  router.get('/all/products', productController.getAllProducts.bind(productController));

  /**
   * @route PUT /api/v1/categories/:categoryId/subcategories/:subcategoryId/products/:id
   * @desc Update a product
   * @access Vendor (owner) or Admin
   */
  router.put(
    '/:categoryId/subcategories/:subcategoryId/products/:id',
    combinedAuthMiddleware,
    isAdminOrVendor,
    productController.updateProduct.bind(productController)
  );

  return router;
}
