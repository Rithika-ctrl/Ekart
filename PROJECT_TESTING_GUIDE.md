# EKART E2E Project Testing Guide

## 🚀 PROJECT STATUS: RUNNING

**Backend Server:** ✅ Running on http://localhost:8080
- Spring Boot 3.4.0
- MySQL (TiDB Cloud)
- All normalized with JOINs (no redundant columns)

**Frontend Server:** ✅ Running on http://localhost:3001
- React + Vite
- All UIs ready for testing

---

## 🧪 END-TO-END TESTING WORKFLOW

### PHASE 1: CUSTOMER SIDE (http://localhost:3001)

#### 1.1 Customer Registration & Login
```
Step 1: Go to http://localhost:3001
Step 2: Click "Register" → "Customer"
Step 3: Fill in:
  - Name: TestCustomer
  - Email: customer@test.com
  - Password: Pass@1234
  - Mobile: 9876543210
Step 4: Click Submit
Step 5: Login with same credentials
Step 6: ✅ Dashboard loads successfully
```

#### 1.2 Browse & Add Products to Cart
```
Step 1: On Customer Dashboard, view available Products
Step 2: Click "Explore Products" / "Browse"
Step 3: Add 2-3 products to cart
Step 4: Go to Cart → View Items
Step 5: Proceed to Checkout
Step 6: Select Delivery Address
Step 7: Confirm Order
Step 8: ✅ Order placed successfully
```

#### 1.3 Track Order
```
Step 1: Go to "My Orders"
Step 2: Click Recent Order
Step 3: View Tracking Status
Step 4: Should show: PROCESSING → PACKED → DELIVERED
Step 5: ✅ Tracking works
```

---

### PHASE 2: VENDOR SIDE (http://localhost:3001/vendor)

#### 2.1 Vendor Registration & Login
```
Step 1: Go to http://localhost:3001
Step 2: Click "Register" → "Vendor"
Step 3: Fill in:
  - Name: TechVendor
  - Email: vendor@test.com
  - Password: Pass@1234
  - Mobile: 9876543211
Step 4: Click Submit
Step 5: Login with same credentials
Step 6: ✅ Vendor Dashboard loads
```

#### 2.2 Add Products
```
Step 1: Go to "My Products"
Step 2: Click "Add New Product"
Step 3: Fill Details:
  - Name: Laptop
  - Price: 50000
  - Stock: 10
  - GST Rate: 18%
  - Allowed PINs: 583121,583122
Step 4: Click "Add Product"
Step 5: ✅ Product added successfully
```

#### 2.3 View Orders & Process
```
Step 1: Go to "Pending Orders"
Step 2: View orders from your products
Step 3: Status should track:
  - PENDING
  - CONFIRMED
  - PACKED
Step 4: ✅ Order lifecycle visible
```

---

### PHASE 3: ADMIN SIDE (http://localhost:3001/admin)

#### 3.1 Admin Access
```
Step 1: Go to http://localhost:3001/admin
Step 2: Default Admin Credentials (if configured):
  - Email: admin@ekart.com
  - Password: admin123
Step 3: ✅ Admin Dashboard loads
```

#### 3.2 Create Warehouse
```
Step 1: Go to "Warehouse Management"
Step 2: Click "Add Warehouse"
Step 3: Fill Details:
  - Name: MainWarehouse
  - City: Bangalore
  - State: Karnataka
  - PIN Codes: 583121,583122,583123
Step 4: Click Save
Step 5: ✅ Warehouse created successfully
Note: PIN codes are MANDATORY
```

#### 3.3 Manage Delivery Boys
```
Step 1: Go to "Delivery Boys"
Step 2: Click "Pending Approvals"
Step 3: View registered delivery boys
Step 4: Approve each one
Step 5: ✅ Approvals completed
```

#### 3.4 View Auto-Assignment Logs
```
Step 1: Go to "Auto-Assignment Logs"
Step 2: Should show:
  - Order ID
  - Delivery Boy Name
  - Delivery Boy Code
  - PIN Code
  - Assignment Timestamp
  - Active Orders at Time
Step 3: ✅ Assignment history visible
```

---

### PHASE 4: DELIVERY BOY SIDE (http://localhost:3001/delivery)

#### 4.1 Delivery Boy Registration & Login
```
Step 1: Go to http://localhost:3001
Step 2: Click "Register" → "Delivery"
Step 3: Fill in:
  - Name: RajDelivery
  - Email: delivery@test.com
  - Password: Pass@1234
  - Mobile: 9876543212
  - Warehouse: MainWarehouse (assigned by admin)
Step 4: Click Submit
Step 5: Login (wait for admin approval)
Step 6: ✅ Delivery Dashboard loads
```

