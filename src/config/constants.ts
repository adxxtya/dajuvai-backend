/**
 * Application-wide constants
 * Centralizes all magic numbers and strings for better maintainability
 */

/**
 * Pagination constants
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Token expiry durations
 */
export const TOKEN_EXPIRY = {
  // JWT token expiry (string format for jsonwebtoken)
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
  
  // Verification and reset token expiry (milliseconds)
  VERIFICATION_CODE: 15 * 60 * 1000, // 15 minutes
  PASSWORD_RESET: 10 * 60 * 1000,    // 10 minutes
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  AUTH: {
    POINTS: 5,              // 5 attempts
    DURATION: 15 * 60,      // per 15 minutes (in seconds)
    BLOCK_DURATION: 60 * 60, // block for 1 hour (in seconds)
  },
  API: {
    POINTS: 100,            // 100 requests
    DURATION: 60,           // per 1 minute (in seconds)
  },
} as const;

/**
 * Bcrypt hashing rounds
 * Higher = more secure but slower
 */
export const BCRYPT_ROUNDS = 12;

/**
 * Image upload limits and constraints
 */
export const IMAGE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024,  // 5MB in bytes
  MAX_COUNT: 10,               // Maximum number of images per upload
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
} as const;

/**
 * Image optimization settings
 */
export const IMAGE_OPTIMIZATION = {
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1920,
  QUALITY: 80,
  THUMBNAIL_SIZE: 300,
  THUMBNAIL_QUALITY: 70,
} as const;

/**
 * Order status values
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

/**
 * Payment status values
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

/**
 * Payment methods
 */
export const PAYMENT_METHODS = {
  ESEWA: 'esewa',
  KHALTI: 'khalti',
  NPG: 'npg',
  COD: 'cod',
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  USER: 'user',
  VENDOR: 'vendor',
  ADMIN: 'admin',
  STAFF: 'staff',
} as const;

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  SHORT: 5 * 60,        // 5 minutes
  MEDIUM: 30 * 60,      // 30 minutes
  LONG: 60 * 60,        // 1 hour
  VERY_LONG: 24 * 60 * 60, // 24 hours
} as const;

/**
 * Email templates
 */
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  VERIFICATION: 'verification',
  PASSWORD_RESET: 'password-reset',
  ORDER_CONFIRMATION: 'order-confirmation',
  ORDER_SHIPPED: 'order-shipped',
  ORDER_DELIVERED: 'order-delivered',
} as const;

/**
 * Validation constraints
 */
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  PRODUCT_NAME_MIN_LENGTH: 3,
  PRODUCT_NAME_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 5000,
  PHONE_REGEX: /^(\+977)?[9][6-9]\d{8}$/,
  EMAIL_MAX_LENGTH: 255,
} as const;

/**
 * Stock management
 */
export const STOCK = {
  LOW_STOCK_THRESHOLD: 10,
  OUT_OF_STOCK: 0,
  MAX_QUANTITY: 1000000,
} as const;

/**
 * Price constraints
 */
export const PRICE = {
  MIN: 0,
  MAX: 10000000, // 10 million
  DECIMAL_PLACES: 2,
} as const;

/**
 * Discount constraints
 */
export const DISCOUNT = {
  MIN: 0,
  MAX: 100, // percentage
} as const;

/**
 * Session configuration
 */
export const SESSION = {
  COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000,    // Run cleanup daily
} as const;

/**
 * File upload paths
 */
export const UPLOAD_PATHS = {
  PRODUCTS: 'products',
  BANNERS: 'banners',
  CATEGORIES: 'categories',
  PROFILES: 'profiles',
  TEMP: 'temp',
} as const;

/**
 * API response messages
 */
export const MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
} as const;
