import { Request, Response } from 'express';
import { AuthRequest, CombinedAuthRequest, VendorAuthRequest } from '../middlewares/auth.middleware';
import { ProductInterface, ProductUpdateType } from '../utils/zod_validations/product.zod';
import { ProductService } from '../service/product.service';
import { APIError } from '../utils/ApiError.utils';
import { IAdminProductQueryParams, IProductQueryParams } from '../interface/product.interface';
import { DataSource } from 'typeorm';
import { ReviewService } from '../service/review.service';
import config from '../config/env.config';
import { string } from 'zod';
import { ImageUploadService } from '../services/image/ImageUploadService';
import logger from '../config/logger.config';
import { PaginationHelper } from '../utils/helpers/PaginationHelper';
import { ResponseBuilder } from '../utils/helpers/ResponseBuilder';


/**
 * @class ProductController
 * @description Handles product-related operations for public users, vendors, and admins.
 * Requirements: 16.5, 19.1, 19.7, 19.8
 */
export class ProductController {
    private productService: ProductService;
    private reviewService: ReviewService;
    private imageUploadService: ImageUploadService;
    
    /**
     * @constructor
     * @description Instantiates ProductService and ImageUploadService for business logic related to products.
     */
    constructor(dataSource: DataSource) {
        this.productService = new ProductService(dataSource);
        this.reviewService = new ReviewService();
        this.imageUploadService = new ImageUploadService();
    }

