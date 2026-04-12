import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ========================
// Configuration
// ========================
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '60s', target: 50 },   // Hold at 50 users
    { duration: '15s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<3000'], // 95% < 2s, 99% < 3s
  },
};

// ========================
// Environment Variables
// ========================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const CUSTOMER_EMAIL = __ENV.CUSTOMER_EMAIL || 'customer@test.com';
const CUSTOMER_PASSWORD = __ENV.CUSTOMER_PASSWORD || 'Password@123';
const VENDOR_EMAIL = __ENV.VENDOR_EMAIL || 'vendor@test.com';
const VENDOR_PASSWORD = __ENV.VENDOR_PASSWORD || 'Password@123';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Password@123';

// ========================
// Custom Metrics
// ========================
const endpointFailures = new Rate('endpoint_failures');
const responseTime = new Trend('response_time');

// ========================
// Helper Functions
// ========================

/**
 * Perform login and return { token, userId }
 */
function loginAndGetToken(email, password, userType = 'customer') {
  let endpoint;
  let idField;
  
  if (userType === 'vendor') {
    endpoint = '/api/react/auth/vendor/login';
    idField = 'vendorId';
  } else if (userType === 'admin') {
    endpoint = '/api/react/auth/admin/login';
    idField = 'adminId';
  } else {
    endpoint = '/api/react/auth/customer/login';
    idField = 'customerId';
  }

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

  const success = check(response, {
    [userType + '_login_status_200']: (r) => r.status === 200,
    [userType + '_login_has_token']: (r) => r.json('token') !== null && r.json('token') !== undefined,
    [userType + '_login_response_time_ok']: (r) => r.timings.duration < 3000,
  });

  responseTime.add(response.timings.duration, { endpoint: `auth/${userType}/login` });
  endpointFailures.add(!success);

  if (response.status === 200 && response.json('token')) {
    const token = response.json('token');
    const userId = response.json(idField);
    return { token, userId };
  } else {
    console.error(`${userType} login failed:`, response.status, response.body);
    return null;
  }
}

/**
 * Make authenticated request with Bearer JWT and optional identity header
 */
function makeAuthenticatedRequest(method, endpoint, token, userId, userRole, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Add identity header based on role
  if (userRole === 'CUSTOMER' && userId) {
    headers['X-Customer-Id'] = userId.toString();
  } else if (userRole === 'VENDOR' && userId) {
    headers['X-Vendor-Id'] = userId.toString();
  } else if (userRole === 'DELIVERY' && userId) {
    headers['X-Delivery-Id'] = userId.toString();
  }
  // ADMIN role doesn't need identity header

  const params = { headers };

  let response;
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${endpoint}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${endpoint}`, body ? JSON.stringify(body) : null, params);
  } else if (method === 'PUT') {
    response = http.put(`${BASE_URL}${endpoint}`, body ? JSON.stringify(body) : null, params);
  } else if (method === 'DELETE') {
    response = http.del(`${BASE_URL}${endpoint}`, params);
  }

  const success = check(response, {
    [endpoint + '_status_ok']: (r) => r.status !== 0 && r.status < 500,
    [endpoint + '_response_time_ok']: (r) => r.timings.duration < 3000,
  });

  responseTime.add(response.timings.duration, { endpoint: endpoint });
  endpointFailures.add(!success);

  return response;
}

/**
 * Make public request (no auth required)
 */
function makePublicRequest(method, endpoint) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  let response;
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${endpoint}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${endpoint}`, null, params);
  }

  const success = check(response, {
    [endpoint + '_status_ok']: (r) => r.status !== 0 && r.status < 500,
    [endpoint + '_response_time_ok']: (r) => r.timings.duration < 3000,
  });

  responseTime.add(response.timings.duration, { endpoint: endpoint });
  endpointFailures.add(!success);

  return response;
}

