import axios from 'axios';

// ── Base Axios instance ────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach JWT if present ───────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ekart_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — auto-clear on 401 ─────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) clearToken();
    return Promise.reject(err);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN / STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export const saveToken = (token, user, role = 'customer') => {
  localStorage.setItem('ekart_token', token);
  localStorage.setItem('ekart_role', role);
  localStorage.setItem('ekart_user', JSON.stringify(user));
  // Legacy key kept for backwards compatibility with existing pages
  if (role === 'customer') localStorage.setItem('ekart_customer', JSON.stringify(user));
  if (role === 'vendor')   localStorage.setItem('ekart_vendor', JSON.stringify(user));
};

export const clearToken = () => {
  ['ekart_token', 'ekart_role', 'ekart_user', 'ekart_customer', 'ekart_vendor'].forEach(
    (k) => localStorage.removeItem(k)
  );
};

export const getStoredUser  = () => { try { return JSON.parse(localStorage.getItem('ekart_user')); } catch { return null; } };
export const getStoredRole  = () => localStorage.getItem('ekart_role') || null;
export const isLoggedIn     = () => !!localStorage.getItem('ekart_token');
export const isCustomer     = () => getStoredRole() === 'customer';
export const isVendor       = () => getStoredRole() === 'vendor';
export const isAdmin        = () => getStoredRole() === 'admin';
export const isDelivery     = () => getStoredRole() === 'delivery';

// Legacy alias
export const getStoredCustomer = getStoredUser;

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — CUSTOMER   /api/flutter/auth/customer/*
// ═══════════════════════════════════════════════════════════════════════════
export const authApi = {
  /** POST /api/flutter/auth/customer/login — body: { email, password } */
  login: (email, password) =>
    api.post('/api/flutter/auth/customer/login', { email, password }),

  /** POST /api/flutter/auth/customer/register — body: { name, email, password, mobile } */
  register: (name, email, password, mobile) =>
    api.post('/api/flutter/auth/customer/register', { name, email, password, mobile }),

  /** GET /api/flutter/auth/me */
  me: () => api.get('/api/flutter/auth/me'),
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — VENDOR   /api/flutter/auth/vendor/*
// ═══════════════════════════════════════════════════════════════════════════
export const vendorAuthApi = {
  /** POST /api/flutter/auth/vendor/login — body: { email, password } */
  login: (email, password) =>
    api.post('/api/flutter/auth/vendor/login', { email, password }),

  /** POST /api/flutter/auth/vendor/register — body: { name, email, password, mobile } */
  register: (name, email, password, mobile) =>
    api.post('/api/flutter/auth/vendor/register', { name, email, password, mobile }),
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — ADMIN   /api/flutter/auth/admin/*
// ═══════════════════════════════════════════════════════════════════════════
export const adminAuthApi = {
  /** POST /api/flutter/auth/admin/login — body: { email, password } */
  login: (email, password) =>
    api.post('/api/flutter/auth/admin/login', { email, password }),
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — DELIVERY   /api/flutter/auth/delivery/*
// ═══════════════════════════════════════════════════════════════════════════
export const deliveryAuthApi = {
  /** POST /api/flutter/auth/delivery/login — body: { email, password } */
  login: (email, password) =>
    api.post('/api/flutter/auth/delivery/login', { email, password }),
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTS   /api/flutter/products
// ═══════════════════════════════════════════════════════════════════════════
export const productsApi = {
  /** GET /api/flutter/products?category=&search=&page=&size= */
  list: (params = {}) => api.get('/api/flutter/products', { params }),

  /** GET /api/flutter/products/:id */
  get: (id) => api.get(`/api/flutter/products/${id}`),

  /** GET /api/flutter/products/:id/reviews */
  reviews: (id) => api.get(`/api/flutter/products/${id}/reviews`),

  /** GET /api/flutter/products/categories */
  categories: () => api.get('/api/flutter/products/categories'),
};

// ═══════════════════════════════════════════════════════════════════════════
// CART   /api/flutter/cart   — header: X-Customer-Id
// ═══════════════════════════════════════════════════════════════════════════
const customerHeader = () => {
  const u = getStoredUser();
  const id = u?.customerId ?? u?.id ?? (u?.customer && (u.customer.id ?? u.customer.customerId));
  return id ? { 'X-Customer-Id': id } : {};
};

