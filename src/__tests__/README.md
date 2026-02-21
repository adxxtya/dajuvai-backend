# Backend API Integration Tests

This directory contains comprehensive integration tests for all backend API endpoints.

## Setup

### Prerequisites

1. **PostgreSQL Database**: You need a separate test database
2. **Node.js**: Version 20 or higher
3. **Dependencies**: Run `npm install` to install all dependencies

### Test Database Setup

1. Create a test database in PostgreSQL:
```sql
CREATE DATABASE dajuvai_test;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE dajuvai_test TO test_user;
```

2. Update `.env.test` with your test database credentials:
```env
TEST_DATABASE_URL="postgresql://test_user:test_password@localhost:5432/dajuvai_test"
```

### Environment Variables

The test suite uses `.env.test` for configuration. This file contains:
- Test database connection string
- Mock credentials for external services (Cloudinary, payment gateways, etc.)
- JWT secrets for authentication testing

**Important**: Never use production credentials in `.env.test`!

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- auth.test.ts
```

### Run tests verbosely
```bash
npm run test:verbose
```

## Test Structure

```
__tests__/
├── setup/                    # Test infrastructure
│   ├── globalSetup.ts       # Runs once before all tests
│   ├── globalTeardown.ts    # Runs once after all tests
│   ├── jest.setup.ts        # Runs before each test file
│   ├── testDatabase.ts      # Database management utilities
│   ├── testDataFactory.ts   # Factory functions for test data
│   └── testHelpers.ts       # Shared test utilities
└── integration/             # Integration test suites
    ├── auth.test.ts         # Authentication endpoints
    ├── products.test.ts     # Product endpoints
    ├── orders.test.ts       # Order endpoints
    └── ...                  # Other endpoint tests
```

## Writing Tests

### Test File Template

```typescript
import request from 'supertest';
import { TestDatabase } from '../setup/testDatabase';
import { TestDataFactory } from '../setup/testDataFactory';
import { TestHelpers } from '../setup/testHelpers';
import app from '../../index'; // Your Express app

describe('Feature API Endpoints', () => {
  let testDb: TestDatabase;
  let factory: TestDataFactory;
  let helpers: TestHelpers;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.connect();
    factory = new TestDataFactory();
    helpers = new TestHelpers();
  });

  afterAll(async () => {
    await testDb.clearDatabase();
    await testDb.disconnect();
  });

  describe('POST /api/endpoint', () => {
    it('should handle valid request', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after tests complete
3. **Realistic Data**: Use the TestDataFactory to generate realistic test data
4. **Authentication**: Use TestHelpers to create authenticated users/vendors
5. **Assertions**: Test both success and error cases
6. **Performance**: Keep tests fast by minimizing database operations

## Test Data Management

### Creating Test Data

Use the `TestDataFactory` to create test entities:

```typescript
const userData = factory.createUser({ email: 'custom@test.com' });
const productData = factory.createProduct({ name: 'Test Product' });
```

### Cleaning Up Test Data

The `TestDatabase` class provides cleanup utilities:

```typescript
await testDb.clearDatabase(); // Clear all tables
```

## Troubleshooting

### Tests fail with database connection errors
- Ensure PostgreSQL is running
- Verify `.env.test` has correct database credentials
- Check that the test database exists

### Tests timeout
- Increase timeout in `jest.config.js` or individual tests
- Check for database connection leaks
- Ensure async operations are properly awaited

### Tests interfere with each other
- Ensure proper cleanup in `afterEach` or `afterAll` hooks
- Use unique test data (emails, usernames) to avoid conflicts
- Consider running tests serially with `maxWorkers: 1`

## CI/CD Integration

Tests are configured to run in CI/CD pipelines. See `.github/workflows/test.yml` for configuration.

## Coverage

Coverage reports are generated in the `coverage/` directory. View the HTML report:

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Requirements Traceability

Each test references specific requirements from the requirements document. Look for comments like:

```typescript
/**
 * Feature: backend-api-testing
 * Property 1: Authentication Token Validity
 * Validates: Requirements 2.1, 2.2
 */
```

This ensures all requirements are tested and provides traceability.
