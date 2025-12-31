import { Repository, EntityManager } from 'typeorm';
import AppDataSource from '../../config/db.config';
import { Order, PaymentStatus, OrderStatus } from '../../entities/order.entity';
import { APIError } from '../../utils/ApiError.utils';
import { OrderRepository } from '../../repositories/OrderRepository';
import { EsewaPaymentService } from './EsewaPaymentService';

/**
 * Payment orchestration service
 * Routes to appropriate payment service based on method
 */
export class PaymentService {
    private orderRepository: OrderRepository;
    private esewaPaymentService: EsewaPaymentService;

    constructor() {
        this.orderRepository = new OrderRepository(AppDataSource);
        this.esewaPaymentService = new EsewaPaymentService();
    }

    /**
     * Initiate payment for an order
     * Routes to appropriate payment service based on method
     */
    async initiatePayment(
        orderId: number,
        amount: number,
        method: string
    ): Promise<PaymentInitiation> {
        const order = await this.orderRepository.findById(orderId);
        if (!order) {
            throw new APIError(404, 'Order not found');
        }

        if (order.paymentStatus === PaymentStatus.PAID) {
            throw new APIError(400, 'Order is already paid');
        }

        // Route to appropriate payment service
        switch (method.toUpperCase()) {
            case 'ESEWA':
                return await this.esewaPaymentService.initiatePayment(order);
            
            case 'KHALTI':
                // TODO: Implement Khalti payment service
                throw new APIError(501, 'Khalti payment not yet implemented');
            
            case 'NPX':
                // TODO: Implement NPX payment service
                throw new APIError(501, 'NPX payment not yet implemented');
            
            default:
                throw new APIError(400, `Unsupported payment method: ${method}`);
        }
    }

    /**
     * Process payment callback
     * Verifies payment and updates order in transaction
     */
    async processPaymentCallback(
        token: string,
        orderId: number,
        method: string
    ): Promise<void> {
        await AppDataSource.transaction(async (manager) => {
            const order = await manager.findOne(Order, {
                where: { id: orderId },
                relations: ['orderItems', 'orderItems.product', 'orderItems.variant']
            });

            if (!order) {
                throw new APIError(404, 'Order not found');
            }

            if (order.paymentStatus === PaymentStatus.PAID) {
                // Already processed - idempotency check
                return;
            }

            // Verify payment based on method
            let verificationResult: PaymentVerification;
            switch (method.toUpperCase()) {
                case 'ESEWA':
                    verificationResult = await this.esewaPaymentService.verifyPayment(token, orderId);
                    break;
                
                case 'KHALTI':
                    throw new APIError(501, 'Khalti payment not yet implemented');
                
                default:
                    throw new APIError(400, `Unsupported payment method: ${method}`);
            }

            // Update order status based on verification
            if (verificationResult.success) {
                order.status = OrderStatus.CONFIRMED;
                order.paymentStatus = PaymentStatus.PAID;
                order.mTransactionId = verificationResult.transactionId;
                await manager.save(Order, order);
            } else {
                order.status = OrderStatus.CANCELLED;
                order.paymentStatus = PaymentStatus.UNPAID;
                await manager.save(Order, order);
                throw new APIError(400, 'Payment verification failed');
            }
        });
    }

    /**
     * Process refund for an order
     * TODO: Implement refund logic
     */
    async processRefund(
        orderId: number,
        amount: number,
        reason: string
    ): Promise<Refund> {
        const order = await this.orderRepository.findById(orderId);
        if (!order) {
            throw new APIError(404, 'Order not found');
        }

        if (order.paymentStatus !== PaymentStatus.PAID) {
            throw new APIError(400, 'Cannot refund unpaid order');
        }

        // TODO: Implement refund logic based on payment method
        throw new APIError(501, 'Refund functionality not yet implemented');
    }

    /**
     * Get payment status for an order
     */
    async getPaymentStatus(orderId: number): Promise<PaymentStatusResponse> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            select: ['id', 'paymentStatus', 'paymentMethod', 'totalPrice', 'mTransactionId']
        });

        if (!order) {
            throw new APIError(404, 'Order not found');
        }

        return {
            orderId: order.id,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            amount: order.totalPrice,
            transactionId: order.mTransactionId
        };
    }
}

/**
 * Payment initiation response
 */
export interface PaymentInitiation {
    url: string;
    transactionId?: string;
}

/**
 * Payment verification result
 */
export interface PaymentVerification {
    success: boolean;
    transactionId: string;
    amount?: number;
    message?: string;
}

/**
 * Refund response
 */
export interface Refund {
    refundId: string;
    orderId: number;
    amount: number;
    status: string;
    processedAt: Date;
}

/**
 * Payment status response
 */
export interface PaymentStatusResponse {
    orderId: number;
    paymentStatus: PaymentStatus;
    paymentMethod: string;
    amount: number;
    transactionId?: string;
}
