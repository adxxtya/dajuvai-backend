# Safe Database Migration Guide - Zero Data Loss

## Your Current Setup

Based on your server configuration:
- **Container Name:** `postgres16` (not postgres16)
- **Container Image:** postgres:16-alpine
- **Port Mapping:** 0.0.0.0:5432->5432/tcp
- **Existing Databases:**
  - `postgres_dev` - Likely your development database with latest schema changes
  - `postgres` - Likely your production database with live data

**⚠️ IMPORTANT: Run the verification commands in `VERIFY_DATABASES.md` first to confirm which database is which!**

---

This guide ensures you migrate from your old database to the new backend without losing any records.

## Overview

You have:
- **Old Production Database**: Contains all your live data (users, products, orders, etc.)
- **New Backend**: Updated TypeORM entities with new features
- **Goal**: Migrate old data to new backend structure without losing anything

## Migration Strategy: Zero Downtime, Zero Data Loss

We'll use a **safe migration approach**:
1. Create a complete backup of old database
2. Create a new development database
3. Copy all data to new database
4. Apply schema changes (add new columns)
5. Test thoroughly
6. Switch to new database when ready

---

## Prerequisites

- SSH access to server with Docker (ubuntu@ubuntu-kathmandu-leaflet)
- PostgreSQL running in Docker container (container name: `postgres16`)
- PostgreSQL credentials (username: postgres, password: TwAgpaWoiXJvub1)
- Backup storage space (at least 2x your database size)
- **MUST RUN:** Verification commands from `VERIFY_DATABASES.md` to identify prod vs dev databases

---

## Important: Identify Your Databases First

Before proceeding, you need to know:
1. Which database is production (has live customer data)
2. Which database is development (has latest schema changes)

**Run the commands in `VERIFY_DATABASES.md` and come back here with the results.**

**Assumed Setup (verify first!):**
- `postgres` = Production database (live data, may be missing new columns)
- `postgres_dev` = Development database (latest schema, may have test data)

**Replace database names in commands below based on your verification results!**

---

## Step 1: Backup Old Database (CRITICAL - DO THIS FIRST!)

### Connect to Server and Create Backup

```bash
# SSH into your server
ssh ubuntu@ubuntu-kathmandu-leaflet

# List running containers to confirm postgres16 is running
docker ps | grep postgres

# Create backup directory on host (optional, for safety)
mkdir -p ~/database_backups
cd ~/database_backups

# Backup PRODUCTION database (replace 'postgres' with your actual prod database name)
docker exec postgres16 pg_dump -U postgres postgres > dajuvai_prod_backup_$(date +%Y%m%d_%H%M%S).sql

# Also backup DEV database for reference
docker exec postgres16 pg_dump -U postgres postgres_dev > dajuvai_dev_backup_$(date +%Y%m%d_%H%M%S).sql

# Or create compressed backups (recommended for large databases)
docker exec postgres16 pg_dump -U postgres -F c postgres > dajuvai_prod_backup_$(date +%Y%m%d_%H%M%S).backup
docker exec postgres16 pg_dump -U postgres -F c postgres_dev > dajuvai_dev_backup_$(date +%Y%m%d_%H%M%S).backup
```

### Verify Backup

```bash
# Check backup file sizes (should be > 0)
ls -lh dajuvai_*_backup_*.sql
ls -lh dajuvai_*_backup_*.backup

# Test backup integrity (for compressed backup)
docker exec postgres16 pg_restore --list ~/database_backups/dajuvai_prod_backup_*.backup 2>/dev/null | head -20

# Or check SQL backup
head -50 dajuvai_prod_backup_*.sql
```

**⚠️ DO NOT PROCEED until you have verified backups of BOTH databases!**

### Copy Backup into Container (for restore later)

```bash
# Copy production backup file into container's /tmp directory
docker cp dajuvai_prod_backup_*.sql postgres16:/tmp/dajuvai_prod_backup.sql
# or for compressed backup
docker cp dajuvai_prod_backup_*.backup postgres16:/tmp/dajuvai_prod_backup.backup

# Also copy dev backup
docker cp dajuvai_dev_backup_*.sql postgres16:/tmp/dajuvai_dev_backup.sql
```

---

## Step 2: Analyze Old Database Schema

Connect to your old database and document the current structure:

```bash
# Connect to PostgreSQL container
docker exec -it postgres16 psql -U postgres -d old_database_name
```

