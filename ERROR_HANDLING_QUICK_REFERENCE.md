# Error Handling Quick Reference

Quick reference for using the new error handling infrastructure in Dajuvai backend.

## Import Statements

```typescript
// Error classes and codes
import { APIError, ErrorCode } from '../utils/errors';

// Helper utilities
import { asyncHandler, ResponseBuilder } from '../utils/helpers';
```

## Common Error Patterns

### 400 Bad Request
```typescript
throw APIError.badRequest('Invalid input', ErrorCode.INVALID_INPUT);
throw APIError.badRequest('Insufficient stock', ErrorCode.INSUFFICIENT_STOCK, { available: 5 });
throw APIError.validation('Validation failed', { errors: [...] });
```

### 401 Unauthorized
```typescript
throw APIError.unauthorized(); // Default message
throw APIError.unauthorized('Invalid credentials', ErrorCode.INVALID_CREDENTIALS);
throw APIError.unauthorized('Token expired', ErrorCode.TOKEN_EXPIRED);
```

### 403 Forbidden
```typescript
throw APIError.forbidden(); // Default message
throw APIError.forbidden('Admin access required', ErrorCode.INSUFFICIENT_PERMISSIONS);
```

### 404 Not Found
```typescript
throw APIError.notFound(); // Default message
throw APIError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
throw APIError.notFound('Product not found', ErrorCode.PRODUCT_NOT_FOUND);
```

### 409 Conflict
```typescript
throw APIError.conflict('Email already exists', ErrorCode.EMAIL_ALREADY_EXISTS);
throw APIError.conflict('Phone already registered', ErrorCode.PHONE_ALREADY_EXISTS);
```

### 429 Too Many Requests
```typescript
throw APIError.tooManyRequests(); // Default message
throw APIError.tooManyRequests('Rate limit exceeded', 60); // with retry after
```

### 500 Internal Server Error
```typescript
throw APIError.internal(); // Default message
throw APIError.internal('Database connection failed', ErrorCode.DATABASE_ERROR);
```

## Response Patterns

### Success Response
```typescript
res.json(ResponseBuilder.success(data));
res.json(ResponseBuilder.success(data, 'Operation successful'));
res.json(ResponseBuilder.success(data, 'User created', { userId: user.id }));
```

### Created Response (201)
```typescript
res.status(201).json(ResponseBuilder.created(newUser));
res.status(201).json(ResponseBuilder.created(newUser, 'User created successfully'));
```

### No Content Response (204)
```typescript
res.status(204).json(ResponseBuilder.noContent());
res.status(204).json(ResponseBuilder.noContent('User deleted successfully'));
```

### Paginated Response
```typescript
const [items, total] = await repo.findAndCount({ skip, take });
res.json(ResponseBuilder.paginated(items, page, limit, total));

// With additional metadata
res.json(ResponseBuilder.paginated(items, page, limit, total, { category: 'electronics' }));
```

## Controller Pattern

```typescript
import { asyncHandler, ResponseBuilder } from '../utils/helpers';
import { APIError, ErrorCode } from '../utils/errors';

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  
  if (!user) {
    throw APIError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
  }
  
  res.json(ResponseBuilder.success(user));
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.create(req.body);
  res.status(201).json(ResponseBuilder.created(user, 'User created successfully'));
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.update(req.params.id, req.body);
  res.json(ResponseBuilder.success(user, 'User updated successfully'));
});

export const deleteUser = asyncHandler(async (req, res) => {
  await userService.delete(req.params.id);
  res.status(204).json(ResponseBuilder.noContent('User deleted successfully'));
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [users, total] = await userService.findAll(page, limit);
  res.json(ResponseBuilder.paginated(users, page, limit, total));
});
```

## Service Pattern

```typescript
import { APIError, ErrorCode } from '../utils/errors';

class UserService {
  async findById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    
    if (!user) {
      throw APIError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
    }
    
    return user;
  }
  
  async create(data: CreateUserDto): Promise<User> {
    // Check for duplicate email
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) {
      throw APIError.conflict('Email already exists', ErrorCode.EMAIL_ALREADY_EXISTS);
    }
    
    // Create user
    const user = this.userRepo.create(data);
    return await this.userRepo.save(user);
  }
  
  async checkStock(productId: number, quantity: number): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    
    if (!product) {
      throw APIError.notFound('Product not found', ErrorCode.PRODUCT_NOT_FOUND);
    }
    
    if (product.stock < quantity) {
      throw APIError.badRequest(
        'Insufficient stock available',
        ErrorCode.INSUFFICIENT_STOCK,
        { available: product.stock, requested: quantity }
      );
    }
  }
}
```

