-- =====================================================
-- TEST DATA FOR EKART - SALES REPORT DEMO
-- =====================================================
-- Run this SQL in H2 Console to populate test data

-- 1. INSERT VENDOR (Sanjay E)
INSERT INTO VENDOR (id, email, mobile, name, password, verified, vendor_code, role, provider, provider_id, otp) 
VALUES (1, 'sanjaye@gmail.com', '9876543210', 'Sanjay E', 'password123', true, 'VND-00001', 'VENDOR', NULL, NULL, NULL);

-- 2. INSERT PRODUCTS FOR VENDOR
INSERT INTO PRODUCT (id, name, description, price, category, image_link, rating, vendor_id) 
VALUES 
  (1, 'Wireless Headphones', 'Noise cancelling headphones', 5000, 'Electronics', 'https://via.placeholder.com/300', 4.5, 1),
  (2, 'USB-C Cable', 'High quality USB-C charging cable', 500, 'Accessories', 'https://via.placeholder.com/300', 4.0, 1),
  (3, 'Phone Stand', 'Adjustable phone stand', 800, 'Accessories', 'https://via.placeholder.com/300', 4.2, 1);

-- 3. INSERT CUSTOMERS
INSERT INTO CUSTOMER (id, email, mobile, name, password, verified, role, provider, provider_id, otp, cart_id) 
VALUES 
  (1, 'customer1@gmail.com', '9876543211', 'Raj Kumar', 'pass123', true, 'CUSTOMER', NULL, NULL, NULL, NULL),
  (2, 'customer2@gmail.com', '9876543212', 'Priya Singh', 'pass123', true, 'CUSTOMER', NULL, NULL, NULL, NULL),
  (3, 'customer3@gmail.com', '9876543213', 'Amit Patel', 'pass123', true, 'CUSTOMER', NULL, NULL, NULL, NULL),
  (4, 'customer4@gmail.com', '9876543214', 'Sophia Chen', 'pass123', true, 'CUSTOMER', NULL, NULL, NULL, NULL);

-- 4. INSERT ITEMS FOR ORDERS
INSERT INTO ITEM (id, product_id, name, category, description, price, quantity, image_link, cart_id) 
VALUES 
  (1, 1, 'Wireless Headphones', 'Electronics', 'Noise cancelling headphones', 5000, 2, 'https://via.placeholder.com/300', NULL),
  (2, 2, 'USB-C Cable', 'Accessories', 'High quality USB-C charging cable', 500, 3, 'https://via.placeholder.com/300', NULL),
  (3, 3, 'Phone Stand', 'Accessories', 'Adjustable phone stand', 800, 1, 'https://via.placeholder.com/300', NULL),
  (4, 1, 'Wireless Headphones', 'Electronics', 'Noise cancelling headphones', 5000, 1, 'https://via.placeholder.com/300', NULL);

-- 5. INSERT ORDERS (TODAY)
INSERT INTO SHOPPING_ORDER (id, customer_id, total_price, amount, order_date, date_time, delivery_charge, tracking_status, razorpay_order_id, razorpay_payment_id, replacement_requested, delivery_time, current_city) 
VALUES 
  (1, 1, 10500, 10500, CURRENT_DATE, CURRENT_TIMESTAMP, 100, 'DELIVERED', 'order_001', 'pay_001', false, '2026-03-05', 'Bangalore'),
  (2, 2, 2400, 2400, CURRENT_DATE, CURRENT_TIMESTAMP, 100, 'DELIVERED', 'order_002', 'pay_002', false, '2026-03-05', 'Mumbai'),
  (3, 3, 5800, 5800, CURRENT_DATE, CURRENT_TIMESTAMP, 100, 'IN_TRANSIT', 'order_003', 'pay_003', false, '2026-03-06', 'Delhi');

-- 6. LINK ITEMS TO ORDERS
INSERT INTO SHOPPING_ORDER_ITEMS (shopping_order_id, items_id) 
VALUES 
  (1, 1),
  (1, 2),
  (2, 2),
  (2, 3),
  (3, 4);

-- =====================================================
-- VERIFICATION QUERIES (to check if data was inserted)
-- =====================================================
-- SELECT * FROM VENDOR;
-- SELECT * FROM PRODUCT WHERE vendor_id = 1;
-- SELECT * FROM SHOPPING_ORDER;
-- SELECT COUNT(*) as total_orders FROM SHOPPING_ORDER;
-- SELECT SUM(amount) as total_revenue FROM SHOPPING_ORDER;
