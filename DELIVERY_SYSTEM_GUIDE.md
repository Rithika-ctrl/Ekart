# 🚚 DELIVERY SYSTEM - TROUBLESHOOTING & TEST DATA GUIDE

## 📋 Problem Summary

**Your delivery app is showing "all empty 0" (0 to-pickup, 0 out-for-delivery, 0 delivered) because there are NO ORDERS in the system assigned to the delivery boy.**

The query `/api/delivery/orders` calls:
```java
List<Order> allAssigned = orderRepository.findByDeliveryBoy(db);
```

This returns **0 results** because no orders have been assigned to this delivery boy's ID in the database.

---

## 🔄 Why The Data Is Empty

### The Complete Order-to-Delivery Flow

Orders must follow this **exact sequence** to appear in the delivery app:

```
1. CUSTOMER PLACES ORDER
   ↓
2. ORDER CREATED → Status: PROCESSING
   ↓
3. VENDOR MARKS PACKED → Status: PACKED
   ↓
4. ADMIN ASSIGNS DELIVERY BOY → Status: SHIPPED ✅
   ↓
5. DELIVERY BOY SEES ORDER in app ✅
```

**Current Status:** Steps 1-3 haven't happened in your database yet.

---

## 🛠️ SOLUTION: Add Test Data

### Step 1: Run Test Data SQL Script

The file `test-delivery-data.sql` (in `src/main/resources/`) creates:
- **3 Test Delivery Boys** (1 approved in Chennai, 2 more in other warehouses)
- **4 Test Customers** with addresses
- **2 Test Vendors** with approved products
- **4 Test Products** in stock
- **5 Test Orders** in `PACKED` status (ready to assign)
- **Warehouses** for delivery boys

**Execute the script:**

```bash
# From your MySQL client or command line
mysql -u root -p ekart < src/main/resources/test-delivery-data.sql

# Or paste the content into MySQL Workbench and execute
```

### Credentials Created:
- **Delivery Boy Login:**
  - Email: `raj.courier@test.com`
  - Password: `test@123`
  - ID: `1`
  - Status: ✅ Approved and Active

---

## 📱 Test The Delivery System

### Step 1: Login as Delivery Boy

1. Open the **Delivery App** in React
2. Login with:
   - **Email:** `raj.courier@test.com`
   - **Password:** `test@123`

