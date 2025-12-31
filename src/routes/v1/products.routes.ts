import { Router } from 'express';
import { DataSource } from 'typeorm';
import { ProductService } from '../../service/product.service';
import { authenticateVendor } from '../../middlewares/auth/authenticate.middleware';
import { validateBody, validateQuery } from '../../middlewares/validation/validate.middleware';
import { createProductSchema, updateProductSchema } from '../../utils/validation/schemas/product.schemas';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { z } from 'zod';
import multer from 'multer';

/**
 * Product query schema for filtering and pagination
 */
const productQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
  categoryId: z.string().regex(/^\d+$/).transform(Number).optional(),
  subcategoryId: z.string().regex(/^\d+$/).transform(Number).optional(),
  minPrice: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
  maxPrice: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
  sortBy: z.enum(['price', 'name', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Product ID param schema
 */
const productIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

/**
 * Configure multer for file uploads
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

/**
 * Create product routes
 * 
 * @param dataSource - TypeORM DataSource for database access
 * @param productService - ProductService instance
 * @returns Express Router with product routes
 */
export function createProductRoutes(dataSource: DataSource, productService: ProductService): Router {
  const router = Router();
  
  /**
   * @route GET /api/v1/products
   * @desc Get all products with filtering and pagination
   * @access Public
   */
  router.get(
    '/',
    validateQuery(productQuerySchema),
    asyncHandler(async (req, res) => {
      const {
        page = 1,
        limit = 20,
        search,
        categoryId,
        subcategoryId,
        sort = 'all',
      } = req.query as any;
      
      const result = await productService.filterProducts({
        page,
        limit,
        search,
        categoryId,
        subcategoryId,
        sort,
      });
      
      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNextPage: page * limit < result.total,
          hasPreviousPage: page > 1,
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route GET /api/v1/products/:id
   * @desc Get product by ID
   * @access Public
   */
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = productIdSchema.parse(req.params);
      
      const product = await productService.getProductById(id, 0);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }
      
      res.status(200).json({
        success: true,
        data: product,
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route POST /api/v1/products
   * @desc Create new product
   * @access Vendor only
   */
  router.post(
    '/',
    authenticateVendor(dataSource),
    upload.array('images', 10),
    validateBody(createProductSchema),
    asyncHandler(async (req, res) => {
      const vendorId = (req as any).vendor?.id;
      
      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: 'Vendor authentication required',
        });
      }
      
      const { categoryId, subcategoryId, ...productData } = req.body;
      
      const product = await productService.createProduct(
        productData,
        categoryId,
        subcategoryId,
        vendorId
      );
      
      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully',
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route PUT /api/v1/products/:id
   * @desc Update product
   * @access Vendor only (own products)
   */
  router.put(
    '/:id',
    authenticateVendor(dataSource),
    validateBody(updateProductSchema),
    asyncHandler(async (req, res) => {
      const { id } = productIdSchema.parse(req.params);
      const vendorId = (req as any).vendor?.id;
      
      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: 'Vendor authentication required',
        });
      }
      
      const { categoryId, subcategoryId, ...productData } = req.body;
      const isAdmin = false; // Vendor route, not admin
      
      const product = await productService.updateProduct(
        vendorId,
        isAdmin,
        id,
        productData,
        categoryId,
        subcategoryId
      );
      
      res.status(200).json({
        success: true,
        data: product,
        message: 'Product updated successfully',
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route DELETE /api/v1/products/:id
   * @desc Delete product
   * @access Vendor only (own products)
   */
  router.delete(
    '/:id',
    authenticateVendor(dataSource),
    asyncHandler(async (req, res) => {
      const { id } = productIdSchema.parse(req.params);
      const vendorId = (req as any).vendor?.id;
      
      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: 'Vendor authentication required',
        });
      }
      
      await productService.deleteProduct(id, 0, vendorId);
      
      res.status(204).send();
    })
  );
  
  return router;
}
