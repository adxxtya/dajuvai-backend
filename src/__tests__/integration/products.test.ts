import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { TestDatabase } from '../setup/testDatabase';
import { TestHelpers } from '../setup/testHelpers';
import { TestDataFactory } from '../setup/testDataFactory';
import { createCategoryRoutes } from '../../routes/v1/categories.routes';
import { createProductRoutes } from '../../routes/v1/products.routes';
import { createVendorRoutes } from '../../routes/v1/vendors.routes';
import TestDataSource from '../../config/db.test.config';

/**
 * Product Endpoint Integration Tests
 * 
 * Tests all product endpoints including:
 * - Product creation
 * - Product retrieval (by ID, listing)
 * - Product update
 * - Product deletion
 * - Product search
 * - Vendor product filtering
 * - Product with variants
 * 
 * Requirements: 3.1-3.10
 */
describe('Product API Endpoints', () => {
  let app: Express;
  let testDb: TestDatabase;
  let helpers: TestHelpers;
  let factory: TestDataFactory;

  /**
   * Setup test environment before all tests
   */
  beforeAll(async () => {
    console.log('🔧 Starting product test setup...');
    
    // Initialize test database
    console.log('  → Connecting to test database...');
    testDb = new TestDatabase();
    await testDb.connect();
    console.log('  ✓ Test database ready');

    // Initialize test helpers and factory
    console.log('  → Initializing helpers and factory...');
    helpers = new TestHelpers(TestDataSource);
    factory = new TestDataFactory();
    console.log('  ✓ Helpers and factory ready');

    // Create Express app with product routes using test database
    console.log('  → Creating Express app...');
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser()); // Add cookie-parser middleware for auth
    
    // Add routes
    app.use('/api/v1/categories', createCategoryRoutes(TestDataSource));
    app.use('/api/v1/product', createProductRoutes(TestDataSource));
    app.use('/api/v1/vendors', createVendorRoutes(TestDataSource));
    
    // Add error handler with detailed logging
    app.use((err: any, req: any, res: any, next: any) => {
      console.error('❌ Test API Error:', {
        message: err.message,
        stack: err.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
        statusCode: err.statusCode,
        name: err.name,
      });
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'test' && { stack: err.stack }),
      });
    });
    console.log('  ✓ Express app ready');

    console.log('✅ Product test suite setup complete');
  }, 30000);

  /**
   * Cleanup after all tests
   */
  afterAll(async () => {
    await testDb.clearTestData();
    await testDb.disconnect();
    console.log('✅ Product test suite cleanup complete');
  });

  /**
   * Cleanup after each test
   */
  afterEach(async () => {
    await helpers.cleanupTestData();
  });

  /**
   * Product CRUD Tests
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  describe('Product CRUD Operations', () => {
    describe('POST /api/v1/categories/:categoryId/subcategories/:subcategoryId/products', () => {
      it('should create a product with valid data', async () => {
        // Create vendor, category, and subcategory
        const { vendor, token } = await helpers.createAuthenticatedVendor();
        console.log('Created vendor:', { id: vendor.id, email: vendor.email, businessName: vendor.businessName });
        console.log('Generated token:', token);
        
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);

        const productData = factory.createProduct({
          vendorId: vendor.id,
          subcategoryId: subcategory.id,
        });

        const response = await request(app)
          .post(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: productData.name,
            description: productData.description,
            basePrice: productData.basePrice,
            stock: productData.stock,
            hasVariants: false,
            productImages: ['https://example.com/image1.jpg'],
          });

        console.log('Product creation response:', {
          status: response.status,
          body: response.body,
        });

        if (response.status !== 201) {
          console.error('Product creation failed:', {
            status: response.status,
            body: response.body,
          });
        }

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.name).toBe(productData.name);

        if (response.body.data?.id) {
          helpers.trackEntity('products', response.body.data.id);
        }
      });

      it('should reject product creation without authentication', async () => {
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);

        const response = await request(app)
          .post(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products`)
          .send({
            name: 'Test Product',
            description: 'Test Description',
            basePrice: 100,
            stock: 10,
            hasVariants: false,
            productImages: ['https://example.com/image1.jpg'],
          });

        expect(response.status).toBe(401);
      });

      it('should reject product creation with missing required fields', async () => {
        const { vendor, token } = await helpers.createAuthenticatedVendor();
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);

        const response = await request(app)
          .post(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Test Product',
            // Missing required fields
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/v1/categories/:categoryId/subcategories/:subcategoryId/products/:id', () => {
      it('should retrieve a product by ID', async () => {
        // Create vendor, category, subcategory, and product
        const { vendor, token } = await helpers.createAuthenticatedVendor();
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);
        const product = await helpers.createTestProduct(vendor.id, subcategory.id);

        const response = await request(app)
          .get(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products/${product.id}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBe(product.id);
        expect(response.body.data.name).toBe(product.name);
      });

      it('should return 404 for non-existent product', async () => {
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);

        const response = await request(app)
          .get(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products/99999`);

        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/v1/categories/all/products', () => {
      it('should retrieve all products with pagination', async () => {
        // Create some test products
        const { vendor } = await helpers.createAuthenticatedVendor();
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);
        
        await helpers.createTestProduct(vendor.id, subcategory.id);
        await helpers.createTestProduct(vendor.id, subcategory.id);

        const response = await request(app)
          .get('/api/v1/categories/all/products');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter products by category', async () => {
        const { vendor } = await helpers.createAuthenticatedVendor();
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);
        
        await helpers.createTestProduct(vendor.id, subcategory.id);

        const response = await request(app)
          .get(`/api/v1/categories/all/products?categoryId=${category.id}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('PUT /api/v1/categories/:categoryId/subcategories/:subcategoryId/products/:id', () => {
      it('should update a product with valid data', async () => {
        const { vendor, token } = await helpers.createAuthenticatedVendor();
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);
        const product = await helpers.createTestProduct(vendor.id, subcategory.id);

        const updatedName = 'Updated Product Name';
        const response = await request(app)
          .put(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products/${product.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: updatedName,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(updatedName);
      });

      it('should reject update without authentication', async () => {
        const { vendor } = await helpers.createAuthenticatedVendor();
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);
        const product = await helpers.createTestProduct(vendor.id, subcategory.id);

        const response = await request(app)
          .put(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products/${product.id}`)
          .send({
            name: 'Updated Name',
          });

        expect(response.status).toBe(401);
      });
    });

    describe('DELETE /api/v1/product/:id', () => {
      it('should delete a product', async () => {
        const { vendor, token } = await helpers.createAuthenticatedVendor();
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);
        const product = await helpers.createTestProduct(vendor.id, subcategory.id);

        const response = await request(app)
          .delete(`/api/v1/product/${product.id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify product is deleted
        const getResponse = await request(app)
          .get(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products/${product.id}`);

        expect(getResponse.status).toBe(404);
      });

      it('should reject deletion without authentication', async () => {
        const { vendor } = await helpers.createAuthenticatedVendor();
        const category = await helpers.createTestCategory();
        const subcategory = await helpers.createTestSubcategory(category.id);
        const product = await helpers.createTestProduct(vendor.id, subcategory.id);

        const response = await request(app)
          .delete(`/api/v1/product/${product.id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  /**
   * Property-Based Test: Product CRUD Round-Trip
   * 
   * Feature: backend-api-testing
   * Property 5: For any valid product data, creating a product then retrieving 
   * it by ID should return equivalent product data
   * Validates: Requirements 3.1, 3.2
   */
  describe('Property 5: Entity CRUD Round-Trip (Products)', () => {
    it('should maintain product data through create-retrieve cycle (10 iterations)', async () => {
      const iterations = 10;
      const results = {
        passed: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < iterations; i++) {
        try {
          // Create vendor, category, and subcategory
          const { vendor, token } = await helpers.createAuthenticatedVendor();
          const category = await helpers.createTestCategory();
          const subcategory = await helpers.createTestSubcategory(category.id);

          // Generate random product data
          const productData = factory.createProduct({
            vendorId: vendor.id,
            subcategoryId: subcategory.id,
          });

          // Create product
          const createResponse = await request(app)
            .post(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products`)
            .set('Authorization', `Bearer ${token}`)
            .send({
              name: productData.name,
              description: productData.description,
              basePrice: productData.basePrice,
              stock: productData.stock,
              hasVariants: false,
              productImages: ['https://example.com/image1.jpg'],
            });

          expect(createResponse.status).toBe(201);
          const createdProduct = createResponse.body.data;
          helpers.trackEntity('products', createdProduct.id);

          // Retrieve product
          const getResponse = await request(app)
            .get(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products/${createdProduct.id}`);

          expect(getResponse.status).toBe(200);
          const retrievedProduct = getResponse.body.data;

          // Verify equivalence
          expect(retrievedProduct.name).toBe(productData.name);
          expect(retrievedProduct.description).toBe(productData.description);
          expect(retrievedProduct.basePrice).toBe(productData.basePrice);

          results.passed++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Iteration ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Report results
      console.log(`\n📊 Property 5 Test Results:`);
      console.log(`   ✅ Passed: ${results.passed}/${iterations}`);
      console.log(`   ❌ Failed: ${results.failed}/${iterations}`);
      
      if (results.failed > 0) {
        console.log(`\n❌ Failed iterations:`);
        results.errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
        if (results.errors.length > 5) {
          console.log(`   ... and ${results.errors.length - 5} more errors`);
        }
      }

      // Property should pass for all iterations
      expect(results.failed).toBe(0);
      expect(results.passed).toBe(iterations);
    }, 120000); // 2 minute timeout
  });

  /**
   * Property-Based Test: Product Update Persistence
   * 
   * Feature: backend-api-testing
   * Property 12: For any existing product, updating its data should persist 
   * the changes such that subsequent retrieval returns the updated data
   * Validates: Requirements 3.4
   */
  describe('Property 12: Entity Update Persistence', () => {
    it('should persist product updates (10 iterations)', async () => {
      const iterations = 10;
      const results = {
        passed: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < iterations; i++) {
        try {
          // Create product
          const { vendor, token } = await helpers.createAuthenticatedVendor();
          const category = await helpers.createTestCategory();
          const subcategory = await helpers.createTestSubcategory(category.id);
          const product = await helpers.createTestProduct(vendor.id, subcategory.id);

          // Update product
          const updatedName = `Updated Product ${Date.now()}`;
          const updateResponse = await request(app)
            .put(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products/${product.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
              name: updatedName,
            });

          expect(updateResponse.status).toBe(200);

          // Retrieve and verify
          const getResponse = await request(app)
            .get(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products/${product.id}`);

          expect(getResponse.status).toBe(200);
          expect(getResponse.body.data.name).toBe(updatedName);

          results.passed++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Iteration ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Report results
      console.log(`\n📊 Property 12 Test Results:`);
      console.log(`   ✅ Passed: ${results.passed}/${iterations}`);
      console.log(`   ❌ Failed: ${results.failed}/${iterations}`);
      
      if (results.failed > 0) {
        console.log(`\n❌ Failed iterations:`);
        results.errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
      }

      expect(results.failed).toBe(0);
      expect(results.passed).toBe(iterations);
    }, 120000);
  });

  /**
   * Property-Based Test: Product Deletion Verification
   * 
   * Feature: backend-api-testing
   * Property 13: For any existing product, deleting it should result in 
   * subsequent retrieval attempts returning 404 Not Found
   * Validates: Requirements 3.5
   */
  describe('Property 13: Entity Deletion Verification', () => {
    it('should verify product deletion (10 iterations)', async () => {
      const iterations = 10;
      const results = {
        passed: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < iterations; i++) {
        try {
          // Create product
          const { vendor, token } = await helpers.createAuthenticatedVendor();
          const category = await helpers.createTestCategory();
          const subcategory = await helpers.createTestSubcategory(category.id);
          const product = await helpers.createTestProduct(vendor.id, subcategory.id);

          // Delete product
          const deleteResponse = await request(app)
            .delete(`/api/v1/product/${product.id}`)
            .set('Authorization', `Bearer ${token}`);

          expect(deleteResponse.status).toBe(200);

          // Verify deletion
          const getResponse = await request(app)
            .get(`/api/v1/categories/${category.id}/subcategories/${subcategory.id}/products/${product.id}`);

          expect(getResponse.status).toBe(404);

          results.passed++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Iteration ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Report results
      console.log(`\n📊 Property 13 Test Results:`);
      console.log(`   ✅ Passed: ${results.passed}/${iterations}`);
      console.log(`   ❌ Failed: ${results.failed}/${iterations}`);
      
      if (results.failed > 0) {
        console.log(`\n❌ Failed iterations:`);
        results.errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
      }

      expect(results.failed).toBe(0);
      expect(results.passed).toBe(iterations);
    }, 120000);
  });

  /**
   * Vendor Product Filtering Tests
   * Requirements: 3.8
   */
  describe('Vendor Product Filtering', () => {
    it('should retrieve products filtered by vendor ID', async () => {
      const { vendor } = await helpers.createAuthenticatedVendor();
      const category = await helpers.createTestCategory();
      const subcategory = await helpers.createTestSubcategory(category.id);
      
      // Create products for this vendor
      await helpers.createTestProduct(vendor.id, subcategory.id);
      await helpers.createTestProduct(vendor.id, subcategory.id);

      const response = await request(app)
        .get(`/api/v1/vendors/${vendor.id}/products`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  /**
   * Property-Based Test: Vendor Product Filtering
   * 
   * Feature: backend-api-testing
   * Property 21: For any vendor ID, retrieving products by vendor should 
   * return only products belonging to that vendor
   * Validates: Requirements 3.8
   */
  describe('Property 21: Vendor Product Filtering', () => {
    it('should return only vendor-specific products (5 iterations)', async () => {
      const iterations = 5;
      const results = {
        passed: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < iterations; i++) {
        try {
          // Create two vendors
          const { vendor: vendor1 } = await helpers.createAuthenticatedVendor();
          const { vendor: vendor2 } = await helpers.createAuthenticatedVendor();
          
          const category = await helpers.createTestCategory();
          const subcategory = await helpers.createTestSubcategory(category.id);
          
          // Create products for each vendor
          await helpers.createTestProduct(vendor1.id, subcategory.id);
          await helpers.createTestProduct(vendor2.id, subcategory.id);

          // Get vendor1's products
          const response = await request(app)
            .get(`/api/v1/vendors/${vendor1.id}/products`);

          expect(response.status).toBe(200);
          
          // Verify all products belong to vendor1
          if (response.body.data?.products) {
            const products = response.body.data.products;
            products.forEach((product: any) => {
              expect(product.vendorId || product.vendor?.id).toBe(vendor1.id);
            });
          }

          results.passed++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Iteration ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Report results
      console.log(`\n📊 Property 21 Test Results:`);
      console.log(`   ✅ Passed: ${results.passed}/${iterations}`);
      console.log(`   ❌ Failed: ${results.failed}/${iterations}`);
      
      if (results.failed > 0) {
        console.log(`\n❌ Failed iterations:`);
        results.errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
      }

      expect(results.failed).toBe(0);
      expect(results.passed).toBe(iterations);
    }, 120000);
  });
});
