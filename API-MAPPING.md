# ========================================================================
# EKART API Mapping - All 27 Tables with Complete Attributes
# ========================================================================

## Database Tables ↔ API Endpoints Mapping

| # | Table | Key Columns | API Endpoints | Attributes Handled |
|---|-------|------------|---------------|--------------------|
| 1 | **warehouse** | id, name, city, state, warehouse_code, served_pin_codes, active | GET/POST /warehouses/:id | All 7 columns |
| 2 | **category** | id, name, emoji, display_order, parent, parent_id | GET/POST /categories/:id | All 6 columns + hierarchy |
| 3 | **vendor** | id, name, email, mobile, password, otp, verified, provider, provider_id, vendor_code, description | GET/POST /vendors/:id | All 11 columns |
| 4 | **product** | id, name, description, price, mrp, gst_rate, category, stock, stock_alert_threshold, image_link, extra_image_links, video_link, approved, allowed_pin_codes, vendor_id | GET/POST /products/:id | All 15 columns |
| 5 | **cart** | id | GET/POST /cart/:cartId | Cart management |
| 6 | **item** | id, name, description, price, unit_price, category, quantity, image_link, product_id, cart_id | POST /cart/add-item, DELETE | All 10 columns |
| 7 | **customer** | id, name, email, mobile, password, otp, verified, role, active, provider, provider_id, cart_id, recently_viewed_products, profile_image, last_login | GET/POST/PUT /customers/:id | All 15 columns |
| 8 | **address** | id, details, recipient_name, house_street, city, state, postal_code, customer_id | GET/POST /addresses | All 8 columns |
| 9 | **delivery_boy** | id, name, email, mobile, password, otp, verified, admin_approved, active, warehouse_id, assigned_pin_codes, delivery_boy_code, is_available | GET/POST /delivery-boys/:id | All 13 columns |
| 10 | **shopping_order** | id, razorpay_payment_id, razorpay_order_id, amount, delivery_charge, total_price, gst_amount, payment_mode, tracking_status, customer_id, warehouse_id, delivery_boy_id, delivery_pin_code, delivery_address, parent_order_id, vendor_id, order_date, current_city, delivery_time, replacement_requested | GET/POST/PUT /orders/:id | All 20 columns |
| 11 | **delivery_otp** | id, order_id, otp, used, generated_at, used_at | POST/GET/PUT /delivery-otp/:orderId | All 6 columns |
| 12 | **review** | id, rating, comment, customer_name, product_id, created_at | GET/POST /reviews/product/:productId | All 6 columns |
| 13 | **review_images** | id, image_url, review_id | POST /review-images | All 3 columns |
| 14 | **wishlist** | id, customer_id, product_id, added_at | GET/POST/DELETE /wishlist/:customerId | All 4 columns |
| 15 | **coupon** | id, code, description, type, value, min_order_amount, max_discount, usage_limit, used_count, active, expiry_date | GET/POST /coupons | All 11 columns |
| 16 | **refund** | id, order_id, customer_id, amount, reason, status, rejection_reason, requested_at, processed_at, processed_by | GET/POST/PUT /refunds/:id | All 10 columns |
| 17 | **refund_images** | id, image_url, refund_id | POST /refund-images | All 3 columns |
| 18 | **stock_alert** | id, product_id, vendor_id, stock_level, alert_time, email_sent, acknowledged, message | GET/POST /stock-alerts | All 8 columns |
| 19 | **back_in_stock_subscription** | id, customer_id, product_id, subscribed_at, notified, notified_at | GET/POST /back-in-stock/:customerId | All 6 columns |
| 20 | **warehouse_change_request** | id, delivery_boy_id, requested_warehouse_id, reason, status, admin_note, requested_at, resolved_at, current_warehouse_id | GET/POST/PUT /warehouse-change-requests/:id | All 9 columns |
| 21 | **auto_assign_log** | id, order_id, delivery_boy_id, pin_code, assigned_at, active_orders_at_assignment | POST /auto-assign-log | All 6 columns |
| 22 | **tracking_event_log** | id, order_id, status, city, description, updated_by, event_time | GET/POST /tracking/:orderId | All 7 columns |
| 23 | **user_activities** | id, user_id, action_type, metadata, timestamp | POST /user-activities | All 5 columns |
| 24 | **sales_record** | id, order_id, order_date, order_total, delivery_charge, product_id, product_name, category, item_price, quantity, vendor_id, customer_id | GET/POST /sales-records | All 12 columns |
| 25 | **sales_report** | id, vendor_id, report_type, report_date, total_revenue, total_orders, total_items_sold, avg_order_value, generated_at | GET/POST /sales-reports/:vendorId | All 9 columns |
| 26 | **policies** | id, title, content, category, slug, author_admin_id, last_updated | GET/POST /policies/:category | All 7 columns |
| 27 | **banner** | id, title, image_url, link_url, active, show_on_home, show_on_customer_home, display_order | GET/POST /banners | All 8 columns |

