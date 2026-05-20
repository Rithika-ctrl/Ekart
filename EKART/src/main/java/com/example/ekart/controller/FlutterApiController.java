package com.example.ekart.controller;
 
import com.example.ekart.dto.*;
import org.springframework.transaction.annotation.Transactional;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.PinCodeValidator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
 
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCrypt;
 
/**
 * Flutter REST API Controller for Ekart Mobile App.
 * Base path: /api/flutter
 *
 * Auth pattern:
 *   X-Customer-Id: <id>  for customer endpoints
 *   X-Vendor-Id:   <id>  for vendor endpoints
 *
 * All endpoints are under /api/flutter/** which is already
 * permitted in SecurityConfig (Chain 1 = permitAll, stateless).
 *
 * NEW ENDPOINTS added for mobile features:
 *   GET  /api/flutter/banners                       — banner carousel
 *   POST /api/flutter/orders/place                  — now accepts structured address fields
 *   POST /api/flutter/notify-me/{productId}         — subscribe back-in-stock
 *   DELETE /api/flutter/notify-me/{productId}       — unsubscribe
 *   GET  /api/flutter/notify-me/{productId}         — check subscription status
 */
@RestController
@RequestMapping("/api/flutter")
@CrossOrigin(origins = "*")
public class FlutterApiController {

    private final FlutterApiDependencies deps;

    // In-memory set of emails that have passed vendor OTP verification (Step 2 of 3)
    private final java.util.concurrent.ConcurrentHashMap<String, Boolean> vendorRegisterOtpVerified
            = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Groups all repository and service dependencies into a single injectable object,
     * reducing the constructor parameter count to satisfy SonarQube S107
     * (max 7 parameters per constructor).
     */

 
    // Admin credentials come from application.properties (admin.email / admin.password)
    private final String adminEmail;
    private final String adminPassword;
 
    // In-memory coupon session store (mirrors ReactApiController)
    private final java.util.concurrent.ConcurrentHashMap<Integer, com.example.ekart.dto.Coupon> appliedCoupons
            = new java.util.concurrent.ConcurrentHashMap<>();

    // String constants (fixes S1192 - String Literal Duplication)
    private static final String KEY_EMAIL        = "email";
    private static final String KEY_TOKEN        = "token";
    private static final String KEY_ADMIN_ID     = "adminId";
    private static final String KEY_SUCCESS      = "success";
    private static final String KEY_MESSAGE      = "message";
    private static final String KEY_ID           = "id";
    private static final String KEY_NAME         = "name";
    private static final String KEY_ACTIVE            = "active";
    private static final String KEY_DELIVERY_BOY_ID   = "deliveryBoyId";
    private static final String KEY_DELIVERY_BOY_CODE = "deliveryBoyCode";
    private static final String KEY_TRACKING_STATUS   = "trackingStatus";
    private static final String KEY_MOBILE       = "mobile";
    private static final String KEY_PASSWORD     = "password";
    private static final String KEY_STATUS       = "status";
    private static final String KEY_COUNT        = "count";
    private static final String KEY_ITEMS        = "items";
    private static final String KEY_SUBSCRIBED   = "subscribed";
    private static final String KEY_VENDOR_CODE  = "vendorCode";
    private static final String KEY_PRODUCTS      = "products";
    private static final String MSG_NOT_AUTHENTICATED   = "Not authenticated";
    private static final String MSG_ORDER_NOT_FOUND     = "Order not found";
    private static final String MSG_WAREHOUSE_NOT_FOUND = "Warehouse not found";
    private static final String MSG_EMAIL_REQUIRED       = "Email is required";
    private static final String MSG_EMAIL_REGISTERED    = "Email already registered";
    private static final String MSG_REGISTRATION_FAILED = "Registration failed: ";
    private static final String MSG_LOGIN_FAILED        = "Login failed: ";
    private static final String KEY_ADMIN_NOTE          = "adminNote";
    private static final String KEY_REASON              = "reason";
    private static final String KEY_TITLE               = "title";
    private static final String KEY_IMAGE_URL           = "imageUrl";
    private static final String KEY_LINK_URL            = "linkUrl";
    private static final String KEY_WAREHOUSE_ID        = "warehouseId";
    private static final String VAL_DELIVERY_BOY        = "delivery_boy";
    private static final String VAL_ON_THE_WAY          = "On the way \u2014 ";
    private static final String VAL_DELIVERED           = "Delivered";
    private static final String VAL_NONE                = "None";
    private static final String KEY_TOTAL_PRICE         = "totalPrice";
    private static final String KEY_PAYMENT_MODE        = "paymentMode";
    private static final String KEY_DELIVERY_TIME       = "deliveryTime";
    private static final String KEY_PRODUCT_NAME        = "productName";
    private static final String KEY_QUANTITY            = "quantity";
    private static final String K_ORDERS                = "orders";
    private static final String MSG_PRODUCT_NOT_FOUND   = "Product not found";
    private static final String MSG_VENDOR_NOT_FOUND    = "Vendor not found";
    private static final String MSG_CUSTOMER_NOT_FOUND  = "Customer not found";
    private static final String KEY_TOTAL               = "total";
    private static final String K_TOTAL_REVENUE         = "totalRevenue";
    private static final String MSG_FAILED_PREFIX       = "Failed: ";
    private static final String K_VERIFIED              = "verified";
    private static final String MSG_BANNER_NOT_FOUND    = "Banner not found";
    private static final String KEY_COUPON_APPLIED      = "couponApplied";
    private static final String KEY_COUPON_CODE         = "couponCode";
    private static final String K_ALLOWED_PIN_CODES     = "allowedPinCodes";

    // ── S1192: Additional string constants ──
    private static final String K_X_CUSTOMER_ID         = "X-Customer-Id";
    private static final String K_X_VENDOR_ID           = "X-Vendor-Id";
    private static final String K_DESCRIPTION           = "description";
    private static final String K_CITY                  = "city";
    private static final String K_PRICE                 = "price";
    private static final String K_PRODUCT_ID            = "productId";
    private static final String K_CATEGORY              = "category";
    private static final String K_IMAGE_LINK            = "imageLink";
    private static final String K_CODE                  = "code";
    private static final String K_STATE                 = "state";
    private static final String K_STOCK                 = "stock";
    private static final String K_MRP                   = "mrp";
    private static final String K_RATING                = "rating";
    private static final String K_COMMENT               = "comment";
    private static final String K_CUSTOMER_NAME         = "customerName";
    private static final String K_COUPON_DISCOUNT       = "couponDiscount";
    private static final String K_ORDER_ID              = "orderId";
    private static final String K_TOTAL_ORDERS          = "totalOrders";
    private static final String K_OTP                   = "otp";
    private static final String K_CUSTOMER_ID           = "customerId";
    private static final String K_CURRENT_CITY          = "currentCity";
    private static final String K_REVIEWS               = "reviews";
    private static final String K_AVG_RATING            = "avgRating";
    private static final String K_DELIVERY_CHARGE       = "deliveryCharge";
    private static final String K_RECIPIENT_NAME        = "recipientName";
    private static final String K_HOUSE_STREET          = "houseStreet";
    private static final String K_POSTAL_CODE           = "postalCode";
    private static final String K_TYPE                  = "type";
    private static final String K_REFUND                = "REFUND";
    private static final String K_TOTAL_PRODUCTS        = "totalProducts";
    private static final String K_STOCK_ALERT_THRESHOLD = "stockAlertThreshold";
    private static final String K_RESOLVED_ADDRESS      = "_resolvedAddress";

    private static final Logger log = LoggerFactory.getLogger(FlutterApiController.class);


    @org.springframework.beans.factory.annotation.Autowired
    public FlutterApiController(
            @org.springframework.beans.factory.annotation.Value("${admin.email}") String adminEmail,
            @org.springframework.beans.factory.annotation.Value("${admin.password}") String adminPassword,
            FlutterApiDependencies deps) {
        this.adminEmail    = adminEmail;
        this.adminPassword = adminPassword;
        this.deps          = deps;
    }
    // ═══════════════════════════════════════════════════════
    // AUTH — CUSTOMER
    // ═══════════════════════════════════════════════════════
 
