import { USER_ROLES } from './constants';

/**
 * JWT Configuration for different user roles
 * Defines token expiry times for access and refresh tokens
 */
export const JWT_CONFIG = {
  [USER_ROLES.USER]: {
    ACCESS_TOKEN_EXPIRY: '15m',   // 15 minutes
    REFRESH_TOKEN_EXPIRY: '7d',   // 7 days
  },
  [USER_ROLES.ADMIN]: {
    ACCESS_TOKEN_EXPIRY: '1h',    // 1 hour
    REFRESH_TOKEN_EXPIRY: '7d',   // 7 days
  },
  [USER_ROLES.VENDOR]: {
    ACCESS_TOKEN_EXPIRY: '1h',    // 1 hour
    REFRESH_TOKEN_EXPIRY: '30d',  // 30 days
  },
  [USER_ROLES.STAFF]: {
    ACCESS_TOKEN_EXPIRY: '1h',    // 1 hour
    REFRESH_TOKEN_EXPIRY: '7d',   // 7 days
  },
} as const;

/**
 * Get JWT secret from environment
 * Throws error if JWT_SECRET is not set
 * 
 * @returns JWT secret string
 * @throws Error if JWT_SECRET is not configured
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not configured. Please set JWT_SECRET environment variable.'
    );
  }
  
  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security.'
    );
  }
  
  return secret;
}

/**
 * Get JWT refresh secret from environment
 * Falls back to JWT_SECRET if JWT_REFRESH_SECRET is not set
 * 
 * @returns JWT refresh secret string
 * @throws Error if neither JWT_REFRESH_SECRET nor JWT_SECRET is configured
 */
export function getRefreshSecret(): string {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (refreshSecret) {
    if (refreshSecret.length < 32) {
      throw new Error(
        'JWT_REFRESH_SECRET must be at least 32 characters long for security.'
      );
    }
    return refreshSecret;
  }
  
  // Fallback to JWT_SECRET if refresh secret is not set
  console.warn(
    '⚠️  JWT_REFRESH_SECRET is not set. Using JWT_SECRET for refresh tokens. ' +
    'It is recommended to use separate secrets for access and refresh tokens.'
  );
  
  return getJwtSecret();
}

/**
 * Get token expiry configuration for a specific role
 * 
 * @param role - User role (user, admin, vendor, staff)
 * @returns Token expiry configuration for the role
 */
export function getTokenConfig(role: keyof typeof JWT_CONFIG) {
  const config = JWT_CONFIG[role];
  
  if (!config) {
    console.warn(`⚠️  No JWT config found for role: ${role}. Using default USER config.`);
    return JWT_CONFIG[USER_ROLES.USER];
  }
  
  return config;
}

/**
 * JWT algorithm to use for signing tokens
 */
export const JWT_ALGORITHM = 'HS256' as const;

/**
 * JWT issuer identifier
 */
export const JWT_ISSUER = 'dajuvai-api' as const;

/**
 * JWT audience identifier
 */
export const JWT_AUDIENCE = 'dajuvai-client' as const;
