import { DataSource } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Variant } from '../../entities/variant.entity';
import { APIError } from '../../utils/ApiError.utils';
import { ProductRepository } from '../../repositories/ProductRepository';
import { CacheService } from '../cache/CacheService';
import { ImageUploadService } from '../../service/image.upload.service';
import { InventoryStatus, DiscountType } from '../../entities/product.enum';

/**
 * Refactored Product Service using repository pattern
 * Handles product operations with caching and optimistic locking
 */
export class ProductService {
    private productRepository: ProductRepository;
    private cacheService: CacheService;
    private imageUploadService: ImageUploadService;

    constructor(private dataSource: DataSource) {
        this.productRepository = new ProductRepository(dataSource);
        this.cacheService = new CacheService();
        this.imageUploadService = new ImageUploadService();
    }

    /**
     * Get product by ID with cache-aside pattern
     * Checks cache first, then database, then caches result
     */
    async getProductById(id: number): Promise<Product> {
        const cacheKey = `product:${id}`;

        // Try cache first
        const cached = await this.cacheService.get<Product>(cacheKey);
        if (cached) {
            return cached;
        }

        // Cache miss - fetch from database
        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new APIError(404, 'Product not found');
        }

        // Cache for 1 hour
        await this.cacheService.set(cacheKey, product, 3600);

