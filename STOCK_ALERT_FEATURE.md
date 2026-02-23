# 📦 Stock Alert Notifications Feature - Implementation Guide

## ✨ Feature Overview
A comprehensive **Stock Alert Notifications** system for Ekart vendors that automatically monitors product inventory levels and sends email alerts when stock falls below configurable thresholds.

---

## 🎯 Key Features

### 1. **Automatic Stock Monitoring**
- Real-time stock level tracking for all vendor products
- Configurable threshold per product (default: 10 units)
- Triggers alerts when stock drops to or below threshold
- Prevents duplicate alerts until acknowledged

### 2. **Email Notifications**
- Automated email alerts sent to vendor email address
- Professional HTML email template with product details
- Console logging for development/debugging
- Includes product name, current stock, threshold, and product ID

### 3. **Alert Dashboard**
- Dedicated `/stock-alerts` page for vendors
- Visual badge showing unacknowledged alert count on homepage
- Display all alerts with timestamps and status
- Acknowledge alerts to mark them as read
- Quick navigation to update product stock

### 4. **Stock Threshold Management**
- Set custom threshold when adding products
- Update threshold when editing products
- Default threshold of 10 units for new products
- Backward compatible with existing products

---

## 📂 Files Created/Modified

### **New Files:**
1. `src/main/java/com/example/ekart/dto/StockAlert.java` - Alert entity
2. `src/main/java/com/example/ekart/repository/StockAlertRepository.java` - Data access
3. `src/main/java/com/example/ekart/service/StockAlertService.java` - Business logic
4. `src/main/resources/templates/stock-alerts.html` - Alert dashboard UI
5. `src/main/resources/templates/stock-alert-email.html` - Email template

### **Modified Files:**
1. `src/main/java/com/example/ekart/dto/Product.java` - Added `stockAlertThreshold` field
2. `src/main/java/com/example/ekart/dto/Item.java` - Added `productId` field for tracking
3. `src/main/java/com/example/ekart/helper/EmailSender.java` - Added stock alert email method
4. `src/main/java/com/example/ekart/service/VendorService.java` - Integrated stock checks
5. `src/main/java/com/example/ekart/service/CustomerService.java` - Check stock after orders
6. `src/main/java/com/example/ekart/controller/EkartController.java` - Added alert routes
7. `src/main/resources/templates/vendor-home.html` - Added alert button with badge
8. `src/main/resources/templates/add-product.html` - Added threshold input field
9. `src/main/resources/templates/edit-product.html` - Added threshold input field

---

## 🔧 Technical Implementation

### **Database Schema**
```sql
-- StockAlert table
CREATE TABLE stock_alert (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    product_id INTEGER,
    vendor_id INTEGER,
    stock_level INTEGER,
    alert_time TIMESTAMP,
    email_sent BOOLEAN,
    acknowledged BOOLEAN,
    message VARCHAR(500)
);

-- Product table additions
ALTER TABLE product ADD COLUMN stock_alert_threshold INTEGER DEFAULT 10;

-- Item table additions
ALTER TABLE item ADD COLUMN product_id INTEGER;
```

### **Stock Check Triggers**
Alerts are automatically checked when:
1. **Product is added** - `VendorService.laodAddProduct()`
2. **Product is updated** - `VendorService.updateProduct()`
3. **Order is placed** - `CustomerService.paymentSuccess()`

### **Alert Flow**
```
1. Stock falls below threshold
   ↓
2. StockAlertService.checkStockLevel()
   ↓
3. Create new StockAlert record
   ↓
4. Send email via EmailSender.sendStockAlert()
   ↓
5. Display on vendor dashboard with badge
   ↓
6. Vendor acknowledges alert
```

---

## 🚀 Usage Guide

### **For Vendors:**

#### **Setting Up Alerts:**
1. Navigate to "Add Product" or "Edit Product"
2. Set the "Stock Alert Threshold" field (e.g., 10 units)
3. Save the product

#### **Viewing Alerts:**
1. Login to vendor dashboard at `/vendor/home`
2. Look for orange "Stock Alerts" button with badge count
3. Click to view detailed alert dashboard at `/stock-alerts`

