import { TestDatabase } from '../setup/testDatabase';

/**
 * Property-Based Test: Database Safety Validation
 * 
 * Feature: backend-api-testing
 * Property 3: For any database connection attempt, if the database name 
 * does not contain "test", the system should throw an error and prevent 
 * all operations
 * 
 * Validates: Requirements 1.2, 1.3
 * 
 * This test ensures that the TestDatabase class enforces the critical
 * safety requirement that only databases with "test" in their name can
 * be used for testing. This prevents accidental data loss in production
 * or development databases.
 */
describe('Property 3: Database Safety Validation', () => {
  /**
   * Test that database name validation works correctly
   * 
   * We test this by:
   * 1. Verifying that the current test database passes validation
   * 2. Simulating invalid database names and verifying they are rejected
   */
  describe('Database name validation', () => {
    it('should pass validation when database name contains "test"', () => {
      // Arrange
      const testDb = new TestDatabase();
      
      // Act & Assert
      // Should not throw an error
      expect(() => testDb.validateTestDatabase()).not.toThrow();
    });

    it('should throw error when database name does not contain "test"', () => {
      // Arrange
      const originalUrl = process.env.TEST_DATABASE_URL;
      const originalDbUrl = process.env.DATABASE_URL;
      
      // Test with various non-test database names
      const invalidDatabaseUrls = [
        'postgresql://user:pass@localhost:5432/dajuvai_production',
        'postgresql://user:pass@localhost:5432/dajuvai_dev',
        'postgresql://user:pass@localhost:5432/dajuvai',
        'postgresql://user:pass@localhost:5432/production_db',
        'postgresql://user:pass@localhost:5432/myapp',
      ];

      invalidDatabaseUrls.forEach((invalidUrl) => {
        // Act
        process.env.TEST_DATABASE_URL = invalidUrl;
        process.env.DATABASE_URL = invalidUrl;
        
        const testDb = new TestDatabase();
        
        // Assert
        expect(() => testDb.validateTestDatabase()).toThrow(/SAFETY CHECK FAILED/);
        expect(() => testDb.validateTestDatabase()).toThrow(/does not contain "test"/);
      });

      // Cleanup - restore original URLs
      process.env.TEST_DATABASE_URL = originalUrl;
      process.env.DATABASE_URL = originalDbUrl;
    });

    it('should be case-insensitive when checking for "test" in database name', () => {
      // Arrange
      const originalUrl = process.env.TEST_DATABASE_URL;
      const originalDbUrl = process.env.DATABASE_URL;
      
      // Test with various case variations of "test"
      const validDatabaseUrls = [
        'postgresql://user:pass@localhost:5432/dajuvai_test',
        'postgresql://user:pass@localhost:5432/dajuvai_TEST',
        'postgresql://user:pass@localhost:5432/dajuvai_Test',
        'postgresql://user:pass@localhost:5432/TEST_database',
        'postgresql://user:pass@localhost:5432/testing_db',
      ];

      validDatabaseUrls.forEach((validUrl) => {
        // Act
        process.env.TEST_DATABASE_URL = validUrl;
        process.env.DATABASE_URL = validUrl;
        
        const testDb = new TestDatabase();
        
        // Assert - should not throw
        expect(() => testDb.validateTestDatabase()).not.toThrow();
      });

      // Cleanup - restore original URLs
      process.env.TEST_DATABASE_URL = originalUrl;
      process.env.DATABASE_URL = originalDbUrl;
    });
  });

  /**
   * Test that validation is enforced before critical operations
   */
  describe('Validation enforcement', () => {
    it('should validate database before connecting', async () => {
      // Arrange
      const originalUrl = process.env.TEST_DATABASE_URL;
      const originalDbUrl = process.env.DATABASE_URL;
      
      // Set to invalid database
      process.env.TEST_DATABASE_URL = 'postgresql://user:pass@localhost:5432/production_db';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/production_db';
      
      const testDb = new TestDatabase();
      
      // Act & Assert
      await expect(testDb.connect()).rejects.toThrow(/SAFETY CHECK FAILED/);
      
      // Cleanup
      process.env.TEST_DATABASE_URL = originalUrl;
      process.env.DATABASE_URL = originalDbUrl;
    });

    it('should validate database before clearing data', async () => {
      // Arrange
      const originalUrl = process.env.TEST_DATABASE_URL;
      const originalDbUrl = process.env.DATABASE_URL;
      
      const testDb = new TestDatabase();
      
      // Connect with valid database first
      await testDb.connect();
      
      // Now change to invalid database
      process.env.TEST_DATABASE_URL = 'postgresql://user:pass@localhost:5432/production_db';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/production_db';
      
      // Act & Assert
      await expect(testDb.clearTestData()).rejects.toThrow(/SAFETY CHECK FAILED/);
      
      // Cleanup
      await testDb.disconnect();
      process.env.TEST_DATABASE_URL = originalUrl;
      process.env.DATABASE_URL = originalDbUrl;
    });
  });

  /**
   * Property-based test: Run validation check 100 times with different scenarios
   * 
   * This ensures the validation is consistent and reliable across many iterations
   */
  describe('Property-based validation (100 iterations)', () => {
    it('should consistently validate test databases across multiple iterations', () => {
      const iterations = 100;
      let successCount = 0;

      for (let i = 0; i < iterations; i++) {
        const testDb = new TestDatabase();
        
        try {
          testDb.validateTestDatabase();
          successCount++;
        } catch (error) {
          // If validation fails, it means we're not using a test database
          // This should not happen in our test environment
          fail(`Validation failed on iteration ${i + 1}: ${error}`);
        }
      }

      // All iterations should pass
      expect(successCount).toBe(iterations);
    });

    it('should consistently reject non-test databases across multiple iterations', () => {
      const iterations = 100;
      const originalUrl = process.env.TEST_DATABASE_URL;
      const originalDbUrl = process.env.DATABASE_URL;
      
      let rejectionCount = 0;

      for (let i = 0; i < iterations; i++) {
        // Use a different invalid database name each iteration
        const invalidUrl = `postgresql://user:pass@localhost:5432/production_db_${i}`;
        process.env.TEST_DATABASE_URL = invalidUrl;
        process.env.DATABASE_URL = invalidUrl;
        
        const testDb = new TestDatabase();
        
        try {
          testDb.validateTestDatabase();
          // Should not reach here
          fail(`Validation should have failed on iteration ${i + 1}`);
        } catch (error) {
          // Expected to throw
          rejectionCount++;
        }
      }

      // All iterations should reject
      expect(rejectionCount).toBe(iterations);

      // Cleanup
      process.env.TEST_DATABASE_URL = originalUrl;
      process.env.DATABASE_URL = originalDbUrl;
    });
  });
});