export const cartApi = {
  /** GET /api/flutter/cart */
  get: () => api.get('/api/flutter/cart', { headers: customerHeader() }),

  /** POST /api/flutter/cart/add — body: { productId, quantity } */
  add: (productId, quantity = 1) =>
    api.post('/api/flutter/cart/add', { productId, quantity }, { headers: customerHeader() }),

  /** DELETE /api/flutter/cart/remove/:productId */
  remove: (productId) =>
    api.delete(`/api/flutter/cart/remove/${productId}`, { headers: customerHeader() }),

  /** PUT /api/flutter/cart/update — body: { productId, quantity } */
  update: (productId, quantity) =>
    api.put('/api/flutter/cart/update', { productId, quantity }, { headers: customerHeader() }),
};

// ═══════════════════════════════════════════════════════════════════════════
// ORDERS   /api/flutter/orders
// ═══════════════════════════════════════════════════════════════════════════
export const ordersApi = {
  /** POST /api/flutter/orders/place */
  place: (body) =>
    api.post('/api/flutter/orders/place', body, { headers: customerHeader() }),

  /** GET /api/flutter/orders */
  list: () => api.get('/api/flutter/orders', { headers: customerHeader() }),

  /** GET /api/flutter/orders/:id */
  get: (id) => api.get(`/api/flutter/orders/${id}`, { headers: customerHeader() }),

  /** POST /api/flutter/orders/:id/cancel */
  cancel: (id) =>
    api.post(`/api/flutter/orders/${id}/cancel`, {}, { headers: customerHeader() }),

  /** POST /api/flutter/orders/:id/reorder */
  reorder: (id) =>
    api.post(`/api/flutter/orders/${id}/reorder`, {}, { headers: customerHeader() }),
};

// ═══════════════════════════════════════════════════════════════════════════
// WISHLIST   /api/flutter/wishlist
// ═══════════════════════════════════════════════════════════════════════════
export const wishlistApi = {
  /** GET /api/flutter/wishlist */
  get: () => api.get('/api/flutter/wishlist', { headers: customerHeader() }),

  /** GET /api/flutter/wishlist/ids */
  ids: () => api.get('/api/flutter/wishlist/ids', { headers: customerHeader() }),

  /** POST /api/flutter/wishlist/toggle — body: { productId } */
  toggle: (productId) =>
    api.post('/api/flutter/wishlist/toggle', { productId }, { headers: customerHeader() }),
};

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE   /api/flutter/profile
// ═══════════════════════════════════════════════════════════════════════════
export const profileApi = {
  /** GET /api/flutter/profile */
  get: () => api.get('/api/flutter/profile', { headers: customerHeader() }),

  /** PUT /api/flutter/profile/update */
  update: (body) =>
    api.put('/api/flutter/profile/update', body, { headers: customerHeader() }),

  /** PUT /api/flutter/profile/change-password */
  changePassword: (body) =>
    api.put('/api/flutter/profile/change-password', body, { headers: customerHeader() }),

  /** POST /api/flutter/profile/address/add */
  addAddress: (body) =>
    api.post('/api/flutter/profile/address/add', body, { headers: customerHeader() }),

  /** DELETE /api/flutter/profile/address/:id/delete */
  deleteAddress: (id) =>
    api.delete(`/api/flutter/profile/address/${id}/delete`, { headers: customerHeader() }),
};

// ═══════════════════════════════════════════════════════════════════════════
// REVIEWS   /api/flutter/reviews
// ═══════════════════════════════════════════════════════════════════════════
export const reviewsApi = {
  /** POST /api/flutter/reviews/add — body: { productId, rating, comment } */
  add: (body) =>
    api.post('/api/flutter/reviews/add', body, { headers: customerHeader() }),
};

// ═══════════════════════════════════════════════════════════════════════════
// SPENDING   /api/flutter/spending-summary
// ═══════════════════════════════════════════════════════════════════════════
export const spendingApi = {
  /** GET /api/flutter/spending-summary */
  summary: () =>
    api.get('/api/flutter/spending-summary', { headers: customerHeader() }),
};

// ═══════════════════════════════════════════════════════════════════════════
// REFUNDS   /api/flutter/refund
// ═══════════════════════════════════════════════════════════════════════════
export const refundApi = {
  /** POST /api/flutter/refund/request — body: { orderId, reason, ... } */
  request: (body) =>
    api.post('/api/flutter/refund/request', body, { headers: customerHeader() }),

  /** GET /api/flutter/refund/status/:orderId */
  status: (orderId) =>
    api.get(`/api/flutter/refund/status/${orderId}`, { headers: customerHeader() }),
};