```sql
-- List all databases first to confirm the name
\l

-- List all tables
\dt

-- Check row counts for important tables
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM "user"
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM "order"
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendor
UNION ALL
SELECT 'categories', COUNT(*) FROM category
UNION ALL
SELECT 'reviews', COUNT(*) FROM review;

-- Export schema to file for reference
\o /tmp/old_schema.txt
\d+ user
\d+ products
\d+ "order"
\d+ vendor
\d+ category
\d+ subcategory
\d+ brand
\d+ cart
\d+ wishlist
\d+ review
\d+ address
\d+ banner
\d+ deals
\d+ homepage_section
\d+ promo
\d+ district
\o

-- Exit
\q
```

**Save this output!** You'll need it to verify data after migration.

```bash
# Copy the schema file from container to host for safekeeping
docker cp postgres16:/tmp/old_schema.txt ~/database_backups/old_schema.txt
```

---

## Step 3: Create New Database for Migration

```bash
# Connect to PostgreSQL container
docker exec -it postgres16 psql -U postgres
```

```sql
-- List existing databases
\l

-- Create new database for migration
CREATE DATABASE postgres_dev_new;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE postgres_dev_new TO postgres;

-- Verify database was created
\l

-- Exit
\q
```

---

## Step 4: Restore Backup to New Database

```bash
# Restore the backup to new database (inside container)
# For compressed backup:
docker exec -it postgres16 pg_restore -U postgres -d postgres_dev_new -v /tmp/dajuvai_prod_backup.backup

# Or if you used SQL dump:
docker exec -it postgres16 psql -U postgres -d postgres_dev_new -f /tmp/dajuvai_prod_backup.sql

# Check for any errors in the output
# Some warnings about existing objects are normal, but no ERROR messages should appear
```

### Verify Restore Success

```bash
# Connect to new database and check tables
docker exec -it postgres16 psql -U postgres -d postgres_dev_new
```

```sql
-- List all tables (should match old database)
\dt

-- Quick row count check
SELECT COUNT(*) FROM "user";
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM "order";

-- Exit
\q
```

---

## Step 5: Apply New Schema Changes

The new backend has additional columns. Add them to the migrated database:

```bash
# Connect to new database in container
docker exec -it postgres16 psql -U postgres -d postgres_dev_new
```

```sql
-- ============================================
-- PRODUCTS TABLE - Add new description fields
-- ============================================
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "miniDescription" text;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "longDescription" text;

-- Migrate existing description to new fields (optional)
UPDATE products 
SET "miniDescription" = LEFT(description, 200),
    "longDescription" = description
WHERE "miniDescription" IS NULL;


-- ============================================
-- HOMEPAGE_SECTION TABLE - Add new selection fields
-- ============================================
ALTER TABLE homepage_section 
ADD COLUMN IF NOT EXISTS "selectedCategoryId" integer;

ALTER TABLE homepage_section 
ADD COLUMN IF NOT EXISTS "selectedSubcategoryId" integer;

ALTER TABLE homepage_section 
ADD COLUMN IF NOT EXISTS "selectedDealId" integer;

-- Add foreign key constraints
ALTER TABLE homepage_section 
ADD CONSTRAINT fk_homepage_section_category 
FOREIGN KEY ("selectedCategoryId") 
REFERENCES category(id) 
ON DELETE SET NULL;

ALTER TABLE homepage_section 
ADD CONSTRAINT fk_homepage_section_subcategory 
FOREIGN KEY ("selectedSubcategoryId") 
REFERENCES subcategory(id) 
ON DELETE SET NULL;

ALTER TABLE homepage_section 
ADD CONSTRAINT fk_homepage_section_deal 
FOREIGN KEY ("selectedDealId") 
REFERENCES deals(id) 
ON DELETE SET NULL;


-- ============================================
-- SESSION TABLE - Add if missing
-- ============================================
CREATE TABLE IF NOT EXISTS session (
    id SERIAL PRIMARY KEY,
    "userId" integer,
    token text NOT NULL,
    "expiresAt" timestamp NOT NULL,
    "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_user FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
);


-- ============================================
-- NOTIFICATION TABLE - Add if missing
-- ============================================
CREATE TABLE IF NOT EXISTS notification (
    id SERIAL PRIMARY KEY,
    "userId" integer,
    "vendorId" integer,
    title varchar(255) NOT NULL,
    message text NOT NULL,
    type varchar(50),
    "isRead" boolean DEFAULT false,
    "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_vendor FOREIGN KEY ("vendorId") REFERENCES vendor(id) ON DELETE CASCADE
);


-- ============================================
-- VARIANT TABLE - Add if missing
-- ============================================
CREATE TABLE IF NOT EXISTS variant (
    id SERIAL PRIMARY KEY,
    "productId" integer NOT NULL,
    name varchar(255) NOT NULL,
    value varchar(255) NOT NULL,
    price decimal(10,2),
    stock integer DEFAULT 0,
    "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_variant_product FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE
);


-- ============================================
-- VERIFICATION
-- ============================================

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify row counts match old database
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM "user"
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM "order"
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendor
UNION ALL
SELECT 'categories', COUNT(*) FROM category
UNION ALL
SELECT 'reviews', COUNT(*) FROM review;

-- Check for any NULL values in critical fields
SELECT 
    COUNT(*) as total_products,
    COUNT(name) as products_with_name,
    COUNT(price) as products_with_price,
    COUNT("vendorId") as products_with_vendor
FROM products;

-- Exit
\q
```

