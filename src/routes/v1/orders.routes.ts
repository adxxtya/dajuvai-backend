import { Router } from 'express';
import { DataSource } from 'typeorm';
import { OrderService } from '../../services/order/OrderService';
import { Order } from '../../entities/order.entity';
import { authenticateUser, authenticateVendor } from '../../middlewares/auth/authenticate.middleware';
import { validateBody, validateQuery } from '../../middlewares/validation/validate.middleware';
import { createOrderSchema } from '../../utils/validation/schemas/order.schemas';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { z } from 'zod';

/**
 * Order query schema for filtering and pagination
 */
const orderQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'DELAYED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']).optional(),
  sortBy: z.enum(['createdAt', 'totalAmount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Order ID param schema
 */
const orderIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

/**
 * Update order status schema
 */
const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'DELAYED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']),
});

/**
 * Create order routes
 * 
 * @param dataSource - TypeORM DataSource for database access
 * @param orderService - OrderService instance (optional, will be created if not provided)
 * @returns Express Router with order routes
 */
export function createOrderRoutes(dataSource: DataSource, orderService?: OrderService): Router {
  const router = Router();
  
  // Create order service with dataSource if not provided
  const service = orderService || new OrderService(dataSource);
  
  /**
   * @route GET /api/v1/orders
   * @desc Get all orders for authenticated user
   * @access Authenticated
   */
  router.get(
    '/',
    authenticateUser(dataSource),
    validateQuery(orderQuerySchema),
    asyncHandler(async (req, res) => {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
      }
      
      const {
        page = 1,
        limit = 20,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query as any;
      
      const result = await service.getUserOrders(userId, page, limit);
      
      res.status(200).json({
        success: true,
        data: result.orders,
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
   * @route GET /api/v1/orders/:id
   * @desc Get order by ID
   * @access Authenticated
   */
  router.get(
    '/:id',
    authenticateUser(dataSource),
    asyncHandler(async (req, res) => {
      const { id } = orderIdSchema.parse(req.params);
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
      }
      
      const order = await service.getOrderById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
      
      res.status(200).json({
        success: true,
        data: order,
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route POST /api/v1/orders
   * @desc Create new order
   * @access Authenticated
   */
  router.post(
    '/',
    authenticateUser(dataSource),
    validateBody(createOrderSchema),
    asyncHandler(async (req, res) => {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
      }
      
      const order = await service.createOrder(userId, req.body);
      
      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully',
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route PATCH /api/v1/orders/:id/status
   * @desc Update order status
   * @access Vendor only
   */
  router.patch(
    '/:id/status',
    authenticateVendor(dataSource),
    validateBody(updateOrderStatusSchema),
    asyncHandler(async (req, res) => {
      const { id } = orderIdSchema.parse(req.params);
      const vendorId = (req as any).vendor?.id;
      const { status } = req.body;
      
      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: 'Vendor authentication required',
        });
      }
      
      const order = await service.updateOrderStatus(id, status);
      
      res.status(200).json({
        success: true,
        data: order,
        message: 'Order status updated successfully',
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route DELETE /api/v1/orders/:id
   * @desc Cancel order
   * @access Authenticated
   */
  router.delete(
    '/:id',
    authenticateUser(dataSource),
    asyncHandler(async (req, res) => {
      const { id } = orderIdSchema.parse(req.params);
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
      }
      
      await service.cancelOrder(id, userId);
      
      res.status(204).send();
    })
  );
  
  /**
   * @route PUT /api/v1/orders/admin/:id/status
   * @desc Update order status (admin only)
   * @access Admin
   */
  router.put(
    '/admin/:id/status',
    authenticateUser(dataSource), // Will check for admin role
    validateBody(updateOrderStatusSchema),
    asyncHandler(async (req, res) => {
      const { id } = orderIdSchema.parse(req.params);
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }
      
      // Check if user is admin or staff
      if (user.role !== 'admin' && user.role !== 'staff') {
        return res.status(403).json({
          success: false,
          message: 'Admin or staff access required',
        });
      }
      
      const { status } = req.body;
      const order = await service.updateOrderStatus(id, status);
      
      res.status(200).json({
        success: true,
        data: order,
        message: 'Order status updated successfully',
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route GET /api/v1/orders/admin/:id
   * @desc Get order details (admin only)
   * @access Admin
   */
  router.get(
    '/admin/:id',
    authenticateUser(dataSource),
    asyncHandler(async (req, res) => {
      const { id } = orderIdSchema.parse(req.params);
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }
      
      // Check if user is admin or staff
      if (user.role !== 'admin' && user.role !== 'staff') {
        return res.status(403).json({
          success: false,
          message: 'Admin or staff access required',
        });
      }
      
      const order = await service.getOrderById(id);
      
      res.status(200).json({
        success: true,
        data: order,
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route GET /api/v1/orders/vendor/orders
   * @desc Get orders for vendor
   * @access Vendor
   */
  router.get(
    '/vendor/orders',
    authenticateVendor(dataSource),
    validateQuery(orderQuerySchema),
    asyncHandler(async (req, res) => {
      const vendorId = (req as any).vendor?.id;
      
      if (!vendorId) {
        return res.status(401).json({
          success: false,
          message: 'Vendor authentication required',
        });
      }
      
      const {
        page = 1,
        limit = 20,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query as any;
      
      try {
        // Get vendor orders using repository
        const orderRepository = dataSource.getRepository(Order);
        const queryBuilder = orderRepository.createQueryBuilder('order')
          .innerJoin('order.orderItems', 'orderItems')
          .leftJoinAndSelect('order.orderItems', 'allOrderItems')
          .leftJoinAndSelect('order.shippingAddress', 'shippingAddress')
          .leftJoinAndSelect('order.orderedBy', 'orderedBy')
          .where('orderItems.vendorId = :vendorId', { vendorId })
          .distinct(true);
        
        if (status) {
          queryBuilder.andWhere('order.status = :status', { status });
        }
        
        queryBuilder
          .skip((page - 1) * limit)
          .take(limit)
          .orderBy(`order.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
        
        const [orders, total] = await queryBuilder.getManyAndCount();
        
        res.status(200).json({
          success: true,
          data: orders,
          meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1,
            requestId: (req as any).requestId,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Vendor orders error:', error);
        throw error;
      }
    })
  );
  
  /**
   * @route GET /api/v1/orders/payment/success
   * @desc Handle payment success callback
   * @access Public
   */
  router.get(
    '/payment/success',
    asyncHandler(async (req, res) => {
      const { orderId, transactionId } = req.query;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required',
        });
      }
      
      // Update order payment status
      const order = await service.getOrderById(Number(orderId));
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
      
      // Update payment status (this would normally be done by a service method)
      order.paymentStatus = 'PAID' as any;
      if (transactionId) {
        order.mTransactionId = String(transactionId);
      }
      
      const orderRepository = dataSource.getRepository('Order');
      await orderRepository.save(order);
      
      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: order,
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route GET /api/v1/orders/payment/cancel
   * @desc Handle payment cancellation callback
   * @access Public
   */
  router.get(
    '/payment/cancel',
    asyncHandler(async (req, res) => {
      const { orderId } = req.query;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required',
        });
      }
      
      const order = await service.getOrderById(Number(orderId));
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Payment cancelled',
        data: order,
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route GET /api/v1/orders/user/track
   * @desc Track order by ID
   * @access Public
   */
  router.get(
    '/user/track',
    asyncHandler(async (req, res) => {
      const { orderId } = req.query;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required',
        });
      }
      
      const order = await service.getOrderById(Number(orderId));
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
      
      res.status(200).json({
        success: true,
        data: order,
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  return router;
}
