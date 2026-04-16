-- ============================================================================
-- EKART WAREHOUSE SETUP SQL SCRIPT - READY TO USE
-- ============================================================================
-- Database: PostgreSQL (localhost:5432)
-- Target Database: ekart
-- Purpose: Create test warehouse for delivery boy registration testing
-- 
-- CREDENTIALS:
--   Username: postgres
--   Password: postgres
--   Host: localhost
--   Port: 5432
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK EXISTING WAREHOUSES
-- ============================================================================
-- Query to see if any warehouses already exist

SELECT id, name, city, state, warehouse_login_id, served_pin_codes, active 
FROM warehouse 
ORDER BY id;

-- Expected output: Empty result set if no warehouses exist (good for fresh setup)
-- If warehouses exist, you'll see them listed

-- ============================================================================
-- STEP 2: CHECK IF TEST WAREHOUSE ALREADY EXISTS (AVOID DUPLICATES)
-- ============================================================================

SELECT id, name, city, warehouse_login_id 
FROM warehouse 
WHERE warehouse_login_id = '12345678';

-- Expected: Empty result set (warehouse doesn't exist yet)
-- If you see a result, the warehouse already exists - skip the INSERT below

-- ============================================================================
-- STEP 3: INSERT TEST WAREHOUSE
-- ============================================================================
-- ✅ This is ready to use! The password is already encrypted.
-- 
-- Warehouse Details:
--   Login ID: 12345678
--   Plain Password: Test@123 (encrypted below)
--   Warehouse Code: WH-BNG-123
--   Served PIN Codes: 560001, 560002, 560003 (Bangalore area)
--   Contact: admin@ekart.com / 9876543210

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
    'NMvazLlD7w+80gy+w+xExw==',
    true,
    '123 Test Street',
    'admin@ekart.com',
    '9876543210',
    'WH-BNG-123'
)
RETURNING id, name, warehouse_login_id;

-- ============================================================================
-- STEP 4: VERIFY INSERTION AND GET WAREHOUSE ID
-- ============================================================================
-- Run this after INSERT to confirm success and retrieve the warehouse ID

SELECT id, name, city, warehouse_login_id, served_pin_codes, active, address, contact_email, contact_phone
FROM warehouse 
WHERE warehouse_login_id = '12345678';

-- Expected output: Shows the newly created warehouse with its ID (e.g., id=1 or higher)
-- SAVE THIS ID - you'll need it for delivery boy registration

-- ============================================================================
-- STEP 5: INSERT TEST DELIVERY BOYS (OPTIONAL)
-- ============================================================================
-- Use the warehouse ID from STEP 4 (let's assume it's ID=1)
-- This creates test delivery boys that can register with the warehouse
--
-- Password used: "password123" (encrypted with same AES keys)
-- Encrypted value: 2JdWHaVKuZdpBLFpXGJuEw==

-- Uncomment and run after you get the warehouse ID from STEP 4:

-- INSERT INTO delivery_boy (name, email, mobile, password, verified, admin_approved, active, warehouse_id)
-- VALUES 
--   ('Suresh Kumar', 'suresh@ekart.com', '9876543210', '2JdWHaVKuZdpBLFpXGJuEw==', true, true, true, 1),
--   ('Ravi Sharma', 'ravi@ekart.com', '9988776655', '2JdWHaVKuZdpBLFpXGJuEw==', true, true, true, 1);

-- ============================================================================
-- HELPFUL REFERENCE QUERIES
-- ============================================================================

-- View all warehouses
-- SELECT id, name, city, state, warehouse_login_id, served_pin_codes, active FROM warehouse ORDER BY id;

-- Count total warehouses
-- SELECT COUNT(*) as total_warehouses FROM warehouse;

-- Check delivery boys for a warehouse
-- SELECT id, name, email, mobile, verified, admin_approved, active, warehouse_id FROM delivery_boy WHERE warehouse_id = 1;

-- ============================================================================
-- CLEANUP (IF NEEDED)
-- ============================================================================
-- To delete the test warehouse (and all its delivery boys due to CASCADE):
-- DELETE FROM warehouse WHERE warehouse_login_id = '12345678';

-- To reset the warehouse table completely:
-- TRUNCATE TABLE warehouse CASCADE;
-- ALTER SEQUENCE warehouse_id_seq RESTART WITH 1;

-- ============================================================================
-- TESTING LOGIN CREDENTIALS
-- ============================================================================
-- After warehouse is created, warehouse staff can log in with:
--   Login ID: 12345678
--   Password: Test@123
-- ============================================================================
