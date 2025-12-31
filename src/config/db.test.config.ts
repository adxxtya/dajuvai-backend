import { DataSource } from "typeorm";
import { User } from "../entities/user.entity";
import { Subcategory } from "../entities/subcategory.entity";
import { Category } from "../entities/category.entity";
import { Product } from "../entities/product.entity";
import { Vendor } from "../entities/vendor.entity";
import { Brand } from "../entities/brand.entity";
import { WishlistItem } from '../entities/wishlistItem.entity';
import { Wishlist } from "../entities/wishlist.entity";
import { CartItem } from "../entities/cartItem.entity";
import { Cart } from '../entities/cart.entity';
import { Review } from "../entities/reviews.entity";
import { Deal } from "../entities/deal.entity";
import { Address } from "../entities/address.entity";
import { Order } from "../entities/order.entity";
import { OrderItem } from "../entities/orderItems.entity";
import { Banner } from "../entities/banner.entity";
import { Contact } from "../entities/contact.entity";
import { District } from "../entities/district.entity";
import { HomePageSection } from "../entities/homePage.entity";
import { Promo } from "../entities/promo.entity";
import { Variant } from "../entities/variant.entity";
import { HomeCategory } from "../entities/home.category";
import { Notification } from "../entities/notification.entity";
import { Session } from "../entities/session.entity";

/**
 * Test database configuration
 * Uses a separate test database to avoid affecting development data
 */
const TestDataSource = new DataSource({
  type: "postgres",
  url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/dajuvai_test'),
  synchronize: true, // Auto-create schema for tests
  logging: false, // Disable logging in tests for cleaner output
  dropSchema: false, // Don't drop schema automatically - we'll handle this manually
  entities: [
    User, Category, Subcategory, Product, Vendor, Brand, Cart, CartItem, 
    Wishlist, WishlistItem, Review, Deal, Address, Order, OrderItem,
    Banner, Contact, District, HomePageSection, Promo, Variant, 
    HomeCategory, Notification, Session
  ],
  migrations: [],
  migrationsRun: false,
  extra: {
    max: 5,
    min: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
  },
});

/**
 * Initialize test database connection
 */
export async function initializeTestDatabase(): Promise<DataSource> {
  if (!TestDataSource.isInitialized) {
    await TestDataSource.initialize();
  }
  return TestDataSource;
}

/**
 * Close test database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (TestDataSource.isInitialized) {
    await TestDataSource.destroy();
  }
}

/**
 * Clear all data from test database
 * Useful for cleaning up between test suites
 */
export async function clearTestDatabase(): Promise<void> {
  if (!TestDataSource.isInitialized) {
    return;
  }

  const entities = TestDataSource.entityMetadatas;

  // Disable foreign key checks temporarily
  await TestDataSource.query('SET session_replication_role = replica;');

  // Clear all tables
  for (const entity of entities) {
    const repository = TestDataSource.getRepository(entity.name);
    await repository.clear();
  }

  // Re-enable foreign key checks
  await TestDataSource.query('SET session_replication_role = DEFAULT;');
}

export default TestDataSource;
