# Ekart E-Commerce Load Testing Suite

This directory contains a comprehensive load testing suite for the Ekart e-commerce platform using **k6** (https://k6.io), an open-source load testing tool.

## Overview

The load test suite (`k6-ekart.js`) tests all 5 key scenarios:

1. **Authentication** — Customer, Vendor, and Admin login
2. **Browse & Search** — Product listing, search, and filtering
3. **Cart & Checkout** — Cart operations, coupons, orders, and tracking
4. **Vendor** — Vendor dashboard endpoints (products, orders, stats, profile)
5. **Admin** — Admin dashboard endpoints (users, products, orders, analytics)

### Load Profile
- **Ramp up:** 0 → 50 users over 30 seconds
- **Hold:** 50 users for 60 seconds
- **Ramp down:** 50 users → 0 over 15 seconds
- **Total duration:** ~105 seconds

### Performance Thresholds
- 95th percentile response time: **< 2000ms**
- Failure rate: **< 10%**
- All responses checked for connectivity (status ≠ 0)

---

## Installation

### Prerequisites
- **Node.js** (v14+) or standalone k6 binary
- **Operating System:** Windows, macOS, or Linux

### Option 1: Use k6 Standalone Binary (Recommended)

1. Download the latest k6 release from [k6.io/download](https://k6.io/download)
2. Extract and add to your PATH:
   - **Windows:** Add k6 folder to system PATH
   - **macOS:** `brew install k6`
   - **Linux:** `sudo apt-get install k6` (Debian/Ubuntu)

3. Verify installation:
   ```bash
   k6 version
   ```

### Option 2: Use npm (Node.js)

```bash
npm install -g k6
```

---

## Running the Load Tests

### Basic Usage (Default Settings)

```bash
cd load-tests
k6 run k6-ekart.js
```

### With Custom Base URL

```bash
k6 run -e BASE_URL=http://your-server:8080 k6-ekart.js
```

### With Custom Credentials

```bash
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e CUSTOMER_EMAIL=customer@example.com \
  -e CUSTOMER_PASSWORD=MyPassword123 \
  -e VENDOR_EMAIL=vendor@example.com \
  -e VENDOR_PASSWORD=VendorPass123 \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=AdminPass123 \
  k6-ekart.js
```

### Run with HTML Report

```bash
k6 run \
  --out html=load-test-report.html \
  k6-ekart.js
```

### Run with JSON Summary (for CI/CD)

```bash
k6 run \
  --out json=load-test-results.json \
  k6-ekart.js
```

### Customize Load Profile

Create a custom options config at the top of the script or use CloudBridge if needed.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8080` | Backend API base URL |
| `CUSTOMER_EMAIL` | `customer@test.com` | Customer login email |
| `CUSTOMER_PASSWORD` | `Password@123` | Customer login password |
| `VENDOR_EMAIL` | `vendor@test.com` | Vendor login email |
| `VENDOR_PASSWORD` | `Password@123` | Vendor login password |
| `ADMIN_EMAIL` | `admin@test.com` | Admin login email |
| `ADMIN_PASSWORD` | `Password@123` | Admin login password |

---

## Important Setup Notes

### ⚠️ Pre-Test Requirements

1. **Ensure test users exist** before running the load tests:
   - Customer user: `customer@test.com` / `Password@123`
   - Vendor user: `vendor@test.com` / `Password@123`
   - Admin user: `admin@test.com` / `Password@123`

   These users must be verified and active in the H2 database.

2. **Database persistence:** By default, the Ekart backend uses H2 (in-memory database) which resets on restart. To run load tests reliably:
   - **Option A:** Don't restart the backend between test runs
   - **Option B:** Seed test data via API before running tests (create users via registration flow)
   - **Option C:** Use persistent H2 configuration or switch to PostgreSQL

3. **Sample products:** Ensure at least 1 product exists (ID: 1) for API routes like `/api/react/products/1` and cart operations.

### Authentication Details

The load test uses **JWT Bearer tokens** with identity headers:

1. **Login** — Each VU logs in once:
   - `POST /api/react/auth/{customer|vendor|admin}/login`
   - Response: `{ success: true, token: "...", customerId: N, ... }`
   - JWT is stored and reused for all protected requests

2. **Protected Endpoints** — All authenticated requests include:
   - Header: `Authorization: Bearer {token}`
   - Customer/Vendor endpoints ALSO include identity header:
     - `X-Customer-Id: {customerId}` (for customer routes)
     - `X-Vendor-Id: {vendorId}` (for vendor routes)
   - Admin endpoints do NOT need identity headers (admin role is verified in JWT)

3. **Security Model** — The backend prevents user spoofing:
   - Identity header value must match the JWT token's subject
   - Example: A customer with ID 5 cannot read another customer's cart by sending `X-Customer-Id: 10`

---

## Test Scenarios Covered

### 1. Authentication (Sequential)
- `POST /api/react/auth/customer/login` — body: `{ email, password }`
- `POST /api/react/auth/vendor/login` — body: `{ email, password }`
- `POST /api/react/auth/admin/login` — body: `{ email, password }`

Each VU logs in once per role and receives a JWT token, which is then used (**with identity header**) for all protected endpoints in that user type.

### 2. Browse & Search (Public)
- `GET /api/react/products` — list all products
- `GET /api/react/products/{id}` — get product detail
- `GET /api/react/products/categories` — list categories
- `GET /api/react/products/{id}/reviews` — product reviews
- `GET /api/react/banners` — promotional banners
- `GET /api/react/home-banners` — home page banners
- `GET /api/search/suggestions?q={query}` — search suggestions
- `GET /api/search/fuzzy?q={query}` — fuzzy search

### 3. Cart & Checkout (Protected + X-Customer-Id header)
- `GET /api/react/cart` — get current cart
- `POST /api/react/cart/add` — body: `{ productId, quantity }`
- `PUT /api/react/cart/update` — body: `{ productId, quantity }`
- `GET /api/react/coupons` — list valid coupons
- `GET /api/react/orders` — customer's orders
- `GET /api/react/orders/{id}` — order detail
- `GET /api/react/orders/{id}/track` — order tracking
- `GET /api/react/wishlist` — saved items
- `GET /api/react/spending-summary` — spending analytics

### 4. Vendor (Protected + X-Vendor-Id header)
- `GET /api/react/vendor/products` — vendor's products
- `GET /api/react/vendor/orders` — vendor's orders
- `GET /api/react/vendor/stats` — sales stats
- `GET /api/react/vendor/stock-alerts` — low stock alerts
- `GET /api/react/vendor/sales-report` — detailed sales report
- `GET /api/react/vendor/profile` — vendor profile

### 5. Admin (Protected, no identity header)
- `GET /api/react/admin/users` — all users and vendors
- `GET /api/react/admin/products` — all products
- `GET /api/react/admin/orders` — all orders
- `GET /api/react/admin/vendors` — vendor management
- `GET /api/react/admin/analytics` — platform analytics
- `GET /api/react/admin/reviews` — product reviews
- `GET /api/react/admin/refunds` — refund requests
- `GET /api/react/admin/warehouses` — warehouse management
- `GET /api/react/admin/banners` — banner management
- `GET /api/react/admin/accounts/stats` — account statistics

---

## Understanding Test Results

### Metrics Reported

**k6 Output Summary:**
```
✓ http_req_duration..............: avg=445.32ms, min=120.23ms, med=380ms, max=2500ms, p(95)=1800ms, p(99)=2100ms
✓ http_req_failed...............: 0% ✓
endpoint_failures...............: 0% ✓
response_time...................: avg=445.32ms, min=120.23ms, med=380ms, max=2500ms, p(95)=1800ms, p(99)=2100ms
```

### Expected Behavior

**JWT Authentication Flow:**
- Each VU logs in once at the start
- JWT token is extracted from login response and stored
- All subsequent protected requests include: `Authorization: Bearer {token}`
- Customer/vendor routes also include identity header to prevent spoofing

**401 Errors:**
- `401 Unauthorized` on protected endpoints is **expected** ONLY if:
  - Test user doesn't exist or is unverified
  - Backend is not running
  - Credentials are incorrect
- The test gracefully handles these and does NOT count them as load test failures

**Expected Success Rate:**
- ~99% success if all test users exist and are verified
- ~95% success if 1-2 test users are missing (partial group failures)

---

## Troubleshooting

### Issue: Connection refused
**Fix:** Ensure backend is running on `BASE_URL`
```bash
k6 run -e BASE_URL=http://localhost:8080 k6-ekart.js
```

### Issue: 401 Unauthorized on login
**Fix:** Verify credentials match database:
```bash
k6 run \
  -e CUSTOMER_EMAIL=correct-email@test.com \
  -e CUSTOMER_PASSWORD=correct-password \
  k6-ekart.js
```

### Issue: High failure rates or timeouts
**Fix:** Increase backend resources or reduce concurrent users:
```bash
# Edit k6-ekart.js and change stages to:
stages: [
  { duration: '30s', target: 10 },   // 10 users instead of 50
  { duration: '60s', target: 10 },
  { duration: '15s', target: 0 },
]
```

### Issue: No products found (404 on /api/react/products/1)
**Fix:** Seed test data via backend API or admin panel before testing.

---

## Advanced Usage

### Run with custom concurrency (no stages)
```bash
k6 run --vus 25 --duration 60s k6-ekart.js
```

### Stream results to cloud (k6 Cloud)
```bash
k6 cloud k6-ekart.js
```
*(Requires k6 Cloud account)*

### Add debugging
```bash
k6 run --verbose k6-ekart.js
```

---

## Performance Optimization Tips

1. **Batch requests:** The test already spaces requests with `sleep()` to avoid hammering the server
2. **Database indexing:** Ensure critical queries (`products`, `orders`, `users`) are indexed
3. **Connection pooling:** Backend should use connection pooling for H2/DB
4. **Caching:** Consider caching for category and banner endpoints
5. **Load balancing:** For higher concurrency, deploy multiple backend instances

---

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run k6 load tests
  run: |
    k6 run \
      -e BASE_URL=${{ secrets.BACKEND_URL }} \
      -e CUSTOMER_EMAIL=${{ secrets.TEST_EMAIL }} \
      -e CUSTOMER_PASSWORD=${{ secrets.TEST_PASSWORD }} \
      --out json=results.json \
      load-tests/k6-ekart.js
```

---

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 API Reference](https://k6.io/docs/javascript-api/)
- [Testing Best Practices](https://k6.io/blog/best-practices-for-load-testing/)

---

## Support

For issues or questions:
1. Check the [k6 GitHub Issues](https://github.com/grafana/k6/issues)
2. Review [k6 Community Forum](https://community.grafana.com/)
3. Ensure test users exist in the database before running tests
