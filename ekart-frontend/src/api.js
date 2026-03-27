export const API_BASE = "http://localhost:8080/api/flutter";

export async function apiFetch(path, options = {}, auth = null) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (auth) {
    if (auth.role === "CUSTOMER")  headers["X-Customer-Id"]  = auth.id;
    if (auth.role === "VENDOR")    headers["X-Vendor-Id"]    = auth.id;
    if (auth.role === "ADMIN")     headers["X-Admin-Email"]  = auth.email;
    if (auth.role === "DELIVERY")  headers["X-Delivery-Id"]  = auth.id;
  }
  const res = await fetch(API_BASE + path, { ...options, headers });
  return res.json();
}