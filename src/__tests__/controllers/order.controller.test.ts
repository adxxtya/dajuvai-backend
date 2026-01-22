import { Request, Response } from 'express';
import { OrderController } from '../../controllers/order.controller';
import { OrderService } from '../../service/order.service';
import { APIError } from '../../utils/ApiError.utils';
import { Order, OrderStatus, PaymentStatus } from '../../entities/order.entity';

// Mock the OrderService
jest.mock('../../service/order.service');

describe('OrderController - Migrated Endpoints', () => {
    let orderController: OrderController;
    let mockOrderService: any;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
        // Create mock service
        mockOrderService = {
            getOrderById: jest.fn(),
            getOrderDetails: jest.fn(),
            updateOrderStatus: jest.fn(),
            searchOrdersById: jest.fn(),
            trackOrder: jest.fn(),
            getVendorOrders: jest.fn(),
            getVendorOrderDetails: jest.fn(),
            getOrderHistoryForCustomer: jest.fn(),
            getOrderDetailByMerchantTransactionId: jest.fn(),
            deleteOrder: jest.fn(),
            esewaSuccess: jest.fn(),
            esewaFailed: jest.fn(),
            checkAvailablePromocode: jest.fn(),
        };
        
        orderController = new OrderController();
        (orderController as any).orderService = mockOrderService;

        // Setup mock request and response
        mockRequest = {
            params: {},
            query: {},
            body: {},
            user: { id: 1, email: 'test@example.com' },
            vendor: { id: 5 },
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getOrderById', () => {
        it('should return order for valid ID', async () => {
            const mockOrder = {
                id: 1,
                totalPrice: 100,
                status: OrderStatus.PENDING,
                paymentStatus: PaymentStatus.UNPAID,
            } as Order;

            mockRequest.params = { id: '1' };
            mockOrderService.getOrderById.mockResolvedValue(mockOrder);

            await orderController.getOrderById(
                mockRequest as Request<{ id: string }>,
                mockResponse as Response
            );

            expect(mockOrderService.getOrderById).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockOrder,
            });
        });

        it('should throw 404 for invalid ID', async () => {
            mockRequest.params = { id: '999' };
            mockOrderService.getOrderById.mockResolvedValue(null);

            await expect(
                orderController.getOrderById(
                    mockRequest as Request<{ id: string }>,
                    mockResponse as Response
                )
            ).rejects.toThrow(APIError);
        });
    });

    describe('getOrderDetails', () => {
        it('should return order details for admin', async () => {
            const mockOrder = {
                id: 1,
                totalPrice: 100,
                status: OrderStatus.PENDING,
            } as Order;

            mockRequest.params = { orderId: '1' };
            mockOrderService.getOrderDetails.mockResolvedValue(mockOrder);

            await orderController.getOrderDetails(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.getOrderDetails).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockOrder,
            });
        });
    });

    describe('updateOrderStatus', () => {
        it('should update order status with valid transition', async () => {
            const mockOrder = {
                id: 1,
                status: OrderStatus.CONFIRMED,
            } as Order;

            mockRequest.params = { orderId: '1' };
            mockRequest.body = { status: OrderStatus.CONFIRMED };
            mockOrderService.updateOrderStatus.mockResolvedValue(mockOrder);

            await orderController.updateOrderStatus(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(
                1,
                OrderStatus.CONFIRMED
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should throw error for invalid status transition', async () => {
            mockRequest.params = { orderId: '1' };
            mockRequest.body = { status: 'INVALID_STATUS' };
            mockOrderService.updateOrderStatus.mockRejectedValue(
                new APIError(400, 'Invalid status transition')
            );

            await expect(
                orderController.updateOrderStatus(
                    mockRequest as any,
                    mockResponse as Response
                )
            ).rejects.toThrow(APIError);
        });
    });

    describe('searchOrdersById', () => {
        it('should search orders by ID', async () => {
            const mockOrder = {
                id: 123,
                totalPrice: 100,
            } as Order;

            mockRequest.query = { orderId: '123' };
            mockOrderService.searchOrdersById.mockResolvedValue(mockOrder);

            await orderController.searchOrdersById(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.searchOrdersById).toHaveBeenCalledWith(123);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('trackOrderById', () => {
        it('should track order by ID and email', async () => {
            const mockOrder = {
                id: 1,
                status: OrderStatus.SHIPPED,
            } as Order;

            mockRequest.query = { orderId: '1', email: 'test@example.com' };
            mockOrderService.trackOrder.mockResolvedValue(mockOrder);

            await orderController.trackOrderById(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.trackOrder).toHaveBeenCalledWith(
                'test@example.com',
                1
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getVendorOrders', () => {
        it('should return vendor orders with filtering', async () => {
            const mockOrders = [
                { id: 1, totalPrice: 100 },
                { id: 2, totalPrice: 200 },
            ] as Order[];

            mockOrderService.getVendorOrders.mockResolvedValue(mockOrders);

            await orderController.getVendorOrders(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.getVendorOrders).toHaveBeenCalledWith(5);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockOrders,
            });
        });
    });

    describe('getVendorOrderDetails', () => {
        it('should return vendor order details', async () => {
            const mockOrder = {
                id: 1,
                totalPrice: 100,
            } as Order;

            mockRequest.params = { orderId: '1' };
            mockOrderService.getVendorOrderDetails.mockResolvedValue(mockOrder);

            await orderController.getVendorOrderDetails(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.getVendorOrderDetails).toHaveBeenCalledWith(5, 1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getCustomerOrderHistory', () => {
        it('should return customer order history', async () => {
            const mockOrders = [
                { id: 1, totalPrice: 100 },
                { id: 2, totalPrice: 200 },
            ] as Order[];

            mockRequest.user = { id: 1 };
            mockOrderService.getOrderHistoryForCustomer.mockResolvedValue(mockOrders);

            await orderController.getCustomerOrderHistory(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.getOrderHistoryForCustomer).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getOrderDetailByMerchantTransactionId', () => {
        it('should return order by merchant transaction ID', async () => {
            const mockOrder = {
                id: 1,
                mTransactionId: 'TXN123',
            } as Order;

            mockRequest.body = { mTransactionId: 'TXN123' };
            mockOrderService.getOrderDetailByMerchantTransactionId.mockResolvedValue(mockOrder);

            await orderController.getOrderDetailByMerchantTransactionId(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.getOrderDetailByMerchantTransactionId).toHaveBeenCalledWith('TXN123');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('deleteOrder', () => {
        it('should delete all orders', async () => {
            mockOrderService.deleteOrder.mockResolvedValue(undefined);

            await orderController.deleteOrder(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.deleteOrder).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('esewaPaymentSuccess', () => {
        it('should handle eSewa payment success callback', async () => {
            const mockOrder = {
                id: 1,
                paymentStatus: PaymentStatus.PAID,
            } as Order;

            mockRequest.body = { token: 'esewa_token', orderId: 1 };
            mockOrderService.esewaSuccess.mockResolvedValue(mockOrder);

            await orderController.esewaPaymentSuccess(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.esewaSuccess).toHaveBeenCalledWith('esewa_token', 1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('esewaPaymentFailed', () => {
        it('should handle eSewa payment failure callback', async () => {
            mockRequest.body = { orderId: 1 };
            mockOrderService.esewaFailed.mockResolvedValue(undefined);

            await orderController.esewaPaymentFailed(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.esewaFailed).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('checkAvailablePromocode', () => {
        it('should validate promo code', async () => {
            const mockPromoResult = {
                valid: true,
                discount: 10,
            };

            mockRequest.body = { promoCode: 'SAVE10' };
            mockRequest.user = { id: 1 };
            mockOrderService.checkAvailablePromocode.mockResolvedValue(mockPromoResult);

            await orderController.checkAvailablePromocode(
                mockRequest as any,
                mockResponse as Response
            );

            expect(mockOrderService.checkAvailablePromocode).toHaveBeenCalledWith('SAVE10', 1);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should handle invalid promo code', async () => {
            mockRequest.body = { promoCode: 'INVALID' };
            mockRequest.user = { id: 1 };
            mockOrderService.checkAvailablePromocode.mockRejectedValue(
                new APIError(400, 'Invalid promo code')
            );

            await expect(
                orderController.checkAvailablePromocode(
                    mockRequest as any,
                    mockResponse as Response
                )
            ).rejects.toThrow(APIError);
        });
    });
});
