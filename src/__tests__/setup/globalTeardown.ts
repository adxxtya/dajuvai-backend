/**
 * Global teardown for Jest tests
 * Runs once after all test suites complete
 * Requirements: 1.1, 1.2
 */
export default async function globalTeardown() {
  console.log('🧹 Global test teardown complete');
}
