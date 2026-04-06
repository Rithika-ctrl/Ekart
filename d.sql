-- ============================================================================
-- EKART - COMPLETE DATABASE WITH SCHEMA & TEST DATA
-- PostgreSQL Full Database for Development/Testing
-- ============================================================================

-- ============================================================================
-- DROP & CLEANUP (PostgreSQL CASCADE cleanup)
-- ============================================================================
DROP TABLE IF EXISTS tracking_event_log CASCADE;
DROP TABLE IF EXISTS auto_assign_log CASCADE;
DROP TABLE IF EXISTS warehouse_change_request CASCADE;
DROP TABLE IF EXISTS back_in_stock_subscription CASCADE;
DROP TABLE IF EXISTS stock_alert CASCADE;
DROP TABLE IF EXISTS refund_images CASCADE;
DROP TABLE IF EXISTS refund CASCADE;
DROP TABLE IF EXISTS review_images CASCADE;
DROP TABLE IF EXISTS review CASCADE;
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS delivery_otp CASCADE;
DROP TABLE IF EXISTS shopping_order_items CASCADE;
DROP TABLE IF EXISTS shopping_order CASCADE;
DROP TABLE IF EXISTS item CASCADE;
DROP TABLE IF EXISTS address CASCADE;
DROP TABLE IF EXISTS customer CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS delivery_boy CASCADE;
DROP TABLE IF EXISTS warehouse CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS vendor CASCADE;
DROP TABLE IF EXISTS coupon CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS banner CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS user_activities CASCADE;
DROP TABLE IF EXISTS sales_report CASCADE;
DROP TABLE IF EXISTS sales_record CASCADE;

DROP SEQUENCE IF EXISTS product_id_seq;
DROP TYPE IF EXISTS customer_role CASCADE;
DROP TYPE IF EXISTS tracking_status CASCADE;
DROP TYPE IF EXISTS refund_status CASCADE;
DROP TYPE IF EXISTS coupon_type CASCADE;
DROP TYPE IF EXISTS wcr_status CASCADE;

-- ============================================================================
-- ENUMS (PostgreSQL native types for type safety)
-- ============================================================================
CREATE TYPE customer_role AS ENUM ('CUSTOMER', 'ORDER_MANAGER', 'ADMIN');
CREATE TYPE tracking_status AS ENUM ('PROCESSING','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED');
CREATE TYPE refund_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE coupon_type AS ENUM ('PERCENT', 'FLAT');
CREATE TYPE wcr_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ============================================================================
-- 1. WAREHOUSE - Physical fulfilment centres serving pin codes
-- ============================================================================
CREATE TABLE warehouse (
    id               SERIAL       PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    city             VARCHAR(100) NOT NULL,
    state            VARCHAR(100) NOT NULL,
    warehouse_code   VARCHAR(20)  UNIQUE,
    served_pin_codes VARCHAR(5000) NOT NULL,
    active           BOOLEAN      DEFAULT TRUE
);
CREATE INDEX idx_warehouse_active ON warehouse(active);

-- ============================================================================
-- 2. CATEGORY - Product categories (2-level self-referential hierarchy)
-- ============================================================================
CREATE TABLE category (
    id            SERIAL       PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    emoji         VARCHAR(10)  DEFAULT '📦',
    display_order INT,
    is_parent     BOOLEAN      DEFAULT FALSE,
    parent_id     INT,
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES category(id) ON DELETE CASCADE
);
CREATE INDEX idx_category_parent ON category(parent_id);
CREATE INDEX idx_category_name ON category(name);

-- ============================================================================
-- 3. VENDOR - Independent sellers with separate authentication
-- ============================================================================
CREATE TABLE vendor (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(30)  NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    mobile      BIGINT       NOT NULL,
    password    VARCHAR(255) NOT NULL,
    otp         INT,
    verified    BOOLEAN,
    provider    VARCHAR(50),
    provider_id VARCHAR(100),
    vendor_code VARCHAR(20)  UNIQUE,
    description TEXT
);
CREATE INDEX idx_vendor_email ON vendor(email);
CREATE INDEX idx_vendor_code ON vendor(vendor_code);

-- ============================================================================
-- 4. PRODUCT - Inventory items for sale
-- ============================================================================
CREATE SEQUENCE product_id_seq START 121001 INCREMENT 1;

