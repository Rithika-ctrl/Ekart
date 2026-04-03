-- ========================================================================
-- EKART DATABASE - COMPLETE SCHEMA
-- All 27 Tables with Column Definitions (No Data)
-- ========================================================================

-- 1. WAREHOUSE TABLE
CREATE TABLE IF NOT EXISTS warehouse (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    warehouse_code VARCHAR(20) UNIQUE,
    served_pin_codes VARCHAR(5000) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    CONSTRAINT idx_warehouse_code UNIQUE (warehouse_code)
);

-- 2. CATEGORY TABLE
CREATE TABLE IF NOT EXISTS category (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) DEFAULT '📦',
    display_order INT,
    parent BOOLEAN DEFAULT FALSE,
    parent_id INT,
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES category(id) ON DELETE CASCADE
);

-- 3. VENDOR TABLE
CREATE TABLE IF NOT EXISTS vendor (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(30) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile BIGINT NOT NULL,
    password VARCHAR(255) NOT NULL,
    otp INT,
    verified BOOLEAN,
    provider VARCHAR(50),
    provider_id VARCHAR(100),
    vendor_code VARCHAR(20) UNIQUE,
    description LONGTEXT,
    INDEX idx_vendor_email (email)
);

-- 4. PRODUCT TABLE
CREATE TABLE IF NOT EXISTS product (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    description LONGTEXT,
    price DOUBLE,
    mrp DOUBLE DEFAULT 0,
    gst_rate DOUBLE DEFAULT 0,
    category VARCHAR(100),
    stock INT,
    stock_alert_threshold INT DEFAULT 10,
    image_link VARCHAR(1000),
    extra_image_links VARCHAR(2000),
    video_link VARCHAR(1000),
    approved BOOLEAN DEFAULT FALSE,
    allowed_pin_codes VARCHAR(1000),
    vendor_id INT,
    CONSTRAINT fk_product_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id),
    INDEX idx_product_approved (approved),
    INDEX idx_product_category (category)
);

-- 5. CUSTOMER TABLE
CREATE TABLE IF NOT EXISTS customer (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(30),
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile BIGINT,
    password VARCHAR(255) NOT NULL,
    otp INT,
    verified BOOLEAN,
    role VARCHAR(20) DEFAULT 'CUSTOMER',
    active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    provider VARCHAR(50),
    provider_id VARCHAR(100),
    cart_id INT,
    recently_viewed_products VARCHAR(200),
    profile_image VARCHAR(500),
    INDEX idx_customer_email (email)
);

-- 6. CART TABLE
CREATE TABLE IF NOT EXISTS cart (
    id INT PRIMARY KEY AUTO_INCREMENT
);

-- 7. ITEM TABLE
CREATE TABLE IF NOT EXISTS item (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    description LONGTEXT,
    price DOUBLE,
    unit_price DOUBLE,
    category VARCHAR(100),
    quantity INT,
    image_link VARCHAR(1000),
    product_id INT,
    cart_id INT NOT NULL,
    CONSTRAINT fk_item_cart FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE
);

-- 8. SHOPPING_ORDER TABLE
CREATE TABLE IF NOT EXISTS shopping_order (
    id INT PRIMARY KEY AUTO_INCREMENT,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    amount DOUBLE DEFAULT 0,
    date_time DATETIME,
    delivery_charge DOUBLE DEFAULT 0,
    total_price DOUBLE DEFAULT 0,
    gst_amount DOUBLE DEFAULT 0,
    payment_mode VARCHAR(50),
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivery_time VARCHAR(300),
    replacement_requested BOOLEAN DEFAULT FALSE,
    tracking_status VARCHAR(50) DEFAULT 'PROCESSING',
    current_city VARCHAR(100),
    customer_id INT NOT NULL,
    warehouse_id INT,
    delivery_boy_id INT,
    delivery_pin_code VARCHAR(10),
    delivery_address VARCHAR(500),
    parent_order_id INT,
    vendor_id INT,
    CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customer(id),
    CONSTRAINT fk_order_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouse(id),
    CONSTRAINT fk_order_delivery_boy FOREIGN KEY (delivery_boy_id) REFERENCES delivery_boy(id),
    CONSTRAINT fk_order_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id),
    INDEX idx_order_date (order_date),
    INDEX idx_order_customer (customer_id),
    INDEX idx_order_parent (parent_order_id)
);