---

## Step 6: Update Backend Configuration

Update your backend `.env` file to point to the new database:

```env
# Old database (keep as backup reference)
# DATABASE_URL="postgresql://postgres:TwAgpaWoiXJvub1@103.250.133.25:5432/old_database_name"

# New migrated database
DATABASE_URL="postgresql://postgres:TwAgpaWoiXJvub1@103.250.133.25:5432/postgres_dev_new"

# Set to development for testing
NODE_ENV=development

# Keep synchronize OFF to prevent accidental schema changes
# TypeORM will use the manually migrated schema
```

**Important**: In `backend/src/config/db.config.ts`, ensure:
```typescript
synchronize: false, // NEVER true in production or with real data!
```

---

## Step 7: Test the Migration

### Update Backend to Use New Database

First, update your backend `.env` to point to the new database. The database is accessible from your backend container via the Docker network.

```env
# In backend/.env
# Update to use new database name
DATABASE_URL="postgresql://postgres:TwAgpaWoiXJvub1@103.250.133.25:5432/postgres_dev_new"

# Or if backend is in same Docker network as postgres16:
# DATABASE_URL="postgresql://postgres:TwAgpaWoiXJvub1@postgres16:5432/postgres_dev_new"

NODE_ENV=development
```

### Start Backend and Test

```bash
# If running locally
cd backend
npm install
npm run dev

# If backend is in Docker container
docker restart dajubhai-backend-dev
docker logs -f dajubhai-backend-dev
```

### Test Checklist

1. **Backend starts without errors**
   - Check console for database connection success
   - No "column does not exist" errors

2. **API endpoints work**
   ```bash
   # Test products endpoint
   curl http://localhost:5000/api/products
   
   # Test categories endpoint
   curl http://localhost:5000/api/category
   
   # Test vendors endpoint
   curl http://localhost:5000/api/vendor
   ```

3. **Data integrity checks**
   - Login with existing user account
   - View existing products
   - Check existing orders
   - Verify vendor dashboards
   - Test cart and wishlist

4. **New features work**
   - Add miniDescription to a product
   - Create homepage sections with category selection
   - Test new notification system

---

## Step 8: Data Validation Queries

Run these queries to ensure no data was lost:

```bash
# Connect to new database in container
docker exec -it postgres16 psql -U postgres -d postgres_dev_new
```

```sql

-- Compare counts with Step 2 output
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM "user"
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM "order"
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_item
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendor
UNION ALL
SELECT 'categories', COUNT(*) FROM category
UNION ALL
SELECT 'subcategories', COUNT(*) FROM subcategory
UNION ALL
SELECT 'brands', COUNT(*) FROM brand
UNION ALL
SELECT 'reviews', COUNT(*) FROM review
UNION ALL
SELECT 'carts', COUNT(*) FROM cart
UNION ALL
SELECT 'cart_items', COUNT(*) FROM cart_item
UNION ALL
SELECT 'wishlists', COUNT(*) FROM wishlist
UNION ALL
SELECT 'wishlist_items', COUNT(*) FROM wishlist_item
UNION ALL
SELECT 'addresses', COUNT(*) FROM address
UNION ALL
SELECT 'banners', COUNT(*) FROM banner
UNION ALL
SELECT 'deals', COUNT(*) FROM deals
UNION ALL
SELECT 'promos', COUNT(*) FROM promo
UNION ALL
SELECT 'districts', COUNT(*) FROM district;

-- Check for orphaned records (should return 0)
SELECT COUNT(*) as orphaned_products 
FROM products p 
WHERE NOT EXISTS (SELECT 1 FROM vendor v WHERE v.id = p."vendorId");

SELECT COUNT(*) as orphaned_order_items 
FROM order_item oi 
WHERE NOT EXISTS (SELECT 1 FROM "order" o WHERE o.id = oi."orderId");

-- Check data quality
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
    COUNT(CASE WHEN "isVerified" = true THEN 1 END) as verified_users
FROM "user";

SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN price > 0 THEN 1 END) as products_with_price,
    COUNT(CASE WHEN stock >= 0 THEN 1 END) as products_with_stock,
    AVG(price) as avg_price
FROM products;
```