CREATE TABLE product (
    id                    INT              PRIMARY KEY DEFAULT nextval('product_id_seq'),
    name                  VARCHAR(255),
    description           TEXT,
    price                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    mrp                   DOUBLE PRECISION NOT NULL DEFAULT 0,
    gst_rate              DOUBLE PRECISION NOT NULL DEFAULT 0,
    category              VARCHAR(100),
    stock                 INT,
    stock_alert_threshold INT              DEFAULT 10,
    image_link            VARCHAR(1000),
    extra_image_links     VARCHAR(2000),
    video_link            VARCHAR(1000),
    approved              BOOLEAN          DEFAULT FALSE,
    allowed_pin_codes     VARCHAR(1000),
    vendor_id             INT,
    CONSTRAINT fk_product_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_approved ON product(approved);
CREATE INDEX idx_product_category ON product(category);
CREATE INDEX idx_product_vendor ON product(vendor_id);
CREATE INDEX idx_product_stock ON product(stock);

-- ============================================================================
-- 5. CART - Shopping cart container (one per customer)
-- ============================================================================
CREATE TABLE cart (
    id SERIAL PRIMARY KEY
);

-- ============================================================================
-- 6. CUSTOMER - App users with role-based access
-- ============================================================================
CREATE TABLE customer (
    id                       SERIAL       PRIMARY KEY,
    name                     VARCHAR(30),
    email                    VARCHAR(100) UNIQUE NOT NULL,
    mobile                   BIGINT,
    password                 VARCHAR(255) NOT NULL,
    otp                      INT,
    verified                 BOOLEAN,
    role                     customer_role DEFAULT 'CUSTOMER',
    active                   BOOLEAN      DEFAULT TRUE,
    last_login               TIMESTAMP,
    provider                 VARCHAR(50),
    provider_id              VARCHAR(100),
    cart_id                  INT UNIQUE,
    recently_viewed_products VARCHAR(200),
    profile_image            VARCHAR(500),
    CONSTRAINT fk_customer_cart FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE SET NULL
);
CREATE INDEX idx_customer_email ON customer(email);
CREATE INDEX idx_customer_active ON customer(active);

-- ============================================================================
-- 7. ADDRESS - Delivery addresses (multiple per customer)
-- ============================================================================
CREATE TABLE address (
    id             SERIAL       PRIMARY KEY,
    details        TEXT,
    recipient_name VARCHAR(100),
    house_street   VARCHAR(200),
    city           VARCHAR(100),
    state          VARCHAR(100),
    postal_code    VARCHAR(20),
    customer_id    INT NOT NULL,
    CONSTRAINT fk_address_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
CREATE INDEX idx_address_customer ON address(customer_id);

-- ============================================================================
-- 8. ITEM - Cart/Order line items (product snapshot at purchase time)
-- ============================================================================
CREATE TABLE item (
    id          SERIAL           PRIMARY KEY,
    name        VARCHAR(255),
    description TEXT,
    unit_price  DOUBLE PRECISION,
    price       DOUBLE PRECISION,
    category    VARCHAR(100),
    quantity    INT              DEFAULT 1,
    image_link  VARCHAR(1000),
    product_id  INT,
    cart_id     INT,
    CONSTRAINT fk_item_cart FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE
);
CREATE INDEX idx_item_cart ON item(cart_id);
CREATE INDEX idx_item_product ON item(product_id);

-- ============================================================================
-- 9. DELIVERY_BOY - Delivery personnel with warehouse assignment
-- ============================================================================
CREATE TABLE delivery_boy (
    id                 SERIAL       PRIMARY KEY,
    name               VARCHAR(50)  NOT NULL,
    email              VARCHAR(100) NOT NULL UNIQUE,
    mobile             BIGINT       NOT NULL,
    password           VARCHAR(255) NOT NULL,
    otp                INT,
    verified           BOOLEAN      DEFAULT FALSE,
    admin_approved     BOOLEAN      DEFAULT FALSE,
    active             BOOLEAN      DEFAULT TRUE,
    warehouse_id       INT,
    assigned_pin_codes VARCHAR(1000),
    delivery_boy_code  VARCHAR(20)  UNIQUE,
    is_available       BOOLEAN      DEFAULT FALSE,
    CONSTRAINT fk_db_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouse(id) ON DELETE SET NULL
);
CREATE INDEX idx_db_email ON delivery_boy(email);
CREATE INDEX idx_db_warehouse ON delivery_boy(warehouse_id);
CREATE INDEX idx_db_available ON delivery_boy(is_available);

-- ============================================================================
-- 10. SHOPPING_ORDER - Customer orders (one order per vendor per cart)
-- ============================================================================
CREATE TABLE shopping_order (
    id                    SERIAL           PRIMARY KEY,
    razorpay_payment_id   VARCHAR(100),
    razorpay_order_id     VARCHAR(100),
    amount                DOUBLE PRECISION,
    date_time             TIMESTAMP,
    delivery_charge       DOUBLE PRECISION DEFAULT 0,
    total_price           DOUBLE PRECISION DEFAULT 0,
    gst_amount            DOUBLE PRECISION DEFAULT 0,
    payment_mode          VARCHAR(50),
    order_date            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_time         VARCHAR(300),
    replacement_requested BOOLEAN   DEFAULT FALSE,
    tracking_status       tracking_status DEFAULT 'PROCESSING',
    current_city          VARCHAR(100),
    delivery_pin_code     VARCHAR(10),
    delivery_address      VARCHAR(500),
    parent_order_id       INT,
    customer_id           INT,
    warehouse_id          INT,
    delivery_boy_id       INT,
    vendor_id             INT,
    CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customer(id),
    CONSTRAINT fk_order_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouse(id) ON DELETE SET NULL,
    CONSTRAINT fk_order_delivery_boy FOREIGN KEY (delivery_boy_id) REFERENCES delivery_boy(id) ON DELETE SET NULL,
    CONSTRAINT fk_order_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id) ON DELETE SET NULL
);
CREATE INDEX idx_order_date ON shopping_order(order_date);
CREATE INDEX idx_order_customer ON shopping_order(customer_id);
CREATE INDEX idx_order_parent ON shopping_order(parent_order_id);
CREATE INDEX idx_order_vendor ON shopping_order(vendor_id);
CREATE INDEX idx_order_tracking ON shopping_order(tracking_status);
CREATE INDEX idx_order_delivery_boy ON shopping_order(delivery_boy_id);

-- ============================================================================
-- 11. SHOPPING_ORDER_ITEMS - Junction table (Order ↔ Item M2M)
-- ============================================================================
CREATE TABLE shopping_order_items (
    order_id INT NOT NULL,
    items_id INT NOT NULL UNIQUE,
    PRIMARY KEY (order_id, items_id),
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES shopping_order(id) ON DELETE CASCADE,
    CONSTRAINT fk_oi_item FOREIGN KEY (items_id) REFERENCES item(id) ON DELETE CASCADE
);

-- ============================================================================
-- 12. DELIVERY_OTP - One-time password per order for delivery verification
-- ============================================================================
CREATE TABLE delivery_otp (
    id           SERIAL    PRIMARY KEY,
    order_id     INT       NOT NULL UNIQUE,
    otp          INT       NOT NULL,
    used         BOOLEAN   DEFAULT FALSE,
    generated_at TIMESTAMP,
    used_at      TIMESTAMP,
    CONSTRAINT fk_delivery_otp_order FOREIGN KEY (order_id) REFERENCES shopping_order(id) ON DELETE CASCADE
);
CREATE INDEX idx_delivery_otp_used ON delivery_otp(used);

-- ============================================================================
-- 13. TRACKING_EVENT_LOG - Full audit trail of order status changes
-- ============================================================================
CREATE TABLE tracking_event_log (
    id          SERIAL          PRIMARY KEY,
    order_id    INT             NOT NULL,
    status      tracking_status NOT NULL,
    city        VARCHAR(200),
    description VARCHAR(500),
    updated_by  VARCHAR(50),
    event_time  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tel_order FOREIGN KEY (order_id) REFERENCES shopping_order(id) ON DELETE CASCADE
);
CREATE INDEX idx_tel_order ON tracking_event_log(order_id);
CREATE INDEX idx_tel_time ON tracking_event_log(event_time);

-- ============================================================================
-- 14. REFUND - Refund request management
-- ============================================================================
CREATE TABLE refund (
    id               SERIAL           PRIMARY KEY,
    order_id         INT,
    customer_id      INT,
    amount           DOUBLE PRECISION,
    reason           VARCHAR(500),
    status           refund_status DEFAULT 'PENDING',
    rejection_reason VARCHAR(500),
    requested_at     TIMESTAMP,
    processed_at     TIMESTAMP,
    processed_by     VARCHAR(100),
    CONSTRAINT fk_refund_order FOREIGN KEY (order_id) REFERENCES shopping_order(id),
    CONSTRAINT fk_refund_customer FOREIGN KEY (customer_id) REFERENCES customer(id)
);
CREATE INDEX idx_refund_order ON refund(order_id);
CREATE INDEX idx_refund_customer ON refund(customer_id);
CREATE INDEX idx_refund_status ON refund(status);

-- ============================================================================
-- 15. REFUND_IMAGES - Evidence images for refund claims (max 5)
-- ============================================================================
CREATE TABLE refund_images (
    id        SERIAL       PRIMARY KEY,
    image_url VARCHAR(1000) NOT NULL,
    refund_id INT           NOT NULL,
    CONSTRAINT fk_refund_images_refund FOREIGN KEY (refund_id) REFERENCES refund(id) ON DELETE CASCADE
);
CREATE INDEX idx_refund_img_refund ON refund_images(refund_id);

-- ============================================================================
-- 16. REVIEW - Product reviews (1-5 star rating)
-- ============================================================================
CREATE TABLE review (
    id            SERIAL   PRIMARY KEY,
    rating        SMALLINT,
    comment       VARCHAR(1000),
    customer_name VARCHAR(100),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    product_id    INT      NOT NULL,
    CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);
CREATE INDEX idx_review_product ON review(product_id);
CREATE INDEX idx_review_rating ON review(rating);

-- ============================================================================
-- 17. REVIEW_IMAGES - Product review showcase images (max 5)
-- ============================================================================
CREATE TABLE review_images (
    id        SERIAL       PRIMARY KEY,
    image_url VARCHAR(1000) NOT NULL,
    review_id INT           NOT NULL,
    CONSTRAINT fk_review_images_review FOREIGN KEY (review_id) REFERENCES review(id) ON DELETE CASCADE
);
CREATE INDEX idx_review_img_review ON review_images(review_id);

-- ============================================================================
-- 18. WISHLIST - Save for later functionality
-- ============================================================================
CREATE TABLE wishlist (
    id          SERIAL    PRIMARY KEY,
    customer_id INT       NOT NULL,
    product_id  INT       NOT NULL,
    added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlist_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    CONSTRAINT uk_wishlist UNIQUE (customer_id, product_id)
);
CREATE INDEX idx_wishlist_customer ON wishlist(customer_id);

-- ============================================================================
-- 19. COUPON - Promotional discount coupons
-- ============================================================================
CREATE TABLE coupon (
    id               SERIAL           PRIMARY KEY,
    code             VARCHAR(30)      NOT NULL UNIQUE,
    description      VARCHAR(200)     NOT NULL,
    type             coupon_type      DEFAULT 'PERCENT',
    value            DOUBLE PRECISION,
    min_order_amount DOUBLE PRECISION DEFAULT 0,
    max_discount     DOUBLE PRECISION DEFAULT 0,
    usage_limit      INT              DEFAULT 0,
    used_count       INT              DEFAULT 0,
    active           BOOLEAN          DEFAULT TRUE,
    expiry_date      DATE
);
CREATE INDEX idx_coupon_code ON coupon(code);
CREATE INDEX idx_coupon_active ON coupon(active);

-- ============================================================================
-- 20. STOCK_ALERT - Low stock vendor notifications
-- ============================================================================
CREATE TABLE stock_alert (
    id           SERIAL    PRIMARY KEY,
    product_id   INT       NOT NULL,
    vendor_id    INT       NOT NULL,
    stock_level  INT       NOT NULL,
    alert_time   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_sent   BOOLEAN   DEFAULT FALSE,
    acknowledged BOOLEAN   DEFAULT FALSE,
    message      TEXT,
    CONSTRAINT fk_stock_alert_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_alert_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id) ON DELETE CASCADE
);
CREATE INDEX idx_stock_alert_vendor ON stock_alert(vendor_id);
CREATE INDEX idx_stock_alert_product ON stock_alert(product_id);

