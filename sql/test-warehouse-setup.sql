-- ============================================================================
-- EKART WAREHOUSE SETUP SQL SCRIPT
-- ============================================================================
-- Database: PostgreSQL
-- Target: EKART application database (localhost:5432)
-- Purpose: Check existing warehouses and insert test warehouse for delivery boys
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK EXISTING WAREHOUSES
-- ============================================================================
-- Run this query first to see if warehouses already exist
-- If results are empty, proceed with INSERT

SELECT id, name, city, state, warehouse_login_id, served_pin_codes, active 
FROM warehouse 
ORDER BY id;

-- ============================================================================
-- STEP 2: CHECK IF TEST WAREHOUSE ALREADY EXISTS
-- ============================================================================
-- Prevent duplicate inserts - check by warehouse_login_id

SELECT id, name, city, warehouse_login_id 
FROM warehouse 
WHERE warehouse_login_id = '12345678';

-- ============================================================================
-- STEP 3: INSERT TEST WAREHOUSE
-- ============================================================================
-- ⚠️  IMPORTANT:
--   1. Replace 'YOUR_ENCRYPTED_PASSWORD_HERE' with the actual AES-encrypted password
--   2. Use the encrypt-warehouse-password.java utility to generate the encrypted value:
--      - Compile: javac encrypt-warehouse-password.java
--      - Run: java encrypt_warehouse_password "YourPlainPassword"
--      - Copy the encrypted value and replace in the INSERT statement below
--
--   3. For testing purposes, if you don't want to encrypt, you can temporarily 
--      set a simple password and encrypt it using the utility
--
-- EXAMPLE ENCRYPTED VALUES (for reference, using default AES keys):
--   Password "test@123" → 'F1xL2pK3mN4qR5sT6u7vW8x9y0z='  (example, recalculate!)
--   Password "password123" → similar encrypted format
--
-- To generate your own encrypted password:
--   1. Go to sql/ folder
--   2. Run: java encrypt_warehouse_password "Test@123"
--   3. Copy the encrypted output
--   4. Paste it below replacing 'YOUR_ENCRYPTED_PASSWORD_HERE'

INSERT INTO warehouse (
    name, 
    city, 
    state, 
    served_pin_codes, 
    warehouse_login_id, 
    warehouse_login_password, 
    active, 
    address, 
    contact_email, 
    contact_phone, 
    warehouse_code
) VALUES (
    'Test Warehouse',
    'Bangalore',
    'Karnataka',
    '560001,560002,560003',
    '12345678',
    'YOUR_ENCRYPTED_PASSWORD_HERE',  -- Replace with encrypted password
    true,
    '123 Test Street',
    'admin@ekart.com',
    '9876543210',
    'WH-BNG-123'
);

-- ============================================================================
-- STEP 4: VERIFY INSERTION
-- ============================================================================
-- Run this after the INSERT to confirm warehouse was created and get its ID

SELECT id, name, city, warehouse_login_id, active 
FROM warehouse 
WHERE warehouse_login_id = '12345678';

-- ============================================================================
-- STEP 5: (OPTIONAL) INSERT DELIVERY BOYS FOR THIS WAREHOUSE
-- ============================================================================
-- After you get the warehouse ID from STEP 4, you can add test delivery boys
-- Replace <warehouse_id> with the actual ID returned from STEP 4

-- Example: If warehouse ID is 5
--INSERT INTO delivery_boy (name, email, mobile, password, verified, admin_approved, active, warehouse_id)
--VALUES 
--  ('Test Delivery Boy 1', 'dboy1@ekart.com', '9876543210', 'ENCRYPTED_PASSWORD_HERE', true, true, true, 5),
--  ('Test Delivery Boy 2', 'dboy2@ekart.com', '9876543211', 'ENCRYPTED_PASSWORD_HERE', true, true, true, 5);

-- ============================================================================
-- STEP 6: (OPTIONAL) CLEANUP - DELETE TEST WAREHOUSE
-- ============================================================================
-- If you need to delete the test warehouse later:
-- DELETE FROM warehouse WHERE warehouse_login_id = '12345678';

-- ============================================================================
-- HELPFUL QUERIES
-- ============================================================================

-- Count total warehouses
-- SELECT COUNT(*) as total_warehouses FROM warehouse;

-- View all warehouses with key details
-- SELECT id, name, city, state, warehouse_login_id, served_pin_codes, active FROM warehouse;

-- Find warehouse by login ID
-- SELECT * FROM warehouse WHERE warehouse_login_id = '12345678';

-- Delete and reset warehouse sequence (if needed for fresh start)
-- TRUNCATE TABLE warehouse CASCADE;
-- ALTER SEQUENCE warehouse_id_seq RESTART WITH 1;