---

## ✅ Backend Features

### Complete Table Coverage
- ✅ All 27 tables mapped to API endpoints
- ✅ All columns extracted and handled
- ✅ Proper data types and defaults applied
- ✅ Foreign key relationships maintained
- ✅ Timestamps (created_at, updated_at) auto-set

### API Operations
- ✅ GET - Retrieve all or specific records
- ✅ POST - Create new records
- ✅ PUT - Update existing records
- ✅ DELETE - Remove records

### Business Logic
- ✅ Cart management (create, add items, delete items)
- ✅ Order tracking with status updates
- ✅ Delivery OTP verification
- ✅ Refund processing with status tracking
- ✅ Wishlist management (add/remove items)
- ✅ Review system with images
- ✅ Stock alerts and back-in-stock subscriptions
- ✅ Sales records and analytics
- ✅ Warehouse change requests
- ✅ Auto-assignment logging

---

## 🚀 Ready to Use

### Installation & Setup
```bash
cd C:\Users\whynew.in\OneDrive\Desktop\EKART

# Install dependencies
npm install

# Start the server
node ekart-api.js
```

### Expected Output
```
✅ EKART API Server running on http://localhost:3001
📦 Database: ekart (TiDB Cloud - Singapore)
📝 API Documentation: All 27 tables are mapped
```

---

## 🔌 Test Connection
```bash
curl http://localhost:3001/api/test
```

**Response:**
```json
{
  "status": "✅ Connected to ekart database",
  "tables": 27,
  "customers": 0,
  "products": 0,
  "orders": 0
}
```

---

## 📊 Data Validation

All API endpoints validate and handle:
- ✅ **Strings**: VARCHAR, LONGTEXT, TEXT
- ✅ **Numbers**: INT, BIGINT, DOUBLE
- ✅ **Dates**: DATETIME, DATE (auto set to NOW())
- ✅ **Booleans**: Default to FALSE if not provided
- ✅ **Enums**: PERCENT/FLAT (coupon), PENDING/APPROVED/REJECTED (refund/request)
- ✅ **Foreign Keys**: All relationships maintained
- ✅ **Unique Constraints**: Email validation, code uniqueness
- ✅ **Defaults**: Applied automatically (active=true, role=CUSTOMER, etc.)

---

## 📝 Sample API Calls

### Create Customer
```bash
curl -X POST http://localhost:3001/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": 9999999999,
    "password": "securepass",
    "role": "CUSTOMER",
    "active": true
  }'
```

### Create Product
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 50000,
    "mrp": 60000,
    "gst_rate": 18,
    "category": "Electronics",
    "stock": 50,
    "vendor_id": 1,
    "approved": true
  }'
```

### Create Order
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "total_price": 50000,
    "delivery_charge": 100,
    "gst_amount": 9000,
    "tracking_status": "PROCESSING",
    "payment_mode": "CARD"
  }'
```

---

## 🔐 Database Credentials (Configured in .env)

```env
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=w4CBYUqPKd3K3rd.root
DB_PASSWORD=zJDkOwlhrkjaC9pn
DB_NAME=ekart
```

---

## 📁 Backend Files

| File | Purpose |
|------|---------|
| ekart-api.js | Main Express server (all 27 tables mapped) |
| package-api.json | Dependencies |
| .env | Configuration |
| dataa.sql | Database schema with seed data |
| SETUP-GUIDE.md | Installation guide |

---

## ✨ Architecture

```
React Frontend (Vite/React)
         ↓
  ekartApiService.js (API Client)
         ↓
  ekart-api.js (Express Server)
         ↓
  MySQL2/Promise (Connection Pool)
         ↓
  TiDB Cloud (MySQL Compatible)
  - Database: ekart
  - Tables: 27
  - Rows: Auto-increment IDs
```

---

## 🎯 Next Steps

1. ✅ Start the backend server
2. ✅ Test connection with `/api/test`
3. ✅ Insert sample data (vendors, categories, products)
4. ⏭️ Build React components using ekartApiService.js
5. ⏭️ Implement authentication/JWT
6. ⏭️ Add file uploads for images
7. ⏭️ Integrate payment gateway (Razorpay)

---

**Version**: 2.0.0  
**Status**: ✅ Complete and Ready  
**Last Updated**: April 3, 2026
