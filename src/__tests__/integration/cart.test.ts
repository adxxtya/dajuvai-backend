import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { TestDatabase } from '../setup/testDatabase';
import { TestHelpers } from '../setup/testHelpers';
import { TestDataFactory } from '../setup/testDataFactory';
import TestDataSource from '../../config/db.test.config';
import { Product } from '../../entities/product.entity';
import { Variant } from '../../entities/variant.entity';
import { CartItem } from '../../entities/cartItem.entity';
import cartRouter from '../../routes/cart.routes';

/**
 * Cart API Integration Tests
 * 
 * Tests all cart endpoints including:
 * - Add to cart
 * - Get cart
 * - Remove from cart
 * - Cart quantity decrease
 * - Cart with variants
 * - Stock validation
 * - Authentication requirements
 * 
 * Requirements: 5.1-5.8
 */
describe('Cart API Endpoints', () => {
  let app: Express;
  let testDb: TestDatabase;
  let helpers: TestHelpers;
  let factory: TestDataFactory;
  let connection: DataSource;

  beforeAll(async () => {
    // Initialize test database
    testDb = new TestDatabase();
    await testDb.connect();
    await testDb.runMigrations();

    connection = TestDataSource;
    helpers = new TestHelpers(connection);
    factory = new TestDataFactory();

    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/cart', cartRouter);

    console.log('✅ Cart test suite setup complete');
  });

  afterAll(async () => {
    // Clean up all test data
    await testDb.clearTestData();
    await testDb.disconnect();
    console.log('✅ Cart test suite cleanup complete');
  });

  describe('POST /api/cart - Add to Cart', () => {
    it('should add a product to cart successfully', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Create test product
      const category = await helpers.createTestCategory();
      testDb.trackCreatedEntity('categories', category.id);

      const subcategory = await helpers.createTestSubcategory(category.id);
      testDb.trackCreatedEntity('subcategories', subcategory.id);

      const { vendor } = await helpers.createAuthenticatedVendor();
      testDb.trackCreatedEntity('vendors', vendor.id);

      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        stock: 10,
        basePrice: 1000,
        finalPrice: 1000,
      });
      testDb.trackCreatedEntity('products', product.id);

      // Add product to cart
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          quantity: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(user.id);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
      expect(response.body.data.items[0].product.id).toBe(product.id);
      expect(response.body.data.total).toBe(2000); // 2 * 1000

      // Track created cart and cart items
      testDb.trackCreatedEntity('carts', response.body.data.id);
      testDb.trackCreatedEntity('cartItems', response.body.data.items[0].id);
    });

    it('should add a product with variant to cart successfully', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Create test product with variants
      const category = await helpers.createTestCategory();
      testDb.trackCreatedEntity('categories', category.id);

      const subcategory = await helpers.createTestSubcategory(category.id);
      testDb.trackCreatedEntity('subcategories', subcategory.id);

      const { vendor } = await helpers.createAuthenticatedVendor();
      testDb.trackCreatedEntity('vendors', vendor.id);

      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        hasVariants: true,
        basePrice: undefined,
        finalPrice: undefined,
        stock: undefined,
      });
      testDb.trackCreatedEntity('products', product.id);

      // Create variant
      const variantRepository = connection.getRepository(Variant);
      const variantData = factory.createVariant({
        productId: product.id.toString(),
        basePrice: 1500,
        finalPrice: 1500,
        stock: 5,
      });
      const variant = variantRepository.create(variantData);
      const savedVariant = await variantRepository.save(variant);
      // Note: Variant IDs are strings, not tracked separately (cleaned up with product)

      // Add product with variant to cart
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          quantity: 1,
          variantId: savedVariant.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].variantId).toBe(savedVariant.id);
      expect(response.body.data.total).toBe(1500);

      // Track created cart and cart items
      testDb.trackCreatedEntity('carts', response.body.data.id);
      testDb.trackCreatedEntity('cartItems', response.body.data.items[0].id);
    });

    it('should reject adding product beyond available stock', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Create test product with limited stock
      const category = await helpers.createTestCategory();
      testDb.trackCreatedEntity('categories', category.id);

      const subcategory = await helpers.createTestSubcategory(category.id);
      testDb.trackCreatedEntity('subcategories', subcategory.id);

      const { vendor } = await helpers.createAuthenticatedVendor();
      testDb.trackCreatedEntity('vendors', vendor.id);

      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        stock: 3,
        basePrice: 1000,
        finalPrice: 1000,
      });
      testDb.trackCreatedEntity('products', product.id);

      // Try to add more than available stock
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          quantity: 5, // More than available stock (3)
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('stock');
    });

    it('should reject adding to cart without authentication', async () => {
      // Create test product
      const category = await helpers.createTestCategory();
      testDb.trackCreatedEntity('categories', category.id);

      const subcategory = await helpers.createTestSubcategory(category.id);
      testDb.trackCreatedEntity('subcategories', subcategory.id);

      const { vendor } = await helpers.createAuthenticatedVendor();
      testDb.trackCreatedEntity('vendors', vendor.id);

      const product = await helpers.createTestProduct(vendor.id, subcategory.id);
      testDb.trackCreatedEntity('products', product.id);

      // Try to add to cart without token
      const response = await request(app)
        .post('/api/cart')
        .send({
          productId: product.id,
          quantity: 1,
        });

      helpers.expectUnauthorized(response);
    });

    it('should reject adding non-existent product to cart', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Try to add non-existent product
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: 999999,
          quantity: 1,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should update quantity when adding same product again', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Create test product
      const category = await helpers.createTestCategory();
      testDb.trackCreatedEntity('categories', category.id);

      const subcategory = await helpers.createTestSubcategory(category.id);
      testDb.trackCreatedEntity('subcategories', subcategory.id);

      const { vendor } = await helpers.createAuthenticatedVendor();
      testDb.trackCreatedEntity('vendors', vendor.id);

      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        stock: 10,
        basePrice: 1000,
        finalPrice: 1000,
      });
      testDb.trackCreatedEntity('products', product.id);

      // Add product first time
      const response1 = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          quantity: 2,
        });

      expect(response1.status).toBe(200);
      testDb.trackCreatedEntity('carts', response1.body.data.id);
      testDb.trackCreatedEntity('cartItems', response1.body.data.items[0].id);

      // Add same product again
      const response2 = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          quantity: 3,
        });

      expect(response2.status).toBe(200);
      expect(response2.body.data.items).toHaveLength(1);
      expect(response2.body.data.items[0].quantity).toBe(5); // 2 + 3
      expect(response2.body.data.total).toBe(5000); // 5 * 1000
    });
  });

  describe('GET /api/cart - Get Cart', () => {
    it('should retrieve user cart with all items', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Create test products
      const category = await helpers.createTestCategory();
      testDb.trackCreatedEntity('categories', category.id);

      const subcategory = await helpers.createTestSubcategory(category.id);
      testDb.trackCreatedEntity('subcategories', subcategory.id);

      const { vendor } = await helpers.createAuthenticatedVendor();
      testDb.trackCreatedEntity('vendors', vendor.id);

      const product1 = await helpers.createTestProduct(vendor.id, subcategory.id, {
        stock: 10,
        basePrice: 1000,
        finalPrice: 1000,
      });
      testDb.trackCreatedEntity('products', product1.id);

      const product2 = await helpers.createTestProduct(vendor.id, subcategory.id, {
        stock: 10,
        basePrice: 2000,
        finalPrice: 2000,
      });
      testDb.trackCreatedEntity('products', product2.id);

      // Add products to cart
      const addResponse1 = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product1.id,
          quantity: 2,
        });
      testDb.trackCreatedEntity('carts', addResponse1.body.data.id);
      testDb.trackCreatedEntity('cartItems', addResponse1.body.data.items[0].id);

      const addResponse2 = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product2.id,
          quantity: 1,
        });
      testDb.trackCreatedEntity('cartItems', addResponse2.body.data.items[1].id);

      // Get cart
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(user.id);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(4000); // (2 * 1000) + (1 * 2000)
    });

    it('should return empty cart for user with no items', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Get cart (should be empty or not exist)
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      // Cart might not exist yet or be empty
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toHaveLength(0);
        expect(response.body.data.total).toBe(0);
        testDb.trackCreatedEntity('carts', response.body.data.id);
      } else if (response.status === 404) {
        expect(response.body.success).toBe(false);
      }
    });

    it('should reject getting cart without authentication', async () => {
      const response = await request(app).get('/api/cart');

      helpers.expectUnauthorized(response);
    });
  });

  describe('DELETE /api/cart - Remove from Cart', () => {
    it('should remove item from cart completely', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Create test product
      const category = await helpers.createTestCategory();
      testDb.trackCreatedEntity('categories', category.id);

      const subcategory = await helpers.createTestSubcategory(category.id);
      testDb.trackCreatedEntity('subcategories', subcategory.id);

      const { vendor } = await helpers.createAuthenticatedVendor();
      testDb.trackCreatedEntity('vendors', vendor.id);

      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        stock: 10,
        basePrice: 1000,
        finalPrice: 1000,
      });
      testDb.trackCreatedEntity('products', product.id);

      // Add product to cart
      const addResponse = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          quantity: 3,
        });
      testDb.trackCreatedEntity('carts', addResponse.body.data.id);
      const cartItemId = addResponse.body.data.items[0].id;
      testDb.trackCreatedEntity('cartItems', cartItemId);

      // Remove item from cart
      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartItemId,
          decreaseOnly: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should decrease item quantity by 1 when decreaseOnly is true', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Create test product
      const category = await helpers.createTestCategory();
      testDb.trackCreatedEntity('categories', category.id);

      const subcategory = await helpers.createTestSubcategory(category.id);
      testDb.trackCreatedEntity('subcategories', subcategory.id);

      const { vendor } = await helpers.createAuthenticatedVendor();
      testDb.trackCreatedEntity('vendors', vendor.id);

      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        stock: 10,
        basePrice: 1000,
        finalPrice: 1000,
      });
      testDb.trackCreatedEntity('products', product.id);

      // Add product to cart
      const addResponse = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          quantity: 3,
        });
      testDb.trackCreatedEntity('carts', addResponse.body.data.id);
      const cartItemId = addResponse.body.data.items[0].id;
      testDb.trackCreatedEntity('cartItems', cartItemId);

      // Decrease quantity
      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartItemId,
          decreaseOnly: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2); // 3 - 1
      expect(response.body.data.total).toBe(2000); // 2 * 1000
    });

    it('should remove item when decreasing quantity to 0', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Create test product
      const category = await helpers.createTestCategory();
      testDb.trackCreatedEntity('categories', category.id);

      const subcategory = await helpers.createTestSubcategory(category.id);
      testDb.trackCreatedEntity('subcategories', subcategory.id);

      const { vendor } = await helpers.createAuthenticatedVendor();
      testDb.trackCreatedEntity('vendors', vendor.id);

      const product = await helpers.createTestProduct(vendor.id, subcategory.id, {
        stock: 10,
        basePrice: 1000,
        finalPrice: 1000,
      });
      testDb.trackCreatedEntity('products', product.id);

      // Add product to cart with quantity 1
      const addResponse = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          quantity: 1,
        });
      testDb.trackCreatedEntity('carts', addResponse.body.data.id);
      const cartItemId = addResponse.body.data.items[0].id;
      testDb.trackCreatedEntity('cartItems', cartItemId);

      // Decrease quantity (should remove item)
      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartItemId,
          decreaseOnly: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should reject removing non-existent cart item', async () => {
      // Create test user
      const { user, token } = await helpers.createAuthenticatedUser();
      testDb.trackCreatedEntity('users', user.id);

      // Try to remove non-existent cart item
      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartItemId: 999999,
          decreaseOnly: false,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject removing from cart without authentication', async () => {
      const response = await request(app)
        .delete('/api/cart')
        .send({
          cartItemId: 1,
          decreaseOnly: false,
        });

      helpers.expectUnauthorized(response);
    });
  });
});
