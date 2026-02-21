-- Add bankCode column to vendor table if it doesn't exist
ALTER TABLE vendor ADD COLUMN IF NOT EXISTS "bankCode" VARCHAR NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'vendor' AND column_name = 'bankCode';
