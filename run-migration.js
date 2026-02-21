const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:TwAgpaWoiXJvub1@103.250.133.25:5432/postgres"
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const sqlFile = fs.readFileSync(path.join(__dirname, 'ADD_BANK_CODE_COLUMN.sql'), 'utf8');

    await client.query(sqlFile);
    console.log('✅ Migration executed successfully');

    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'vendor' AND column_name = 'bankCode'
    `);

    if (result.rows.length > 0) {
      console.log('✅ bankCode column verified:', result.rows[0]);
    } else {
      console.log('⚠️ bankCode column not found after migration');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
