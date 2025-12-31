import { z } from 'zod';
import { VALIDATION, PRICE, DISCOUNT, STOCK } from '../../../config/constants';

/**
 * Product variant schema
 */
const variantSchema = z.object({
  name: z
    .string()
    .min(1, 'Variant name is required')
    .max(100, 'Variant name must not exceed 100 characters')
    .trim(),
  
  basePrice: z
    .number()
    .positive('Variant price must be positive')
    .max(PRICE.MAX, `Variant price must not exceed ${PRICE.MAX}`)
    .finite('Variant price must be a valid number'),
  
  stock: z
    .number()
    .int('Variant stock must be an integer')
    .nonnegative('Variant stock cannot be negative')
    .max(STOCK.MAX_QUANTITY, `Variant stock must not exceed ${STOCK.MAX_QUANTITY}`),
  
  variantImages: z
    .array(z.string().url('Invalid image URL'))
    .optional(),
});

/**
 * Create product schema
 * Validates product creation data
 */
export const createProductSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.PRODUCT_NAME_MIN_LENGTH, `Product name must be at least ${VALIDATION.PRODUCT_NAME_MIN_LENGTH} characters`)
    .max(VALIDATION.PRODUCT_NAME_MAX_LENGTH, `Product name must not exceed ${VALIDATION.PRODUCT_NAME_MAX_LENGTH} characters`)
    .trim(),
  
  description: z
    .string()
    .max(VALIDATION.DESCRIPTION_MAX_LENGTH, `Description must not exceed ${VALIDATION.DESCRIPTION_MAX_LENGTH} characters`)
    .optional(),
  
  basePrice: z
    .number()
    .positive('Base price must be positive')
    .max(PRICE.MAX, `Base price must not exceed ${PRICE.MAX}`)
    .finite('Base price must be a valid number')
    .nullable()
    .optional(),
  
  stock: z
    .number()
    .int('Stock must be an integer')
    .nonnegative('Stock cannot be negative')
    .max(STOCK.MAX_QUANTITY, `Stock must not exceed ${STOCK.MAX_QUANTITY}`)
    .nullable()
    .optional(),
  
  discount: z
    .number()
    .min(DISCOUNT.MIN, `Discount must be at least ${DISCOUNT.MIN}%`)
    .max(DISCOUNT.MAX, `Discount must not exceed ${DISCOUNT.MAX}%`)
    .optional(),
  
  productImages: z
    .array(z.string().url('Invalid image URL'))
    .min(1, 'At least one product image is required')
    .max(10, 'Maximum 10 product images allowed'),
  
  subcategoryId: z
    .number()
    .int('Subcategory ID must be an integer')
    .positive('Invalid subcategory ID'),
  
  brandId: z
    .number()
    .int('Brand ID must be an integer')
    .positive('Invalid brand ID')
    .optional(),
  
  variants: z
    .array(variantSchema)
    .optional(),
}).refine(
  (data) => {
    // If product has variants, basePrice and stock should be null
    if (data.variants && data.variants.length > 0) {
      return data.basePrice === null && data.stock === null;
    }
    // If no variants, basePrice and stock are required
    return data.basePrice !== null && data.stock !== null;
  },
  {
    message: 'Products with variants must not have basePrice and stock. Products without variants must have basePrice and stock.',
    path: ['variants'],
  }
);

/**
 * Update product schema
 * Validates product update data (all fields optional)
 */
export const updateProductSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.PRODUCT_NAME_MIN_LENGTH, `Product name must be at least ${VALIDATION.PRODUCT_NAME_MIN_LENGTH} characters`)
    .max(VALIDATION.PRODUCT_NAME_MAX_LENGTH, `Product name must not exceed ${VALIDATION.PRODUCT_NAME_MAX_LENGTH} characters`)
    .trim()
    .optional(),
  
  description: z
    .string()
    .max(VALIDATION.DESCRIPTION_MAX_LENGTH, `Description must not exceed ${VALIDATION.DESCRIPTION_MAX_LENGTH} characters`)
    .optional(),
  
  basePrice: z
    .number()
    .positive('Base price must be positive')
    .max(PRICE.MAX, `Base price must not exceed ${PRICE.MAX}`)
    .finite('Base price must be a valid number')
    .nullable()
    .optional(),
  
  stock: z
    .number()
    .int('Stock must be an integer')
    .nonnegative('Stock cannot be negative')
    .max(STOCK.MAX_QUANTITY, `Stock must not exceed ${STOCK.MAX_QUANTITY}`)
    .nullable()
    .optional(),
  
  discount: z
    .number()
    .min(DISCOUNT.MIN, `Discount must be at least ${DISCOUNT.MIN}%`)
    .max(DISCOUNT.MAX, `Discount must not exceed ${DISCOUNT.MAX}%`)
    .optional(),
  
  productImages: z
    .array(z.string().url('Invalid image URL'))
    .min(1, 'At least one product image is required')
    .max(10, 'Maximum 10 product images allowed')
    .optional(),
  
  subcategoryId: z
    .number()
    .int('Subcategory ID must be an integer')
    .positive('Invalid subcategory ID')
    .optional(),
  
  brandId: z
    .number()
    .int('Brand ID must be an integer')
    .positive('Invalid brand ID')
    .optional(),
  
  variants: z
    .array(variantSchema)
    .optional(),
}).refine(
  (data) => {
    // If variants are provided and not empty, basePrice and stock should be null
    if (data.variants && data.variants.length > 0) {
      if (data.basePrice !== undefined && data.basePrice !== null) {
        return false;
      }
      if (data.stock !== undefined && data.stock !== null) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Products with variants cannot have basePrice and stock',
    path: ['variants'],
  }
);

/**
 * Product query schema
 * Validates product list/filter query parameters
 */
export const productQuerySchema = z.object({
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
  
  search: z
    .string()
    .max(200, 'Search query too long')
    .optional(),
  
  categoryId: z
    .string()
    .regex(/^\d+$/, 'Category ID must be a number')
    .transform(Number)
    .optional(),
  
  subcategoryId: z
    .string()
    .regex(/^\d+$/, 'Subcategory ID must be a number')
    .transform(Number)
    .optional(),
  
  minPrice: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Min price must be a number')
    .transform(Number)
    .optional(),
  
  maxPrice: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Max price must be a number')
    .transform(Number)
    .optional(),
  
  sortBy: z
    .enum(['price', 'name', 'createdAt', 'popularity'])
    .optional(),
  
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional(),
});

/**
 * Product ID param schema
 * Validates product ID in route parameters
 */
export const productIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Product ID must be a number')
    .transform(Number),
});

