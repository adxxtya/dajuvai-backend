import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Type definition for async route handlers
 */
type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wrapper to handle async route handlers and middleware in Express
 * 
 * This function takes an async function (that returns a Promise) and
 * returns a standard Express RequestHandler function. It automatically
 * catches any rejected Promise (errors thrown in async functions) and
 * forwards them to Express's error handling middleware via `next()`.
 * 
 * Without this wrapper, async errors can cause unhandled rejections
 * and crash the server or cause the request to hang.
 * 
 * @param fn - An async function that handles the request, response, and next
 * @returns A standard Express middleware/request handler function
 * 
 * @example
 * ```typescript
 * app.get('/users/:id', asyncHandler(async (req, res, next) => {
 *   const user = await userService.findById(req.params.id);
 *   if (!user) {
 *     throw APIError.notFound('User not found');
 *   }
 *   res.json(ResponseBuilder.success(user));
 * }));
 * ```
 */
export const asyncHandler = (fn: AsyncHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
