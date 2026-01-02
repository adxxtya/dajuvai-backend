-- Add missing foreign key columns to banners table
-- Run this on your production database

-- Add columns
ALTER TABLE banners ADD COLUMN IF NOT EXISTS "selectedCategoryId" INTEGER;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS "selectedSubcategoryId" INTEGER;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS "selectedDealId" INTEGER;

-- Add foreign key constraints
ALTER TABLE banners 
    ADD CONSTRAINT "FK_banners_selectedCategoryId" 
    FOREIGN KEY ("selectedCategoryId") 
    REFERENCES category(id) 
    ON DELETE SET NULL;

ALTER TABLE banners 
    ADD CONSTRAINT "FK_banners_selectedSubcategoryId" 
    FOREIGN KEY ("selectedSubcategoryId") 
    REFERENCES subcategory(id) 
    ON DELETE SET NULL;

ALTER TABLE banners 
    ADD CONSTRAINT "FK_banners_selectedDealId" 
    FOREIGN KEY ("selectedDealId") 
    REFERENCES deals(id) 
    ON DELETE SET NULL;