#### 4.2 Go Online
```
Step 1: Click "Go Online" Button
Step 2: ✅ Status changes to ONLINE (visible to admin & system)
Step 3: PIN codes auto-inherited from warehouse
Step 4: Can now receive auto-assigned orders
```

#### 4.3 Receive Auto-Assigned Orders
```
Step 1: Once ONLINE, system auto-assigns orders matching:
  - Delivery Boy: ONLINE + ADMIN_APPROVED
  - Order PIN: Matches assigned_pin_codes
  - Active Orders: < 3 (MAX_CONCURRENT_ORDERS)
  - Load Balancing: Prefer boy with fewer active orders
Step 2: Go to "Assigned Orders"
Step 3: ✅ Orders appear automatically
```

#### 4.4 Update Order Status
```
Step 1: Click on Assigned Order
Step 2: Navigate through statuses:
  - PACKED (from admin side)
  - IN_TRANSIT
  - OUT_FOR_DELIVERY
  - DELIVERED
Step 3: Scan delivery OTP or enter manually
Step 4: Click "Deliver"
Step 5: ✅ Order marked DELIVERED
Step 6: Auto-assignment system can now assign new order
```

#### 4.5 Go Offline
```
Step 1: Click "Go Offline" Button
Step 2: ✅ Status changes to OFFLINE
Step 3: No new orders will be auto-assigned
Step 4: Existing orders can still be completed
```

---

## 🗄️ DATABASE NORMALIZATION (COMPLETED)

### Before Cleanup
- **Total Tables:** 34
- **Redundant Columns:** 50+
- **Duplicate Tables:** 3 (StockAlert, SalesReport, UserActivities)
- **Data Duplication:** Yes (vendor_name stored in Order + Vendor table)

### After Cleanup ✅
- **Total Tables:** 31
- **By Table Columns:**
  - shopping_order: 20 cols (fixed, no redundancy)
  - delivery_boy: 13 cols (fixed, no redundancy)
  - auto_assign_log: 6 cols (fixed, no redundancy)
  - All other tables: snake_case naming only

### Key Normalization Changes
```
BEFORE: Order { vendor_id, vendor_name }  ❌ Redundant
AFTER:  Order { vendor (@ManyToOne Vendor) }  ✅ Clean

BEFORE: AutoAssignLog { delivery_boy_id, delivery_boy_name, delivery_boy_code }  ❌
AFTER:  AutoAssignLog { delivery_boy (@ManyToOne DeliveryBoy) }  ✅

BEFORE: SalesRecord { customer_id, customer_name, vendor_id, vendor_name, product_id, product_name }  ❌
AFTER:  SalesRecord { customer_id, vendor_id, product_id } + JOINs  ✅
```

---

## 🔧 AUTO-ASSIGNMENT SYSTEM - TESTING CHECKLIST

### Test Scenario: Complete Order Lifecycle
```
1️⃣ Admin Creates Warehouse
   ├─ PIN Codes: 583121, 583122
   └─ Stores: served_pin_codes (single source of truth)

2️⃣ Delivery Boy Registers
   ├─ Selects Warehouse
   ├─ Gets: assigned_pin_codes = warehouse.served_pin_codes (inherited)
   └─ Waits for admin approval

3️⃣ Admin Approves Delivery Boy
   ├─ admin_approved = true
   └─ Approval optional: Can specify PIN override

4️⃣ Delivery Boy Goes Online
   ├─ is_available = true
   └─ System can now assign orders

5️⃣ Customer Creates Order
   ├─ Delivery PIN: 583121
   ├─ Storage: shopping_order.delivery_pin_code
   └─ Status: PROCESSING

6️⃣ Admin Marks Order as PACKED
   ├─ Triggers: AutoAssignmentService.tryAssignOrder(Order)
   ├─ Filters available delivery boys:
   │  ├─ is_available = true ✓
   │  ├─ admin_approved = true ✓
   │  ├─ assigned_pin_codes CONTAINS order.delivery_pin_code ✓
   │  ├─ active_orders < 3 ✓
   │  └─ Select: boy with minimum active_orders (load balance)
   └─ Result: Order auto-assigned

7️⃣ Auto-Assignment Log Updated
   ├─ auto_assign_log.delivery_boy_id = assigned boy ID
   ├─ auto_assign_log.order_id = order ID
   ├─ auto_assign_log.pin_code = order PIN
   └─ auto_assign_log.active_orders_at_assignment = count

8️⃣ Delivery Boy Sees Order
   ├─ Order appears in: "Assigned Orders"
   ├─ Shows: shopping_order.delivery_address
   └─ Status: DELIVERY_ASSIGNED

9️⃣ Delivery Boy Updates Status
   ├─ IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
   └─ On DELIVERED: active_orders count decreases

🔟 New Order Auto-Assigned
   ├─ Delivery boy now has 2 active orders (< 3)
   └─ System can assign 1 more order if available
```

