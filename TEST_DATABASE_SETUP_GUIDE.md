# Test Database Setup Guide for AWS EC2

## ⚠️ CRITICAL: Why We Need a Separate Test Database

**NEVER run tests on your production database!** Tests will:
- Create temporary data
- Delete data after tests
- Potentially corrupt data if tests fail
- Risk deleting production user data

## Current Setup

- **Production Database**: `postgres` on AWS EC2 (103.250.133.25:5432)
- **Test Database**: `dajuvai_test` on AWS EC2 (103.250.133.25:5432) - **NEEDS TO BE CREATED**

## Step-by-Step Setup Instructions

### Step 1: Connect to Your AWS EC2 Instance

```bash
# Replace with your actual EC2 connection details
ssh -i your-key.pem ubuntu@103.250.133.25

# Or if using password authentication
ssh ubuntu@103.250.133.25
```

### Step 2: Connect to PostgreSQL

```bash
# Switch to postgres user and open psql
sudo -u postgres psql
```

### Step 3: Create the Test Database

Copy and paste these commands one by one:

```sql
-- 1. Create the test database
CREATE DATABASE dajuvai_test;

-- 2. Verify it was created
\l

-- You should see both databases:
-- - postgres (production)
-- - dajuvai_test (test)

-- 3. Connect to the test database
\c dajuvai_test

-- 4. Grant necessary permissions
GRANT ALL ON SCHEMA public TO postgres;

-- 5. Exit psql
\q
```

### Step 4: Verify the Setup

```bash
# List all databases
sudo -u postgres psql -l

# You should see:
# postgres      | postgres | ...
# dajuvai_test  | postgres | ...
```

### Step 5: Test the Connection

From your local machine, test that you can connect to the test database:

```bash
# From the backend directory
cd backend

# Test connection using the .env.test file
npm test -- --listTests
```

## Safety Features Built Into the Test Framework

Our test framework has multiple safety layers:

### 1. Database Name Validation
```typescript
// Before ANY operation, the system checks:
if (!dbName.toLowerCase().includes('test')) {
  throw new Error('SAFETY CHECK FAILED: Not a test database!');
}
```

### 2. Selective Deletion Only
- Tests track every entity ID they create
- Cleanup ONLY deletes tracked entities
- Never uses TRUNCATE or bulk DELETE
- Respects foreign key constraints

### 3. Environment Separation
- `.env` = Production database
- `.env.test` = Test database
- Tests automatically load `.env.test`

## What Happens During Tests

1. **Setup**: Connect to test database, verify name contains "test"
2. **Test Execution**: Create test data, track all IDs
3. **Cleanup**: Delete ONLY tracked entities, leave everything else untouched
4. **Teardown**: Disconnect from database

## Troubleshooting

### Error: "SAFETY CHECK FAILED: Database name does not contain 'test'"

**Solution**: Make sure you created the `dajuvai_test` database on AWS.

### Error: "Connection refused" or "ECONNREFUSED"

**Possible causes**:
1. PostgreSQL is not running on EC2
2. Firewall blocking port 5432
3. PostgreSQL not configured to accept remote connections

**Check PostgreSQL is running**:
```bash
ssh ubuntu@103.250.133.25
sudo systemctl status postgresql
```

**Check PostgreSQL configuration**:
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/*/main/postgresql.conf

# Ensure this line exists:
listen_addresses = '*'

# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Add this line (if not present):
host    all             all             0.0.0.0/0               md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Error: "Permission denied"

**Solution**: Grant permissions to the postgres user:
```sql
sudo -u postgres psql
\c dajuvai_test
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

## Running Tests

Once the test database is set up:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- databaseSafety.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch
```

## Monitoring Test Database

### Check database size
```sql
SELECT pg_size_pretty(pg_database_size('dajuvai_test'));
```

### Check table counts
```sql
\c dajuvai_test
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables;
```

### Clear test database manually (if needed)
```sql
\c dajuvai_test

-- Drop all tables (ONLY do this on test database!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
```

## Best Practices

1. ✅ **Always use `.env.test` for testing**
2. ✅ **Never modify `.env` to point to test database**
3. ✅ **Run tests before deploying to production**
4. ✅ **Keep test database schema in sync with production**
5. ✅ **Regularly clean up test database if it grows too large**
6. ❌ **Never run tests on production database**
7. ❌ **Never use production credentials in test files**

## Database Schema Synchronization

The test database uses TypeORM's `synchronize: true` option, which automatically creates/updates the schema based on your entities. This means:

- No manual migrations needed for test database
- Schema automatically matches your entity definitions
- Test database schema stays in sync with code changes

## Security Notes

- Test database uses same credentials as production (for simplicity)
- Test database is on same server as production (acceptable for testing)
- Test database name MUST contain "test" (enforced by code)
- Consider using separate credentials for test database in production environments

## Next Steps

After creating the test database:

1. ✅ Create `dajuvai_test` database on AWS EC2
2. ✅ Update `.env.test` with correct connection string (already done)
3. ✅ Run tests to verify everything works
4. ✅ Review test output and fix any failing tests
5. ✅ Set up CI/CD to run tests automatically

## Support

If you encounter issues:
1. Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
2. Verify network connectivity: `telnet 103.250.133.25 5432`
3. Test database connection: `psql -h 103.250.133.25 -U postgres -d dajuvai_test`
4. Review test output for specific error messages
