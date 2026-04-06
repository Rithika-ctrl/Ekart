-- ==================================================================================
-- SQL Script: Delete All Data Except Customer, Vendor, and Product Tables
-- ==================================================================================
-- This script deletes all data from the database while preserving:
--   1. customer
--   2. vendor
--   3. product
--
-- It disables foreign key checks, truncates/deletes data, and re-enables checks.
-- ==================================================================================

EXEC sp_msforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

-- Delete from dependent tables (those with foreign keys)
DELETE FROM auto_assign_log;
DELETE FROM back_in_stock_subscription;
DELETE FROM cart;
DELETE FROM delivery_otp;
DELETE FROM item;
DELETE FROM refund_images;
DELETE FROM refund;
DELETE FROM review_images;
DELETE FROM review;
DELETE FROM sales_record;
DELETE FROM shopping_order;
DELETE FROM tracking_event_log;
DELETE FROM user_activities;
DELETE FROM warehouse_change_request;
DELETE FROM address;
DELETE FROM wishlist;
DELETE FROM coupon;
DELETE FROM banner;
DELETE FROM delivery_boy;
DELETE FROM warehouse;
DELETE FROM policies;
DELETE FROM category;

-- Re-enable foreign key checks
EXEC sp_msforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';

-- Verification: Check remaining data counts
SELECT 'Customer Count' AS table_name, COUNT(*) FROM customer
UNION ALL
SELECT 'Vendor Count', COUNT(*) FROM vendor
UNION ALL
SELECT 'Product Count', COUNT(*) FROM product
UNION ALL
SELECT 'Orders Count', COUNT(*) FROM shopping_order
UNION ALL
SELECT 'Items Count', COUNT(*) FROM item
UNION ALL
SELECT 'Refunds Count', COUNT(*) FROM refund;
