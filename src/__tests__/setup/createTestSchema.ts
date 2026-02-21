import TestDataSource from '../../config/db.test.config';
import { config } from 'dotenv';

/**
 * Script to create test database schema
 * Run this before running tests: npx ts-node src/__tests__/setup/createTestSchema.ts
 */
async function createTestSchema() {
  try {
    // Load test environment
    config({ path: '.env.test' });
    
    console.log('🔧 Creating test database schema...');
    console.log(`📊 Database: ${process.env.TEST_DATABASE_URL}`);
    
    // Initialize connection
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
      console.log('✅ Connected to test database');
    }
    
    // Synchronize schema (create tables)
    await TestDataSource.synchronize();
    console.log('✅ Schema synchronized successfully');
    
    // Close connection
    await TestDataSource.destroy();
    console.log('✅ Test schema creation complete');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create test schema:', error);
    process.exit(1);
  }
}

createTestSchema();
