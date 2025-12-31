import { z } from 'zod';
import { VALIDATION } from '../../../config/constants';

/**
 * Password complexity regex
 * Requires: at least one uppercase, one lowercase, one number, one special character
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

/**
 * Phone number regex for Nepal
 * Format: +977 or 977 followed by 10 digits starting with 9
 */
const PHONE_REGEX = VALIDATION.PHONE_REGEX;

/**
 * Signup schema
 * Validates user registration data
 */
export const signupSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(VALIDATION.EMAIL_MAX_LENGTH, `Email must not exceed ${VALIDATION.EMAIL_MAX_LENGTH} characters`)
    .toLowerCase()
    .trim(),
  
  password: z
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
    .max(VALIDATION.PASSWORD_MAX_LENGTH, `Password must not exceed ${VALIDATION.PASSWORD_MAX_LENGTH} characters`)
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  
  fullName: z
    .string()
    .min(VALIDATION.NAME_MIN_LENGTH, `Full name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`)
    .max(VALIDATION.NAME_MAX_LENGTH, `Full name must not exceed ${VALIDATION.NAME_MAX_LENGTH} characters`)
    .trim(),
  
  phoneNumber: z
    .string()
    .regex(PHONE_REGEX, 'Invalid phone number format. Must be a valid Nepali phone number')
    .optional(),
});

/**
 * Login schema
 * Validates user login credentials
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  
  password: z
    .string()
    .min(1, 'Password is required'),
});

/**
 * Change password schema
 * Validates password change request
 */
export const changePasswordSchema = z.object({
  oldPassword: z
    .string()
    .min(1, 'Current password is required'),
  
  newPassword: z
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `New password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
    .max(VALIDATION.PASSWORD_MAX_LENGTH, `New password must not exceed ${VALIDATION.PASSWORD_MAX_LENGTH} characters`)
    .regex(
      PASSWORD_REGEX,
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
}).refine(
  (data) => data.oldPassword !== data.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  }
);

/**
 * Forgot password schema
 * Validates forgot password request
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
});

/**
 * Reset password schema
 * Validates password reset with token
 */
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required'),
  
  newPassword: z
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
    .max(VALIDATION.PASSWORD_MAX_LENGTH, `Password must not exceed ${VALIDATION.PASSWORD_MAX_LENGTH} characters`)
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

/**
 * Refresh token schema
 * Validates token refresh request
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
  
  sessionId: z
    .string()
    .uuid('Invalid session ID format'),
});

/**
 * Email verification schema
 * Validates email verification request
 */
export const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, 'Verification token is required'),
});

