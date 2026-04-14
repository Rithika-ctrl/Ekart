export const API_BASE = import.meta.env.VITE_API_BASE || "/api/react";

/**
 * Central fetch wrapper for all /api/flutter/** calls.
 *
 * Sends:
 *   Authorization: Bearer <jwt>   — required by FlutterAuthFilter for protected endpoints
 *   X-Customer-Id / X-Vendor-Id / X-Delivery-Id — kept for backward compat with controllers
 *     that read the header directly. The filter cross-checks these against the token.
 */
export async function apiFetch(path, options = {}, auth = null) {
  // When body is FormData let the browser set Content-Type (multipart + boundary).
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? { ...(options.headers || {}) }
    : { "Content-Type": "application/json", ...(options.headers || {}) };

  if (auth) {
    // JWT — primary auth mechanism validated server-side by FlutterAuthFilter
    if (auth.token) {
      headers["Authorization"] = `Bearer ${auth.token}`;
    }

    // Identity headers — kept for controller convenience; filter verifies they match token
    if (auth.role === "CUSTOMER")  headers["X-Customer-Id"]  = auth.id;
    if (auth.role === "VENDOR")    headers["X-Vendor-Id"]    = auth.id;
    if (auth.role === "ADMIN")     headers["X-Admin-Email"]  = auth.email;
    if (auth.role === "DELIVERY")  headers["X-Delivery-Id"]  = auth.id;
  }

  const res = await fetch(API_BASE + path, { ...options, headers });
  return res.json();
}

/**
 * Simple API client with axios-like interface for backward compatibility.
 * Provides post(), get(), put(), delete() methods that wrap fetch calls.
 */
const api = {
  async post(path, data = {}, config = {}) {
    const url = path.startsWith('http') || path.startsWith('/api') ? path : API_BASE + path;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
      body: JSON.stringify(data),
      ...config,
    });
    return response.json().then(result => ({ data: result, status: response.status }));
  },

  async get(path, config = {}) {
    const url = path.startsWith('http') || path.startsWith('/api') ? path : API_BASE + path;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
      ...config,
    });
    return response.json().then(result => ({ data: result, status: response.status }));
  },

  async put(path, data = {}, config = {}) {
    const url = path.startsWith('http') || path.startsWith('/api') ? path : API_BASE + path;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
      body: JSON.stringify(data),
      ...config,
    });
    return response.json().then(result => ({ data: result, status: response.status }));
  },

  async delete(path, config = {}) {
    const url = path.startsWith('http') || path.startsWith('/api') ? path : API_BASE + path;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
      ...config,
    });
    return response.json().then(result => ({ data: result, status: response.status }));
  },

  async patch(path, data = {}, config = {}) {
    const url = path.startsWith('http') || path.startsWith('/api') ? path : API_BASE + path;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
      body: JSON.stringify(data),
      ...config,
    });
    return response.json().then(result => ({ data: result, status: response.status }));
  },
};

export default api;