3. You should now see:
   - ✅ Status: "APPROVED" (not pending)
   - ✅ Warehouse: "Main Warehouse Chennai"
   - ✅ **5 Orders ready** (but they'll show 0 because not yet assigned)

### Step 2: Assign Orders to Delivery Boy (Admin)

The orders are in `PACKED` status but not yet assigned. Use the **Admin API** endpoint:

```
POST /api/flutter/admin/delivery/assign
Headers: Content-Type: application/x-www-form-urlencoded
Body:
  orderId=1
  deliveryBoyId=1
```

**Via cURL:**
```bash
curl -X POST http://localhost:8080/api/flutter/admin/delivery/assign \
  -d "orderId=1&deliveryBoyId=1"
```

**Via Postman:**
- Method: POST
- URL: `http://localhost:8080/api/flutter/admin/delivery/assign`
- Body (form-urlencoded):
  - `orderId` = `1`
  - `deliveryBoyId` = `1`

### Step 3: Verify Orders Now Appear

After assigning, the delivery boy's app should show:
- ✅ **toPickup: 1** (orders in SHIPPED status waiting to be picked up)
- ✅ Order details with customer info, items, amount, etc.

---

## 📊 Available Test Orders

| Order ID | Customer | Vendor | Items | Amount | Status |
|----------|----------|--------|-------|--------|--------|
| 1 | Amit Verma | Tech Store | Earbuds + Charger | ₹2,098 | PACKED |
| 2 | Anjali Sharma | Fashion Hub | T-Shirt Pack | ₹639 | PACKED |
| 3 | Ravi Kumar | Tech Store | USB Charger | ₹839 | PACKED |
| 4 | Neha Desai | Fashion Hub | Running Shoes | ₹2,539 | PACKED |
| 5 | Amit Verma | Fashion Hub | T-Shirt Pack (x2) | ₹1,198 | PACKED |

---

## 🎯 Complete Workflow To Test All Delivery Features

### 1. **Online/Offline Toggle** ✅
- Login as delivery boy
- Click the toggle button
- Call: `POST /api/react/delivery/availability/toggle`
- Status updates (is_available: true/false)

### 2. **View Orders** (After Assignment) ✅
- Orders show in 3 tabs:
  - **To Pick Up** (SHIPPED status)
  - **Out For Delivery** (OUT_FOR_DELIVERY status)
  - **Delivered** (DELIVERED status)

### 3. **Mark Order as Picked Up** ✅
Call: `POST /api/delivery/orders/{id}/pickup`
- Order moves from SHIPPED → OUT_FOR_DELIVERY

### 4. **Mark Order as Delivered** ✅
Call: `POST /api/delivery/orders/{id}/deliver`
- Order moves from OUT_FOR_DELIVERY → DELIVERED
- Order appears in "Delivered" tab

### 5. **Warehouse Change Request** ✅
Call: `POST /api/delivery/warehouse-change/request`
- Delivery boy requests transfer to another warehouse
- Admin approves via: `POST /api/flutter/admin/warehouse-transfers/{id}/approve`

---

## 🔧 Explanation: Why This Matters

### Current Backend Architecture:

```
Customer Order (PROCESSING)
    ↓
Vendor Packs (PACKED) ← Order no longer "unassigned"
    ↓
Admin Assigns Delivery Boy (SHIPPED) ← FK: order.delivery_boy_id SET
    ↓
Query: findByDeliveryBoy(db) ← Returns orders where FK matches ✅
    ↓
Delivery App sees orders ✅
```

### Before Assignment:
```
order.delivery_boy_id = NULL
↓
findByDeliveryBoy(delivery_boy_1) → No match → Returns []
↓
App shows 0 orders
```

### After Assignment:
```
order.delivery_boy_id = 1
↓
findByDeliveryBoy(delivery_boy_1) → Matches! → Returns [order_1, order_2]
↓
App shows 2 orders ✅
```

---

## 📊 Database Query Reference

### Check Delivery Boy:
```sql
SELECT id, name, email, admin_approved, active, warehouse_id 
FROM delivery_boy WHERE id = 1;
```

### Check Orders Assigned to Delivery Boy 1:
```sql
SELECT id, customer_id, amount, tracking_status, delivery_boy_id 
FROM shopping_order WHERE delivery_boy_id = 1;
```

### Check Orders In PACKED Status (Waiting for Assignment):
```sql
SELECT id, customer_id, amount, tracking_status
FROM shopping_order WHERE tracking_status = 'PACKED' AND delivery_boy_id IS NULL;
```

### See All Warehouse Details:
```sql
SELECT id, name, city, warehouse_code, served_pin_codes, active 
FROM warehouse;
```

---

## ✨ Quick Commands Cheat Sheet

### Assign All 5 Test Orders to Delivery Boy 1:
```bash
# Assign Order 1
curl -X POST http://localhost:8080/api/flutter/admin/delivery/assign \
  -d "orderId=1&deliveryBoyId=1"

# Assign Order 2
curl -X POST http://localhost:8080/api/flutter/admin/delivery/assign \
  -d "orderId=2&deliveryBoyId=1"

# Assign Order 3
curl -X POST http://localhost:8080/api/flutter/admin/delivery/assign \
  -d "orderId=3&deliveryBoyId=1"

# Assign Order 4
curl -X POST http://localhost:8080/api/flutter/admin/delivery/assign \
  -d "orderId=4&deliveryBoyId=1"

# Assign Order 5
curl -X POST http://localhost:8080/api/flutter/admin/delivery/assign \
  -d "orderId=5&deliveryBoyId=1"
```

---

## 🎓 Key Learnings

1. **Orders don't just appear** - They must be explicitly assigned to a delivery boy
2. **Assignment creates the relationship** - Sets the foreign key `order.delivery_boy_id`
3. **Query depends on this FK** - `findByDeliveryBoy()` filters by this relationship
4. **Status matters** - Orders must be `PACKED` before assignment (prevents assigning in-progress orders)

---

## 📝 Next Steps

1. ✅ Run the test data script: `test-delivery-data.sql`
2. ✅ Email restart the Spring Boot application
3. ✅ Login as delivery boy: `raj.courier@test.com` / `test@123`
4. ✅ Use admin endpoint to assign orders to delivery boy
5. ✅ See orders appear in the delivery app!
6. ✅ Test: Pick up, deliver, mark delivered

---

## ❓ Questions?

**Q: Where's the test data script?**
A: `src/main/resources/test-delivery-data.sql`

**Q: Can I modify test data?**
A: Yes! Edit the SQL script to change customer names, amounts, products before running.

**Q: Will this affect real data?**  
A: Uses `INSERT IGNORE` - only adds missing records, won't overwrite existing data.

**Q: How do I reset test data?**
A: Delete records with: `DELETE FROM shopping_order WHERE id IN (1,2,3,4,5); DELETE FROM delivery_boy WHERE id <= 3;`

---

**Status: READY TO TEST! 🚀**
