import { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../../entities/user.entity';
import { Vendor } from '../../entities/vendor.entity';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Subcategory } from '../../entities/subcategory.entity';
import { Order } from '../../entities/order.entity';
import { Cart } from '../../entities/cart.entity';
import { Wishlist } from '../../entities/wishlist.entity';
import { District } from '../../entities/district.entity';
import { Address } from '../../entities/address.entity';
import { Brand } from '../../entities/brand.entity';
import { TestDataFactory } from './testDataFactory';
import { TestEntityIds } from './testDatabase';
import TestDataSource from '../../config/db.test.config';
import { getJwtSecret, getTokenConfig } from '../../config/jwt.config';
import { USER_ROLES } from '../../config/constants';

/**
 * Authentication tokens for different user types
 */
export interface AuthTokens {
  userToken: string;
  adminToken: string;
  vendorToken: string;
  staffToken: string;
}

/**
 * Authenticated user with token
 */
export interface AuthenticatedUser {
  user: User;
  token: string;
}

/**
 * Authenticated vendor with token
 */
export interface AuthenticatedVendor {
  vendor: Vendor;
  token: string;
}

/**
 * TestHelpers class providing utility methods for test operations
 * 
 * Features:
 * - Authentication helpers for different user types
 * - Entity creation helpers with automatic ID tracking
 * - Cleanup utilities for selective deletion
 * - Custom assertion helpers
 * - Token generation utilities
 * 
 * Requirements: 1.5, 1.9, 1.10
 */
export class TestHelpers {
  private connection: DataSource;
  private factory: TestDataFactory;
  private createdEntityIds: TestEntityIds;

  constructor(connection: DataSource) {
    this.connection = connection;
    this.factory = new TestDataFactory();
    this.createdEntityIds = this.initializeEntityIds();
  }

  /**
   * Initialize empty entity ID tracking structure
   */
  private initializeEntityIds(): TestEntityIds {
    return {
      users: [],
      vendors: [],
      products: [],
      categories: [],
      subcategories: [],
      orders: [],
      orderItems: [],
      carts: [],
      cartItems: [],
      wishlists: [],
      wishlistItems: [],
      banners: [],
      deals: [],
      promos: [],
      districts: [],
      reviews: [],
      notifications: [],
      contacts: [],
      addresses: [],
      brands: [],
      variants: [],
      homePageSections: [],
      homeCategories: [],
      sessions: [],
    };
  }

  /**
   * Track a created entity ID for later cleanup
   * 
   * Requirements: 1.9, 1.10
   * 
   * @param entityType - The type of entity
   * @param id - The ID of the created entity
   */
  trackEntity(entityType: keyof TestEntityIds, id: number): void {
    if (!this.createdEntityIds[entityType]) {
      console.warn(`⚠️  Unknown entity type: ${entityType}`);
      return;
    }

    if (!this.createdEntityIds[entityType].includes(id)) {
      this.createdEntityIds[entityType].push(id);
    }
  }

  /**
   * Get all tracked entity IDs
   * 
   * Requirements: 1.9, 1.10
   * 
   * @returns Copy of tracked entity IDs
   */
  getTrackedEntities(): TestEntityIds {
    return { ...this.createdEntityIds };
  }

  /**
   * Clear all tracked entity IDs
   */
  clearTrackedEntities(): void {
    this.createdEntityIds = this.initializeEntityIds();
  }

