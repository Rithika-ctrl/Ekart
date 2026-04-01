-- ══════════════════════════════════════════════════════════════════════════════
-- FIX: Add DEFAULT value to replacement_requested column in shopping_order table
-- ══════════════════════════════════════════════════════════════════════════════
-- Issue: When placing an order, if replacement_requested field is NULL and the 
-- column doesn't have a DEFAULT value, MySQL throws an error.
-- 
-- Solution: Alter the column to have a DEFAULT value of 0 (false)
-- ══════════════════════════════════════════════════════════════════════════════

-- Modify the column to support NULL with DEFAULT 0
ALTER TABLE shopping_order 
MODIFY COLUMN replacement_requested BIT NOT NULL DEFAULT 0;

-- If the column already exists and has NULL values, set them to 0
UPDATE shopping_order 
SET replacement_requested = 0 
WHERE replacement_requested IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- After running this script, the issue should be resolved
-- ══════════════════════════════════════════════════════════════════════════════
