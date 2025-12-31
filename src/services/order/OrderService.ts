import { Repository, EntityManager } from 'typeorm';
import AppDataSource from '../../config/db.config';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../../entities/order.entity';
import { OrderItem } from '../../entities/orderItems.entity';
import { Address } from '../../entities/address.entity';
import { User } from '../../entities/user.entity';
import { Cart } from '../../entities/cart.entity';
import { Product } from '../../entities/product.entity';
import { Variant } from '../../entities/variant.entity';
import { APIError } from '../../utils/ApiError.utils';
import { OrderRepository } from '../../repositories/OrderRepository';
import { ProductRepository } from '../../repositories/ProductRepository';
import { IOrderCreateRequest, IShippingAddressRequest } from '../../interface/order.interface';
import { DiscountType, InventoryStatus } from '../../entities/product.enum';
import { PromoService } from '../../service/promo.service';
import { PromoType } from '../../entities/promo.entity';
import { In } from 'typeorm';

/**
 * Core order service handling order creation, updates, and cancellation
 * Focuses on order lifecycle management with transaction support
 */
export class OrderService {
    private orderRepository: OrderRepository;
    private productRepository: ProductRepository;
    private cartRepository: Repository<Cart>;
    private addressRepository: Repository<Address>;
    private userRepository: Repository<User>;
    private orderItemRepository: Repository<OrderItem>;
    private variantRepository: Repository<Variant>;
    private promoService: PromoService;

    constructor() {
        this.orderRepository = new OrderRepository(AppDataSource);
        this.productRepository = new ProductRepository(AppDataSource);
        this.cartRepository = AppDataSource.getRepository(Cart);
        this.addressRepository = AppDataSource.getRepository(Address);
        this.userRepository = AppDataSource.getRepository(User);
        this.orderItemRepository = AppDataSource.getRepository(OrderItem);
        this.variantRepository = AppDataSource.getRepository(Variant);
        this.promoService = new PromoService();
    }

    /**
     * Create a new order with transaction support
     * Validates stock, reserves stock, creates order, clears cart
     */
    async createOrder(
        userId: number,
        orderData: IOrderCreateRequest
    ): Promise<{ order: Order; vendorIds: number[] }> {
        return await AppDataSource.transaction(async (manager) => {
            const { shippingAddress, paymentMethod, isBuyNow, productId, variantId, quantity } = orderData;

            // Get user
            const user = await manager.findOne(User, {
                where: { id: userId },
                relations: ['address']
            });
            if (!user) throw new APIError(404, 'User not found');

            // Get items (either from cart or buy now)
            let items: any[];
            if (isBuyNow) {
                const product = await manager.findOne(Product, {
                    where: { id: productId },
                    relations: ['vendor', 'vendor.district', 'variants']
                });
                if (!product) throw new APIError(404, 'Product not found');

                let variant = null;
                if (variantId) {
                    variant = await manager.findOne(Variant, { where: { id: variantId } });
                    if (!variant) throw new APIError(404, 'Variant not found');
                }

                items = [{ product, variant, quantity }];
            } else {
                const cart = await manager.findOne(Cart, {
                    where: { userId },
                    relations: ['items', 'items.product', 'items.product.vendor', 'items.product.vendor.district', 'items.variant']
                });
                if (!cart || !cart.items.length) throw new APIError(400, 'Cart is empty');
                items = cart.items;
            }

            // Validate stock availability
            await this.validateStockInTransaction(items, manager);

            // Get or create address
            const address = await this.getOrCreateAddress(userId, shippingAddress, user, manager);

            // Calculate shipping fee
            const shippingFee = await this.calculateShippingFee(address, items);

            // Create order entity
            const order = await this.createOrderEntity(
                userId,
                isBuyNow,
                user,
                items,
                address,
                shippingFee.shippingFee,
                orderData,
                manager
            );

            // Save order
            const savedOrder = await manager.save(Order, order);

            // For COD, update stock immediately
            if (paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
                const fullOrder = await manager.findOne(Order, {
                    where: { id: savedOrder.id },
                    relations: ['orderItems', 'orderItems.product', 'orderItems.variant']
                });
                await this.updateStockInTransaction(fullOrder.orderItems, manager);

                // Clear cart if not buy now
                if (!isBuyNow) {
                    await this.clearCartInTransaction(userId, manager);
                }
            }

            return {
                order: savedOrder,
                vendorIds: shippingFee.vendorIds
            };
        });
    }