-- ============================================================================
-- 21. BACK_IN_STOCK_SUBSCRIPTION - "Notify Me" when product is back in stock
-- ============================================================================
CREATE TABLE back_in_stock_subscription (
    id            SERIAL    PRIMARY KEY,
    customer_id   INT       NOT NULL,
    product_id    INT       NOT NULL,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified      BOOLEAN   DEFAULT FALSE,
    notified_at   TIMESTAMP,
    CONSTRAINT fk_bis_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_bis_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    CONSTRAINT uk_bis UNIQUE (customer_id, product_id)
);
CREATE INDEX idx_bis_product ON back_in_stock_subscription(product_id, notified);

-- ============================================================================
-- 22. WAREHOUSE_CHANGE_REQUEST - Delivery boy warehouse transfer requests
-- ============================================================================
CREATE TABLE warehouse_change_request (
    id                     SERIAL     PRIMARY KEY,
    delivery_boy_id        INT        NOT NULL,
    requested_warehouse_id INT        NOT NULL,
    current_warehouse_id   INT,
    reason                 VARCHAR(500),
    status                 wcr_status DEFAULT 'PENDING',
    admin_note             VARCHAR(300),
    requested_at           TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
    resolved_at            TIMESTAMP,
    CONSTRAINT fk_wcr_delivery_boy FOREIGN KEY (delivery_boy_id) REFERENCES delivery_boy(id) ON DELETE CASCADE,
    CONSTRAINT fk_wcr_requested_warehouse FOREIGN KEY (requested_warehouse_id) REFERENCES warehouse(id),
    CONSTRAINT fk_wcr_current_warehouse FOREIGN KEY (current_warehouse_id) REFERENCES warehouse(id)
);
CREATE INDEX idx_wcr_db ON warehouse_change_request(delivery_boy_id);
CREATE INDEX idx_wcr_status ON warehouse_change_request(status);

-- ============================================================================
-- 23. AUTO_ASSIGN_LOG - Audit trail for automatic delivery boy assignment
-- ============================================================================
CREATE TABLE auto_assign_log (
    id                          SERIAL    PRIMARY KEY,
    order_id                    INT,
    delivery_boy_id             INT,
    pin_code                    VARCHAR(10),
    assigned_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active_orders_at_assignment INT       DEFAULT 0,
    CONSTRAINT fk_aal_delivery_boy FOREIGN KEY (delivery_boy_id) REFERENCES delivery_boy(id) ON DELETE SET NULL
);
CREATE INDEX idx_aal_order ON auto_assign_log(order_id);
CREATE INDEX idx_aal_db ON auto_assign_log(delivery_boy_id);
CREATE INDEX idx_aal_assigned ON auto_assign_log(assigned_at);

