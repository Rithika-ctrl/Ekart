# ========================================================================
# EKART - REACT DIRECT DATABASE CONNECTION SETUP
# ========================================================================

## ✅ What's Done

✅ **Database Created**: `ekart` on TiDB Cloud  
✅ **Schema Loaded**: All 27 tables with relationships  
✅ **Seed Data**: Categories pre-populated  
✅ **Backend API**: Node.js Express server (ekart-api.js)  
✅ **React Service**: API connector (ekartApiService.js)  

---

## 📋 Database Tables (27 Total)

1. warehouse
2. category
3. vendor
4. product
5. cart
6. customer
7. item
8. delivery_boy
9. shopping_order
10. address
11. delivery_otp
12. review
13. review_images
14. wishlist
15. coupon
16. refund
17. refund_images
18. stock_alert
19. back_in_stock_subscription
20. warehouse_change_request
21. auto_assign_log
22. tracking_event_log
23. user_activities
24. sales_record
25. sales_report
26. policies
27. banner

---

## 🚀 Installation & Setup

### Step 1: Install Backend Dependencies

```bash
cd C:\Users\whynew.in\OneDrive\Desktop\EKART
npm install
```

Or copy the packages from package-api.json:

```bash
npm install express mysql2 cors dotenv
```

For development (optional):

```bash
npm install --save-dev nodemon
```

---

### Step 2: Start Backend API Server

```bash
node ekart-api.js
```

Or with nodemon (auto-restart on file changes):

```bash
npx nodemon ekart-api.js
```

**Expected Output:**
```
✅ EKART API Server running on http://localhost:3001
📦 Database: ekart (TiDB Cloud)
```

---

### Step 3: Configure React Frontend

#### Update `.env` file in ekart-frontend:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

#### Update `vite.config.js` or `package.json`:

Add proxy configuration (if using Vite):

```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
}
```

---

### Step 4: Use API Service in React Components

#### Import the service:

```javascript
import {
  customerAPI,
  productAPI,
  categoryAPI,
  orderAPI,
  cartAPI,
  reviewAPI,
  wishlistAPI,
  testConnection
} from './services/ekartApiService';
```

#### Example Usage:

```javascript
// Test connection
const status = await testConnection();
console.log(status); // { status: 'Connected', customers: 0 }

// Get all products
const products = await productAPI.getAll();

// Get customer by ID
const customer = await customerAPI.getById(1);

// Create new customer
const newCustomer = await customerAPI.create({
  name: 'John Doe',
  email: 'john@example.com',
  mobile: 9999999999,
  password: 'password123',
  role: 'CUSTOMER'
});

// Add to cart
const item = await cartAPI.addItem({
  cart_id: 1,
  product_id: 1,
  name: 'Product Name',
  unit_price: 100,
  quantity: 2,
  image_link: 'https://...',
  category: 'Electronics'
});

// Get customer orders
const orders = await orderAPI.getCustomerOrders(customerId);

// Add review
const review = await reviewAPI.addReview({
  product_id: 1,
  rating: 5,
  comment: 'Great product!',
  customer_name: 'John Doe'
});

// Add to wishlist
const wishlistItem = await wishlistAPI.addItem({
  customer_id: 1,
  product_id: 1
});
```

---

## 📡 API Endpoints

### Customer Routes
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create new customer

### Product Routes
- `GET /api/products` - Get all approved products
- `GET /api/products/:id` - Get product by ID

### Category Routes
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category with subcategories

### Vendor Routes
- `GET /api/vendors` - Get all vendors

### Order Routes
- `GET /api/orders/customer/:customerId` - Get customer orders
- `POST /api/orders` - Create new order

### Cart Routes
- `GET /api/cart/:cartId` - Get cart items
- `POST /api/cart/add` - Add item to cart

### Review Routes
- `GET /api/reviews/:productId` - Get product reviews
- `POST /api/reviews` - Add new review

### Wishlist Routes
- `GET /api/wishlist/:customerId` - Get wishlist
- `POST /api/wishlist/add` - Add to wishlist

### Test Route
- `GET /api/test` - Test database connection

---

## 🔐 Database Credentials

**Host**: gateway01.ap-southeast-1.prod.aws.tidbcloud.com  
**Port**: 4000  
**Database**: ekart  
**User**: w4CBYUqPKd3K3rd.root  
**Password**: zJDkOwlhrkjaC9pn  

---

## 📁 File Structure

```
EKART/
├── ekart-api.js              # Main backend API server
├── package-api.json          # Backend dependencies
├── .env                       # Environment configuration
├── dataa.sql                  # Database schema
├── ekart-frontend/
│   ├── src/
│   │   └── services/
│   │       └── ekartApiService.js  # React API service
│   └── package.json          # React dependencies
└── README-SETUP.md           # This file
```

---

## 🔧 Troubleshooting

### Issue: "Cannot find module 'mysql2'"
**Solution**: Run `npm install mysql2`

### Issue: "CORS error when calling API"
**Solution**: Make sure CORS is enabled in ekart-api.js (already configured)

### Issue: "Database connection failed"
**Solution**: Check database credentials in .env and TiDB Cloud connectivity

### Issue: "React can't reach API"
**Solution**: Ensure backend is running on port 3001 and frontend is configured with correct URL

---

## 📊 Next Steps

1. **Add Sample Data**: Insert vendors, products, categories via API
2. **Implement Authentication**: Add JWT tokens for secure login
3. **Add Payment Gateway**: Integrate Razorpay for payments
4. **Set up Email Notifications**: Configure SMTP for order updates
5. **Add File Uploads**: Store product images and reviews
6. **Implement Search**: Add full-text search for products
7. **Add Analytics**: Use sales_record table for reporting

---

## ✨ Features Ready to Use

✅ Customer registration & login  
✅ Product browsing & filtering  
✅ Shopping cart management  
✅ Order placement  
✅ Product reviews & ratings  
✅ Wishlist management  
✅ Category hierarchy  
✅ Vendor management  

---

**Version**: 1.0.0  
**Database**: TiDB Cloud (MySQL Compatible)  
**Framework**: Node.js/Express + React  
**Date Created**: April 3, 2026
