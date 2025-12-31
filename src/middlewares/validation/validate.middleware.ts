import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { APIError } from '../../utils/errors/ApiError';
import { ErrorCode } from '../../utils/errors/ErrorCodes';

/**
 * Validation source type
 */
type ValidationSource = 'body' | 'query' | 'params';

/**
 * Create validation middleware
 * Validates request data against a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param source - Source of data to validate ('body', 'query', or 'params')
 * @returns Express middleware function
 * 
 * @example
 * // Validate request body
 * router.post('/signup', validate(signupSchema, 'body'), controller.signup);
 * 
 * @example
 * // Validate query parameters
 * router.get('/products', validate(productQuerySchema, 'query'), controller.list);
 * 
 * @example
 * // Validate route parameters
 * router.get('/products/:id', validate(idParamSchema, 'params'), controller.getById);
 */
export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get data from the specified source
      const data = req[source];
      
      // Validate data against schema
      const validated = await schema.parseAsync(data);
      
      // Replace request data with validated data
      // This ensures type safety and applies any transformations
      req[source] = validated;
      
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        // Format Zod errors into user-friendly messages
        const formattedErrors = formatZodErrors(error);
        
        throw APIError.validation(
          'Validation failed',
          formattedErrors
        );
      }
      
      // Pass other errors to error handler
      next(error);
    }
  };
}

/**
 * Format Zod errors into a user-friendly structure
 * 
 * @param error - ZodError instance
 * @returns Object with field names as keys and error messages as values
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  // Use Zod's flatten method to get field-specific errors
  const flattened = error.flatten();
  
  // Process field errors
  if (flattened.fieldErrors) {
    for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
      if (messages && messages.length > 0) {
        formatted[field] = messages;
      }
    }
  }
  
  // Process form errors (errors not tied to specific fields)
  if (flattened.formErrors && flattened.formErrors.length > 0) {
    formatted._form = flattened.formErrors;
  }
  
  return formatted;
}

/**
 * Convenience function for body validation
 */
export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body');
}

/**
 * Convenience function for query validation
 */
export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}

/**
 * Convenience function for params validation
 */
export function validateParams(schema: ZodSchema) {
  return validate(schema, 'params');
}