**All counts should match your Step 2 output!**

---

## Step 9: Switch to Production (When Ready)

After thorough testing (at least 1-2 weeks):

### Option A: Rename Databases (Safest)

```bash
# Connect to PostgreSQL container
docker exec -it postgres16 psql -U postgres
```

```sql
-- Terminate connections to old database
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'old_database_name' AND pid <> pg_backend_pid();

-- Rename old database (as backup)
ALTER DATABASE old_database_name RENAME TO old_database_name_backup;

-- Rename new database to production name
ALTER DATABASE postgres_dev_new RENAME TO postgres_dev;

-- Verify
\l

-- Exit
\q
```

```bash
# Update backend .env
# DATABASE_URL="postgresql://postgres:TwAgpaWoiXJvub1@103.250.133.25:5432/postgres_dev"

# Restart backend container
docker restart dajubhai-backend-dev
docker restart dajubhai-backend-prod  # if you have production container
```

### Option B: Update Connection String

Simply update your production backend `.env`:
```env
DATABASE_URL="postgresql://postgres:TwAgpaWoiXJvub1@103.250.133.25:5432/postgres_dev_new"
NODE_ENV=production
```

---

## Rollback Plan (If Something Goes Wrong)

If you encounter issues after migration:

```bash
# Immediately switch back to old database
# Update backend .env:
# DATABASE_URL="postgresql://postgres:TwAgpaWoiXJvub1@103.250.133.25:5432/old_database_name"

# Restart backend
docker restart dajubhai-backend-dev

# Or if running locally
cd backend
npm run dev
```

Your old database is untouched and can be used immediately!

---

## Post-Migration Cleanup (After 30 Days)

Once you're confident the migration is successful:

```bash
# Connect to PostgreSQL container
docker exec -it postgres16 psql -U postgres
```

```sql
-- Optional: Drop old database backup
-- ONLY after 30+ days of successful operation
DROP DATABASE old_database_name_backup;

-- Exit
\q
```

```bash
# Delete backup files from host
cd ~/database_backups
rm dajuvai_*_backup_*.backup
rm dajuvai_*_backup_*.sql

# Clean up backup file from container
docker exec postgres16 rm /tmp/dajuvai_prod_backup.sql
docker exec postgres16 rm /tmp/dajuvai_prod_backup.backup
docker exec postgres16 rm /tmp/dajuvai_dev_backup.sql
```

---

## Common Issues and Solutions

### Issue: "relation does not exist"
**Solution**: Table name might be different. Check with `docker exec -it postgres16 psql -U postgres -d postgres_dev_new` then `\dt`

### Issue: "column does not exist"
**Solution**: Run the ALTER TABLE commands from Step 5 again inside the container.

### Issue: Row counts don't match
**Solution**: Check pg_restore output for errors. Re-restore from backup.

### Issue: Foreign key constraint violations
**Solution**: Some referenced records might be missing. Check orphaned records query.

### Issue: Backend won't start
**Solution**: Check TypeORM synchronize is set to `false`. Check database connection string.

### Issue: Can't connect to database from backend
**Solution**: 
- If backend is in Docker: Use container name `postgres16` instead of IP
- If backend is local: Use IP `103.250.133.25`
- Check Docker network: `docker network inspect bridge`
- Verify port mapping: `docker port postgres16`

---

## Summary

✅ **Zero Data Loss**: Old database remains untouched as backup
✅ **Zero Downtime**: Test new database before switching
✅ **Reversible**: Can rollback to old database anytime
✅ **Verified**: Multiple validation steps ensure data integrity
✅ **Safe**: All changes applied to copy, not original

## Key Points

1. **ALWAYS backup first** - This is your safety net
2. **Test thoroughly** - Don't rush to production
3. **Verify data counts** - Ensure nothing was lost
4. **Keep old database** - Don't delete until confident
5. **Document everything** - Save all query outputs

---

## Need Help?

If you encounter any issues:
1. **STOP immediately**
2. **Don't delete anything**
3. **Share the error message**
4. **Provide the step you were on**
5. **Show verification query results**

Your old database is safe and can always be restored!