    /**
     * POST /api/flutter/auth/customer/send-otp
     * Step 1 of 2FA registration: validates form data, sends a 6-digit OTP
     * to the customer's email, and temporarily persists the unverified account.
     * Body: { name, email, mobile, password }
     */
    @PostMapping("/auth/customer/send-otp")
    public ResponseEntity<Map<String, Object>> customerSendOtp(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = (String) body.get(KEY_EMAIL);
            if (email == null || email.isBlank()) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_EMAIL_REQUIRED);
                return ResponseEntity.badRequest().body(res);
            }
            if (deps.customerRepository.existsByEmail(email)) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_EMAIL_REGISTERED);
                return ResponseEntity.badRequest().body(res);
            }
 
            // Generate 6-digit OTP and hash it
            int plainOtp = ThreadLocalRandom.current().nextInt(100000, 1000000);
            String otpHash = BCrypt.hashpw(String.valueOf(plainOtp), BCrypt.gensalt());
 
            // Save unverified customer (verified=false until OTP confirmed)
            Customer c = new Customer();
            c.setName((String) body.get("name"));
            c.setEmail(email);
            c.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString()));
            c.setPassword(AES.encrypt((String) body.get(KEY_PASSWORD)));
            c.setVerified(false);
            c.setRole(Role.CUSTOMER);
            c.setActive(true);
            c.setOtpHash(otpHash);
            c.setOtpExpiry(java.time.LocalDateTime.now().plusMinutes(10));
            deps.customerRepository.save(c);
 
            // Send OTP email
            deps.emailSender.send(c, String.format("%06d", plainOtp));
 
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "OTP sent to " + email + ". Valid for 10 minutes.");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Failed to send OTP: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** Helper method to set OTP value on customer for email template. */

    /**
     * POST /api/flutter/auth/customer/verify-otp
     * Step 2 of 2FA registration: verifies the OTP, marks account as verified.
     * Body: { email, otp }
     */
    @PostMapping("/auth/customer/verify-otp")
    public ResponseEntity<Map<String, Object>> customerVerifyOtp(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = (String) body.get(KEY_EMAIL);
            String otpInput = body.getOrDefault(K_OTP, "").toString().trim();

            Customer c = deps.customerRepository.findByEmail(email);
            ResponseEntity<Map<String, Object>> validationError = validateCustomerForOtp(c, otpInput, res);
            if (validationError != null) return validationError;

            // OTP correct — mark verified and clear OTP fields
            c.setVerified(true);
            c.setOtpHash(null);
            c.setOtpExpiry(null);
            deps.customerRepository.save(c);

            String token = java.util.Base64.getEncoder()
                    .encodeToString((c.getId() + ":" + c.getEmail()).getBytes());
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Account verified successfully! Welcome to Ekart.");
            res.put(K_CUSTOMER_ID, c.getId());
            res.put(KEY_NAME, c.getName());
            res.put(KEY_EMAIL, c.getEmail());
            res.put(KEY_TOKEN, token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Verification failed");
            return ResponseEntity.internalServerError().body(res);
        }
    }

    private ResponseEntity<Map<String, Object>> validateCustomerForOtp(
            Customer c, String otpInput, Map<String, Object> res) {
        if (c == null) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Account not found. Please register again.");
            return ResponseEntity.badRequest().body(res);
        }
        if (c.isVerified()) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Account already verified. Please login.");
            return ResponseEntity.badRequest().body(res);
        }
        if (c.getOtpExpiry() == null || java.time.LocalDateTime.now().isAfter(c.getOtpExpiry())) {
            deps.customerRepository.delete(c);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "OTP expired. Please register again.");
            return ResponseEntity.badRequest().body(res);
        }
        if (c.getOtpHash() == null || !BCrypt.checkpw(otpInput, c.getOtpHash())) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Invalid OTP. Please try again.");
            return ResponseEntity.badRequest().body(res);
        }
        return null;
    }
 
    /** @deprecated Use /api/flutter/auth/customer/send-otp + verify-otp instead */
    @Deprecated(since = "1.0", forRemoval = true)
    @PostMapping("/auth/customer/register")
    public ResponseEntity<Map<String, Object>> customerRegister(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = (String) body.get(KEY_EMAIL);
            if (deps.customerRepository.existsByEmail(email)) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, MSG_EMAIL_REGISTERED);
                return ResponseEntity.badRequest().body(res);
            }
            Customer c = new Customer();
            c.setName((String) body.get("name"));
            c.setEmail(email);
            c.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString()));
            c.setPassword(AES.encrypt((String) body.get(KEY_PASSWORD)));
            c.setVerified(true);
            c.setRole(Role.CUSTOMER);
            c.setActive(true);
            deps.customerRepository.save(c);
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Registered successfully");
            res.put(K_CUSTOMER_ID, c.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, MSG_REGISTRATION_FAILED + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }
 
    /** POST /api/flutter/auth/customer/login */
    @PostMapping("/auth/customer/login")
    public ResponseEntity<Map<String, Object>> customerLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = (String) body.get(KEY_EMAIL);
            String password = (String) body.get(KEY_PASSWORD);
            Customer c = deps.customerRepository.findByEmail(email);
            String decryptedCustomerPwd = c != null ? AES.decrypt(c.getPassword()) : null;
            if (c == null || decryptedCustomerPwd == null || !decryptedCustomerPwd.equals(password)) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid email or password");
                return ResponseEntity.badRequest().body(res);
            }
            if (!c.isActive()) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Account suspended. Contact support.");
                return ResponseEntity.badRequest().body(res);
            }
            String token = Base64.getEncoder().encodeToString((c.getId() + ":" + c.getEmail()).getBytes());
            res.put(KEY_SUCCESS, true);
            res.put(K_CUSTOMER_ID, c.getId());
            res.put(KEY_NAME, c.getName());
            res.put(KEY_EMAIL, c.getEmail());
            res.put(KEY_MOBILE, c.getMobile());
            res.put(KEY_TOKEN, token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_LOGIN_FAILED + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }
    // ═══════════════════════════════════════════════════════
    // AUTH — VENDOR
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/auth/vendor/register — requires prior OTP verification */
    @PostMapping("/auth/vendor/register")
    public ResponseEntity<Map<String, Object>> vendorRegister(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            // Require OTP pre-verification
            if (!Boolean.TRUE.equals(vendorRegisterOtpVerified.get(email))) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Email not verified. Please complete OTP verification first.");
                return ResponseEntity.badRequest().body(res);
            }
            Vendor existing = deps.vendorRepository.findByEmail(email);
            if (existing != null && existing.isVerified()) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_EMAIL_REGISTERED);
                return ResponseEntity.badRequest().body(res);
            }
            Vendor v = existing != null ? existing : new Vendor();
            v.setName((String) body.get("name"));
            v.setEmail(email);
            v.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString()));
            v.setPassword(AES.encrypt((String) body.get(KEY_PASSWORD)));
            v.setVerified(true);
            deps.vendorRepository.save(v);
            // Generate vendor code if missing
            if (v.getVendorCode() == null || v.getVendorCode().isBlank()) {
                v.setVendorCode("VND-" + String.format("%05d", v.getId()));
                deps.vendorRepository.save(v);
            }
            vendorRegisterOtpVerified.remove(email);
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Registered successfully. Wait for admin approval.");
            res.put("vendorId", v.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_REGISTRATION_FAILED + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/vendor/login */
    @PostMapping("/auth/vendor/login")
    public ResponseEntity<Map<String, Object>> vendorLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = (String) body.get(KEY_EMAIL);
            String password = (String) body.get(KEY_PASSWORD);
            Vendor v = deps.vendorRepository.findByEmail(email);
            if (v == null || !AES.decrypt(v.getPassword()).equals(password)) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid email or password");
                return ResponseEntity.badRequest().body(res);
            }
            String token = Base64.getEncoder().encodeToString((v.getId() + ":" + v.getEmail()).getBytes());
            res.put(KEY_SUCCESS, true);
            res.put("vendorId", v.getId());
            res.put(KEY_NAME, v.getName());
            res.put(KEY_EMAIL, v.getEmail());
            res.put(KEY_VENDOR_CODE, v.getVendorCode());
            res.put(KEY_TOKEN, token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_LOGIN_FAILED + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * POST /api/flutter/auth/admin/login
     * Body: { email, password }
     * Validates against admin.email / admin.password from application.properties.
     */
    @PostMapping("/auth/admin/login")
    public ResponseEntity<Map<String, Object>> adminLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        String email    = (String) body.get(KEY_EMAIL);
        String password = (String) body.get(KEY_PASSWORD);
        if (email == null || password == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Email and password are required");
            return ResponseEntity.badRequest().body(res);
        }
        if (!email.equals(adminEmail) || !password.equals(adminPassword)) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid admin credentials");
            return ResponseEntity.status(401).body(res);
        }
        String token = Base64.getEncoder().encodeToString(("admin:" + adminEmail).getBytes());
        res.put(KEY_SUCCESS, true);
        res.put(KEY_ADMIN_ID, 0);
        res.put(KEY_NAME, "Admin");
        res.put(KEY_EMAIL, adminEmail);
        res.put(KEY_TOKEN, token);
        res.put("role", "ADMIN");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // AUTH — DELIVERY BOY
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/auth/delivery/login
     * Body: { email, password }
     * Returns JSON instead of the web session redirect, so the Flutter
     * app can parse the response without hitting HTTP 302.
     *
     * Possible status values in response:
     *   active      → login success
     *   unverified  → email OTP not yet confirmed
     *   pending     → awaiting admin approval
     *   inactive    → account deactivated by admin
     */
    @PostMapping("/auth/delivery/login")
    public ResponseEntity<Map<String, Object>> deliveryBoyLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            String email    = (String) body.get(KEY_EMAIL);
            String password = (String) body.get(KEY_PASSWORD);

            if (email == null || password == null) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Email and password are required");
                return ResponseEntity.badRequest().body(res);
            }

            DeliveryBoy db = deps.deliveryBoyRepository.findByEmail(email);
            if (db == null) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "No account found with this email");
                return ResponseEntity.status(401).body(res);
            }

            String decrypted = AES.decrypt(db.getPassword());
            if (decrypted == null || !decrypted.equals(password)) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Wrong password");
                return ResponseEntity.status(401).body(res);
            }

            if (!db.isVerified()) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_STATUS, "unverified");
                res.put(KEY_DELIVERY_BOY_ID, db.getId());
                res.put(KEY_MESSAGE, "Email not verified. Please check your inbox for the OTP.");
                return ResponseEntity.status(403).body(res);
            }

            if (!db.isActive()) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_STATUS, "inactive");
                res.put(KEY_MESSAGE, "Your account has been deactivated. Contact admin.");
                return ResponseEntity.status(403).body(res);
            }

            if (!db.isAdminApproved()) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_STATUS, "pending");
                res.put(KEY_MESSAGE, "Your account is pending admin approval. You will be notified by email once approved.");
                return ResponseEntity.status(403).body(res);
            }

            res.put(KEY_SUCCESS, true);
            res.put(KEY_STATUS, KEY_ACTIVE);
            res.put(KEY_DELIVERY_BOY_ID,   db.getId());
            res.put(KEY_NAME,            db.getName());
            res.put(KEY_EMAIL,           db.getEmail());
            res.put(KEY_DELIVERY_BOY_CODE, db.getDeliveryBoyCode() != null ? db.getDeliveryBoyCode() : "");
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, MSG_LOGIN_FAILED + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // DELIVERY BOY — DASHBOARD & ACTIONS (stateless, header-auth)
    // All endpoints identify the delivery boy via X-Delivery-Boy-Id header.
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/auth/delivery/register
     * Body: { name, email, password, mobile }
     *
     * FIX: Flutter's ApiConfig.deliveryRegister was previously pointing to
     * /delivery/register (the Thymeleaf web-form) which returns HTML.
     * This new JSON endpoint is the correct target.
     *
     * Account is set verified=true (skip OTP for mobile flow) but
     * adminApproved=false so the delivery boy must wait for admin
     * approval before their login succeeds.
     */
    @PostMapping("/auth/delivery/register")
    public ResponseEntity<Map<String, Object>> deliveryBoyRegister(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            String name     = (String) body.get("name");
            String email    = (String) body.get(KEY_EMAIL);
            String password = (String) body.get(KEY_PASSWORD);
            Object mob      = body.get(KEY_MOBILE);

            if (name == null || email == null || password == null || mob == null) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "name, email, password and mobile are all required");
                return ResponseEntity.badRequest().body(res);
            }
            if (deps.deliveryBoyRepository.findByEmail(email) != null) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, MSG_EMAIL_REGISTERED);
                return ResponseEntity.badRequest().body(res);
            }
            DeliveryBoy db = new DeliveryBoy();
            db.setName(name.trim());
            db.setEmail(email.trim());
            db.setMobile(Long.parseLong(mob.toString()));
            db.setPassword(AES.encrypt(password));
            db.setVerified(true);       // skip OTP for Flutter registration flow
            db.setActive(true);
            db.setAdminApproved(false); // admin must approve before login succeeds
            deps.deliveryBoyRepository.save(db);
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Registered successfully. Your account is pending admin approval. You will receive an email once approved.");
            res.put(KEY_DELIVERY_BOY_ID, db.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, MSG_REGISTRATION_FAILED + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }



    /** Resolve delivery boy from X-Delivery-Boy-Id header. Returns null if invalid. */
    private DeliveryBoy resolveDeliveryBoy(jakarta.servlet.http.HttpServletRequest request) {
        String hdr = request.getHeader("X-Delivery-Boy-Id");
        if (hdr == null || hdr.isBlank()) return null;
        try {
            int id = Integer.parseInt(hdr.trim());
            return deps.deliveryBoyRepository.findById(id).orElse(null);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * GET /api/flutter/delivery/home
     * Returns profile + orders split into toPickUp(SHIPPED), outNow(OUT_FOR_DELIVERY), delivered(DELIVERED).
     * Matches the website's delivery-home.html data model exactly.
     */
    @GetMapping("/delivery/home")
    public ResponseEntity<Map<String, Object>> deliveryHome(
            jakarta.servlet.http.HttpServletRequest request) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = resolveDeliveryBoy(request);
        if (db == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_NOT_AUTHENTICATED);
            return ResponseEntity.status(401).body(res);
        }
        // Refresh from DB
        db = deps.deliveryBoyRepository.findById(db.getId()).orElseThrow();

        // Profile block
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put(KEY_ID,               db.getId());
        profile.put(KEY_NAME,             db.getName());
        profile.put(KEY_EMAIL,            db.getEmail());
        profile.put(KEY_MOBILE,           db.getMobile());
        profile.put(KEY_DELIVERY_BOY_CODE,  db.getDeliveryBoyCode() != null ? db.getDeliveryBoyCode() : "");
        profile.put("assignedPinCodes", db.getAssignedPinCodes() != null ? db.getAssignedPinCodes() : "");
        if (db.getWarehouse() != null) {
            Map<String, Object> wh = new LinkedHashMap<>();
            wh.put(KEY_ID,   db.getWarehouse().getId());
            wh.put(KEY_NAME, db.getWarehouse().getName());
            wh.put(K_CITY, db.getWarehouse().getCity());
            wh.put(K_CODE, db.getWarehouse().getWarehouseCode());
            profile.put("warehouse", wh);
        } else {
            profile.put("warehouse", null);
        }
        // Check pending warehouse change request
        Optional<WarehouseChangeRequest> pendingReq = deps.warehouseChangeRequestRepository
                .findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING);
        profile.put("hasPendingWarehouseRequest", pendingReq.isPresent());

        // Orders split by tracking status (matches website: toPickUp, outNow, delivered)
        List<Order> allAssigned = deps.orderRepository.findByDeliveryBoy(db);
        List<Map<String, Object>> toPickUp  = new ArrayList<>();
        List<Map<String, Object>> outNow    = new ArrayList<>();
        List<Map<String, Object>> delivered = new ArrayList<>();

        for (Order o : allAssigned) {
            Map<String, Object> om = orderToMap(o);
            TrackingStatus s = o.getTrackingStatus();
            if (s == TrackingStatus.SHIPPED)               toPickUp.add(om);
            else if (s == TrackingStatus.OUT_FOR_DELIVERY) outNow.add(om);
            else if (s == TrackingStatus.DELIVERED)        delivered.add(om);
        }

        res.put(KEY_SUCCESS,   true);
        res.put("profile",   profile);
        res.put("toPickUp",  toPickUp);   // SHIPPED   → Mark Picked Up
        res.put("outNow",    outNow);     // OUT_FOR_DELIVERY → Confirm Delivery (OTP)
        res.put("delivered", delivered);  // DELIVERED → history
        return ResponseEntity.ok(res);
    }

    /** Helper: convert Order to map for delivery responses */
    private Map<String, Object> orderToMap(Order o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(KEY_ID,              o.getId());
        m.put(KEY_TRACKING_STATUS,  o.getTrackingStatus().name());
        m.put("statusDisplay",   o.getTrackingStatus().getDisplayName());
        m.put("amount",          o.getAmount());
        m.put(KEY_TOTAL_PRICE,      o.getTotalPrice());
        m.put(KEY_PAYMENT_MODE,     o.getPaymentMode());
        m.put(KEY_DELIVERY_TIME,    o.getDeliveryTime());
        m.put(K_CURRENT_CITY,     o.getCurrentCity() != null ? o.getCurrentCity() : "");
        m.put("deliveryAddress", o.getDeliveryAddress() != null ? o.getDeliveryAddress() : "");
        if (o.getCustomer() != null) {
            Map<String, Object> cust = new LinkedHashMap<>();
            cust.put(KEY_ID,     o.getCustomer().getId());
            cust.put(KEY_NAME,   o.getCustomer().getName());
            cust.put(KEY_MOBILE, o.getCustomer().getMobile());
            m.put("customer", cust);
        }
        // Include items
        List<Map<String, Object>> items = new ArrayList<>();
        if (o.getItems() != null) {
            for (Item item : o.getItems()) {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put(KEY_PRODUCT_NAME, item.getName() != null ? item.getName() : "");
                im.put(KEY_QUANTITY,    item.getQuantity());
                im.put(K_PRICE,       item.getPrice());
                items.add(im);
            }
        }
        m.put(KEY_ITEMS, items);
        return m;
    }

    /**
     * POST /api/flutter/delivery/order/{id}/pickup
     * Marks order as OUT_FOR_DELIVERY, sends OTP email to customer.
     * Header: X-Delivery-Boy-Id
     */
    @PostMapping("/delivery/order/{id}/pickup")
    @Transactional
    public ResponseEntity<Map<String, Object>> flutterMarkPickedUp(
            @PathVariable int id,
            jakarta.servlet.http.HttpServletRequest request) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = resolveDeliveryBoy(request);
        if (db == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_NOT_AUTHENTICATED);
            return ResponseEntity.status(401).body(res);
        }
        db = deps.deliveryBoyRepository.findById(db.getId()).orElseThrow();

        Order order = deps.orderRepository.findById(id).orElse(null);
        if (order == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }
        if (order.getDeliveryBoy() == null || order.getDeliveryBoy().getId() != db.getId()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "This order is not assigned to you");
            return ResponseEntity.status(403).body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.SHIPPED) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Order status is " + order.getTrackingStatus().getDisplayName() + " — cannot mark pickup");
            return ResponseEntity.badRequest().body(res);
        }

        String city = db.getWarehouse() != null ? db.getWarehouse().getCity() : "Warehouse";
        order.setTrackingStatus(TrackingStatus.OUT_FOR_DELIVERY);
        order.setCurrentCity(VAL_ON_THE_WAY + city);
        deps.orderRepository.save(order);

        deps.trackingEventLogRepository.save(new TrackingEventLog(
            order, TrackingStatus.OUT_FOR_DELIVERY,
            VAL_ON_THE_WAY + city,
            "Parcel picked up by delivery boy " + db.getName(), VAL_DELIVERY_BOY));

        // Generate and send OTP to customer
        int otp = ThreadLocalRandom.current().nextInt(100000, 1000000);
        deps.deliveryOtpRepository.findByOrder(order).ifPresent(deps.deliveryOtpRepository::delete);
        deps.deliveryOtpRepository.save(new DeliveryOtp(order, otp));

        try {
            deps.emailSender.sendDeliveryOtp(order.getCustomer(), otp, order.getId());
        } catch (Exception e) {
            log.warn("Delivery OTP email failed: {}", e.getMessage());
        }

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, "Marked as Out for Delivery. OTP sent to customer's email.");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/delivery/order/{id}/deliver
     * Confirms delivery using customer OTP.
     * Body: { otp: 123456 }
     * Header: X-Delivery-Boy-Id
     */
    @PostMapping("/delivery/order/{id}/deliver")
    @Transactional
    public ResponseEntity<Map<String, Object>> flutterConfirmDelivery(
            @PathVariable int id,
            @RequestBody Map<String, Object> body,
            jakarta.servlet.http.HttpServletRequest request) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = resolveDeliveryBoy(request);
        if (db == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_NOT_AUTHENTICATED);
            return ResponseEntity.status(401).body(res);
        }

        int submittedOtp;
        try {
            submittedOtp = Integer.parseInt(body.getOrDefault(K_OTP, "0").toString());
        } catch (NumberFormatException e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid OTP format");
            return ResponseEntity.badRequest().body(res);
        }

        Order order = deps.orderRepository.findById(id).orElse(null);
        if (order == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }
        if (order.getDeliveryBoy() == null || order.getDeliveryBoy().getId() != db.getId()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "This order is not assigned to you");
            return ResponseEntity.status(403).body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.OUT_FOR_DELIVERY) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Order is not out for delivery");
            return ResponseEntity.badRequest().body(res);
        }

        DeliveryOtp deliveryOtp = deps.deliveryOtpRepository.findByOrder(order).orElse(null);
        if (deliveryOtp == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "No OTP found for this order");
            return ResponseEntity.badRequest().body(res);
        }
        if (deliveryOtp.isUsed()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "OTP already used");
            return ResponseEntity.badRequest().body(res);
        }
        if (deliveryOtp.getOtp() != submittedOtp) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Wrong OTP. Ask the customer for the correct OTP.");
            return ResponseEntity.badRequest().body(res);
        }

        deliveryOtp.setUsed(true);
        deliveryOtp.setUsedAt(LocalDateTime.now());
        deps.deliveryOtpRepository.save(deliveryOtp);

        order.setTrackingStatus(TrackingStatus.DELIVERED);
        order.setCurrentCity(VAL_DELIVERED);
        deps.orderRepository.save(order);

        deps.trackingEventLogRepository.save(new TrackingEventLog(
            order, TrackingStatus.DELIVERED,
            "Delivered to customer",
            "Delivered by " + db.getName() + ". OTP verified at doorstep.", VAL_DELIVERY_BOY));

        try {
            deps.emailSender.sendDeliveryConfirmation(order.getCustomer(), order);
        } catch (Exception e) {
            log.warn("Delivery confirmation email failed: {}", e.getMessage());
        }

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, "Order #" + id + " marked as Delivered!");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/delivery/warehouse-change/request
     * Body: { warehouseId: int, reason: string }
     * Header: X-Delivery-Boy-Id
     */
    @PostMapping("/delivery/warehouse-change/request")
    @Transactional
    public ResponseEntity<Map<String, Object>> flutterRequestWarehouseChange(
            @RequestBody Map<String, Object> body,
            jakarta.servlet.http.HttpServletRequest request) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = resolveDeliveryBoy(request);
        if (db == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_NOT_AUTHENTICATED);
            return ResponseEntity.status(401).body(res);
        }
        db = deps.deliveryBoyRepository.findById(db.getId()).orElseThrow();

        int warehouseId;
        try {
            warehouseId = Integer.parseInt(body.getOrDefault(KEY_WAREHOUSE_ID, "0").toString());
        } catch (NumberFormatException e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid warehouse ID");
            return ResponseEntity.badRequest().body(res);
        }
        String reason = (String) body.getOrDefault(KEY_REASON, "");

        Optional<WarehouseChangeRequest> existing = deps.warehouseChangeRequestRepository
                .findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING);
        if (existing.isPresent()) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "You already have a pending warehouse change request. Please wait for admin to review it.");
            return ResponseEntity.ok(res);
        }

        Warehouse requested = deps.warehouseRepository.findById(warehouseId).orElse(null);
        if (requested == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_WAREHOUSE_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }
        if (db.getWarehouse() != null && db.getWarehouse().getId() == warehouseId) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "You are already assigned to this warehouse");
            return ResponseEntity.ok(res);
        }

        WarehouseChangeRequest req = new WarehouseChangeRequest();
        req.setDeliveryBoy(db);
        req.setRequestedWarehouse(requested);
        req.setReason(reason.trim());
        req.setStatus(WarehouseChangeRequest.Status.PENDING);
        req.setRequestedAt(LocalDateTime.now());
        deps.warehouseChangeRequestRepository.save(req);

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, "Warehouse change request submitted. Admin will review it shortly.");
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/delivery/warehouses
     * Returns all active warehouses (for change-warehouse dropdown).
     */
    @GetMapping("/delivery/warehouses")
    public ResponseEntity<Map<String, Object>> flutterGetWarehouses() {
        Map<String, Object> res = new LinkedHashMap<>();
        List<Warehouse> warehouses = deps.warehouseRepository.findByActiveTrue();
        List<Map<String, Object>> data = warehouses.stream().map(wh -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put(KEY_ID,   wh.getId());
            m.put(KEY_NAME, wh.getName());
            m.put(K_CITY, wh.getCity());
            m.put(K_CODE, wh.getWarehouseCode());
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true);
        res.put("warehouses", data);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // BANNERS  (new — mobile home carousel)
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/flutter/banners
     *
     * Returns banners where active=true AND showOnCustomerHome=true,
     * ordered by displayOrder ASC — the same banners shown on the
     * post-login website customer-home.html carousel.
     *
     * Response: { success, banners: [ { id, title, imageUrl, linkUrl, displayOrder } ] }
     */
    @GetMapping("/banners")
    public ResponseEntity<Map<String, Object>> getCustomerHomeBanners() {
        List<Banner> banners = deps.bannerRepository
                .findByActiveTrueAndShowOnCustomerHomeTrueOrderByDisplayOrderAsc();

        List<Map<String, Object>> bannerList = banners.stream().map(b -> {
            Map<String, Object> bm = new LinkedHashMap<>();
            bm.put(KEY_ID,           b.getId());
            bm.put(KEY_TITLE,        b.getTitle()    != null ? b.getTitle()    : "");
            bm.put(KEY_IMAGE_URL,     b.getImageUrl() != null ? b.getImageUrl() : "");
            bm.put(KEY_LINK_URL,      b.getLinkUrl()  != null ? b.getLinkUrl()  : "");
            bm.put("displayOrder", b.getDisplayOrder());
            return bm;
        }).toList();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put(KEY_SUCCESS, true);
        res.put(KEY_COUNT,   bannerList.size());
        res.put("banners", bannerList);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // PRODUCTS
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/products[?search=x][?category=y][?minPrice=x][?maxPrice=y][?sortBy=price_asc|price_desc|name] */
    @GetMapping("/products")
    public ResponseEntity<Map<String, Object>> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false, defaultValue = "default") String sortBy) {
        Map<String, Object> res = new HashMap<>();
        List<Product> products;
        if (search != null && !search.isBlank()) {
            java.util.Set<Product> found = new java.util.LinkedHashSet<>();
            found.addAll(deps.productRepository.findByNameContainingIgnoreCase(search));
            found.addAll(deps.productRepository.findByDescriptionContainingIgnoreCase(search));
            found.addAll(deps.productRepository.findByCategoryContainingIgnoreCase(search));
            products = found.stream().filter(Product::isApproved).toList();
        } else if (category != null && !category.isBlank()) {
            products = deps.productRepository.findByCategoryAndApprovedTrue(category);
        } else {
            products = deps.productRepository.findByApprovedTrue();
        }
        // Price range filter (budget-based shopping)
        if (minPrice != null) products = products.stream().filter(p -> p.getPrice() >= minPrice).toList();
        if (maxPrice != null) products = products.stream().filter(p -> p.getPrice() <= maxPrice).toList();
        // Sort
        switch (sortBy == null ? "default" : sortBy.toLowerCase()) {
            case "price_asc":  products.sort(Comparator.comparingDouble(Product::getPrice)); break;
            case "price_desc": products.sort(Comparator.comparingDouble(Product::getPrice).reversed()); break;
            case "name":       products.sort(Comparator.comparing(p -> p.getName() == null ? "" : p.getName().toLowerCase())); break;
            default: break;
        }
        res.put(KEY_SUCCESS, true);
        res.put(KEY_PRODUCTS, products.stream().map(this::mapProduct).toList());
        res.put(KEY_COUNT, products.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/{id} — includes reviews */
    @GetMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = deps.productRepository.findById(id).orElse(null);
        if (p == null || !p.isApproved()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_PRODUCT_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }
        Map<String, Object> pm = mapProduct(p);
        List<Review> reviews = deps.reviewRepository.findAll().stream()
                .filter(r -> r.getProduct() != null && r.getProduct().getId() == id)
                .toList();
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        pm.put(K_REVIEWS, reviews.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, r.getId());
            m.put(K_RATING, r.getRating());
            m.put(K_COMMENT, r.getComment());
            m.put(K_CUSTOMER_NAME, r.getCustomerName());
            return m;
        }).toList());
        pm.put(K_AVG_RATING, Math.round(avg * 10.0) / 10.0);
        pm.put("reviewCount", reviews.size());
        res.put(KEY_SUCCESS, true);
        res.put("product", pm);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/{id}/reviews */
    @GetMapping("/products/{id}/reviews")
    public ResponseEntity<Map<String, Object>> getProductReviews(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        List<Review> reviews = deps.reviewRepository.findAll().stream()
                .filter(r -> r.getProduct() != null && r.getProduct().getId() == id)
                .toList();
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        res.put(KEY_SUCCESS, true);
        res.put(K_REVIEWS, reviews.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, r.getId());
            m.put(K_RATING, r.getRating());
            m.put(K_COMMENT, r.getComment());
            m.put(K_CUSTOMER_NAME, r.getCustomerName());
            return m;
        }).toList());
        res.put(K_AVG_RATING, Math.round(avg * 10.0) / 10.0);
        res.put("reviewCount", reviews.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/categories */
    @GetMapping("/products/categories")
    public ResponseEntity<Map<String, Object>> getCategories() {
        Map<String, Object> res = new HashMap<>();
        List<String> categories = deps.productRepository.findByApprovedTrue()
                .stream().map(Product::getCategory).filter(Objects::nonNull)
                .distinct().sorted().toList();
        res.put(KEY_SUCCESS, true);
        res.put("categories", categories);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // CART
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/cart */
    @GetMapping("/cart")
    public ResponseEntity<Map<String, Object>> getCart(@RequestHeader(K_X_CUSTOMER_ID) int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Cart cart = customer.getCart();
        if (cart == null) {
            res.put(KEY_SUCCESS, true); res.put(KEY_ITEMS, new ArrayList<>()); res.put(KEY_TOTAL, 0.0);
            res.put("subtotal", 0.0); res.put(K_DELIVERY_CHARGE, 0.0); res.put(K_COUPON_DISCOUNT, 0.0);
            res.put(KEY_COUPON_APPLIED, false); res.put(KEY_COUPON_CODE, ""); res.put(KEY_COUNT, 0);
            return ResponseEntity.ok(res);
        }
        List<Map<String, Object>> items = cart.getItems().stream().map(this::mapItem).toList();
        double subtotal = cart.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        // Coupon
        com.example.ekart.dto.Coupon applied = appliedCoupons.get(customerId);
        double couponDiscount = 0;
        if (applied != null && applied.isValid() && subtotal >= applied.getMinOrderAmount()) {
            couponDiscount = applied.calculateDiscount(subtotal);
            res.put(KEY_COUPON_APPLIED, true); res.put(KEY_COUPON_CODE, applied.getCode()); res.put(K_COUPON_DISCOUNT, couponDiscount);
        } else {
            if (applied != null) appliedCoupons.remove(customerId);
            res.put(KEY_COUPON_APPLIED, false); res.put(KEY_COUPON_CODE, ""); res.put(K_COUPON_DISCOUNT, 0.0);
        }
        double discountedSubtotal = Math.max(0, subtotal - couponDiscount);
        double deliveryCharge;
        if (discountedSubtotal >= 500 || discountedSubtotal == 0) {
            deliveryCharge = 0.0;
        } else {
            deliveryCharge = 40.0;
        }
        double total = discountedSubtotal + deliveryCharge;
        res.put(KEY_SUCCESS, true); res.put(KEY_ITEMS, items); res.put("itemCount", items.size());
        res.put("subtotal", subtotal); res.put(K_COUPON_DISCOUNT, couponDiscount);
        res.put(K_DELIVERY_CHARGE, deliveryCharge); res.put(KEY_TOTAL, total); res.put(KEY_COUNT, items.size());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/cart/add */
    @PostMapping("/cart/add")
    public ResponseEntity<Map<String, Object>> addToCart(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            Customer customer = deps.customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
            int productId = Integer.parseInt(body.get(K_PRODUCT_ID).toString());
            // FIX: read quantity from request body (Flutter sends the user-selected qty).
            // Default to 1 if not provided (backward-compat with single-tap add-to-cart).
            int requestedQty = 1;
            if (body.containsKey(KEY_QUANTITY)) {
                requestedQty = parseQuantitySafely(body.get(KEY_QUANTITY), requestedQty);
            }
            if (requestedQty < 1) requestedQty = 1;

            Product product = deps.productRepository.findById(productId).orElse(null);
            if (product == null || !product.isApproved()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_PRODUCT_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
            if (product.getStock() <= 0) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product out of stock"); return ResponseEntity.badRequest().body(res); }
            if (requestedQty > product.getStock()) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Only " + product.getStock() + " item(s) in stock");
                return ResponseEntity.badRequest().body(res);
            }
            Cart cart = customer.getCart();
            if (cart == null) { cart = new Cart(); customer.setCart(cart); }
            final int qty = requestedQty;
            Optional<Item> existing = cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId).findFirst();
            if (existing.isPresent()) {
                Item item = existing.get();
                int newQty = item.getQuantity() + qty;
                if (newQty > product.getStock()) {
                    res.put(KEY_SUCCESS, false);
                    res.put(KEY_MESSAGE, "Max stock reached. Only " + product.getStock() + " available.");
                    return ResponseEntity.badRequest().body(res);
                }
                item.setQuantity(newQty);
            } else {
                Item item = new Item();
                item.setName(product.getName()); item.setDescription(product.getDescription());
                item.setPrice(product.getPrice()); item.setCategory(product.getCategory());
                item.setQuantity(qty); item.setImageLink(product.getImageLink());
                item.setProductId(productId); item.setCart(cart);
                cart.getItems().add(item);
            }
            deps.customerRepository.save(customer);
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, qty == 1 ? "Added to cart" : qty + " items added to cart");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** DELETE /api/flutter/cart/remove/{productId} */
    @DeleteMapping("/cart/remove/{productId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId, @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null || customer.getCart() == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Cart not found"); return ResponseEntity.badRequest().body(res); }
        List<Item> toDelete = customer.getCart().getItems().stream()
                .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                .toList();
        customer.getCart().getItems().removeAll(toDelete);
        deps.customerRepository.save(customer);
        deps.itemRepository.deleteAll(toDelete);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Removed from cart");
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/cart/update */
    @PutMapping("/cart/update")
    public ResponseEntity<Map<String, Object>> updateCart(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null || customer.getCart() == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Cart not found"); return ResponseEntity.badRequest().body(res); }
        int productId = Integer.parseInt(body.get(K_PRODUCT_ID).toString());
        int quantity  = Integer.parseInt(body.get(KEY_QUANTITY).toString());
        Cart cart = customer.getCart();
        if (quantity <= 0) {
            List<Item> toDelete = cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                    .toList();
            cart.getItems().removeAll(toDelete);
            deps.customerRepository.save(customer);
            deps.itemRepository.deleteAll(toDelete);
        } else {
            cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                    .findFirst().ifPresent(i -> i.setQuantity(quantity));
            deps.customerRepository.save(customer);
        }
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Cart updated");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // ORDERS — CUSTOMER
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/orders/place
     *
     * Accepts both legacy (flat city) and structured address formats.
     * Body: {
     *   paymentMode, deliveryTime,
     *   // Structured address (preferred):
     *   recipientName, houseStreet, city, state, postalCode
     *   // OR legacy fallback:
     *   city
     * }
     */
    @PostMapping("/orders/place")
    public ResponseEntity<Map<String, Object>> placeOrder(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            Customer customer = deps.customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
            Cart cart = customer.getCart();
            if (cart == null || cart.getItems().isEmpty()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Cart is empty"); return ResponseEntity.badRequest().body(res); }

            List<Item> orderItems = new ArrayList<>();
            double total = buildOrderItems(cart.getItems(), orderItems, res);
            if (!orderItems.isEmpty() && res.containsKey(KEY_SUCCESS) && Boolean.FALSE.equals(res.get(KEY_SUCCESS))) {
                return ResponseEntity.badRequest().body(res);
            }

            String deliveryTime   = (String) body.getOrDefault(KEY_DELIVERY_TIME, "STANDARD");
            double deliveryCharge = "EXPRESS".equals(deliveryTime) ? 50.0 : 0.0;

            ResponseEntity<Map<String, Object>> addrError = resolveDeliveryAddress(body, res);
            if (addrError != null) return addrError;
            String deliveryAddress = (String) res.remove(K_RESOLVED_ADDRESS);

            Order order = new Order();
            order.setCustomer(customer);
            order.setItems(orderItems);
            order.setAmount(total);
            order.setDeliveryCharge(deliveryCharge);
            order.setTotalPrice(total + deliveryCharge);
            order.setPaymentMode((String) body.getOrDefault(KEY_PAYMENT_MODE, "COD"));
            order.setDeliveryTime(deliveryTime);
            order.setDateTime(LocalDateTime.now());
            order.setTrackingStatus(TrackingStatus.PROCESSING);
            order.setDeliveryAddress(deliveryAddress);
            order.setCurrentCity(deliveryAddress);
            deps.orderRepository.save(order);

            cart.getItems().clear();
            deps.customerRepository.save(customer);

            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Order placed successfully");
            res.put(K_ORDER_ID, order.getId());
            res.put(KEY_TOTAL_PRICE, order.getTotalPrice());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * Deducts stock and builds order items from cart. Returns total amount.
     * On stock failure, populates res with error and returns -1.
     */
    private double buildOrderItems(List<Item> cartItems, List<Item> orderItems, Map<String, Object> res) {
        double total = 0;
        for (Item cartItem : cartItems) {
            Product product = deps.productRepository.findById(cartItem.getProductId()).orElse(null);
            if (product == null || product.getStock() < cartItem.getQuantity()) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Insufficient stock for: " + cartItem.getName());
                return -1;
            }
            product.setStock(product.getStock() - cartItem.getQuantity());
            deps.productRepository.save(product);
            Item oi = new Item();
            oi.setName(cartItem.getName()); oi.setDescription(cartItem.getDescription());
            oi.setPrice(cartItem.getPrice()); oi.setCategory(cartItem.getCategory());
            oi.setQuantity(cartItem.getQuantity()); oi.setImageLink(cartItem.getImageLink());
            oi.setProductId(cartItem.getProductId());
            orderItems.add(oi);
            total += cartItem.getPrice() * cartItem.getQuantity();
        }
        return total;
    }

    /**
     * Resolves the delivery address from structured fields or legacy city fallback.
     * Stores the resolved address in res under K_RESOLVED_ADDRESS.
     * Returns a 400 ResponseEntity on PIN validation failure, null on success.
     */
    private ResponseEntity<Map<String, Object>> resolveDeliveryAddress(
            Map<String, Object> body, Map<String, Object> res) {
        String recipientName = (String) body.get(K_RECIPIENT_NAME);
        if (recipientName != null && !recipientName.isBlank()) {
            String postalCode = (String) body.getOrDefault(K_POSTAL_CODE, "");
            if (!postalCode.isBlank() && !PinCodeValidator.isValid(postalCode)) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, PinCodeValidator.ERROR_MESSAGE);
                return ResponseEntity.badRequest().body(res);
            }
            String houseStreet = (String) body.getOrDefault(K_HOUSE_STREET, "");
            String city        = (String) body.getOrDefault(K_CITY,        "");
            String state       = (String) body.getOrDefault(K_STATE,       "");
            String address = recipientName.trim()
                    + (houseStreet.isBlank() ? "" : ", " + houseStreet.trim())
                    + (city.isBlank()        ? "" : ", " + city.trim())
                    + (state.isBlank()       ? "" : ", " + state.trim())
                    + (postalCode.isBlank()  ? "" : " - " + postalCode.trim());
            res.put(K_RESOLVED_ADDRESS, address);
        } else {
            res.put(K_RESOLVED_ADDRESS, body.getOrDefault(K_CITY, ""));
        }
        return null;
    }

    /** GET /api/flutter/orders */
    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> getOrders(@RequestHeader(K_X_CUSTOMER_ID) int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Order> orders = deps.orderRepository.findByCustomer(customer);
        res.put(KEY_SUCCESS, true);
        res.put(K_ORDERS, orders.stream().map(this::mapOrder).toList());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/orders/{id} */
    @GetMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrder(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = deps.orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        res.put(KEY_SUCCESS, true); res.put("order", mapOrder(order));
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/orders/{id}/cancel */
    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = deps.orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (order.getTrackingStatus() == TrackingStatus.DELIVERED || order.getTrackingStatus() == TrackingStatus.CANCELLED) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Cannot cancel this order");
            return ResponseEntity.badRequest().body(res);
        }
        for (Item item : order.getItems()) {
            if (item.getProductId() != null) {
                deps.productRepository.findById(item.getProductId()).ifPresent(p -> {
                    p.setStock(p.getStock() + item.getQuantity()); deps.productRepository.save(p);
                });
            }
        }
        order.setTrackingStatus(TrackingStatus.CANCELLED); deps.orderRepository.save(order);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Order cancelled");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // COUPONS
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/coupons — list all valid coupons */
    @GetMapping("/coupons")
    public ResponseEntity<Map<String, Object>> getActiveCoupons() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> list = deps.couponRepository.findByActiveTrue().stream()
                .filter(com.example.ekart.dto.Coupon::isValid)
                .map(c -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put(K_CODE,           c.getCode());
                    m.put(K_DESCRIPTION,    c.getDescription());
                    m.put(K_TYPE,           c.getType().name());
                    m.put("value",          c.getValue());
                    m.put("typeLabel",      c.getTypeLabel());
                    m.put("minOrderAmount", c.getMinOrderAmount());
                    m.put("maxDiscount",    c.getMaxDiscount());
                    m.put("expiryDate",     c.getExpiryDate() != null ? c.getExpiryDate().toString() : null);
                    return m;
                }).toList();
        res.put(KEY_SUCCESS, true); res.put("coupons", list);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/cart/coupon — apply a coupon to cart */
    @PostMapping("/cart/coupon")
    public ResponseEntity<Map<String, Object>> applyCoupon(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        String code = body.get(K_CODE) instanceof String s ? s.toUpperCase().trim() : "";
        if (code.isEmpty()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Coupon code is required"); return ResponseEntity.badRequest().body(res); }
        com.example.ekart.dto.Coupon coupon = deps.couponRepository.findByCode(code).orElse(null);
        if (coupon == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid coupon code"); return ResponseEntity.ok(res); }
        if (!coupon.isValid()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "This coupon has expired or reached its usage limit"); return ResponseEntity.ok(res); }
        Cart cart = customer.getCart();
        double subtotal = (cart == null) ? 0 : cart.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        if (subtotal < coupon.getMinOrderAmount()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Minimum order amount ₹" + (int) coupon.getMinOrderAmount() + " required for this coupon");
            return ResponseEntity.ok(res);
        }
        double discount = coupon.calculateDiscount(subtotal);
        appliedCoupons.put(customerId, coupon);
        res.put(KEY_SUCCESS, true); res.put(K_CODE, coupon.getCode()); res.put(K_DESCRIPTION, coupon.getDescription());
        res.put("discount", discount); res.put("typeLabel", coupon.getTypeLabel());
        res.put(KEY_MESSAGE, coupon.getDescription() + " — saving ₹" + (int) discount);
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/cart/coupon — remove applied coupon */
    @DeleteMapping("/cart/coupon")
    public ResponseEntity<Map<String, Object>> removeCoupon(@RequestHeader(K_X_CUSTOMER_ID) int customerId) {
        appliedCoupons.remove(customerId);
        Map<String, Object> removeRes = new HashMap<>();
        removeRes.put(KEY_SUCCESS, true);
        removeRes.put(KEY_MESSAGE, "Coupon removed");
        return ResponseEntity.ok(removeRes);
    }

    // ═══════════════════════════════════════════════════════
    // ORDER TRACKING & REPORT ISSUE
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/orders/{id}/track — live tracking with event history */
    @GetMapping("/orders/{id}/track")
    public ResponseEntity<Map<String, Object>> trackOrder(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = deps.orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer() == null || order.getCustomer().getId() != customerId) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        com.example.ekart.dto.TrackingStatus status = order.getTrackingStatus();
        List<com.example.ekart.dto.TrackingEventLog> events = deps.trackingEventLogRepository.findByOrderOrderByEventTimeAsc(order);
        List<Map<String, Object>> history = events.stream().map(e -> {
            Map<String, Object> ev = new HashMap<>();
            ev.put(KEY_STATUS,      e.getStatus() != null ? e.getStatus().name() : null);
            ev.put("location",    e.getCity());
            ev.put(K_DESCRIPTION, e.getDescription());
            ev.put("timestamp",   e.getEventTime() != null ? e.getEventTime().toString() : null);
            return ev;
        }).toList();
        res.put(KEY_SUCCESS,         true);
        res.put(K_ORDER_ID,         order.getId());
        res.put("currentStatus",   status != null ? status.name() : null);
        res.put(K_CURRENT_CITY,     order.getCurrentCity());
        res.put("progressPercent", status != null ? status.getProgressPercent() : 0);
        if (order.getOrderDate() != null && status != null
                && status != com.example.ekart.dto.TrackingStatus.DELIVERED
                && status != com.example.ekart.dto.TrackingStatus.CANCELLED
                && status != com.example.ekart.dto.TrackingStatus.REFUNDED) {
            res.put("estimatedDelivery", order.getOrderDate().plusHours(48).toString());
        }
        res.put("history", history);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/orders/{id}/report-issue — dispute/report with admin email */
    @PostMapping("/orders/{id}/report-issue")
    public ResponseEntity<Map<String, Object>> reportIssue(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @PathVariable int id,
            @RequestBody Map<String, String> body,
            jakarta.servlet.http.HttpServletRequest req) {
        Map<String, Object> res = new HashMap<>();
        Order order = deps.orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        String reason      = body != null ? body.get(KEY_REASON)      : null;
        String description = body != null ? body.get(K_DESCRIPTION) : null;
        if (reason == null || reason.isBlank()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "reason is required");
            return ResponseEntity.badRequest().body(res);
        }
        String customerEmail = order.getCustomer().getEmail();
        if (log.isInfoEnabled()) {
            log.info("[DISPUTE] orderId={} customerId={} reason=[sanitized] description=[sanitized] at={}",
                id, customerId,
                LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        }
        try {
            deps.emailSender.sendDisputeNotification(adminEmail, adminEmail, id, customerId, customerEmail, reason, description);
        } catch (Exception e) {
            log.warn("[DISPUTE] Admin email dispatch failed: {}", e.getMessage());
        }
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Your issue has been reported. Our team will review it shortly.");
        res.put(K_ORDER_ID, id); res.put(KEY_REASON, reason);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // WISHLIST
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/wishlist */
    @GetMapping("/wishlist")
    public ResponseEntity<Map<String, Object>> getWishlist(@RequestHeader(K_X_CUSTOMER_ID) int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Wishlist> wishlist = deps.wishlistRepository.findByCustomer(customer);
        List<Map<String, Object>> items = wishlist.stream().map(w -> {
            Map<String, Object> m = new HashMap<>();
            Product p = w.getProduct();
            m.put("wishlistId", w.getId()); m.put("addedAt", w.getAddedAt() != null ? w.getAddedAt().toString() : null);
            m.put(K_PRODUCT_ID, p.getId()); m.put(KEY_NAME, p.getName()); m.put(K_PRICE, p.getPrice());
            m.put(K_IMAGE_LINK, p.getImageLink()); m.put(K_CATEGORY, p.getCategory()); m.put("inStock", p.getStock() > 0);
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put(KEY_COUNT, items.size()); res.put(KEY_ITEMS, items);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/wishlist/ids */
    @GetMapping("/wishlist/ids")
    public ResponseEntity<Map<String, Object>> getWishlistIds(@RequestHeader(K_X_CUSTOMER_ID) int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Integer> ids = deps.wishlistRepository.findByCustomer(customer).stream()
                .map(w -> w.getProduct().getId()).toList();
        res.put(KEY_SUCCESS, true); res.put("ids", ids);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/wishlist/toggle */
    @PostMapping("/wishlist/toggle")
    public ResponseEntity<Map<String, Object>> toggleWishlist(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, Integer> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Integer productId = body.get(K_PRODUCT_ID);
        if (productId == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "productId is required"); return ResponseEntity.badRequest().body(res); }
        Product product = deps.productRepository.findById(productId).orElse(null);
        if (product == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_PRODUCT_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        List<Wishlist> existing = deps.wishlistRepository.findByCustomer(customer).stream()
                .filter(w -> w.getProduct().getId() == productId).toList();
        if (!existing.isEmpty()) {
            deps.wishlistRepository.deleteAll(existing);
            res.put(KEY_SUCCESS, true); res.put("wishlisted", false); res.put(KEY_MESSAGE, "Removed from wishlist");
        } else {
            Wishlist w = new Wishlist(); w.setCustomer(customer); w.setProduct(product); w.setAddedAt(LocalDateTime.now());
            deps.wishlistRepository.save(w);
            res.put(KEY_SUCCESS, true); res.put("wishlisted", true); res.put(KEY_MESSAGE, "Added to wishlist");
        }
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/profile */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@RequestHeader(K_X_CUSTOMER_ID) int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> profile = new HashMap<>();
        profile.put(KEY_ID, customer.getId()); profile.put(KEY_NAME, customer.getName());
        profile.put(KEY_EMAIL, customer.getEmail()); profile.put(KEY_MOBILE, customer.getMobile());
        profile.put("profileImage", customer.getProfileImage());
        profile.put("addresses", customer.getAddresses().stream().map(a -> {
            Map<String, Object> am = new HashMap<>();
            am.put(KEY_ID,              a.getId());
            am.put("formattedAddress", a.getFormattedAddress());
            am.put(K_RECIPIENT_NAME,   a.getRecipientName() != null ? a.getRecipientName() : "");
            am.put(K_HOUSE_STREET,     a.getHouseStreet()   != null ? a.getHouseStreet()   : "");
            am.put(K_CITY,            a.getCity()          != null ? a.getCity()          : "");
            am.put(K_STATE,           a.getState()         != null ? a.getState()         : "");
            am.put(K_POSTAL_CODE,      a.getPostalCode()    != null ? a.getPostalCode()    : "");
            am.put("details",         a.getDetails()       != null ? a.getDetails()       : "");
            return am;
        }).toList());
        res.put(KEY_SUCCESS, true); res.put("profile", profile);
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/profile/update */
    @PutMapping("/profile/update")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name"))   customer.setName((String) body.get("name"));
        if (body.containsKey(KEY_MOBILE)) customer.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString()));
        deps.customerRepository.save(customer);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Profile updated successfully");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/profile/address/add
     * Accepts structured fields: recipientName, houseStreet, city, state, postalCode.
     * Also accepts legacy "address" flat-text field for backward compatibility.
     */
    @PostMapping("/profile/address/add")
    public ResponseEntity<Map<String, Object>> addAddress(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }

        Address address = new Address();
        address.setCustomer(customer);

        String recipientName = body.get(K_RECIPIENT_NAME);
        if (recipientName != null && !recipientName.isBlank()) {
            address.setRecipientName(recipientName.trim());
            address.setHouseStreet(body.getOrDefault(K_HOUSE_STREET, "").trim());
            address.setCity(body.getOrDefault(K_CITY, "").trim());
            address.setState(body.getOrDefault(K_STATE, "").trim());
            String postalCode = body.getOrDefault(K_POSTAL_CODE, "").trim();
            if (!postalCode.isBlank() && !PinCodeValidator.isValid(postalCode)) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, PinCodeValidator.ERROR_MESSAGE);
                return ResponseEntity.badRequest().body(res);
            }
            address.setPostalCode(postalCode);
        } else {
            String details = body.get("address");
            if (details == null || details.isBlank()) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Address cannot be empty");
                return ResponseEntity.badRequest().body(res);
            }
            address.setDetails(details.trim());
        }

        customer.getAddresses().add(address);
        deps.customerRepository.save(customer);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Address added");
        res.put("addressId", address.getId());
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/profile/address/{id}/delete */
    @DeleteMapping("/profile/address/{id}/delete")
    public ResponseEntity<Map<String, Object>> deleteAddress(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        customer.getAddresses().removeIf(a -> a.getId() == id);
        deps.customerRepository.save(customer);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Address deleted");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // REVIEWS
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/reviews/add
     *
     * The Flutter app enforces the delivery gate client-side (only shows
     * the review button after a DELIVERED order), but we do NOT re-validate
     * server-side to keep the endpoint simple and allow admin overrides.
     */
    @PostMapping("/reviews/add")
    public ResponseEntity<Map<String, Object>> addReview(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        int productId  = Integer.parseInt(body.get(K_PRODUCT_ID).toString());
        int rating     = Integer.parseInt(body.get(K_RATING).toString());
        String comment = (String) body.get(K_COMMENT);
        Product product = deps.productRepository.findById(productId).orElse(null);
        if (product == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_PRODUCT_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        Review review = new Review();
        review.setProduct(product); review.setRating(rating); review.setComment(comment);
        review.setCustomerName(customer.getName());
        deps.reviewRepository.save(review);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Review added successfully");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // NOTIFY ME — Back-in-Stock  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/notify-me/{productId}
     * Subscribe the logged-in customer to a back-in-stock notification.
     */
    @PostMapping("/notify-me/{productId}")
    public ResponseEntity<Map<String, Object>> notifyMeSubscribe(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }
        Product product = deps.productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_PRODUCT_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        if (product.getStock() > 0) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Product is already in stock — add it to your cart!");
            res.put(KEY_SUBSCRIBED, false);
            return ResponseEntity.badRequest().body(res);
        }
        // Prevent duplicate subscriptions
        if (deps.backInStockRepository.existsByCustomerAndProductAndNotifiedFalse(customer, product)) {
            res.put(KEY_SUCCESS, true);
            res.put(KEY_SUBSCRIBED, true);
            res.put(KEY_MESSAGE, "You are already subscribed. We'll email you when it's back!");
            return ResponseEntity.ok(res);
        }
        BackInStockSubscription sub = new BackInStockSubscription(customer, product);
        deps.backInStockRepository.save(sub);
        res.put(KEY_SUCCESS, true);
        res.put(KEY_SUBSCRIBED, true);
        res.put(KEY_MESSAGE, "You'll be notified when " + product.getName() + " is back in stock!");
        return ResponseEntity.ok(res);
    }

    /**
     * DELETE /api/flutter/notify-me/{productId}
     * Unsubscribe the logged-in customer from a back-in-stock notification.
     */
    @DeleteMapping("/notify-me/{productId}")
    public ResponseEntity<Map<String, Object>> notifyMeUnsubscribe(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }
        Product product = deps.productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_PRODUCT_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        Optional<BackInStockSubscription> existing =
                deps.backInStockRepository.findByCustomerAndProduct(customer, product);
        if (existing.isPresent()) {
            deps.backInStockRepository.delete(existing.get());
            res.put(KEY_SUCCESS, true);
            res.put(KEY_SUBSCRIBED, false);
            res.put(KEY_MESSAGE, "Notification removed");
        } else {
            res.put(KEY_SUCCESS, true);
            res.put(KEY_SUBSCRIBED, false);
            res.put(KEY_MESSAGE, "No active subscription found");
        }
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/notify-me/{productId}
     * Check whether the logged-in customer is subscribed to a back-in-stock notification.
     * Response: { success, subscribed }
     */
    @GetMapping("/notify-me/{productId}")
    public ResponseEntity<Map<String, Object>> notifyMeStatus(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }
        Product product = deps.productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put(KEY_SUCCESS, true); res.put(KEY_SUBSCRIBED, false);
            return ResponseEntity.ok(res);
        }
        boolean subscribed = deps.backInStockRepository
                .existsByCustomerAndProductAndNotifiedFalse(customer, product);
        res.put(KEY_SUCCESS, true);
        res.put(KEY_SUBSCRIBED, subscribed);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // SPENDING SUMMARY
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/spending-summary */
    @GetMapping("/spending-summary")
    public ResponseEntity<Map<String, Object>> getSpendingSummary(@RequestHeader(K_X_CUSTOMER_ID) int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Order> delivered = deps.orderRepository.findByCustomer(customer).stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED).toList();
        if (delivered.isEmpty()) { res.put(KEY_SUCCESS, true); res.put("hasData", false); return ResponseEntity.ok(res); }
        double totalSpent = delivered.stream().mapToDouble(Order::getAmount).sum();
        int    totalOrders = delivered.size();
        double avgOrder    = totalOrders > 0 ? totalSpent / totalOrders : 0;
        Map<String, Double> catSpend = new LinkedHashMap<>();
        for (Order o : delivered) {
            for (Item item : o.getItems()) {
                String cat = item.getCategory() != null ? item.getCategory() : "Other";
                catSpend.merge(cat, item.getPrice() * item.getQuantity(), Double::sum);
            }
        }
        String topCategory = catSpend.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("N/A");
        Map<String, Double> monthly = new LinkedHashMap<>();
        int year = java.time.Year.now().getValue();
        for (Order o : delivered) {
            if (o.getOrderDate() != null && o.getOrderDate().getYear() == year) {
                String key = year + "-" + String.format("%02d", o.getOrderDate().getMonthValue());
                monthly.merge(key, o.getAmount(), Double::sum);
            }
        }
        res.put(KEY_SUCCESS, true); res.put("hasData", true);
        res.put("totalSpent", totalSpent); res.put(K_TOTAL_ORDERS, totalOrders);
        res.put("averageOrderValue", avgOrder); res.put("topCategory", topCategory);
        res.put("categorySpending", catSpend); res.put("monthlySpending", monthly);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // REFUNDS
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/refund/request  —  body: { orderId, reason, type } */
    @PostMapping("/refund/request")
    public ResponseEntity<Map<String, Object>> requestRefund(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            Customer customer = deps.customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
            int orderId   = Integer.parseInt(body.get(K_ORDER_ID).toString());
            String reason = (String) body.getOrDefault(KEY_REASON, "");
            String type   = (String) body.getOrDefault(K_TYPE, K_REFUND);
            Order order = deps.orderRepository.findById(orderId).orElse(null);
            if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
            if (order.getTrackingStatus() != TrackingStatus.DELIVERED) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Refund can only be requested for delivered orders"); return ResponseEntity.badRequest().body(res); }
            Refund refund = new Refund();
            refund.setOrder(order); refund.setCustomer(customer);
            refund.setReason("[" + type + "] " + reason);
            refund.setStatus(RefundStatus.PENDING);
            refund.setAmount(order.getTotalPrice());
            deps.refundRepository.save(refund);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Refund request submitted");
            res.put("refundId", refund.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** GET /api/flutter/refund/status/{orderId} */
    @GetMapping("/refund/status/{orderId}")
    public ResponseEntity<Map<String, Object>> getRefundStatus(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId, @PathVariable int orderId) {
        Map<String, Object> res = new HashMap<>();
        Order order = deps.orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Refund> refunds = deps.refundRepository.findByOrder(order);
        if (refunds.isEmpty()) { res.put(KEY_SUCCESS, true); res.put("hasRefund", false); return ResponseEntity.ok(res); }
        Refund latest = refunds.get(refunds.size() - 1);
        res.put(KEY_SUCCESS, true); res.put("hasRefund", true);
        res.put(KEY_STATUS, latest.getStatus().name());
        String storedReason  = latest.getReason() != null ? latest.getReason() : "";
        String refundType;
        String displayReason;
        if (storedReason.startsWith("[REFUND] "))           { refundType = K_REFUND;      displayReason = storedReason.substring(9);  }
        else if (storedReason.startsWith("[REPLACEMENT] ")) { refundType = "REPLACEMENT"; displayReason = storedReason.substring(14); }
        else                                                { refundType = K_REFUND;      displayReason = storedReason; }
        res.put(KEY_REASON, displayReason);
        res.put(K_TYPE, refundType);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — VIEW
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/vendor/products */
    @GetMapping("/vendor/products")
    public ResponseEntity<Map<String, Object>> getVendorProducts(@RequestHeader(K_X_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Product> products = deps.productRepository.findByVendor(vendor);
        res.put(KEY_SUCCESS, true);
        res.put(KEY_PRODUCTS, products.stream().map(this::mapProduct).toList());
        res.put(KEY_COUNT, products.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/orders */
    @GetMapping("/vendor/orders")
    public ResponseEntity<Map<String, Object>> getVendorOrders(@RequestHeader(K_X_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Integer> vendorProductIds = deps.productRepository.findByVendor(vendor).stream().map(Product::getId).toList();
        List<Order> allOrders = deps.orderRepository.findOrdersByVendor(vendor);
        List<Map<String, Object>> vendorOrders = allOrders.stream().map(order -> {
            Map<String, Object> o = mapOrder(order);
            List<Map<String, Object>> vendorItems = order.getItems().stream()
                    .filter(i -> i.getProductId() != null && vendorProductIds.contains(i.getProductId()))
                    .map(this::mapItem).toList();
            o.put(KEY_ITEMS, vendorItems);
            double vendorTotal = vendorItems.stream().mapToDouble(i -> (double) i.get(K_PRICE) * (int) i.get(KEY_QUANTITY)).sum();
            o.put("vendorTotal", vendorTotal);
            return o;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put(K_ORDERS, vendorOrders);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/stats */
    @GetMapping("/vendor/stats")
    public ResponseEntity<Map<String, Object>> getVendorStats(@RequestHeader(K_X_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Product> products = deps.productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).toList();
        List<Order> orders = deps.orderRepository.findOrdersByVendor(vendor);
        double totalRevenue = orders.stream().filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED)
                .flatMap(o -> o.getItems().stream())
                .filter(i -> i.getProductId() != null && productIds.contains(i.getProductId()))
                .mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        long activeProducts   = products.stream().filter(Product::isApproved).count();
        long lowStockProducts = products.stream().filter(p -> p.getStock() <= (p.getStockAlertThreshold() != null ? p.getStockAlertThreshold() : 10)).count();
        res.put(KEY_SUCCESS, true); res.put(K_TOTAL_REVENUE, totalRevenue);
        res.put(K_TOTAL_ORDERS, orders.size()); res.put(K_TOTAL_PRODUCTS, products.size());
        res.put("activeProducts", activeProducts); res.put("lowStockProducts", lowStockProducts);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — PRODUCT CRUD
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/vendor/products/add */
    @PostMapping("/vendor/products/add")
    public ResponseEntity<Map<String, Object>> vendorAddProduct(
            @RequestHeader(K_X_VENDOR_ID) int vendorId, @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        try {
            Product p = new Product();
            p.setName((String) body.get("name")); p.setDescription((String) body.get(K_DESCRIPTION));
            p.setPrice(Double.parseDouble(body.get(K_PRICE).toString()));
            p.setCategory((String) body.get(K_CATEGORY));
            p.setStock(Integer.parseInt(body.get(K_STOCK).toString()));
            p.setImageLink((String) body.getOrDefault(K_IMAGE_LINK, ""));
            Object mrpVal = body.get(K_MRP); if (mrpVal != null) p.setMrp(Double.parseDouble(mrpVal.toString()));
            p.setApproved(false); p.setVendor(vendor);
            Object thresh = body.get(K_STOCK_ALERT_THRESHOLD);
            if (thresh != null) p.setStockAlertThreshold(Integer.parseInt(thresh.toString()));
            Object pins = body.get(K_ALLOWED_PIN_CODES);
            if (pins != null && !pins.toString().isBlank()) p.setAllowedPinCodes(pins.toString().trim());
            deps.productRepository.save(p);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Product added. Pending admin approval."); res.put(K_PRODUCT_ID, p.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_FAILED_PREFIX + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** PUT /api/flutter/vendor/products/{id}/update */
    @PutMapping("/vendor/products/{id}/update")
    public ResponseEntity<Map<String, Object>> vendorUpdateProduct(
            @RequestHeader(K_X_VENDOR_ID) int vendorId, @PathVariable int id, @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Product p = deps.productRepository.findById(id).orElse(null);
        if (p == null || p.getVendor() == null || p.getVendor().getId() != vendorId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found or not yours"); return ResponseEntity.badRequest().body(res); }
        try {
            if (body.containsKey("name"))        p.setName((String) body.get("name"));
            if (body.containsKey(K_DESCRIPTION)) p.setDescription((String) body.get(K_DESCRIPTION));
            if (body.containsKey(K_PRICE))       p.setPrice(Double.parseDouble(body.get(K_PRICE).toString()));
            if (body.containsKey(K_CATEGORY))    p.setCategory((String) body.get(K_CATEGORY));
            if (body.containsKey(K_STOCK))       p.setStock(Integer.parseInt(body.get(K_STOCK).toString()));
            if (body.containsKey(K_IMAGE_LINK))   p.setImageLink((String) body.get(K_IMAGE_LINK));
            if (body.containsKey(K_MRP))         p.setMrp(Double.parseDouble(body.get(K_MRP).toString()));
            if (body.containsKey(K_STOCK_ALERT_THRESHOLD)) p.setStockAlertThreshold(Integer.parseInt(body.get(K_STOCK_ALERT_THRESHOLD).toString()));
            if (body.containsKey(K_ALLOWED_PIN_CODES)) p.setAllowedPinCodes(
                body.get(K_ALLOWED_PIN_CODES) == null ? null : body.get(K_ALLOWED_PIN_CODES).toString().trim());
            deps.productRepository.save(p);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Product updated successfully.");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_FAILED_PREFIX + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** DELETE /api/flutter/vendor/products/{id}/delete */
    @DeleteMapping("/vendor/products/{id}/delete")
    public ResponseEntity<Map<String, Object>> vendorDeleteProduct(
            @RequestHeader(K_X_VENDOR_ID) int vendorId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Product p = deps.productRepository.findById(id).orElse(null);
        if (p == null || p.getVendor() == null || p.getVendor().getId() != vendorId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found or not yours"); return ResponseEntity.badRequest().body(res); }
        deps.productRepository.delete(p);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Product deleted.");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/sales-report */
    @GetMapping("/vendor/sales-report")
    public ResponseEntity<Map<String, Object>> vendorSalesReport(@RequestHeader(K_X_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Product> products  = deps.productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).toList();
        List<Order>   allOrders = deps.orderRepository.findOrdersByVendor(vendor);
        List<Order>   activeOrders = allOrders.stream().filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED).toList();
        double totalRevenue = activeOrders.stream().flatMap(o -> o.getItems().stream())
                .filter(i -> i.getProductId() != null && productIds.contains(i.getProductId()))
                .mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        long pendingOrders = allOrders.stream().filter(o -> o.getTrackingStatus() == TrackingStatus.PROCESSING || o.getTrackingStatus() == TrackingStatus.SHIPPED).count();
        Map<Integer, Integer> unitsSoldMap = new HashMap<>();
        for (Order o : activeOrders) {
            for (Item item : o.getItems()) {
                if (item.getProductId() != null && productIds.contains(item.getProductId()))
                    unitsSoldMap.merge(item.getProductId(), item.getQuantity(), Integer::sum);
            }
        }
        List<Map<String, Object>> topProducts = products.stream()
                .filter(p -> unitsSoldMap.containsKey(p.getId()))
                .sorted((a, b) -> Integer.compare(unitsSoldMap.getOrDefault(b.getId(), 0), unitsSoldMap.getOrDefault(a.getId(), 0)))
                .limit(10).map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    int units = unitsSoldMap.getOrDefault(p.getId(), 0);
                    m.put(KEY_ID, p.getId()); m.put(KEY_NAME, p.getName()); m.put("unitsSold", units); m.put("revenue", units * p.getPrice());
                    return m;
                }).toList();
        List<Map<String, Object>> recentOrders = allOrders.stream()
                .sorted(Comparator.comparingInt(Order::getId).reversed()).limit(10).map(o -> {
                    List<Item> vi = o.getItems().stream().filter(i -> i.getProductId() != null && productIds.contains(i.getProductId())).toList();
                    double vTotal = vi.stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
                    Map<String, Object> m = new HashMap<>();
                    m.put(KEY_ID, o.getId()); m.put(KEY_TRACKING_STATUS, o.getTrackingStatus().name()); m.put("vendorTotal", vTotal);
                    return m;
                }).toList();
        res.put(KEY_SUCCESS, true); res.put(K_TOTAL_REVENUE, totalRevenue);
        res.put(K_TOTAL_ORDERS, allOrders.size()); res.put(K_TOTAL_PRODUCTS, products.size());
        res.put("pendingOrders", pendingOrders); res.put("topProducts", topProducts); res.put("recentOrders", recentOrders);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — PROFILE & STOCK ALERTS
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/vendor/profile */
    @GetMapping("/vendor/profile")
    public ResponseEntity<Map<String, Object>> getVendorProfile(@RequestHeader(K_X_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> v = new HashMap<>();
        v.put(KEY_ID, vendor.getId()); v.put(KEY_NAME, vendor.getName());
        v.put(KEY_EMAIL, vendor.getEmail()); v.put(KEY_MOBILE, vendor.getMobile());
        v.put(KEY_VENDOR_CODE, vendor.getVendorCode()); v.put(K_VERIFIED, vendor.isVerified());
        // Include description and has-password flag (needed by profile/storefront screens)
        v.put(K_DESCRIPTION, vendor.getDescription() != null ? vendor.getDescription() : "");
        v.put(KEY_PASSWORD, vendor.getPassword() != null && !vendor.getPassword().isBlank());
        res.put(KEY_SUCCESS, true); res.put("vendor", v);
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/vendor/profile/update */
    @PutMapping("/vendor/profile/update")
    public ResponseEntity<Map<String, Object>> updateVendorProfile(
            @RequestHeader(K_X_VENDOR_ID) int vendorId, @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name") && !((String) body.get("name")).isBlank())
            vendor.setName((String) body.get("name"));
        if (body.containsKey(KEY_MOBILE))
            try { vendor.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString())); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
        deps.vendorRepository.save(vendor);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Profile updated successfully");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/stock-alerts */
    @GetMapping("/vendor/stock-alerts")
    public ResponseEntity<Map<String, Object>> getStockAlerts(@RequestHeader(K_X_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<StockAlert> alerts = deps.stockAlertRepository.findByVendor(vendor);
        alerts.sort((a, b) -> {
            if (a.isAcknowledged() != b.isAcknowledged()) return a.isAcknowledged() ? 1 : -1;
            return Integer.compare(b.getId(), a.getId());
        });
        int unacknowledged = (int) alerts.stream().filter(a -> !a.isAcknowledged()).count();
        List<Map<String, Object>> alertMaps = alerts.stream().map(this::stockAlertToMap).toList();
        res.put(KEY_SUCCESS, true); res.put("alerts", alertMaps); res.put("unacknowledgedCount", unacknowledged);
        return ResponseEntity.ok(res);
    }

    private Map<String, Object> stockAlertToMap(StockAlert a) {
        Map<String, Object> m = new HashMap<>();
        m.put(KEY_ID, a.getId());
        m.put(KEY_PRODUCT_NAME,  a.getProduct() != null ? a.getProduct().getName()  : "Unknown");
        m.put(K_PRODUCT_ID,    a.getProduct() != null ? a.getProduct().getId()    : 0);
        m.put("currentStock", a.getProduct() != null ? a.getProduct().getStock() : 0);
        m.put("threshold",    a.getProduct() != null && a.getProduct().getStockAlertThreshold() != null ? a.getProduct().getStockAlertThreshold() : 10);
        m.put(KEY_MESSAGE,      a.getMessage());
        m.put("acknowledged", a.isAcknowledged());
        m.put("alertTime",    a.getAlertTime() != null ? a.getAlertTime().toString() : null);
        return m;
    }

    /** POST /api/flutter/vendor/stock-alerts/{id}/acknowledge */
    @PostMapping("/vendor/stock-alerts/{id}/acknowledge")
    public ResponseEntity<Map<String, Object>> acknowledgeAlert(
            @RequestHeader(K_X_VENDOR_ID) int vendorId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        StockAlert alert = deps.stockAlertRepository.findById(id).orElse(null);
        if (alert == null || alert.getVendor().getId() != vendorId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Alert not found"); return ResponseEntity.badRequest().body(res); }
        alert.setAcknowledged(true);
        deps.stockAlertRepository.save(alert);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Alert acknowledged");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — MISSING ENDPOINTS (parity with React)
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/vendor/orders/{orderId}/mark-packed */
    @PostMapping("/vendor/orders/{orderId}/mark-packed")
    public ResponseEntity<Map<String, Object>> vendorMarkOrderPacked(
            @RequestHeader(K_X_VENDOR_ID) int vendorId,
            @org.springframework.web.bind.annotation.PathVariable int orderId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Order order = deps.orderRepository.findById(orderId).orElse(null);
        if (order == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        // Verify at least one item in the order belongs to this vendor
        List<Integer> vendorProductIds = deps.productRepository.findByVendor(vendor).stream().map(com.example.ekart.dto.Product::getId).toList();
        boolean hasVendorItem = order.getItems().stream().anyMatch(i -> i.getProductId() != null && vendorProductIds.contains(i.getProductId()));
        if (!hasVendorItem) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "This order contains none of your products"); return ResponseEntity.status(403).body(res); }
        // Reject if already past PACKED
        com.example.ekart.dto.TrackingStatus current = order.getTrackingStatus();
        if (current != null && current.getStepIndex() > com.example.ekart.dto.TrackingStatus.PACKED.getStepIndex()) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Order is already " + current.getDisplayName() + " — cannot revert to Packed");
            return ResponseEntity.badRequest().body(res);
        }
        order.setTrackingStatus(com.example.ekart.dto.TrackingStatus.PACKED);
        deps.orderRepository.save(order);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Order marked as packed");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/categories */
    @GetMapping("/vendor/categories")
    public ResponseEntity<Map<String, Object>> getVendorCategories(@RequestHeader(K_X_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<String> categories = deps.productRepository.findByApprovedTrue()
                .stream().map(com.example.ekart.dto.Product::getCategory)
                .filter(java.util.Objects::nonNull).distinct().sorted().toList();
        if (categories.isEmpty()) {
            categories = java.util.Arrays.asList("Electronics", "Fashion", "Home & Kitchen", "Sports", "Beauty", "Books", "Toys", "Food & Groceries");
        }
        res.put(KEY_SUCCESS, true);
        res.put("categories", categories.stream().map(c -> java.util.Map.of("name", c)).toList());
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/vendor/storefront/update */
    @PutMapping("/vendor/storefront/update")
    public ResponseEntity<Map<String, Object>> updateVendorStorefront(
            @RequestHeader(K_X_VENDOR_ID) int vendorId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name")) {
            String name = ((String) body.get("name")).trim();
            if (!name.isBlank()) vendor.setName(name);
        }
        if (body.containsKey(KEY_MOBILE)) {
            try {
                long mobile = Long.parseLong(body.get(KEY_MOBILE).toString().trim());
                if (mobile < 6000000000L || mobile > 9999999999L) {
                    res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Enter a valid 10-digit mobile number");
                    return ResponseEntity.badRequest().body(res);
                }
                Vendor existing = deps.vendorRepository.findByMobile(mobile);
                if (existing != null && existing.getId() != vendorId) {
                    res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Mobile number already in use by another vendor");
                    return ResponseEntity.badRequest().body(res);
                }
                vendor.setMobile(mobile);
            } catch (NumberFormatException e) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid mobile number format");
                return ResponseEntity.badRequest().body(res);
            }
        }
        if (body.containsKey(K_DESCRIPTION)) {
            vendor.setDescription((String) body.get(K_DESCRIPTION));
        }
        deps.vendorRepository.save(vendor);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Storefront updated successfully");
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/vendor/profile/change-password */
    @PutMapping("/vendor/profile/change-password")
    public ResponseEntity<Map<String, Object>> vendorChangePassword(
            @RequestHeader(K_X_VENDOR_ID) int vendorId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        String current = (String) body.get("currentPassword");
        String newPwd  = (String) body.get("newPassword");
        if (current == null || newPwd == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Both currentPassword and newPassword are required"); return ResponseEntity.badRequest().body(res); }
        try {
            if (vendor.getPassword() == null || !AES.decrypt(vendor.getPassword()).equals(current)) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Current password is incorrect");
                return ResponseEntity.badRequest().body(res);
            }
            if (newPwd.length() < 8) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Password must be at least 8 characters"); return ResponseEntity.badRequest().body(res); }
            vendor.setPassword(AES.encrypt(newPwd));
            deps.vendorRepository.save(vendor);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Password changed successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_FAILED_PREFIX + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/vendor/products/upload-csv */
    @PostMapping("/vendor/products/upload-csv")
    public ResponseEntity<Map<String, Object>> vendorUploadCsv(
            @RequestHeader(K_X_VENDOR_ID) int vendorId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (file == null || file.isEmpty()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "No file uploaded"); return ResponseEntity.badRequest().body(res); }
        int[] counts = {0, 0}; // [created, updated]
        List<String> errors = new ArrayList<>();
        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine();
            if (headerLine == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Empty CSV file"); return ResponseEntity.badRequest().body(res); }
            Map<String, Integer> idx = buildCsvIndex(headerLine);
            String line;
            int row = 1;
            while ((line = reader.readLine()) != null && errors.size() <= 50) {
                row++;
                if (!line.isBlank()) {
                    processCsvProductRow(line, idx, vendorId, vendor, counts, errors, row);
                }
            }
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Failed to process CSV: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
        res.put(KEY_SUCCESS, true); res.put("created", counts[0]); res.put("updated", counts[1]); res.put("errors", errors);
        res.put(KEY_MESSAGE, String.format("Processed: %d created, %d updated, %d error(s)", counts[0], counts[1], errors.size()));
        return ResponseEntity.ok(res);
    }

    private Map<String, Integer> buildCsvIndex(String headerLine) {
        String[] headers = headerLine.split(",");
        Map<String, Integer> idx = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            idx.put(headers[i].trim().toLowerCase().replaceAll("[^a-z0-9]", ""), i);
        }
        return idx;
    }

    private void processCsvProductRow(String line, Map<String, Integer> idx, int vendorId,
                                      Vendor vendor, int[] counts, List<String> errors, int row) {
        try {
            String[] cells  = line.split(",", -1);
            String name     = getCell(cells, idx, "name", "productname");
            String priceStr = getCell(cells, idx, K_PRICE, "sellingprice", "saleprice");
            if (name == null || name.isBlank()) throw new IllegalArgumentException("Missing name");
            if (priceStr == null || priceStr.isBlank()) throw new IllegalArgumentException("Missing price");
            double price    = Double.parseDouble(priceStr.trim());
            String mrpStr   = getCell(cells, idx, K_MRP, "originalprice");
            double mrp      = (mrpStr == null || mrpStr.isBlank()) ? 0 : Double.parseDouble(mrpStr.trim());
            String stockStr = getCell(cells, idx, K_STOCK, KEY_QUANTITY);
            int stock       = (stockStr == null || stockStr.isBlank()) ? 0 : Integer.parseInt(stockStr.trim());
            String idStr    = getCell(cells, idx, "id", "productid");
            if (idStr != null && !idStr.isBlank()) {
                updateExistingProduct(cells, idx, idStr, new CsvProductFields(name, price, mrp, stock), vendorId, counts);
            } else {
                createNewProduct(cells, idx, new CsvProductFields(name, price, mrp, stock), vendor, counts);
            }
        } catch (Exception e) {
            errors.add("Row " + row + ": " + e.getMessage());
        }
    }

    /** Groups core product CSV fields to keep method parameter counts within S107 limits. */
    private record CsvProductFields(String name, double price, double mrp, int stock) {}

    private void updateExistingProduct(String[] cells, Map<String, Integer> idx,
                                       String idStr, CsvProductFields fields, int vendorId, int[] counts) {
        String name = fields.name();
        double price = fields.price();
        double mrp = fields.mrp();
        int stock = fields.stock();
        int pid = Integer.parseInt(idStr.trim());
        com.example.ekart.dto.Product p = deps.productRepository.findById(pid).orElse(null);
        if (p == null) throw new IllegalArgumentException("Product id " + pid + " not found");
        if (p.getVendor() == null || p.getVendor().getId() != vendorId) throw new IllegalArgumentException("Product id " + pid + " does not belong to you");
        p.setName(name.trim()); p.setPrice(price); p.setMrp(mrp); p.setStock(stock);
        String desc     = getCell(cells, idx, K_DESCRIPTION, "productdescription");
        String category = getCell(cells, idx, K_CATEGORY, "productcategory");
        String imgLink  = getCell(cells, idx, "imagelink", "imageurl", "image");
        String threshStr= getCell(cells, idx, "stockalertthreshold", "alertthreshold");
        String pinCodes = getCell(cells, idx, "allowedpincodes", "pincodes");
        if (desc != null) p.setDescription(desc.trim());
        if (category != null) p.setCategory(category.trim());
        if (imgLink != null) p.setImageLink(imgLink.trim());
        if (threshStr != null && !threshStr.isBlank()) p.setStockAlertThreshold(Integer.parseInt(threshStr.trim()));
        if (pinCodes != null) p.setAllowedPinCodes(pinCodes.trim());
        deps.productRepository.save(p);
        counts[1]++;
    }

    private void createNewProduct(String[] cells, Map<String, Integer> idx,
                                  CsvProductFields fields, Vendor vendor, int[] counts) {
        String name = fields.name();
        double price = fields.price();
        double mrp = fields.mrp();
        int stock = fields.stock();
        String desc     = getCell(cells, idx, K_DESCRIPTION, "productdescription");
        String category = getCell(cells, idx, K_CATEGORY, "productcategory");
        String imgLink  = getCell(cells, idx, "imagelink", "imageurl", "image");
        String threshStr= getCell(cells, idx, "stockalertthreshold", "alertthreshold");
        String pinCodes = getCell(cells, idx, "allowedpincodes", "pincodes");
        com.example.ekart.dto.Product p = new com.example.ekart.dto.Product();
        p.setName(name.trim()); p.setDescription(desc != null ? desc.trim() : "");
        p.setPrice(price); p.setMrp(mrp); p.setStock(stock);
        p.setCategory(category != null ? category.trim() : "General");
        p.setImageLink(imgLink != null ? imgLink.trim() : "");
        p.setVendor(vendor); p.setApproved(false);
        if (threshStr != null && !threshStr.isBlank()) p.setStockAlertThreshold(Integer.parseInt(threshStr.trim()));
        if (pinCodes != null) p.setAllowedPinCodes(pinCodes.trim());
        deps.productRepository.save(p);
        counts[0]++;
    }

    /** Helper: get CSV cell by trying multiple header name aliases */
    private String getCell(String[] cells, Map<String, Integer> idx, String... keys) {
        for (String key : keys) {
            Integer i = idx.get(key);
            if (i != null && i < cells.length) {
                String val = cells[i].trim();
                return val.isEmpty() ? null : val;
            }
        }
        return null;
    }

    /** POST /api/flutter/auth/vendor/send-register-otp */
    @PostMapping("/auth/vendor/send-register-otp")
    public ResponseEntity<Map<String, Object>> vendorSendRegisterOtp(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String name  = ((String) body.getOrDefault("name", "Vendor")).trim();
            if (email.isEmpty()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_EMAIL_REQUIRED); return ResponseEntity.badRequest().body(res); }
            Vendor existing = deps.vendorRepository.findByEmail(email);
            if (existing != null && existing.isVerified()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_EMAIL_REGISTERED); return ResponseEntity.badRequest().body(res); }
            String plainOtp = deps.otpService.generateAndStoreOtp(email, com.example.ekart.service.OtpService.PURPOSE_VENDOR_REGISTER);
            // Use existing EmailSender.sendVendorOtpSecure for consistent email formatting
            Vendor temp = new Vendor();
            temp.setName(name); temp.setEmail(email);
            deps.emailSender.sendVendorOtpSecure(temp, plainOtp);
            vendorRegisterOtpVerified.remove(email);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "OTP sent to " + email);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Failed to send OTP: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/vendor/verify-register-otp */
    @PostMapping("/auth/vendor/verify-register-otp")
    public ResponseEntity<Map<String, Object>> vendorVerifyRegisterOtp(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email  = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String otpStr = body.getOrDefault(K_OTP, "").toString().trim();
            if (email.isEmpty() || otpStr.isEmpty()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "email and otp are required"); return ResponseEntity.badRequest().body(res); }
            String formattedOtp = String.format("%06d", Integer.parseInt(otpStr));
            com.example.ekart.service.OtpService.VerificationResult result =
                    deps.otpService.verifyOtp(email, formattedOtp, com.example.ekart.service.OtpService.PURPOSE_VENDOR_REGISTER);
            if (!result.success) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, result.message); return ResponseEntity.badRequest().body(res); }
            vendorRegisterOtpVerified.put(email, Boolean.TRUE);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "OTP verified successfully");
            return ResponseEntity.ok(res);
        } catch (NumberFormatException e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "OTP must be a 6-digit number");
            return ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Verification failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/vendor/profile/link-oauth */
    @PostMapping("/vendor/profile/link-oauth")
    public ResponseEntity<Map<String, Object>> vendorLinkOAuth(
            @RequestHeader(K_X_VENDOR_ID) int vendorId,
            @RequestBody Map<String, Object> body,
            jakarta.servlet.http.HttpSession session) {
        Map<String, Object> res = new HashMap<>();
        String provider = (String) body.get("provider");
        if (provider == null || provider.isBlank()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "provider required"); return ResponseEntity.badRequest().body(res); }
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        session.setAttribute(com.example.ekart.config.OAuth2LoginSuccessHandler.KEY_OAUTH_LOGIN_TYPE,     "flutter-link-vendor");
        session.setAttribute("oauth_link_vendor_id", vendorId);
        res.put(KEY_SUCCESS, true);
        res.put("redirectUrl", "/oauth2/authorization/" + provider.toLowerCase());
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/vendor/profile/unlink-oauth */
    @DeleteMapping("/vendor/profile/unlink-oauth")
    public ResponseEntity<Map<String, Object>> vendorUnlinkOAuth(@RequestHeader(K_X_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = deps.vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (vendor.getPassword() == null || vendor.getPassword().isBlank()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Cannot unlink — set a password first");
            return ResponseEntity.badRequest().body(res);
        }
        vendor.setProvider(null); vendor.setProviderId(null);
        deps.vendorRepository.save(vendor);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Social account unlinked successfully");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/admin/users */
    @GetMapping("/admin/users")
    public ResponseEntity<Map<String, Object>> adminGetUsers() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> customers = deps.customerRepository.findAll().stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, c.getId()); m.put(KEY_NAME, c.getName()); m.put(KEY_EMAIL, c.getEmail());
            m.put(KEY_MOBILE, c.getMobile()); m.put(KEY_ACTIVE, c.isActive()); m.put(K_VERIFIED, c.isVerified());
            return m;
        }).toList();
        List<Map<String, Object>> vendors = deps.vendorRepository.findAll().stream().map(v -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, v.getId()); m.put(KEY_NAME, v.getName()); m.put(KEY_EMAIL, v.getEmail());
            m.put(KEY_MOBILE, v.getMobile()); m.put(KEY_VENDOR_CODE, v.getVendorCode());
            m.put(KEY_ACTIVE, v.isVerified()); m.put(K_VERIFIED, v.isVerified());
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put("customers", customers); res.put("vendors", vendors);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/customers/{id}/toggle-active */
    @PostMapping("/admin/customers/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleCustomer(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer c = deps.customerRepository.findById(id).orElse(null);
        if (c == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        c.setActive(!c.isActive()); deps.customerRepository.save(c);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, c.isActive() ? "Account activated" : "Account suspended"); res.put(KEY_ACTIVE, c.isActive());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/vendors/{id}/toggle-active */
    @PostMapping("/admin/vendors/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleVendor(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor v = deps.vendorRepository.findById(id).orElse(null);
        if (v == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        v.setVerified(!v.isVerified()); deps.vendorRepository.save(v);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, v.isVerified() ? "Vendor activated" : "Vendor suspended"); res.put(KEY_ACTIVE, v.isVerified());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/products */
    @GetMapping("/admin/products")
    public ResponseEntity<Map<String, Object>> adminGetProducts() {
        Map<String, Object> res = new HashMap<>();
        res.put(KEY_SUCCESS, true);
        res.put(KEY_PRODUCTS, deps.productRepository.findAll().stream().map(this::mapProduct).toList());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/approve */
    @PostMapping("/admin/products/{id}/approve")
    public ResponseEntity<Map<String, Object>> adminApproveProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = deps.productRepository.findById(id).orElse(null);
        if (p == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_PRODUCT_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        p.setApproved(true); deps.productRepository.save(p);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Product approved and is now visible to customers");
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/reject */
    @PostMapping("/admin/products/{id}/reject")
    public ResponseEntity<Map<String, Object>> adminRejectProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = deps.productRepository.findById(id).orElse(null);
        if (p == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_PRODUCT_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        p.setApproved(false); deps.productRepository.save(p);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Product rejected / hidden from customers");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/orders */
    @GetMapping("/admin/orders")
    public ResponseEntity<Map<String, Object>> adminGetOrders() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> orders = deps.orderRepository.findAll().stream()
                .sorted(Comparator.comparingInt(Order::getId).reversed())
                .map(this::mapOrder).toList();
        res.put(KEY_SUCCESS, true); res.put(K_ORDERS, orders);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/orders/{id}/status  body: { status } */
    @PostMapping("/admin/orders/{id}/status")
    public ResponseEntity<Map<String, Object>> adminUpdateOrderStatus(
            @PathVariable int id, @RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();
        Order order = deps.orderRepository.findById(id).orElse(null);
        if (order == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        try {
            TrackingStatus newStatus = TrackingStatus.valueOf(body.get(KEY_STATUS));
            order.setTrackingStatus(newStatus); deps.orderRepository.save(order);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Order status updated to " + newStatus.getDisplayName());
        } catch (IllegalArgumentException e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid status: " + body.get(KEY_STATUS));
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/vendors */
    @GetMapping("/admin/vendors")
    public ResponseEntity<Map<String, Object>> adminGetVendors() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> vendors = deps.vendorRepository.findAll().stream().map(v -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, v.getId()); m.put(KEY_NAME, v.getName()); m.put(KEY_EMAIL, v.getEmail());
            m.put(KEY_MOBILE, v.getMobile()); m.put(KEY_VENDOR_CODE, v.getVendorCode());
            m.put(KEY_ACTIVE, v.isVerified()); m.put(K_VERIFIED, v.isVerified());
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put("vendors", vendors);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // REORDER, PASSWORD CHANGE
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/orders/{id}/reorder
     * Clears cart and re-adds all in-stock items from the given past order.
     */
    @PostMapping("/orders/{id}/reorder")
    public ResponseEntity<Map<String, Object>> reorder(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Order order = deps.orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Cart cart = customer.getCart();
        if (cart == null) { cart = new Cart(); customer.setCart(cart); }
        cart.getItems().clear();
        int addedCount = 0;
        List<String> outOfStock = new ArrayList<>();
        for (Item orderItem : order.getItems()) {
            Product p = deps.productRepository.findById(orderItem.getProductId()).orElse(null);
            if (p == null || p.getStock() <= 0) { outOfStock.add(orderItem.getName()); continue; }
            Item newItem = new Item();
            newItem.setName(p.getName()); newItem.setDescription(p.getDescription());
            newItem.setPrice(p.getPrice()); newItem.setCategory(p.getCategory());
            newItem.setQuantity(Math.min(orderItem.getQuantity(), p.getStock()));
            newItem.setImageLink(p.getImageLink()); newItem.setProductId(p.getId());
            newItem.setCart(cart);
            cart.getItems().add(newItem);
            addedCount++;
        }
        deps.customerRepository.save(customer);
        res.put(KEY_SUCCESS, true);
        res.put("addedCount", addedCount);
        res.put("outOfStockItems", outOfStock);
        res.put(KEY_MESSAGE, addedCount > 0 ? addedCount + " item(s) added to cart" : "All items are out of stock");
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/profile/change-password */
    @PutMapping("/profile/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestHeader(K_X_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = deps.customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        String current = (String) body.get("currentPassword");
        String newPwd  = (String) body.get("newPassword");
        if (current == null || newPwd == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Both passwords required"); return ResponseEntity.badRequest().body(res); }
        try {
            if (!AES.decrypt(customer.getPassword()).equals(current)) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Current password is incorrect");
                return ResponseEntity.badRequest().body(res);
            }
            if (newPwd.length() < 8) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "New password must be at least 8 characters"); return ResponseEntity.badRequest().body(res); }
            customer.setPassword(AES.encrypt(newPwd)); deps.customerRepository.save(customer);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Password changed successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_FAILED_PREFIX + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    // ═══════════════════════════════════════════════════════
    // HELPER MAPPERS
    // ═══════════════════════════════════════════════════════

    private Map<String, Object> mapProduct(Product p) {
        Map<String, Object> m = new HashMap<>();
        m.put(KEY_ID, p.getId()); m.put(KEY_NAME, p.getName()); m.put(K_DESCRIPTION, p.getDescription());
        m.put(K_PRICE, p.getPrice()); m.put(K_MRP, p.getMrp()); m.put(K_CATEGORY, p.getCategory());
        m.put(K_STOCK, p.getStock()); m.put(K_IMAGE_LINK, p.getImageLink());
        m.put("extraImageLinks", p.getExtraImageLinks());
        m.put("approved", p.isApproved());
        m.put(KEY_VENDOR_CODE, p.getVendor() != null ? p.getVendor().getVendorCode() : null);
        m.put(K_ALLOWED_PIN_CODES, p.getAllowedPinCodes()); // PIN code delivery restriction
        return m;
    }

    private Map<String, Object> mapItem(Item i) {
        Map<String, Object> m = new HashMap<>();
        m.put(KEY_ID, i.getId()); m.put(KEY_NAME, i.getName()); m.put(K_DESCRIPTION, i.getDescription());
        m.put(K_PRICE, i.getPrice()); m.put(K_CATEGORY, i.getCategory());
        m.put(KEY_QUANTITY, i.getQuantity()); m.put(K_IMAGE_LINK, i.getImageLink()); m.put(K_PRODUCT_ID, i.getProductId());
        boolean returnsAccepted = true;
        if (i.getProductId() != null) {
            returnsAccepted = deps.productRepository.findById(i.getProductId())
                    .map(p -> true)
                    .orElse(true);
        }
        m.put("returnsAccepted", returnsAccepted);
        return m;
    }

    private Map<String, Object> mapOrder(Order o) {
        Map<String, Object> m = new HashMap<>();
        m.put(KEY_ID,                    o.getId());
        m.put("amount",                o.getAmount());
        m.put(K_DELIVERY_CHARGE,        o.getDeliveryCharge());
        m.put(KEY_TOTAL_PRICE,            o.getTotalPrice());
        m.put(KEY_PAYMENT_MODE,           o.getPaymentMode());
        m.put(KEY_DELIVERY_TIME,          o.getDeliveryTime());
        m.put(KEY_TRACKING_STATUS,        o.getTrackingStatus().name());
        m.put("trackingStatusDisplay", o.getTrackingStatus().getDisplayName());
        m.put(K_CURRENT_CITY,           o.getCurrentCity());
        m.put("deliveryAddress",       o.getDeliveryAddress() != null ? o.getDeliveryAddress() : "");
        m.put("orderDate",             o.getOrderDate() != null ? o.getOrderDate().toString() : null);
        m.put("replacementRequested",  o.isReplacementRequested());
        m.put(KEY_ITEMS,                 o.getItems().stream().map(this::mapItem).toList());
        if (o.getCustomer() != null) m.put(K_CUSTOMER_NAME, o.getCustomer().getName());
        enrichDeliveredAt(o, m);
        enrichReviewedProductIds(o, m);
        return m;
    }

    /**
     * Looks up the DELIVERED event log entry and stores its timestamp in the map.
     * The Flutter app uses this to enforce the 7-day refund/report window client-side.
     */
    private void enrichDeliveredAt(Order o, Map<String, Object> m) {
        if (o.getTrackingStatus() != TrackingStatus.DELIVERED) return;
        deps.trackingEventLogRepository.findByOrderOrderByEventTimeAsc(o)
            .stream()
            .filter(e -> e.getStatus() == TrackingStatus.DELIVERED)
            .findFirst()
            .ifPresent(e -> m.put("deliveredAt",
                    e.getEventTime() != null ? e.getEventTime().toString() : null));
    }

    /**
     * Populates reviewedProductIds so the Flutter app can hide the Rate button
     * for already-reviewed items and show a "Reviewed" badge instead.
     * Always present (empty list for non-delivered orders).
     */
    private void enrichReviewedProductIds(Order o, Map<String, Object> m) {
        if (o.getTrackingStatus() != TrackingStatus.DELIVERED || o.getCustomer() == null) {
            m.put("reviewedProductIds", Collections.emptyList());
            return;
        }
        String customerName = o.getCustomer().getName();
        List<Integer> reviewedIds = o.getItems().stream()
            .filter(i -> i.getProductId() != null)
            .filter(i -> deps.reviewRepository.existsByProductIdAndCustomerName(
                    i.getProductId(), customerName))
            .map(Item::getProductId)
            .toList();
        m.put("reviewedProductIds", reviewedIds);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN — ACCOUNTS (search, stats, profile, toggle, delete, reset-pwd)
    // ═══════════════════════════════════════════════════════════════════════

    /** GET /api/flutter/admin/accounts?search=... */
    @GetMapping("/admin/accounts")
    public ResponseEntity<Map<String, Object>> adminGetAccounts(
            @RequestParam(required = false) String search) {
        Map<String, Object> res = new LinkedHashMap<>();
        List<Map<String, Object>> accounts = (search != null && !search.isBlank())
                ? deps.adminAccountService.searchAccounts(search)
                : deps.adminAccountService.getAllAccountsWithMetadata();
        res.put(KEY_SUCCESS, true);
        res.put("accounts", accounts);
        res.put(KEY_COUNT, accounts.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/accounts/stats */
    @GetMapping("/admin/accounts/stats")
    public ResponseEntity<Map<String, Object>> adminGetAccountStats() {
        Map<String, Object> stats = deps.adminAccountService.getAccountStats();
        stats.put(KEY_SUCCESS, true);
        return ResponseEntity.ok(stats);
    }

    /** GET /api/flutter/admin/accounts/{id}/profile */
    @GetMapping("/admin/accounts/{id}/profile")
    public ResponseEntity<Map<String, Object>> adminGetAccountProfile(@PathVariable int id) {
        Map<String, Object> profile = deps.adminAccountService.getUserProfile(id);
        if (profile.containsKey("error")) return ResponseEntity.badRequest().body(profile);
        return ResponseEntity.ok(profile);
    }

    /** POST /api/flutter/admin/accounts/{id}/toggle — toggle active/ban */
    @PostMapping("/admin/accounts/{id}/toggle")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleAccount(
            @PathVariable int id, @RequestBody Map<String, Object> body) {
        boolean activate = Boolean.TRUE.equals(body.get("isActive"));
        Map<String, Object> result = deps.adminAccountService.toggleAccountStatus(id, activate);
        return Boolean.TRUE.equals(result.get(KEY_SUCCESS))
                ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /** POST /api/flutter/admin/accounts/{id}/reset-password */
    @PostMapping("/admin/accounts/{id}/reset-password")
    public ResponseEntity<Map<String, Object>> adminResetPassword(@PathVariable int id) {
        Map<String, Object> result = deps.adminAccountService.generatePasswordResetLink(id);
        return Boolean.TRUE.equals(result.get(KEY_SUCCESS))
                ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /** DELETE /api/flutter/admin/accounts/{id} */
    @DeleteMapping("/admin/accounts/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminDeleteAccount(@PathVariable int id) {
        Map<String, Object> result = deps.adminAccountService.deleteAccount(id);
        return Boolean.TRUE.equals(result.get(KEY_SUCCESS))
                ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN — REVIEWS (list, filter, delete, bulk-delete)
    // ═══════════════════════════════════════════════════════════════════════

    /** GET /api/flutter/admin/reviews?filter=5&search=... */
    @GetMapping("/admin/reviews")
    public ResponseEntity<Map<String, Object>> adminGetReviews(
            @RequestParam(required = false, defaultValue = "all") String filter,
            @RequestParam(required = false, defaultValue = "") String search) {
        Map<String, Object> res = new LinkedHashMap<>();
        List<com.example.ekart.dto.Review> all = deps.reviewRepository.findAll();
        double avg = all.stream().mapToInt(com.example.ekart.dto.Review::getRating).average().orElse(0.0);

        List<com.example.ekart.dto.Review> filtered = filterReviews(all, filter, search);
        List<Map<String, Object>> reviewMaps = mapReviews(filtered);

        res.put(KEY_SUCCESS,   true);
        res.put(K_REVIEWS,     reviewMaps);
        res.put(KEY_TOTAL,     all.size());
        res.put("filtered",    filtered.size());
        res.put(K_AVG_RATING,  Math.round(avg * 10.0) / 10.0);
        res.put("fiveStars",   countByStar(all, 5));
        res.put("fourStars",   countByStar(all, 4));
        res.put("threeStars",  countByStar(all, 3));
        res.put("twoStars",    countByStar(all, 2));
        res.put("oneStar",     countByStar(all, 1));
        return ResponseEntity.ok(res);
    }

    private long countByStar(List<com.example.ekart.dto.Review> reviews, int star) {
        return reviews.stream().filter(r -> r.getRating() == star).count();
    }

    private List<com.example.ekart.dto.Review> filterReviews(
            List<com.example.ekart.dto.Review> all, String filter, String search) {
        List<com.example.ekart.dto.Review> result = new ArrayList<>(all);
        if (!filter.equals("all")) {
            try {
                int star = Integer.parseInt(filter);
                result = result.stream().filter(r -> r.getRating() == star).toList();
            } catch (NumberFormatException ignored) { /* non-numeric value — use default */ }
        }
        if (!search.isBlank()) {
            result = applySearchFilter(result, search.toLowerCase());
        }
        result = new ArrayList<>(result);
        result.sort((a, b) -> {
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });
        return result;
    }

    private List<com.example.ekart.dto.Review> applySearchFilter(
            List<com.example.ekart.dto.Review> reviews, String q) {
        return reviews.stream().filter(r ->
            (r.getCustomerName() != null && r.getCustomerName().toLowerCase().contains(q)) ||
            (r.getComment()      != null && r.getComment().toLowerCase().contains(q)) ||
            (r.getProduct()      != null && r.getProduct().getName().toLowerCase().contains(q))
        ).toList();
    }

    private List<Map<String, Object>> mapReviews(List<com.example.ekart.dto.Review> reviews) {
        return reviews.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put(KEY_ID,          r.getId());
            m.put(K_RATING,        r.getRating());
            m.put(K_COMMENT,       r.getComment() != null ? r.getComment() : "");
            m.put(K_CUSTOMER_NAME, r.getCustomerName() != null ? r.getCustomerName() : "");
            m.put(KEY_PRODUCT_NAME, r.getProduct() != null ? r.getProduct().getName() : "");
            m.put(K_PRODUCT_ID,    r.getProduct() != null ? r.getProduct().getId() : 0);
            m.put("createdAt",     r.getCreatedAt() != null ? r.getCreatedAt().toString() : "");
            return m;
        }).toList();
    }

    /** DELETE /api/flutter/admin/reviews/{id} */
    @DeleteMapping("/admin/reviews/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminDeleteReview(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            deps.reviewRepository.deleteById(id);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Review deleted");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Delete failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(res);
        }
    }

    /** POST /api/flutter/admin/reviews/bulk-delete  body: {productName} */
    @PostMapping("/admin/reviews/bulk-delete")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminBulkDeleteReviews(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        String productName = (String) body.getOrDefault(KEY_PRODUCT_NAME, "");
        try {
            List<com.example.ekart.dto.Review> toDelete = deps.reviewRepository.findAll().stream()
                    .filter(r -> r.getProduct() != null &&
                                 r.getProduct().getName().equalsIgnoreCase(productName))
                    .toList();
            deps.reviewRepository.deleteAll(toDelete);
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Deleted " + toDelete.size() + " reviews for \"" + productName + "\"");
            res.put("deleted", toDelete.size());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Bulk delete failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(res);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN — BANNERS (list, add, toggle, delete, toggle-customer-home)
    // ═══════════════════════════════════════════════════════════════════════

    /** GET /api/flutter/admin/banners */
    @GetMapping("/admin/banners")
    public ResponseEntity<Map<String, Object>> adminGetBanners() {
        Map<String, Object> res = new LinkedHashMap<>();
        List<Map<String, Object>> banners = deps.bannerRepository.findAll().stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put(KEY_ID,                 b.getId());
            m.put(KEY_TITLE,              b.getTitle()    != null ? b.getTitle()    : "");
            m.put(KEY_IMAGE_URL,           b.getImageUrl() != null ? b.getImageUrl() : "");
            m.put(KEY_LINK_URL,            b.getLinkUrl()  != null ? b.getLinkUrl()  : "");
            m.put(KEY_ACTIVE,             b.isActive());
            m.put("showOnCustomerHome", b.isShowOnCustomerHome());
            m.put("displayOrder",       b.getDisplayOrder());
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put("banners", banners);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/banners/add  body:{title,imageUrl,linkUrl} */
    @PostMapping("/admin/banners/add")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminAddBanner(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = new Banner();
        b.setTitle((String) body.getOrDefault(KEY_TITLE, ""));
        b.setImageUrl((String) body.getOrDefault(KEY_IMAGE_URL, ""));
        b.setLinkUrl((String) body.getOrDefault(KEY_LINK_URL, ""));
        b.setActive(true);
        b.setShowOnCustomerHome(true);
        b.setDisplayOrder(0);
        deps.bannerRepository.save(b);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Banner added"); res.put(KEY_ID, b.getId());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/banners/{id}/toggle */
    @PostMapping("/admin/banners/{id}/toggle")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleBanner(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = deps.bannerRepository.findById(id).orElse(null);
        if (b == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_BANNER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        b.setActive(!b.isActive());
        deps.bannerRepository.save(b);
        res.put(KEY_SUCCESS, true); res.put(KEY_ACTIVE, b.isActive());
        res.put(KEY_MESSAGE, b.isActive() ? "Banner activated" : "Banner deactivated");
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/banners/{id}/toggle-customer-home */
    @PostMapping("/admin/banners/{id}/toggle-customer-home")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleBannerCustomerHome(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = deps.bannerRepository.findById(id).orElse(null);
        if (b == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_BANNER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        b.setShowOnCustomerHome(!b.isShowOnCustomerHome());
        deps.bannerRepository.save(b);
        res.put(KEY_SUCCESS, true); res.put("showOnCustomerHome", b.isShowOnCustomerHome());
        res.put(KEY_MESSAGE, b.isShowOnCustomerHome() ? "Shown on customer home" : "Hidden from customer home");
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/admin/banners/{id} */
    @DeleteMapping("/admin/banners/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminDeleteBanner(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!deps.bannerRepository.existsById(id)) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_BANNER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        deps.bannerRepository.deleteById(id);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Banner deleted");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN — WAREHOUSES (list, add, toggle-active, delivery boys)
    // ═══════════════════════════════════════════════════════════════════════

    /** GET /api/flutter/admin/warehouses */
    @GetMapping("/admin/warehouses")
    public ResponseEntity<Map<String, Object>> adminGetWarehouses() {
        Map<String, Object> res = new LinkedHashMap<>();
        List<Map<String, Object>> warehouses = deps.warehouseRepository.findAll().stream().map(wh -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put(KEY_ID,             wh.getId());
            m.put(KEY_NAME,           wh.getName());
            m.put(K_CITY,           wh.getCity());
            m.put(K_STATE,          wh.getState() != null ? wh.getState() : "");
            m.put("warehouseCode",  wh.getWarehouseCode() != null ? wh.getWarehouseCode() : "");
            m.put(KEY_ACTIVE,         wh.isActive());
            m.put("servedPinCodes", wh.getServedPinCodes() != null ? wh.getServedPinCodes() : "");
            long boyCount = deps.deliveryBoyRepository.findAll().stream()
                    .filter(db -> db.getWarehouse() != null && db.getWarehouse().getId() == wh.getId()).count();
            m.put("deliveryBoyCount", boyCount);
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put("warehouses", warehouses);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/warehouses/add  body:{name,city,state,servedPinCodes} */
    @PostMapping("/admin/warehouses/add")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminAddWarehouse(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        String name = (String) body.getOrDefault("name", "");
        String city = (String) body.getOrDefault(K_CITY, "");
        if (name.isBlank() || city.isBlank()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Name and city are required");
            return ResponseEntity.badRequest().body(res);
        }
        Warehouse wh = new Warehouse();
        wh.setName(name.trim());
        wh.setCity(city.trim());
        wh.setState((String) body.getOrDefault(K_STATE, ""));
        wh.setServedPinCodes((String) body.getOrDefault("servedPinCodes", ""));
        wh.setActive(true);
        deps.warehouseRepository.save(wh);
        wh.setWarehouseCode(String.format("WH-%04d", wh.getId()));
        deps.warehouseRepository.save(wh);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Warehouse added"); res.put(KEY_ID, wh.getId());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/warehouses/{id}/toggle */
    @PostMapping("/admin/warehouses/{id}/toggle")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleWarehouse(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Warehouse wh = deps.warehouseRepository.findById(id).orElse(null);
        if (wh == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_WAREHOUSE_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        wh.setActive(!wh.isActive());
        deps.warehouseRepository.save(wh);
        res.put(KEY_SUCCESS, true); res.put(KEY_ACTIVE, wh.isActive());
        res.put(KEY_MESSAGE, wh.isActive() ? "Warehouse activated" : "Warehouse deactivated");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/warehouses/{id}/boys */
    @GetMapping("/admin/warehouses/{id}/boys")
    public ResponseEntity<Map<String, Object>> adminGetDeliveryBoysByWarehouse(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Warehouse wh = deps.warehouseRepository.findById(id).orElse(null);
        if (wh == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_WAREHOUSE_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Map<String, Object>> boys = deps.deliveryBoyRepository.findAll().stream()
                .filter(db -> db.getWarehouse() != null && db.getWarehouse().getId() == id)
                .map(db -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put(KEY_ID,              db.getId());
                    m.put(KEY_NAME,            db.getName());
                    m.put(KEY_EMAIL,           db.getEmail());
                    m.put(KEY_DELIVERY_BOY_CODE, db.getDeliveryBoyCode() != null ? db.getDeliveryBoyCode() : "");
                    m.put(KEY_ACTIVE,          db.isActive());
                    m.put("adminApproved",   db.isAdminApproved());
                    m.put("assignedPinCodes",db.getAssignedPinCodes() != null ? db.getAssignedPinCodes() : "");
                    return m;
                }).toList();
        res.put(KEY_SUCCESS, true); res.put("boys", boys);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN — WAREHOUSE CHANGE REQUESTS (list pending, approve, reject)
    // ═══════════════════════════════════════════════════════════════════════

    /** GET /api/flutter/admin/warehouse-change-requests */
    @GetMapping("/admin/warehouse-change-requests")
    public ResponseEntity<Map<String, Object>> adminGetWarehouseChangeRequests() {
        Map<String, Object> res = new LinkedHashMap<>();
        List<Map<String, Object>> requests = deps.warehouseChangeRequestRepository
                .findByStatusOrderByRequestedAtDesc(WarehouseChangeRequest.Status.PENDING)
                .stream().map(req -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put(KEY_ID,                 req.getId());
                    m.put(KEY_DELIVERY_BOY_ID,       req.getDeliveryBoy().getId());
                    m.put("deliveryBoyName",     req.getDeliveryBoy().getName());
                    m.put(KEY_DELIVERY_BOY_CODE,     req.getDeliveryBoy().getDeliveryBoyCode() != null ? req.getDeliveryBoy().getDeliveryBoyCode() : "");
                    m.put("currentWarehouse",    req.getDeliveryBoy().getWarehouse() != null ? req.getDeliveryBoy().getWarehouse().getName() : VAL_NONE);
                    m.put("requestedWarehouse",  req.getRequestedWarehouse().getName());
                    m.put("requestedWarehouseId",req.getRequestedWarehouse().getId());
                    m.put(KEY_REASON,              req.getReason() != null ? req.getReason() : "");
                    m.put("requestedAt",         req.getRequestedAt() != null ? req.getRequestedAt().toString() : "");
                    return m;
                }).toList();
        res.put(KEY_SUCCESS, true); res.put("requests", requests);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/warehouse-change-requests/{id}/approve  body:{adminNote} */
    @PostMapping("/admin/warehouse-change-requests/{id}/approve")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminApproveWarehouseChange(
            @PathVariable int id, @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        String adminNote = body != null ? (String) body.getOrDefault(KEY_ADMIN_NOTE, "") : "";
        WarehouseChangeRequest req = deps.warehouseChangeRequestRepository.findById(id).orElse(null);
        if (req == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Request not found"); return ResponseEntity.badRequest().body(res); }
        if (req.getStatus() != WarehouseChangeRequest.Status.PENDING) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Request already resolved"); return ResponseEntity.ok(res); }
        DeliveryBoy db = req.getDeliveryBoy();
        db.setWarehouse(req.getRequestedWarehouse());
        db.setAssignedPinCodes("");
        deps.deliveryBoyRepository.save(db);
        req.setStatus(WarehouseChangeRequest.Status.APPROVED);
        req.setAdminNote(adminNote.trim());
        req.setResolvedAt(LocalDateTime.now());
        deps.warehouseChangeRequestRepository.save(req);
        try { deps.emailSender.sendWarehouseChangeApproved(db, req.getRequestedWarehouse(), adminNote); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, db.getName() + " transferred to " + req.getRequestedWarehouse().getName());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/warehouse-change-requests/{id}/reject  body:{adminNote} */
    @PostMapping("/admin/warehouse-change-requests/{id}/reject")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminRejectWarehouseChange(
            @PathVariable int id, @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        String adminNote = body != null ? (String) body.getOrDefault(KEY_ADMIN_NOTE, "") : "";
        WarehouseChangeRequest req = deps.warehouseChangeRequestRepository.findById(id).orElse(null);
        if (req == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Request not found"); return ResponseEntity.badRequest().body(res); }
        if (req.getStatus() != WarehouseChangeRequest.Status.PENDING) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Request already resolved"); return ResponseEntity.ok(res); }
        req.setStatus(WarehouseChangeRequest.Status.REJECTED);
        req.setAdminNote(adminNote.trim());
        req.setResolvedAt(LocalDateTime.now());
        deps.warehouseChangeRequestRepository.save(req);
        try { deps.emailSender.sendWarehouseChangeRejected(req.getDeliveryBoy(), req.getRequestedWarehouse(), adminNote); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Request rejected");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN — PLATFORM STATS DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════

    /** GET /api/flutter/admin/stats */
    @GetMapping("/admin/stats")
    public ResponseEntity<Map<String, Object>> adminGetStats() {
        Map<String, Object> res = new LinkedHashMap<>();
        long totalCustomers    = deps.customerRepository.count();
        long totalVendors      = deps.vendorRepository.count();
        long totalProducts     = deps.productRepository.count();
        long pendingProducts   = deps.productRepository.findAll().stream().filter(p -> !p.isApproved()).count();
        long totalOrders       = deps.orderRepository.count();
        long pendingOrders     = deps.orderRepository.findAll().stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.PROCESSING || o.getTrackingStatus() == TrackingStatus.PACKED).count();
        double totalRevenue    = deps.orderRepository.findAll().stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED)
                .mapToDouble(Order::getTotalPrice).sum();
        long totalDeliveryBoys = deps.deliveryBoyRepository.count();
        long pendingApprovals  = deps.deliveryBoyRepository.findByAdminApprovedFalseAndVerifiedTrue().size();
        long pendingWHChanges  = deps.warehouseChangeRequestRepository
                .findByStatusOrderByRequestedAtDesc(WarehouseChangeRequest.Status.PENDING).size();
        long totalReviews      = deps.reviewRepository.count();
        long totalBanners      = deps.bannerRepository.count();
        res.put(KEY_SUCCESS,           true);
        res.put("totalCustomers",    totalCustomers);
        res.put("totalVendors",      totalVendors);
        res.put(K_TOTAL_PRODUCTS,     totalProducts);
        res.put("pendingProducts",   pendingProducts);
        res.put(K_TOTAL_ORDERS,       totalOrders);
        res.put("pendingOrders",     pendingOrders);
        res.put(K_TOTAL_REVENUE,      Math.round(totalRevenue * 100.0) / 100.0);
        res.put("totalDeliveryBoys", totalDeliveryBoys);
        res.put("pendingApprovals",  pendingApprovals);
        res.put("pendingWHChanges",  pendingWHChanges);
        res.put("totalReviews",      totalReviews);
        res.put("totalBanners",      totalBanners);
        return ResponseEntity.ok(res);
    }

    /**
     * Safely parses a quantity value from the request body.
     * Extracted from addToCart to avoid nested try block (S1141).
     *
     * @param value        the raw value from the request body
     * @param defaultValue the fallback value if parsing fails
     * @return the parsed integer, or defaultValue on NumberFormatException
     */
    private int parseQuantitySafely(Object value, int defaultValue) {
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException ignored) {
            return defaultValue;
        }
    }
}