-- ============================================================================
-- 24. USER_ACTIVITIES - Behavioral event log for analytics
-- ============================================================================
CREATE TABLE user_activities (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT,
    action_type VARCHAR(100),
    metadata    TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ua_user ON user_activities(user_id);
CREATE INDEX idx_ua_action ON user_activities(action_type);
CREATE INDEX idx_ua_created_at ON user_activities(created_at);

-- ============================================================================
-- 25. POLICIES - Legal/CMS pages (Privacy, T&C, Refund Policy, etc.)
-- ============================================================================
CREATE TABLE policies (
    id              BIGSERIAL    PRIMARY KEY,
    title           VARCHAR(255) NOT NULL UNIQUE,
    content         TEXT         NOT NULL,
    category        VARCHAR(100) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    last_updated    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    author_admin_id VARCHAR(100) NOT NULL
);
CREATE INDEX idx_policy_slug ON policies(slug);
CREATE INDEX idx_policy_category ON policies(category);

-- ============================================================================
-- 26. BANNER - Homepage and customer home page banners
-- ============================================================================
CREATE TABLE banner (
    id                    SERIAL       PRIMARY KEY,
    title                 VARCHAR(255),
    image_url             TEXT,
    link_url              TEXT,
    active                BOOLEAN      DEFAULT TRUE,
    show_on_home          BOOLEAN      DEFAULT TRUE,
    show_on_customer_home BOOLEAN      DEFAULT TRUE,
    display_order         INT          DEFAULT 0
);
CREATE INDEX idx_banner_active ON banner(active);
CREATE INDEX idx_banner_display_order ON banner(display_order);

-- ============================================================================
-- 27. SALES_REPORT - Aggregate reporting cache per vendor per period
-- ============================================================================
CREATE TABLE sales_report (
    id               SERIAL           PRIMARY KEY,
    vendor_id        INT              NOT NULL,
    report_type      VARCHAR(100),
    report_date      DATE,
    total_revenue    DOUBLE PRECISION DEFAULT 0,
    total_orders     INT              DEFAULT 0,
    total_items_sold INT              DEFAULT 0,
    avg_order_value  DOUBLE PRECISION DEFAULT 0,
    generated_at     TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_report_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id) ON DELETE CASCADE
);
CREATE INDEX idx_sales_report_vendor ON sales_report(vendor_id);
CREATE INDEX idx_sales_report_date ON sales_report(report_date);

-- ============================================================================
-- 28. SALES_RECORD - Analytics/reporting table (intentionally denormalized)
-- ============================================================================
CREATE TABLE sales_record (
    id              SERIAL           PRIMARY KEY,
    order_id        INT,
    order_date      TIMESTAMP        NOT NULL,
    order_total     DOUBLE PRECISION DEFAULT 0,
    delivery_charge DOUBLE PRECISION DEFAULT 0,
    product_id      INT,
    product_name    VARCHAR(255),
    category        VARCHAR(100),
    item_price      DOUBLE PRECISION DEFAULT 0,
    quantity        INT              DEFAULT 1,
    vendor_id       INT              NOT NULL,
    vendor_name     VARCHAR(100),
    customer_id     INT              NOT NULL,
    customer_name   VARCHAR(100)
);
CREATE INDEX idx_sr_vendor ON sales_record(vendor_id);
CREATE INDEX idx_sr_order ON sales_record(order_id);
CREATE INDEX idx_sr_date ON sales_record(order_date);
CREATE INDEX idx_sr_product ON sales_record(product_id);
CREATE INDEX idx_sr_customer ON sales_record(customer_id);

-- ============================================================================
-- ✅ SCHEMA COMPLETE - START TEST DATA INSERTION
-- ============================================================================

-- ============================================================================
-- TEST DATA: WAREHOUSES
-- ============================================================================
INSERT INTO warehouse (id, name, city, state, warehouse_code, served_pin_codes, active) VALUES
(1, 'Bangalore Central', 'Bangalore', 'Karnataka', 'WH-BLR-001', '560001,560002,560003,560004,560005,560010,560034,560040', true),
(2, 'Mumbai North', 'Mumbai', 'Maharashtra', 'WH-MUM-001', '400001,400002,400003,400004,400005,400006,400007,400008', true),
(3, 'Delhi East', 'Delhi', 'Delhi', 'WH-DEL-001', '110001,110002,110003,110004,110005,110006,110007,110008', true),
(4, 'Hyderabad South', 'Hyderabad', 'Telangana', 'WH-HYD-001', '500001,500002,500003,500004,500005', true),
(5, 'Chennai West', 'Chennai', 'Tamil Nadu', 'WH-CHN-001', '600001,600002,600003,600004,600005,600006', true);

-- ============================================================================
-- TEST DATA: CATEGORIES
-- ============================================================================
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(1, 'Electronics', '📱', 1, true, NULL),
(2, 'Smartphones', '📞', 2, false, 1),
(3, 'Laptops', '💻', 3, false, 1),
(4, 'Accessories', '🎧', 4, true, NULL),
(5, 'Phone Accessories', '📱', 5, false, 4),
(6, 'Clothing', '👕', 6, true, NULL),
(7, 'Men Wear', '👔', 7, false, 6),
(8, 'Women Wear', '👗', 8, false, 6),
(9, 'Books', '📚', 9, true, NULL),
(10, 'Fiction', '📖', 10, false, 9);

-- ============================================================================
-- TEST DATA: VENDORS
-- ============================================================================
INSERT INTO vendor (id, name, email, mobile, password, otp, verified, provider, provider_id, vendor_code, description) VALUES
(1, 'Sanjay E', 'sanjaye@gmail.com', 9876543210, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, NULL, NULL, 'VND-00001', 'Leading electronics seller'),
(2, 'Priya Retail', 'priya.retail@gmail.com', 9876543211, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, NULL, NULL, 'VND-00002', 'Clothing and fashion expert'),
(3, 'Tech Hub', 'tech.hub@gmail.com', 9876543212, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, NULL, NULL, 'VND-00003', 'Official tech accessories store'),
(4, 'Book World', 'bookworld@gmail.com', 9876543213, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, NULL, NULL, 'VND-00004', 'Premium book collection'),
(5, 'Home Essentials', 'home.essentials@gmail.com', 9876543214, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, NULL, NULL, 'VND-00005', 'Home and kitchen products');

