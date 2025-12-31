import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../config/db.test.config';

/**
 * Global setup for integration tests
 * Runs once before all test suites
 */
beforeAll(async () => {
  // Initialize test database connection
  await initializeTestDatabase();
}, 30000); // 30 second timeout for database initialization

/**
 * Clean up after each test suite
 */
afterEach(async () => {
  // Clear all data between tests to ensure isolation
  await clearTestDatabase();
}, 10000); // 10 second timeout for cleanup

/**
 * Global teardown for integration tests
 * Runs once after all test suites
 */
afterAll(async () => {
  // Close database connection
  await closeTestDatabase();
}, 10000); // 10 second timeout for closing connection
