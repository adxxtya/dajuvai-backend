import { z } from 'zod';
import { PAYMENT_METHODS } from '../../../config/constants';

/**
 * Order item schema
 */
const orderItemSchema = z.object({
  productId: z
    .number()
    .int('Product ID must be an integer')
    .positive('Invalid product ID'),
  
  variantId: z
    .number()
    .int('Variant ID must be an integer')
    .positive('Invalid variant ID')
    .optional(),
  
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100 per item'),
});

/**
 * Shipping address schema
 */
const shippingAddressSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .trim(),
  
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits'),
  
  addressLine1: z
    .string()
    .min(5, 'Address line 1 must be at least 5 characters')
    .max(200, 'Address line 1 must not exceed 200 characters')
    .trim(),
  
  addressLine2: z
    .string()
    .max(200, 'Address line 2 must not exceed 200 characters')
    .trim()
    .optional(),
  
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must not exceed 100 characters')
    .trim(),
  
  district: z
    .string()
    .min(2, 'District must be at least 2 characters')
    .max(100, 'District must not exceed 100 characters')
    .trim(),
  
  postalCode: z
    .string()
    .regex(/^\d{5}$/, 'Postal code must be 5 digits')
    .optional(),
});

/**
 * Create order schema
 * Validates order creation data
 */
export const createOrderSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, 'Order must contain at least one item')
    .max(50, 'Order cannot contain more than 50 items'),
  
  shippingAddress: shippingAddressSchema,
  
  paymentMethod: z
    .enum([
      PAYMENT_METHODS.ESEWA,
      PAYMENT_METHODS.KHALTI,
      PAYMENT_METHODS.NPG,
      PAYMENT_METHODS.COD,
    ] as [string, ...string[]],
    {
      errorMap: () => ({ message: 'Invalid payment method' }),
    }),
  
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional(),
});

/**
 * Update order status schema
 * Validates order status update
 */
export const updateOrderStatusSchema = z.object({
  status: z
    .enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], {
      errorMap: () => ({ message: 'Invalid order status' }),
    }),
  
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional(),
});

/**
 * Order query schema
 * Validates order list query parameters
 */
export const orderQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .refine((n) => n >= 1, 'Page must be at least 1')
    .optional(),
  
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'Limit must be between 1 and 100')
    .optional(),
  
  status: z
    .enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .optional(),
  
  paymentStatus: z
    .enum(['pending', 'completed', 'failed', 'refunded'])
    .optional(),
  
  sortBy: z
    .enum(['createdAt', 'totalAmount', 'orderStatus'])
    .optional(),
  
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional(),
});

/**
 * Order ID param schema
 * Validates order ID in route parameters
 */
export const orderIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Order ID must be a number')
    .transform(Number),
});

/**
 * Cancel order schema
 * Validates order cancellation request
 */
export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .min(10, 'Cancellation reason must be at least 10 characters')
    .max(500, 'Cancellation reason must not exceed 500 characters')
    .trim(),
});