        return product;
    }

    /**
     * Filter products with efficient query building and pagination
     * Uses selective field loading and proper joins
     */
    async filterProducts(params: {
        page: number;
        limit: number;
        search?: string;
        categoryId?: number;
        subcategoryId?: number;
        brandId?: number;
        dealId?: number;
        bannerId?: number;
        sort?: string;
    }): Promise<{ data: Product[]; total: number; page: number; limit: number; totalPages: number }> {
        const { page, limit, search, categoryId, subcategoryId, brandId, dealId, bannerId, sort } = params;
        const skip = (page - 1) * limit;

        const qb = this.productRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.subcategory', 'subcategory')
            .leftJoinAndSelect('subcategory.category', 'category')
            .leftJoinAndSelect('product.brand', 'brand')
            .leftJoin('product.vendor', 'vendor')
            .addSelect([
                'vendor.id',
                'vendor.businessName',
                'vendor.districtId',
                'vendor.createdAt',
                'vendor.updatedAt'
            ])
            .leftJoinAndSelect('product.deal', 'deal')
            .leftJoinAndSelect('product.variants', 'variants')
            .where('(product.stock > 0 OR variants.stock > 0)');

        // Apply filters
        if (bannerId) {
            qb.andWhere('product.bannerId = :bannerId', { bannerId });
        }
        if (subcategoryId) {
            qb.andWhere('product.subcategoryId = :subcategoryId', { subcategoryId });
        } else if (categoryId) {
            qb.andWhere('subcategory.categoryId = :categoryId', { categoryId });
        }
        if (brandId) {
            qb.andWhere('product.brandId = :brandId', { brandId });
        }
        if (dealId) {
            qb.andWhere('product.dealId = :dealId', { dealId });
        }
        if (search) {
            const searchPattern = `%${search}%`;
            qb.andWhere('(LOWER(product.name) ILIKE :searchPattern)', { searchPattern });
        }

        // Group by
        qb.groupBy('product.id')
            .addGroupBy('subcategory.id')
            .addGroupBy('category.id')
            .addGroupBy('brand.id')
            .addGroupBy('vendor.id')
            .addGroupBy('deal.id')
            .addGroupBy('variants.id');

        // Apply sorting
        if (sort === 'low-to-high') {
            qb.addSelect(
                `LEAST(
                    "product"."basePrice" - CASE
                        WHEN "product"."discountType" = 'PERCENTAGE' THEN "product"."basePrice" * "product"."discount" / 100.0
                        ELSE "product"."discount"
                    END,
                    COALESCE(
                        MIN(
                            "variants"."basePrice" - CASE
                                WHEN "variants"."discountType" = 'PERCENTAGE' THEN "variants"."basePrice" * "variants"."discount" / 100.0
                                ELSE "variants"."discount"
                            END
                        ),
                        "product"."basePrice" - CASE
                            WHEN "product"."discountType" = 'PERCENTAGE' THEN "product"."basePrice" * "product"."discount" / 100.0
                            ELSE "product"."discount"
                        END
                    )
                )`,
                'price'
            ).orderBy('price', 'ASC');
        } else if (sort === 'high-to-low') {
            qb.addSelect(
                `GREATEST(
                    "product"."basePrice" - CASE
                        WHEN "product"."discountType" = 'PERCENTAGE' THEN "product"."basePrice" * "product"."discount" / 100.0
                        ELSE "product"."discount"
                    END,
                    COALESCE(
                        MAX(
                            "variants"."basePrice" - CASE
                                WHEN "variants"."discountType" = 'PERCENTAGE' THEN "variants"."basePrice" * "variants"."discount" / 100.0
                                ELSE "variants"."discount"
                            END
                        ),
                        "product"."basePrice" - CASE
                            WHEN "product"."discountType" = 'PERCENTAGE' THEN "product"."basePrice" * "product"."discount" / 100.0
                            ELSE "product"."discount"
                        END
                    )
                )`,
                'price'
            ).orderBy('price', 'DESC');
        } else {
            qb.orderBy('product.created_at', 'DESC');
        }

        // Pagination
        qb.skip(skip).take(limit);

        const [data, total] = await qb.getManyAndCount();

        return {
            data,
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        };
    }

    /**
     * Update product and invalidate cache
     */
    async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
        const product = await this.productRepository.update(id, data);

        // Invalidate cache
        await this.cacheService.del(`product:${id}`);
        await this.cacheService.invalidatePattern('products:list:*');

        return product;
    }

    /**
     * Delete product and invalidate cache
     */
    async deleteProduct(id: number): Promise<void> {
        await this.productRepository.delete(id);

        // Invalidate cache
        await this.cacheService.del(`product:${id}`);
        await this.cacheService.invalidatePattern('products:list:*');
    }

    /**
     * Decrement stock with optimistic locking and retry logic
     */
    async decrementStock(productId: number, quantity: number, variantId?: number, maxRetries: number = 3): Promise<void> {
        let attempt = 0;
        let lastError: Error;

        while (attempt < maxRetries) {
            try {
                await this.dataSource.transaction(async (manager) => {
                    if (variantId) {
                        // Decrement variant stock
                        const variant = await manager.findOne(Variant, {
                            where: { id: String(variantId) },
                            lock: { mode: 'optimistic', version: variantId }
                        });

                        if (!variant) {
                            throw new APIError(404, 'Variant not found');
                        }

                        if (variant.stock < quantity) {
                            throw new APIError(400, 'Insufficient stock');
                        }

                        variant.stock -= quantity;
                        variant.status = variant.stock <= 0 ? InventoryStatus.OUT_OF_STOCK :
                            variant.stock < 5 ? InventoryStatus.LOW_STOCK : InventoryStatus.AVAILABLE;

                        await manager.save(Variant, variant);
                    } else {
                        // Decrement product stock
                        const product = await manager.findOne(Product, {
                            where: { id: productId },
                            lock: { mode: 'optimistic', version: productId }
                        });

                        if (!product) {
                            throw new APIError(404, 'Product not found');
                        }

                        if (!product.stock || product.stock < quantity) {
                            throw new APIError(400, 'Insufficient stock');
                        }

                        product.stock -= quantity;
                        product.status = product.stock <= 0 ? InventoryStatus.OUT_OF_STOCK :
                            product.stock < 5 ? InventoryStatus.LOW_STOCK : InventoryStatus.AVAILABLE;

                        await manager.save(Product, product);
                    }
                });

                // Success - invalidate cache
                await this.cacheService.del(`product:${productId}`);
                return;

            } catch (error) {
                lastError = error;

                // Check if it's an optimistic lock error
                if (error.message && error.message.includes('version')) {
                    attempt++;
                    if (attempt < maxRetries) {
                        // Wait before retry (exponential backoff)
                        await this.sleep(Math.pow(2, attempt) * 100);
                        continue;
                    }
                }

                // Non-version error or max retries reached
                throw error;
            }
        }

        throw new APIError(409, 'Failed to update stock due to concurrent modifications');
    }

    /**
     * Increment stock for order cancellations
     */
    async incrementStock(productId: number, quantity: number, variantId?: number): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            if (variantId) {
                const variant = await manager.findOne(Variant, { where: { id: String(variantId) } });
                if (!variant) {
                    throw new APIError(404, 'Variant not found');
                }

                variant.stock += quantity;
                variant.status = variant.stock <= 0 ? InventoryStatus.OUT_OF_STOCK :
                    variant.stock < 5 ? InventoryStatus.LOW_STOCK : InventoryStatus.AVAILABLE;

                await manager.save(Variant, variant);
            } else {
                const product = await manager.findOne(Product, { where: { id: productId } });
                if (!product) {
                    throw new APIError(404, 'Product not found');
                }

                product.stock += quantity;
                product.status = product.stock <= 0 ? InventoryStatus.OUT_OF_STOCK :
                    product.stock < 5 ? InventoryStatus.LOW_STOCK : InventoryStatus.AVAILABLE;

                await manager.save(Product, product);
            }
        });

        // Invalidate cache
        await this.cacheService.del(`product:${productId}`);
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
