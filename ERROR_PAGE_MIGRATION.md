# Error Page Migration: HTML → React SPA  
**Date:** 2025  
**Status:** ✅ COMPLETE  

---

## Summary

All error pages (404, 403, 500, account blocked) have been successfully migrated from static HTML fallbacks to React components. This enables:
- **Consistent UX:** Error pages match the rest of the app styling
- **Client-side routing:** Error pages are handled by React Router, not Spring
- **Better DX:** Developers can easily customize error pages in React
- **Reduced HTML:** Only 11 files remain in templates (9 emails + 2 widgets)

---

## Architecture

### Before
```
User Request → Spring DispatcherServlet → No matching controller
                                        ↓
                                    Return 404.html (HTML fallback)
```

### After
```
User Request → Spring DispatcherServlet 
              ↓ (no API match)
              SpaRouteController.catchAll()
              ↓
              forward:/index.html
              ↓
              React Router (client-side)
              ↓
              Render NotFoundPage / ErrorPage / etc.
```

---

## Files Created

### 1. **React Error Pages** (4 new components)
- **[NotFoundPage.jsx](../ekart-frontend/src/pages/NotFoundPage.jsx)** — 404 error page with "Go Back" / "Go Home" navigation
- **[ForbiddenPage.jsx](../ekart-frontend/src/pages/ForbiddenPage.jsx)** — 403 permission denied with role explanation
- **[BlockedPage.jsx](../ekart-frontend/src/pages/BlockedPage.jsx)** — Account locked/suspended with support email link
- **[ErrorPage.jsx](../ekart-frontend/src/pages/ErrorPage.jsx)** — 500 server error with "Try Again" / retry buttons

### 2. **Spring Controllers** (2 new files)
- **[SpaRouteController.java](src/main/java/com/example/ekart/controller/SpaRouteController.java)** — Catch-all route forwarding non-API requests to index.html
- **[WebMvcConfig.java](src/main/java/com/example/ekart/config/WebMvcConfig.java)** — Updated with `addResourceHandlers()` for static resources

### 3. **Modified Files**
- **[App.jsx](../ekart-frontend/src/App.jsx)** — Updated routes:
  - Added error page imports
  - Added error routes: `/error/404`, `/error/403`, `/error/500`, `/error/blocked`
  - Changed catch-all from `<Navigate to="/auth">` to `<NotFoundPage />` (authenticated users only)

---

## Files Deleted

### HTML Error Pages (4 files)
```
Deleted: src/main/resources/templates/403.html
Deleted: src/main/resources/templates/404.html
Deleted: src/main/resources/templates/error.html
Deleted: src/main/resources/templates/blocked.html
```

These are no longer needed because:
1. Spring no longer serves static HTML error pages
2. React error pages are handled by `SpaRouteController` forwarding to `index.html`
3. React Router then renders the appropriate error component

---

## Files Surviving in Templates (11 total)

### Email Templates (9) — **Must stay** (backend rendering)
```
back-in-stock-email.html       — Notification when product back in stock
cancel-email.html              — Order cancellation confirmation
delivered-email.html           — Delivery confirmation
delivery-otp-email.html        — OTP for delivery verification
order-email.html               — Order confirmation
otp-email.html                 — Account verification OTP
replacement-email.html         — Replacement request confirmation
shipped-email.html             — Shipment tracking update
stock-alert-email.html         — Low stock warning to vendor
```

**Why:** EmailSender.java uses Thymeleaf TemplateEngine to render these as HTML emails. They're sent via SMTP, not rendered in browser.

### Widgets (2) — **Must stay** (embeddable components)
```
ai-assistant-widget.html       — Embeddable AI chat widget
chat-widget.html               — Embeddable customer support chat
```

**Why:** These are standalone HTML components that can be embedded on external sites (like marketing pages). They're not part of the main SPA.

---

## How Catch-All Routing Works

### 1. **Request Arrives**
```
User navigates to: /admin/nonexistent
or browser directly requests: /shop/cart/999
```

### 2. **Spring DispatcherServlet Routing** (in order)
```
Check 1: Is it /api/**?           → YES  → ReactApiController
Check 2: Is it static resource?   → YES  → ResourceHandler (CSS, JS, images)
Check 3: Match Spring routes?     → NO   → Fall through to catch-all
Check 4: Catch-all SpaRouteController
                                  → YES  → forward:/index.html
```

### 3. **Forward to index.html**
```
Spring forwards to /index.html
ResourceHandler serves: src/main/resources/static/index.html
Browser loads index.html (Vite-built React SPA entry point)
```

### 4. **React Router Processing** (client-side in browser)
```
React app loads with path = "/admin/nonexistent"
React Router checks routes:
  - /shop/*?   NO
  - /vendor/*? NO
  - /admin/*?  YES → Route guard checks auth
                  → User is authenticated, role=ADMIN
                  → Render <AdminApp /> with path = "/admin/nonexistent"
  - AdminApp routes don't match "/nonexistent"
  - Fall back to catch-all: <Route path="*" element={<NotFoundPage />} />
  → Show NotFoundPage component
```

