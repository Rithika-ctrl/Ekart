-- ============================================================================
--  EKART  ·  PostgreSQL Schema  ·  SaaS-ready
--  Derived entirely from Java entity classes and repository code.
--  28 Tables | 4 ENUMs | 40+ indexes | Category seed data
-- ============================================================================

-- ============================================================================
--  CLEANUP  (drop in reverse FK dependency order for safe re-runs)
-- ============================================================================
DROP TABLE IF EXISTS tracking_event_log         CASCADE;
DROP TABLE IF EXISTS auto_assign_log            CASCADE;
DROP TABLE IF EXISTS warehouse_change_request   CASCADE;
DROP TABLE IF EXISTS back_in_stock_subscription CASCADE;
DROP TABLE IF EXISTS stock_alert                CASCADE;
DROP TABLE IF EXISTS refund_images              CASCADE;
DROP TABLE IF EXISTS refund                     CASCADE;
DROP TABLE IF EXISTS review_images              CASCADE;
DROP TABLE IF EXISTS review                     CASCADE;
DROP TABLE IF EXISTS wishlist                   CASCADE;
DROP TABLE IF EXISTS delivery_otp               CASCADE;
DROP TABLE IF EXISTS shopping_order_items       CASCADE;
DROP TABLE IF EXISTS shopping_order             CASCADE;
DROP TABLE IF EXISTS item                       CASCADE;
DROP TABLE IF EXISTS address                    CASCADE;
DROP TABLE IF EXISTS customer                   CASCADE;
DROP TABLE IF EXISTS cart                       CASCADE;
DROP TABLE IF EXISTS delivery_boy               CASCADE;
DROP TABLE IF EXISTS warehouse                  CASCADE;
DROP TABLE IF EXISTS product                    CASCADE;
DROP TABLE IF EXISTS vendor                     CASCADE;
DROP TABLE IF EXISTS coupon                     CASCADE;
DROP TABLE IF EXISTS category                   CASCADE;
DROP TABLE IF EXISTS banner                     CASCADE;
DROP TABLE IF EXISTS policies                   CASCADE;
DROP TABLE IF EXISTS user_activities            CASCADE;
DROP TABLE IF EXISTS sales_report               CASCADE;
DROP TABLE IF EXISTS sales_record               CASCADE;

DROP SEQUENCE  IF EXISTS product_id_seq;
DROP TYPE      IF EXISTS customer_role;
DROP TYPE      IF EXISTS tracking_status;
DROP TYPE      IF EXISTS refund_status;
DROP TYPE      IF EXISTS coupon_type;
DROP TYPE      IF EXISTS wcr_status;

-- ============================================================================
--  ENUMS  (PostgreSQL native; safer than VARCHAR + CHECK for evolving domains)
-- ============================================================================
CREATE TYPE customer_role   AS ENUM ('CUSTOMER', 'ORDER_MANAGER', 'ADMIN');
CREATE TYPE tracking_status AS ENUM ('PROCESSING','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED');
CREATE TYPE refund_status   AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE coupon_type     AS ENUM ('PERCENT', 'FLAT');
CREATE TYPE wcr_status      AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ============================================================================
--  1. WAREHOUSE
--     Physical fulfilment warehouse. Each warehouse serves a set of pin codes.
--     served_pin_codes: comma-separated 6-digit codes ("600001,600002,...")
-- ============================================================================
CREATE TABLE warehouse (
    id               SERIAL       PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    city             VARCHAR(100) NOT NULL,
    state            VARCHAR(100) NOT NULL,
    warehouse_code   VARCHAR(20)  UNIQUE,                 -- auto-generated "WH-001"
    served_pin_codes VARCHAR(5000) NOT NULL DEFAULT '',
    active           BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ============================================================================
--  2. CATEGORY  (two-level self-referential hierarchy)
--     Parent → sub-category.
--     Products store sub-category name as a plain VARCHAR (not a FK) so that
--     the category hierarchy can be reorganised without breaking product rows.
--     is_parent = TRUE  → top-level (e.g. "Food & Beverages")
--     is_parent = FALSE → leaf (e.g. "Chips")
-- ============================================================================
CREATE TABLE category (
    id            SERIAL      PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    emoji         VARCHAR(10)  NOT NULL DEFAULT '📦',
    display_order INT          NOT NULL DEFAULT 0,
    is_parent     BOOLEAN      NOT NULL DEFAULT FALSE,
    parent_id     INT,
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id)
        REFERENCES category(id) ON DELETE CASCADE
);
CREATE INDEX idx_category_parent ON category(parent_id);

