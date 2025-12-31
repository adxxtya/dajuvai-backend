import { Router } from 'express';
import { DataSource } from 'typeorm';
import { OrderService } from '../../services/order/OrderService';
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
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
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
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
});

/**
 * Create order routes
 * 
 * @param dataSource - TypeORM DataSource for database access
 * @param orderService - OrderService instance
 * @returns Express Router with order routes
 */
export function createOrderRoutes(dataSource: DataSource, orderService: OrderService): Router {
  const router = Router();
  
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
      
      const result = await orderService.getUserOrders(userId, page, limit);
      
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
      
      const order = await orderService.getOrderById(id);
      
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
      
      const order = await orderService.createOrder(userId, req.body);
      
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
      
      const order = await orderService.updateOrderStatus(id, status);
      
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
      
      await orderService.cancelOrder(id, userId);
      
      res.status(204).send();
    })
  );
  
  return router;
}