    /**
     * Cancel an order and restore stock
     * Updates status and restores stock in transaction
     */
    async cancelOrder(orderId: number, userId: number): Promise<Order> {
        return await AppDataSource.transaction(async (manager) => {
            const order = await manager.findOne(Order, {
                where: { id: orderId, orderedById: userId },
                relations: ['orderItems', 'orderItems.product', 'orderItems.variant']
            });

            if (!order) throw new APIError(404, 'Order not found');

            if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
                throw new APIError(400, 'Cannot cancel order in current status');
            }

            // Update order status
            order.status = OrderStatus.CANCELLED;
            await manager.save(Order, order);

            // Restore stock
            await this.restoreStockInTransaction(order.orderItems, manager);

            return order;
        });
    }

    /**
     * Update order status (for vendors/admins)
     */
    async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
        const order = await this.orderRepository.findById(orderId);
        if (!order) throw new APIError(404, 'Order not found');

        order.status = status;
        return await this.orderRepository.save(order);
    }

    /**
     * Get order by ID with full relations
     */
    async getOrderById(orderId: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: [
                'orderedBy',
                'shippingAddress',
                'orderItems',
                'orderItems.product',
                'orderItems.vendor',
                'orderItems.variant'
            ]
        });

        if (!order) throw new APIError(404, 'Order not found');
        return order;
    }

    /**
     * Get user orders with pagination
     */
    async getUserOrders(userId: number, page: number = 1, limit: number = 20): Promise<{ orders: Order[]; total: number }> {
        const skip = (page - 1) * limit;
        const [orders, total] = await this.orderRepository.findAndCount({
            where: { orderedById: userId },
            relations: ['orderItems', 'orderItems.product', 'orderItems.variant', 'shippingAddress'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit
        });

        return { orders, total };
    }

    /**
     * Validate stock availability in transaction
     */
    private async validateStockInTransaction(items: any[], manager: EntityManager): Promise<void> {
        for (const item of items) {
            if (item.variant) {
                const variant = await manager.findOne(Variant, { where: { id: item.variant.id } });
                if (!variant) {
                    throw new APIError(404, `Variant not found for product: ${item.product.name}`);
                }
                if (variant.stock < item.quantity) {
                    throw new APIError(400, `Insufficient stock for variant. Available: ${variant.stock}, Requested: ${item.quantity}`);
                }
            } else {
                const product = await manager.findOne(Product, { where: { id: item.product.id } });
                if (!product) {
                    throw new APIError(404, `Product not found`);
                }
                if (!product.stock || product.stock < item.quantity) {
                    throw new APIError(400, `Insufficient stock for product "${product.name}". Available: ${product.stock || 0}, Requested: ${item.quantity}`);
                }
            }
        }
    }

    /**
     * Update stock in transaction (decrement)
     */
    private async updateStockInTransaction(orderItems: OrderItem[], manager: EntityManager): Promise<void> {
        for (const item of orderItems) {
            if (item.variantId) {
                const variant = await manager.findOne(Variant, {
                    where: { id: item.variantId },
                    relations: ['product']
                });
                if (!variant) throw new APIError(404, `Variant not found`);

                variant.stock -= item.quantity;
                variant.status = variant.stock <= 0 ? InventoryStatus.OUT_OF_STOCK :
                    variant.stock < 5 ? InventoryStatus.LOW_STOCK : InventoryStatus.AVAILABLE;
                await manager.save(Variant, variant);
            } else {
                const product = await manager.findOne(Product, { where: { id: item.productId } });
                if (!product) throw new APIError(404, `Product not found`);

                product.stock -= item.quantity;
                product.status = product.stock <= 0 ? InventoryStatus.OUT_OF_STOCK :
                    product.stock < 5 ? InventoryStatus.LOW_STOCK : InventoryStatus.AVAILABLE;
                await manager.save(Product, product);
            }
        }
    }

    /**
     * Restore stock in transaction (increment)
     */
    private async restoreStockInTransaction(orderItems: OrderItem[], manager: EntityManager): Promise<void> {
        for (const item of orderItems) {
            if (item.variantId) {
                const variant = await manager.findOne(Variant, { where: { id: item.variantId } });
                if (!variant) throw new APIError(404, `Variant not found`);

                variant.stock += item.quantity;
                variant.status = variant.stock <= 0 ? InventoryStatus.OUT_OF_STOCK :
                    variant.stock < 5 ? InventoryStatus.LOW_STOCK : InventoryStatus.AVAILABLE;
                await manager.save(Variant, variant);
            } else {
                const product = await manager.findOne(Product, { where: { id: item.productId } });
                if (!product) throw new APIError(404, `Product not found`);

                product.stock += item.quantity;
                product.status = product.stock <= 0 ? InventoryStatus.OUT_OF_STOCK :
                    product.stock < 5 ? InventoryStatus.LOW_STOCK : InventoryStatus.AVAILABLE;
                await manager.save(Product, product);
            }
        }
    }

    /**
     * Clear cart in transaction
     */
    private async clearCartInTransaction(userId: number, manager: EntityManager): Promise<void> {
        const cart = await manager.findOne(Cart, {
            where: { userId },
            relations: ['items']
        });
        if (cart && cart.items.length > 0) {
            await manager.delete('CartItem', cart.items.map(item => item.id));
            cart.total = 0;
            cart.items = [];
            await manager.save(Cart, cart);
        }
    }

    /**
     * Get or create address
     */
    private async getOrCreateAddress(
        userId: number,
        shippingAddress: IShippingAddressRequest,
        user: User,
        manager: EntityManager
    ): Promise<Address> {
        let address = await manager.findOne(Address, { where: { userId } });

        if (address) {
            if (
                address.province !== shippingAddress.province ||
                address.district !== shippingAddress.district ||
                address.city !== shippingAddress.city ||
                address.localAddress !== shippingAddress.streetAddress ||
                address.landmark !== shippingAddress.landmark
            ) {
                address.province = shippingAddress.province;
                address.district = shippingAddress.district;
                address.city = shippingAddress.city;
                address.localAddress = shippingAddress.streetAddress;
                address.landmark = shippingAddress.landmark;
                return await manager.save(Address, address);
            }
            return address;
        }

        const newAddress = manager.create(Address, {
            province: shippingAddress.province,
            district: shippingAddress.district,
            city: shippingAddress.city,
            localAddress: shippingAddress.streetAddress,
            landmark: shippingAddress.landmark,
            userId
        });

        return await manager.save(Address, newAddress);
    }

    /**
     * Create order entity
     */
    private async createOrderEntity(
        userId: number,
        isBuyNow: boolean,
        user: User,
        items: any[],
        address: Address,
        shippingFee: number,
        orderData: IOrderCreateRequest,
        manager: EntityManager
    ): Promise<Order> {
        const orderItems = this.createOrderItems(items);

        const subtotal = items.reduce((sum, item) => {
            let basePrice = 0;
            if (item.variant) {
                basePrice = item.variant.basePrice;
            } else {
                if (item.product?.discount && item.product?.discount > 0) {
                    if (item.product?.discountType === DiscountType.PERCENTAGE) {
                        basePrice = item.product.basePrice - (item.product.basePrice * (item.product.discount / 100));
                    } else {
                        basePrice = item.product.basePrice - item.product.discount;
                    }
                } else {
                    basePrice = item.product.basePrice;
                }
            }
            return sum + (basePrice * item.quantity);
        }, 0);

        // Apply promo code if provided
        let discountAmount = 0;
        let appliedPromoCode: string | null = null;

        if (orderData.promoCode) {
            const promo = await this.promoService.findPromoByCode(orderData.promoCode);
            const pastOrderTransaction = await manager.find(Order, {
                where: {
                    appliedPromoCode: orderData.promoCode,
                    orderedById: userId,
                    status: In([OrderStatus.DELIVERED, OrderStatus.CONFIRMED])
                }
            });

            if (promo && promo.isValid && pastOrderTransaction.length === 0) {
                if (promo.applyOn === PromoType.LINE_TOTAL) {
                    discountAmount = (subtotal * promo.discountPercentage) / 100;
                } else {
                    discountAmount = (shippingFee * promo.discountPercentage) / 100;
                }
                appliedPromoCode = promo.promoCode;
            }
        }

        const totalPrice = subtotal - discountAmount + shippingFee;

        return manager.create(Order, {
            orderedById: userId,
            orderedBy: user,
            totalPrice,
            shippingFee,
            serviceCharge: orderData.serviceCharge || 0,
            instrumentName: orderData.instrumentName || null,
            paymentStatus: PaymentStatus.UNPAID,
            paymentMethod: orderData.paymentMethod,
            appliedPromoCode,
            status: orderData.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
                ? OrderStatus.CONFIRMED
                : OrderStatus.PENDING,
            shippingAddress: address,
            orderItems,
            isBuyNow: Boolean(isBuyNow),
            phoneNumber: orderData.phoneNumber
        });
    }

    /**
     * Create order items from cart items
     */
    private createOrderItems(items: any[]): OrderItem[] {
        return items.map(item => {
            let price;
            if (item.variant) {
                price = item.variant.basePrice;
            } else {
                if (item.product?.discount && item.product?.discount > 0) {
                    if (item.product?.discountType === DiscountType.PERCENTAGE) {
                        price = item.product.basePrice - (item.product.basePrice * (item.product.discount / 100));
                    } else {
                        price = item.product.basePrice - item.product.discount;
                    }
                } else {
                    price = item.product.basePrice;
                }
            }
            return this.orderItemRepository.create({
                productId: item.product.id,
                quantity: item.quantity,
                price,
                vendorId: item.product.vendorId,
                variantId: item.variant ? item.variant.id : null
            });
        });
    }

    /**
     * Calculate shipping fee based on vendor districts
     */
    private async calculateShippingFee(
        shippingAddress: Address,
        items: any[]
    ): Promise<{ shippingFee: number; vendorIds: number[] }> {
        if (!shippingAddress) {
            throw new APIError(400, 'Shipping address is missing');
        }

        const vendorDistrictSet = new Set<string>();
        const vendorIdsSet = new Set<number>();

        for (const item of items) {
            const vendor = item.product?.vendor;
            if (!vendor || !vendor.district || !vendor.district.name) {
                throw new APIError(400, `Vendor for product ${item.product.id} has no valid address`);
            }
            vendorDistrictSet.add(vendor.district.name);
            vendorIdsSet.add(vendor.id);
        }

        const userDistrict = shippingAddress.district;
        const sameDistrictGroup = ['Kathmandu', 'Bhaktapur', 'Lalitpur'];

        let shippingFee = 0;
        for (const vendorDistrict of vendorDistrictSet) {
            const isSameCity =
                userDistrict === vendorDistrict ||
                (sameDistrictGroup.includes(userDistrict) && sameDistrictGroup.includes(vendorDistrict));
            shippingFee += isSameCity ? 100 : 200;
        }

        return {
            shippingFee,
            vendorIds: Array.from(vendorIdsSet)
        };
    }
}
