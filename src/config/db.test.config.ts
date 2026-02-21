import { DataSource } from "typeorm";
import { config } from "dotenv";
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

config({ path: '.env.test' });

/**
 * Test Database Configuration
 * Creates a separate DataSource for integration tests
 * Requirements: 1.1, 1.2
 */
const TestDataSource = new DataSource({
  type: "postgres",
  url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  synchronize: true, // Auto-create schema for tests
  logging: false, // Disable logging in tests for cleaner output
  dropSchema: false, // Don't drop schema automatically - we'll handle cleanup manually
  entities: [
    User, 
    Category, 
    Subcategory, 
    Product, 
    Vendor, 
    Brand, 
    Cart, 
    CartItem, 
    Wishlist, 
    WishlistItem, 
    Review, 
    Deal, 
    Address, 
    Order, 
    OrderItem,
    Banner, 
    Contact, 
    District, 
    HomePageSection, 
    Promo, 
    Variant, 
    HomeCategory, 
    Notification, 
    Session
  ],
  migrations: [],
  migrationsRun: false,
  extra: {
    max: 10, // Smaller pool for tests
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },
  ssl: false, // No SSL for test database
});

export default TestDataSource;
export { TestDataSource };
