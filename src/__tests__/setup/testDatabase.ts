import { DataSource } from "typeorm";
import TestDataSource from "../../config/db.test.config";

/**
 * Interface for tracking created test entities
 * Requirements: 1.9, 1.10
 */
export interface TestEntityIds {
  users: number[];
  vendors: number[];
  products: number[];
  categories: number[];
  subcategories: number[];
  orders: number[];
  orderItems: number[];
  carts: number[];
  cartItems: number[];
  wishlists: number[];
  wishlistItems: number[];
  banners: number[];
  deals: number[];
  promos: number[];
  districts: number[];
  reviews: number[];
  notifications: number[];
  contacts: number[];
  addresses: number[];
  brands: number[];
  variants: number[];
  homePageSections: number[];
  homeCategories: number[];
  sessions: number[];
}

/**
 * TestDatabase class for managing test database connections and cleanup
 * 
 * CRITICAL SAFETY FEATURES:
 * 1. Database name validation - ensures database name contains "test"
 * 2. Selective deletion - only deletes entities with tracked IDs
 * 3. No bulk operations - never uses TRUNCATE or DELETE without WHERE
 * 4. Dependency-aware cleanup - respects foreign key constraints
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.9, 1.10
 */
export class TestDatabase {
  private connection: DataSource;
  private createdEntityIds: TestEntityIds;
  private isConnected: boolean = false;

