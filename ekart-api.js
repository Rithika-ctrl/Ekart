// ========================================================================
// EKART DATABASE API - Node.js/Express Backend
// Complete implementation matching all 27 database tables
// File: ekart-api.js
// ========================================================================

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER || 'w4CBYUqPKd3K3rd.root',
    password: process.env.DB_PASSWORD || 'zJDkOwlhrkjaC9pn',
    database: process.env.DB_NAME || 'ekart',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false }
});

// ========================================================================
// 1. WAREHOUSE ROUTES
// ========================================================================
app.get('/api/warehouses', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM warehouse');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/warehouses/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM warehouse WHERE id = ?', [req.params.id]);
        connection.release();
        res.json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/warehouses', async (req, res) => {
    try {
        const { name, city, state, warehouse_code, served_pin_codes, active } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO warehouse (name, city, state, warehouse_code, served_pin_codes, active) VALUES (?, ?, ?, ?, ?, ?)',
            [name, city, state, warehouse_code, served_pin_codes, active !== false]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 2. CATEGORY ROUTES
// ========================================================================
app.get('/api/categories', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM category ORDER BY display_order ASC');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/categories/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM category WHERE id = ? OR parent_id = ?', [req.params.id, req.params.id]);
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name, emoji, display_order, parent, parent_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO category (name, emoji, display_order, parent, parent_id) VALUES (?, ?, ?, ?, ?)',
            [name, emoji || '📦', display_order, parent || false, parent_id || null]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 3. VENDOR ROUTES
// ========================================================================
app.get('/api/vendors', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM vendor');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/vendors/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM vendor WHERE id = ?', [req.params.id]);
        connection.release();
        res.json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vendors', async (req, res) => {
    try {
        const { name, email, mobile, password, otp, verified, provider, provider_id, vendor_code, description } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO vendor (name, email, mobile, password, otp, verified, provider, provider_id, vendor_code, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, mobile, password, otp, verified, provider, provider_id, vendor_code, description]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 4. PRODUCT ROUTES
// ========================================================================
app.get('/api/products', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM product WHERE approved = 1');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM product WHERE id = ?', [req.params.id]);
        connection.release();
        res.json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, description, price, mrp, gst_rate, category, stock, stock_alert_threshold, image_link, extra_image_links, video_link, approved, allowed_pin_codes, vendor_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO product (name, description, price, mrp, gst_rate, category, stock, stock_alert_threshold, image_link, extra_image_links, video_link, approved, allowed_pin_codes, vendor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, mrp || 0, gst_rate || 0, category, stock, stock_alert_threshold || 10, image_link, extra_image_links, video_link, approved || false, allowed_pin_codes, vendor_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 5. CART ROUTES
// ========================================================================
app.get('/api/cart/:cartId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM item WHERE cart_id = ?', [req.params.cartId]);
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cart', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query('INSERT INTO cart () VALUES ()');
        connection.release();
        res.json({ cart_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 6. ITEM ROUTES
// ========================================================================
app.post('/api/cart/add-item', async (req, res) => {
    try {
        const { cart_id, product_id, name, description, price, unit_price, category, quantity, image_link } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO item (cart_id, product_id, name, description, price, unit_price, category, quantity, image_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [cart_id, product_id, name, description, price, unit_price, category, quantity, image_link]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/cart/item/:itemId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM item WHERE id = ?', [req.params.itemId]);
        connection.release();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 7. CUSTOMER ROUTES
// ========================================================================
app.get('/api/customers', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM customer');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/customers/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM customer WHERE id = ?', [req.params.id]);
        connection.release();
        res.json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers', async (req, res) => {
    try {
        const { name, email, mobile, password, otp, verified, role, active, provider, provider_id, recently_viewed_products, profile_image, cart_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO customer (name, email, mobile, password, otp, verified, role, active, provider, provider_id, recently_viewed_products, profile_image, cart_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, mobile, password, otp, verified, role || 'CUSTOMER', active !== false, provider, provider_id, recently_viewed_products, profile_image, cart_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/customers/:id', async (req, res) => {
    try {
        const { name, mobile, verified, last_login, profile_image, recently_viewed_products } = req.body;
        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE customer SET name = ?, mobile = ?, verified = ?, last_login = ?, profile_image = ?, recently_viewed_products = ? WHERE id = ?',
            [name, mobile, verified, last_login, profile_image, recently_viewed_products, req.params.id]
        );
        connection.release();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 8. ADDRESS ROUTES
// ========================================================================
app.get('/api/addresses/customer/:customerId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM address WHERE customer_id = ?', [req.params.customerId]);
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/addresses', async (req, res) => {
    try {
        const { details, recipient_name, house_street, city, state, postal_code, customer_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO address (details, recipient_name, house_street, city, state, postal_code, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [details, recipient_name, house_street, city, state, postal_code, customer_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 9. DELIVERY BOY ROUTES
// ========================================================================
app.get('/api/delivery-boys', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM delivery_boy WHERE active = 1');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/delivery-boys/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM delivery_boy WHERE id = ?', [req.params.id]);
        connection.release();
        res.json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/delivery-boys', async (req, res) => {
    try {
        const { name, email, mobile, password, otp, verified, admin_approved, active, warehouse_id, assigned_pin_codes, delivery_boy_code, is_available } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO delivery_boy (name, email, mobile, password, otp, verified, admin_approved, active, warehouse_id, assigned_pin_codes, delivery_boy_code, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, mobile, password, otp, verified, admin_approved || false, active !== false, warehouse_id, assigned_pin_codes, delivery_boy_code, is_available || false]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 10. SHOPPING ORDER ROUTES
// ========================================================================
app.get('/api/orders', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM shopping_order ORDER BY order_date DESC');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/customer/:customerId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM shopping_order WHERE customer_id = ? ORDER BY order_date DESC', [req.params.customerId]);
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM shopping_order WHERE id = ?', [req.params.id]);
        connection.release();
        res.json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, amount, delivery_charge, total_price, gst_amount, payment_mode, tracking_status, customer_id, warehouse_id, delivery_boy_id, delivery_pin_code, delivery_address, parent_order_id, vendor_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO shopping_order (razorpay_payment_id, razorpay_order_id, amount, delivery_charge, total_price, gst_amount, payment_mode, tracking_status, customer_id, warehouse_id, delivery_boy_id, delivery_pin_code, delivery_address, parent_order_id, vendor_id, order_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [razorpay_payment_id, razorpay_order_id, amount || 0, delivery_charge || 0, total_price || 0, gst_amount || 0, payment_mode, tracking_status || 'PROCESSING', customer_id, warehouse_id, delivery_boy_id, delivery_pin_code, delivery_address, parent_order_id, vendor_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        const { tracking_status, current_city, delivery_time, replacement_requested } = req.body;
        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE shopping_order SET tracking_status = ?, current_city = ?, delivery_time = ?, replacement_requested = ? WHERE id = ?',
            [tracking_status, current_city, delivery_time, replacement_requested, req.params.id]
        );
        connection.release();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 11. DELIVERY OTP ROUTES
// ========================================================================
app.post('/api/delivery-otp', async (req, res) => {
    try {
        const { order_id, otp } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO delivery_otp (order_id, otp, generated_at) VALUES (?, ?, NOW())',
            [order_id, otp]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/delivery-otp/:orderId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM delivery_otp WHERE order_id = ?', [req.params.orderId]);
        connection.release();
        res.json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/delivery-otp/:orderId/verify', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE delivery_otp SET used = 1, used_at = NOW() WHERE order_id = ?',
            [req.params.orderId]
        );
        connection.release();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 12. REVIEW ROUTES
// ========================================================================
app.get('/api/reviews/product/:productId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM review WHERE product_id = ?', [req.params.productId]);
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { rating, comment, customer_name, product_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO review (rating, comment, customer_name, product_id, created_at) VALUES (?, ?, ?, ?, NOW())',
            [rating, comment, customer_name, product_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 13. REVIEW IMAGES ROUTES
// ========================================================================
app.post('/api/review-images', async (req, res) => {
    try {
        const { image_url, review_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO review_images (image_url, review_id) VALUES (?, ?)',
            [image_url, review_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 14. WISHLIST ROUTES
// ========================================================================
app.get('/api/wishlist/:customerId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT p.* FROM wishlist w JOIN product p ON w.product_id = p.id WHERE w.customer_id = ?',
            [req.params.customerId]
        );
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/wishlist', async (req, res) => {
    try {
        const { customer_id, product_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO wishlist (customer_id, product_id, added_at) VALUES (?, ?, NOW())',
            [customer_id, product_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/wishlist/:customerId/:productId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM wishlist WHERE customer_id = ? AND product_id = ?', [req.params.customerId, req.params.productId]);
        connection.release();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 15. COUPON ROUTES
// ========================================================================
app.get('/api/coupons', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM coupon WHERE active = 1');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/coupons', async (req, res) => {
    try {
        const { code, description, type, value, min_order_amount, max_discount, usage_limit, active, expiry_date } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO coupon (code, description, type, value, min_order_amount, max_discount, usage_limit, active, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [code, description, type || 'PERCENT', value, min_order_amount || 0, max_discount || 0, usage_limit || 0, active !== false, expiry_date]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 16. REFUND ROUTES
// ========================================================================
app.get('/api/refunds/:orderId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM refund WHERE order_id = ?', [req.params.orderId]);
        connection.release();
        res.json(rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/refunds', async (req, res) => {
    try {
        const { order_id, customer_id, amount, reason, status } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO refund (order_id, customer_id, amount, reason, status, requested_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [order_id, customer_id, amount, reason, status || 'PENDING']
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/refunds/:id', async (req, res) => {
    try {
        const { status, rejection_reason, processed_by } = req.body;
        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE refund SET status = ?, rejection_reason = ?, processed_at = NOW(), processed_by = ? WHERE id = ?',
            [status, rejection_reason, processed_by, req.params.id]
        );
        connection.release();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 17. REFUND IMAGES ROUTES
// ========================================================================
app.post('/api/refund-images', async (req, res) => {
    try {
        const { image_url, refund_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO refund_images (image_url, refund_id) VALUES (?, ?)',
            [image_url, refund_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 18. STOCK ALERT ROUTES
// ========================================================================
app.get('/api/stock-alerts', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM stock_alert WHERE acknowledged = 0');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/stock-alerts', async (req, res) => {
    try {
        const { product_id, vendor_id, stock_level, message, email_sent } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO stock_alert (product_id, vendor_id, stock_level, alert_time, email_sent, message) VALUES (?, ?, ?, NOW(), ?, ?)',
            [product_id, vendor_id, stock_level, email_sent || false, message]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 19. BACK IN STOCK SUBSCRIPTION ROUTES
// ========================================================================
app.post('/api/back-in-stock', async (req, res) => {
    try {
        const { customer_id, product_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO back_in_stock_subscription (customer_id, product_id, subscribed_at) VALUES (?, ?, NOW())',
            [customer_id, product_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/back-in-stock/:customerId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM back_in_stock_subscription WHERE customer_id = ?', [req.params.customerId]);
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 20. WAREHOUSE CHANGE REQUEST ROUTES
// ========================================================================
app.get('/api/warehouse-change-requests', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM warehouse_change_request');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/warehouse-change-requests', async (req, res) => {
    try {
        const { delivery_boy_id, requested_warehouse_id, reason, current_warehouse_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO warehouse_change_request (delivery_boy_id, requested_warehouse_id, reason, current_warehouse_id, requested_at) VALUES (?, ?, ?, ?, NOW())',
            [delivery_boy_id, requested_warehouse_id, reason, current_warehouse_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/warehouse-change-requests/:id', async (req, res) => {
    try {
        const { status, admin_note } = req.body;
        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE warehouse_change_request SET status = ?, admin_note = ?, resolved_at = NOW() WHERE id = ?',
            [status, admin_note, req.params.id]
        );
        connection.release();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 21. AUTO ASSIGN LOG ROUTES
// ========================================================================
app.post('/api/auto-assign-log', async (req, res) => {
    try {
        const { order_id, delivery_boy_id, pin_code, active_orders_at_assignment } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO auto_assign_log (order_id, delivery_boy_id, pin_code, assigned_at, active_orders_at_assignment) VALUES (?, ?, ?, NOW(), ?)',
            [order_id, delivery_boy_id, pin_code, active_orders_at_assignment]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 22. TRACKING EVENT LOG ROUTES
// ========================================================================
app.get('/api/tracking/:orderId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM tracking_event_log WHERE order_id = ? ORDER BY event_time ASC', [req.params.orderId]);
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tracking', async (req, res) => {
    try {
        const { order_id, status, city, description, updated_by } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO tracking_event_log (order_id, status, city, description, updated_by, event_time) VALUES (?, ?, ?, ?, ?, NOW())',
            [order_id, status, city, description, updated_by]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 23. USER ACTIVITIES ROUTES
// ========================================================================
app.post('/api/user-activities', async (req, res) => {
    try {
        const { user_id, action_type, metadata } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO user_activities (user_id, action_type, metadata, timestamp) VALUES (?, ?, ?, NOW())',
            [user_id, action_type, metadata]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 24. SALES RECORD ROUTES (Analytics)
// ========================================================================
app.get('/api/sales-records', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM sales_record ORDER BY order_date DESC LIMIT 100');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sales-records', async (req, res) => {
    try {
        const { order_id, order_date, order_total, delivery_charge, product_id, product_name, category, item_price, quantity, vendor_id, customer_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO sales_record (order_id, order_date, order_total, delivery_charge, product_id, product_name, category, item_price, quantity, vendor_id, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [order_id, order_date, order_total, delivery_charge, product_id, product_name, category, item_price, quantity, vendor_id, customer_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 25. SALES REPORT ROUTES
// ========================================================================
app.get('/api/sales-reports/:vendorId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM sales_report WHERE vendor_id = ? ORDER BY report_date DESC', [req.params.vendorId]);
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sales-reports', async (req, res) => {
    try {
        const { vendor_id, report_type, report_date, total_revenue, total_orders, total_items_sold, avg_order_value } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO sales_report (vendor_id, report_type, report_date, total_revenue, total_orders, total_items_sold, avg_order_value, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [vendor_id, report_type, report_date, total_revenue, total_orders, total_items_sold, avg_order_value]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 26. POLICIES ROUTES
// ========================================================================
app.get('/api/policies', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM policies');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/policies/:category', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM policies WHERE category = ?', [req.params.category]);
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/policies', async (req, res) => {
    try {
        const { title, content, category, slug, author_admin_id } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO policies (title, content, category, slug, author_admin_id, last_updated) VALUES (?, ?, ?, ?, ?, NOW())',
            [title, content, category, slug, author_admin_id]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 27. BANNER ROUTES
// ========================================================================
app.get('/api/banners', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM banner WHERE active = 1 ORDER BY display_order ASC');
        connection.release();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/banners', async (req, res) => {
    try {
        const { title, image_url, link_url, active, show_on_home, show_on_customer_home, display_order } = req.body;
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'INSERT INTO banner (title, image_url, link_url, active, show_on_home, show_on_customer_home, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, image_url, link_url, active !== false, show_on_home !== false, show_on_customer_home !== false, display_order]
        );
        connection.release();
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// DATABASE TEST ENDPOINT
// ========================================================================
app.get('/api/test', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [tables] = await connection.query('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?', [process.env.DB_NAME || 'ekart']);
        const [customers] = await connection.query('SELECT COUNT(*) as total FROM customer');
        const [products] = await connection.query('SELECT COUNT(*) as total FROM product');
        const [orders] = await connection.query('SELECT COUNT(*) as total FROM shopping_order');
        connection.release();
        res.json({
            status: '✅ Connected to ekart database',
            tables: tables[0].count,
            customers: customers[0].total,
            products: products[0].total,
            orders: orders[0].total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// ERROR HANDLING
// ========================================================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// ========================================================================
// START SERVER
// ========================================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n✅ EKART API Server running on http://localhost:${PORT}`);
    console.log(`📦 Database: ekart (TiDB Cloud - Singapore)`);
    console.log(`📝 API Documentation: All 27 tables are mapped\n`);
});

module.exports = app;
