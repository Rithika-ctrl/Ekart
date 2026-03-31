-- ════════════════════════════════════════════════════════════════════════════════════
-- TEST DATA FOR DELIVERY SYSTEM
-- ════════════════════════════════════════════════════════════════════════════════════
-- This script seeds sample data needed to test the delivery features:
-- - Test customers
-- - Test vendors  
-- - Test products
-- - Test orders in PACKED status (ready for delivery assignment)
-- - Test delivery boys (approved, ready to receive orders)
--
-- Run this AFTER the application migrations have created the schema.
-- Usage: mysql -u root -p ekart < test-delivery-data.sql
-- ════════════════════════════════════════════════════════════════════════════════════

SET foreign_key_checks = 0;

-- ────────────────────────────────────────────────────────────────────────────────────
-- 1. WAREHOUSE DATA (Delivery boys need warehouses)
-- ────────────────────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO warehouse (id, name, city, state, warehouse_code, served_pin_codes, active, created_at) VALUES
(1, 'Main Warehouse Chennai', 'Chennai', 'Tamil Nadu', 'WH-001', '600001,600002,600003,600004,600005', 1, NOW()),
(2, 'North Warehouse Mumbai', 'Mumbai', 'Maharashtra', 'WH-002', '400001,400002,400003', 1, NOW()),
(3, 'Bangalore Hub', 'Bangalore', 'Karnataka', 'WH-003', '560001,560002,560034', 1, NOW());

-- ────────────────────────────────────────────────────────────────────────────────────
-- 2. TEST DELIVERY BOYS (approved, verified, active)
-- ────────────────────────────────────────────────────────────────────────────────────

-- Delivery Boy 1: Raj Kumar (approved, Chennai warehouse)
-- Password: test@123 → encrypted
INSERT IGNORE INTO delivery_boy (id, name, email, mobile, password, otp, verified, admin_approved, active, warehouse_id, assigned_pin_codes, delivery_boy_code, available, created_at, updated_at) VALUES
(1, 'Raj Kumar', 'raj.courier@test.com', 9876543210, 'dBOi7h6U+z7lCHKjK1VhKVkKrAkFNI0K8t3sI3E6nts=', 123456, 1, 1, 1, 1, '600001,600002,600003', 'DB-00001', 1, NOW(), NOW());

-- Delivery Boy 2: Priya Singh (approved, Mumbai warehouse)
INSERT IGNORE INTO delivery_boy (id, name, email, mobile, password, otp, verified, admin_approved, active, warehouse_id, assigned_pin_codes, delivery_boy_code, available, created_at, updated_at) VALUES
(2, 'Priya Singh', 'priya.deliver@test.com', 9876543211, 'dBOi7h6U+z7lCHKjK1VhKVkKrAkFNI0K8t3sI3E6nts=', 123456, 1, 1, 1, 2, '400001,400002', 'DB-00002', 1, NOW(), NOW());

-- Delivery Boy 3: Vikram Patel (pending approval, Bangalore warehouse)
INSERT IGNORE INTO delivery_boy (id, name, email, mobile, password, otp, verified, admin_approved, active, warehouse_id, assigned_pin_codes, delivery_boy_code, available, created_at, updated_at) VALUES
(3, 'Vikram Patel', 'vikram.delivery@test.com', 9876543212, 'dBOi7h6U+z7lCHKjK1VhKVkKrAkFNI0K8t3sI3E6nts=', 123456, 1, 0, 1, 3, '', 'DB-00003', 1, NOW(), NOW());

-- ────────────────────────────────────────────────────────────────────────────────────
-- 3. TEST CUSTOMERS
-- ────────────────────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO customer (id, name, email, mobile, password, verified, active, role, profile_image, provider, otp, last_login, created_at, updated_at) VALUES
(1, 'Amit Verma', 'amit@test.com', 9111111111, 'dBOi7h6U+z7lCHKjK1VhKVkKrAkFNI0K8t3sI3E6nts=', 1, 1, 'CUSTOMER', NULL, 'local', 0, NOW(), NOW(), NOW()),
(2, 'Anjali Sharma', 'anjali@test.com', 9222222222, 'dBOi7h6U+z7lCHKjK1VhKVkKrAkFNI0K8t3sI3E6nts=', 1, 1, 'CUSTOMER', NULL, 'local', 0, NOW(), NOW(), NOW()),
(3, 'Ravi Kumar', 'ravi@test.com', 9333333333, 'dBOi7h6U+z7lCHKjK1VhKVkKrAkFNI0K8t3sI3E6nts=', 1, 1, 'CUSTOMER', NULL, 'local', 0, NOW(), NOW(), NOW()),
(4, 'Neha Desai', 'neha@test.com', 9444444444, 'dBOi7h6U+z7lCHKjK1VhKVkKrAkFNI0K8t3sI3E6nts=', 1, 1, 'CUSTOMER', NULL, 'local', 0, NOW(), NOW(), NOW());