---

##  Error Scenarios & Fixes

### Scenario 1: "No Delivery Boys Found"
**Cause:** assigned_pin_codes is NULL or doesn't match order PIN
**Fix:**
```sql
-- Verify warehouse has PIN codes
SELECT * FROM warehouse WHERE id = ?;

-- Verify delivery boy PIN inheritance
SELECT id, name, assigned_pin_codes FROM delivery_boy WHERE warehouse_id = ?;

-- If NULL, update manually:
UPDATE delivery_boy 
SET assigned_pin_codes = (SELECT served_pin_codes FROM warehouse WHERE id = delivery_boy.warehouse_id)
WHERE assigned_pin_codes IS NULL;
```

### Scenario 2: "MAX_CONCURRENT_ORDERS Exceeded"
**Cause:** Delivery boy already has 3 active orders
**Fix:**
```sql
-- Check active orders for delivery boy
SELECT COUNT(*) FROM shopping_order 
WHERE delivery_boy_id = ? 
  AND tracking_status IN ('DELIVERY_ASSIGNED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY');

-- Should be < 3 for auto-assignment to work
```

### Scenario 3: "Order Not Auto-Assigning"
**Cause:** Check delivery boy status
```sql
-- Debug query
SELECT id, name, admin_approved, is_available, assigned_pin_codes 
FROM delivery_boy 
WHERE warehouse_id = ? 
  AND is_available = true 
  AND admin_approved = true;
```

---

##  API Endpoints - Quick Reference

### Authentication
```
POST /auth/signup         → Customer/Vendor/Delivery Registration
POST /auth/login          → Login (returns JWT token)
```

### Customer
```
GET  /products/all                    → Browse all products
POST /cart/add                        → Add to cart
GET  /cart/items                      → View cart
POST /orders/create                   → Place order
GET  /orders/list                     → View orders
GET  /orders/{orderId}/tracking       → Track order
```

### Vendor
```
POST /vendor/products/add             → Add product
GET  /vendor/products                 → My products
GET  /vendor/orders/pending           → Pending orders
```

### Admin
```
POST /admin/warehouses/add            → Create warehouse
GET  /admin/warehouses                → List warehouses
GET  /admin/delivery-boys/pending     → Pending approvals
POST /admin/delivery-boys/{id}/approve → Approve delivery boy
POST /admin/delivery/order/pack       → Pack order (triggers auto-assign)
GET  /admin/auto-assign-logs          → Assignment history
```

### Delivery Boy
```
POST /delivery/online                 → Go online
POST /delivery/offline                → Go offline
GET  /delivery/orders/assigned        → Get assigned orders
POST /delivery/orders/{orderId}/update        → Update status
POST /delivery/orders/{orderId}/deliver      → Mark delivered
```

---

## ✅ FINAL VERIFICATION CHECKLIST

- [ ] Backend running on port 8080
- [ ] Frontend running on port 3001
- [ ] Customer can register & login
- [ ] Vendor can register & add products
- [ ] Admin dashboard accessible
- [ ] Warehouse creation works (PIN codes mandatory)
- [ ] Delivery boy registration with warehouse selection
- [ ] Admin approval workflow functioning
- [ ] Delivery boy can go ONLINE/OFFLINE
- [ ] Orders auto-assigned based on warehouse PIN codes
- [ ] Auto-assignment log populated correctly
- [ ] Order tracking shows real-time status
- [ ] Database normalized (no duplicate columns)
- [ ] All JOINs working (Vendor, DeliveryBoy relationships)

---

## 🎯 NEXT STEPS

1. **Start Both Servers** (already running)
2. **Test Each User Type Sequentially**
   - Customer → Order placement
   - Vendor → Product management
   - Admin → Warehouse & approval
   - Delivery Boy → Order delivery

3. **Run Complete Order Lifecycle**
   - From order creation to delivery completion

4. **Monitor Logs**
   - Watch for auto-assignment trigger
   - Check database updates

5. **Report Issues**
   - Backend errors (http://localhost:8080)
   - Frontend UI issues (http://localhost:3001)
   - Database state inconsistencies

---

## 📞 SERVERS STATUS (Start these if needed)

**Backend:**
```bash
java -jar "c:\Users\whynew.in\OneDrive\Desktop\EKART\EKART\target\ekart-0.0.1-SNAPSHOT.jar"
```

**Frontend:**
```bash
cd "c:\Users\whynew.in\OneDrive\Desktop\EKART\ekart-frontend"
npm run dev -- --port 3001
```

---

**Generated:** April 3, 2026 12:30 PM
**Status:** ✅ ALL SYSTEMS GO - Ready for E2E Testing
