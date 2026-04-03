-- ========================================================================
-- EKART DATABASE - DROP ALL TABLES
-- Safe removal of all tables with foreign key constraints handled
-- ========================================================================

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all tables in safe order
DROP TABLE IF EXISTS review_images;
DROP TABLE IF EXISTS refund_images;
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS back_in_stock_subscription;
DROP TABLE IF EXISTS stock_alert;
DROP TABLE IF EXISTS sales_report;
DROP TABLE IF EXISTS sales_record;
DROP TABLE IF EXISTS tracking_event_log;
DROP TABLE IF EXISTS delivery_otp;
DROP TABLE IF EXISTS auto_assign_log;
DROP TABLE IF EXISTS warehouse_change_request;
DROP TABLE IF EXISTS refund;
DROP TABLE IF EXISTS item;
DROP TABLE IF EXISTS shopping_order;
DROP TABLE IF EXISTS address;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS customer;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS vendor;
DROP TABLE IF EXISTS coupon;
DROP TABLE IF EXISTS policies;
DROP TABLE IF EXISTS banner;
DROP TABLE IF EXISTS delivery_boy;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS warehouse;
DROP TABLE IF EXISTS user_activities;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================================
-- All 27 tables have been dropped
-- Database is now clean - ready to create new structure
-- ========================================================================
