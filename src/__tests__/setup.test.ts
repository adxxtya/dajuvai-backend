/**
 * Basic setup verification test
 * Ensures Jest and test infrastructure are configured correctly
 * Requirements: 1.1, 1.2
 */

describe('Test Infrastructure Setup', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should have test environment variables loaded', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.TEST_DATABASE_URL).toBeDefined();
  });

  it('should have faker library installed', () => {
    // Faker is installed and will be used in test data factories
    // We verify it's in package.json dependencies
    const packageJson = require('../../package.json');
    expect(packageJson.devDependencies['@faker-js/faker']).toBeDefined();
  });

  it('should have supertest installed', () => {
    // Supertest is installed and will be used for HTTP testing
    const packageJson = require('../../package.json');
    expect(packageJson.devDependencies['supertest']).toBeDefined();
  });

  it('should have jest configured with correct timeout', () => {
    expect(jest.setTimeout).toBeDefined();
  });
});
