# Migration Guide: Error Handling Infrastructure

This guide helps you integrate the new error handling infrastructure into the existing Dajuvai backend codebase.

## Step 1: Update Main Application File (src/index.ts)

Replace the old error handler with the new one:

```typescript
// Remove old import
// import { errorHandler } from "./utils/errorHandler";

// Add new imports
import { errorHandler, notFoundHandler } from './middlewares/error/errorHandler.middleware';
import { initializeSentry, addSentryMiddleware, addSentryErrorHandler } from './config/sentry.config';

// Initialize Sentry at the very beginning (before creating Express app)
initializeSentry();

// After creating Express app, add Sentry request handlers
addSentryMiddleware(app);

// ... your existing middleware and routes ...

// Add 404 handler AFTER all routes but BEFORE error handler
app.use(notFoundHandler);

// Add Sentry error handler BEFORE your error handler
addSentryErrorHandler(app);

// Add error handler as the LAST middleware
app.use(errorHandler);
```

## Step 2: Update Controllers

### Before (Old Pattern)
```typescript
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
```

### After (New Pattern)
```typescript
import { asyncHandler } from '../utils/helpers';
import { ResponseBuilder } from '../utils/helpers';
import { APIError, ErrorCode } from '../utils/errors';

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  
  if (!user) {
    throw APIError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
  }
  
  res.json(ResponseBuilder.success(user, 'User retrieved successfully'));
});
```

## Step 3: Update Services

### Before (Old Pattern)
```typescript
async findById(id: number): Promise<User> {
  const user = await this.userRepo.findOne({ where: { id } });
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}
```

### After (New Pattern)
```typescript
import { APIError, ErrorCode } from '../utils/errors';

async findById(id: number): Promise<User> {
  const user = await this.userRepo.findOne({ where: { id } });
  
  if (!user) {
    throw APIError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
  }
  
  return user;
}
```

## Step 4: Update Routes

### Before (Old Pattern)
```typescript
router.get('/users/:id', authenticate, getUser);
```

### After (New Pattern)
```typescript
import { asyncHandler } from '../utils/helpers';

// If controller already uses asyncHandler, no change needed
router.get('/users/:id', authenticate, getUser);

// If middleware needs async handling
router.get('/users/:id', asyncHandler(authenticate), getUser);
```

## Step 5: Common Error Patterns

### Validation Errors
```typescript
// Old
if (!email || !password) {
  return res.status(400).json({ success: false, message: 'Missing fields' });
}

// New
if (!email || !password) {
  throw APIError.validation('Missing required fields', {
    missing: ['email', 'password'].filter(f => !req.body[f])
  });
}
```

### Authentication Errors
```typescript
// Old
if (!token) {
  return res.status(401).json({ success: false, message: 'No token' });
}

// New
if (!token) {
  throw APIError.unauthorized('No token provided', ErrorCode.INVALID_TOKEN);
}
```

### Authorization Errors
```typescript
// Old
if (user.role !== 'admin') {
  return res.status(403).json({ success: false, message: 'Access denied' });
}

// New
if (user.role !== 'admin') {
  throw APIError.forbidden('Admin access required', ErrorCode.INSUFFICIENT_PERMISSIONS);
}
```

### Business Logic Errors
```typescript
// Old
if (product.stock < quantity) {
  return res.status(400).json({ 
    success: false, 
    message: 'Insufficient stock' 
  });
}

// New
if (product.stock < quantity) {
  throw APIError.badRequest(
    'Insufficient stock available',
    ErrorCode.INSUFFICIENT_STOCK,
    { available: product.stock, requested: quantity }
  );
}
```

### Duplicate Resource Errors
```typescript
// Old
const existing = await userRepo.findOne({ where: { email } });
if (existing) {
  return res.status(409).json({ 
    success: false, 
    message: 'Email already exists' 
  });
}

// New
const existing = await userRepo.findOne({ where: { email } });
if (existing) {
  throw APIError.conflict(
    'Email already registered',
    ErrorCode.EMAIL_ALREADY_EXISTS
  );
}
```

## Step 6: Paginated Responses

### Before (Old Pattern)
```typescript
const [products, total] = await productRepo.findAndCount({
  skip: (page - 1) * limit,
  take: limit
});

res.json({
  success: true,
  data: products,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
});
```

### After (New Pattern)
```typescript
import { ResponseBuilder } from '../utils/helpers';

const [products, total] = await productRepo.findAndCount({
  skip: (page - 1) * limit,
  take: limit
});

res.json(ResponseBuilder.paginated(products, page, limit, total));
```

## Step 7: File Upload Errors

```typescript
// Multer errors are automatically handled by the error handler
// Just configure multer with limits

import { IMAGE_LIMITS } from '../config/constants';

const upload = multer({
  limits: {
    fileSize: IMAGE_LIMITS.MAX_SIZE,
    files: IMAGE_LIMITS.MAX_COUNT
  },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_LIMITS.ALLOWED_TYPES.includes(file.mimetype)) {
      cb(new Error('Invalid file type'));
    } else {
      cb(null, true);
    }
  }
});
```

## Step 8: Testing Error Handling

### Test Error Responses
```typescript
import request from 'supertest';
import app from '../index';

describe('Error Handling', () => {
  it('should return 404 for non-existent user', async () => {
    const res = await request(app).get('/api/users/99999');
    
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      message: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  });
  
  it('should return 401 for missing token', async () => {
    const res = await request(app).get('/api/users/me');
    
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      code: 'INVALID_TOKEN'
    });
  });
});
```

## Step 9: Cleanup Old Files

After migration is complete, you can remove:
- `src/utils/errorHandler.ts` (old error handler)
- `src/utils/ApiError.utils.ts` (old APIError class)
- `src/utils/asyncHandler.utils.ts` (old async handler)
- `src/utils/NotFoundError.ts` (if exists)

## Step 10: Update Imports Throughout Codebase

Use find-and-replace to update imports:

```typescript
// Old imports
import { APIError } from '../utils/ApiError.utils';
import { asyncHandler } from '../utils/asyncHandler.utils';

// New imports
import { APIError, ErrorCode } from '../utils/errors';
import { asyncHandler, ResponseBuilder } from '../utils/helpers';
```

## Checklist

- [ ] Update `src/index.ts` with new error handlers
- [ ] Add Sentry initialization
- [ ] Update all controllers to use `asyncHandler`
- [ ] Update all controllers to use `ResponseBuilder`
- [ ] Update all services to throw `APIError`
- [ ] Update all middleware to use `asyncHandler`
- [ ] Test error responses in development
- [ ] Test Sentry integration in staging
- [ ] Update API documentation with new error codes
- [ ] Remove old error handling files
- [ ] Update imports throughout codebase
- [ ] Run full test suite
- [ ] Deploy to staging for testing

## Benefits After Migration

✅ Consistent error responses across all endpoints
✅ Better error tracking with Sentry
✅ Type-safe error handling
✅ Cleaner controller code (no try-catch blocks)
✅ Better debugging with structured logging
✅ Client-friendly error codes
✅ Automatic request ID tracking
✅ Environment-aware error details

## Support

If you encounter issues during migration:
1. Check the implementation summary: `TASK_II_IMPLEMENTATION_SUMMARY.md`
2. Review the JSDoc comments in the new files
3. Test in development environment first
4. Verify error responses match expected format

---

**Migration Priority**: High
**Estimated Time**: 2-4 hours for full codebase
**Breaking Changes**: None (backward compatible during transition)
