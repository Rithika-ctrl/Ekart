/**
 * Prefix backend routes with the configured API base URL (CORS mode).
 *
 * - If `VITE_API_BASE_URL` is set (e.g. http://localhost:8080), we return an absolute URL.
 * - If it is not set, we return the original path (proxy / same-origin mode).
 */
export function backendUrl(path) {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) return path;
  if (!path) return base;
  // If already absolute, keep it.
  if (/^https?:\/\//i.test(path)) return path;
  return `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;
}

