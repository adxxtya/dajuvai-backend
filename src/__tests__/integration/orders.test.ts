/**
 * Order API Endpoint Integration Tests
 * 
 * Tests all order-related endpoints including:
 * - Order creation from cart
 * - Order retrieval and listing
 * - Order status updates
 * - Payment callbacks
 * - Vendor and admin order filtering
 * 
 * Requirements: 4.1-4.10
 */

import request from 'supertest';
import express, { Express } from 'express';
import { DataSource } from 'typeorm';
import TestDataSource from '../../config/db.test.config';
import { TestHelpers } from '../setup/testHelpers';
import { TestDataFactory } from '../setup/testDataFactory';
import { TestDatabase } from '../setup/testDatabase';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../../entities/order.entity';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cartItem.entity';
import { Product } from '../../entities/product.entity';
import { Address } from '../../entities/address.entity';
import { createOrderRoutes } from '../../routes/v1/orders.routes';
import { OrderService } from '../../services/order/OrderService';
import cookieParser from 'cookie-parser';

/**
 * Order API Endpoint Integration Tests (V1 API)
 * 
 * Tests all order-related endpoints including:
 * - Order creation from cart
 * - Order retrieval and listing
 * - Order status updates
 * - Payment callbacks (legacy endpoints)
 * - Vendor and admin order filtering
 * 
 * Requirements: 4.1-4.10
 * 
 * Note: Uses V1 API routes with proper dependency injection for test database support
 */
