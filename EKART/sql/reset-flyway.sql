-- Flyway Recovery Script
-- This script resets Flyway migration history to allow clean re-execution

-- Step 1: Drop and recreate the Flyway schema history table
DROP TABLE IF EXISTS flyway_schema_history;

-- When Flyway runs next, it will create a fresh history and re-apply all migrations
-- The V003 migration will now succeed because we've added the column check
