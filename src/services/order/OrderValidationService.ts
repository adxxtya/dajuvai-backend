import { EntityManager } from 'typeorm';
import AppDataSource from '../../config/db.config';
import { Product } from '../../entities/product.entity';
import { Variant } from '../../entities/variant.entity';
import { APIError } from '../../utils/ApiError.utils';
import { IShippingAddressRequest } from '../../interface/order.interface';

/**
 * Order validation service
 * Handles validation logic for orders including stock availability and shipping address
 */
export class OrderValidationService {
    /**
     * Validate stock availability with pessimistic locking
     * Uses FOR UPDATE lock to prevent race conditions
     */
    async validateStockAvailability(
        items: any[],
        manager?: EntityManager
    ): Promise<void> {
        const em = manager || AppDataSource.manager;

        for (const item of items) {
            if (item.variant) {
                // Lock variant row for update
                const variant = await em
                    .createQueryBuilder(Variant, 'variant')
                    .where('variant.id = :id', { id: item.variant.id })
                    .setLock('pessimistic_write')
                    .getOne();

                if (!variant) {
                    throw new APIError(404, `Variant not found for product: ${item.product.name}`);
                }

                if (variant.stock < item.quantity) {
                    throw new APIError(
                        400,
                        `Insufficient stock for variant "${variant.sku || 'N/A'}" of product "${item.product.name}". ` +
                        `Available: ${variant.stock}, Requested: ${item.quantity}`
                    );
                }
            } else {
                // Lock product row for update
                const product = await em
                    .createQueryBuilder(Product, 'product')
                    .where('product.id = :id', { id: item.product.id })
                    .setLock('pessimistic_write')
                    .getOne();

                if (!product) {
                    throw new APIError(404, `Product not found for cart item`);
                }

                if (!product.stock || product.stock < item.quantity) {
                    throw new APIError(
                        400,
                        `Insufficient stock for product "${product.name}". ` +
                        `Available: ${product.stock || 0}, Requested: ${item.quantity}`
                    );
                }
            }
        }
    }

    /**
     * Validate order items
     * Ensures all items have valid products and quantities
     */
    validateOrderItems(items: any[]): void {
        if (!items || items.length === 0) {
            throw new APIError(400, 'Order must contain at least one item');
        }

        for (const item of items) {
            if (!item.product || !item.product.id) {
                throw new APIError(400, 'Invalid product in order items');
            }

            if (!item.quantity || item.quantity <= 0) {
                throw new APIError(400, 'Item quantity must be greater than zero');
            }

            if (item.quantity > 1000) {
                throw new APIError(400, 'Item quantity exceeds maximum allowed (1000)');
            }
        }
    }

    /**
     * Validate shipping address
     * Ensures all required fields are present and valid
     */
    validateShippingAddress(address: IShippingAddressRequest): void {
        if (!address) {
            throw new APIError(400, 'Shipping address is required');
        }

        const requiredFields = ['province', 'district', 'city', 'streetAddress'];
        const missingFields = requiredFields.filter(field => !address[field]);

        if (missingFields.length > 0) {
            throw new APIError(
                400,
                `Missing required address fields: ${missingFields.join(', ')}`
            );
        }

        // Validate field lengths
        if (address.province && address.province.length > 100) {
            throw new APIError(400, 'Province name is too long (max 100 characters)');
        }

        if (address.district && address.district.length > 100) {
            throw new APIError(400, 'District name is too long (max 100 characters)');
        }

        if (address.city && address.city.length > 100) {
            throw new APIError(400, 'City name is too long (max 100 characters)');
        }

        if (address.streetAddress && address.streetAddress.length > 255) {
            throw new APIError(400, 'Street address is too long (max 255 characters)');
        }

        if (address.landmark && address.landmark.length > 255) {
            throw new APIError(400, 'Landmark is too long (max 255 characters)');
        }
    }

    /**
     * Validate payment method
     */
    validatePaymentMethod(paymentMethod: string): void {
        const validMethods = ['CASH_ON_DELIVERY', 'ONLINE_PAYMENT', 'ESEWA', 'KHALTI', 'NPX'];
        
        if (!paymentMethod) {
            throw new APIError(400, 'Payment method is required');
        }

        if (!validMethods.includes(paymentMethod)) {
            throw new APIError(400, `Invalid payment method. Must be one of: ${validMethods.join(', ')}`);
        }
    }

    /**
     * Validate promo code
     */
    async validatePromoCode(promoCode: string, userId: number): Promise<boolean> {
        // This would integrate with PromoService
        // For now, just basic validation
        if (promoCode && promoCode.length > 50) {
            throw new APIError(400, 'Promo code is too long (max 50 characters)');
        }

        return true;
    }
}