## Middleware Pattern

```typescript
import { asyncHandler } from '../utils/helpers';
import { APIError, ErrorCode } from '../utils/errors';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw APIError.unauthorized('No token provided', ErrorCode.INVALID_TOKEN);
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await userService.findById(decoded.id);
    next();
  } catch (error) {
    throw APIError.unauthorized('Invalid token', ErrorCode.INVALID_TOKEN);
  }
});

export const authorize = (...roles: string[]) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw APIError.unauthorized('Not authenticated', ErrorCode.AUTHENTICATION_FAILED);
    }
    
    if (!roles.includes(req.user.role)) {
      throw APIError.forbidden('Insufficient permissions', ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    
    next();
  });
};
```

## Error Codes Reference

| Code | Status | Use Case |
|------|--------|----------|
| `VALIDATION_ERROR` | 400 | Form validation failures |
| `INVALID_INPUT` | 400 | Invalid request data |
| `AUTHENTICATION_FAILED` | 401 | Login failures |
| `INVALID_TOKEN` | 401 | Missing/invalid JWT |
| `TOKEN_EXPIRED` | 401 | Expired JWT |
| `SESSION_REVOKED` | 401 | Revoked session |
| `UNAUTHORIZED_ACCESS` | 403 | Insufficient permissions |
| `FORBIDDEN` | 403 | Access denied |
| `RESOURCE_NOT_FOUND` | 404 | Generic not found |
| `USER_NOT_FOUND` | 404 | User not found |
| `PRODUCT_NOT_FOUND` | 404 | Product not found |
| `ORDER_NOT_FOUND` | 404 | Order not found |
| `DUPLICATE_RESOURCE` | 409 | Generic duplicate |
| `EMAIL_ALREADY_EXISTS` | 409 | Duplicate email |
| `PHONE_ALREADY_EXISTS` | 409 | Duplicate phone |
| `INSUFFICIENT_STOCK` | 400 | Not enough stock |
| `OUT_OF_STOCK` | 400 | Zero stock |
| `CART_EMPTY` | 400 | Empty cart |
| `PAYMENT_FAILED` | 400 | Payment processing failed |
| `PAYMENT_VERIFICATION_FAILED` | 400 | Payment verification failed |
| `PAYMENT_AMOUNT_MISMATCH` | 400 | Amount doesn't match |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `FILE_TOO_LARGE` | 400 | File size exceeded |
| `INVALID_FILE_TYPE` | 400 | Wrong file type |
| `INTERNAL_SERVER_ERROR` | 500 | Generic server error |
| `DATABASE_ERROR` | 500 | Database operation failed |

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "meta": {
    "requestId": "abc-123"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "requestId": "abc-123"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "User not found",
  "code": "USER_NOT_FOUND",
  "meta": {
    "requestId": "abc-123"
  }
}
```

### Validation Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "invalid_string"
      }
    ]
  },
  "meta": {
    "requestId": "abc-123"
  }
}
```

## Tips

1. **Always use `asyncHandler`** for async route handlers and middleware
2. **Use specific error codes** instead of generic ones when possible
3. **Include helpful details** in error responses (available stock, etc.)
4. **Don't expose sensitive info** in error messages (database details, etc.)
5. **Use ResponseBuilder** for all success responses for consistency
6. **Let errors bubble up** from services to controllers to error handler
7. **Log context** with errors (user ID, request ID, etc.)

## Don't Do This ❌

```typescript
// Don't use try-catch in controllers
export const getUser = async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Don't return errors directly
if (!user) {
  return res.status(404).json({ success: false, message: 'Not found' });
}

// Don't throw generic errors
throw new Error('Something went wrong');
```

## Do This Instead ✅

```typescript
// Use asyncHandler and throw APIError
export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(ResponseBuilder.success(user));
});

// Throw specific errors
if (!user) {
  throw APIError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
}

// Use APIError with proper codes
throw APIError.internal('Database connection failed', ErrorCode.DATABASE_ERROR);
```

---

**Keep this reference handy while developing!**