---

## Error Page Routing

### Explicit Error Routes
```javascript
<Route path="/error/404" element={<NotFoundPage />} />      // 404: Page not found
<Route path="/error/403" element={<ForbiddenPage />} />    // 403: Access denied
<Route path="/error/blocked" element={<BlockedPage />} />  // Account blocked
<Route path="/error/500" element={<ErrorPage />} />        // 500: Server error
```

### Access Error Pages
Users can navigate to error pages in two ways:

#### 1. **Automatic (via Spring catch-all)**
```
User requests: /nonexistent
↓ (no matching route in React)
NotFoundPage rendered automatically
```

#### 2. **Explicit Navigation (from app code)**
```javascript
// In AdminApp.jsx or any component
if (error.status === 403) {
  navigate("/error/403");  // Show ForbiddenPage
}

// In ProfileSettings.jsx
if (account.isBlocked) {
  navigate("/error/blocked");  // Show BlockedPage
}
```

---

## Static Resource Caching

### WebMvcConfig Resource Handlers
```java
// CSS, JS, images cached for 1 year (31536000 seconds)
// Safe because Vite includes content hash in filenames
// Example: app.2a3f5e.js (cache busting via hash)
registry
    .addResourceHandler("/static/**", "/css/**", "/js/**", "/media/**")
    .addResourceLocations("classpath:/static/", "classpath:/public/")
    .setCachePeriod(31536000);  // Aggressive caching for immutable assets
```

---

## Frontend Build & Deployment

### Build React App (Vite)
```bash
cd ekart-frontend
npm run build          # Generates dist/
```

### Copy to Spring
```bash
# Manual (current)
Copy-Item -Path "dist/*" -Destination "../EKART/src/main/resources/static/" -Recurse -Force
```

### Optional: Automated Maven Build
See `pom-frontend-build.xml` for frontend-maven-plugin configuration that automates:
1. Node.js/npm installation
2. `npm install`
3. `npm run build`
4. Copy `dist/` to `src/main/resources/static/`

---

## Verification Checklist

- ✅ **React App Built:**
  - `ekart-frontend/dist/` contains index.html, assets/
  
- ✅ **Static Resources Copied:**
  - `EKART/src/main/resources/static/` contains index.html, assets/
  
- ✅ **Error Pages Created:**
  - All 4 React error components exist in `ekart-frontend/src/pages/`
  
- ✅ **Routes Updated:**
  - App.jsx imports error pages and has catch-all `<Route path="*" element={<NotFoundPage />} />`
  
- ✅ **Spring Controllers Created:**
  - SpaRouteController forwards non-API requests to index.html
  - WebMvcConfig configures static resource serving
  
- ✅ **HTML Error Files Deleted:**
  - 403.html, 404.html, error.html, blocked.html removed
  
- ✅ **Email Templates Preserved:**
  - All 9 email templates still in templates/ for SMTP rendering

---

## Troubleshooting

### Issue: CSS/JS Not Loading (404 errors)
**Cause:** Static resources not in correct folder  
**Fix:** Verify `ekart-frontend/dist/` copied to `src/main/resources/static/`

### Issue: React App Not Loading (blank page)
**Cause:** SpaRouteController not intercepting requests  
**Fix:** Ensure SpaRouteController.java is in controller package and @Configuration annotations present

### Issue: Authentication Guard Not Working
**Cause:** RequireAuth component not protecting routes  
**Fix:** Verify App.jsx has `<RequireAuth>` wrapper around protected routes

### Issue: Email Templates Not Rendering
**Cause:** Thymeleaf can't find templates  
**Fix:** Ensure email templates are in `src/main/resources/templates/`, not in static/

---

## Summary Statistics

| Category | Before | After | Δ |
|----------|--------|-------|---|
| HTML Templates | 78 total | 11 total | -67 |
| HTML Error Pages | 4 | 0 | -4 |
| React Error Pages | 0 | 4 | +4 |
| Spring Controllers | 35+ | 37+ (SpaRoute + updated WebMvc) | +2 |
| Lines of React code | baseline | +~500 lines (4 error pages) | +500 |

---

## Next Steps (Optional Enhancements)

1. **Add Sentry/Error Tracking:**
   - Log errors to Sentry when ErrorPage renders
   - Track 404 patterns to identify dead links

2. **Enhance Error Pages:**
   - Add error code / timestamp display
   - Add "Report Error" button that sends feedback

3. **Automate Frontend Build:**
   - Add frontend-maven-plugin to pom.xml to build React app during `mvn package`
   - No manual copy needed—always in sync

4. **CDN Caching:**
   - Deploy assets to CloudFront/CDN for faster global serving
   - Keep index.html short-lived (no cache) so React Router always loads latest

---

**Created:** 2025  
**Last Updated:** 2025  
**Status:** Ready for production ✅