-- ────────────────────────────────────────────────────────────────────────────────────
-- 4. TEST VENDORS (with approved products)
-- ────────────────────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO vendor (id, name, email, mobile, password, verified, vendor_code, gst, commission_percentage, otp, created_at, updated_at) VALUES
(1, 'Tech Store India', 'techstore@test.com', 9555555555, 'dBOi7h6U+z7lCHKjK1VhKVkKrAkFNI0K8t3sI3E6nts=', 1, 'VND-00001', '18ABCDE1234H0Z5', 10, 0, NOW(), NOW()),
(2, 'Fashion Hub', 'fashion@test.com', 9666666666, 'dBOi7h6U+z7lCHKjK1VhKVkKrAkFNI0K8t3sI3E6nts=', 1, 'VND-00002', '18XYZAB1234H0Z5', 12, 0, NOW(), NOW());

-- ────────────────────────────────────────────────────────────────────────────────────
-- 5. TEST PRODUCTS (approved, in stock)
-- ────────────────────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO product (id, name, description, price, mrp, category, vendor_id, stock, approved, gst_rate, image_link, extra_image_links, allowed_pin_codes, stock_alert_threshold, created_at, updated_at) VALUES
(1, 'Wireless Earbuds Pro', 'High-quality TWS earbuds with noise cancellation', 1299.00, 1999.00, 'Electronics', 1, 50, 1, 18.0, 'https://via.placeholder.com/300x300?text=Earbuds', '', '600001,600002,600003', 10, NOW(), NOW()),
(2, 'USB-C Fast Charger 65W', 'Quick charge adapter for all devices', 799.00, 1299.00, 'Electronics', 1, 75, 1, 18.0, 'https://via.placeholder.com/300x300?text=Charger', '', '600001,600002', 10, NOW(), NOW()),
(3, 'Cotton T-Shirt Pack', 'Premium quality 100% cotton t-shirts (pack of 3)', 599.00, 999.00, 'Fashion', 2, 100, 1, 5.0, 'https://via.placeholder.com/300x300?text=Tshirt', '', '600001,600002,600003', 15, NOW(), NOW()),
(4, 'Running Shoes Speed', 'Professional sports running shoes', 2499.00, 4999.00, 'Fashion', 2, 40, 1, 5.0, 'https://via.placeholder.com/300x300?text=Shoes', '', '600001,600002', 5, NOW(), NOW());

-- ────────────────────────────────────────────────────────────────────────────────────
-- 6. TEST ORDERS IN PACKED STATUS (ready to assign to delivery boys)
-- ────────────────────────────────────────────────────────────────────────────────────

-- Order 1: Amit Verma ordered 2 items, vendor packed it
INSERT IGNORE INTO shopping_order (id, customer_id, vendor_id, vendor_name, amount, delivery_charge, total_price, payment_mode, delivery_time, tracking_status, current_city, order_date, delivery_boy_id, replacement_requested, parent_order_id) VALUES
(1, 1, 1, 'Tech Store India', 2098.00, 0.0, 2098.00, 'COD', 'STANDARD', 'PACKED', 'Chennai', NOW(), NULL, 0, NULL);

-- Order 2: Anjali Sharma ordered fashion items
INSERT IGNORE INTO shopping_order (id, customer_id, vendor_id, vendor_name, amount, delivery_charge, total_price, payment_mode, delivery_time, tracking_status, current_city, order_date, delivery_boy_id, replacement_requested, parent_order_id) VALUES
(2, 2, 2, 'Fashion Hub', 599.00, 40.0, 639.00, 'COD', 'STANDARD', 'PACKED', 'Chennai', NOW(), NULL, 0, NULL);

-- Order 3: Ravi Kumar ordered electronics
INSERT IGNORE INTO shopping_order (id, customer_id, vendor_id, vendor_name, amount, delivery_charge, total_price, payment_mode, delivery_time, tracking_status, current_city, order_date, delivery_boy_id, replacement_requested, parent_order_id) VALUES
(3, 3, 1, 'Tech Store India', 799.00, 40.0, 839.00, 'COD', 'EXPRESS', 'PACKED', 'Chennai', NOW(), NULL, 0, NULL);