-- ============================================================================
-- TEST DATA: PRODUCTS
-- ============================================================================
INSERT INTO product (id, name, description, price, mrp, gst_rate, category, stock, stock_alert_threshold, image_link, approved, vendor_id) VALUES
(121001, 'Wireless Headphones Pro', 'Noise cancelling wireless headphones with 30hr battery', 5999, 8999, 18, 'Accessories', 45, 10, 'https://via.placeholder.com/300?text=Headphones', true, 1),
(121002, 'USB-C Charging Cable', 'Premium USB-C charging cable 2m', 499, 799, 18, 'Phone Accessories', 150, 20, 'https://via.placeholder.com/300?text=Cable', true, 1),
(121003, 'Phone Stand Adjustable', 'Flexible metal phone stand for all devices', 799, 1499, 18, 'Phone Accessories', 82, 15, 'https://via.placeholder.com/300?text=Stand', true, 1),
(121004, 'Samsung Galaxy S21', 'Latest Samsung flagship smartphone 128GB', 59999, 69999, 5, 'Smartphones', 25, 5, 'https://via.placeholder.com/300?text=Samsung', true, 3),
(121005, 'iPhone 13 Pro', 'Apple iPhone 13 Pro 256GB Space Gray', 99999, 129999, 5, 'Smartphones', 15, 5, 'https://via.placeholder.com/300?text=iPhone', true, 3),
(121006, 'MacBook Air M1', 'Apple MacBook Air M1 256GB', 89999, 109999, 5, 'Laptops', 8, 3, 'https://via.placeholder.com/300?text=MacBook', true, 3),
(121007, 'Dell XPS 13', 'Dell XPS 13 Laptop Intel i7 512GB SSD', 79999, 99999, 5, 'Laptops', 12, 5, 'https://via.placeholder.com/300?text=Dell', true, 3),
(121008, 'Casual T-Shirt Men Blue', 'Cotton casual t-shirt for men', 399, 699, 18, 'Men Wear', 200, 30, 'https://via.placeholder.com/300?text=TShirt', true, 2),
(121009, 'Summer Dress Women', 'Elegant summer dress available in S-M-L-XL', 1299, 1999, 18, 'Women Wear', 120, 20, 'https://via.placeholder.com/300?text=Dress', true, 2),
(121010, 'The Great Gatsby', 'F. Scott Fitzgerald classic novel', 299, 399, 5, 'Fiction', 85, 15, 'https://via.placeholder.com/300?text=Book', true, 4),
(121011, '1984 by George Orwell', 'Dystopian novel 1984', 349, 499, 5, 'Fiction', 120, 20, 'https://via.placeholder.com/300?text=Book', true, 4),
(121012, 'Kitchen Knife Set 6Pc', 'Professional stainless steel knife set', 1899, 2999, 18, 'Kitchen', 35, 10, 'https://via.placeholder.com/300?text=Knives', true, 5);

-- ============================================================================
-- TEST DATA: CARTS
-- ============================================================================
INSERT INTO cart (id) VALUES (1), (2), (3), (4), (5);

-- ============================================================================
-- TEST DATA: CUSTOMERS
-- ============================================================================
INSERT INTO customer (id, name, email, mobile, password, otp, verified, role, active, provider, provider_id, cart_id) VALUES
(1, 'Raj Kumar', 'customer1@gmail.com', 9876543221, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, 'CUSTOMER', true, NULL, NULL, 1),
(2, 'Priya Singh', 'customer2@gmail.com', 9876543222, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, 'CUSTOMER', true, NULL, NULL, 2),
(3, 'Amit Patel', 'customer3@gmail.com', 9876543223, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, 'CUSTOMER', true, NULL, NULL, 3),
(4, 'Sophia Chen', 'customer4@gmail.com', 9876543224, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, 'CUSTOMER', true, NULL, NULL, 4),
(5, 'Admin User', 'admin@ekart.com', 9876543225, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, 'ADMIN', true, NULL, NULL, 5);

-- ============================================================================
-- TEST DATA: ADDRESSES
-- ============================================================================
INSERT INTO address (id, details, recipient_name, house_street, city, state, postal_code, customer_id) VALUES
(1, 'Apt 101, Green Park', 'Raj Kumar', '123 Main Street', 'Bangalore', 'Karnataka', '560001', 1),
(2, 'Flat 205, Blue Tower', 'Raj Kumar', '456 Park Avenue', 'Bangalore', 'Karnataka', '560010', 1),
(3, 'House 789, Red Lane', 'Priya Singh', '789 Elm Street', 'Mumbai', 'Maharashtra', '400001', 2),
(4, 'Apt 501, Gold Building', 'Priya Singh', '321 Oak Road', 'Mumbai', 'Maharashtra', '400005', 2),
(5, 'Flat 102, White Mansion', 'Amit Patel', '654 Pine Street', 'Delhi', 'Delhi', '110001', 3),
(6, 'House 321, Purple Colony', 'Sophia Chen', '987 Cherry Lane', 'Hyderabad', 'Telangana', '500001', 4);

-- ============================================================================
-- TEST DATA: ITEMS (for orders)
-- ============================================================================
INSERT INTO item (id, name, description, unit_price, price, category, quantity, image_link, product_id) VALUES
(1, 'Wireless Headphones Pro', 'Noise cancelling wireless headphones', 5999, 11998, 'Accessories', 2, 'https://via.placeholder.com/300?text=Headphones', 121001),
(2, 'USB-C Charging Cable', 'Premium USB-C charging cable', 499, 1497, 'Phone Accessories', 3, 'https://via.placeholder.com/300?text=Cable', 121002),
(3, 'Phone Stand Adjustable', 'Flexible metal phone stand', 799, 799, 'Phone Accessories', 1, 'https://via.placeholder.com/300?text=Stand', 121003),
(4, 'Samsung Galaxy S21', 'Latest Samsung flagship smartphone', 59999, 59999, 'Smartphones', 1, 'https://via.placeholder.com/300?text=Samsung', 121004),
(5, 'Casual T-Shirt Men Blue', 'Cotton casual t-shirt', 399, 798, 'Men Wear', 2, 'https://via.placeholder.com/300?text=TShirt', 121008),
(6, 'Summer Dress Women', 'Elegant summer dress', 1299, 1299, 'Women Wear', 1, 'https://via.placeholder.com/300?text=Dress', 121009),
(7, 'The Great Gatsby', 'F. Scott Fitzgerald novel', 299, 598, 'Fiction', 2, 'https://via.placeholder.com/300?text=Book', 121010),
(8, 'Kitchen Knife Set 6Pc', 'Professional stainless steel knives', 1899, 1899, 'Kitchen', 1, 'https://via.placeholder.com/300?text=Knives', 121012);