-- ============================================================================
--  3. VENDOR
--     Independent auth (email + AES password + OTP + OAuth2).
--     No role column — role-based access applies only to Customer.
-- ============================================================================
CREATE TABLE vendor (
    id           SERIAL       PRIMARY KEY,
    name         VARCHAR(30)  NOT NULL,
    email        VARCHAR(100) NOT NULL UNIQUE,
    mobile       BIGINT       NOT NULL,
    password     VARCHAR(255) NOT NULL,                   -- AES encrypted
    otp          INT,
    verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    provider     VARCHAR(50),                              -- "google", "github", etc.
    provider_id  VARCHAR(100),                             -- OAuth2 subject ID
    vendor_code  VARCHAR(20)  UNIQUE,                     -- auto-generated "VND-00001"
    description  TEXT                                      -- storefront bio
);
CREATE INDEX idx_vendor_email ON vendor(email);

-- ============================================================================
--  4. PRODUCT
--     Sequence starts at 121001 to match the Java @SequenceGenerator.
--     rating is NOT stored — computed dynamically: AVG(rating) FROM review.
--     allowed_pin_codes: NULL/blank = deliverable everywhere.
-- ============================================================================
CREATE SEQUENCE product_id_seq START 121001 INCREMENT 1;

CREATE TABLE product (
    id                    INT              PRIMARY KEY DEFAULT nextval('product_id_seq'),
    name                  VARCHAR(255),
    description           TEXT,
    price                 DOUBLE PRECISION NOT NULL DEFAULT 0,  -- customer-facing price
    mrp                   DOUBLE PRECISION NOT NULL DEFAULT 0,  -- strike-through original MRP
    gst_rate              DOUBLE PRECISION NOT NULL DEFAULT 0,  -- GST % (e.g. 18.0)
    category              VARCHAR(100),                          -- sub-category name
    stock                 INT              NOT NULL DEFAULT 0,
    stock_alert_threshold INT              NOT NULL DEFAULT 10,
    image_link            VARCHAR(1000),                         -- Cloudinary primary image
    extra_image_links     VARCHAR(2000),                         -- comma-separated Cloudinary URLs
    video_link            VARCHAR(1000),
    approved              BOOLEAN          NOT NULL DEFAULT FALSE,
    allowed_pin_codes     VARCHAR(1000),                         -- NULL = all pin codes allowed
    vendor_id             INT              NOT NULL,
    CONSTRAINT fk_product_vendor FOREIGN KEY (vendor_id)
        REFERENCES vendor(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_approved ON product(approved);
CREATE INDEX idx_product_category ON product(category);
CREATE INDEX idx_product_vendor   ON product(vendor_id);

-- ============================================================================
--  5. CART
--     Bare container entity; items point back to it via FK.
--     One Cart per Customer (created on registration).
-- ============================================================================
CREATE TABLE cart (
    id SERIAL PRIMARY KEY
);

-- ============================================================================
--  6. CUSTOMER
--     cart_id is UNIQUE (one-to-one with Cart).
--     recently_viewed_products: comma-separated product IDs (app caps at ~10 items).
-- ============================================================================
CREATE TABLE customer (
    id                       SERIAL        PRIMARY KEY,
    name                     VARCHAR(30),
    email                    VARCHAR(100)  NOT NULL UNIQUE,
    mobile                   BIGINT,
    password                 VARCHAR(255)  NOT NULL,             -- AES encrypted
    otp                      INT,
    verified                 BOOLEAN       NOT NULL DEFAULT FALSE,
    role                     customer_role NOT NULL DEFAULT 'CUSTOMER',
    active                   BOOLEAN       NOT NULL DEFAULT TRUE,
    last_login               TIMESTAMP,
    provider                 VARCHAR(50),
    provider_id              VARCHAR(100),
    cart_id                  INT           UNIQUE,               -- 1:1
    recently_viewed_products VARCHAR(200),                       -- comma-separated IDs
    profile_image            VARCHAR(500),                       -- Cloudinary URL
    CONSTRAINT fk_customer_cart FOREIGN KEY (cart_id)
        REFERENCES cart(id) ON DELETE SET NULL
);
CREATE INDEX idx_customer_email ON customer(email);

-- ============================================================================
--  7. ADDRESS
--     Structured delivery address. `details` kept for legacy flat-text entries.
-- ============================================================================
CREATE TABLE address (
    id             SERIAL       PRIMARY KEY,
    details        TEXT,                                  -- legacy flat-text fallback
    recipient_name VARCHAR(100),
    house_street   VARCHAR(200),
    city           VARCHAR(100),
    state          VARCHAR(100),
    postal_code    VARCHAR(20),
    customer_id    INT          NOT NULL,
    CONSTRAINT fk_address_customer FOREIGN KEY (customer_id)
        REFERENCES customer(id) ON DELETE CASCADE
);
CREATE INDEX idx_address_customer ON address(customer_id);

-- ============================================================================
--  8. ITEM  (cart line item — also reused as order line item via join table)
--     unit_price: frozen at cart-add time (never changes when qty is edited).
--     price     : line total = unit_price × quantity.
--     product_id: soft reference — no FK because product may be deleted later.
--     cart_id   : NULL once the item is moved into an order.
-- ============================================================================
CREATE TABLE item (
    id          SERIAL           PRIMARY KEY,
    name        VARCHAR(255),
    description TEXT,
    unit_price  DOUBLE PRECISION NOT NULL DEFAULT 0,
    price       DOUBLE PRECISION NOT NULL DEFAULT 0,   -- line total
    category    VARCHAR(100),
    quantity    INT              NOT NULL DEFAULT 1,
    image_link  VARCHAR(1000),
    product_id  INT,                                   -- soft reference
    cart_id     INT,
    CONSTRAINT fk_item_cart FOREIGN KEY (cart_id)
        REFERENCES cart(id) ON DELETE CASCADE
);
CREATE INDEX idx_item_cart ON item(cart_id);

-- ============================================================================
--  9. DELIVERY_BOY
--     Self-registration → OTP verify → admin approval → active.
--     assigned_pin_codes: comma-separated codes this boy covers.
-- ============================================================================
CREATE TABLE delivery_boy (
    id                 SERIAL       PRIMARY KEY,
    name               VARCHAR(50)  NOT NULL,
    email              VARCHAR(100) NOT NULL UNIQUE,
    mobile             BIGINT       NOT NULL,
    password           VARCHAR(255) NOT NULL,             -- AES encrypted
    otp                INT,
    verified           BOOLEAN      NOT NULL DEFAULT FALSE,
    admin_approved     BOOLEAN      NOT NULL DEFAULT FALSE,
    active             BOOLEAN      NOT NULL DEFAULT TRUE,
    warehouse_id       INT,
    assigned_pin_codes VARCHAR(1000),
    delivery_boy_code  VARCHAR(20)  UNIQUE,               -- auto-generated "DB-00001"
    is_available       BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_db_warehouse FOREIGN KEY (warehouse_id)
        REFERENCES warehouse(id) ON DELETE SET NULL
);
CREATE INDEX idx_db_email     ON delivery_boy(email);
CREATE INDEX idx_db_warehouse ON delivery_boy(warehouse_id);

-- ============================================================================
-- 10. SHOPPING_ORDER
--     One order = one vendor's items in a customer's purchase.
--     Multi-vendor cart splits into N sub-orders sharing parent_order_id.
--     delivery_address: VARCHAR snapshot of address at checkout (no FK).
--     gst_amount      : captured at order time (rates may change later).
-- ============================================================================
CREATE TABLE shopping_order (
    id                    SERIAL           PRIMARY KEY,
    razorpay_payment_id   VARCHAR(100),
    razorpay_order_id     VARCHAR(100),
    amount                DOUBLE PRECISION NOT NULL DEFAULT 0,
    date_time             TIMESTAMP,                            -- payment confirmation time
    delivery_charge       DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_price           DOUBLE PRECISION NOT NULL DEFAULT 0,
    gst_amount            DOUBLE PRECISION NOT NULL DEFAULT 0,  -- GST snapshot
    payment_mode          VARCHAR(50),
    order_date            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivery_time         VARCHAR(300),
    replacement_requested BOOLEAN          NOT NULL DEFAULT FALSE,
    tracking_status       tracking_status  NOT NULL DEFAULT 'PROCESSING',
    current_city          VARCHAR(100),
    delivery_pin_code     VARCHAR(10),
    delivery_address      VARCHAR(500),                         -- snapshot at checkout
    parent_order_id       INT,                                  -- links sub-orders
    customer_id           INT              NOT NULL,
    warehouse_id          INT,
    delivery_boy_id       INT,
    vendor_id             INT,
    CONSTRAINT fk_order_customer     FOREIGN KEY (customer_id)
        REFERENCES customer(id),
    CONSTRAINT fk_order_warehouse    FOREIGN KEY (warehouse_id)
        REFERENCES warehouse(id) ON DELETE SET NULL,
    CONSTRAINT fk_order_delivery_boy FOREIGN KEY (delivery_boy_id)
        REFERENCES delivery_boy(id) ON DELETE SET NULL,
    CONSTRAINT fk_order_vendor       FOREIGN KEY (vendor_id)
        REFERENCES vendor(id) ON DELETE SET NULL
);
CREATE INDEX idx_order_date         ON shopping_order(order_date);
CREATE INDEX idx_order_customer     ON shopping_order(customer_id);
CREATE INDEX idx_order_parent       ON shopping_order(parent_order_id);
CREATE INDEX idx_order_vendor       ON shopping_order(vendor_id);
CREATE INDEX idx_order_tracking     ON shopping_order(tracking_status);
CREATE INDEX idx_order_delivery_boy ON shopping_order(delivery_boy_id);

-- ============================================================================
-- 11. SHOPPING_ORDER_ITEMS  (join table: Order ↔ Item)
--     Explicit version of the join table Hibernate generates for
--     @OneToMany(cascade=ALL) without a mappedBy (unidirectional).
-- ============================================================================
CREATE TABLE shopping_order_items (
    order_id INT NOT NULL,
    items_id INT NOT NULL UNIQUE,                             -- each item belongs to one order
    PRIMARY KEY (order_id, items_id),
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id)
        REFERENCES shopping_order(id) ON DELETE CASCADE,
    CONSTRAINT fk_oi_item  FOREIGN KEY (items_id)
        REFERENCES item(id) ON DELETE CASCADE
);

-- ============================================================================
-- 12. DELIVERY_OTP
--     One OTP per order; delivery boy submits it at customer's door.
-- ============================================================================
CREATE TABLE delivery_otp (
    id           SERIAL    PRIMARY KEY,
    order_id     INT       NOT NULL UNIQUE,
    otp          INT       NOT NULL,
    used         BOOLEAN   NOT NULL DEFAULT FALSE,
    generated_at TIMESTAMP NOT NULL,
    used_at      TIMESTAMP,
    CONSTRAINT fk_delivery_otp_order FOREIGN KEY (order_id)
        REFERENCES shopping_order(id) ON DELETE CASCADE
);

-- ============================================================================
-- 13. TRACKING_EVENT_LOG
--     One row per real status change; full audit timeline per order.
-- ============================================================================
CREATE TABLE tracking_event_log (
    id          SERIAL          PRIMARY KEY,
    order_id    INT             NOT NULL,
    status      tracking_status NOT NULL,
    city        VARCHAR(200),
    description VARCHAR(500),
    updated_by  VARCHAR(50),
    event_time  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tel_order FOREIGN KEY (order_id)
        REFERENCES shopping_order(id) ON DELETE CASCADE
);
CREATE INDEX idx_tel_order ON tracking_event_log(order_id);
CREATE INDEX idx_tel_time  ON tracking_event_log(event_time);

-- ============================================================================
-- 14. REFUND
--     processed_by: admin name/email as string (admin has no DB entity row).
-- ============================================================================
CREATE TABLE refund (
    id               SERIAL        PRIMARY KEY,
    order_id         INT           NOT NULL,
    customer_id      INT           NOT NULL,
    amount           DOUBLE PRECISION NOT NULL DEFAULT 0,
    reason           VARCHAR(500),
    status           refund_status NOT NULL DEFAULT 'PENDING',
    rejection_reason VARCHAR(500),
    requested_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at     TIMESTAMP,
    processed_by     VARCHAR(100),
    CONSTRAINT fk_refund_order    FOREIGN KEY (order_id)    REFERENCES shopping_order(id),
    CONSTRAINT fk_refund_customer FOREIGN KEY (customer_id) REFERENCES customer(id)
);
CREATE INDEX idx_refund_order    ON refund(order_id);
CREATE INDEX idx_refund_customer ON refund(customer_id);
CREATE INDEX idx_refund_status   ON refund(status);

-- ============================================================================
-- 15. REFUND_IMAGES
--     Evidence images uploaded by customer (max 5 enforced in app layer).
-- ============================================================================
CREATE TABLE refund_images (
    id        SERIAL       PRIMARY KEY,
    image_url VARCHAR(1000) NOT NULL,
    refund_id INT           NOT NULL,
    CONSTRAINT fk_refund_images_refund FOREIGN KEY (refund_id)
        REFERENCES refund(id) ON DELETE CASCADE
);
CREATE INDEX idx_refund_img_refund ON refund_images(refund_id);

-- ============================================================================
-- 16. REVIEW
--     customer_name is a snapshot string (not a FK — account may be deleted).
--     Product average rating is computed: SELECT AVG(rating) FROM review WHERE product_id=?
-- ============================================================================
CREATE TABLE review (
    id            SERIAL   PRIMARY KEY,
    rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       VARCHAR(1000),
    customer_name VARCHAR(100),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    product_id    INT       NOT NULL,
    CONSTRAINT fk_review_product FOREIGN KEY (product_id)
        REFERENCES product(id) ON DELETE CASCADE
);
CREATE INDEX idx_review_product ON review(product_id);

-- ============================================================================
-- 17. REVIEW_IMAGES
--     Showcase images per review (max 5 enforced in app layer).
-- ============================================================================
CREATE TABLE review_images (
    id        SERIAL       PRIMARY KEY,
    image_url VARCHAR(1000) NOT NULL,
    review_id INT           NOT NULL,
    CONSTRAINT fk_review_images_review FOREIGN KEY (review_id)
        REFERENCES review(id) ON DELETE CASCADE
);
CREATE INDEX idx_review_img_review ON review_images(review_id);

-- ============================================================================
-- 18. WISHLIST
-- ============================================================================
CREATE TABLE wishlist (
    id          SERIAL    PRIMARY KEY,
    customer_id INT       NOT NULL,
    product_id  INT       NOT NULL,
    added_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlist_customer FOREIGN KEY (customer_id)
        REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_product  FOREIGN KEY (product_id)
        REFERENCES product(id)  ON DELETE CASCADE,
    CONSTRAINT uk_wishlist UNIQUE (customer_id, product_id)
);
CREATE INDEX idx_wishlist_customer ON wishlist(customer_id);

-- ============================================================================
-- 19. COUPON
--     usage_limit = 0 → unlimited. max_discount = 0 → no cap.
-- ============================================================================
CREATE TABLE coupon (
    id               SERIAL           PRIMARY KEY,
    code             VARCHAR(30)      NOT NULL UNIQUE,
    description      VARCHAR(200)     NOT NULL,
    type             coupon_type      NOT NULL DEFAULT 'PERCENT',
    value            DOUBLE PRECISION NOT NULL DEFAULT 0,
    min_order_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_discount     DOUBLE PRECISION NOT NULL DEFAULT 0,
    usage_limit      INT              NOT NULL DEFAULT 0,
    used_count       INT              NOT NULL DEFAULT 0,
    active           BOOLEAN          NOT NULL DEFAULT TRUE,
    expiry_date      DATE
);

-- ============================================================================
-- 20. STOCK_ALERT
--     vendor_id is denormalised here intentionally (avoids JOIN on hot alert reads).
-- ============================================================================
CREATE TABLE stock_alert (
    id           SERIAL    PRIMARY KEY,
    product_id   INT       NOT NULL,
    vendor_id    INT       NOT NULL,
    stock_level  INT       NOT NULL,
    alert_time   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    email_sent   BOOLEAN   NOT NULL DEFAULT FALSE,
    acknowledged BOOLEAN   NOT NULL DEFAULT FALSE,
    message      TEXT,
    CONSTRAINT fk_stock_alert_product FOREIGN KEY (product_id)
        REFERENCES product(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_alert_vendor  FOREIGN KEY (vendor_id)
        REFERENCES vendor(id)  ON DELETE CASCADE
);
CREATE INDEX idx_stock_alert_vendor  ON stock_alert(vendor_id);
CREATE INDEX idx_stock_alert_product ON stock_alert(product_id);

-- ============================================================================
-- 21. BACK_IN_STOCK_SUBSCRIPTION
--     "Notify Me" feature. notified=true prevents duplicate emails.
--     Unique constraint prevents duplicate subscriptions per customer+product.
-- ============================================================================
CREATE TABLE back_in_stock_subscription (
    id            SERIAL    PRIMARY KEY,
    customer_id   INT       NOT NULL,
    product_id    INT       NOT NULL,
    subscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notified      BOOLEAN   NOT NULL DEFAULT FALSE,
    notified_at   TIMESTAMP,
    CONSTRAINT fk_bis_customer FOREIGN KEY (customer_id)
        REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_bis_product  FOREIGN KEY (product_id)
        REFERENCES product(id)  ON DELETE CASCADE,
    CONSTRAINT uk_bis UNIQUE (customer_id, product_id)
);
CREATE INDEX idx_bis_product ON back_in_stock_subscription(product_id, notified);

-- ============================================================================
-- 22. WAREHOUSE_CHANGE_REQUEST
--     Delivery boy applies to move to a different warehouse; admin approves/rejects.
-- ============================================================================
CREATE TABLE warehouse_change_request (
    id                     SERIAL     PRIMARY KEY,
    delivery_boy_id        INT        NOT NULL,
    requested_warehouse_id INT        NOT NULL,
    current_warehouse_id   INT,
    reason                 VARCHAR(500),
    status                 wcr_status NOT NULL DEFAULT 'PENDING',
    admin_note             VARCHAR(300),
    requested_at           TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at            TIMESTAMP,
    CONSTRAINT fk_wcr_delivery_boy        FOREIGN KEY (delivery_boy_id)
        REFERENCES delivery_boy(id) ON DELETE CASCADE,
    CONSTRAINT fk_wcr_requested_warehouse FOREIGN KEY (requested_warehouse_id)
        REFERENCES warehouse(id),
    CONSTRAINT fk_wcr_current_warehouse   FOREIGN KEY (current_warehouse_id)
        REFERENCES warehouse(id)
);
CREATE INDEX idx_wcr_db     ON warehouse_change_request(delivery_boy_id);
CREATE INDEX idx_wcr_status ON warehouse_change_request(status);

-- ============================================================================
-- 23. AUTO_ASSIGN_LOG
--     Persistent audit trail: every automatic order → delivery_boy assignment.
-- ============================================================================
CREATE TABLE auto_assign_log (
    id                          SERIAL    PRIMARY KEY,
    order_id                    INT       NOT NULL,       -- soft ref (no FK — order may be deleted)
    delivery_boy_id             INT,
    pin_code                    VARCHAR(10),
    assigned_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active_orders_at_assignment INT       NOT NULL DEFAULT 0,
    CONSTRAINT fk_aal_delivery_boy FOREIGN KEY (delivery_boy_id)
        REFERENCES delivery_boy(id) ON DELETE SET NULL
);
CREATE INDEX idx_aal_order    ON auto_assign_log(order_id);
CREATE INDEX idx_aal_db       ON auto_assign_log(delivery_boy_id);
CREATE INDEX idx_aal_assigned ON auto_assign_log(assigned_at);

-- ============================================================================
-- 24. USER_ACTIVITIES  (behavioural event log)
--     metadata: TEXT (Java String field; use TEXT not JSONB to avoid custom type mapping).
--     user_id : soft reference (no FK — user may be deleted; log must survive).
-- ============================================================================
CREATE TABLE user_activities (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT,
    action_type VARCHAR(100),
        metadata    TEXT,                                    -- plain JSON string (Java String mapping)
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ua_user       ON user_activities(user_id);
CREATE INDEX idx_ua_action     ON user_activities(action_type);
CREATE INDEX idx_ua_created_at ON user_activities(created_at);

-- ============================================================================
-- 25. POLICIES  (legal/CMS pages — Privacy Policy, T&C, Refund Policy, etc.)
--     slug  : URL-friendly key used as route parameter (/policies/{slug}).
--     author_admin_id: admin email stored as plain string (no entity for admin).
-- ============================================================================
CREATE TABLE policies (
    id              BIGSERIAL    PRIMARY KEY,
    title           VARCHAR(255) NOT NULL UNIQUE,
    content         TEXT         NOT NULL,
    category        VARCHAR(100) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    last_updated    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    author_admin_id VARCHAR(100) NOT NULL
);
CREATE INDEX idx_policy_slug ON policies(slug);

-- ============================================================================
-- 26. BANNER
--     show_on_home          → pre-login landing page
--     show_on_customer_home → post-login customer home page
-- ============================================================================
CREATE TABLE banner (
    id                    SERIAL       PRIMARY KEY,
    title                 VARCHAR(255),
    image_url             TEXT,
    link_url              TEXT,
    active                BOOLEAN      NOT NULL DEFAULT TRUE,
    show_on_home          BOOLEAN      NOT NULL DEFAULT TRUE,
    show_on_customer_home BOOLEAN      NOT NULL DEFAULT TRUE,
    display_order         INT          NOT NULL DEFAULT 0
);

-- ============================================================================
-- 27. SALES_REPORT  (aggregate cache per vendor per period)
--     Populated by ReportingService; queried for vendor dashboard charts.
-- ============================================================================
CREATE TABLE sales_report (
    id               SERIAL           PRIMARY KEY,
    vendor_id        INT              NOT NULL,
    report_type      VARCHAR(100),                         -- 'DAILY', 'WEEKLY', 'MONTHLY'
    report_date      DATE,
    total_revenue    DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_orders     INT              NOT NULL DEFAULT 0,
    total_items_sold INT              NOT NULL DEFAULT 0,
    avg_order_value  DOUBLE PRECISION NOT NULL DEFAULT 0,
    generated_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_report_vendor FOREIGN KEY (vendor_id)
        REFERENCES vendor(id) ON DELETE CASCADE
);
CREATE INDEX idx_sales_report_vendor ON sales_report(vendor_id);
CREATE INDEX idx_sales_report_date   ON sales_report(report_date);

-- ============================================================================
-- 28. SALES_RECORD  (analytics / reporting — intentionally denormalised)
--     One row = one line item sold in one order.
--     vendor_name, customer_name, product_name, category are point-in-time
--     snapshots (values may change after the sale).
--     No FKs to main tables — this mirrors the decoupled reporting DB approach
--     in application.properties (ekart_reporting_db).
--     In production: move this to a separate PostgreSQL database/schema.
-- ============================================================================
CREATE TABLE sales_record (
    id              SERIAL           PRIMARY KEY,
    order_id        INT              NOT NULL,             -- soft ref
    order_date      TIMESTAMP        NOT NULL,
    order_total     DOUBLE PRECISION NOT NULL DEFAULT 0,
    delivery_charge DOUBLE PRECISION NOT NULL DEFAULT 0,
    product_id      INT,                                   -- soft ref
    product_name    VARCHAR(255),                          -- snapshot
    category        VARCHAR(100),                          -- snapshot
    item_price      DOUBLE PRECISION NOT NULL DEFAULT 0,
    quantity        INT              NOT NULL DEFAULT 1,
    vendor_id       INT              NOT NULL,              -- soft ref
    vendor_name     VARCHAR(100),                          -- snapshot
    customer_id     INT              NOT NULL,              -- soft ref
    customer_name   VARCHAR(100)                           -- snapshot
);
CREATE INDEX idx_sr_vendor   ON sales_record(vendor_id);
CREATE INDEX idx_sr_order    ON sales_record(order_id);
CREATE INDEX idx_sr_date     ON sales_record(order_date);
CREATE INDEX idx_sr_product  ON sales_record(product_id);
CREATE INDEX idx_sr_customer ON sales_record(customer_id);

-- ============================================================================
--  SEQUENCE OVERRIDE
--  Force category_id_seq above highest seeded ID (1004) so future INSERTs
--  without explicit IDs do not collide with seed data.
-- ============================================================================
SELECT setval('category_id_seq', 2000, true);

-- ============================================================================
--  SEED DATA — CATEGORIES  (63 rows: 10 parents + 53 sub-categories)
-- ============================================================================

-- Parent categories
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
( 1, 'Food & Beverages',       '🍎',  1, TRUE, NULL),
( 2, 'Home & Living',          '🏠',  2, TRUE, NULL),
( 3, 'Health & Emergency',     '💊',  3, TRUE, NULL),
( 4, 'Electronics',            '💻',  4, TRUE, NULL),
( 5, 'Beauty & Personal Care', '💄',  5, TRUE, NULL),
( 6, 'Stationery & Office',    '📚',  6, TRUE, NULL),
( 7, 'Fashion & Clothing',     '👕',  7, TRUE, NULL),
( 8, 'Sports & Fitness',       '⚽',  8, TRUE, NULL),
( 9, 'Toys & Kids',            '🧸',  9, TRUE, NULL),
(10, 'Grocery & Staples',      '🛒', 10, TRUE, NULL)
ON CONFLICT (id) DO NOTHING;

-- Food & Beverages sub-categories (parent_id = 1)
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(101, 'Chips',          '🥔',  1, FALSE, 1),
(102, 'Chocolates',     '🍫',  2, FALSE, 1),
(103, 'Wafers',         '🍪',  3, FALSE, 1),
(104, 'Biscuits',       '🍘',  4, FALSE, 1),
(105, 'Ice Cream',      '🍦',  5, FALSE, 1),
(106, 'Beverages',      '🧃',  6, FALSE, 1),
(107, 'Snacks',         '🍿',  7, FALSE, 1),
(108, 'Sweets',         '🍬',  8, FALSE, 1),
(109, 'Dairy Products', '🥛',  9, FALSE, 1),
(110, 'Bakery',         '🍞', 10, FALSE, 1)
ON CONFLICT (id) DO NOTHING;

-- Home & Living sub-categories (parent_id = 2)
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(201, 'House Hold', '🏡',  1, FALSE, 2),
(202, 'Home Goods', '🛋️', 2, FALSE, 2),
(203, 'Kitchen',    '🍳',  3, FALSE, 2),
(204, 'Cleaning',   '🧹',  4, FALSE, 2),
(205, 'Decor',      '🖼️', 5, FALSE, 2),
(206, 'Bedding',    '🛏️', 6, FALSE, 2)
ON CONFLICT (id) DO NOTHING;

-- Health & Emergency sub-categories (parent_id = 3)
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(301, 'Emergency',    '🚨', 1, FALSE, 3),
(302, 'Medicines',    '💉', 2, FALSE, 3),
(303, 'Supplements',  '💊', 3, FALSE, 3),
(304, 'Personal Care','🪥', 4, FALSE, 3),
(305, 'First Aid',    '🩺', 5, FALSE, 3)
ON CONFLICT (id) DO NOTHING;

-- Electronics sub-categories (parent_id = 4)
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(401, 'Electronics', '⚡', 1, FALSE, 4),
(402, 'Mobile',      '📱', 2, FALSE, 4),
(403, 'Laptop',      '💻', 3, FALSE, 4),
(404, 'Accessories', '🔌', 4, FALSE, 4),
(405, 'Audio',       '🎧', 5, FALSE, 4),
(406, 'Cameras',     '📷', 6, FALSE, 4)
ON CONFLICT (id) DO NOTHING;

-- Beauty & Personal Care sub-categories (parent_id = 5)
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(501, 'Beauty Products', '💅', 1, FALSE, 5),
(502, 'Skincare',        '🧴', 2, FALSE, 5),
(503, 'Haircare',        '💇', 3, FALSE, 5),
(504, 'Makeup',          '💄', 4, FALSE, 5),
(505, 'Fragrances',      '🌸', 5, FALSE, 5)
ON CONFLICT (id) DO NOTHING;

-- Stationery & Office sub-categories (parent_id = 6)
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(601, 'Stationary',      '✏️', 1, FALSE, 6),
(602, 'Books',           '📖', 2, FALSE, 6),
(603, 'Office Supplies', '📎', 3, FALSE, 6)
ON CONFLICT (id) DO NOTHING;

-- Fashion & Clothing sub-categories (parent_id = 7)
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(701, 'Men''s Wear',  '👔', 1, FALSE, 7),
(702, 'Women''s Wear','👗', 2, FALSE, 7),
(703, 'Kids Wear',    '👶', 3, FALSE, 7),
(704, 'Footwear',     '👟', 4, FALSE, 7),
(705, 'Accessories',  '👜', 5, FALSE, 7)
ON CONFLICT (id) DO NOTHING;

-- Sports & Fitness sub-categories (parent_id = 8)
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(801, 'Sports',  '🏅',  1, FALSE, 8),
(802, 'Fitness', '🏋️', 2, FALSE, 8),
(803, 'Outdoor', '⛺',  3, FALSE, 8)
ON CONFLICT (id) DO NOTHING;

-- Toys & Kids sub-categories (parent_id = 9)
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(901, 'Toys',          '🧸', 1, FALSE, 9),
(902, 'Board Games',   '🎲', 2, FALSE, 9),
(903, 'Baby Products', '🍼', 3, FALSE, 9)
ON CONFLICT (id) DO NOTHING;

-- Grocery & Staples sub-categories (parent_id = 10)
INSERT INTO category (id, name, emoji, display_order, is_parent, parent_id) VALUES
(1001, 'Daily Products', '🛒', 1, FALSE, 10),
(1002, 'Rice & Grains',  '🌾', 2, FALSE, 10),
(1003, 'Oils & Spices',  '🫙', 3, FALSE, 10),
(1004, 'Pulses',         '🫘', 4, FALSE, 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
--  END  ·  28 tables | 4 enums | 40+ indexes | 63 category rows
-- ============================================================================