-- 9. ADDRESS TABLE
CREATE TABLE IF NOT EXISTS address (
    id INT PRIMARY KEY AUTO_INCREMENT,
    details LONGTEXT,
    recipient_name VARCHAR(100),
    house_street VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    customer_id INT NOT NULL,
    CONSTRAINT fk_address_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);

-- 10. DELIVERY_BOY TABLE
CREATE TABLE IF NOT EXISTS delivery_boy (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile BIGINT NOT NULL,
    password VARCHAR(255) NOT NULL,
    otp INT,
    verified BOOLEAN,
    admin_approved BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    warehouse_id INT,
    assigned_pin_codes VARCHAR(1000),
    delivery_boy_code VARCHAR(20) UNIQUE,
    is_available BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_delivery_boy_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouse(id),
    INDEX idx_db_email (email)
);

-- 11. DELIVERY_OTP TABLE
CREATE TABLE IF NOT EXISTS delivery_otp (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT UNIQUE NOT NULL,
    otp INT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    generated_at DATETIME NOT NULL,
    used_at DATETIME,
    CONSTRAINT fk_delivery_otp_order FOREIGN KEY (order_id) REFERENCES shopping_order(id)
);

-- 12. REVIEW TABLE
CREATE TABLE IF NOT EXISTS review (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rating INT,
    comment VARCHAR(1000),
    customer_name VARCHAR(100),
    created_at DATETIME,
    product_id INT NOT NULL,
    CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);

-- 13. REVIEW_IMAGES TABLE
CREATE TABLE IF NOT EXISTS review_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    image_url VARCHAR(1000) NOT NULL,
    review_id INT NOT NULL,
    CONSTRAINT fk_review_images_review FOREIGN KEY (review_id) REFERENCES review(id) ON DELETE CASCADE
);

-- 14. WISHLIST TABLE
CREATE TABLE IF NOT EXISTS wishlist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    added_at DATETIME,
    CONSTRAINT fk_wishlist_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    UNIQUE KEY uk_wishlist (customer_id, product_id)
);

-- 15. COUPON TABLE
CREATE TABLE IF NOT EXISTS coupon (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(30) UNIQUE NOT NULL,
    description VARCHAR(200) NOT NULL,
    type VARCHAR(20) DEFAULT 'PERCENT',
    value DOUBLE,
    min_order_amount DOUBLE DEFAULT 0,
    max_discount DOUBLE DEFAULT 0,
    usage_limit INT DEFAULT 0,
    used_count INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    expiry_date DATE
);

-- 16. REFUND TABLE
CREATE TABLE IF NOT EXISTS refund (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT,
    customer_id INT,
    amount DOUBLE,
    reason VARCHAR(500),
    status VARCHAR(50) DEFAULT 'PENDING',
    rejection_reason VARCHAR(500),
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    processed_by VARCHAR(100),
    CONSTRAINT fk_refund_order FOREIGN KEY (order_id) REFERENCES shopping_order(id),
    CONSTRAINT fk_refund_customer FOREIGN KEY (customer_id) REFERENCES customer(id)
);

-- 17. REFUND_IMAGES TABLE
CREATE TABLE IF NOT EXISTS refund_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    image_url VARCHAR(1000) NOT NULL,
    refund_id INT NOT NULL,
    CONSTRAINT fk_refund_images_refund FOREIGN KEY (refund_id) REFERENCES refund(id) ON DELETE CASCADE
);

-- 18. STOCK_ALERT TABLE
CREATE TABLE IF NOT EXISTS stock_alert (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT,
    vendor_id INT,
    stock_level INT,
    alert_time DATETIME,
    email_sent BOOLEAN,
    acknowledged BOOLEAN,
    message LONGTEXT,
    CONSTRAINT fk_stock_alert_product FOREIGN KEY (product_id) REFERENCES product(id),
    CONSTRAINT fk_stock_alert_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id)
);

-- 19. BACK_IN_STOCK_SUBSCRIPTION TABLE
CREATE TABLE IF NOT EXISTS back_in_stock_subscription (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    subscribed_at DATETIME NOT NULL,
    notified BOOLEAN DEFAULT FALSE,
    notified_at DATETIME,
    CONSTRAINT fk_bis_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_bis_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    UNIQUE KEY uk_bis (customer_id, product_id)
);

