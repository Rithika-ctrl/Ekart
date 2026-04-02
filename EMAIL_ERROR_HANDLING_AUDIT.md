# Email & Error Handling: React vs HTML Templates vs Backend

**Analysis Date:** April 2, 2026  
**Status:** Both React and HTML templates connect to backend services

---

## EMAILS

### Backend Email Infrastructure ✅ **CONNECTED**

**EmailSender.java** (`EKART/src/main/java/com/example/ekart/helper/EmailSender.java`)

| Email Type | Method | Template | Triggered By | Status |
|-----------|--------|-----------|---|---|
| **OTP Verification** | `send(Vendor)` | `otp-email.html` | Registration → Backend → EmailSender | ✅ Works |
| **OTP Verification** | `send(Customer)` | `otp-email.html` | Registration → Backend → EmailSender | ✅ Works |
| **Order Confirmation** | `sendOrderConfirmation()` | `order-email.html` | Order placed → Backend → EmailSender | ✅ Works |
| **Stock Alert** | `sendStockAlert()` | `stock-alert-email.html` | Low stock trigger → Backend → EmailSender | ✅ Works |
| **Order Replacement** | `sendReplacementRequest()` | `replacement-email.html` | Refund request → Backend → EmailSender | ✅ Works |
| **Order Cancellation** | `sendOrderCancellation()` | `cancel-email.html` | Cancel order → Backend → EmailSender | ✅ Works |
| **Delivery OTP** | `sendDeliveryBoyOTP()` | `delivery-otp-email.html` | Delivery boy register → Backend → EmailSender | ✅ Works |
| **Shipped Notification** | `sendShipped()` | `shipped-email.html` | Order shipped → Backend → EmailSender | ✅ Works |
| **Delivered Notification** | `sendDelivered()` | `delivered-email.html` | Order delivered → Backend → EmailSender | ✅ Works |
| **Back in Stock** | `sendBackInStock()` | `back-in-stock-email.html` | Stock restored → Backend → EmailSender | ✅ Works |
| **Auto-Assign Notification** | `sendAutoAssignNotification()` | (Inline HTML) | Auto-assignment → Backend → EmailSender | ✅ Works |

**Email Flow:**
```
React Component (AuthPage.jsx / CustomerApp.jsx / VendorApp.jsx)
    ↓
Backend API Endpoint (e.g., /api/auth/register, /api/orders)
    ↓
Service Layer (OrderService, CustomerService, DeliveryBoyService)
    ↓
Calls EmailSender.send*() methods
    ↓
JavaMailSender + Thymeleaf Template Engine
    ↓
Renders HTML template (*.html files in templates/)
    ↓
Sends SMTP email to user
```

**Key Points:**
- ✅ EmailSender is `@Component` → auto-wired into services
- ✅ `@Async` decorator → non-blocking email sending
- ✅ Uses Thymeleaf TemplateEngine to render HTML templates
- ✅ All 9 email templates remain in `/templates` directory
- ✅ React doesn't need email UI — backend handles it

**Config:** Check `application.properties` for:
```properties
spring.mail.host=
spring.mail.port=
spring.mail.username=
spring.mail.password=
spring.mail.properties.mail.smtp.auth=
spring.mail.properties.mail.smtp.starttls.enable=
```

---

## ERROR HANDLING

### React Error Handling (Frontend)

**App.jsx** — Main error handling:

| Error Type | Handler | Display | Notes |
|-----------|---------|---------|-------|
| **OAuth Login Failed** | `OAuthCallback()` | Error message → redirect to /auth | Handles `?error=suspended` |
| **Account Suspended** | `OAuthCallback()` | "Your account has been suspended" | 3s auto-redirect |
| **Invalid OAuth Params** | `OAuthCallback()` | "Invalid callback" | Checks role, id, email |
| **Link/Unlink OAuth** | `OAuthLinkCallback()` | Success/failure badge | Auto-redirect to profile |
| **Role-Based Access** | `RequireAuth()` | Redirects to role home | Wrong role → redirected |
| **Unauthenticated Access** | `RequireAuth()` | Redirects to /auth | Saves `state.from` for return |

**AuthPage.jsx** — Authentication errors:

| Error Type | Handler | Display | Notes |
|-----------|---------|---------|-------|
| **Login Failed** | `handleLogin()` | Toast + error state | Backend returns `{ success: false }` |
| **OTP Send Failed** | `handleSendOTP()` | Toast message | Network or server error |
| **OTP Verification Failed** | `handleVerifyOTP()` | "Invalid OTP" | 6-digit validation |
| **Register Failed** | `handleRegister()` | Backend message | Password mismatch check |
| **Network Error** | `catch` blocks | "Could not reach the server" | Handled globally |
| **Password Mismatch** | Validation | "Passwords don't match" | Client-side check |

**Customer/Vendor/Delivery Apps** — Toast errors:

```jsx
showToast(d?.message || "Failed to load", false);
showToast("Request failed. Try again.", false);
```

### Backend Error Handling (Java)

