# Verify Your Current Database Setup

Run these commands to understand which database is production and which is development.

## Step 1: List All Databases

```bash
# Connect to PostgreSQL container
docker exec -it postgres16 psql -U postgres
```

```sql
-- List all databases with size and description
SELECT 
    datname as database_name,
    pg_size_pretty(pg_database_size(datname)) as size,
    datconnlimit as connection_limit,
    (SELECT count(*) FROM pg_stat_activity WHERE datname = d.datname) as active_connections
FROM pg_database d
WHERE datistemplate = false
ORDER BY pg_database_size(datname) DESC;

-- Exit to run next commands
\q
```

**Expected Output:**
- `postgres` - Default database (likely your production)
- `postgres_dev` - Development database (likely has latest changes)

---

## Step 2: Compare Database Schemas and Data

### Check postgres_dev Database

```bash
docker exec -it postgres16 psql -U postgres -d postgres_dev
```

```sql
-- Check when database was last modified
SELECT 
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY greatest(last_vacuum, last_autovacuum, last_analyze, last_autoanalyze) DESC NULLS LAST
LIMIT 10;

-- Check table structure for products (look for new columns)
\d products

-- Check if miniDescription and longDescription columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('miniDescription', 'longDescription', 'description');

-- Check homepage_section for new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'homepage_section' 
AND column_name IN ('selectedCategoryId', 'selectedSubcategoryId', 'selectedDealId');

-- Count records in key tables
SELECT 
    'users' as table_name, COUNT(*) as row_count, MAX(id) as max_id FROM "user"
UNION ALL
SELECT 'products', COUNT(*), MAX(id) FROM products
UNION ALL
SELECT 'orders', COUNT(*), MAX(id) FROM "order"
UNION ALL
SELECT 'vendors', COUNT(*), MAX(id) FROM vendor
UNION ALL
SELECT 'categories', COUNT(*), MAX(id) FROM category
UNION ALL
SELECT 'reviews', COUNT(*), MAX(id) FROM review
ORDER BY table_name;

-- Check most recent orders (to see if this is active)
SELECT id, "userId", "totalAmount", status, "createdAt" 
FROM "order" 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- Check most recent users
SELECT id, email, "firstName", "lastName", "createdAt" 
FROM "user" 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- Exit
\q
```

### Check postgres Database (Default/Production)

```bash
docker exec -it postgres16 psql -U postgres -d postgres
```

```sql
-- Check when database was last modified
SELECT 
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY greatest(last_vacuum, last_autovacuum, last_analyze, last_autoanalyze) DESC NULLS LAST
LIMIT 10;

-- Check table structure for products
\d products

-- Check if miniDescription and longDescription columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('miniDescription', 'longDescription', 'description');

-- Check homepage_section for new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'homepage_section' 
AND column_name IN ('selectedCategoryId', 'selectedSubcategoryId', 'selectedDealId');

-- Count records in key tables
SELECT 
    'users' as table_name, COUNT(*) as row_count, MAX(id) as max_id FROM "user"
UNION ALL
SELECT 'products', COUNT(*), MAX(id) FROM products
UNION ALL
SELECT 'orders', COUNT(*), MAX(id) FROM "order"
UNION ALL
SELECT 'vendors', COUNT(*), MAX(id) FROM vendor
UNION ALL
SELECT 'categories', COUNT(*), MAX(id) FROM category
UNION ALL
SELECT 'reviews', COUNT(*), MAX(id) FROM review
ORDER BY table_name;

-- Check most recent orders
SELECT id, "userId", "totalAmount", status, "createdAt" 
FROM "order" 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- Check most recent users
SELECT id, email, "firstName", "lastName", "createdAt" 
FROM "user" 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- Exit
\q
```

---

## Step 3: Analyze the Results

### Compare the outputs to determine:

**postgres_dev is likely your DEV database if:**
- ✅ Has `miniDescription` and `longDescription` columns in products table
- ✅ Has `selectedCategoryId`, `selectedSubcategoryId`, `selectedDealId` in homepage_section
- ✅ Has newer schema modifications
- ✅ Might have fewer records or test data
- ✅ More recent table modifications

**postgres is likely your PROD database if:**
- ✅ Missing the new columns (miniDescription, longDescription, etc.)
- ✅ Has more records (higher row counts)
- ✅ Has more recent orders and users (active production data)
- ✅ Larger database size
- ✅ More active connections

---

## Step 4: Check Your Backend Configuration

```bash
# Check which database your backend is currently using
cat backend/.env | grep DATABASE_URL

# Expected output will show either:
# DATABASE_URL="postgresql://postgres:TwAgpaWoiXJvub1@103.250.133.25:5432/postgres"
# or
# DATABASE_URL="postgresql://postgres:TwAgpaWoiXJvub1@103.250.133.25:5432/postgres_dev"
```

---

## Step 5: Summary Table

Fill this in based on your findings:

| Aspect | postgres_dev | postgres |
|--------|--------------|----------|
| Has new columns? | ☐ Yes ☐ No | ☐ Yes ☐ No |
| User count | _____ | _____ |
| Product count | _____ | _____ |
| Order count | _____ | _____ |
| Most recent order date | _____ | _____ |
| Database size | _____ | _____ |
| Currently used by backend? | ☐ Yes ☐ No | ☐ Yes ☐ No |
| **Conclusion** | ☐ DEV ☐ PROD | ☐ DEV ☐ PROD |

---

## Decision Matrix

### Scenario A: postgres_dev has new columns, postgres does NOT
**Conclusion:** 
- `postgres_dev` = Development database (has latest schema)
- `postgres` = Production database (needs migration)

**Action:** Migrate `postgres` (prod) to match `postgres_dev` (dev) schema

### Scenario B: Both have same columns, postgres has more data
**Conclusion:**
- `postgres` = Production database (active, more data)
- `postgres_dev` = Development database (testing)

**Action:** Both are up to date, just use appropriate one for each environment

### Scenario C: postgres has new columns, postgres_dev does NOT
**Conclusion:**
- `postgres` = Production database (somehow got updated first)
- `postgres_dev` = Development database (needs update)

**Action:** Update `postgres_dev` to match `postgres` schema

### Scenario D: Neither has new columns
**Conclusion:**
- Both databases need schema updates
- Determine which is prod based on data volume and recency

**Action:** Apply schema updates to both databases

---

## Next Steps

After running these verification commands, share the results and I'll:
1. Update the migration guide with the correct database names
2. Provide the exact migration strategy for your situation
3. Ensure no data loss during the process

**Please share:**
- The row counts from both databases
- Whether new columns exist in each database
- Which database your backend is currently using
- The most recent order dates from both databases