-- 20. WAREHOUSE_CHANGE_REQUEST TABLE
CREATE TABLE IF NOT EXISTS warehouse_change_request (
    id INT PRIMARY KEY AUTO_INCREMENT,
    delivery_boy_id INT NOT NULL,
    requested_warehouse_id INT NOT NULL,
    reason VARCHAR(500),
    status VARCHAR(50) DEFAULT 'PENDING',
    admin_note VARCHAR(300),
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    current_warehouse_id INT,
    CONSTRAINT fk_wcr_delivery_boy FOREIGN KEY (delivery_boy_id) REFERENCES delivery_boy(id),
    CONSTRAINT fk_wcr_requested_warehouse FOREIGN KEY (requested_warehouse_id) REFERENCES warehouse(id),
    CONSTRAINT fk_wcr_current_warehouse FOREIGN KEY (current_warehouse_id) REFERENCES warehouse(id),
    INDEX idx_wcr_db (delivery_boy_id)
);

-- 21. AUTO_ASSIGN_LOG TABLE
CREATE TABLE IF NOT EXISTS auto_assign_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    delivery_boy_id INT,
    pin_code VARCHAR(10),
    assigned_at DATETIME NOT NULL,
    active_orders_at_assignment INT NOT NULL,
    CONSTRAINT fk_aal_delivery_boy FOREIGN KEY (delivery_boy_id) REFERENCES delivery_boy(id),
    INDEX idx_aal_order (order_id),
    INDEX idx_aal_db (delivery_boy_id),
    INDEX idx_aal_assigned (assigned_at)
);

-- 22. TRACKING_EVENT_LOG TABLE
CREATE TABLE IF NOT EXISTS tracking_event_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    city VARCHAR(200),
    description VARCHAR(500),
    updated_by VARCHAR(50),
    event_time DATETIME NOT NULL,
    CONSTRAINT fk_tel_order FOREIGN KEY (order_id) REFERENCES shopping_order(id),
    INDEX idx_tel_order (order_id)
);

-- 23. USER_ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS user_activities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    action_type VARCHAR(100),
    metadata LONGTEXT,
    timestamp DATETIME
);

-- 24. SALES_RECORD TABLE (Reporting DB)
CREATE TABLE IF NOT EXISTS sales_record (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT,
    order_date DATETIME,
    order_total DOUBLE,
    delivery_charge DOUBLE,
    product_id INT,
    product_name VARCHAR(255),
    category VARCHAR(100),
    item_price DOUBLE,
    quantity INT,
    vendor_id INT,
    vendor_name VARCHAR(100),
    customer_id INT,
    customer_name VARCHAR(100)
);

-- 25. SALES_REPORT TABLE
CREATE TABLE IF NOT EXISTS sales_report (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vendor_id INT NOT NULL,
    report_type VARCHAR(100),
    report_date DATE,
    total_revenue DOUBLE,
    total_orders INT,
    total_items_sold INT,
    avg_order_value DOUBLE,
    generated_at DATETIME,
    CONSTRAINT fk_sales_report_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id)
);

-- 26. POLICIES TABLE
CREATE TABLE IF NOT EXISTS policies (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) UNIQUE NOT NULL,
    content LONGTEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    last_updated DATETIME NOT NULL,
    author_admin_id VARCHAR(100) NOT NULL
);

-- 27. BANNER TABLE
CREATE TABLE IF NOT EXISTS banner (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255),
    image_url LONGTEXT,
    link_url LONGTEXT,
    active BOOLEAN DEFAULT TRUE,
    show_on_home BOOLEAN DEFAULT TRUE,
    show_on_customer_home BOOLEAN DEFAULT TRUE,
    display_order INT
);

-- ========================================================================
-- FOREIGN KEY and POST-CREATION UPDATES
-- Update customer cart_id foreign key reference
-- ========================================================================
ALTER TABLE customer ADD CONSTRAINT fk_customer_cart FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE SET NULL;

-- ========================================================================
-- INDEXES (Additional Performance Indexes)
-- ========================================================================
CREATE INDEX idx_product_vendor ON product(vendor_id);
CREATE INDEX idx_order_vendor ON shopping_order(vendor_id);
CREATE INDEX idx_stock_alert_vendor ON stock_alert(vendor_id);
CREATE INDEX idx_sales_report_vendor ON sales_report(vendor_id);