-- ============================================================================
-- TEST DATA: DELIVERY BOYS
-- ============================================================================
INSERT INTO delivery_boy (id, name, email, mobile, password, otp, verified, admin_approved, active, warehouse_id, assigned_pin_codes, delivery_boy_code, is_available) VALUES
(1, 'Rohan Kumar', 'rohan.deliver@gmail.com', 9876543301, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, true, true, 1, '560001,560002,560003,560004,560010', 'DB-00001', true),
(2, 'Vikram Singh', 'vikram.deliver@gmail.com', 9876543302, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, true, true, 2, '400001,400002,400003,400005', 'DB-00002', true),
(3, 'Arjun Verma', 'arjun.deliver@gmail.com', 9876543303, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, true, true, 3, '110001,110002,110003,110005', 'DB-00003', false),
(4, 'Nikhil Reddy', 'nikhil.deliver@gmail.com', 9876543304, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, true, true, 4, '500001,500002,500003', 'DB-00004', true),
(5, 'Suresh Kumar', 'suresh.deliver@gmail.com', 9876543305, '$2a$10$8PJXz5z5P5z5P5z5P5z5P', NULL, true, true, true, 5, '600001,600002,600003,600005', 'DB-00005', false);

-- ============================================================================
-- TEST DATA: SHOPPING ORDERS
-- ============================================================================
INSERT INTO shopping_order (id, razorpay_payment_id, razorpay_order_id, amount, date_time, delivery_charge, total_price, gst_amount, payment_mode, order_date, delivery_time, replacement_requested, tracking_status, current_city, delivery_pin_code, delivery_address, customer_id, warehouse_id, delivery_boy_id, vendor_id) VALUES
(1, 'pay_001', 'order_001', 13495, NOW() - INTERVAL '3 days', 100, 13495, 2031, 'UPI', NOW() - INTERVAL '3 days', 'Delivered', false, 'DELIVERED', 'Bangalore', '560001', 'Apt 101, Green Park, 123 Main Street, Bangalore 560001', 1, 1, 1, 1),
(2, 'pay_002', 'order_002', 2497, NOW() - INTERVAL '5 days', 100, 2497, 375, 'CARD', NOW() - INTERVAL '5 days', 'Delivered', false, 'DELIVERED', 'Bangalore', '560010', 'Flat 205, Blue Tower, 456 Park Avenue, Bangalore 560010', 1, 1, 1, 1),
(3, 'pay_003', 'order_003', 62299, NOW() - INTERVAL '1 day', 100, 62299, 2963, 'PLASTC', NOW() - INTERVAL '1 day', 'In Transit', false, 'OUT_FOR_DELIVERY', 'Mumbai', '400001', 'House 789, Red Lane, 789 Elm Street, Mumbai 400001', 2, 2, 2, 3),
(4, 'pay_004', 'order_004', 2197, NOW() - INTERVAL '2 days', 100, 2197, 330, 'UPI', NOW() - INTERVAL '2 days', 'Delivered', false, 'DELIVERED', 'Mumbai', '400005', 'Apt 501, Gold Building, 321 Oak Road, Mumbai 400005', 2, 2, 2, 2),
(5, 'pay_005', 'order_005', 3198, NOW() - INTERVAL '4 days', 100, 3198, 480, 'WALLET', NOW() - INTERVAL '4 days', 'Delivered', false, 'DELIVERED', 'Delhi', '110001', 'Flat 102, White Mansion, 654 Pine Street, Delhi 110001', 3, 3, 3, 5),
(6, 'pay_006', 'order_006', 1999, NOW(), 100, 1999, 300, 'UPI', NOW(), 'Tomorrow', false, 'PROCESSING', 'Hyderabad', '500001', 'House 321, Purple Colony, 987 Cherry Lane, Hyderabad 500001', 4, 4, 4, 4);

-- ============================================================================
-- TEST DATA: SHOPPING ORDER ITEMS (M2M junction)
-- ============================================================================
INSERT INTO shopping_order_items (order_id, items_id) VALUES
(1, 1), (1, 2),
(2, 3),
(3, 4),
(4, 5), (4, 6),
(5, 7),
(6, 8);

