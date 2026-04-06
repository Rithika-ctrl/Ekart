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