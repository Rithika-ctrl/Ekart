# Ekart React — Fixes Applied

## Fix 1 — `vite.config.js`: Removed invalid `historyApiFallback` option
**Root cause of 404 on page refresh / direct URL access**

`historyApiFallback` is a webpack-dev-server option. Vite ignores it silently.
Without it, refreshing `/profile` or typing `/vendor/login` directly hits the dev
server for a real file — which doesn't exist — so it returns 404.

Vite handles SPA fallback automatically in dev mode with no extra config needed.

## Fix 2 — `public/_redirects`: Added SPA fallback for production builds
After `npm run build`, the `dist/` folder is a static site. Deploying it to
Netlify/Vercel without this file means every route other than `/` returns 404.

```
/* /index.html 200
```

## Fix 3 — `window.location.href` → `navigate()` in 4 pages
Hard navigation via `window.location.href` triggers a full browser page load,
losing all React state and sometimes causing 404s on the server.

| File | Line | Old | Fixed |
|------|------|-----|-------|
| `TrackOrders.jsx` | 473 | `window.location.href = '/view-cart'` | `navigate('/cart')` |
| `OrderHistory.jsx` | 765 | `window.location.href = '/customer/view-cart'` | `navigate('/cart')` *(path corrected too)* |
| `AddressPage.jsx` | 106 | `window.location.href = '/payment'` | `navigate('/payment')` |
| `CustomerHome.jsx` | 1212 | `window.location.href = '/product/${id}'` | `navigate('/product/${id}')` |

Also added `const navigate = useNavigate()` hook declaration inside each component.

## Fix 4 — `authFetch()` helper: Raw `fetch()` calls now send JWT token
11 pages were using the browser's raw `fetch()` instead of the axios instance
in `api.js`. Raw `fetch()` doesn't go through the request interceptor, so the
`Authorization: Bearer <token>` header was never sent — causing 401 errors on
protected endpoints.

**Added to `src/utils/api.js`:**
```js
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('ekart_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...options, headers });
}
```

**Pages updated** (raw `fetch()` → `authFetch()`):
`AdminPolicies`, `AdminUserSearch`, `AdminViewProducts`, `CustomerViewProducts`,
`OrderHistory`, `Payment`, `Policies`, `ProductDetail`, `TrackOrders`,
`ViewCart`, `Wishlist`

---

## Summary

| # | Problem | Impact | Fixed In |
|---|---------|--------|----------|
| 1 | `historyApiFallback` ignored by Vite | 404 on every page refresh | `vite.config.js` |
| 2 | No SPA fallback for production | 404 on all routes when deployed | `public/_redirects` |
| 3 | `window.location.href` hard reloads | State loss, broken navigation | 4 page files |
| 4 | Raw `fetch()` without JWT header | 401 Unauthorized on API calls | 11 page files + `api.js` |