  constructor() {
    this.connection = TestDataSource;
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
   * Validate that the database name contains "test"
   * This is a critical safety check to prevent accidental operations on production data
   * 
   * Requirements: 1.2, 1.3
   * 
   * @throws Error if database name does not contain "test"
   */
  validateTestDatabase(): void {
    const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
    const dbName = this.extractDatabaseName(dbUrl);

    if (!dbName.toLowerCase().includes('test')) {
      throw new Error(
        `SAFETY CHECK FAILED: Database name "${dbName}" does not contain "test". ` +
        `Test operations are only allowed on test databases. ` +
        `Please update your TEST_DATABASE_URL to use a database with "test" in the name.`
      );
    }

    console.log(`✅ Database safety check passed: Using test database "${dbName}"`);
  }

  /**
   * Extract database name from connection URL
   */
  private extractDatabaseName(url: string): string {
    try {
      // Handle postgresql:// URLs
      if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
        const parts = url.split('/');
        const dbNameWithParams = parts[parts.length - 1];
        // Remove query parameters if present
        return dbNameWithParams.split('?')[0];
      }
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Connect to the test database
   * 
   * Requirements: 1.1, 1.2
   */
  async connect(): Promise<void> {
    try {
      // Validate database name before connecting
      this.validateTestDatabase();

      if (!this.connection.isInitialized) {
        await this.connection.initialize();
        this.isConnected = true;
        console.log('✅ Test database connected successfully');
        
        // Ensure schema exists
        await this.connection.synchronize();
        console.log('✅ Test database schema synchronized');
      } else {
        this.isConnected = true;
        console.log('✅ Test database already connected');
      }
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the test database
   * 
   * Requirements: 1.1
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connection.isInitialized) {
        await this.connection.destroy();
        this.isConnected = false;
        console.log('✅ Test database disconnected successfully');
      }
    } catch (error) {
      console.error('❌ Failed to disconnect from test database:', error);
      throw error;
    }
  }

  /**
   * Run database migrations
   * 
   * Requirements: 1.1
   */
  async runMigrations(): Promise<void> {
    try {
      this.validateTestDatabase();
      
      if (!this.connection.isInitialized) {
        throw new Error('Database connection not initialized. Call connect() first.');
      }

      // Force schema synchronization
      await this.connection.synchronize();
      console.log('✅ Test database schema synchronized');
    } catch (error) {
      console.error('❌ Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Track a created entity ID for later cleanup
   * 
   * Requirements: 1.9, 1.10
   * 
   * @param entityType - The type of entity (e.g., 'users', 'products')
   * @param id - The ID of the created entity
   */
  trackCreatedEntity(entityType: keyof TestEntityIds, id: number): void {
    if (!this.createdEntityIds[entityType]) {
      console.warn(`⚠️  Unknown entity type: ${entityType}`);
      return;
    }

    if (!this.createdEntityIds[entityType].includes(id)) {
      this.createdEntityIds[entityType].push(id);
      // Only log in verbose mode to avoid performance degradation during bulk operations
      if (process.env.TEST_VERBOSE === 'true') {
        console.log(`📝 Tracked ${entityType} ID: ${id}`);
      }
    }
  }

  /**
   * Get all tracked entity IDs
   * Returns a deep copy to prevent external modifications from affecting internal state
   * 
   * Requirements: 1.9, 1.10
   */
  getTrackedEntities(): TestEntityIds {
    // Deep copy: create new object with new arrays for each property
    return {
      users: [...this.createdEntityIds.users],
      vendors: [...this.createdEntityIds.vendors],
      products: [...this.createdEntityIds.products],
      categories: [...this.createdEntityIds.categories],
      subcategories: [...this.createdEntityIds.subcategories],
      orders: [...this.createdEntityIds.orders],
      orderItems: [...this.createdEntityIds.orderItems],
      carts: [...this.createdEntityIds.carts],
      cartItems: [...this.createdEntityIds.cartItems],
      wishlists: [...this.createdEntityIds.wishlists],
      wishlistItems: [...this.createdEntityIds.wishlistItems],
      banners: [...this.createdEntityIds.banners],
      deals: [...this.createdEntityIds.deals],
      promos: [...this.createdEntityIds.promos],
      districts: [...this.createdEntityIds.districts],
      reviews: [...this.createdEntityIds.reviews],
      notifications: [...this.createdEntityIds.notifications],
      contacts: [...this.createdEntityIds.contacts],
      addresses: [...this.createdEntityIds.addresses],
      brands: [...this.createdEntityIds.brands],
      variants: [...this.createdEntityIds.variants],
      homePageSections: [...this.createdEntityIds.homePageSections],
      homeCategories: [...this.createdEntityIds.homeCategories],
      sessions: [...this.createdEntityIds.sessions],
    };
  }

  /**
   * Clear all tracked entity IDs (reset tracking)
   */
  clearTrackedEntities(): void {
    this.createdEntityIds = this.initializeEntityIds();
    console.log('🧹 Cleared all tracked entity IDs');
  }

  /**
   * Clear test data from the database
   * 
   * CRITICAL SAFETY: This method ONLY deletes entities whose IDs were tracked
   * during test execution. It NEVER performs bulk deletes or truncates tables.
   * 
   * Deletion order respects foreign key constraints (children before parents):
   * 1. Order items, cart items, wishlist items (dependent on orders/carts/wishlists)
   * 2. Orders, carts, wishlists, reviews, notifications (dependent on users/products)
   * 3. Products, variants (dependent on vendors/categories)
   * 4. Vendors, addresses, sessions (dependent on users)
   * 5. Subcategories (dependent on categories)
   * 6. Categories, districts, brands, deals, promos, banners, contacts, home sections
   * 7. Users (last, as many entities depend on users)
   * 
   * Requirements: 1.3, 1.9, 1.10
   */
  async clearTestData(): Promise<void> {
    try {
      this.validateTestDatabase();

      if (!this.connection.isInitialized) {
        throw new Error('Database connection not initialized. Call connect() first.');
      }

      console.log('🧹 Starting selective test data cleanup...');

      const queryRunner = this.connection.createQueryRunner();
      await queryRunner.connect();

      try {
        // Start transaction for atomic cleanup
        await queryRunner.startTransaction();

        // Delete in dependency order (children first, parents last)

        // Level 1: Delete dependent items
        await this.deleteEntities(queryRunner, 'order_items', this.createdEntityIds.orderItems);
        await this.deleteEntities(queryRunner, 'cart_items', this.createdEntityIds.cartItems);
        await this.deleteEntities(queryRunner, 'wishlist_items', this.createdEntityIds.wishlistItems);

        // Level 2: Delete entities dependent on users/products
        await this.deleteEntities(queryRunner, 'orders', this.createdEntityIds.orders);
        await this.deleteEntities(queryRunner, 'carts', this.createdEntityIds.carts);
        await this.deleteEntities(queryRunner, 'wishlists', this.createdEntityIds.wishlists);
        await this.deleteEntities(queryRunner, 'reviews', this.createdEntityIds.reviews);
        await this.deleteEntities(queryRunner, 'notifications', this.createdEntityIds.notifications);
        await this.deleteEntities(queryRunner, 'sessions', this.createdEntityIds.sessions);

        // Level 3: Delete products and variants
        await this.deleteEntities(queryRunner, 'variants', this.createdEntityIds.variants);
        await this.deleteEntities(queryRunner, 'products', this.createdEntityIds.products);

        // Level 4: Delete vendors and addresses
        await this.deleteEntities(queryRunner, 'vendors', this.createdEntityIds.vendors);
        await this.deleteEntities(queryRunner, 'addresses', this.createdEntityIds.addresses);

        // Level 5: Delete subcategories (dependent on categories)
        await this.deleteEntities(queryRunner, 'subcategories', this.createdEntityIds.subcategories);

        // Level 6: Delete independent entities
        await this.deleteEntities(queryRunner, 'categories', this.createdEntityIds.categories);
        await this.deleteEntities(queryRunner, 'districts', this.createdEntityIds.districts);
        await this.deleteEntities(queryRunner, 'brands', this.createdEntityIds.brands);
        await this.deleteEntities(queryRunner, 'deals', this.createdEntityIds.deals);
        await this.deleteEntities(queryRunner, 'promos', this.createdEntityIds.promos);
        await this.deleteEntities(queryRunner, 'banners', this.createdEntityIds.banners);
        await this.deleteEntities(queryRunner, 'contacts', this.createdEntityIds.contacts);
        await this.deleteEntities(queryRunner, 'home_page_sections', this.createdEntityIds.homePageSections);
        await this.deleteEntities(queryRunner, 'home_categories', this.createdEntityIds.homeCategories);

        // Level 7: Delete users last (many entities depend on users)
        await this.deleteEntities(queryRunner, 'users', this.createdEntityIds.users);

        // Commit transaction
        await queryRunner.commitTransaction();

        console.log('✅ Test data cleanup completed successfully');

        // Clear tracked IDs after successful cleanup
        this.clearTrackedEntities();

      } catch (error) {
        // Rollback transaction on error
        await queryRunner.rollbackTransaction();
        console.error('❌ Test data cleanup failed, transaction rolled back:', error);
        throw error;
      } finally {
        // Release query runner
        await queryRunner.release();
      }

    } catch (error) {
      console.error('❌ Failed to clear test data:', error);
      throw error;
    }
  }

  /**
   * Delete entities by IDs from a specific table
   * 
   * CRITICAL SAFETY: Only deletes entities with specified IDs
   * Never performs bulk deletes without WHERE clause
   * 
   * Requirements: 1.3, 1.9, 1.10
   */
  private async deleteEntities(
    queryRunner: any,
    tableName: string,
    ids: number[]
  ): Promise<void> {
    if (ids.length === 0) {
      return; // Nothing to delete
    }

    try {
      // Use parameterized query with IN clause for safety
      const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
      const query = `DELETE FROM "${tableName}" WHERE id IN (${placeholders})`;
      
      await queryRunner.query(query, ids);
      
      console.log(`  ✓ Deleted ${ids.length} record(s) from ${tableName}`);
    } catch (error) {
      console.error(`  ✗ Failed to delete from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get the database connection
   * Useful for direct database operations in tests
   */
  getConnection(): DataSource {
    return this.connection;
  }

  /**
   * Check if database is connected
   */
  isDbConnected(): boolean {
    return this.isConnected && this.connection.isInitialized;
  }
}