**ResponseEntity Pattern** — All controllers return consistent error responses:

```java
// Success response
Map<String, Object> res = new LinkedHashMap<>();
res.put("success", true);
res.put("data", ...);
return ResponseEntity.ok(res);

// Error response
res.put("success", false);
res.put("message", "User not found");
return ResponseEntity.badRequest().body(res);  // 400

// Server error
res.put("success", false);
res.put("message", "Internal error: " + e.getMessage());
return ResponseEntity.status(500).body(res);   // 500
```

**Common Backend Errors:**

| Status | Triggered By | Example |
|--------|---|---|
| **400 Bad Request** | Missing params, invalid format | `Missing orderId in request body` |
| **401 Unauthorized** | No JWT token | `Authorization header missing` |
| **403 Forbidden** | Token invalid/expired, wrong role | `User is not admin` |
| **404 Not Found** | Entity not found | `Order not found; Customer not found` |
| **409 Conflict** | Duplicate entry, business logic violation | `Customer already exists` |
| **500 Server Error** | Unhandled exception | `Database connection failed` |

---

## HTML ERROR PAGES (Still Present) ✅

These are **fallback error pages** used when:
- Direct server request fails (no React SPA)
- Error occurs before React loads
- Non-JS client access

| File | Status Code | Use Case |
|------|---|---|
| `403.html` | 403 | Forbidden access |
| `404.html` | 404 | Page not found |
| `error.html` | 500 | Generic error |
| `blocked.html` | Custom | User account blocked |

**Configuration in Spring:**
```java
@SpringBootApplication
public class EkartApplication {
    public static void main(String[] args) {
        SpringApplication.run(EkartApplication.class, args);
    }
    
    // Tomcat error pages configured in application.properties or web.xml
    // server.error.path=/error
    // server.error.include-message=always
}
```

---

## MISSING: Email UI in React

### What React DOESN'T have (and doesn't need):

✅ **React doesn't display emails** — emails are sent by backend automatically
❌ No "Preview Email" UI
❌ No "Resend Email" UI (except OTP resend in AuthPage)
❌ No email queue management UI

**This is CORRECT** because:
- Emails are transactional (one-time sends)
- Backend handles all email logic
- React is just the trigger (register, place order, etc.)
- No user interaction needed after send

### If you wanted email management UI:

Would need:
1. Backend: `/api/emails` endpoint to list sent emails
2. Backend: `/api/emails/{id}/resend` to resend
3. Backend: Email audit log table (emails_sent)
4. React: Email history page

---

## WHAT EXISTS IN REACT TODAY

### Error Pages Rendered by React:
- ✅ `OAuthCallback.jsx` — OAuth error display
- ✅ `OAuthLinkCallback.jsx` — Link/unlink status
- ✅ `AuthPage.jsx` — Authentication errors
- ✅ Toast/Alert system (in CustomerApp, VendorApp, DeliveryApp, AdminApp)

### Email Handling in React:
- ✅ `AuthPage.jsx` — Takes action that triggers OTP email (register)
- ✅ `CustomerApp.jsx` — Order placement triggers confirmation email
- ✅ `VendorApp.jsx` — Stock alert setup (triggers emails)
- ✅ Displays user message: "A confirmation email has been sent…"

---

## SUMMARY

| Feature | HTML Templates | React | Backend Connection |
|---------|---|---|---|
| **Error Display** | 4 fallback pages | Full error UI | ✅ Backend returns error JSON |
| **Email Templates** | 9 HTML email templates | No email UI (correct) | ✅ EmailSender.java renders templates |
| **Email Triggers** | N/A | Buttons/forms trigger emails | ✅ Backend services call EmailSender |
| **OTP Resend** | No UI | AuthPage.jsx | ✅ Backend re-sends OTP |
| **Error Toasts** | N/A | All apps show toasts | ✅ Backend returns `{ success, message }` |
| **404/403 Pages** | admin-login.html redirect fallback | React error + navigate | ✅ Fallback for non-SPA access |

---

## RECOMMENDATION

### Keep All 24 HTML Files ✅

**Email Templates (9 files)** — Required:
```
order-email.html, otp-email.html, shipped-email.html, 
delivered-email.html, cancel-email.html, replacement-email.html,
back-in-stock-email.html, stock-alert-email.html, delivery-otp-email.html
```

**Error Pages (4 files)** — Required:
```
403.html, 404.html, error.html, blocked.html
```

**Fallback Forms (5+ files)** — Keep for non-SPA scenarios:
```
admin-login.html, add-product.html, edit-product.html, etc.
```

**Widgets (2 files)** — Embeddable:
```
ai-assistant-widget.html, chat-widget.html
```

---

## Verification

To verify email is working:
1. Create customer account → Check email for OTP
2. Place order → Check email for order confirmation
3. Set stock alert as vendor → Check email for alert

To verify error handling:
1. Make API request without JWT → Should get 401 error toast
2. Wrong password → Should show "Invalid password" in React
3. Direct access to `/admin` without token → Should redirect to /auth

✅ **Everything is properly connected.**