#### **Managing Alerts:**
- **View Details**: See product name, current stock, threshold, timestamp
- **Update Stock**: Click "Update Stock" button to edit product
- **Acknowledge**: Mark alert as read (removes from "New" count)
- **Email**: Automatic email sent when alert is first triggered

### **Testing the Feature:**

#### **Test Scenario 1: Low Stock Product**
```
1. Add a product with stock = 5, threshold = 10
2. Alert should be created immediately
3. Check console for email log
4. Visit /stock-alerts to see the alert
```

#### **Test Scenario 2: Stock Depletion**
```
1. Add a product with stock = 15, threshold = 10
2. Customer places orders reducing stock to 8
3. Alert triggers automatically
4. Email sent to vendor
5. Badge appears on vendor homepage
```

#### **Test Scenario 3: Acknowledge Alert**
```
1. View alerts at /stock-alerts
2. Click "Acknowledge" button
3. Alert marked as read
4. Badge count decreases
5. Alert remains visible but greyed out
```

---

## 📧 Email Configuration

Email alerts use the existing Spring Mail configuration in `application.properties`:

```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=holeyappaece2024@gmail.com
spring.mail.password=wkericxjuhtsbxvs
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

**Email Template Features:**
- Responsive HTML design
- Professional layout with warning icons
- Product details table
- Direct link to manage products
- Branded footer

---

## 🎨 UI Features

### **Vendor Homepage:**
- Orange "Stock Alerts" button
- Red badge with unacknowledged count
- Smooth hover animations

### **Stock Alerts Page:**
- Alert cards with color-coded borders (orange for new, gray for acknowledged)
- Timestamp display
- Stock level indicators
- Quick action buttons
- Empty state with success icon

### **Product Forms:**
- Stock alert threshold input
- Helper text explaining the feature
- Default value of 10 units
- Optional field (doesn't break existing flow)

---

## 🔒 Security Features

- **Vendor ownership validation**: Can only view own alerts
- **Session checks**: Requires vendor login
- **Product validation**: Alerts only for vendor's products
- **SQL injection protection**: Uses JPA parameter binding

---

## 🐛 Error Handling

- **Missing threshold**: Auto-set to 10 units
- **Null productId in items**: Gracefully skipped
- **Email failures**: Logged but don't block operations
- **Invalid alert ID**: Returns user-friendly error message
- **Database constraints**: Nullable fields for backward compatibility

---

## 📊 Performance Considerations

- **Efficient queries**: Uses indexed foreign keys
- **Duplicate prevention**: Checks before creating alerts
- **Async email**: Doesn't block main workflow
- **Lazy loading**: Alerts loaded only when viewing dashboard

---

## 🔄 Future Enhancements (Potential)

1. **SMS Notifications** - Add phone alerts
2. **Bulk Threshold Update** - Set threshold for multiple products
3. **Alert History** - Archive and analytics
4. **Custom Email Templates** - Per-vendor branding
5. **Scheduled Reports** - Daily/weekly stock summaries
6. **Auto-reorder Suggestions** - AI-based recommendations
7. **Webhook Integration** - Connect to inventory management systems

---

## 📝 API Endpoints

### **Stock Alert Routes:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stock-alerts` | View all vendor alerts |
| GET | `/acknowledge-alert/{id}` | Mark alert as acknowledged |
| GET | `/vendor/home` | Homepage with alert badge count |

---

## 🧪 Testing Checklist

- ✅ Product addition triggers stock check
- ✅ Product update triggers stock check
- ✅ Order placement triggers stock check
- ✅ Email sent for new alerts
- ✅ Badge displays on vendor homepage
- ✅ Alert dashboard shows all alerts
- ✅ Acknowledge functionality works
- ✅ Stock threshold configurable in forms
- ✅ Backward compatibility maintained
- ✅ Vendor ownership validation

---

## 🎓 Conclusion

The **Stock Alert Notifications** feature provides vendors with proactive inventory management, reducing stockouts and improving customer satisfaction. The system is fully automated, user-friendly, and seamlessly integrated into the existing Ekart workflow.

**Status**: ✅ **Feature Fully Implemented and Operational**

---

*Built with ❤️ for Ekart Vendors*
