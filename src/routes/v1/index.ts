import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createAuthRoutes } from './auth.routes';
import { createUserRoutes } from './users.routes';
import { createProductRoutes } from './products.routes';
import { createOrderRoutes } from './orders.routes';
import { createPaymentRoutes } from './payments.routes';
import { AuthService } from '../../services/auth/AuthService';
import { ProductService } from '../../service/product.service';
import { OrderService } from '../../services/order/OrderService';
import { PaymentService } from '../../services/payment/PaymentService';
import { UserRepository } from '../../repositories/UserRepository';
import { TokenService } from '../../services/auth/TokenService';
import { SessionService } from '../../services/auth/SessionService';
import { SessionRepository } from '../../repositories/SessionRepository';

/**
 * Create v1 API router
 * Mounts all v1 route modules
 * 
 * @param dataSource - TypeORM DataSource for database access
 * @returns Express Router with all v1 routes
 */
export function createV1Router(dataSource: DataSource): Router {
  const router = Router();
  
  // Initialize repositories
  const userRepository = new UserRepository(dataSource);
  const sessionRepository = new SessionRepository(dataSource);
  
  // Initialize services
  const tokenService = new TokenService();
  const sessionService = new SessionService(sessionRepository);
  const authService = new AuthService(userRepository, tokenService, sessionService);
  const productService = new ProductService(dataSource);
  const orderService = new OrderService();
  const paymentService = new PaymentService();
  
  // Mount route modules
  router.use('/auth', createAuthRoutes(dataSource, authService));
  router.use('/users', createUserRoutes(dataSource));
  router.use('/products', createProductRoutes(dataSource, productService));
  router.use('/orders', createOrderRoutes(dataSource, orderService));
  router.use('/payments', createPaymentRoutes(dataSource, paymentService));
  
  // Health check endpoint for v1
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'API v1 is healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });
  
  return router;
}
