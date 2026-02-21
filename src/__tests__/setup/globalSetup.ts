import { config } from 'dotenv';
import TestDataSource from '../../config/db.test.config';
import AppDataSource from '../../config/db.config';

/**
 * Global setup for Jest tests
 * Runs once before all test suites
 * Requirements: 1.1, 1.2
 */
export default async function globalSetup() {
  // Load test environment variables
  config({ path: '.env.test' });
  
  console.log('🧪 Global test setup starting...');
  console.log(`📊 Test database: ${process.env.TEST_DATABASE_URL || process.env.DATABASE_URL}`);

  try {
    // Initialize TestDataSource first (used by test routes and some services)
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
      console.log('✅ TestDataSource connected');
      
      await TestDataSource.synchronize();
      console.log('✅ TestDataSource schema synchronized');
    }

    // Initialize AppDataSource (used by legacy services that haven't been updated)
    // Both point to the same test database via DATABASE_URL
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ AppDataSource connected to test database');
    }
    
    console.log('✅ Global test setup complete');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}
