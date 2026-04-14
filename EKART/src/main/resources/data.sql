-- ========================================================================
-- FILE: data.sql
-- EKART Database - Complete Schema with Sample/Seed Data
-- ========================================================================
-- This file creates all database tables and populates them with sample data
-- for development and testing purposes.
--
-- Database: PostgreSQL
-- Last Updated: April 14, 2026
-- ========================================================================


-- ========================================================================
-- 1. CATEGORY TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10),
    display_order INT DEFAULT 0,
    parent BOOLEAN DEFAULT FALSE,
    parent_id INT REFERENCES category(id) ON DELETE SET NULL
);

INSERT INTO category (name, emoji, display_order, parent) VALUES 
('Food & Beverages', '🍔', 1, TRUE),
('Electronics', '📱', 2, TRUE),
('Fashion', '👕', 3, TRUE),
('Home & Kitchen', '🏠', 4, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO category (name, emoji, display_order, parent, parent_id) VALUES 
('Chips', '🥔', 1, FALSE, 1),
('Chocolates', '🍫', 2, FALSE, 1),
('Phones', '📞', 1, FALSE, 2),
('Laptop', '💻', 2, FALSE, 2),
('Men Clothing', '👔', 1, FALSE, 3),
('Women Clothing', '👗', 2, FALSE, 3),
('Cookware', '🍳', 1, FALSE, 4),
('Bedding', '🛏️', 2, FALSE, 4)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 2. ADMIN_CREDENTIAL TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS admin_credential (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    hashed_password VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    totp_secret VARCHAR(255),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    last_failed_attempt TIMESTAMP,
    last_successful_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Note: Password hashes should be generated via BCrypt in production
-- Sample hash for password "Admin@123": $2a$10$...
INSERT INTO admin_credential (email, hashed_password, name, created_at, updated_at) VALUES 
('admin@ekart.com', '$2a$10$AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz', 'Admin User', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 3. AUTHENTICATION_OTP TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS authentication_otp (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    hashed_otp VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiry_minutes INT NOT NULL DEFAULT 5,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP,
    attempt_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON authentication_otp(email);
CREATE INDEX IF NOT EXISTS idx_otp_purpose ON authentication_otp(purpose);
CREATE INDEX IF NOT EXISTS idx_otp_created_at ON authentication_otp(created_at);

-- ========================================================================
-- 4. WAREHOUSE TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS warehouse (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    warehouse_code VARCHAR(20) UNIQUE,
    served_pin_codes VARCHAR(5000) NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO warehouse (name, city, state, warehouse_code, served_pin_codes) VALUES 
('Chennai Central Warehouse', 'Chennai', 'Tamil Nadu', 'WH-001', '600001,600002,600003,600004,600005,600006,600011,600012'),
('Bangalore North Warehouse', 'Bangalore', 'Karnataka', 'WH-002', '560001,560002,560003,560011,560034'),
('Mumbai East Warehouse', 'Mumbai', 'Maharashtra', 'WH-003', '400001,400002,400011,400012,400014'),
('Delhi Central Warehouse', 'Delhi', 'Delhi', 'WH-004', '110001,110002,110003,110012,110019')
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 5. VENDOR TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS vendor (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    mobile BIGINT NOT NULL,
    password VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(100),
    otp_expiry TIMESTAMP,
    otp INT,
    verified BOOLEAN DEFAULT FALSE,
    provider VARCHAR(50),
    provider_id VARCHAR(255),
    vendor_code VARCHAR(20) UNIQUE,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendor_email ON vendor(email);

INSERT INTO vendor (name, email, mobile, password, verified, vendor_code) VALUES 
('Fresh Foods Co.', 'vendor1@example.com', 9876543210, 'hashed_pwd_1', TRUE, 'VND-0001'),
('Tech Supplies Ltd.', 'vendor2@example.com', 9876543211, 'hashed_pwd_2', TRUE, 'VND-0002'),
('Fashion Hub', 'vendor3@example.com', 9876543212, 'hashed_pwd_3', TRUE, 'VND-0003'),
('Home Essentials', 'vendor4@example.com', 9876543213, 'hashed_pwd_4', TRUE, 'VND-0004')
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 6. PRODUCT TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DOUBLE PRECISION NOT NULL,
    mrp DOUBLE PRECISION,
    gst_rate DOUBLE PRECISION,
    category VARCHAR(100) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    stock_alert_threshold INT DEFAULT 10,
    image_link VARCHAR(1000),
    extra_image_links VARCHAR(2000),
    video_link VARCHAR(500),
    approved BOOLEAN DEFAULT FALSE,
    allowed_pin_codes VARCHAR(1000),
    vendor_id INT REFERENCES vendor(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_approved ON product(approved);
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category);

INSERT INTO product (name, description, price, mrp, gst_rate, category, stock, image_link, approved, vendor_id) VALUES 
('Lay''s Potato Chips 100g', 'Crispy and delicious potato chips', 20.00, 25.00, 5.0, 'Chips', 150, 'https://example.com/lays.jpg', TRUE, 1),
('Dairy Milk Chocolate 40g', 'Smooth and creamy chocolate', 30.00, 40.00, 5.0, 'Chocolates', 200, 'https://example.com/dairy-milk.jpg', TRUE, 1),
('iPhone 15 Pro', 'Latest Apple smartphone', 99999.00, 129999.00, 12.0, 'Phones', 10, 'https://example.com/iphone15.jpg', TRUE, 2),
('Dell Laptop XPS 13', 'Powerful ultrabook for professionals', 89999.00, 99999.00, 12.0, 'Laptop', 5, 'https://example.com/dell-xps.jpg', TRUE, 2),
('Men''s Cotton T-Shirt', 'Comfortable everyday wear', 299.00, 499.00, 5.0, 'Men Clothing', 100, 'https://example.com/tshirt.jpg', TRUE, 3),
('Women''s Summer Dress', 'Stylish and breathable', 599.00, 999.00, 5.0, 'Women Clothing', 75, 'https://example.com/dress.jpg', TRUE, 3),
('Non-Stick Frying Pan', 'Perfect for everyday cooking', 799.00, 1299.00, 5.0, 'Cookware', 50, 'https://example.com/pan.jpg', TRUE, 4),
('Cotton Bed Sheet Set', 'Soft and comfortable bedding', 999.00, 1599.00, 5.0, 'Bedding', 80, 'https://example.com/bedsheet.jpg', TRUE, 4)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 7. CUSTOMER TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS customer (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    mobile BIGINT NOT NULL,
    password VARCHAR(255) NOT NULL,
    confirm_password VARCHAR(255),
    otp_hash VARCHAR(100),
    otp_expiry TIMESTAMP,
    otp INT,
    verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) DEFAULT 'CUSTOMER',
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    provider VARCHAR(50),
    provider_id VARCHAR(255),
    recently_viewed_products VARCHAR(500),
    profile_image VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_email ON customer(email);

INSERT INTO customer (name, email, mobile, password, verified, role, active) VALUES 
('John Doe', 'john@example.com', 9123456789, 'hashed_pwd_john', TRUE, 'CUSTOMER', TRUE),
('Jane Smith', 'jane@example.com', 9123456790, 'hashed_pwd_jane', TRUE, 'CUSTOMER', TRUE),
('Raj Kumar', 'raj@example.com', 9123456791, 'hashed_pwd_raj', TRUE, 'CUSTOMER', TRUE),
('Priya Sharma', 'priya@example.com', 9123456792, 'hashed_pwd_priya', TRUE, 'CUSTOMER', TRUE)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 8. CART TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE REFERENCES customer(id) ON DELETE CASCADE
);

INSERT INTO cart (customer_id) VALUES (1), (2), (3), (4)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 9. ADDRESS TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS address (
    id SERIAL PRIMARY KEY,
    details VARCHAR(1000),
    recipient_name VARCHAR(100),
    house_street VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    customer_id INT NOT NULL REFERENCES customer(id) ON DELETE CASCADE
);

INSERT INTO address (recipient_name, house_street, city, state, postal_code, customer_id) VALUES 
('John Doe', '123 Main Street', 'Chennai', 'Tamil Nadu', '600001', 1),
('Jane Smith', '456 Park Avenue', 'Bangalore', 'Karnataka', '560002', 2),
('Raj Kumar', '789 MG Road', 'Mumbai', 'Maharashtra', '400001', 3),
('Priya Sharma', '321 Ring Road', 'Delhi', 'Delhi', '110001', 4)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 10. ITEM TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS item (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DOUBLE PRECISION NOT NULL,
    unit_price DOUBLE PRECISION NOT NULL,
    category VARCHAR(100),
    quantity INT NOT NULL,
    image_link VARCHAR(500),
    product_id INT,
    cart_id INT REFERENCES cart(id) ON DELETE CASCADE
);

INSERT INTO item (name, description, price, unit_price, category, quantity, product_id, cart_id) VALUES 
('Lay''s Potato Chips 100g', 'Crispy chips', 40.00, 20.00, 'Chips', 2, 1, 1),
('Dairy Milk Chocolate 40g', 'Creamy chocolate', 30.00, 30.00, 'Chocolates', 1, 2, 2)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 11. SHOPPING_ORDER TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS shopping_order (
    id SERIAL PRIMARY KEY,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    amount DOUBLE PRECISION DEFAULT 0,
    date_time TIMESTAMP,
    delivery_charge DOUBLE PRECISION DEFAULT 0,
    total_price DOUBLE PRECISION DEFAULT 0,
    gst_amount DOUBLE PRECISION DEFAULT 0,
    payment_mode VARCHAR(50),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_time VARCHAR(300),
    replacement_requested BOOLEAN DEFAULT FALSE,
    tracking_status VARCHAR(50) DEFAULT 'PROCESSING',
    current_city VARCHAR(100),
    return_eligible BOOLEAN DEFAULT FALSE,
    delivery_pin_code VARCHAR(10),
    delivery_address VARCHAR(500),
    parent_order_id INT,
    warehouse_id INT REFERENCES warehouse(id) ON DELETE SET NULL,
    delivery_boy_id INT,
    customer_id INT REFERENCES customer(id) ON DELETE CASCADE,
    vendor_id INT REFERENCES vendor(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_date ON shopping_order(order_date);
CREATE INDEX IF NOT EXISTS idx_order_customer ON shopping_order(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_parent ON shopping_order(parent_order_id);

INSERT INTO shopping_order (customer_id, vendor_id, warehouse_id, amount, total_price, delivery_charge, gst_amount, payment_mode, tracking_status, delivery_pin_code, delivery_address) VALUES 
(1, 1, 1, 450.00, 450.00, 30.00, 22.50, 'ONLINE', 'PROCESSING', '600001', 'John Doe | 123 Main Street, Chennai, Tamil Nadu - 600001'),
(2, 2, 2, 99999.00, 99999.00, 100.00, 11999.88, 'ONLINE', 'SHIPPED', '560002', 'Jane Smith | 456 Park Avenue, Bangalore, Karnataka - 560002'),
(3, 3, 3, 299.00, 299.00, 50.00, 14.95, 'COD', 'PROCESSING', '400001', 'Raj Kumar | 789 MG Road, Mumbai, Maharashtra - 400001')
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 12. REVIEW TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS review (
    id SERIAL PRIMARY KEY,
    rating INT NOT NULL,
    comment VARCHAR(1000),
    customer_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_id INT REFERENCES customer(id) ON DELETE CASCADE,
    product_id INT REFERENCES product(id) ON DELETE CASCADE,
    CONSTRAINT uk_review_customer_product UNIQUE(customer_id, product_id)
);

INSERT INTO review (rating, comment, customer_id, product_id, created_at) VALUES 
(5, 'Excellent product! Highly recommended.', 1, 1, CURRENT_TIMESTAMP),
(4, 'Good quality, delivered on time.', 2, 2, CURRENT_TIMESTAMP),
(5, 'Best purchase ever!', 3, 3, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 13. REVIEW_IMAGES TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS review_images (
    id SERIAL PRIMARY KEY,
    image_url VARCHAR(1000) NOT NULL,
    review_id INT NOT NULL REFERENCES review(id) ON DELETE CASCADE
);

INSERT INTO review_images (image_url, review_id) VALUES 
('https://cdn.example.com/review1_1.jpg', 1),
('https://cdn.example.com/review1_2.jpg', 1)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 14. REFUND TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS refund (
    id SERIAL PRIMARY KEY,
    amount DOUBLE PRECISION NOT NULL,
    reason VARCHAR(500),
    status VARCHAR(50) DEFAULT 'PENDING',
    rejection_reason VARCHAR(500),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by VARCHAR(100),
    order_id INT REFERENCES shopping_order(id) ON DELETE CASCADE,
    customer_id INT REFERENCES customer(id) ON DELETE CASCADE
);

INSERT INTO refund (order_id, customer_id, amount, reason, status) VALUES 
(1, 1, 100.00, 'Product damaged', 'PENDING'),
(2, 2, 5000.00, 'Changed my mind', 'APPROVED')
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 15. REFUND_IMAGES TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS refund_images (
    id SERIAL PRIMARY KEY,
    image_url VARCHAR(1000) NOT NULL,
    refund_id INT NOT NULL REFERENCES refund(id) ON DELETE CASCADE
);

INSERT INTO refund_images (image_url, refund_id) VALUES 
('https://cdn.example.com/refund1_damage.jpg', 1)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 16. COUPON TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS coupon (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(200) NOT NULL,
    type VARCHAR(50) DEFAULT 'PERCENT',
    value DOUBLE PRECISION NOT NULL,
    min_order_amount DOUBLE PRECISION DEFAULT 0,
    max_discount DOUBLE PRECISION DEFAULT 0,
    usage_limit INT DEFAULT 0,
    used_count INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    expiry_date DATE
);

INSERT INTO coupon (code, description, type, value, min_order_amount, max_discount, usage_limit, expiry_date) VALUES 
('WELCOME10', '10% off on first purchase', 'PERCENT', 10, 500.00, 100.00, 100, '2026-12-31'),
('FLAT100', '₹100 off on orders above ₹1000', 'FLAT', 100, 1000.00, 100.00, 50, '2026-12-31'),
('SUMMER20', '20% off on summer collection', 'PERCENT', 20, 1000.00, 500.00, 0, '2026-12-31')
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 17. DELIVERY_BOY TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS delivery_boy (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    mobile BIGINT NOT NULL,
    password VARCHAR(255) NOT NULL,
    confirm_password VARCHAR(255),
    otp INT,
    verified BOOLEAN DEFAULT FALSE,
    admin_approved BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    assigned_pin_codes VARCHAR(1000),
    delivery_boy_code VARCHAR(20) UNIQUE,
    is_available BOOLEAN DEFAULT FALSE,
    warehouse_id INT REFERENCES warehouse(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_db_email ON delivery_boy(email);

INSERT INTO delivery_boy (name, email, mobile, password, verified, admin_approved, active, warehouse_id, delivery_boy_code) VALUES 
('Arjun Singh', 'arjun@delivery.com', 9988776655, 'hashed_pwd_arjun', TRUE, TRUE, TRUE, 1, 'DB-0001'),
('Vikram Patel', 'vikram@delivery.com', 9988776656, 'hashed_pwd_vikram', TRUE, TRUE, TRUE, 2, 'DB-0002'),
('Suresh Kumar', 'suresh@delivery.com', 9988776657, 'hashed_pwd_suresh', TRUE, TRUE, TRUE, 3, 'DB-0003'),
('Manoj Sharma', 'manoj@delivery.com', 9988776658, 'hashed_pwd_manoj', TRUE, TRUE, TRUE, 4, 'DB-0004')
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 18. DELIVERY_OTP TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS delivery_otp (
    id SERIAL PRIMARY KEY,
    otp INT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    order_id INT UNIQUE REFERENCES shopping_order(id) ON DELETE CASCADE
);

-- ========================================================================
-- 19. TRACKING_EVENT_LOG TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS tracking_event_log (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    city VARCHAR(200),
    description VARCHAR(500),
    updated_by VARCHAR(50),
    event_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    order_id INT NOT NULL REFERENCES shopping_order(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tel_order ON tracking_event_log(order_id);

INSERT INTO tracking_event_log (order_id, status, city, description, updated_by, event_time) VALUES 
(1, 'PROCESSING', 'Chennai', 'Order received and processing', 'system', CURRENT_TIMESTAMP),
(2, 'SHIPPED', 'Bangalore', 'Order shipped to warehouse', 'admin', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(3, 'PROCESSING', 'Mumbai', 'Order received and processing', 'system', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 20. WISHLIST TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_id INT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    CONSTRAINT uk_wishlist_customer_product UNIQUE(customer_id, product_id)
);

INSERT INTO wishlist (customer_id, product_id) VALUES 
(1, 3),
(1, 4),
(2, 5),
(3, 6)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 21. STOCK_ALERT TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS stock_alert (
    id SERIAL PRIMARY KEY,
    stock_level INT NOT NULL,
    alert_time TIMESTAMP,
    email_sent BOOLEAN DEFAULT FALSE,
    acknowledged BOOLEAN DEFAULT FALSE,
    message VARCHAR(500),
    product_id INT REFERENCES product(id) ON DELETE CASCADE,
    vendor_id INT REFERENCES vendor(id) ON DELETE CASCADE
);

INSERT INTO stock_alert (product_id, vendor_id, stock_level, message, alert_time) VALUES 
(1, 1, 15, 'Stock below threshold', CURRENT_TIMESTAMP),
(3, 2, 8, 'Low inventory alert', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 22. AUTO_ASSIGN_LOG TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS auto_assign_log (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    pin_code VARCHAR(10),
    assigned_at TIMESTAMP NOT NULL,
    active_orders_at_assignment INT NOT NULL,
    delivery_boy_id INT REFERENCES delivery_boy(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_aal_order ON auto_assign_log(order_id);
CREATE INDEX IF NOT EXISTS idx_aal_db ON auto_assign_log(delivery_boy_id);
CREATE INDEX IF NOT EXISTS idx_aal_assigned ON auto_assign_log(assigned_at);

-- ========================================================================
-- 23. BACK_IN_STOCK_SUBSCRIPTION TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS back_in_stock_subscription (
    id SERIAL PRIMARY KEY,
    subscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notified BOOLEAN NOT NULL DEFAULT FALSE,
    notified_at TIMESTAMP,
    customer_id INT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    CONSTRAINT uk_back_in_stock_customer_product UNIQUE(customer_id, product_id)
);

INSERT INTO back_in_stock_subscription (customer_id, product_id, notified) VALUES 
(1, 2, FALSE),
(2, 5, FALSE)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 24. USER_ACTIVITIES TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    action_type VARCHAR(100),
    metadata TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO user_activities (customer_id, action_type, metadata) VALUES 
(1, 'PRODUCT_VIEW', '{"product_id": 1, "product_name": "Lay''s Chips"}'),
(1, 'PRODUCT_ADD_TO_CART', '{"product_id": 2, "quantity": 1}'),
(2, 'ORDER_PLACED', '{"order_id": 2, "total": 99999.00}'),
(3, 'REVIEW_SUBMITTED', '{"product_id": 3, "rating": 5}')
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 25. SALES_REPORT TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS sales_report (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50),
    report_date DATE,
    total_revenue DOUBLE PRECISION,
    total_orders INT,
    total_items_sold INT,
    avg_order_value DOUBLE PRECISION,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vendor_id INT REFERENCES vendor(id) ON DELETE CASCADE
);

INSERT INTO sales_report (vendor_id, report_type, report_date, total_revenue, total_orders, total_items_sold, avg_order_value) VALUES 
(1, 'DAILY', CURRENT_DATE, 1500.00, 5, 12, 300.00),
(2, 'DAILY', CURRENT_DATE, 299999.00, 2, 3, 149999.50),
(3, 'DAILY', CURRENT_DATE, 500.00, 1, 1, 500.00),
(4, 'DAILY', CURRENT_DATE, 2000.00, 3, 5, 666.67)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 26. POLICIES TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    last_updated TIMESTAMP NOT NULL,
    author_admin_id VARCHAR(100) NOT NULL
);

INSERT INTO policies (title, content, category, slug, last_updated, author_admin_id) VALUES 
('Terms of Service', 'Please read our terms of service carefully before using EKART...', 'legal', 'terms-of-service', CURRENT_TIMESTAMP, 'admin@ekart.com'),
('Privacy Policy', 'Your privacy is important to us. This policy describes how we collect and use your data...', 'legal', 'privacy-policy', CURRENT_TIMESTAMP, 'admin@ekart.com'),
('Return Policy', 'We offer 30-day returns for most products in original condition...', 'policy', 'return-policy', CURRENT_TIMESTAMP, 'admin@ekart.com'),
('Shipping Policy', 'We ship to all major cities in India within 3-5 business days...', 'policy', 'shipping-policy', CURRENT_TIMESTAMP, 'admin@ekart.com')
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 27. BANNER TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS banner (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    image_url TEXT,
    link_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    show_on_home BOOLEAN DEFAULT TRUE,
    show_on_customer_home BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0
);

INSERT INTO banner (title, image_url, link_url, active, display_order) VALUES 
('Summer Sale 2026', 'https://cdn.example.com/summer-sale.jpg', '/products?category=fashion', TRUE, 1),
('Electronics Mega Offer', 'https://cdn.example.com/electronics-offer.jpg', '/products?category=electronics', TRUE, 2),
('Grocery Deals', 'https://cdn.example.com/grocery-deals.jpg', '/products?category=food', TRUE, 3),
('Home Essentials', 'https://cdn.example.com/home-essentials.jpg', '/products?category=home', TRUE, 4)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- 28. REPORTING SCHEMA - SALES_RECORD TABLE
-- ========================================================================
CREATE SCHEMA IF NOT EXISTS reporting;

CREATE TABLE IF NOT EXISTS reporting.sales_record (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER,
    order_date TIMESTAMP,
    order_total DOUBLE PRECISION,
    delivery_charge DOUBLE PRECISION,
    product_id INTEGER,
    product_name VARCHAR(255),
    category VARCHAR(255),
    item_price DOUBLE PRECISION,
    quantity INTEGER,
    vendor_id INTEGER,
    vendor_name VARCHAR(255),
    customer_id INTEGER,
    customer_name VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_sales_record_vendor_id ON reporting.sales_record(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sales_record_order_date ON reporting.sales_record(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_record_category ON reporting.sales_record(category);
CREATE INDEX IF NOT EXISTS idx_sales_record_order_id ON reporting.sales_record(order_id);

INSERT INTO reporting.sales_record (order_id, order_date, order_total, delivery_charge, product_id, product_name, category, item_price, quantity, vendor_id, vendor_name, customer_id, customer_name) VALUES 
(1, CURRENT_TIMESTAMP, 450.00, 30.00, 1, 'Lay''s Potato Chips 100g', 'Chips', 20.00, 2, 1, 'Fresh Foods Co.', 1, 'John Doe'),
(2, CURRENT_TIMESTAMP - INTERVAL '1 day', 99999.00, 100.00, 3, 'iPhone 15 Pro', 'Phones', 99999.00, 1, 2, 'Tech Supplies Ltd.', 2, 'Jane Smith'),
(3, CURRENT_TIMESTAMP - INTERVAL '2 days', 299.00, 50.00, 5, 'Men''s Cotton T-Shirt', 'Men Clothing', 299.00, 1, 3, 'Fashion Hub', 3, 'Raj Kumar')
ON CONFLICT DO NOTHING;

-- ========================================================================
-- END OF DATA.SQL
-- ========================================================================
-- Total Tables: 28
-- Total Schemas: 2 (public, reporting)
-- Sample Data Inserted: ~50 records
-- ========================================================================