    /**
     * @method getProductDetailById
     * @route GET /products/:id
     * @description Retrieves detailed information for a specific product by its ID.
     * @param {Request<{ id: string }>} req - Express request with product ID in URL params.
     * @param {Response} res - Express response object.
     * @returns {Promise<void>} Responds with product details JSON or error.
     * @access Public
     */
    async getProductDetailById(req: Request<{ id: string }, {}, {}>, res: Response) {
        try {
            // Parse product ID from route parameters
            const productId = parseInt(req.params.id);

            // Fetch product details from service layer
            const product = await this.productService.getProductDetailsById(productId);

            const averageRating = await this.reviewService.getReviewsByProductId(productId);

            // Send success response with product data
            res.status(200).json({
                success: true,
                product: product,
                avgRating: averageRating
            })

        } catch (error) {
            // Handle API errors with specific status codes
            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                // Handle unexpected errors with generic 500 response
                res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    }





    async createProduct(
        req: VendorAuthRequest<{ subcategoryId: string; categoryId: string }, {}, ProductInterface, {}>,
        res: Response
    ): Promise<void> {
        try {
            console.log('BODY:', req.body);
            console.log('HEADERS:', req.headers['content-type']);

            const data: ProductInterface = req.body;
            const categoryId = Number(req.params.categoryId);
            const subcategoryId = Number(req.params.subcategoryId);

            console.log(data)

            if (data.hasVariants === 'true' && (!data.variants || !Array.isArray(data.variants))) {
                throw new APIError(400, 'Variants array is required for variant products');
            }

            const savedProduct = await this.productService.createProduct(
                data,
                categoryId,
                subcategoryId,
                Number(req.vendor.id)
            );

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: savedProduct
            });
        } catch (error) {
            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                console.error('createProduct error:', error);
                res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
        }
    }


    async updateProduct(
        req: VendorAuthRequest<{ id: string; categoryId: string; subcategoryId: string }, {}, Partial<ProductInterface>, {}>,
        res: Response
    ): Promise<void> {
        try {
            const data: Partial<ProductInterface> = req.body;
            const productId = req.params.id;
            const categoryId = Number(req.params.categoryId);
            const subcategoryId = Number(req.params.subcategoryId);

            console.log("___________Product id _____________________")
            console.log(data)
            console.log(productId)

            const vendorId = await this.productService.getVendorIdByProductId(Number(productId));

            const updatedProduct = await this.productService.updateProduct(
                req.vendor ? req.vendor.id : vendorId,
                req.vendor ? false : true,  // admin flag
                Number(productId),
                data,
                categoryId,
                subcategoryId
            );

            res.status(200).json({
                success: true,
                message: 'Product updated successfully',
                data: updatedProduct
            });
        } catch (error) {
            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                console.error('updateProduct error:', error);
                res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
        }
    }




    async returnProuctRatings(products: any) {
        const productsWithRatings = await Promise.all(
            products.map(async (product) => {
                const avgRating = await this.reviewService.getAverageRating(product.id);
                return {
                    ...product,
                    avgRating: avgRating.avg,
                    count: avgRating.count
                };
            })
        );

        return productsWithRatings
    }


    async getAllProducts(req: Request, res: Response) {
        try {
            console.log("Query params:", req.query);

            // Parse pagination parameters using PaginationHelper
            const paginationParams = PaginationHelper.parsePaginationParams(req.query);
            
            const { page, limit, sortBy, sortOrder } = paginationParams;
            const { ...filters } = req.query;

            const queryParams: IProductQueryParams = {
                ...filters,
                page,
                limit,
            };

            const result = await this.productService.filterProducts(queryParams);

            const productWithRatings = await this.returnProuctRatings(result.data);

            // Build paginated response using PaginationHelper
            const paginatedResponse = PaginationHelper.buildResponse(
                productWithRatings,
                result.total,
                paginationParams
            );

            // Use ResponseBuilder for consistent response format
            const requestId = (req as any).requestId;
            const response = ResponseBuilder.paginated(
                paginatedResponse.data,
                paginatedResponse.meta.page,
                paginatedResponse.meta.limit,
                paginatedResponse.meta.total,
                {
                    requestId,
                    timestamp: new Date().toISOString(),
                }
            );

            return res.status(200).json(response);
        } catch (error) {
            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                console.error("getProducts error:", error);
                res.status(500).json({ success: false, message: "Internal Server Error" });
            }
        }
    }


    async getProductById(req: Request<{ id: string, subcategoryId: string }>, res: Response) {
        try {
            // Extract IDs from route parameters
            const { id, subcategoryId } = req.params;

            // Fetch product by ID and subcategory
            const product = await this.productService.getProductById(Number(id), Number(subcategoryId));

            const productWithRating = await this.returnProuctRatings(product);

            // Return 404 if product doesn't exist
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }

            res.status(200).json({
                success: true,
                data: productWithRating,
            });
        } catch (error) {
            // Handle API errors with specific status codes
            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                // Log unexpected errors for debugging
                console.error('getProductById error:', error);
                res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
        }
    }



    async getProductsByVendorId(
        req: Request<{ vendorId: string }, {}, {}, { page: string, limit: string, search?: string, sort?: string }>,
        res: Response
    ) {
        try {
            // Extract vendor ID from route parameters
            const { vendorId } = req.params;
            const { search, sort } = req.query;

            // Parse pagination parameters using PaginationHelper
            const paginationParams = PaginationHelper.parsePaginationParams(req.query);

            // Fetch paginated products for specific vendor with search and sort
            const { products, total } = await this.productService.getProductsByVendorId(
                Number(vendorId),
                paginationParams.page,
                paginationParams.limit,
                search,
                sort
            );

            const product = await this.returnProuctRatings(products);

            // Build paginated response
            const paginatedResponse = PaginationHelper.buildResponse(
                product,
                total,
                paginationParams
            );

            // Use ResponseBuilder for consistent response format
            const requestId = (req as any).requestId;
            const response = ResponseBuilder.paginated(
                paginatedResponse.data,
                paginatedResponse.meta.page,
                paginatedResponse.meta.limit,
                paginatedResponse.meta.total,
                {
                    requestId,
                    timestamp: new Date().toISOString(),
                }
            );

            res.status(200).json(response);
        } catch (error) {
            // Handle API errors with specific status codes
            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                // Log unexpected errors for debugging
                console.error('getProductsByVendorId error:', error);
                res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
        }
    }




    async deleteProduct(req: AuthRequest<{ id: string, subcategoryId: string }>, res: Response) {
        try {
            // Extract product and subcategory IDs from route parameters
            const { id, subcategoryId } = req.params;

            // Delete product with user authorization check
            await this.productService.deleteProduct(Number(id), Number(subcategoryId), req.user!.id);

            // Return 204 No Content on successful deletion
            res.status(204).json({ success: true });
        } catch (error) {
            // Handle API errors with specific status codes
            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                // Log unexpected errors for debugging
                console.error('deleteProduct error:', error);
                res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
        }
    }



    /**
     * @method deleteProductImage
     * @route DELETE /products/:id/:subcategoryId/image
     * @description Deletes a specific image from a product, requires valid image URL and authorization.
     * @param {AuthRequest} req - Authenticated request containing product ID, subcategory ID, and image URL.
     * @param {Response} res - Response object.
     * @returns {Promise<void>} Responds with updated product or error.
     * @access Authenticated
     * Requirements: 19.7, 19.8
     */
    async deleteProductImage(req: CombinedAuthRequest<{ id: string, subcategoryId: string }, {}, { imageUrl: string }>, res: Response): Promise<void> {
        try {
            // Extract product and subcategory IDs from route parameters
            const { id, subcategoryId } = req.params;

            // Extract image URL from request body
            const { imageUrl } = req.body;

            // Validate that image URL is provided
            if (!imageUrl) {
                throw new APIError(400, "Image URL is required")
            }

            const userId = req.user?.id || req.vendor?.id;

            // Delete product image through service layer with authorization
            const product = await this.productService.deleteProductImage(
                Number(id),
                Number(subcategoryId),
                userId,
                imageUrl
            );

            // Return 404 if product or image not found
            if (!product) {
                throw new APIError(404, "Product or image not found")
            }

            // Delete image from Cloudinary using ImageUploadService
            try {
                const publicId = this.imageUploadService.extractPublicIdFromUrl(imageUrl);
                if (publicId) {
                    await this.imageUploadService.deleteImage(publicId);
                    logger.info('Product image deleted from Cloudinary', { publicId });
                }
            } catch (cloudinaryError) {
                // Log error but don't fail the request since DB is already updated
                logger.error('Failed to delete image from Cloudinary:', cloudinaryError);
            }

            res.status(200).json({ success: true, data: product });
        } catch (error) {
            // Handle API errors with specific status codes
            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                // Log unexpected errors for debugging
                logger.error('deleteProductImage error:', error);
                res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
        }
    }



    async deleteProductById(req: Request<{ id: string }>, res: Response) {
        try {
            console.log("[deleteProductById] Request params:", req.params);

            const id = Number(req.params.id);
            console.log("[deleteProductById] Parsed product ID:", id);

            if (isNaN(id)) {
                console.warn("[deleteProductById] Invalid product ID");
                return res.status(400).json({
                    success: false,
                    msg: "Invalid product ID"
                });
            }

            console.log("[deleteProductById] Calling productService.deleteProductById...");
            const deleteProduct = await this.productService.deleteProductById(id);
            console.log("[deleteProductById] deleteProduct result:", deleteProduct);

            res.status(200).json({
                success: true,
                msg: "Product deleted successfully"
            });
            console.log("[deleteProductById] Response sent successfully");
        } catch (error) {
            console.error("[deleteProductById] Error caught:", error);

            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, msg: error.message });
            } else {
                res.status(500).json({ success: false, msg: "Internal server error" });
            }
        }
    }


    /**
     * @method getAdminProducts
     * @route GET /admin/products
     * @description Fetches paginated products for admin dashboard with advanced filtering options.
     * @param {AuthRequest} req - Authenticated request with admin query filters.
     * @param {Response} res - Response object.
     * @returns {Promise<void>} Responds with filtered paginated products.
     * @access Admin and staff
     */
    async getAdminProducts(req: AuthRequest<{}, {}, {}, IAdminProductQueryParams>, res: Response) {
        try {
            console.log("----------------------Admin product api hit--------------------")
            console.log("----------Req params--------------")
            console.log(req.params);
            console.log(req.query)

            // Parse pagination parameters
            const paginationParams = PaginationHelper.parsePaginationParams(req.query);

            // Fetch paginated products with admin-specific filtering
            const { products, total } = await this.productService.getAdminProducts(req.query);

            // console.log(products)

            // Build paginated response
            const paginatedResponse = PaginationHelper.buildResponse(
                products,
                total,
                paginationParams
            );

            // Use ResponseBuilder for consistent response format
            const requestId = (req as any).requestId;
            const response = ResponseBuilder.paginated(
                paginatedResponse.data,
                paginatedResponse.meta.page,
                paginatedResponse.meta.limit,
                paginatedResponse.meta.total,
                {
                    requestId,
                    timestamp: new Date().toISOString(),
                }
            );

            res.status(200).json(response);
        } catch (error) {
            console.log(error)
            // Handle API errors with specific status codes
            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                console.log(error)
                // Handle unexpected errors with generic 500 response
                res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    }

    /**
     * @method uploadImage
     * @route POST /products/upload-images
     * @description Uploads product images with validation and optimization
     * @param {Request} req - Request with files
     * @param {Response} res - Response object
     * @returns {Promise<void>} Responds with uploaded image URLs
     * @access Vendor
     * Requirements: 16.5, 19.1, 19.7, 19.8
     */
    async uplaodImage(req: Request, res: Response) {
        const uploadedUrls: string[] = [];
        
        try {
            // Validate files exist
            if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
                throw new APIError(400, 'No files uploaded');
            }

            const files = req.files as Express.Multer.File[];

            // Log what we received from multer
            logger.debug('Files received from multer', { 
                count: files.length,
                files: files.map(f => ({ 
                    filename: f.originalname, 
                    mimetype: f.mimetype,
                    size: f.size,
                    fieldname: f.fieldname
                }))
            });

            // Validate file count (max 10)
            if (files.length > 10) {
                throw new APIError(400, `Too many files: ${files.length}. Maximum allowed: 10`);
            }

            // Validate each file (size, type)
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            const maxSize = 5 * 1024 * 1024; // 5MB

            for (const file of files) {
                logger.debug('Received file', { 
                    filename: file.originalname, 
                    mimetype: file.mimetype,
                    size: file.size 
                });

                if (!allowedTypes.includes(file.mimetype)) {
                    throw new APIError(
                        400,
                        `Invalid file type: ${file.mimetype}. Allowed types: jpeg, png, webp`
                    );
                }

                if (file.size > maxSize) {
                    throw new APIError(
                        400,
                        `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum 5MB`
                    );
                }
            }

            logger.info('Uploading product images', { count: files.length });

            // Upload images using ImageUploadService (max 3 concurrent)
            const urls = await this.imageUploadService.uploadMultipleImages(files, 'products', 3);
            uploadedUrls.push(...urls);

            logger.info('Product images uploaded successfully', { count: urls.length });

            res.status(200).json({ 
                success: true, 
                urls: urls,
                message: `${urls.length} image(s) uploaded successfully`
            });
        } catch (error) {
            // On error, delete already uploaded images
            if (uploadedUrls.length > 0) {
                logger.warn('Upload failed, cleaning up uploaded images', { count: uploadedUrls.length });
                
                for (const url of uploadedUrls) {
                    try {
                        const publicId = this.imageUploadService.extractPublicIdFromUrl(url);
                        if (publicId) {
                            await this.imageUploadService.deleteImage(publicId);
                        }
                    } catch (cleanupError) {
                        logger.error('Failed to cleanup uploaded image:', cleanupError);
                    }
                }
            }

            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                logger.error('Image upload error:', error);
                res.status(500).json({ success: false, message: 'Image upload failed' });
            }
        }
    }

    /**
     * @method exportVendorProductsToExcel
     * @route GET /vendors/:vendorId/products/export
     * @description Exports all products for a specific vendor to Excel format
     * @param {Request<{ vendorId: string }>} req - Express request with vendor ID in URL params
     * @param {Response} res - Express response object
     * @returns {Promise<void>} Responds with Excel file download
     * @access Vendor/Admin
     */
    async exportVendorProductsToExcel(
        req: Request<{ vendorId: string }>,
        res: Response
    ) {
        try {
            const { vendorId } = req.params;
            
            // Get all products for the vendor (no pagination)
            const { products } = await this.productService.getProductsByVendorId(
                Number(vendorId),
                1,
                10000 // Large limit to get all products
            );

            // Generate Excel file
            const excelBuffer = await this.productService.generateProductsExcel(products);

            // Set response headers for file download
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=products_${vendorId}_${Date.now()}.xlsx`
            );
            res.setHeader('Content-Length', excelBuffer.length);

            // Send the Excel file
            res.send(excelBuffer);
        } catch (error) {
            if (error instanceof APIError) {
                res.status(error.status).json({ success: false, message: error.message });
            } else {
                console.error('exportVendorProductsToExcel error:', error);
                res.status(500).json({ success: false, message: 'Failed to export products' });
            }
        }
    }
}