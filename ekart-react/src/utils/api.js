import axios from 'axios';

// ── Base Axios instance ────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach JWT if present ───────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ekart_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── Auth helpers ──────────────────────────────────────────────────────────
export const authApi = {
  /**
   * POST /api/flutter/auth/login
   * Body: { email, password }
   * Returns: { success, token, customer }
   */
  login: (email, password) =>
    api.post('/api/flutter/auth/login', { email, password }),

  /**
   * POST /api/flutter/auth/register
   * Body: { name, email, password, mobile }
   * Returns: { success, message, token, customer }
   */
  register: (name, email, password, mobile) =>
    api.post('/api/flutter/auth/register', { name, email, password, mobile }),

  /**
   * GET /api/flutter/auth/me
   * Header: Authorization: Bearer <token>
   * Returns: { success, customer }
   */
  me: () => api.get('/api/flutter/auth/me'),
};

// ── Token helpers ─────────────────────────────────────────────────────────
export const saveToken = (token, customer) => {
  localStorage.setItem('ekart_token', token);
  localStorage.setItem('ekart_customer', JSON.stringify(customer));
};

export const clearToken = () => {
  localStorage.removeItem('ekart_token');
  localStorage.removeItem('ekart_customer');
};

export const getStoredCustomer = () => {
  try {
    return JSON.parse(localStorage.getItem('ekart_customer'));
  } catch {
    return null;
  }
};

export const isLoggedIn = () => !!localStorage.getItem('ekart_token');

export default api;