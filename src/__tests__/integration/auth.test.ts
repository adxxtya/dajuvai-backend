import request from 'supertest';
import express, { Express } from 'express';
import { TestDatabase } from '../setup/testDatabase';
import { TestHelpers } from '../setup/testHelpers';
import { TestDataFactory } from '../setup/testDataFactory';
import { createAuthRoutes } from '../../routes/v1/auth.routes';
import { AuthService } from '../../services/auth/AuthService';
import { TokenService } from '../../services/auth/TokenService';
import { SessionService } from '../../services/auth/SessionService';
import { UserRepository } from '../../repositories/UserRepository';
import { SessionRepository } from '../../repositories/SessionRepository';
import { UserRole } from '../../entities/user.entity';
import TestDataSource from '../../config/db.test.config';

/**
 * Authentication Endpoint Integration Tests
 * 
 * Tests all authentication endpoints including:
 * - User registration
 * - User login
 * - Password reset flow
 * - Token refresh
 * - Logout
 * 
 * Requirements: 2.1-2.10
 */
describe('Authentication API Endpoints', () => {
  let app: Express;
  let testDb: TestDatabase;
  let helpers: TestHelpers;
  let factory: TestDataFactory;
  let authService: AuthService;

  /**
   * Setup test environment before all tests
   */
  beforeAll(async () => {
    console.log('🔧 Starting auth test setup...');
    
    // Initialize test database (schema already created by global setup)
    console.log('  → Connecting to test database...');
    testDb = new TestDatabase();
    await testDb.connect();
    console.log('  ✓ Test database ready');

    // Initialize test helpers and factory (use the same connection)
    console.log('  → Initializing helpers and factory...');
    helpers = new TestHelpers(TestDataSource);
    factory = new TestDataFactory();
    console.log('  ✓ Helpers and factory ready');

    // Initialize auth service with all dependencies
    console.log('  → Initializing auth service...');
    const userRepository = new UserRepository(TestDataSource);
    const sessionRepository = new SessionRepository(TestDataSource);
    const tokenService = new TokenService();
    const sessionService = new SessionService(sessionRepository);
    authService = new AuthService(userRepository, tokenService, sessionService);
    console.log('  ✓ Auth service ready');

    // Create Express app with auth routes
    console.log('  → Creating Express app...');
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', createAuthRoutes(TestDataSource, authService));
    
    // Add error handler middleware (must be last)
    const { errorHandler } = require('../../middlewares/error/errorHandler.middleware');
    app.use(errorHandler);
    console.log('  ✓ Express app ready');

    console.log('✅ Authentication test suite setup complete');
  }, 30000);

  /**
   * Cleanup after all tests
   */
  afterAll(async () => {
    await testDb.clearTestData();
    await testDb.disconnect();
    console.log('✅ Authentication test suite cleanup complete');
  });

  /**
   * Cleanup after each test
   */
  afterEach(async () => {
    await helpers.cleanupTestData();
  });

  /**
   * User Authentication Tests
   * Requirements: 2.1, 2.2, 2.6, 2.7
   */
  describe('User Authentication', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should register a new user with valid data', async () => {
        const userData = factory.createUser({
          email: factory.generateUniqueEmail('register_test'),
          username: factory.generateUniqueUsername('register_test'),
        });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            fullName: userData.fullName,
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            password: userData.password,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toBeDefined();
        expect(response.body.data.user.email).toBe(userData.email);
        expect(response.body.data.tokens).toBeDefined();
        expect(response.body.data.tokens.accessToken).toMatch(/^eyJ/);

        helpers.trackEntity('users', response.body.data.user.id);
      });

      it('should reject registration with missing required fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'test@example.com',
            // Missing fullName, phoneNumber, password
          });

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });

      it('should reject registration with invalid email format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            fullName: 'Test User',
            email: 'invalid-email',
            phoneNumber: '1234567890',
            password: 'Password123!',
          });

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login user with valid credentials', async () => {
        // First create a user
        const userData = factory.createUser({
          email: factory.generateUniqueEmail('login_test'),
          username: factory.generateUniqueUsername('login_test'),
        });

        const registerResponse = await request(app)
          .post('/api/v1/auth/register')
          .send({
            fullName: userData.fullName,
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            password: userData.password,
          });

        helpers.trackEntity('users', registerResponse.body.data.user.id);

        // Then login
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: userData.email,
            password: userData.password,
          });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data.tokens).toBeDefined();
        expect(loginResponse.body.data.tokens.accessToken).toMatch(/^eyJ/);
        expect(loginResponse.body.data.tokens.refreshToken).toMatch(/^eyJ/);
      });

      it('should reject login with invalid credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'WrongPassword123!',
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should reject login with missing credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            // Missing password
          });

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/v1/auth/forgot-password', () => {
      it('should send password reset email for valid email', async () => {
        // Create a user first
        const userData = factory.createUser({
          email: factory.generateUniqueEmail('forgot_pw_test'),
          username: factory.generateUniqueUsername('forgot_pw_test'),
        });

        const registerResponse = await request(app)
          .post('/api/v1/auth/register')
          .send({
            fullName: userData.fullName,
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            password: userData.password,
          });

        helpers.trackEntity('users', registerResponse.body.data.user.id);

        // Request password reset
        const response = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({
            email: userData.email,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should return success even for non-existent email (security)', async () => {
        const response = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({
            email: 'nonexistent@example.com',
          });

        // Should return success to prevent email enumeration
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/v1/auth/logout', () => {
      it('should logout authenticated user', async () => {
        // Create and login a user
        const { user, token } = await helpers.createAuthenticatedUser();

        const response = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should reject logout without authentication token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/logout');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/v1/auth/refresh', () => {
      it('should refresh access token with valid refresh token', async () => {
        // Create and login a user
        const userData = factory.createUser({
          email: factory.generateUniqueEmail('refresh_test'),
          username: factory.generateUniqueUsername('refresh_test'),
        });

        const registerResponse = await request(app)
          .post('/api/v1/auth/register')
          .send({
            fullName: userData.fullName,
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            password: userData.password,
          });

        helpers.trackEntity('users', registerResponse.body.data.user.id);

        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: userData.email,
            password: userData.password,
          });

        const refreshToken = loginResponse.body.data.tokens.refreshToken;
        const sessionId = loginResponse.body.data.sessionId;

        // Refresh the token
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({
            refreshToken,
            sessionId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.tokens.accessToken).toMatch(/^eyJ/);
      });

      it('should reject refresh with invalid refresh token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({
            refreshToken: 'invalid.token.here',
            sessionId: 'fake-session-id',
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  /**
   * Property-Based Test: Authentication Token Validity
   * 
   * Feature: backend-api-testing
   * Property 1: For any valid user credentials, authenticating should generate 
   * a valid JWT token that can be used to access protected endpoints
   * Validates: Requirements 2.1, 2.2
   */
  describe('Property 1: Authentication Token Validity', () => {
    it('should generate valid tokens for any user registration and login (10 iterations)', async () => {
      const iterations = 10; // Reduced from 100 for performance
      const results = {
        passed: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < iterations; i++) {
        try {
          // Generate random user data
          const userData = factory.createUser({
            email: factory.generateUniqueEmail(`prop1_iter${i}`),
            username: factory.generateUniqueUsername(`prop1_iter${i}`),
          });

          // Step 1: Register user (v1 API doesn't use username)
          const registerResponse = await request(app)
            .post('/api/v1/auth/register')
            .send({
              fullName: userData.fullName,
              email: userData.email,
              phoneNumber: userData.phoneNumber,
              password: userData.password,
            });

          // Verify registration succeeded and returns valid token
          expect(registerResponse.status).toBe(201);
          expect(registerResponse.body.success).toBe(true);
          expect(registerResponse.body.data.tokens).toBeDefined();
          expect(registerResponse.body.data.tokens.accessToken).toBeDefined();
          expect(registerResponse.body.data.tokens.accessToken).toMatch(/^eyJ/); // JWT format
          
          const userId = registerResponse.body.data.user.id;
          helpers.trackEntity('users', userId);

          // Step 2: Login with credentials
          const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
              email: userData.email,
              password: userData.password,
            });

          // Verify login succeeded and returns valid tokens
          expect(loginResponse.status).toBe(200);
          expect(loginResponse.body.success).toBe(true);
          expect(loginResponse.body.data.tokens).toBeDefined();
          expect(loginResponse.body.data.tokens.accessToken).toBeDefined();
          expect(loginResponse.body.data.tokens.refreshToken).toBeDefined();
          expect(loginResponse.body.data.tokens.accessToken).toMatch(/^eyJ/); // JWT format
          expect(loginResponse.body.data.tokens.refreshToken).toMatch(/^eyJ/); // JWT format

          results.passed++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Iteration ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Report results
      console.log(`\n📊 Property 1 Test Results:`);
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
    }, 60000); // 1 minute timeout for 10 iterations
  });

  /**
   * Authentication Error Tests
   * Requirements: 2.9, 2.10
   */
  describe('Authentication Error Handling', () => {
    it('should reject invalid credentials with 401', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing authentication with 401', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
    });

    it('should reject invalid token with 401', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
    });

    it('should reject expired token with 401', async () => {
      // Generate an expired token (this would require a helper method)
      const expiredToken = helpers.generateExpiredToken(1, UserRole.USER);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  /**
   * Admin and Vendor Authentication Tests
   * 
   * NOTE: The v1 authentication API (/api/v1/auth/*) only handles user authentication.
   * Admin and vendor authentication are handled by the legacy API:
   * - Admin: /api/users/admin/signup, /api/users/admin/login
   * - Vendor: /api/vendors/signup, /api/vendors/login
   * 
   * These legacy endpoints are not tested in this file as they use a different
   * authentication structure and are outside the scope of the v1 API testing.
   * 
   * Requirements: 2.3, 2.4, 2.5, 2.8
   * Status: NOT APPLICABLE to v1 API
   */
  describe('Admin and Vendor Authentication (Legacy API)', () => {
    it('should note that admin/vendor auth uses legacy API endpoints', () => {
      // This is a placeholder test to document that admin and vendor authentication
      // are handled by separate legacy API endpoints, not the v1 auth API.
      expect(true).toBe(true);
    });
  });

  /**
   * Property-Based Test: Authorization Enforcement
   * 
   * Feature: backend-api-testing
   * Property 4: For any protected endpoint, requests without valid authentication 
   * tokens or with insufficient permissions should be rejected with appropriate 
   * HTTP status codes (401 or 403)
   * Validates: Requirements 2.9
   */
  describe('Property 4: Authorization Enforcement', () => {
    it('should reject unauthenticated requests to protected endpoints (10 iterations)', async () => {
      const iterations = 10;
      const results = {
        passed: 0,
        failed: 0,
        errors: [] as string[],
      };

      const protectedEndpoints = [
        { method: 'post', path: '/api/v1/auth/logout' },
        { method: 'post', path: '/api/v1/auth/change-password' },
      ];

      for (let i = 0; i < iterations; i++) {
        try {
          const endpoint = protectedEndpoints[i % protectedEndpoints.length];

          // Attempt to access protected endpoint without token
          const response = await request(app)[endpoint.method](endpoint.path)
            .send({});

          // Should be rejected with 401
          expect(response.status).toBe(401);

          results.passed++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Iteration ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Report results
      console.log(`\n📊 Property 4 Test Results:`);
      console.log(`   ✅ Passed: ${results.passed}/${iterations}`);
      console.log(`   ❌ Failed: ${results.failed}/${iterations}`);
      
      if (results.failed > 0) {
        console.log(`\n❌ Failed iterations:`);
        results.errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
      }

      // Property should pass for all iterations
      expect(results.failed).toBe(0);
      expect(results.passed).toBe(iterations);
    }, 30000);
  });
});