  /**
   * Create an authenticated user with JWT token
   * 
   * Requirements: 1.5, 2.1, 2.2
   * 
   * @param overrides - Optional user data overrides
   * @returns User entity and authentication token
   */
  async createAuthenticatedUser(overrides?: Partial<User>): Promise<AuthenticatedUser> {
    const userRepository = this.connection.getRepository(User);
    
    // Generate unique user data
    const userData = this.factory.createUser({
      email: this.factory.generateUniqueEmail('user'),
      username: this.factory.generateUniqueUsername('user'),
      ...overrides,
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = userRepository.create({
      ...userData,
      password: hashedPassword,
    });

    const savedUser = await userRepository.save(user);
    
    // Track created user
    this.trackEntity('users', savedUser.id);

    // Generate token
    const token = this.generateAuthToken(savedUser.id, savedUser.role);

    return { user: savedUser, token };
  }

  /**
   * Create an authenticated admin user with JWT token
   * 
   * Requirements: 1.5, 2.3
   * 
   * @param overrides - Optional user data overrides
   * @returns Admin user entity and authentication token
   */
  async createAuthenticatedAdmin(overrides?: Partial<User>): Promise<AuthenticatedUser> {
    return this.createAuthenticatedUser({
      role: UserRole.ADMIN,
      email: this.factory.generateUniqueEmail('admin'),
      username: this.factory.generateUniqueUsername('admin'),
      ...overrides,
    });
  }

  /**
   * Create an authenticated staff user with JWT token
   * 
   * Requirements: 1.5, 2.8
   * 
   * @param overrides - Optional user data overrides
   * @returns Staff user entity and authentication token
   */
  async createAuthenticatedStaff(overrides?: Partial<User>): Promise<AuthenticatedUser> {
    return this.createAuthenticatedUser({
      role: UserRole.STAFF,
      email: this.factory.generateUniqueEmail('staff'),
      username: this.factory.generateUniqueUsername('staff'),
      ...overrides,
    });
  }

  /**
   * Create an authenticated vendor with JWT token
   * 
   * Requirements: 1.5, 2.4, 2.5
   * 
   * @param overrides - Optional vendor data overrides
   * @returns Vendor entity and authentication token
   */
  async createAuthenticatedVendor(overrides?: Partial<Vendor>): Promise<AuthenticatedVendor> {
    const vendorRepository = this.connection.getRepository(Vendor);
    
    // Ensure district exists
    let districtId = overrides?.districtId;
    if (!districtId) {
      const district = await this.createTestDistrict();
      districtId = district.id;
    }

    // Generate unique vendor data
    const vendorData = this.factory.createVendor({
      email: this.factory.generateUniqueEmail('vendor'),
      districtId,
      ...overrides,
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(vendorData.password, 10);

    // Create vendor
    const vendor = vendorRepository.create({
      ...vendorData,
      password: hashedPassword,
    });

    const savedVendor = await vendorRepository.save(vendor);
    
    // Track created vendor
    this.trackEntity('vendors', savedVendor.id);

    // Generate token (vendors use a special role identifier)
    const token = this.generateVendorAuthToken(savedVendor.id, savedVendor.email, savedVendor.businessName);

    return { vendor: savedVendor, token };
  }

  /**
   * Create a test product
   * 
   * Requirements: 1.5, 3.1
   * 
   * @param vendorId - Vendor ID who owns the product
   * @param subcategoryId - Subcategory ID for the product
   * @param overrides - Optional product data overrides
   * @returns Product entity
   */
  async createTestProduct(
    vendorId: number,
    subcategoryId: number,
    overrides?: Partial<Product>
  ): Promise<Product> {
    const productRepository = this.connection.getRepository(Product);
    
    const productData = this.factory.createProduct({
      vendorId,
      subcategoryId,
      ...overrides,
    });

    const product = productRepository.create(productData);
    const savedProduct = await productRepository.save(product);
    
    // Track created product
    this.trackEntity('products', savedProduct.id);

    return savedProduct;
  }

  /**
   * Create a test category
   * 
   * Requirements: 1.5, 7.1
   * 
   * @param overrides - Optional category data overrides
   * @returns Category entity
   */
  async createTestCategory(overrides?: Partial<Category>): Promise<Category> {
    const categoryRepository = this.connection.getRepository(Category);
    
    const categoryData = this.factory.createCategory({
      name: `Test Category ${Date.now()}`,
      ...overrides,
    });

    const category = categoryRepository.create(categoryData);
    const savedCategory = await categoryRepository.save(category);
    
    // Track created category
    this.trackEntity('categories', savedCategory.id);

    return savedCategory;
  }

  /**
   * Create a test subcategory
   * 
   * Requirements: 1.5, 7.6
   * 
   * @param categoryId - Parent category ID
   * @param overrides - Optional subcategory data overrides
   * @returns Subcategory entity
   */
  async createTestSubcategory(
    categoryId: number,
    overrides?: Partial<Subcategory>
  ): Promise<Subcategory> {
    const subcategoryRepository = this.connection.getRepository(Subcategory);
    const categoryRepository = this.connection.getRepository(Category);
    
    const category = await categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found`);
    }

    const subcategoryData = this.factory.createSubcategory({
      name: `Test Subcategory ${Date.now()}`,
      ...overrides,
    });

    const subcategory = subcategoryRepository.create({
      ...subcategoryData,
      category,
    });
    
    const savedSubcategory = await subcategoryRepository.save(subcategory);
    
    // Track created subcategory
    this.trackEntity('subcategories', savedSubcategory.id);

    return savedSubcategory;
  }

  /**
   * Create a test order
   * 
   * Requirements: 1.5, 4.1
   * 
   * @param userId - User ID who placed the order
   * @param overrides - Optional order data overrides
   * @returns Order entity
   */
  async createTestOrder(userId: number, overrides?: Partial<Order>): Promise<Order> {
    const orderRepository = this.connection.getRepository(Order);
    
    const orderData = this.factory.createOrder({
      orderedById: userId,
      ...overrides,
    });

    const order = orderRepository.create(orderData);
    const savedOrder = await orderRepository.save(order);
    
    // Track created order
    this.trackEntity('orders', savedOrder.id);

    return savedOrder;
  }

  /**
   * Create a test cart
   * 
   * Requirements: 1.5, 5.1
   * 
   * @param userId - User ID who owns the cart
   * @param overrides - Optional cart data overrides
   * @returns Cart entity
   */
  async createTestCart(userId: number, overrides?: Partial<Cart>): Promise<Cart> {
    const cartRepository = this.connection.getRepository(Cart);
    
    const cartData = this.factory.createCart({
      userId,
      ...overrides,
    });

    const cart = cartRepository.create(cartData);
    const savedCart = await cartRepository.save(cart);
    
    // Track created cart
    this.trackEntity('carts', savedCart.id);

    return savedCart;
  }

  /**
   * Create a test wishlist
   * 
   * Requirements: 1.5, 6.1
   * 
   * @param userId - User ID who owns the wishlist
   * @param overrides - Optional wishlist data overrides
   * @returns Wishlist entity
   */
  async createTestWishlist(userId: number, overrides?: Partial<Wishlist>): Promise<Wishlist> {
    const wishlistRepository = this.connection.getRepository(Wishlist);
    
    const wishlistData = this.factory.createWishlist({
      userId,
      ...overrides,
    });

    const wishlist = wishlistRepository.create(wishlistData);
    const savedWishlist = await wishlistRepository.save(wishlist);
    
    // Track created wishlist
    this.trackEntity('wishlists', savedWishlist.id);

    return savedWishlist;
  }

  /**
   * Create a test district
   * 
   * Requirements: 1.5, 11.1
   * 
   * @param overrides - Optional district data overrides
   * @returns District entity
   */
  async createTestDistrict(overrides?: Partial<District>): Promise<District> {
    const districtRepository = this.connection.getRepository(District);
    
    const districtData = this.factory.createDistrict({
      name: `Test District ${Date.now()}`,
      ...overrides,
    });

    const district = districtRepository.create(districtData);
    const savedDistrict = await districtRepository.save(district);
    
    // Track created district
    this.trackEntity('districts', savedDistrict.id);

    return savedDistrict;
  }

  /**
   * Create a test address
   * 
   * Requirements: 1.5
   * 
   * @param userId - User ID who owns the address
   * @param overrides - Optional address data overrides
   * @returns Address entity
   */
  async createTestAddress(userId: number, overrides?: Partial<Address>): Promise<Address> {
    const addressRepository = this.connection.getRepository(Address);
    
    const addressData = this.factory.createAddress({
      userId,
      ...overrides,
    });

    const address = addressRepository.create(addressData);
    const savedAddress = await addressRepository.save(address);
    
    // Track created address
    this.trackEntity('addresses', savedAddress.id);

    return savedAddress;
  }

  /**
   * Create a test brand
   * 
   * Requirements: 1.5
   * 
   * @param overrides - Optional brand data overrides
   * @returns Brand entity
   */
  async createTestBrand(overrides?: Partial<Brand>): Promise<Brand> {
    const brandRepository = this.connection.getRepository(Brand);
    
    const brandData = this.factory.createBrand({
      name: `Test Brand ${Date.now()}`,
      ...overrides,
    });

    const brand = brandRepository.create(brandData);
    const savedBrand = await brandRepository.save(brand);
    
    // Track created brand
    this.trackEntity('brands', savedBrand.id);

    return savedBrand;
  }

  /**
   * Generate authentication token for a user
   * 
   * Requirements: 1.5, 2.1, 2.2, 2.5
   * 
   * @param userId - User ID
   * @param role - User role
   * @returns JWT token string
   */
  generateAuthToken(userId: number, role: UserRole): string {
    const secret = getJwtSecret();
    const config = getTokenConfig(role);

    const payload = {
      id: userId,
      role,
      type: 'access',
    };

    return jwt.sign(payload, secret, {
      expiresIn: config.ACCESS_TOKEN_EXPIRY,
      issuer: 'dajuvai-api',
      audience: 'dajuvai-client',
    });
  }

  /**
   * Generate authentication token for a vendor
   * 
   * Requirements: 1.5, 2.4, 2.5
   * 
   * @param vendorId - Vendor ID
   * @param email - Vendor email
   * @param businessName - Vendor business name
   * @returns JWT token string
   */
  generateVendorAuthToken(vendorId: number, email: string, businessName: string): string {
    const secret = getJwtSecret();
    const config = getTokenConfig(USER_ROLES.VENDOR as any);

    const payload = {
      id: vendorId,
      email,
      businessName,
      role: USER_ROLES.VENDOR,
      type: 'access',
    };

    return jwt.sign(payload, secret, {
      expiresIn: config.ACCESS_TOKEN_EXPIRY,
      issuer: 'dajuvai-api',
      audience: 'dajuvai-client',
    });
  }

  /**
   * Generate an expired token for testing token expiration
   * 
   * @param userId - User ID
   * @param role - User role
   * @returns Expired JWT token string
   */
  generateExpiredToken(userId: number, role: UserRole): string {
    const secret = getJwtSecret();

    const payload = {
      id: userId,
      role,
      type: 'access',
    };

    return jwt.sign(payload, secret, {
      expiresIn: '-1h', // Expired 1 hour ago
      issuer: 'dajuvai-api',
      audience: 'dajuvai-client',
    });
  }

  /**
   * Clean up test data by deleting tracked entities
   * 
   * CRITICAL SAFETY: Only deletes entities whose IDs were tracked
   * 
   * Requirements: 1.3, 1.9, 1.10
   * 
   * @param entityIds - Optional specific entity IDs to delete (defaults to all tracked)
   */
  async cleanupTestData(entityIds?: Partial<TestEntityIds>): Promise<void> {
    const idsToDelete = entityIds || this.createdEntityIds;

    const queryRunner = this.connection.createQueryRunner();
    
    try {
      await queryRunner.connect();
      
      // Start a fresh transaction for cleanup
      await queryRunner.startTransaction();

      // Delete in dependency order (children first, parents last)
      // Continue even if some deletions fail
      
      // Level 1: Delete dependent items
      await this.deleteEntitiesSafe(queryRunner, 'order_items', idsToDelete.orderItems || []);
      await this.deleteEntitiesSafe(queryRunner, 'cart_items', idsToDelete.cartItems || []);
      await this.deleteEntitiesSafe(queryRunner, 'wishlist_items', idsToDelete.wishlistItems || []);

      // Level 2: Delete entities dependent on users/products
      await this.deleteEntitiesSafe(queryRunner, 'orders', idsToDelete.orders || []);
      await this.deleteEntitiesSafe(queryRunner, 'carts', idsToDelete.carts || []);
      await this.deleteEntitiesSafe(queryRunner, 'wishlists', idsToDelete.wishlists || []);
      await this.deleteEntitiesSafe(queryRunner, 'reviews', idsToDelete.reviews || []);
      await this.deleteEntitiesSafe(queryRunner, 'notifications', idsToDelete.notifications || []);
      await this.deleteEntitiesSafe(queryRunner, 'sessions', idsToDelete.sessions || []);

      // Level 3: Delete products and variants
      await this.deleteEntitiesSafe(queryRunner, 'variants', idsToDelete.variants || []);
      await this.deleteEntitiesSafe(queryRunner, 'products', idsToDelete.products || []);

      // Level 4: Delete vendors and addresses
      await this.deleteEntitiesSafe(queryRunner, 'vendors', idsToDelete.vendors || []);
      await this.deleteEntitiesSafe(queryRunner, 'addresses', idsToDelete.addresses || []);

      // Level 5: Delete subcategories
      await this.deleteEntitiesSafe(queryRunner, 'subcategories', idsToDelete.subcategories || []);

      // Level 6: Delete independent entities
      await this.deleteEntitiesSafe(queryRunner, 'categories', idsToDelete.categories || []);
      await this.deleteEntitiesSafe(queryRunner, 'districts', idsToDelete.districts || []);
      await this.deleteEntitiesSafe(queryRunner, 'brands', idsToDelete.brands || []);
      await this.deleteEntitiesSafe(queryRunner, 'deals', idsToDelete.deals || []);
      await this.deleteEntitiesSafe(queryRunner, 'promos', idsToDelete.promos || []);
      await this.deleteEntitiesSafe(queryRunner, 'banners', idsToDelete.banners || []);
      await this.deleteEntitiesSafe(queryRunner, 'contacts', idsToDelete.contacts || []);
      await this.deleteEntitiesSafe(queryRunner, 'home_page_sections', idsToDelete.homePageSections || []);
      await this.deleteEntitiesSafe(queryRunner, 'home_categories', idsToDelete.homeCategories || []);

      // Level 7: Delete users last
      await this.deleteEntitiesSafe(queryRunner, 'users', idsToDelete.users || []);

      // Try to commit the transaction
      if (queryRunner.isTransactionActive) {
        await queryRunner.commitTransaction();
      }

      // Clear tracked IDs if we deleted all
      if (!entityIds) {
        this.clearTrackedEntities();
      }

    } catch (error) {
      // Rollback on error
      try {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      console.error('❌ Cleanup failed:', error);
      // Don't throw - allow tests to continue
    } finally {
      // Always release the query runner
      try {
        if (!queryRunner.isReleased) {
          await queryRunner.release();
        }
      } catch (releaseError) {
        console.error('❌ Query runner release failed:', releaseError);
      }
    }
  }

  /**
   * Delete entities safely - doesn't throw on transaction errors
   */
  private async deleteEntitiesSafe(
    queryRunner: any,
    tableName: string,
    ids: number[]
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    try {
      // Check if transaction is still active
      if (!queryRunner.isTransactionActive) {
        console.log(`  ⚠️  Transaction not active for ${tableName}, skipping`);
        return;
      }

      const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
      const query = `DELETE FROM "${tableName}" WHERE id IN (${placeholders})`;
      
      await queryRunner.query(query, ids);
    } catch (error: any) {
      // Ignore "relation does not exist" errors
      if (error.code === '42P01') {
        console.log(`  ⚠️  Table ${tableName} does not exist, skipping cleanup`);
        return;
      }
      // Ignore transaction aborted errors
      if (error.code === '25P02') {
        console.log(`  ⚠️  Transaction aborted for ${tableName}, skipping cleanup`);
        return;
      }
      // Log but don't throw - continue with other deletions
      console.log(`  ⚠️  Failed to delete from ${tableName}, continuing...`);
    }
  }

  /**
   * Delete entities by IDs from a specific table
   * 
   * CRITICAL SAFETY: Only deletes entities with specified IDs
   * 
   * Requirements: 1.3, 1.9, 1.10
   */
  private async deleteEntities(
    queryRunner: any,
    tableName: string,
    ids: number[]
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    try {
      const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
      const query = `DELETE FROM "${tableName}" WHERE id IN (${placeholders})`;
      
      await queryRunner.query(query, ids);
    } catch (error: any) {
      // Ignore "relation does not exist" errors (table might not exist in test)
      if (error.code === '42P01') {
        console.log(`  ⚠️  Table ${tableName} does not exist, skipping cleanup`);
        return;
      }
      console.error(`  ✗ Failed to delete from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Custom assertion: Expect validation error in response
   * 
   * @param response - HTTP response object
   * @param field - Field name that should have validation error
   */
  expectValidationError(response: any, field: string): void {
    // API returns 422 for validation errors (Unprocessable Entity)
    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeDefined();
    
    const fieldError = response.body.errors.find((err: any) => err.field === field);
    expect(fieldError).toBeDefined();
  }

  /**
   * Custom assertion: Expect unauthorized response
   * 
   * @param response - HTTP response object
   */
  expectUnauthorized(response: any): void {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  }

  /**
   * Custom assertion: Expect forbidden response
   * 
   * @param response - HTTP response object
   */
  expectForbidden(response: any): void {
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  }

  /**
   * Custom assertion: Expect not found response
   * 
   * @param response - HTTP response object
   */
  expectNotFound(response: any): void {
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  }

  /**
   * Custom assertion: Expect conflict response
   * 
   * @param response - HTTP response object
   */
  expectConflict(response: any): void {
    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  }

  /**
   * Custom assertion: Expect successful response
   * 
   * @param response - HTTP response object
   * @param statusCode - Expected status code (default: 200)
   */
  expectSuccess(response: any, statusCode: number = 200): void {
    expect(response.status).toBe(statusCode);
    expect(response.body.success).toBe(true);
  }
}

