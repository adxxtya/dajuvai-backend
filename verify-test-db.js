/**
 * Test Database Verification Script
 * 
 * This script helps verify that your test database is properly set up
 * and accessible from your local machine.
 * 
 * Usage: node verify-test-db.js
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.test' });

async function verifyTestDatabase() {
  console.log('🔍 Verifying Test Database Setup...\n');

  // Extract connection details
  const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ ERROR: No database URL found in .env.test');
    console.error('   Please ensure TEST_DATABASE_URL is set in .env.test');
    process.exit(1);
  }

  console.log(`📊 Database URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

  // Check if database name contains "test"
  const dbName = extractDatabaseName(dbUrl);
  console.log(`📁 Database Name: ${dbName}`);

  if (!dbName.toLowerCase().includes('test')) {
    console.error('\n❌ SAFETY CHECK FAILED!');
    console.error(`   Database name "${dbName}" does not contain "test"`);
    console.error('   Tests can only run on databases with "test" in the name');
    console.error('   This is a critical safety feature to prevent data loss');
    process.exit(1);
  }

  console.log('✅ Database name contains "test" - Safety check passed\n');

  // Try to connect
  const client = new Client({
    connectionString: dbUrl,
    ssl: false,
  });

  try {
    console.log('🔌 Attempting to connect to test database...');
    await client.connect();
    console.log('✅ Successfully connected to test database!\n');

    // Check database version
    const versionResult = await client.query('SELECT version()');
    console.log('📦 PostgreSQL Version:');
    console.log(`   ${versionResult.rows[0].version.split(',')[0]}\n`);

    // Check if database is empty or has tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    if (tablesResult.rows.length === 0) {
      console.log('📋 Database Status: Empty (no tables yet)');
      console.log('   This is normal for a new test database');
      console.log('   Tables will be created automatically when tests run\n');
    } else {
      console.log(`📋 Database Status: ${tablesResult.rows.length} tables found`);
      console.log('   Tables:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('');
    }

    // Check permissions
    const permissionsResult = await client.query(`
      SELECT has_database_privilege(current_user, current_database(), 'CREATE') as can_create,
             has_database_privilege(current_user, current_database(), 'CONNECT') as can_connect
    `);

    const perms = permissionsResult.rows[0];
    console.log('🔐 Permissions Check:');
    console.log(`   Can Connect: ${perms.can_connect ? '✅' : '❌'}`);
    console.log(`   Can Create: ${perms.can_create ? '✅' : '❌'}\n`);

    if (!perms.can_create || !perms.can_connect) {
      console.warn('⚠️  WARNING: Limited permissions detected');
      console.warn('   You may need to grant additional permissions');
      console.warn('   Run: GRANT ALL ON SCHEMA public TO postgres;\n');
    }

    console.log('✅ Test database verification complete!');
    console.log('   You can now run tests with: npm test\n');

  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error(`   Error: ${error.message}\n`);

    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Troubleshooting tips:');
      console.error('   1. Check if PostgreSQL is running on the EC2 instance');
      console.error('   2. Verify firewall allows connections on port 5432');
      console.error('   3. Check PostgreSQL configuration (listen_addresses, pg_hba.conf)');
      console.error('   4. Ensure the database "dajuvai_test" exists\n');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist!');
      console.error('   Please create the test database on AWS EC2:');
      console.error('   1. SSH into EC2: ssh ubuntu@103.250.133.25');
      console.error('   2. Connect to PostgreSQL: sudo -u postgres psql');
      console.error('   3. Create database: CREATE DATABASE dajuvai_test;');
      console.error('   4. Exit: \\q\n');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed!');
      console.error('   Check username and password in .env.test\n');
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

function extractDatabaseName(url) {
  try {
    const parts = url.split('/');
    const dbNameWithParams = parts[parts.length - 1];
    return dbNameWithParams.split('?')[0];
  } catch (error) {
    return 'unknown';
  }
}

// Run verification
verifyTestDatabase().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
