import { DataSource } from "typeorm";
import { config } from "dotenv"
import { User } from "../entities/user.entity"
import { Subcategory } from "../entities/subcategory.entity"
import { Category } from "../entities/category.entity"
import { Product } from "../entities/product.entity"
import { Vendor } from "../entities/vendor.entity"
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
import logger from "./logger.config";

config()

/**
 * Custom logger for TypeORM that logs slow queries
 * Requirements: 20.8
 */
class DatabaseLogger {
  private slowQueryThreshold: number;

  constructor() {
    // Set threshold based on environment: 100ms in dev, 500ms in prod
    this.slowQueryThreshold = process.env.NODE_ENV === 'production' ? 500 : 100;
  }

  logQuery(query: string, parameters?: any[], queryRunner?: any) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Query executed', { query, parameters });
    }
  }

  logQueryError(error: string | Error, query: string, parameters?: any[], queryRunner?: any) {
    logger.error('Query failed', {
      error: error instanceof Error ? error.message : error,
      query,
      parameters,
    });
  }

  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: any) {
    if (time >= this.slowQueryThreshold) {
      logger.warn('Slow query detected', {
        executionTime: `${time}ms`,
        threshold: `${this.slowQueryThreshold}ms`,
        query,
        parameters,
      });
    }
  }

  logSchemaBuild(message: string, queryRunner?: any) {
    logger.info('Schema build', { message });
  }

  logMigration(message: string, queryRunner?: any) {
    logger.info('Migration', { message });
  }

  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: any) {
    switch (level) {
      case 'log':
      case 'info':
        logger.info(message);
        break;
      case 'warn':
        logger.warn(message);
        break;
    }
  }
}

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  logger: new DatabaseLogger() as any,
  maxQueryExecutionTime: process.env.NODE_ENV === 'production' ? 500 : 100, // Log slow queries
  entities: [User, Category, Subcategory, Product, Vendor, Brand, Cart, CartItem, Wishlist, WishlistItem, Review, Deal, Address, Order, OrderItem,
    Banner, Contact, District, HomePageSection, Promo, Variant, HomeCategory, Notification, Session],
  migrations: ['src/migrations/*.ts'],
  migrationsRun: true,
  extra: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default AppDataSource;
export { AppDataSource };