import { TestHelpers } from './testHelpers';
import { TestDatabase } from './testDatabase';
import { UserRole } from '../../entities/user.entity';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../config/jwt.config';

/**
 * Property-Based Test for TestHelpers
 * 
 * Feature: backend-api-testing
 * Property 1: Authentication Token Validity
 * Validates: Requirements 1.5, 2.1, 2.2, 2.5
 * 
 * For any valid user credentials (user, admin, vendor, staff), 
 * authenticating should generate a valid JWT token that can be 
 * used to access protected endpoints
 */
describe('TestHelpers - Property Tests', () => {
  let testDb: TestDatabase;
  let helpers: TestHelpers;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.connect();
    await testDb.runMigrations();
    
    helpers = new TestHelpers(testDb.getConnection());
  });

  afterAll(async () => {
    await testDb.clearTestData();
    await testDb.disconnect();
  });

  afterEach(async () => {
    // Clean up after each test
    await helpers.cleanupTestData();
  });

  describe('Property 1: Authentication Token Validity', () => {
    /**
     * Feature: backend-api-testing
     * Property 1: For any valid user credentials, authenticating should 
     * generate a valid JWT token that can be used to access protected endpoints
     * Validates: Requirements 1.5, 2.1, 2.2, 2.5
     */
    it('should generate valid tokens for regular users (100 iterations)', async () => {
      const iterations = 100;
      
      for (let i = 0; i < 100; i++) {
        // Create authenticated user
        const { user, token } = await helpers.createAuthenticatedUser();

        // Verify user was created
        expect(user).toBeDefined();
        expect(user.id).toBeDefined();
        expect(user.email).toBeTruthy();
        expect(user.role).toBe(UserRole.USER);

        // Verify token was generated
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');

        // Verify token is valid JWT
        const decoded = jwt.verify(token, getJwtSecret()) as any;
        expect(decoded).toBeDefined();
        expect(decoded.id).toBe(user.id);
        expect(decoded.role).toBe(UserRole.USER);
        expect(decoded.type).toBe('access');

        // Verify token has not expired
        expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
      }
    }, 60000); // Increased timeout for 100 iterations

    it('should generate valid tokens for admin users (100 iterations)', async () => {
      for (let i = 0; i < 100; i++) {
        // Create authenticated admin
        const { user: admin, token } = await helpers.createAuthenticatedAdmin();

        // Verify admin was created
        expect(admin).toBeDefined();
        expect(admin.id).toBeDefined();
        expect(admin.role).toBe(UserRole.ADMIN);

        // Verify token was generated
        expect(token).toBeTruthy();

        // Verify token is valid JWT
        const decoded = jwt.verify(token, getJwtSecret()) as any;
        expect(decoded).toBeDefined();
        expect(decoded.id).toBe(admin.id);
        expect(decoded.role).toBe(UserRole.ADMIN);
        expect(decoded.type).toBe('access');

        // Verify token has not expired
        expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
      }
    }, 60000);

    it('should generate valid tokens for staff users (100 iterations)', async () => {
      for (let i = 0; i < 100; i++) {
        // Create authenticated staff
        const { user: staff, token } = await helpers.createAuthenticatedStaff();

        // Verify staff was created
        expect(staff).toBeDefined();
        expect(staff.id).toBeDefined();
        expect(staff.role).toBe(UserRole.STAFF);

        // Verify token was generated
        expect(token).toBeTruthy();

        // Verify token is valid JWT
        const decoded = jwt.verify(token, getJwtSecret()) as any;
        expect(decoded).toBeDefined();
        expect(decoded.id).toBe(staff.id);
        expect(decoded.role).toBe(UserRole.STAFF);
        expect(decoded.type).toBe('access');

        // Verify token has not expired
        expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
      }
    }, 60000);

    it('should generate valid tokens for vendors (100 iterations)', async () => {
      for (let i = 0; i < 100; i++) {
        // Create authenticated vendor
        const { vendor, token } = await helpers.createAuthenticatedVendor();

        // Verify vendor was created
        expect(vendor).toBeDefined();
        expect(vendor.id).toBeDefined();
        expect(vendor.email).toBeTruthy();
        expect(vendor.isVerified).toBe(true);
        expect(vendor.isApproved).toBe(true);

        // Verify token was generated
        expect(token).toBeTruthy();

        // Verify token is valid JWT
        const decoded = jwt.verify(token, getJwtSecret()) as any;
        expect(decoded).toBeDefined();
        expect(decoded.id).toBe(vendor.id);
        expect(decoded.email).toBe(vendor.email);
        expect(decoded.role).toBe('vendor');
        expect(decoded.type).toBe('access');

        // Verify token has not expired
        expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
      }
    }, 60000);

    it('should generate unique tokens for different users', async () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 50; i++) {
        const { token } = await helpers.createAuthenticatedUser();
        
        // Verify token is unique
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }

      // Verify we generated 50 unique tokens
      expect(tokens.size).toBe(50);
    }, 60000);

    it('should generate expired tokens correctly', async () => {
      const { user } = await helpers.createAuthenticatedUser();
      
      // Generate expired token
      const expiredToken = helpers.generateExpiredToken(user.id, user.role);

      // Verify token is a string
      expect(expiredToken).toBeTruthy();
      expect(typeof expiredToken).toBe('string');

      // Verify token is expired (should throw error when verified)
      expect(() => {
        jwt.verify(expiredToken, getJwtSecret());
      }).toThrow();
    });
  });

  describe('Entity Creation with ID Tracking', () => {
    it('should track created user IDs', async () => {
      const { user } = await helpers.createAuthenticatedUser();
      
      const trackedIds = helpers.getTrackedEntities();
      expect(trackedIds.users).toContain(user.id);
    });

    it('should track created vendor IDs', async () => {
      const { vendor } = await helpers.createAuthenticatedVendor();
      
      const trackedIds = helpers.getTrackedEntities();
      expect(trackedIds.vendors).toContain(vendor.id);
    });

    it('should track created category IDs', async () => {
      const category = await helpers.createTestCategory();
      
      const trackedIds = helpers.getTrackedEntities();
      expect(trackedIds.categories).toContain(category.id);
    });

    it('should track created product IDs', async () => {
      const { vendor } = await helpers.createAuthenticatedVendor();
      const category = await helpers.createTestCategory();
      const subcategory = await helpers.createTestSubcategory(category.id);
      const product = await helpers.createTestProduct(vendor.id, subcategory.id);
      
      const trackedIds = helpers.getTrackedEntities();
      expect(trackedIds.products).toContain(product.id);
    });

    it('should track multiple entity types', async () => {
      const { user } = await helpers.createAuthenticatedUser();
      const { vendor } = await helpers.createAuthenticatedVendor();
      const category = await helpers.createTestCategory();
      const district = await helpers.createTestDistrict();
      
      const trackedIds = helpers.getTrackedEntities();
      expect(trackedIds.users).toContain(user.id);
      expect(trackedIds.vendors).toContain(vendor.id);
      expect(trackedIds.categories).toContain(category.id);
      expect(trackedIds.districts).toContain(district.id);
    });
  });

  describe('Custom Assertions', () => {
    it('should validate validation error responses', () => {
      const mockResponse = {
        status: 400,
        body: {
          success: false,
          errors: [
            { field: 'email', message: 'Invalid email format' },
          ],
        },
      };

      helpers.expectValidationError(mockResponse, 'email');
    });

    it('should validate unauthorized responses', () => {
      const mockResponse = {
        status: 401,
        body: {
          success: false,
          message: 'Unauthorized',
        },
      };

      helpers.expectUnauthorized(mockResponse);
    });

    it('should validate forbidden responses', () => {
      const mockResponse = {
        status: 403,
        body: {
          success: false,
          message: 'Forbidden',
        },
      };

      helpers.expectForbidden(mockResponse);
    });

    it('should validate not found responses', () => {
      const mockResponse = {
        status: 404,
        body: {
          success: false,
          message: 'Not found',
        },
      };

      helpers.expectNotFound(mockResponse);
    });

    it('should validate conflict responses', () => {
      const mockResponse = {
        status: 409,
        body: {
          success: false,
          message: 'Conflict',
        },
      };

      helpers.expectConflict(mockResponse);
    });

    it('should validate success responses', () => {
      const mockResponse = {
        status: 200,
        body: {
          success: true,
          data: { id: 1 },
        },
      };

      helpers.expectSuccess(mockResponse, 200);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up tracked entities', async () => {
      // Create some entities
      const { user } = await helpers.createAuthenticatedUser();
      const category = await helpers.createTestCategory();
      
      // Verify they're tracked
      let trackedIds = helpers.getTrackedEntities();
      expect(trackedIds.users.length).toBeGreaterThan(0);
      expect(trackedIds.categories.length).toBeGreaterThan(0);

      // Clean up
      await helpers.cleanupTestData();

      // Verify tracking was cleared
      trackedIds = helpers.getTrackedEntities();
      expect(trackedIds.users.length).toBe(0);
      expect(trackedIds.categories.length).toBe(0);
    });

    it('should handle cleanup of entities with dependencies', async () => {
      // Create entities with dependencies
      const { vendor } = await helpers.createAuthenticatedVendor();
      const category = await helpers.createTestCategory();
      const subcategory = await helpers.createTestSubcategory(category.id);
      const product = await helpers.createTestProduct(vendor.id, subcategory.id);

      // Clean up (should handle foreign key constraints)
      await helpers.cleanupTestData();

      // Verify all were cleaned up
      const trackedIds = helpers.getTrackedEntities();
      expect(trackedIds.products.length).toBe(0);
      expect(trackedIds.subcategories.length).toBe(0);
      expect(trackedIds.categories.length).toBe(0);
      expect(trackedIds.vendors.length).toBe(0);
    });
  });
});