-- ============================================================================
-- TEST DATA: DELIVERY OTPS
-- ============================================================================
INSERT INTO delivery_otp (id, order_id, otp, used, generated_at, used_at) VALUES
(1, 1, 123456, true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(2, 2, 234567, true, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
(3, 3, 345678, false, NOW() - INTERVAL '1 day', NULL),
(4, 4, 456789, true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(5, 5, 567890, true, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
(6, 6, 678901, false, NOW(), NULL);

-- ============================================================================
-- TEST DATA: TRACKING EVENT LOGS
-- ============================================================================
INSERT INTO tracking_event_log (id, order_id, status, city, description, updated_by, event_time) VALUES
(1, 1, 'PROCESSING', 'Bangalore', 'Order received and being processed', 'SYSTEM', NOW() - INTERVAL '3 days'),
(2, 1, 'PACKED', 'Bangalore', 'Order packed and ready for shipment', 'SYSTEM', NOW() - INTERVAL '2.5 days'),
(3, 1, 'SHIPPED', 'Bangalore', 'Order shipped with carrier', 'SYSTEM', NOW() - INTERVAL '2 days'),
(4, 1, 'OUT_FOR_DELIVERY', 'Bangalore', 'Package out for delivery', 'RohanKumar', NOW() - INTERVAL '1 day'),
(5, 1, 'DELIVERED', 'Bangalore', 'Package delivered successfully', 'RohanKumar', NOW() - INTERVAL '3 hours'),
(6, 2, 'PROCESSING', 'Bangalore', 'Order received', 'SYSTEM', NOW() - INTERVAL '5 days'),
(7, 2, 'DELIVERED', 'Bangalore', 'Package delivered', 'RohanKumar', NOW() - INTERVAL '2 hours'),
(8, 3, 'PROCESSING', 'Mumbai', 'Order processing', 'SYSTEM', NOW() - INTERVAL '1 day'),
(9, 3, 'OUT_FOR_DELIVERY', 'Mumbai', 'Out for delivery', 'VikramSingh', NOW() - INTERVAL '2 hours'),
(10, 4, 'DELIVERED', 'Mumbai', 'Package delivered', 'VikramSingh', NOW() - INTERVAL '1 hour'),
(11, 5, 'DELIVERED', 'Delhi', 'Package delivered', 'ArjunVerma', NOW() - INTERVAL '4 hours'),
(12, 6, 'PROCESSING', 'Hyderabad', 'Order processing', 'SYSTEM', NOW());

-- ============================================================================
-- TEST DATA: REVIEWS
-- ============================================================================
INSERT INTO review (id, rating, comment, customer_name, created_at, product_id) VALUES
(1, 5, 'Excellent headphones! Sound quality is amazing.', 'Raj Kumar', NOW() - INTERVAL '1 day', 121001),
(2, 4, 'Good product, decent build quality', 'Priya Singh', NOW() - INTERVAL '2 days', 121002),
(3, 5, 'Very useful phone stand, worth the price', 'Amit Patel', NOW() - INTERVAL '3 days', 121003),
(4, 4, 'Good smartphone, fast shipping', 'Sophia Chen', NOW() - INTERVAL '5 days', 121004),
(5, 5, 'Amazing book, highly recommended', 'Raj Kumar', NOW() - INTERVAL '2 days', 121010),
(6, 4, 'Comfortable t-shirt, good fit', 'Amit Patel', NOW() - INTERVAL '1 day', 121008);

-- ============================================================================
-- TEST DATA: REVIEW IMAGES
-- ============================================================================
INSERT INTO review_images (id, image_url, review_id) VALUES
(1, 'https://via.placeholder.com/300?text=Review1', 1),
(2, 'https://via.placeholder.com/300?text=Review2', 1),
(3, 'https://via.placeholder.com/300?text=Review3', 4),
(4, 'https://via.placeholder.com/300?text=Review4', 5);

-- ============================================================================
-- TEST DATA: WISHLIST
-- ============================================================================
INSERT INTO wishlist (id, customer_id, product_id, added_at) VALUES
(1, 1, 121005, NOW() - INTERVAL '7 days'),
(2, 1, 121006, NOW() - INTERVAL '5 days'),
(3, 2, 121009, NOW() - INTERVAL '3 days'),
(4, 3, 121004, NOW() - INTERVAL '2 days'),
(5, 4, 121011, NOW() - INTERVAL '1 day');

-- ============================================================================
-- TEST DATA: COUPONS
-- ============================================================================
INSERT INTO coupon (id, code, description, type, value, min_order_amount, max_discount, usage_limit, used_count, active, expiry_date) VALUES
(1, 'WELCOME20', 'Welcome discount - 20% off', 'PERCENT', 20, 1000, 5000, 100, 12, true, '2026-12-31'),
(2, 'FLAT500', 'Flat 500 discount', 'FLAT', 500, 2000, 500, 50, 8, true, '2026-06-30'),
(3, 'SUMMER30', 'Summer special - 30% off', 'PERCENT', 30, 3000, 10000, 200, 45, true, '2026-08-31'),
(4, 'RETURN10', '10% return customer discount', 'PERCENT', 10, 500, 2000, 999, 120, true, '2026-12-31');

-- ============================================================================
-- TEST DATA: REFUNDS
-- ============================================================================
INSERT INTO refund (id, order_id, customer_id, amount, reason, status, rejection_reason, requested_at, processed_at, processed_by) VALUES
(1, 4, 2, 2197, 'Product damaged on arrival', 'APPROVED', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 'admin@ekart.com'),
(2, 2, 1, 2497, 'Ordered by mistake', 'PENDING', NULL, NOW() - INTERVAL '1 day', NULL, NULL),
(3, 5, 3, 3198, 'Wrong product received', 'APPROVED', NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', 'admin@ekart.com');

-- ============================================================================
-- TEST DATA: REFUND IMAGES
-- ============================================================================
INSERT INTO refund_images (id, image_url, refund_id) VALUES
(1, 'https://via.placeholder.com/300?text=Damage1', 1),
(2, 'https://via.placeholder.com/300?text=Damage2', 1),
(3, 'https://via.placeholder.com/300?text=Damage3', 3),
(4, 'https://via.placeholder.com/300?text=Damage4', 3);

-- ============================================================================
-- TEST DATA: STOCK ALERTS
-- ============================================================================
INSERT INTO stock_alert (id, product_id, vendor_id, stock_level, alert_time, email_sent, acknowledged, message) VALUES
(1, 121004, 3, 5, NOW() - INTERVAL '2 days', true, true, 'Samsung Galaxy S21 stock low - only 5 units left'),
(2, 121006, 3, 3, NOW() - INTERVAL '1 day', true, false, 'MacBook Air M1 stock low - only 3 units left'),
(3, 121008, 2, 8, NOW(), false, false, 'Casual T-Shirt stock low - only 8 units left');

-- ============================================================================
-- TEST DATA: BACK IN STOCK SUBSCRIPTIONS
-- ============================================================================
INSERT INTO back_in_stock_subscription (id, customer_id, product_id, subscribed_at, notified, notified_at) VALUES
(1, 1, 121004, NOW() - INTERVAL '10 days', false, NULL),
(2, 2, 121006, NOW() - INTERVAL '7 days', false, NULL),
(3, 3, 121009, NOW() - INTERVAL '5 days', false, NULL),
(4, 4, 121012, NOW() - INTERVAL '3 days', true, NOW() - INTERVAL '1 day');

-- ============================================================================
-- TEST DATA: WAREHOUSE CHANGE REQUESTS
-- ============================================================================
INSERT INTO warehouse_change_request (id, delivery_boy_id, requested_warehouse_id, current_warehouse_id, reason, status, admin_note, requested_at, resolved_at) VALUES
(1, 3, 2, 3, 'Want to work in Mumbai', 'PENDING', NULL, NOW() - INTERVAL '3 days', NULL),
(2, 5, 1, 5, 'Transfer closer to home', 'APPROVED', 'Approved - reassignment in progress', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'),
(3, 2, 5, 2, 'Career development opportunity', 'REJECTED', 'No vacancies in Chennai warehouse', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days');

-- ============================================================================
-- TEST DATA: AUTO ASSIGN LOGS
-- ============================================================================
INSERT INTO auto_assign_log (id, order_id, delivery_boy_id, pin_code, assigned_at, active_orders_at_assignment) VALUES
(1, 1, 1, '560001', NOW() - INTERVAL '3 days', 2),
(2, 2, 1, '560010', NOW() - INTERVAL '5 days', 1),
(3, 3, 2, '400001', NOW() - INTERVAL '1 day', 3),
(4, 4, 2, '400005', NOW() - INTERVAL '2 days', 2),
(5, 5, 3, '110001', NOW() - INTERVAL '4 days', 4),
(6, 6, 4, '500001', NOW(), 1);

-- ============================================================================
-- TEST DATA: SALES REPORTS
-- ============================================================================
INSERT INTO sales_report (id, vendor_id, report_type, report_date, total_revenue, total_orders, total_items_sold, avg_order_value) VALUES
(1, 1, 'DAILY', CURRENT_DATE, 13495, 2, 6, 6747.5),
(2, 1, 'DAILY', CURRENT_DATE - INTERVAL '1 day', 15000, 2, 5, 7500),
(3, 2, 'DAILY', CURRENT_DATE, 2197, 1, 3, 2197),
(4, 3, 'DAILY', CURRENT_DATE - INTERVAL '1 day', 62299, 1, 1, 62299),
(5, 4, 'DAILY', CURRENT_DATE - INTERVAL '2 days', 1999, 1, 2, 1999),
(6, 5, 'DAILY', CURRENT_DATE - INTERVAL '3 days', 3198, 1, 1, 3198);

-- ============================================================================
-- TEST DATA: SALES RECORDS (Denormalized for analytics)
-- ============================================================================
INSERT INTO sales_record (id, order_id, order_date, order_total, delivery_charge, product_id, product_name, category, item_price, quantity, vendor_id, vendor_name, customer_id, customer_name) VALUES
(1, 1, NOW() - INTERVAL '3 days', 13495, 100, 121001, 'Wireless Headphones Pro', 'Accessories', 5999, 2, 1, 'Sanjay E', 1, 'Raj Kumar'),
(2, 1, NOW() - INTERVAL '3 days', 13495, 100, 121002, 'USB-C Charging Cable', 'Accessories', 499, 3, 1, 'Sanjay E', 1, 'Raj Kumar'),
(3, 2, NOW() - INTERVAL '5 days', 2497, 100, 121003, 'Phone Stand', 'Accessories', 799, 1, 1, 'Sanjay E', 1, 'Raj Kumar'),
(4, 3, NOW() - INTERVAL '1 day', 62299, 100, 121004, 'Samsung Galaxy S21', 'Smartphones', 59999, 1, 3, 'Tech Hub', 2, 'Priya Singh'),
(5, 4, NOW() - INTERVAL '2 days', 2197, 100, 121008, 'Casual T-Shirt Men Blue', 'Men Wear', 399, 2, 2, 'Priya Retail', 2, 'Priya Singh'),
(6, 4, NOW() - INTERVAL '2 days', 2197, 100, 121009, 'Summer Dress Women', 'Women Wear', 1299, 1, 2, 'Priya Retail', 2, 'Priya Singh'),
(7, 5, NOW() - INTERVAL '4 days', 3198, 100, 121012, 'Kitchen Knife Set', 'Kitchen', 1899, 1, 5, 'Home Essentials', 3, 'Amit Patel'),
(8, 6, NOW(), 1999, 100, 121010, 'The Great Gatsby', 'Books', 299, 2, 4, 'Book World', 4, 'Sophia Chen');

-- ============================================================================
-- TEST DATA: USER ACTIVITIES
-- ============================================================================
INSERT INTO user_activities (id, user_id, action_type, metadata, created_at) VALUES
(1, 1, 'LOGIN', '{\"device\":\"mobile\",\"ip\":\"192.168.1.1\"}', NOW() - INTERVAL '1 hour'),
(2, 1, 'PRODUCT_VIEW', '{\"product_id\":121001,\"category\":\"Electronics\"}', NOW() - INTERVAL '50 minutes'),
(3, 1, 'ADD_TO_CART', '{\"product_id\":121001,\"quantity\":2}', NOW() - INTERVAL '45 minutes'),
(4, 2, 'LOGIN', '{\"device\":\"web\",\"ip\":\"192.168.1.2\"}', NOW() - INTERVAL '30 minutes'),
(5, 2, 'WISHLIST_ADD', '{\"product_id\":121009}', NOW() - INTERVAL '25 minutes'),
(6, 3, 'PRODUCT_SEARCH', '{\"query\":\"headphones\",\"results\":15}', NOW() - INTERVAL '2 hours'),
(7, 4, 'ORDER_PLACED', '{\"order_id\":6,\"amount\":1999}', NOW() - INTERVAL '10 minutes'),
(8, 1, 'LOGOUT', '{}', NOW() - INTERVAL '5 minutes');

-- ============================================================================
-- TEST DATA: POLICIES
-- ============================================================================
INSERT INTO policies (id, title, content, category, slug, last_updated, author_admin_id) VALUES
(1, 'Privacy Policy', 'We value your privacy. Your personal data is protected...', 'Legal', 'privacy-policy', NOW(), 'admin@ekart.com'),
(2, 'Terms and Conditions', 'By using EKART, you agree to these terms...', 'Legal', 'terms-and-conditions', NOW(), 'admin@ekart.com'),
(3, 'Refund Policy', 'We offer hassle-free refunds within 7 days of delivery...', 'Refund', 'refund-policy', NOW(), 'admin@ekart.com'),
(4, 'Shipping Policy', 'Free shipping on orders above 500...', 'Shipping', 'shipping-policy', NOW(), 'admin@ekart.com');

-- ============================================================================
-- TEST DATA: BANNERS
-- ============================================================================
INSERT INTO banner (id, title, image_url, link_url, active, show_on_home, show_on_customer_home, display_order) VALUES
(1, 'Summer Sale 50% Off', 'https://via.placeholder.com/1200x400?text=SummerSale', '/sale/summer', true, true, true, 1),
(2, 'New Arrivals', 'https://via.placeholder.com/1200x400?text=NewArrivals', '/new', true, true, false, 2),
(3, 'Best Sellers', 'https://via.placeholder.com/1200x400?text=BestSellers', '/bestsellers', true, true, true, 3),
(4, 'Electronics Fest', 'https://via.placeholder.com/1200x400?text=ElectronicsFest', '/electronics', true, false, false, 4);

-- ============================================================================
-- VERIFICATION QUERIES - RUN TO VERIFY DATA
-- ============================================================================
-- SELECT COUNT(*) as total_vendors FROM vendor;
-- SELECT COUNT(*) as total_products FROM product;
-- SELECT COUNT(*) as total_customers FROM customer;
-- SELECT COUNT(*) as total_orders FROM shopping_order;
-- SELECT SUM(total_price) as total_revenue FROM shopping_order;
-- SELECT AVG(total_price) as avg_order_value FROM shopping_order;
-- SELECT tracking_status, COUNT(*) FROM shopping_order GROUP BY tracking_status;

-- ============================================================================
-- ✅ DATABASE COMPLETE - 28 TABLES | 5 ENUMS | FULL TEST DATA
-- ============================================================================
