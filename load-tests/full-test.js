import http from 'k6/http';
import{ check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// ========================================================================
// EKART FULL TEST SUITE
// Comprehensive testing of all API endpoints with functional and load tests
// ========================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const THINK_TIME = 0.5; // seconds between requests

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');

// Test configuration
export const options = {
  // Functional test: run with 1 VU for a quick execution
  stages: [
    { duration: '10s', target: 1 }, // Functional test with 1 VU
    { duration: '5s', target: 0 },   // Cool down
    // Load test stages: 50 VUs with ramp up/down
    { duration: '15s', target: 50 }, // Ramp up
    { duration: '60s', target: 50 }, // Hold
    { duration: '15s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95th percentile under 2 seconds
    http_req_failed: ['rate<0.1'],       // Error rate < 10%
    'errors': ['rate<0.1'],               // Custom error rate  
    'success': ['rate>0.9'],              // Success rate > 90%
  },
};

// Global variables for test data
let customerId = null;
let vendorId = null;
let adminId = null;
let customerToken = null;
let vendorToken = null;
let adminToken = null;

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

function login(endpoint, email, password) {
  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(`${BASE_URL}${endpoint}`, payload, params);
  
  check(response, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => r.json('token') !== '',
  });

  if (response.status === 200) {
    return response.json('token');
  }
  return null;
}

function authHeader(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ========================================================================
// SETUP PHASE - login to get tokens
// ========================================================================

export function setup() {
  console.log('🔥 EKART FULL TEST SUITE Starting');
  
  const setupData = {};

  // Login as customer
  console.log('Logging in as customer...');
  setupData.customerToken = login(
    '/api/react/auth/customer/login',
    'customer1@gmail.com',
    'Password@123'
  );

  // Login as vendor
  console.log('Logging in as vendor...');
  setupData.vendorToken = login(
    '/api/react/auth/vendor/login',
    'sanjaye@gmail.com',
    'Password@123'
  );

  // Login as admin
  console.log('Logging in as admin...');
  setupData.adminToken = login(
    '/api/react/auth/admin/login',
    'admin@ekart.com',
    'Admin@Test1234!'
  );

  // Seed test data if not already seeded
  if (setupData.adminToken) {
    console.log('Seeding test data...');
    const seedResponse = http.get(`${BASE_URL}/admin/test-data/load`);
    check(seedResponse, {
      'test data load status 200': (r) => r.status === 200,
    });
  }

  return setupData;
}

// ========================================================================
// TEST PHASES
// ========================================================================

export default function (data) {
  const vus = __VU;
  const iter = __ITER;
  const stage = __STAGE;

  // Use provided tokens from setup
  let cToken = data.customerToken || null;
  let vToken = data.vendorToken || null;
  let aToken = data.adminToken || null;

  // ====== PHASE 1: AUTH TESTS (first iteration only) ======
  if (iter === 0) {
    group('AUTH Tests', () => {
      // Valid customer login
      let res = http.post(`${BASE_URL}/api/react/auth/customer/login`, 
        JSON.stringify({ email: 'customer1@gmail.com', password: 'Password@123' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      check(res, {
        'customer login success': (r) => r.status === 200,
        'customer login has token': (r) => r.json('token') !== undefined,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Invalid password
      res = http.post(`${BASE_URL}/api/react/auth/customer/login`,
        JSON.stringify({ email: 'customer1@gmail.com', password: 'wrong' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      check(res, {
        'invalid password returns 401': (r) => r.status === 401,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Vendor login
      res = http.post(`${BASE_URL}/api/react/auth/vendor/login`,
        JSON.stringify({ email: 'sanjaye@gmail.com', password: 'Password@123' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      check(res, {
        'vendor login success': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Admin login
      res = http.post(`${BASE_URL}/api/react/auth/admin/login`,
        JSON.stringify({ email: 'admin@ekart.com', password: 'Admin@Test1234!' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      check(res, {
        'admin login success': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      sleep(THINK_TIME);
    });
  }

  // ====== PHASE 2: BROWSE TESTS (public endpoints, no auth needed) ======
  group('BROWSE Tests', () => {
    // Get all products
    let res = http.get(`${BASE_URL}/api/react/products`);
    check(res, {
      'get products status 200': (r) => r.status === 200,
      'get products returns array': (r) => Array.isArray(r.json()),
    }) ? successRate.add(1) : (errorRate.add(1));

    // Get single product
    res = http.get(`${BASE_URL}/api/react/products/1`);
    check(res, {
      'get product by id status 200': (r) => r.status === 200,
    }) ? successRate.add(1) : (errorRate.add(1));

    // Get categories
    res = http.get(`${BASE_URL}/api/react/products/categories`);
    check(res, {
      'get categories status 200': (r) => r.status === 200,
    }) ? successRate.add(1) : (errorRate.add(1));

    // Get product reviews
    res = http.get(`${BASE_URL}/api/react/products/1/reviews`);
    check(res, {
      'get reviews status 200': (r) => r.status === 200,
    }) ? successRate.add(1) : (errorRate.add(1));

    // Get banners
    res = http.get(`${BASE_URL}/api/react/banners`);
    check(res, {
      'get banners status 200': (r) => r.status === 200,
    }) ? successRate.add(1) : (errorRate.add(1));

    // Get home banners
    res = http.get(`${BASE_URL}/api/react/home-banners`);
    check(res, {
      'get home banners status 200': (r) => r.status === 200,
    }) ? successRate.add(1) : (errorRate.add(1));

    // Search suggestions
    res = http.get(`${BASE_URL}/api/search/suggestions?q=shirt`);
    check(res, {
      'search suggestions status 200': (r) => r.status === 200,
    }) ? successRate.add(1) : (errorRate.add(1));

    // Fuzzy search
    res = http.get(`${BASE_URL}/api/search/fuzzy?q=phone`);
    check(res, {
      'fuzzy search status 200': (r) => r.status === 200,
    }) ? successRate.add(1) : (errorRate.add(1));

    sleep(THINK_TIME);
  });

  // ====== PHASE 3: CUSTOMER TESTS (requires auth) ======
  if (cToken) {
    group('CUSTOMER Tests', () => {
      const headers = authHeader(cToken);

      // Get cart
      let res = http.get(`${BASE_URL}/api/react/cart`, { headers });
      check(res, {
        'get cart status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Add to cart
      res = http.post(`${BASE_URL}/api/react/cart/add`,
        JSON.stringify({ productId: 1, quantity: 1 }),
        { headers }
      );
      check(res, {
        'add to cart status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Update cart
      res = http.put(`${BASE_URL}/api/react/cart/update`,
        JSON.stringify({ productId: 1, quantity: 2 }),
        { headers }
      );
      check(res, {
        'update cart status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get coupons
      res = http.get(`${BASE_URL}/api/react/coupons`, { headers });
      check(res, {
        'get coupons status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get orders
      res = http.get(`${BASE_URL}/api/react/orders`, { headers });
      check(res, {
        'get orders status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get wishlist
      res = http.get(`${BASE_URL}/api/react/wishlist`, { headers });
      check(res, {
        'get wishlist status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Toggle wishlist
      res = http.post(`${BASE_URL}/api/react/wishlist/toggle`,
        JSON.stringify({ productId: 1 }),
        { headers }
      );
      check(res, {
        'toggle wishlist status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get wishlist IDs
      res = http.get(`${BASE_URL}/api/react/wishlist/ids`, { headers });
      check(res, {
        'get wishlist ids status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get profile
      res = http.get(`${BASE_URL}/api/react/profile`, { headers });
      check(res, {
        'get profile status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get spending summary
      res = http.get(`${BASE_URL}/api/react/spending-summary`, { headers });
      check(res, {
        'get spending summary status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      sleep(THINK_TIME);
    });
  }

  // ====== PHASE 4: VENDOR TESTS (requires vendor auth) ======
  if (vToken) {
    group('VENDOR Tests', () => {
      const headers = authHeader(vToken);

      // Get vendor products
      let res = http.get(`${BASE_URL}/api/react/vendor/products`, { headers });
      check(res, {
        'get vendor products status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get vendor orders
      res = http.get(`${BASE_URL}/api/react/vendor/orders`, { headers });
      check(res, {
        'get vendor orders status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get vendor stats
      res = http.get(`${BASE_URL}/api/react/vendor/stats`, { headers });
      check(res, {
        'get vendor stats status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get stock alerts
      res = http.get(`${BASE_URL}/api/react/vendor/stock-alerts`, { headers });
      check(res, {
        'get stock alerts status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get sales report
      res = http.get(`${BASE_URL}/api/react/vendor/sales-report`, { headers });
      check(res, {
        'get sales report status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get vendor profile
      res = http.get(`${BASE_URL}/api/react/vendor/profile`, { headers });
      check(res, {
        'get vendor profile status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get vendor categories
      res = http.get(`${BASE_URL}/api/react/vendor/categories`, { headers });
      check(res, {
        'get vendor categories status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      sleep(THINK_TIME);
    });
  }

  // ====== PHASE 5: ADMIN TESTS (requires admin auth) ======
  if (aToken) {
    group('ADMIN Tests', () => {
      const headers = authHeader(aToken);

      // Get users
      let res = http.get(`${BASE_URL}/api/react/admin/users`, { headers });
      check(res, {
        'get admin users status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get admin products
      res = http.get(`${BASE_URL}/api/react/admin/products`, { headers });
      check(res, {
        'get admin products status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get admin orders
      res = http.get(`${BASE_URL}/api/react/admin/orders`, { headers });
      check(res, {
        'get admin orders status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get admin vendors
      res = http.get(`${BASE_URL}/api/react/admin/vendors`, { headers });
      check(res, {
        'get admin vendors status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get analytics
      res = http.get(`${BASE_URL}/api/react/admin/analytics`, { headers });
      check(res, {
        'get analytics status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get reviews
      res = http.get(`${BASE_URL}/api/react/admin/reviews`, { headers });
      check(res, {
        'get admin reviews status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get refunds
      res = http.get(`${BASE_URL}/api/react/admin/refunds`, { headers });
      check(res, {
        'get refunds status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get warehouses
      res = http.get(`${BASE_URL}/api/react/admin/warehouses`, { headers });
      check(res, {
        'get warehouses status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get banners
      res = http.get(`${BASE_URL}/api/react/admin/banners`, { headers });
      check(res, {
        'get admin banners status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get coupons
      res = http.get(`${BASE_URL}/api/react/admin/coupons`, { headers });
      check(res, {
        'get admin coupons status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get account stats
      res = http.get(`${BASE_URL}/api/react/admin/accounts/stats`, { headers });
      check(res, {
        'get accounts stats status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      // Get delivery boys
      res = http.get(`${BASE_URL}/api/react/admin/delivery-boys`, { headers });
      check(res, {
        'get delivery boys status 200': (r) => r.status === 200,
      }) ? successRate.add(1) : (errorRate.add(1));

      sleep(THINK_TIME);
    });
  }

  sleep(THINK_TIME);
}

// ========================================================================
// TEARDOWN PHASE - generate final report
// ========================================================================

export function teardown(data) {
  console.log('🔥 EKART FULL TEST SUITE Complete');
  console.log(`
====================================
EKART FULL TEST SUMMARY
====================================
Total VUs used: ${__VU}
Total iterations: ${__ITER}
Success rate: ${(successRate.value * 100).toFixed(1)}%
Error rate: ${(errorRate.value * 100).toFixed(1)}%
====================================
  `);
}
