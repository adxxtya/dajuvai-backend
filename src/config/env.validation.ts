import { z } from 'zod';

/**
 * Environment variables validation schema
 * Ensures all required environment variables are present and valid at application startup
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('5000'),

  // Database Configuration
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').optional(),

  // Redis Configuration (optional for now, but recommended)
  REDIS_URL: z.string().url().optional(),

  // Email Configuration
  USER_EMAIL: z.string().email('USER_EMAIL must be a valid email address'),
  PASS_EMAIL: z.string().min(1, 'PASS_EMAIL is required'),

  // OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  FACEBOOK_APP_ID: z.string().min(1, 'FACEBOOK_APP_ID is required'),
  FACEBOOK_APP_SECRET: z.string().min(1, 'FACEBOOK_APP_SECRET is required'),

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // Nepal Payment Gateway Configuration
  NPG_BASE_URL: z.string().url('NPG_BASE_URL must be a valid URL'),
  NPG_API_USERNAME: z.string().min(1, 'NPG_API_USERNAME is required'),
  NPG_API_PASSWORD: z.string().min(1, 'NPG_API_PASSWORD is required'),
  NPG_MERCHANT_ID: z.string().min(1, 'NPG_MERCHANT_ID is required'),
  NPG_SECRET_KEY: z.string().min(1, 'NPG_SECRET_KEY is required'),
  NPG_ACCESS_CODE: z.string().min(1, 'NPG_ACCESS_CODE is required'),

  // eSewa Configuration
  ESEWA_MERCHANT: z.string().min(1, 'ESEWA_MERCHANT is required'),
  SECRET_KEY: z.string().min(1, 'SECRET_KEY (eSewa) is required'),
  ESEWA_PAYMENT_URL: z.string().url('ESEWA_PAYMENT_URL must be a valid URL'),

  // Frontend Configuration
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),

  // Optional: Sentry Configuration (for error tracking)
  SENTRY_DSN: z.string().url().optional(),

  // Optional: Pagination Configuration
  PAGE_LIMIT: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables at application startup
 * Exits the process with code 1 if validation fails
 * 
 * @returns Validated and typed environment configuration
 */
export function validateEnv(): EnvConfig {
  try {
    const validated = envSchema.parse(process.env);
    
    console.log('✅ Environment variables validated successfully');
    
    // Warn about optional but recommended variables
    if (!validated.REDIS_URL) {
      console.warn('⚠️  REDIS_URL is not set. Caching and rate limiting features will be disabled.');
    }
    
    if (!validated.JWT_REFRESH_SECRET) {
      console.warn('⚠️  JWT_REFRESH_SECRET is not set. Using JWT_SECRET for refresh tokens (not recommended).');
    }
    
    if (!validated.SENTRY_DSN) {
      console.warn('⚠️  SENTRY_DSN is not set. Error tracking will be disabled.');
    }
    
    // Security warnings for development
    if (validated.NODE_ENV === 'production') {
      if (validated.JWT_SECRET.length < 64) {
        console.warn('⚠️  JWT_SECRET should be at least 64 characters in production for enhanced security.');
      }
      
      if (validated.DATABASE_URL.includes('localhost') || validated.DATABASE_URL.includes('127.0.0.1')) {
        console.error('❌ DATABASE_URL appears to be pointing to localhost in production mode!');
        process.exit(1);
      }
    }
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:');
      console.error('');
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        console.error(`  • ${path}: ${err.message}`);
      });
      
      console.error('');
      console.error('Please check your .env file and ensure all required variables are set correctly.');
      console.error('');
      
      process.exit(1);
    }
    
    console.error('❌ Unexpected error during environment validation:', error);
    process.exit(1);
  }
}

/**
 * Validated environment configuration
 * Available after validateEnv() is called
 */
export let env: EnvConfig;

/**
 * Initialize and export validated environment
 */
export function initializeEnv(): EnvConfig {
  env = validateEnv();
  return env;
}
