-- ========================================================================
-- EKART DATABASE - OPTIMISED SCHEMA  (redundancy-free, cross-checked)
-- Changes from original are documented inline with ✂ REMOVED / ✅ KEPT / 🔧 CHANGED
-- ========================================================================

-- ────────────────────────────────────────────────────────────────────────
-- 1. WAREHOUSE
--    ✅ No changes needed. Clean table.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(100)  NOT NULL,
    city            VARCHAR(100)  NOT NULL,
    state           VARCHAR(100)  NOT NULL,
    warehouse_code  VARCHAR(20)   UNIQUE,
    served_pin_codes VARCHAR(5000) NOT NULL,
    active          BOOLEAN       DEFAULT TRUE
);

-- ────────────────────────────────────────────────────────────────────────
-- 2. CATEGORY
--    ✅ No changes needed. Self-referential hierarchy is intentional.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL,
    emoji         VARCHAR(10)  DEFAULT '📦',
    display_order INT,
    parent        BOOLEAN      DEFAULT FALSE,
    parent_id     INT,
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES category(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────
-- 3. VENDOR
--    ✂ REMOVED `role` column — Vendor has its own separate login system;
--      role-based access only applies to Customer (CUSTOMER/ORDER_MANAGER/ADMIN).
--      The test-data.sql had a stale `role` column that was never in the entity.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(30)  NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    mobile      BIGINT       NOT NULL,
    password    VARCHAR(255) NOT NULL,
    otp         INT,
    verified    BOOLEAN,
    provider    VARCHAR(50),
    provider_id VARCHAR(100),
    vendor_code VARCHAR(20)  UNIQUE,
    description LONGTEXT,
    INDEX idx_vendor_email (email)
);