// ═══════════════════════════════════════════════════════════════════════════
// VENDOR API   /api/flutter/vendor/*   — header: X-Vendor-Id
// ═══════════════════════════════════════════════════════════════════════════
const vendorHeader = () => {
  const u = getStoredUser();
  return u?.vendorId ? { 'X-Vendor-Id': u.vendorId } : {};
};

export const vendorApi = {
  /** GET /api/flutter/vendor/products */
  products: () => api.get('/api/flutter/vendor/products', { headers: vendorHeader() }),

  /** GET /api/flutter/vendor/orders */
  orders: () => api.get('/api/flutter/vendor/orders', { headers: vendorHeader() }),

  /** GET /api/flutter/vendor/stats */
  stats: () => api.get('/api/flutter/vendor/stats', { headers: vendorHeader() }),

  /** POST /api/flutter/vendor/products/add */
  addProduct: (body) =>
    api.post('/api/flutter/vendor/products/add', body, { headers: vendorHeader() }),

  /** PUT /api/flutter/vendor/products/:id/update */
  updateProduct: (id, body) =>
    api.put(`/api/flutter/vendor/products/${id}/update`, body, { headers: vendorHeader() }),

  /** DELETE /api/flutter/vendor/products/:id/delete */
  deleteProduct: (id) =>
    api.delete(`/api/flutter/vendor/products/${id}/delete`, { headers: vendorHeader() }),

  /** GET /api/flutter/vendor/sales-report */
  salesReport: () =>
    api.get('/api/flutter/vendor/sales-report', { headers: vendorHeader() }),

  /** GET /api/flutter/vendor/profile */
  profile: () => api.get('/api/flutter/vendor/profile', { headers: vendorHeader() }),

  /** PUT /api/flutter/vendor/profile/update */
  updateProfile: (body) =>
    api.put('/api/flutter/vendor/profile/update', body, { headers: vendorHeader() }),

  /** GET /api/flutter/vendor/stock-alerts */
  stockAlerts: () =>
    api.get('/api/flutter/vendor/stock-alerts', { headers: vendorHeader() }),

  /** POST /api/flutter/vendor/stock-alerts/:id/acknowledge */
  acknowledgeAlert: (id) =>
    api.post(`/api/flutter/vendor/stock-alerts/${id}/acknowledge`, {}, { headers: vendorHeader() }),
};

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN API   /api/flutter/admin/*
// ═══════════════════════════════════════════════════════════════════════════
export const adminApi = {
  /** GET /api/flutter/admin/users */
  users: () => api.get('/api/flutter/admin/users'),

  /** POST /api/flutter/admin/customers/:id/toggle-active */
  toggleCustomer: (id) =>
    api.post(`/api/flutter/admin/customers/${id}/toggle-active`),

  /** POST /api/flutter/admin/vendors/:id/toggle-active */
  toggleVendor: (id) =>
    api.post(`/api/flutter/admin/vendors/${id}/toggle-active`),

  /** GET /api/flutter/admin/products */
  products: () => api.get('/api/flutter/admin/products'),

  /** POST /api/flutter/admin/products/:id/approve */
  approveProduct: (id) =>
    api.post(`/api/flutter/admin/products/${id}/approve`),

  /** POST /api/flutter/admin/products/:id/reject */
  rejectProduct: (id) =>
    api.post(`/api/flutter/admin/products/${id}/reject`),

  /** GET /api/flutter/admin/orders */
  orders: () => api.get('/api/flutter/admin/orders'),

  /** POST /api/flutter/admin/orders/:id/status — body: { status } */
  updateOrderStatus: (id, status) =>
    api.post(`/api/flutter/admin/orders/${id}/status`, { status }),

  /** GET /api/flutter/admin/vendors */
  vendors: () => api.get('/api/flutter/admin/vendors'),
};

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH   /api/flutter/products?search=
// ═══════════════════════════════════════════════════════════════════════════
export const searchApi = {
  /** GET /api/flutter/products?search=query&category= */
  search: (query, category = '') =>
    api.get('/api/flutter/products', { params: { search: query, category } }),
};

export default api;