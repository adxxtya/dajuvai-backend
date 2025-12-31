import { Router } from 'express';
import { DataSource } from 'typeorm';
import { PaymentService } from '../../services/payment/PaymentService';
import { authenticateUser } from '../../middlewares/auth/authenticate.middleware';
import { validateBody } from '../../middlewares/validation/validate.middleware';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { z } from 'zod';

/**
 * Initiate payment schema
 */
const initiatePaymentSchema = z.object({
  orderId: z.number().int().positive(),
  amount: z.number().positive(),
  method: z.enum(['esewa', 'khalti', 'npg', 'cod']),
});

/**
 * eSewa callback schema
 */
const esewaCallbackSchema = z.object({
  token: z.string().min(1),
  orderId: z.number().int().positive(),
});

/**
 * Khalti callback schema
 */
const khaltiCallbackSchema = z.object({
  token: z.string().min(1),
  orderId: z.number().int().positive(),
  amount: z.number().positive(),
});

/**
 * Order ID param schema
 */
const orderIdSchema = z.object({
  orderId: z.string().regex(/^\d+$/).transform(Number),
});

/**
 * Create payment routes
 * 
 * @param dataSource - TypeORM DataSource for database access
 * @param paymentService - PaymentService instance
 * @returns Express Router with payment routes
 */
export function createPaymentRoutes(dataSource: DataSource, paymentService: PaymentService): Router {
  const router = Router();
  
  /**
   * @route POST /api/v1/payments/initiate
   * @desc Initiate payment for an order
   * @access Authenticated
   */
  router.post(
    '/initiate',
    authenticateUser(dataSource),
    validateBody(initiatePaymentSchema),
    asyncHandler(async (req, res) => {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
      }
      
      const { orderId, amount, method } = req.body;
      
      const paymentInitiation = await paymentService.initiatePayment(
        orderId,
        amount,
        method
      );
      
      res.status(200).json({
        success: true,
        data: paymentInitiation,
        message: 'Payment initiated successfully',
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route POST /api/v1/payments/esewa/callback
   * @desc Handle eSewa payment callback
   * @access Public (called by eSewa)
   */
  router.post(
    '/esewa/callback',
    validateBody(esewaCallbackSchema),
    asyncHandler(async (req, res) => {
      const { token, orderId } = req.body;
      
      await paymentService.processPaymentCallback(token, orderId, 'esewa');
      
      res.status(200).json({
        success: true,
        message: 'Payment verified and processed successfully',
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route POST /api/v1/payments/khalti/callback
   * @desc Handle Khalti payment callback
   * @access Public (called by Khalti)
   */
  router.post(
    '/khalti/callback',
    validateBody(khaltiCallbackSchema),
    asyncHandler(async (req, res) => {
      const { token, orderId } = req.body;
      
      await paymentService.processPaymentCallback(token, orderId, 'khalti');
      
      res.status(200).json({
        success: true,
        message: 'Payment verified and processed successfully',
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  /**
   * @route GET /api/v1/payments/:orderId/status
   * @desc Get payment status for an order
   * @access Authenticated
   */
  router.get(
    '/:orderId/status',
    authenticateUser(dataSource),
    asyncHandler(async (req, res) => {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
      }
      
      const { orderId } = orderIdSchema.parse(req.params);
      
      const paymentStatus = await paymentService.getPaymentStatus(orderId);
      
      res.status(200).json({
        success: true,
        data: paymentStatus,
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );
  
  return router;
}