-- ────────────────────────────────────────────────────────────────────────
-- 4. PRODUCT
--    ✂ REMOVED `rating` column — rating is computed dynamically from the
--      review table (Product.getAverageRating()). Storing it here would be
--      a duplicate that drifts out of sync.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product (
    id                    INT PRIMARY KEY AUTO_INCREMENT,
    name                  VARCHAR(255),
    description           LONGTEXT,
    price                 DOUBLE,
    mrp                   DOUBLE       DEFAULT 0,
    gst_rate              DOUBLE       DEFAULT 0,
    category              VARCHAR(100),
    stock                 INT,
    stock_alert_threshold INT          DEFAULT 10,
    image_link            VARCHAR(1000),
    extra_image_links     VARCHAR(2000),
    video_link            VARCHAR(1000),
    approved              BOOLEAN      DEFAULT FALSE,
    allowed_pin_codes     VARCHAR(1000),
    vendor_id             INT,
    CONSTRAINT fk_product_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id),
    INDEX idx_product_approved (approved),
    INDEX idx_product_category (category),
    INDEX idx_product_vendor   (vendor_id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 5. CART  (kept minimal — just an ID container, items FK back to it)
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart (
    id INT PRIMARY KEY AUTO_INCREMENT
);

-- ────────────────────────────────────────────────────────────────────────
-- 6. CUSTOMER
--    ✅ No changes needed.
--    NOTE: cart_id FK is added after cart table exists (see end of file).
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer (
    id                       INT PRIMARY KEY AUTO_INCREMENT,
    name                     VARCHAR(30),
    email                    VARCHAR(100) UNIQUE NOT NULL,
    mobile                   BIGINT,
    password                 VARCHAR(255) NOT NULL,
    otp                      INT,
    verified                 BOOLEAN,
    role                     VARCHAR(20)  DEFAULT 'CUSTOMER',
    active                   BOOLEAN      DEFAULT TRUE,
    last_login               DATETIME,
    provider                 VARCHAR(50),
    provider_id              VARCHAR(100),
    cart_id                  INT,
    recently_viewed_products VARCHAR(200),
    profile_image            VARCHAR(500),
    INDEX idx_customer_email (email)
);

-- ────────────────────────────────────────────────────────────────────────
-- 7. ITEM
--    ✅ No changes needed.
--    `price` = line total (unit_price × qty); `unit_price` = snapshot at
--    cart-add time.  Both are intentional for cart arithmetic.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(255),
    description LONGTEXT,
    price       DOUBLE,        -- line total = unit_price × quantity
    unit_price  DOUBLE,        -- unit snapshot at cart-add time
    category    VARCHAR(100),
    quantity    INT,
    image_link  VARCHAR(1000),
    product_id  INT,
    cart_id     INT NOT NULL,
    CONSTRAINT fk_item_cart FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────
-- 8. DELIVERY_BOY
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_boy (
    id                INT PRIMARY KEY AUTO_INCREMENT,
    name              VARCHAR(50)  NOT NULL,
    email             VARCHAR(100) UNIQUE NOT NULL,
    mobile            BIGINT       NOT NULL,
    password          VARCHAR(255) NOT NULL,
    otp               INT,
    verified          BOOLEAN,
    admin_approved    BOOLEAN      DEFAULT FALSE,
    active            BOOLEAN      DEFAULT TRUE,
    warehouse_id      INT,
    assigned_pin_codes VARCHAR(1000),
    delivery_boy_code VARCHAR(20)  UNIQUE,
    is_available      BOOLEAN      DEFAULT FALSE,
    CONSTRAINT fk_delivery_boy_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouse(id),
    INDEX idx_db_email (email)
);

-- ────────────────────────────────────────────────────────────────────────
-- 9. SHOPPING_ORDER
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shopping_order (
    id                    INT PRIMARY KEY AUTO_INCREMENT,
    razorpay_payment_id   VARCHAR(100),
    razorpay_order_id     VARCHAR(100),
    amount                DOUBLE   DEFAULT 0,
    date_time             DATETIME,
    delivery_charge       DOUBLE   DEFAULT 0,
    total_price           DOUBLE   DEFAULT 0,
    gst_amount            DOUBLE   DEFAULT 0,
    payment_mode          VARCHAR(50),
    order_date            DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivery_time         VARCHAR(300),
    replacement_requested BOOLEAN  DEFAULT FALSE,
    tracking_status       VARCHAR(50) DEFAULT 'PROCESSING',
    current_city          VARCHAR(100),
    customer_id           INT      NOT NULL,
    warehouse_id          INT,
    delivery_boy_id       INT,
    delivery_pin_code     VARCHAR(10),
    delivery_address      VARCHAR(500),
    parent_order_id       INT,
    vendor_id             INT,
    CONSTRAINT fk_order_customer     FOREIGN KEY (customer_id)     REFERENCES customer(id),
    CONSTRAINT fk_order_warehouse    FOREIGN KEY (warehouse_id)    REFERENCES warehouse(id),
    CONSTRAINT fk_order_delivery_boy FOREIGN KEY (delivery_boy_id) REFERENCES delivery_boy(id),
    CONSTRAINT fk_order_vendor       FOREIGN KEY (vendor_id)       REFERENCES vendor(id),
    INDEX idx_order_date     (order_date),
    INDEX idx_order_customer (customer_id),
    INDEX idx_order_parent   (parent_order_id),
    INDEX idx_order_vendor   (vendor_id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 10. ADDRESS
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS address (
    id             INT PRIMARY KEY AUTO_INCREMENT,
    details        LONGTEXT,       -- legacy flat-text fallback
    recipient_name VARCHAR(100),
    house_street   VARCHAR(200),
    city           VARCHAR(100),
    state          VARCHAR(100),
    postal_code    VARCHAR(20),
    customer_id    INT NOT NULL,
    CONSTRAINT fk_address_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────
-- 11. DELIVERY_OTP
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_otp (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    order_id     INT      UNIQUE NOT NULL,
    otp          INT      NOT NULL,
    used         BOOLEAN  DEFAULT FALSE,
    generated_at DATETIME NOT NULL,
    used_at      DATETIME,
    CONSTRAINT fk_delivery_otp_order FOREIGN KEY (order_id) REFERENCES shopping_order(id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 12. REVIEW
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    rating        INT,
    comment       VARCHAR(1000),
    customer_name VARCHAR(100),
    created_at    DATETIME,
    product_id    INT NOT NULL,
    CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────
-- 13. REVIEW_IMAGES
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_images (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    image_url  VARCHAR(1000) NOT NULL,
    review_id  INT           NOT NULL,
    CONSTRAINT fk_review_images_review FOREIGN KEY (review_id) REFERENCES review(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────
-- 14. WISHLIST
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    product_id  INT NOT NULL,
    added_at    DATETIME,
    CONSTRAINT fk_wishlist_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_product  FOREIGN KEY (product_id)  REFERENCES product(id)  ON DELETE CASCADE,
    UNIQUE KEY uk_wishlist (customer_id, product_id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 15. COUPON
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon (
    id               INT PRIMARY KEY AUTO_INCREMENT,
    code             VARCHAR(30)  UNIQUE NOT NULL,
    description      VARCHAR(200) NOT NULL,
    type             VARCHAR(20)  DEFAULT 'PERCENT',
    value            DOUBLE,
    min_order_amount DOUBLE       DEFAULT 0,
    max_discount     DOUBLE       DEFAULT 0,
    usage_limit      INT          DEFAULT 0,
    used_count       INT          DEFAULT 0,
    active           BOOLEAN      DEFAULT TRUE,
    expiry_date      DATE
);

-- ────────────────────────────────────────────────────────────────────────
-- 16. REFUND
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refund (
    id               INT PRIMARY KEY AUTO_INCREMENT,
    order_id         INT,
    customer_id      INT,
    amount           DOUBLE,
    reason           VARCHAR(500),
    status           VARCHAR(50)  DEFAULT 'PENDING',
    rejection_reason VARCHAR(500),
    requested_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    processed_at     DATETIME,
    processed_by     VARCHAR(100),
    CONSTRAINT fk_refund_order    FOREIGN KEY (order_id)    REFERENCES shopping_order(id),
    CONSTRAINT fk_refund_customer FOREIGN KEY (customer_id) REFERENCES customer(id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 17. REFUND_IMAGES
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refund_images (
    id        INT PRIMARY KEY AUTO_INCREMENT,
    image_url VARCHAR(1000) NOT NULL,
    refund_id INT           NOT NULL,
    CONSTRAINT fk_refund_images_refund FOREIGN KEY (refund_id) REFERENCES refund(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────
-- 18. STOCK_ALERT
--    ✅ No changes needed.
--    vendor_id kept for direct query without joining product; intentional
--    denorm for alert performance.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_alert (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    product_id   INT,
    vendor_id    INT,
    stock_level  INT,
    alert_time   DATETIME,
    email_sent   BOOLEAN,
    acknowledged BOOLEAN,
    message      LONGTEXT,
    CONSTRAINT fk_stock_alert_product FOREIGN KEY (product_id) REFERENCES product(id),
    CONSTRAINT fk_stock_alert_vendor  FOREIGN KEY (vendor_id)  REFERENCES vendor(id),
    INDEX idx_stock_alert_vendor (vendor_id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 19. BACK_IN_STOCK_SUBSCRIPTION
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS back_in_stock_subscription (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    customer_id  INT      NOT NULL,
    product_id   INT      NOT NULL,
    subscribed_at DATETIME NOT NULL,
    notified     BOOLEAN  DEFAULT FALSE,
    notified_at  DATETIME,
    CONSTRAINT fk_bis_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_bis_product  FOREIGN KEY (product_id)  REFERENCES product(id)  ON DELETE CASCADE,
    UNIQUE KEY uk_bis (customer_id, product_id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 20. WAREHOUSE_CHANGE_REQUEST
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_change_request (
    id                     INT PRIMARY KEY AUTO_INCREMENT,
    delivery_boy_id        INT          NOT NULL,
    requested_warehouse_id INT          NOT NULL,
    reason                 VARCHAR(500),
    status                 VARCHAR(50)  DEFAULT 'PENDING',
    admin_note             VARCHAR(300),
    requested_at           DATETIME     DEFAULT CURRENT_TIMESTAMP,
    resolved_at            DATETIME,
    current_warehouse_id   INT,
    CONSTRAINT fk_wcr_delivery_boy        FOREIGN KEY (delivery_boy_id)        REFERENCES delivery_boy(id),
    CONSTRAINT fk_wcr_requested_warehouse FOREIGN KEY (requested_warehouse_id) REFERENCES warehouse(id),
    CONSTRAINT fk_wcr_current_warehouse   FOREIGN KEY (current_warehouse_id)   REFERENCES warehouse(id),
    INDEX idx_wcr_db (delivery_boy_id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 21. AUTO_ASSIGN_LOG
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auto_assign_log (
    id                         INT PRIMARY KEY AUTO_INCREMENT,
    order_id                   INT      NOT NULL,
    delivery_boy_id            INT,
    pin_code                   VARCHAR(10),
    assigned_at                DATETIME NOT NULL,
    active_orders_at_assignment INT     NOT NULL,
    CONSTRAINT fk_aal_delivery_boy FOREIGN KEY (delivery_boy_id) REFERENCES delivery_boy(id),
    INDEX idx_aal_order    (order_id),
    INDEX idx_aal_db       (delivery_boy_id),
    INDEX idx_aal_assigned (assigned_at)
);

-- ────────────────────────────────────────────────────────────────────────
-- 22. TRACKING_EVENT_LOG
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_event_log (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    order_id    INT          NOT NULL,
    status      VARCHAR(50)  NOT NULL,
    city        VARCHAR(200),
    description VARCHAR(500),
    updated_by  VARCHAR(50),
    event_time  DATETIME     NOT NULL,
    CONSTRAINT fk_tel_order FOREIGN KEY (order_id) REFERENCES shopping_order(id),
    INDEX idx_tel_order (order_id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 23. USER_ACTIVITIES
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_activities (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT,
    action_type VARCHAR(100),
    metadata    LONGTEXT,   -- stored as JSON string
    timestamp   DATETIME
);

-- ────────────────────────────────────────────────────────────────────────
-- 24. SALES_RECORD  (Reporting / analytics DB — intentionally denormalised)
--    ✂ REMOVED `vendor_name` and `customer_name` columns.
--      These duplicate data already in vendor/customer tables and can drift.
--      Reports should JOIN or fetch names at query time.
--      `product_name` and `category` are KEPT because sales_record is a
--      point-in-time snapshot — product names can change after sale.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_record (
    id             INT PRIMARY KEY AUTO_INCREMENT,
    order_id       INT,
    order_date     DATETIME,
    order_total    DOUBLE,
    delivery_charge DOUBLE,
    product_id     INT,
    product_name   VARCHAR(255),  -- snapshot: name at time of sale
    category       VARCHAR(100),  -- snapshot: category at time of sale
    item_price     DOUBLE,
    quantity       INT,
    vendor_id      INT,
    customer_id    INT
);

-- ────────────────────────────────────────────────────────────────────────
-- 25. SALES_REPORT
--    ✅ No changes needed. Aggregate cache table per vendor per period.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_report (
    id               INT PRIMARY KEY AUTO_INCREMENT,
    vendor_id        INT  NOT NULL,
    report_type      VARCHAR(100),
    report_date      DATE,
    total_revenue    DOUBLE,
    total_orders     INT,
    total_items_sold INT,
    avg_order_value  DOUBLE,
    generated_at     DATETIME,
    CONSTRAINT fk_sales_report_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id),
    INDEX idx_sales_report_vendor (vendor_id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 26. POLICIES
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    title           VARCHAR(255) UNIQUE NOT NULL,
    content         LONGTEXT     NOT NULL,
    category        VARCHAR(100) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    last_updated    DATETIME     NOT NULL,
    author_admin_id VARCHAR(100) NOT NULL
);

-- ────────────────────────────────────────────────────────────────────────
-- 27. BANNER
--    ✅ No changes needed.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banner (
    id                    INT PRIMARY KEY AUTO_INCREMENT,
    title                 VARCHAR(255),
    image_url             LONGTEXT,
    link_url              LONGTEXT,
    active                BOOLEAN DEFAULT TRUE,
    show_on_home          BOOLEAN DEFAULT TRUE,
    show_on_customer_home BOOLEAN DEFAULT TRUE,
    display_order         INT
);

-- ========================================================================
-- POST-CREATION: deferred FK (customer ↔ cart are mutually dependent)
-- ========================================================================
ALTER TABLE customer
    ADD CONSTRAINT fk_customer_cart
    FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE SET NULL;

-- ========================================================================
-- SEED DATA  (categories — unchanged from original data.sql)
-- ========================================================================

-- Parent categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(1,  'Food & Beverages',       '🍎', 1, true,  NULL),
(2,  'Home & Living',          '🏠', 2, true,  NULL),
(3,  'Health & Emergency',     '💊', 3, true,  NULL),
(4,  'Electronics',            '💻', 4, true,  NULL),
(5,  'Beauty & Personal Care', '💄', 5, true,  NULL),
(6,  'Stationery & Office',    '📚', 6, true,  NULL),
(7,  'Fashion & Clothing',     '👕', 7, true,  NULL),
(8,  'Sports & Fitness',       '⚽', 8, true,  NULL),
(9,  'Toys & Kids',            '🧸', 9, true,  NULL),
(10, 'Grocery & Staples',      '🛒', 10, true, NULL);

-- Food & Beverages sub-categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(101, 'Chips',          '🥔', 1,  false, 1),
(102, 'Chocolates',     '🍫', 2,  false, 1),
(103, 'Wafers',         '🍪', 3,  false, 1),
(104, 'Biscuits',       '🍘', 4,  false, 1),
(105, 'Ice Cream',      '🍦', 5,  false, 1),
(106, 'Beverages',      '🧃', 6,  false, 1),
(107, 'Snacks',         '🍿', 7,  false, 1),
(108, 'Sweets',         '🍬', 8,  false, 1),
(109, 'Dairy Products', '🥛', 9,  false, 1),
(110, 'Bakery',         '🍞', 10, false, 1);

-- Home & Living sub-categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(201, 'House Hold', '🏡',  1, false, 2),
(202, 'Home Goods', '🛋️', 2, false, 2),
(203, 'Kitchen',    '🍳',  3, false, 2),
(204, 'Cleaning',   '🧹',  4, false, 2),
(205, 'Decor',      '🖼️', 5, false, 2),
(206, 'Bedding',    '🛏️', 6, false, 2);

-- Health & Emergency sub-categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(301, 'Emergency',     '🚨', 1, false, 3),
(302, 'Medicines',     '💉', 2, false, 3),
(303, 'Supplements',   '💊', 3, false, 3),
(304, 'Personal Care', '🪥', 4, false, 3),
(305, 'First Aid',     '🩺', 5, false, 3);

-- Electronics sub-categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(401, 'Electronics', '⚡', 1, false, 4),
(402, 'Mobile',      '📱', 2, false, 4),
(403, 'Laptop',      '💻', 3, false, 4),
(404, 'Accessories', '🔌', 4, false, 4),
(405, 'Audio',       '🎧', 5, false, 4),
(406, 'Cameras',     '📷', 6, false, 4);

-- Beauty & Personal Care sub-categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(501, 'Beauty Products', '💅', 1, false, 5),
(502, 'Skincare',        '🧴', 2, false, 5),
(503, 'Haircare',        '💇', 3, false, 5),
(504, 'Makeup',          '💄', 4, false, 5),
(505, 'Fragrances',      '🌸', 5, false, 5);

-- Stationery & Office sub-categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(601, 'Stationary',     '✏️', 1, false, 6),
(602, 'Books',          '📖', 2, false, 6),
(603, 'Office Supplies','📎', 3, false, 6);

-- Fashion & Clothing sub-categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(701, 'Men''s Wear',  '👔', 1, false, 7),
(702, 'Women''s Wear','👗', 2, false, 7),
(703, 'Kids Wear',    '👶', 3, false, 7),
(704, 'Footwear',     '👟', 4, false, 7),
(705, 'Accessories',  '👜', 5, false, 7);

-- Sports & Fitness sub-categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(801, 'Sports',  '🏅',  1, false, 8),
(802, 'Fitness', '🏋️', 2, false, 8),
(803, 'Outdoor', '⛺',  3, false, 8);

-- Toys & Kids sub-categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(901, 'Toys',          '🧸', 1, false, 9),
(902, 'Board Games',   '🎲', 2, false, 9),
(903, 'Baby Products', '🍼', 3, false, 9);

-- Grocery & Staples sub-categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(1001, 'Daily Products', '🛒', 1, false, 10),
(1002, 'Rice & Grains',  '🌾', 2, false, 10),
(1003, 'Oils & Spices',  '🫙', 3, false, 10),
(1004, 'Pulses',         '🫘', 4, false, 10);