// ========================
// Main VU Script
// ========================
export default function () {
  // ========================
  // 1. AUTHENTICATION
  // ========================
  let customerAuth = null;
  let vendorAuth = null;
  let adminAuth = null;

  group('Authentication - Customer Login', () => {
    customerAuth = loginAndGetToken(CUSTOMER_EMAIL, CUSTOMER_PASSWORD, 'customer');
  });

  sleep(1);

  group('Authentication - Vendor Login', () => {
    vendorAuth = loginAndGetToken(VENDOR_EMAIL, VENDOR_PASSWORD, 'vendor');
  });

  sleep(1);

  group('Authentication - Admin Login', () => {
    adminAuth = loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
  });

  sleep(1);

  // ========================
  // 2. BROWSE & SEARCH
  // ========================
  group('Browse & Search - Get Products', () => {
    makePublicRequest('GET', '/api/react/products');
  });

  sleep(0.5);

  group('Browse & Search - Get Product by ID', () => {
    makePublicRequest('GET', '/api/react/products/1');
  });

  sleep(0.5);

  group('Browse & Search - Get Categories', () => {
    makePublicRequest('GET', '/api/react/products/categories');
  });

  sleep(0.5);

  group('Browse & Search - Get Product Reviews', () => {
    makePublicRequest('GET', '/api/react/products/1/reviews');
  });

  sleep(0.5);

  group('Browse & Search - Get Banners', () => {
    makePublicRequest('GET', '/api/react/banners');
  });

  sleep(0.5);

  group('Browse & Search - Get Home Banners', () => {
    makePublicRequest('GET', '/api/react/home-banners');
  });

  sleep(0.5);

  group('Browse & Search - Search Suggestions', () => {
    makePublicRequest('GET', '/api/search/suggestions?q=shirt');
  });

  sleep(0.5);

  group('Browse & Search - Fuzzy Search', () => {
    makePublicRequest('GET', '/api/search/fuzzy?q=phone');
  });

  sleep(1);

  // ========================
  // 3. CART & CHECKOUT
  // ========================
  if (customerAuth) {
    group('Cart & Checkout - Get Cart', () => {
      makeAuthenticatedRequest('GET', '/api/react/cart', customerAuth.token, customerAuth.userId, 'CUSTOMER');
    });

    sleep(0.5);

    group('Cart & Checkout - Add to Cart', () => {
      makeAuthenticatedRequest('POST', '/api/react/cart/add', customerAuth.token, customerAuth.userId, 'CUSTOMER', {
        productId: 1,
        quantity: 1,
      });
    });

    sleep(0.5);

    group('Cart & Checkout - Update Cart', () => {
      makeAuthenticatedRequest('PUT', '/api/react/cart/update', customerAuth.token, customerAuth.userId, 'CUSTOMER', {
        productId: 1,
        quantity: 2,
      });
    });

    sleep(0.5);

    group('Cart & Checkout - Get Coupons', () => {
      makeAuthenticatedRequest('GET', '/api/react/coupons', customerAuth.token, customerAuth.userId, 'CUSTOMER');
    });

    sleep(0.5);

    group('Cart & Checkout - Get Orders', () => {
      makeAuthenticatedRequest('GET', '/api/react/orders', customerAuth.token, customerAuth.userId, 'CUSTOMER');
    });

    sleep(0.5);

    group('Cart & Checkout - Get Order by ID', () => {
      makeAuthenticatedRequest('GET', '/api/react/orders/1', customerAuth.token, customerAuth.userId, 'CUSTOMER');
    });

    sleep(0.5);

    group('Cart & Checkout - Track Order', () => {
      makeAuthenticatedRequest('GET', '/api/react/orders/1/track', customerAuth.token, customerAuth.userId, 'CUSTOMER');
    });

    sleep(0.5);

    group('Cart & Checkout - Get Wishlist', () => {
      makeAuthenticatedRequest('GET', '/api/react/wishlist', customerAuth.token, customerAuth.userId, 'CUSTOMER');
    });

    sleep(0.5);

    group('Cart & Checkout - Get Spending Summary', () => {
      makeAuthenticatedRequest('GET', '/api/react/spending-summary', customerAuth.token, customerAuth.userId, 'CUSTOMER');
    });

    sleep(1);
  }

  // ========================
  // 4. VENDOR
  // ========================
  if (vendorAuth) {
    group('Vendor - Get Products', () => {
      makeAuthenticatedRequest('GET', '/api/react/vendor/products', vendorAuth.token, vendorAuth.userId, 'VENDOR');
    });

    sleep(0.5);

    group('Vendor - Get Orders', () => {
      makeAuthenticatedRequest('GET', '/api/react/vendor/orders', vendorAuth.token, vendorAuth.userId, 'VENDOR');
    });

    sleep(0.5);

    group('Vendor - Get Stats', () => {
      makeAuthenticatedRequest('GET', '/api/react/vendor/stats', vendorAuth.token, vendorAuth.userId, 'VENDOR');
    });

    sleep(0.5);

    group('Vendor - Get Stock Alerts', () => {
      makeAuthenticatedRequest('GET', '/api/react/vendor/stock-alerts', vendorAuth.token, vendorAuth.userId, 'VENDOR');
    });

    sleep(0.5);

    group('Vendor - Get Sales Report', () => {
      makeAuthenticatedRequest('GET', '/api/react/vendor/sales-report', vendorAuth.token, vendorAuth.userId, 'VENDOR');
    });

    sleep(0.5);

    group('Vendor - Get Profile', () => {
      makeAuthenticatedRequest('GET', '/api/react/vendor/profile', vendorAuth.token, vendorAuth.userId, 'VENDOR');
    });

    sleep(1);
  }

  // ========================
  // 5. ADMIN
  // ========================
  if (adminAuth) {
    group('Admin - Get Users', () => {
      makeAuthenticatedRequest('GET', '/api/react/admin/users', adminAuth.token, adminAuth.userId, 'ADMIN');
    });

    sleep(0.5);

    group('Admin - Get Products', () => {
      makeAuthenticatedRequest('GET', '/api/react/admin/products', adminAuth.token, adminAuth.userId, 'ADMIN');
    });

    sleep(0.5);

    group('Admin - Get Orders', () => {
      makeAuthenticatedRequest('GET', '/api/react/admin/orders', adminAuth.token, adminAuth.userId, 'ADMIN');
    });

    sleep(0.5);

    group('Admin - Get Vendors', () => {
      makeAuthenticatedRequest('GET', '/api/react/admin/vendors', adminAuth.token, adminAuth.userId, 'ADMIN');
    });

    sleep(0.5);

    group('Admin - Get Analytics', () => {
      makeAuthenticatedRequest('GET', '/api/react/admin/analytics', adminAuth.token, adminAuth.userId, 'ADMIN');
    });

    sleep(0.5);

    group('Admin - Get Reviews', () => {
      makeAuthenticatedRequest('GET', '/api/react/admin/reviews', adminAuth.token, adminAuth.userId, 'ADMIN');
    });

    sleep(0.5);

    group('Admin - Get Refunds', () => {
      makeAuthenticatedRequest('GET', '/api/react/admin/refunds', adminAuth.token, adminAuth.userId, 'ADMIN');
    });

    sleep(0.5);

    group('Admin - Get Warehouses', () => {
      makeAuthenticatedRequest('GET', '/api/react/admin/warehouses', adminAuth.token, adminAuth.userId, 'ADMIN');
    });

    sleep(0.5);

    group('Admin - Get Banners', () => {
      makeAuthenticatedRequest('GET', '/api/react/admin/banners', adminAuth.token, adminAuth.userId, 'ADMIN');
    });

    sleep(0.5);

    group('Admin - Get Account Stats', () => {
      makeAuthenticatedRequest('GET', '/api/react/admin/accounts/stats', adminAuth.token, adminAuth.userId, 'ADMIN');
    });

    sleep(1);
  }

  sleep(2);
}