-- Order 4: Neha Desai ordered shoes
INSERT IGNORE INTO shopping_order (id, customer_id, vendor_id, vendor_name, amount, delivery_charge, total_price, payment_mode, delivery_time, tracking_status, current_city, order_date, delivery_boy_id, replacement_requested, parent_order_id) VALUES
(4, 4, 2, 'Fashion Hub', 2499.00, 40.0, 2539.00, 'CREDIT_CARD', 'STANDARD', 'PACKED', 'Chennai', NOW(), NULL, 0, NULL);

-- Order 5: Another order for Amit (to show multiple orders for one delivery boy)
INSERT IGNORE INTO shopping_order (id, customer_id, vendor_id, vendor_name, amount, delivery_charge, total_price, payment_mode, delivery_time, tracking_status, current_city, order_date, delivery_boy_id, replacement_requested, parent_order_id) VALUES
(5, 1, 2, 'Fashion Hub', 1198.00, 0.0, 1198.00, 'UPI', 'STANDARD', 'PACKED', 'Chennai', NOW(), NULL, 0, NULL);

-- ────────────────────────────────────────────────────────────────────────────────────
-- 7. ORDER ITEMS (connect orders to products)
-- ────────────────────────────────────────────────────────────────────────────────────

-- Order 1 items
INSERT IGNORE INTO item (id, order_id, cart_id, product_id, name, description, price, category, quantity, image_link) VALUES
(1, 1, NULL, 1, 'Wireless Earbuds Pro', 'High-quality TWS earbuds with noise cancellation', 1299.00, 'Electronics', 1, 'https://via.placeholder.com/300x300?text=Earbuds'),
(2, 1, NULL, 2, 'USB-C Fast Charger 65W', 'Quick charge adapter for all devices', 799.00, 'Electronics', 1, 'https://via.placeholder.com/300x300?text=Charger');

-- Order 2 items
INSERT IGNORE INTO item (id, order_id, cart_id, product_id, name, description, price, category, quantity, image_link) VALUES
(3, 2, NULL, 3, 'Cotton T-Shirt Pack', 'Premium quality 100% cotton t-shirts (pack of 3)', 599.00, 'Fashion', 1, 'https://via.placeholder.com/300x300?text=Tshirt');

-- Order 3 items
INSERT IGNORE INTO item (id, order_id, cart_id, product_id, name, description, price, category, quantity, image_link) VALUES
(4, 3, NULL, 2, 'USB-C Fast Charger 65W', 'Quick charge adapter for all devices', 799.00, 'Electronics', 1, 'https://via.placeholder.com/300x300?text=Charger');

-- Order 4 items
INSERT IGNORE INTO item (id, order_id, cart_id, product_id, name, description, price, category, quantity, image_link) VALUES
(5, 4, NULL, 4, 'Running Shoes Speed', 'Professional sports running shoes', 2499.00, 'Fashion', 1, 'https://via.placeholder.com/300x300?text=Shoes');

-- Order 5 items
INSERT IGNORE INTO item (id, order_id, cart_id, product_id, name, description, price, category, quantity, image_link) VALUES
(6, 5, NULL, 3, 'Cotton T-Shirt Pack', 'Premium quality 100% cotton t-shirts (pack of 3)', 599.00, 'Fashion', 2, 'https://via.placeholder.com/300x300?text=Tshirt');

-- ────────────────────────────────────────────────────────────────────────────────────
-- 8. CUSTOMER ADDRESSES
-- ────────────────────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO address (id, customer_id, formatted_address, recipient_name, house_street, city, state, postal_code, details) VALUES
(1, 1, 'Amit Verma, 123 Tech Street, Chennai, Tamil Nadu 600001', 'Amit Verma', '123 Tech Street', 'Chennai', 'Tamil Nadu', '600001', NULL),
(2, 2, 'Anjali Sharma, 456 Fashion Avenue, Chennai, Tamil Nadu 600002', 'Anjali Sharma', '456 Fashion Avenue', 'Chennai', 'Tamil Nadu', '600002', NULL),
(3, 3, 'Ravi Kumar, 789 Main Road, Chennai, Tamil Nadu 600003', 'Ravi Kumar', '789 Main Road', 'Chennai', 'Tamil Nadu', '600003', NULL),
(4, 4, 'Neha Desai, 321 Shopping Mall, Chennai, Tamil Nadu 600004', 'Neha Desai', '321 Shopping Mall', 'Chennai', 'Tamil Nadu', '600004', NULL);

-- ────────────────────────────────────────────────────────────────────────────────────
-- Now you can:
-- 1. Login as Delivery Boy (email: raj.courier@test.com, password: test@123)
-- 2. See the 3 PACKED orders ready for assignment
-- 3. Admin can assign these orders using: POST /api/flutter/admin/delivery/assign
--    with orderId and deliveryBoyId parameters
-- ────────────────────────────────────────────────────────────────────────────────────

SET foreign_key_checks = 1;