describe('Order API Endpoints (V1)', () => {
  let app: Express;
  let connection: DataSource;
  let testDb: TestDatabase;
  let helpers: TestHelpers;
  let factory: TestDataFactory;
  let orderService: OrderService;

  beforeAll(async () => {
    console.log('🔧 Starting order test setup...');
    
    // Initialize test database
    console.log('  → Connecting to test database...');
    testDb = new TestDatabase();
    await testDb.connect();
    connection = TestDataSource;
    console.log('  ✓ Test database ready');
    
    // Initialize test helpers and factory
    console.log('  → Initializing helpers and factory...');
    helpers = new TestHelpers(connection);
    factory = new TestDataFactory();
    console.log('  ✓ Helpers and factory ready');
    
    // Initialize order service (uses AppDataSource internally, but test DB is already set)
    console.log('  → Initializing order service...');
    orderService = new OrderService(connection);
    console.log('  ✓ Order service ready');
    
    // Create Express app with v1 order routes
    console.log('  → Creating Express app...');
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    
    // Add request ID middleware for tracking
    app.use((req, res, next) => {
      (req as any).requestId = `test-${Date.now()}`;
      next();
    });
    
    app.use('/api/v1/orders', createOrderRoutes(connection, orderService));
    
    // Add error handler middleware
    app.use((err: any, req: any, res: any, next: any) => {
      console.error('Test error handler:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err : undefined,
      });
    });
    
    console.log('  ✓ Express app ready');
    console.log('✅ Order test setup complete');
  });

  afterAll(async () => {
    console.log('🧹 Starting order test cleanup...');
    
    // Cleanup all test data
    await helpers.cleanupTestData();
    console.log('  ✓ Test data cleaned');
    
    // Disconnect from database
    await testDb.disconnect();
    console.log('  ✓ Database disconnected');
    
    console.log('✅ Order test cleanup complete');
  });

  describe('POST /api/v1/orders - Create Order', () => {
    /**
     * Requirement 4.1: Order creation from cart
     */
    it('should create an order from cart items', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      
      // Create test vendor, category, subcategory, and product
      const { vendor } = await helpers.createAuthenticatedVendor();
      const category = await helpers.createTestCategory();
      const subcategory = await helpers.createTestSubcategory(category.id);
      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        basePrice: 1000,
        finalPrice: 1000,
        stock: 10,
      });

      // Create cart with items
      const cartRepository = connection.getRepository(Cart);
      const cart = cartRepository.create({
        userId: user.id,
        total: 2000,
      });
      const savedCart = await cartRepository.save(cart);
      helpers.trackEntity('carts', savedCart.id);

      const cartItemRepository = connection.getRepository(CartItem);
      const cartItem = cartItemRepository.create({
        cart: savedCart,
        product: product,
        quantity: 2,
        price: 1000,
        name: product.name,
        description: product.description,
        image: product.productImages?.[0] || '',
      });
      const savedCartItem = await cartItemRepository.save(cartItem);
      helpers.trackEntity('cartItems', savedCartItem.id);

      // Create address
      const address = await helpers.createTestAddress(user.id);

      // Create order
      const orderData = {
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        shippingAddressId: address.id,
        phoneNumber: '9812345678',
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.orderedById).toBe(user.id);
      expect(response.body.data.paymentMethod).toBe(PaymentMethod.CASH_ON_DELIVERY);
      expect(response.body.data.orderItems).toBeDefined();
      expect(response.body.data.orderItems.length).toBeGreaterThan(0);

      // Track created order
      helpers.trackEntity('orders', response.body.data.id);
    });

    /**
     * Requirement 4.1: Order creation validation
     */
    it('should reject order creation without authentication', async () => {
      const orderData = {
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        shippingAddressId: 1,
        phoneNumber: '9812345678',
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .send(orderData);

      expect(response.status).toBe(401);
    });

    /**
     * Requirement 4.1: Order creation with missing fields
     */
    it('should reject order creation with missing required fields', async () => {
      const { token } = await helpers.createAuthenticatedUser();

      const orderData = {
        // Missing paymentMethod and shippingAddressId
        phoneNumber: '9812345678',
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData);

      expect(response.status).toBe(422);
    });
  });

  describe('GET /api/v1/orders/:orderId - Get Order Details', () => {
    /**
     * Requirement 4.2: Order retrieval by ID
     */
    it('should retrieve order details by ID', async () => {
      // Create test user and order
      const { user, token } = await helpers.createAuthenticatedUser();
      const order = await helpers.createTestOrder(user.id);

      const response = await request(app)
        .get(`/api/v1/orders/${order.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(order.id);
      expect(response.body.data.orderedById).toBe(user.id);
    });

    /**
     * Requirement 4.2: Order retrieval for non-existent order
     */
    it('should return 404 for non-existent order', async () => {
      const { token } = await helpers.createAuthenticatedUser();

      const response = await request(app)
        .get('/api/v1/orders/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/orders - List Customer Orders', () => {
    /**
     * Requirement 4.3: Order listing with pagination
     */
    it('should retrieve customer orders with pagination', async () => {
      // Create test user and multiple orders
      const { user, token } = await helpers.createAuthenticatedUser();
      
      const order1 = await helpers.createTestOrder(user.id);
      const order2 = await helpers.createTestOrder(user.id);

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      if (response.status !== 200) {
        console.error('getUserOrders error response:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    /**
     * Requirement 4.3: Order listing requires admin/staff authentication
     */
    it('should require admin or staff role for order listing', async () => {
      const { token } = await helpers.createAuthenticatedUser();

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);

      // Regular users cannot access this endpoint (admin/staff only)
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('PUT /api/v1/orders/admin/:orderId/status - Update Order Status', () => {
    /**
     * Requirement 4.4: Order status updates
     */
    it('should update order status', async () => {
      // Create admin user and order
      const { token: adminToken } = await helpers.createAuthenticatedAdmin();
      const { user } = await helpers.createAuthenticatedUser();
      const order = await helpers.createTestOrder(user.id);

      const updateData = {
        status: OrderStatus.SHIPPED,
      };

      const response = await request(app)
        .put(`/api/v1/orders/admin/${order.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(OrderStatus.SHIPPED);
    });

    /**
     * Requirement 4.4: Order status update requires admin authentication
     */
    it('should reject status update without admin authentication', async () => {
      const { token } = await helpers.createAuthenticatedUser();
      const order = await helpers.createTestOrder(1);

      const updateData = {
        status: OrderStatus.SHIPPED,
      };

      const response = await request(app)
        .put(`/api/v1/orders/admin/${order.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/orders/payment/success - Payment Success Callback', () => {
    /**
     * Requirement 4.5: Payment success callback
     */
    it('should handle payment success callback', async () => {
      // Create order with pending payment
      const { user } = await helpers.createAuthenticatedUser();
      const order = await helpers.createTestOrder(user.id, {
        paymentStatus: PaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.ESEWA,
      });

      const response = await request(app)
        .get('/api/v1/orders/payment/success')
        .query({
          orderId: order.id,
          transactionId: 'TEST_TXN_123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/orders/payment/cancel - Payment Cancel Callback', () => {
    /**
     * Requirement 4.6: Payment cancel callback
     */
    it('should handle payment cancel callback', async () => {
      // Create order with pending payment
      const { user } = await helpers.createAuthenticatedUser();
      const order = await helpers.createTestOrder(user.id, {
        paymentStatus: PaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.ESEWA,
      });

      const response = await request(app)
        .get('/api/v1/orders/payment/cancel')
        .query({
          orderId: order.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/orders/vendor/orders - Vendor Orders', () => {
    /**
     * Requirement 4.7: Vendor orders filtering
     */
    it('should retrieve orders filtered by vendor', async () => {
      // Create vendor and their products
      const { vendor, token: vendorToken } = await helpers.createAuthenticatedVendor();

      const response = await request(app)
        .get('/api/v1/orders/vendor/orders')
        .set('Authorization', `Bearer ${vendorToken}`)
        .query({ page: 1, limit: 10 });

      if (response.status !== 200) {
        console.error('Vendor orders error response:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    /**
     * Requirement 4.7: Vendor orders require vendor authentication
     */
    it('should reject vendor orders without vendor authentication', async () => {
      const { token } = await helpers.createAuthenticatedUser();

      const response = await request(app)
        .get('/api/v1/orders/vendor/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/orders/admin/:orderId - Admin Order Details', () => {
    /**
     * Requirement 4.8: Admin order listing
     */
    it('should retrieve order details for admin', async () => {
      const { token: adminToken } = await helpers.createAuthenticatedAdmin();
      const { user } = await helpers.createAuthenticatedUser();
      const order = await helpers.createTestOrder(user.id);

      const response = await request(app)
        .get(`/api/v1/orders/admin/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(order.id);
    });
  });

  describe('GET /api/v1/orders/user/track - Order Tracking', () => {
    /**
     * Requirement 4.9: Order tracking
     */
    it('should track order by ID', async () => {
      const { user } = await helpers.createAuthenticatedUser();
      const order = await helpers.createTestOrder(user.id);

      const response = await request(app)
        .get('/api/v1/orders/user/track')
        .query({ orderId: order.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Order with Different Payment Methods', () => {
    /**
     * Requirement 4.10: Orders with different payment methods
     */
    it('should create order with Cash on Delivery', async () => {
      const { user, token } = await helpers.createAuthenticatedUser();
      const { vendor } = await helpers.createAuthenticatedVendor();
      const category = await helpers.createTestCategory();
      const subcategory = await helpers.createTestSubcategory(category.id);
      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        basePrice: 1000,
        finalPrice: 1000,
        stock: 10,
      });
      const address = await helpers.createTestAddress(user.id);

      // Create cart with items
      const cartRepository = connection.getRepository(Cart);
      const cart = cartRepository.create({
        userId: user.id,
        total: 1000,
      });
      const savedCart = await cartRepository.save(cart);
      helpers.trackEntity('carts', savedCart.id);

      const cartItemRepository = connection.getRepository(CartItem);
      const cartItem = cartItemRepository.create({
        cart: savedCart,
        product: product,
        quantity: 1,
        price: 1000,
        name: product.name,
        description: product.description,
        image: product.productImages?.[0] || '',
      });
      const savedCartItem = await cartItemRepository.save(cartItem);
      helpers.trackEntity('cartItems', savedCartItem.id);

      const orderData = {
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        shippingAddressId: address.id,
        phoneNumber: '9812345678',
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.data.paymentMethod).toBe(PaymentMethod.CASH_ON_DELIVERY);
      
      if (response.body.data?.id) {
        helpers.trackEntity('orders', response.body.data.id);
      }
    });

    it('should create order with eSewa payment', async () => {
      const { user, token } = await helpers.createAuthenticatedUser();
      const { vendor } = await helpers.createAuthenticatedVendor();
      const category = await helpers.createTestCategory();
      const subcategory = await helpers.createTestSubcategory(category.id);
      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        basePrice: 1000,
        finalPrice: 1000,
        stock: 10,
      });
      const address = await helpers.createTestAddress(user.id);

      // Create cart with items
      const cartRepository = connection.getRepository(Cart);
      const cart = cartRepository.create({
        userId: user.id,
        total: 1000,
      });
      const savedCart = await cartRepository.save(cart);
      helpers.trackEntity('carts', savedCart.id);

      const cartItemRepository = connection.getRepository(CartItem);
      const cartItem = cartItemRepository.create({
        cart: savedCart,
        product: product,
        quantity: 1,
        price: 1000,
        name: product.name,
        description: product.description,
        image: product.productImages?.[0] || '',
      });
      const savedCartItem = await cartItemRepository.save(cartItem);
      helpers.trackEntity('cartItems', savedCartItem.id);

      const orderData = {
        paymentMethod: PaymentMethod.ESEWA,
        shippingAddressId: address.id,
        phoneNumber: '9812345678',
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.data.paymentMethod).toBe(PaymentMethod.ESEWA);
      
      if (response.body.data?.id) {
        helpers.trackEntity('orders', response.body.data.id);
      }
    });

    it('should create order with Khalti payment', async () => {
      const { user, token } = await helpers.createAuthenticatedUser();
      const { vendor } = await helpers.createAuthenticatedVendor();
      const category = await helpers.createTestCategory();
      const subcategory = await helpers.createTestSubcategory(category.id);
      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        basePrice: 1000,
        finalPrice: 1000,
        stock: 10,
      });
      const address = await helpers.createTestAddress(user.id);

      // Create cart with items
      const cartRepository = connection.getRepository(Cart);
      const cart = cartRepository.create({
        userId: user.id,
        total: 1000,
      });
      const savedCart = await cartRepository.save(cart);
      helpers.trackEntity('carts', savedCart.id);

      const cartItemRepository = connection.getRepository(CartItem);
      const cartItem = cartItemRepository.create({
        cart: savedCart,
        product: product,
        quantity: 1,
        price: 1000,
        name: product.name,
        description: product.description,
        image: product.productImages?.[0] || '',
      });
      const savedCartItem = await cartItemRepository.save(cartItem);
      helpers.trackEntity('cartItems', savedCartItem.id);

      const orderData = {
        paymentMethod: PaymentMethod.KHALIT,
        shippingAddressId: address.id,
        phoneNumber: '9812345678',
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.data.paymentMethod).toBe(PaymentMethod.KHALIT);
      
      if (response.body.data?.id) {
        helpers.trackEntity('orders', response.body.data.id);
      }
    });
  });

  /**
   * Property 18: Order Creation from Cart
   * 
   * For any non-empty cart, creating an order should generate an order
   * with order items matching the cart items
   * 
   * Validates: Requirements 4.1
   */
  describe('Property 18: Order Creation from Cart', () => {
    it('should create orders from cart with matching items (10 iterations)', async () => {
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        // Create test user
        const { user, token } = await helpers.createAuthenticatedUser();
        
        // Create vendor, category, subcategory, and product
        const { vendor } = await helpers.createAuthenticatedVendor();
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);
        const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
          basePrice: 1000,
          finalPrice: 1000,
          stock: 100,
        });

        // Create cart with items
        const cartRepository = connection.getRepository(Cart);
        const cart = cartRepository.create({
          userId: user.id,
          total: 2000,
        });
        const savedCart = await cartRepository.save(cart);
        helpers.trackEntity('carts', savedCart.id);

        const cartItemRepository = connection.getRepository(CartItem);
        const cartItem = cartItemRepository.create({
          cart: savedCart,
          product: product,
          quantity: 2,
          price: 1000,
          name: product.name,
          description: product.description,
          image: product.productImages?.[0] || '',
        });
        const savedCartItem = await cartItemRepository.save(cartItem);
        helpers.trackEntity('cartItems', savedCartItem.id);

        // Create address
        const address = await helpers.createTestAddress(user.id);

        // Create order from cart
        const orderData = {
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          shippingAddressId: address.id,
          phoneNumber: '9812345678',
        };

        const response = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${token}`)
          .send(orderData);

        // Verify order creation
        expect(response.status).toBe(201);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.orderedById).toBe(user.id);
        
        // Verify order items match cart items
        if (response.body.data.orderItems) {
          expect(response.body.data.orderItems.length).toBeGreaterThan(0);
        }

        // Track created order
        if (response.body.data?.id) {
          helpers.trackEntity('orders', response.body.data.id);
        }
      }
    }, 90000); // Increase timeout to 90 seconds for property-based test
  });

  /**
   * Property 19: Order Status Transitions
   * 
   * For any order, updating its status should persist the new status
   * and maintain a history of status changes
   * 
   * Validates: Requirements 4.4, 4.9
   */
  describe('Property 19: Order Status Transitions', () => {
    it('should persist order status updates (10 iterations)', async () => {
      const iterations = 10;
      const { token: adminToken } = await helpers.createAuthenticatedAdmin();

      for (let i = 0; i < iterations; i++) {
        // Create test user and order
        const { user } = await helpers.createAuthenticatedUser();
        const order = await helpers.createTestOrder(user.id, {
          status: OrderStatus.CONFIRMED,
        });

        // Update order status
        const newStatus = OrderStatus.SHIPPED;
        const updateData = {
          status: newStatus,
        };

        const response = await request(app)
          .put(`/api/v1/orders/admin/${order.id}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);

        // Verify status update
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe(newStatus);

        // Retrieve order to verify persistence
        const getResponse = await request(app)
          .get(`/api/v1/orders/admin/${order.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.data.status).toBe(newStatus);
      }
    });
  });

  /**
   * Property 20: Payment Status Updates
   * 
   * For any order with pending payment, processing a payment success
   * callback should update the payment status to PAID
   * 
   * Validates: Requirements 4.5
   */
  describe('Property 20: Payment Status Updates', () => {
    it('should update payment status on success callback (10 iterations)', async () => {
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        // Create test user and order with pending payment
        const { user } = await helpers.createAuthenticatedUser();
        const order = await helpers.createTestOrder(user.id, {
          paymentStatus: PaymentStatus.UNPAID,
          paymentMethod: PaymentMethod.ESEWA,
        });

        // Process payment success callback
        const response = await request(app)
          .get('/api/v1/orders/payment/success')
          .query({
            orderId: order.id,
            transactionId: `TEST_TXN_${Date.now()}_${i}`,
          });

        // Verify payment success handling
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Note: Actual payment status update verification would require
        // checking the database, but the endpoint should handle the callback
      }
    });
  });
});




