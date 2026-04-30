package com.example.ekart.controller;
 
import com.example.ekart.dto.*;
import org.springframework.transaction.annotation.Transactional;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.helper.PinCodeValidator;
import com.example.ekart.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
 
import java.time.LocalDateTime;
import java.util.*;
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
 
    private final CustomerRepository          customerRepository;
    private final VendorRepository            vendorRepository;
    private final ProductRepository           productRepository;
    private final OrderRepository             orderRepository;
    private final ItemRepository              itemRepository;
    private final WishlistRepository          wishlistRepository;
    private final AddressRepository           addressRepository;
    private final ReviewRepository            reviewRepository;
    private final RefundRepository            refundRepository;
    private final StockAlertRepository        stockAlertRepository;
    private final BannerRepository            bannerRepository;
    private final BackInStockRepository       backInStockRepository;
    private final DeliveryBoyRepository              deliveryBoyRepository;
    private final WarehouseRepository                warehouseRepository;
    private final TrackingEventLogRepository         trackingEventLogRepository;
    private final DeliveryOtpRepository              deliveryOtpRepository;
    private final WarehouseChangeRequestRepository   warehouseChangeRequestRepository;
    private final EmailSender                        emailSender;
    private final CouponRepository                   couponRepository;
    private final com.example.ekart.service.AdminAccountService adminAccountService;
 
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
    private static final String KEY_DESCRIPTION  = "description";
    private static final String KEY_PRODUCT_ID   = "productId";
    private static final String KEY_CITY         = "city";
    private static final String KEY_CODE         = "code";
    private static final String KEY_PRICE        = "price";
    private static final String KEY_CUSTOMER_NAME      = "customerName";
    private static final String MSG_NOT_AUTHENTICATED   = "Not authenticated";
    private static final String MSG_ORDER_NOT_FOUND     = "Order not found";
    private static final String MSG_WAREHOUSE_NOT_FOUND = "Warehouse not found";
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

    private static final Logger log = LoggerFactory.getLogger(FlutterApiController.class);
    private static final Random RANDOM = new Random();


    public FlutterApiController(
            @org.springframework.beans.factory.annotation.Value("${admin.email}") String adminEmail,
            @org.springframework.beans.factory.annotation.Value("${admin.password}") String adminPassword,
            CustomerRepository customerRepository,
            VendorRepository vendorRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            ItemRepository itemRepository,
            WishlistRepository wishlistRepository,
            AddressRepository addressRepository,
            ReviewRepository reviewRepository,
            RefundRepository refundRepository,
            StockAlertRepository stockAlertRepository,
            BannerRepository bannerRepository,
            BackInStockRepository backInStockRepository,
            DeliveryBoyRepository deliveryBoyRepository,
            WarehouseRepository warehouseRepository,
            TrackingEventLogRepository trackingEventLogRepository,
            DeliveryOtpRepository deliveryOtpRepository,
            WarehouseChangeRequestRepository warehouseChangeRequestRepository,
            EmailSender emailSender,
            CouponRepository couponRepository,
            com.example.ekart.service.AdminAccountService adminAccountService) {
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.customerRepository = customerRepository;
        this.vendorRepository = vendorRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
        this.wishlistRepository = wishlistRepository;
        this.addressRepository = addressRepository;
        this.reviewRepository = reviewRepository;
        this.refundRepository = refundRepository;
        this.stockAlertRepository = stockAlertRepository;
        this.bannerRepository = bannerRepository;
        this.backInStockRepository = backInStockRepository;
        this.deliveryBoyRepository = deliveryBoyRepository;
        this.warehouseRepository = warehouseRepository;
        this.trackingEventLogRepository = trackingEventLogRepository;
        this.deliveryOtpRepository = deliveryOtpRepository;
        this.warehouseChangeRequestRepository = warehouseChangeRequestRepository;
        this.emailSender = emailSender;
        this.couponRepository = couponRepository;
        this.adminAccountService = adminAccountService;
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
            String email = (String) body.get("email");
            if (email == null || email.isBlank()) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Email is required");
                return ResponseEntity.badRequest().body(res);
            }
            if (customerRepository.existsByEmail(email)) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_EMAIL_REGISTERED);
                return ResponseEntity.badRequest().body(res);
            }
 
            // Generate 6-digit OTP and hash it
            int plainOtp = new java.util.Random().nextInt(100000, 1000000);
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
            customerRepository.save(c);
 
            // Send OTP email (reuses existing template)
            c.setOtp(plainOtp); // legacy field used by email template
            emailSender.send(c);
 
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "OTP sent to " + email + ". Valid for 10 minutes.");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Failed to send OTP: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }
 
    /**
     * POST /api/flutter/auth/customer/verify-otp
     * Step 2 of 2FA registration: verifies the OTP, marks account as verified.
     * Body: { email, otp }
     */
    @PostMapping("/auth/customer/verify-otp")
    public ResponseEntity<Map<String, Object>> customerVerifyOtp(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = (String) body.get("email");
            String otpInput = body.getOrDefault("otp", "").toString().trim();
 
            Customer c = customerRepository.findByEmail(email);
            if (c == null) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Account not found. Please register again.");
                return ResponseEntity.badRequest().body(res);
            }
            if (c.isVerified()) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Account already verified. Please login.");
                return ResponseEntity.badRequest().body(res);
            }
            if (c.getOtpExpiry() == null || java.time.LocalDateTime.now().isAfter(c.getOtpExpiry())) {
                // OTP expired — delete the unverified account so user can retry
                customerRepository.delete(c);
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "OTP expired. Please register again.");
                return ResponseEntity.badRequest().body(res);
            }
            if (c.getOtpHash() == null || !BCrypt.checkpw(otpInput, c.getOtpHash())) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid OTP. Please try again.");
                return ResponseEntity.badRequest().body(res);
            }
 
            // OTP correct — mark verified and clear OTP fields
            c.setVerified(true);
            c.setOtpHash(null);
            c.setOtpExpiry(null);
            customerRepository.save(c);
 
            String token = java.util.Base64.getEncoder()
                    .encodeToString((c.getId() + ":" + c.getEmail()).getBytes());
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Account verified successfully! Welcome to Ekart.");
            res.put("customerId", c.getId());
            res.put(KEY_NAME, c.getName());
            res.put(KEY_EMAIL, c.getEmail());
            res.put(KEY_TOKEN, token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Verification failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }
 
    /** @deprecated Use /api/flutter/auth/customer/send-otp + verify-otp instead */
    @PostMapping("/auth/customer/register")
    public ResponseEntity<Map<String, Object>> customerRegister(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = (String) body.get("email");
            if (customerRepository.existsByEmail(email)) {
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
            customerRepository.save(c);
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Registered successfully");
            res.put("customerId", c.getId());
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
            String email    = (String) body.get("email");
            String password = (String) body.get(KEY_PASSWORD);
            Customer c = customerRepository.findByEmail(email);
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
            res.put("customerId", c.getId());
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

    /** POST /api/flutter/auth/vendor/register */
    @PostMapping("/auth/vendor/register")
    public ResponseEntity<Map<String, Object>> vendorRegister(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = (String) body.get("email");
            if (vendorRepository.existsByEmail(email)) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_EMAIL_REGISTERED);
                return ResponseEntity.badRequest().body(res);
            }
            Vendor v = new Vendor();
            v.setName((String) body.get("name"));
            v.setEmail(email);
            v.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString()));
            v.setPassword(AES.encrypt((String) body.get(KEY_PASSWORD)));
            v.setVerified(true);
            vendorRepository.save(v);
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
            String email    = (String) body.get("email");
            String password = (String) body.get(KEY_PASSWORD);
            Vendor v = vendorRepository.findByEmail(email);
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
        String email    = (String) body.get("email");
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
            String email    = (String) body.get("email");
            String password = (String) body.get(KEY_PASSWORD);

            if (email == null || password == null) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "Email and password are required");
                return ResponseEntity.badRequest().body(res);
            }

            DeliveryBoy db = deliveryBoyRepository.findByEmail(email);
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
            String email    = (String) body.get("email");
            String password = (String) body.get(KEY_PASSWORD);
            Object mob      = body.get(KEY_MOBILE);

            if (name == null || email == null || password == null || mob == null) {
                res.put(KEY_SUCCESS, false);
                res.put(KEY_MESSAGE, "name, email, password and mobile are all required");
                return ResponseEntity.badRequest().body(res);
            }
            if (deliveryBoyRepository.findByEmail(email) != null) {
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
            deliveryBoyRepository.save(db);
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
            return deliveryBoyRepository.findById(id).orElse(null);
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
        db = deliveryBoyRepository.findById(db.getId()).orElseThrow();

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
            wh.put("city", db.getWarehouse().getCity());
            wh.put("code", db.getWarehouse().getWarehouseCode());
            profile.put("warehouse", wh);
        } else {
            profile.put("warehouse", null);
        }
        // Check pending warehouse change request
        Optional<WarehouseChangeRequest> pendingReq = warehouseChangeRequestRepository
                .findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING);
        profile.put("hasPendingWarehouseRequest", pendingReq.isPresent());

        // Orders split by tracking status (matches website: toPickUp, outNow, delivered)
        List<Order> allAssigned = orderRepository.findByDeliveryBoy(db);
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
        m.put("currentCity",     o.getCurrentCity() != null ? o.getCurrentCity() : "");
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
                im.put("price",       item.getPrice());
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
        db = deliveryBoyRepository.findById(db.getId()).orElseThrow();

        Order order = orderRepository.findById(id).orElse(null);
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
        orderRepository.save(order);

        trackingEventLogRepository.save(new TrackingEventLog(
            order, TrackingStatus.OUT_FOR_DELIVERY,
            VAL_ON_THE_WAY + city,
            "Parcel picked up by delivery boy " + db.getName(), VAL_DELIVERY_BOY));

        // Generate and send OTP to customer
        int otp = RANDOM.nextInt(100000, 1000000);
        deliveryOtpRepository.findByOrder(order).ifPresent(deliveryOtpRepository::delete);
        deliveryOtpRepository.save(new DeliveryOtp(order, otp));

        try {
            emailSender.sendDeliveryOtp(order.getCustomer(), otp, order.getId());
        } catch (Exception e) {
            log.warn("Delivery OTP email failed: " + e.getMessage());
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
            submittedOtp = Integer.parseInt(body.getOrDefault("otp", "0").toString());
        } catch (NumberFormatException e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid OTP format");
            return ResponseEntity.badRequest().body(res);
        }

        Order order = orderRepository.findById(id).orElse(null);
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

        DeliveryOtp deliveryOtp = deliveryOtpRepository.findByOrder(order).orElse(null);
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
        deliveryOtpRepository.save(deliveryOtp);

        order.setTrackingStatus(TrackingStatus.DELIVERED);
        order.setCurrentCity(VAL_DELIVERED);
        orderRepository.save(order);

        trackingEventLogRepository.save(new TrackingEventLog(
            order, TrackingStatus.DELIVERED,
            "Delivered to customer",
            "Delivered by " + db.getName() + ". OTP verified at doorstep.", VAL_DELIVERY_BOY));

        try {
            emailSender.sendDeliveryConfirmation(order.getCustomer(), order);
        } catch (Exception e) {
            log.warn("Delivery confirmation email failed: " + e.getMessage());
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
        db = deliveryBoyRepository.findById(db.getId()).orElseThrow();

        int warehouseId;
        try {
            warehouseId = Integer.parseInt(body.getOrDefault(KEY_WAREHOUSE_ID, "0").toString());
        } catch (NumberFormatException e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Invalid warehouse ID");
            return ResponseEntity.badRequest().body(res);
        }
        String reason = (String) body.getOrDefault(KEY_REASON, "");

        Optional<WarehouseChangeRequest> existing = warehouseChangeRequestRepository
                .findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING);
        if (existing.isPresent()) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "You already have a pending warehouse change request. Please wait for admin to review it.");
            return ResponseEntity.ok(res);
        }

        Warehouse requested = warehouseRepository.findById(warehouseId).orElse(null);
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
        warehouseChangeRequestRepository.save(req);

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
        List<Warehouse> warehouses = warehouseRepository.findByActiveTrue();
        List<Map<String, Object>> data = warehouses.stream().map(wh -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put(KEY_ID,   wh.getId());
            m.put(KEY_NAME, wh.getName());
            m.put("city", wh.getCity());
            m.put("code", wh.getWarehouseCode());
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
        List<Banner> banners = bannerRepository
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
            found.addAll(productRepository.findByNameContainingIgnoreCase(search));
            found.addAll(productRepository.findByDescriptionContainingIgnoreCase(search));
            found.addAll(productRepository.findByCategoryContainingIgnoreCase(search));
            products = found.stream().filter(Product::isApproved).toList();
        } else if (category != null && !category.isBlank()) {
            products = productRepository.findByCategoryAndApprovedTrue(category);
        } else {
            products = productRepository.findByApprovedTrue();
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
        res.put("products", products.stream().map(this::mapProduct).toList());
        res.put(KEY_COUNT, products.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/{id} — includes reviews */
    @GetMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || !p.isApproved()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found");
            return ResponseEntity.badRequest().body(res);
        }
        Map<String, Object> pm = mapProduct(p);
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getProduct() != null && r.getProduct().getId() == id)
                .toList();
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        pm.put("reviews", reviews.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, r.getId());
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put("customerName", r.getCustomerName());
            return m;
        }).toList());
        pm.put("avgRating", Math.round(avg * 10.0) / 10.0);
        pm.put("reviewCount", reviews.size());
        res.put(KEY_SUCCESS, true);
        res.put("product", pm);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/{id}/reviews */
    @GetMapping("/products/{id}/reviews")
    public ResponseEntity<Map<String, Object>> getProductReviews(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getProduct() != null && r.getProduct().getId() == id)
                .toList();
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        res.put(KEY_SUCCESS, true);
        res.put("reviews", reviews.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, r.getId());
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put("customerName", r.getCustomerName());
            return m;
        }).toList());
        res.put("avgRating", Math.round(avg * 10.0) / 10.0);
        res.put("reviewCount", reviews.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/categories */
    @GetMapping("/products/categories")
    public ResponseEntity<Map<String, Object>> getCategories() {
        Map<String, Object> res = new HashMap<>();
        List<String> categories = productRepository.findByApprovedTrue()
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
    public ResponseEntity<Map<String, Object>> getCart(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Cart cart = customer.getCart();
        if (cart == null) {
            res.put(KEY_SUCCESS, true); res.put(KEY_ITEMS, new ArrayList<>()); res.put("total", 0.0);
            res.put("subtotal", 0.0); res.put("deliveryCharge", 0.0); res.put("couponDiscount", 0.0);
            res.put("couponApplied", false); res.put("couponCode", ""); res.put(KEY_COUNT, 0);
            return ResponseEntity.ok(res);
        }
        List<Map<String, Object>> items = cart.getItems().stream().map(this::mapItem).toList();
        double subtotal = cart.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        // Coupon
        com.example.ekart.dto.Coupon applied = appliedCoupons.get(customerId);
        double couponDiscount = 0;
        if (applied != null && applied.isValid() && subtotal >= applied.getMinOrderAmount()) {
            couponDiscount = applied.calculateDiscount(subtotal);
            res.put("couponApplied", true); res.put("couponCode", applied.getCode()); res.put("couponDiscount", couponDiscount);
        } else {
            if (applied != null) appliedCoupons.remove(customerId);
            res.put("couponApplied", false); res.put("couponCode", ""); res.put("couponDiscount", 0.0);
        }
        double discountedSubtotal = Math.max(0, subtotal - couponDiscount);
        double deliveryCharge = discountedSubtotal >= 500 ? 0.0 : (discountedSubtotal == 0 ? 0.0 : 40.0);
        double total = discountedSubtotal + deliveryCharge;
        res.put(KEY_SUCCESS, true); res.put(KEY_ITEMS, items); res.put("itemCount", items.size());
        res.put("subtotal", subtotal); res.put("couponDiscount", couponDiscount);
        res.put("deliveryCharge", deliveryCharge); res.put("total", total); res.put(KEY_COUNT, items.size());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/cart/add */
    @PostMapping("/cart/add")
    public ResponseEntity<Map<String, Object>> addToCart(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
            int productId = Integer.parseInt(body.get("productId").toString());
            // FIX: read quantity from request body (Flutter sends the user-selected qty).
            // Default to 1 if not provided (backward-compat with single-tap add-to-cart).
            int requestedQty = 1;
            if (body.containsKey(KEY_QUANTITY)) {
                try { requestedQty = Integer.parseInt(body.get(KEY_QUANTITY).toString()); }
                catch (NumberFormatException ignored) { /* non-numeric value — use default */ }
            }
            if (requestedQty < 1) requestedQty = 1;

            Product product = productRepository.findById(productId).orElse(null);
            if (product == null || !product.isApproved()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found"); return ResponseEntity.badRequest().body(res); }
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
            customerRepository.save(customer);
            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, qty == 1 ? "Added to cart" : qty + " items added to cart");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** DELETE /api/flutter/cart/remove/{productId} */
    @DeleteMapping("/cart/remove/{productId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null || customer.getCart() == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Cart not found"); return ResponseEntity.badRequest().body(res); }
        List<Item> toDelete = customer.getCart().getItems().stream()
                .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                .toList();
        customer.getCart().getItems().removeAll(toDelete);
        customerRepository.save(customer);
        itemRepository.deleteAll(toDelete);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Removed from cart");
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/cart/update */
    @PutMapping("/cart/update")
    public ResponseEntity<Map<String, Object>> updateCart(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null || customer.getCart() == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Cart not found"); return ResponseEntity.badRequest().body(res); }
        int productId = Integer.parseInt(body.get("productId").toString());
        int quantity  = Integer.parseInt(body.get(KEY_QUANTITY).toString());
        Cart cart = customer.getCart();
        if (quantity <= 0) {
            List<Item> toDelete = cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                    .toList();
            cart.getItems().removeAll(toDelete);
            customerRepository.save(customer);
            itemRepository.deleteAll(toDelete);
        } else {
            cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                    .findFirst().ifPresent(i -> i.setQuantity(quantity));
            customerRepository.save(customer);
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
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
            Cart cart = customer.getCart();
            if (cart == null || cart.getItems().isEmpty()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Cart is empty"); return ResponseEntity.badRequest().body(res); }

            List<Item> orderItems = new ArrayList<>();
            double total = 0;
            for (Item cartItem : cart.getItems()) {
                Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                if (product == null || product.getStock() < cartItem.getQuantity()) {
                    res.put(KEY_SUCCESS, false);
                    res.put(KEY_MESSAGE, "Insufficient stock for: " + cartItem.getName());
                    return ResponseEntity.badRequest().body(res);
                }
                product.setStock(product.getStock() - cartItem.getQuantity());
                productRepository.save(product);
                Item oi = new Item();
                oi.setName(cartItem.getName()); oi.setDescription(cartItem.getDescription());
                oi.setPrice(cartItem.getPrice()); oi.setCategory(cartItem.getCategory());
                oi.setQuantity(cartItem.getQuantity()); oi.setImageLink(cartItem.getImageLink());
                oi.setProductId(cartItem.getProductId());
                orderItems.add(oi);
                total += cartItem.getPrice() * cartItem.getQuantity();
            }

            String deliveryTime   = (String) body.getOrDefault(KEY_DELIVERY_TIME, "STANDARD");
            double deliveryCharge = "EXPRESS".equals(deliveryTime) ? 50.0 : 0.0;

            // ── Structured address support ──────────────────────────────────
            // If recipientName is provided use the structured address fields;
            // otherwise fall back to legacy flat "city" string.
            String deliveryAddress;
            String recipientName = (String) body.get("recipientName");
            if (recipientName != null && !recipientName.isBlank()) {
                String houseStreet = (String) body.getOrDefault("houseStreet", "");
                String city        = (String) body.getOrDefault("city",        "");
                String state       = (String) body.getOrDefault("state",       "");
                String postalCode  = (String) body.getOrDefault("postalCode",  "");

                // Validate PIN if provided
                if (!postalCode.isBlank() && !PinCodeValidator.isValid(postalCode)) {
                    res.put(KEY_SUCCESS, false);
                    res.put(KEY_MESSAGE, PinCodeValidator.ERROR_MESSAGE);
                    return ResponseEntity.badRequest().body(res);
                }

                // Build a formatted address string for the Order record
                deliveryAddress = recipientName.trim()
                        + (houseStreet.isBlank() ? "" : ", " + houseStreet.trim())
                        + (city.isBlank()        ? "" : ", " + city.trim())
                        + (state.isBlank()       ? "" : ", " + state.trim())
                        + (postalCode.isBlank()  ? "" : " - " + postalCode.trim());
            } else {
                // Legacy: just a city string
                deliveryAddress = (String) body.getOrDefault("city", "");
            }

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
            // FIX: store the delivery address in both fields.
            // currentCity is used as a "location display" (mutated as order moves),
            // deliveryAddress is the immutable destination address.
            order.setDeliveryAddress(deliveryAddress);
            order.setCurrentCity(deliveryAddress);
            orderRepository.save(order);

            cart.getItems().clear();
            customerRepository.save(customer);

            res.put(KEY_SUCCESS, true);
            res.put(KEY_MESSAGE, "Order placed successfully");
            res.put("orderId", order.getId());
            res.put(KEY_TOTAL_PRICE, order.getTotalPrice());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** GET /api/flutter/orders */
    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> getOrders(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Order> orders = orderRepository.findByCustomer(customer);
        res.put(KEY_SUCCESS, true);
        res.put("orders", orders.stream().map(this::mapOrder).toList());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/orders/{id} */
    @GetMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrder(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        res.put(KEY_SUCCESS, true); res.put("order", mapOrder(order));
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/orders/{id}/cancel */
    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (order.getTrackingStatus() == TrackingStatus.DELIVERED || order.getTrackingStatus() == TrackingStatus.CANCELLED) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Cannot cancel this order");
            return ResponseEntity.badRequest().body(res);
        }
        for (Item item : order.getItems()) {
            if (item.getProductId() != null) {
                productRepository.findById(item.getProductId()).ifPresent(p -> {
                    p.setStock(p.getStock() + item.getQuantity()); productRepository.save(p);
                });
            }
        }
        order.setTrackingStatus(TrackingStatus.CANCELLED); orderRepository.save(order);
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
        List<Map<String, Object>> list = couponRepository.findByActiveTrue().stream()
                .filter(com.example.ekart.dto.Coupon::isValid)
                .map(c -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("code",           c.getCode());
                    m.put("description",    c.getDescription());
                    m.put("type",           c.getType().name());
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
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        String code = body.get("code") instanceof String s ? s.toUpperCase().trim() : "";
        if (code.isEmpty()) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Coupon code is required"); return ResponseEntity.badRequest().body(res); }
        com.example.ekart.dto.Coupon coupon = couponRepository.findByCode(code).orElse(null);
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
        res.put(KEY_SUCCESS, true); res.put("code", coupon.getCode()); res.put("description", coupon.getDescription());
        res.put("discount", discount); res.put("typeLabel", coupon.getTypeLabel());
        res.put(KEY_MESSAGE, coupon.getDescription() + " — saving ₹" + (int) discount);
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/cart/coupon — remove applied coupon */
    @DeleteMapping("/cart/coupon")
    public ResponseEntity<Map<String, Object>> removeCoupon(@RequestHeader("X-Customer-Id") int customerId) {
        appliedCoupons.remove(customerId);
        return ResponseEntity.ok(java.util.Map.of("success", true, "message", "Coupon removed"));
    }

    // ═══════════════════════════════════════════════════════
    // ORDER TRACKING & REPORT ISSUE
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/orders/{id}/track — live tracking with event history */
    @GetMapping("/orders/{id}/track")
    public ResponseEntity<Map<String, Object>> trackOrder(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer() == null || order.getCustomer().getId() != customerId) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        com.example.ekart.dto.TrackingStatus status = order.getTrackingStatus();
        List<com.example.ekart.dto.TrackingEventLog> events = trackingEventLogRepository.findByOrderOrderByEventTimeAsc(order);
        List<Map<String, Object>> history = events.stream().map(e -> {
            Map<String, Object> ev = new HashMap<>();
            ev.put(KEY_STATUS,      e.getStatus() != null ? e.getStatus().name() : null);
            ev.put("location",    e.getCity());
            ev.put("description", e.getDescription());
            ev.put("timestamp",   e.getEventTime() != null ? e.getEventTime().toString() : null);
            return ev;
        }).toList();
        res.put(KEY_SUCCESS,         true);
        res.put("orderId",         order.getId());
        res.put("currentStatus",   status != null ? status.name() : null);
        res.put("currentCity",     order.getCurrentCity());
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
            @RequestHeader("X-Customer-Id") int customerId,
            @PathVariable int id,
            @RequestBody Map<String, String> body,
            jakarta.servlet.http.HttpServletRequest req) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        String reason      = body != null ? body.get(KEY_REASON)      : null;
        String description = body != null ? body.get("description") : null;
        if (reason == null || reason.isBlank()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "reason is required");
            return ResponseEntity.badRequest().body(res);
        }
        String customerEmail = order.getCustomer().getEmail();
        log.info("[DISPUTE] orderId={} customerId={} customerEmail={} reason=\"{}\" description=\"{}\" ip={} at={}",
            id, customerId, customerEmail, reason, description != null ? description : "",
            req.getRemoteAddr(), LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        try {
            emailSender.sendDisputeNotification(adminEmail, adminEmail, id, customerId, customerEmail, reason, description);
        } catch (Exception e) {
            log.warn("[DISPUTE] Admin email dispatch failed: " + e.getMessage());
        }
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Your issue has been reported. Our team will review it shortly.");
        res.put("orderId", id); res.put(KEY_REASON, reason);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // WISHLIST
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/wishlist */
    @GetMapping("/wishlist")
    public ResponseEntity<Map<String, Object>> getWishlist(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Wishlist> wishlist = wishlistRepository.findByCustomer(customer);
        List<Map<String, Object>> items = wishlist.stream().map(w -> {
            Map<String, Object> m = new HashMap<>();
            Product p = w.getProduct();
            m.put("wishlistId", w.getId()); m.put("addedAt", w.getAddedAt() != null ? w.getAddedAt().toString() : null);
            m.put("productId", p.getId()); m.put(KEY_NAME, p.getName()); m.put("price", p.getPrice());
            m.put("imageLink", p.getImageLink()); m.put("category", p.getCategory()); m.put("inStock", p.getStock() > 0);
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put(KEY_COUNT, items.size()); res.put(KEY_ITEMS, items);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/wishlist/ids */
    @GetMapping("/wishlist/ids")
    public ResponseEntity<Map<String, Object>> getWishlistIds(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Integer> ids = wishlistRepository.findByCustomer(customer).stream()
                .map(w -> w.getProduct().getId()).toList();
        res.put(KEY_SUCCESS, true); res.put("ids", ids);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/wishlist/toggle */
    @PostMapping("/wishlist/toggle")
    public ResponseEntity<Map<String, Object>> toggleWishlist(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Integer> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Integer productId = body.get("productId");
        if (productId == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "productId is required"); return ResponseEntity.badRequest().body(res); }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found"); return ResponseEntity.status(404).body(res); }
        List<Wishlist> existing = wishlistRepository.findByCustomer(customer).stream()
                .filter(w -> w.getProduct().getId() == productId).toList();
        if (!existing.isEmpty()) {
            wishlistRepository.deleteAll(existing);
            res.put(KEY_SUCCESS, true); res.put("wishlisted", false); res.put(KEY_MESSAGE, "Removed from wishlist");
        } else {
            Wishlist w = new Wishlist(); w.setCustomer(customer); w.setProduct(product); w.setAddedAt(LocalDateTime.now());
            wishlistRepository.save(w);
            res.put(KEY_SUCCESS, true); res.put("wishlisted", true); res.put(KEY_MESSAGE, "Added to wishlist");
        }
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/profile */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> profile = new HashMap<>();
        profile.put(KEY_ID, customer.getId()); profile.put(KEY_NAME, customer.getName());
        profile.put(KEY_EMAIL, customer.getEmail()); profile.put(KEY_MOBILE, customer.getMobile());
        profile.put("profileImage", customer.getProfileImage());
        profile.put("addresses", customer.getAddresses().stream().map(a -> {
            Map<String, Object> am = new HashMap<>();
            am.put(KEY_ID,              a.getId());
            am.put("formattedAddress", a.getFormattedAddress());
            am.put("recipientName",   a.getRecipientName() != null ? a.getRecipientName() : "");
            am.put("houseStreet",     a.getHouseStreet()   != null ? a.getHouseStreet()   : "");
            am.put("city",            a.getCity()          != null ? a.getCity()          : "");
            am.put("state",           a.getState()         != null ? a.getState()         : "");
            am.put("postalCode",      a.getPostalCode()    != null ? a.getPostalCode()    : "");
            am.put("details",         a.getDetails()       != null ? a.getDetails()       : "");
            return am;
        }).toList());
        res.put(KEY_SUCCESS, true); res.put("profile", profile);
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/profile/update */
    @PutMapping("/profile/update")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name"))   customer.setName((String) body.get("name"));
        if (body.containsKey(KEY_MOBILE)) customer.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString()));
        customerRepository.save(customer);
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
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }

        Address address = new Address();
        address.setCustomer(customer);

        String recipientName = body.get("recipientName");
        if (recipientName != null && !recipientName.isBlank()) {
            address.setRecipientName(recipientName.trim());
            address.setHouseStreet(body.getOrDefault("houseStreet", "").trim());
            address.setCity(body.getOrDefault("city", "").trim());
            address.setState(body.getOrDefault("state", "").trim());
            String postalCode = body.getOrDefault("postalCode", "").trim();
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
        customerRepository.save(customer);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Address added");
        res.put("addressId", address.getId());
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/profile/address/{id}/delete */
    @DeleteMapping("/profile/address/{id}/delete")
    public ResponseEntity<Map<String, Object>> deleteAddress(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        customer.getAddresses().removeIf(a -> a.getId() == id);
        customerRepository.save(customer);
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
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        int productId  = Integer.parseInt(body.get("productId").toString());
        int rating     = Integer.parseInt(body.get("rating").toString());
        String comment = (String) body.get("comment");
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found"); return ResponseEntity.status(404).body(res); }
        Review review = new Review();
        review.setProduct(product); review.setRating(rating); review.setComment(comment);
        review.setCustomerName(customer.getName());
        reviewRepository.save(review);
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
            @RequestHeader("X-Customer-Id") int customerId,
            @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found");
            return ResponseEntity.badRequest().body(res);
        }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found");
            return ResponseEntity.status(404).body(res);
        }
        if (product.getStock() > 0) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Product is already in stock — add it to your cart!");
            res.put(KEY_SUBSCRIBED, false);
            return ResponseEntity.badRequest().body(res);
        }
        // Prevent duplicate subscriptions
        if (backInStockRepository.existsByCustomerAndProductAndNotifiedFalse(customer, product)) {
            res.put(KEY_SUCCESS, true);
            res.put(KEY_SUBSCRIBED, true);
            res.put(KEY_MESSAGE, "You are already subscribed. We'll email you when it's back!");
            return ResponseEntity.ok(res);
        }
        BackInStockSubscription sub = new BackInStockSubscription(customer, product);
        backInStockRepository.save(sub);
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
            @RequestHeader("X-Customer-Id") int customerId,
            @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found");
            return ResponseEntity.badRequest().body(res);
        }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found");
            return ResponseEntity.status(404).body(res);
        }
        Optional<BackInStockSubscription> existing =
                backInStockRepository.findByCustomerAndProduct(customer, product);
        if (existing.isPresent()) {
            backInStockRepository.delete(existing.get());
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
            @RequestHeader("X-Customer-Id") int customerId,
            @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found");
            return ResponseEntity.badRequest().body(res);
        }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put(KEY_SUCCESS, true); res.put(KEY_SUBSCRIBED, false);
            return ResponseEntity.ok(res);
        }
        boolean subscribed = backInStockRepository
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
    public ResponseEntity<Map<String, Object>> getSpendingSummary(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Order> delivered = orderRepository.findByCustomer(customer).stream()
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
        res.put("totalSpent", totalSpent); res.put("totalOrders", totalOrders);
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
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
            int orderId   = Integer.parseInt(body.get("orderId").toString());
            String reason = (String) body.getOrDefault(KEY_REASON, "");
            String type   = (String) body.getOrDefault("type", "REFUND");
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
            if (order.getTrackingStatus() != TrackingStatus.DELIVERED) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Refund can only be requested for delivered orders"); return ResponseEntity.badRequest().body(res); }
            Refund refund = new Refund();
            refund.setOrder(order); refund.setCustomer(customer);
            refund.setReason("[" + type + "] " + reason);
            refund.setStatus(RefundStatus.PENDING);
            refund.setAmount(order.getTotalPrice());
            refundRepository.save(refund);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Refund request submitted");
            res.put("refundId", refund.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** GET /api/flutter/refund/status/{orderId} */
    @GetMapping("/refund/status/{orderId}")
    public ResponseEntity<Map<String, Object>> getRefundStatus(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int orderId) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Refund> refunds = refundRepository.findByOrder(order);
        if (refunds.isEmpty()) { res.put(KEY_SUCCESS, true); res.put("hasRefund", false); return ResponseEntity.ok(res); }
        Refund latest = refunds.get(refunds.size() - 1);
        res.put(KEY_SUCCESS, true); res.put("hasRefund", true);
        res.put(KEY_STATUS, latest.getStatus().name());
        String storedReason  = latest.getReason() != null ? latest.getReason() : "";
        String refundType    = "REFUND";
        String displayReason = storedReason;
        if (storedReason.startsWith("[REFUND] "))       { refundType = "REFUND";       displayReason = storedReason.substring(9);  }
        else if (storedReason.startsWith("[REPLACEMENT] ")) { refundType = "REPLACEMENT"; displayReason = storedReason.substring(14); }
        res.put(KEY_REASON, displayReason);
        res.put("type", refundType);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — VIEW
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/vendor/products */
    @GetMapping("/vendor/products")
    public ResponseEntity<Map<String, Object>> getVendorProducts(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Product> products = productRepository.findByVendor(vendor);
        res.put(KEY_SUCCESS, true);
        res.put("products", products.stream().map(this::mapProduct).toList());
        res.put(KEY_COUNT, products.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/orders */
    @GetMapping("/vendor/orders")
    public ResponseEntity<Map<String, Object>> getVendorOrders(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Integer> vendorProductIds = productRepository.findByVendor(vendor).stream().map(Product::getId).toList();
        List<Order> allOrders = orderRepository.findOrdersByVendor(vendor);
        List<Map<String, Object>> vendorOrders = allOrders.stream().map(order -> {
            Map<String, Object> o = mapOrder(order);
            List<Map<String, Object>> vendorItems = order.getItems().stream()
                    .filter(i -> i.getProductId() != null && vendorProductIds.contains(i.getProductId()))
                    .map(this::mapItem).toList();
            o.put(KEY_ITEMS, vendorItems);
            double vendorTotal = vendorItems.stream().mapToDouble(i -> (double) i.get("price") * (int) i.get(KEY_QUANTITY)).sum();
            o.put("vendorTotal", vendorTotal);
            return o;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put("orders", vendorOrders);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/stats */
    @GetMapping("/vendor/stats")
    public ResponseEntity<Map<String, Object>> getVendorStats(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Product> products = productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).toList();
        List<Order> orders = orderRepository.findOrdersByVendor(vendor);
        double totalRevenue = orders.stream().filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED)
                .flatMap(o -> o.getItems().stream())
                .filter(i -> i.getProductId() != null && productIds.contains(i.getProductId()))
                .mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        long activeProducts   = products.stream().filter(Product::isApproved).count();
        long lowStockProducts = products.stream().filter(p -> p.getStock() <= (p.getStockAlertThreshold() != null ? p.getStockAlertThreshold() : 10)).count();
        res.put(KEY_SUCCESS, true); res.put("totalRevenue", totalRevenue);
        res.put("totalOrders", orders.size()); res.put("totalProducts", products.size());
        res.put("activeProducts", activeProducts); res.put("lowStockProducts", lowStockProducts);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — PRODUCT CRUD
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/vendor/products/add */
    @PostMapping("/vendor/products/add")
    public ResponseEntity<Map<String, Object>> vendorAddProduct(
            @RequestHeader("X-Vendor-Id") int vendorId, @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        try {
            Product p = new Product();
            p.setName((String) body.get("name")); p.setDescription((String) body.get("description"));
            p.setPrice(Double.parseDouble(body.get("price").toString()));
            p.setCategory((String) body.get("category"));
            p.setStock(Integer.parseInt(body.get("stock").toString()));
            p.setImageLink((String) body.getOrDefault("imageLink", ""));
            Object mrpVal = body.get("mrp"); if (mrpVal != null) p.setMrp(Double.parseDouble(mrpVal.toString()));
            p.setApproved(false); p.setVendor(vendor);
            Object thresh = body.get("stockAlertThreshold");
            if (thresh != null) p.setStockAlertThreshold(Integer.parseInt(thresh.toString()));
            Object pins = body.get("allowedPinCodes");
            if (pins != null && !pins.toString().isBlank()) p.setAllowedPinCodes(pins.toString().trim());
            productRepository.save(p);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Product added. Pending admin approval."); res.put("productId", p.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** PUT /api/flutter/vendor/products/{id}/update */
    @PutMapping("/vendor/products/{id}/update")
    public ResponseEntity<Map<String, Object>> vendorUpdateProduct(
            @RequestHeader("X-Vendor-Id") int vendorId, @PathVariable int id, @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || p.getVendor() == null || p.getVendor().getId() != vendorId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found or not yours"); return ResponseEntity.badRequest().body(res); }
        try {
            if (body.containsKey("name"))        p.setName((String) body.get("name"));
            if (body.containsKey("description")) p.setDescription((String) body.get("description"));
            if (body.containsKey("price"))       p.setPrice(Double.parseDouble(body.get("price").toString()));
            if (body.containsKey("category"))    p.setCategory((String) body.get("category"));
            if (body.containsKey("stock"))       p.setStock(Integer.parseInt(body.get("stock").toString()));
            if (body.containsKey("imageLink"))   p.setImageLink((String) body.get("imageLink"));
            if (body.containsKey("mrp"))         p.setMrp(Double.parseDouble(body.get("mrp").toString()));
            if (body.containsKey("stockAlertThreshold")) p.setStockAlertThreshold(Integer.parseInt(body.get("stockAlertThreshold").toString()));
            if (body.containsKey("allowedPinCodes")) p.setAllowedPinCodes(
                body.get("allowedPinCodes") == null ? null : body.get("allowedPinCodes").toString().trim());
            productRepository.save(p);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Product updated successfully.");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** DELETE /api/flutter/vendor/products/{id}/delete */
    @DeleteMapping("/vendor/products/{id}/delete")
    public ResponseEntity<Map<String, Object>> vendorDeleteProduct(
            @RequestHeader("X-Vendor-Id") int vendorId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || p.getVendor() == null || p.getVendor().getId() != vendorId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found or not yours"); return ResponseEntity.badRequest().body(res); }
        productRepository.delete(p);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Product deleted.");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/sales-report */
    @GetMapping("/vendor/sales-report")
    public ResponseEntity<Map<String, Object>> vendorSalesReport(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Product> products  = productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).toList();
        List<Order>   allOrders = orderRepository.findOrdersByVendor(vendor);
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
        res.put(KEY_SUCCESS, true); res.put("totalRevenue", totalRevenue);
        res.put("totalOrders", allOrders.size()); res.put("totalProducts", products.size());
        res.put("pendingOrders", pendingOrders); res.put("topProducts", topProducts); res.put("recentOrders", recentOrders);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — PROFILE & STOCK ALERTS
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/vendor/profile */
    @GetMapping("/vendor/profile")
    public ResponseEntity<Map<String, Object>> getVendorProfile(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> v = new HashMap<>();
        v.put(KEY_ID, vendor.getId()); v.put(KEY_NAME, vendor.getName());
        v.put(KEY_EMAIL, vendor.getEmail()); v.put(KEY_MOBILE, vendor.getMobile());
        v.put(KEY_VENDOR_CODE, vendor.getVendorCode()); v.put("verified", vendor.isVerified());
        res.put(KEY_SUCCESS, true); res.put("vendor", v);
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/vendor/profile/update */
    @PutMapping("/vendor/profile/update")
    public ResponseEntity<Map<String, Object>> updateVendorProfile(
            @RequestHeader("X-Vendor-Id") int vendorId, @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name") && !((String) body.get("name")).isBlank())
            vendor.setName((String) body.get("name"));
        if (body.containsKey(KEY_MOBILE))
            try { vendor.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString())); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
        vendorRepository.save(vendor);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Profile updated successfully");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/stock-alerts */
    @GetMapping("/vendor/stock-alerts")
    public ResponseEntity<Map<String, Object>> getStockAlerts(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<StockAlert> alerts = stockAlertRepository.findByVendor(vendor);
        alerts.sort((a, b) -> {
            if (a.isAcknowledged() != b.isAcknowledged()) return a.isAcknowledged() ? 1 : -1;
            return Integer.compare(b.getId(), a.getId());
        });
        int unacknowledged = (int) alerts.stream().filter(a -> !a.isAcknowledged()).count();
        List<Map<String, Object>> alertMaps = alerts.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, a.getId());
            m.put(KEY_PRODUCT_NAME,  a.getProduct() != null ? a.getProduct().getName()  : "Unknown");
            m.put("productId",    a.getProduct() != null ? a.getProduct().getId()    : 0);
            m.put("currentStock", a.getProduct() != null ? a.getProduct().getStock() : 0);
            m.put("threshold",    a.getProduct() != null && a.getProduct().getStockAlertThreshold() != null ? a.getProduct().getStockAlertThreshold() : 10);
            m.put(KEY_MESSAGE,      a.getMessage());
            m.put("acknowledged", a.isAcknowledged());
            m.put("alertTime",    a.getAlertTime() != null ? a.getAlertTime().toString() : null);
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put("alerts", alertMaps); res.put("unacknowledgedCount", unacknowledged);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/vendor/stock-alerts/{id}/acknowledge */
    @PostMapping("/vendor/stock-alerts/{id}/acknowledge")
    public ResponseEntity<Map<String, Object>> acknowledgeAlert(
            @RequestHeader("X-Vendor-Id") int vendorId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        StockAlert alert = stockAlertRepository.findById(id).orElse(null);
        if (alert == null || alert.getVendor().getId() != vendorId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Alert not found"); return ResponseEntity.badRequest().body(res); }
        alert.setAcknowledged(true);
        stockAlertRepository.save(alert);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Alert acknowledged");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/admin/users */
    @GetMapping("/admin/users")
    public ResponseEntity<Map<String, Object>> adminGetUsers() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> customers = customerRepository.findAll().stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, c.getId()); m.put(KEY_NAME, c.getName()); m.put(KEY_EMAIL, c.getEmail());
            m.put(KEY_MOBILE, c.getMobile()); m.put(KEY_ACTIVE, c.isActive()); m.put("verified", c.isVerified());
            return m;
        }).toList();
        List<Map<String, Object>> vendors = vendorRepository.findAll().stream().map(v -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, v.getId()); m.put(KEY_NAME, v.getName()); m.put(KEY_EMAIL, v.getEmail());
            m.put(KEY_MOBILE, v.getMobile()); m.put(KEY_VENDOR_CODE, v.getVendorCode());
            m.put(KEY_ACTIVE, v.isVerified()); m.put("verified", v.isVerified());
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put("customers", customers); res.put("vendors", vendors);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/customers/{id}/toggle-active */
    @PostMapping("/admin/customers/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleCustomer(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer c = customerRepository.findById(id).orElse(null);
        if (c == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        c.setActive(!c.isActive()); customerRepository.save(c);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, c.isActive() ? "Account activated" : "Account suspended"); res.put(KEY_ACTIVE, c.isActive());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/vendors/{id}/toggle-active */
    @PostMapping("/admin/vendors/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleVendor(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor v = vendorRepository.findById(id).orElse(null);
        if (v == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        v.setVerified(!v.isVerified()); vendorRepository.save(v);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, v.isVerified() ? "Vendor activated" : "Vendor suspended"); res.put(KEY_ACTIVE, v.isVerified());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/products */
    @GetMapping("/admin/products")
    public ResponseEntity<Map<String, Object>> adminGetProducts() {
        Map<String, Object> res = new HashMap<>();
        res.put(KEY_SUCCESS, true);
        res.put("products", productRepository.findAll().stream().map(this::mapProduct).toList());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/approve */
    @PostMapping("/admin/products/{id}/approve")
    public ResponseEntity<Map<String, Object>> adminApproveProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found"); return ResponseEntity.badRequest().body(res); }
        p.setApproved(true); productRepository.save(p);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Product approved and is now visible to customers");
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/reject */
    @PostMapping("/admin/products/{id}/reject")
    public ResponseEntity<Map<String, Object>> adminRejectProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Product not found"); return ResponseEntity.badRequest().body(res); }
        p.setApproved(false); productRepository.save(p);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Product rejected / hidden from customers");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/orders */
    @GetMapping("/admin/orders")
    public ResponseEntity<Map<String, Object>> adminGetOrders() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
                .sorted(Comparator.comparingInt(Order::getId).reversed())
                .map(this::mapOrder).toList();
        res.put(KEY_SUCCESS, true); res.put("orders", orders);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/orders/{id}/status  body: { status } */
    @PostMapping("/admin/orders/{id}/status")
    public ResponseEntity<Map<String, Object>> adminUpdateOrderStatus(
            @PathVariable int id, @RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        try {
            TrackingStatus newStatus = TrackingStatus.valueOf(body.get(KEY_STATUS));
            order.setTrackingStatus(newStatus); orderRepository.save(order);
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
        List<Map<String, Object>> vendors = vendorRepository.findAll().stream().map(v -> {
            Map<String, Object> m = new HashMap<>();
            m.put(KEY_ID, v.getId()); m.put(KEY_NAME, v.getName()); m.put(KEY_EMAIL, v.getEmail());
            m.put(KEY_MOBILE, v.getMobile()); m.put(KEY_VENDOR_CODE, v.getVendorCode());
            m.put(KEY_ACTIVE, v.isVerified()); m.put("verified", v.isVerified());
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
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Cart cart = customer.getCart();
        if (cart == null) { cart = new Cart(); customer.setCart(cart); }
        cart.getItems().clear();
        int addedCount = 0;
        List<String> outOfStock = new ArrayList<>();
        for (Item orderItem : order.getItems()) {
            Product p = productRepository.findById(orderItem.getProductId()).orElse(null);
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
        customerRepository.save(customer);
        res.put(KEY_SUCCESS, true);
        res.put("addedCount", addedCount);
        res.put("outOfStockItems", outOfStock);
        res.put(KEY_MESSAGE, addedCount > 0 ? addedCount + " item(s) added to cart" : "All items are out of stock");
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/profile/change-password */
    @PutMapping("/profile/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Customer not found"); return ResponseEntity.badRequest().body(res); }
        String current = (String) body.get("currentPassword");
        String newPwd  = (String) body.get("newPassword");
        if (current == null || newPwd == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Both passwords required"); return ResponseEntity.badRequest().body(res); }
        try {
            if (!AES.decrypt(customer.getPassword()).equals(current)) {
                res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Current password is incorrect");
                return ResponseEntity.badRequest().body(res);
            }
            if (newPwd.length() < 8) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "New password must be at least 8 characters"); return ResponseEntity.badRequest().body(res); }
            customer.setPassword(AES.encrypt(newPwd)); customerRepository.save(customer);
            res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Password changed successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    // ═══════════════════════════════════════════════════════
    // HELPER MAPPERS
    // ═══════════════════════════════════════════════════════

    private Map<String, Object> mapProduct(Product p) {
        Map<String, Object> m = new HashMap<>();
        m.put(KEY_ID, p.getId()); m.put(KEY_NAME, p.getName()); m.put("description", p.getDescription());
        m.put("price", p.getPrice()); m.put("mrp", p.getMrp()); m.put("category", p.getCategory());
        m.put("stock", p.getStock()); m.put("imageLink", p.getImageLink());
        m.put("extraImageLinks", p.getExtraImageLinks());
        m.put("approved", p.isApproved());
        m.put(KEY_VENDOR_CODE, p.getVendor() != null ? p.getVendor().getVendorCode() : null);
        m.put("allowedPinCodes", p.getAllowedPinCodes()); // PIN code delivery restriction
        return m;
    }

    private Map<String, Object> mapItem(Item i) {
        Map<String, Object> m = new HashMap<>();
        m.put(KEY_ID, i.getId()); m.put(KEY_NAME, i.getName()); m.put("description", i.getDescription());
        m.put("price", i.getPrice()); m.put("category", i.getCategory());
        m.put(KEY_QUANTITY, i.getQuantity()); m.put("imageLink", i.getImageLink()); m.put("productId", i.getProductId());
        // FIX: Flutter OrderItem.returnsAccepted gates the "Request Refund / Replacement"
        // button and the "Returnable / Non-returnable" badge on the orders screen.
        // Product.java has no returnsAccepted column yet so we default to true
        // (all items returnable).  Once you add @Column boolean returnsAccepted
        // to Product, swap the literal true for p.isReturnsAccepted().
        boolean returnsAccepted = true;
        if (i.getProductId() != null) {
            returnsAccepted = productRepository.findById(i.getProductId())
                    .map(p -> true)   // replace with: p.isReturnsAccepted()
                    .orElse(true);
        }
        m.put("returnsAccepted", returnsAccepted);
        return m;
    }

    private Map<String, Object> mapOrder(Order o) {
        Map<String, Object> m = new HashMap<>();
        m.put(KEY_ID,                    o.getId());
        m.put("amount",                o.getAmount());
        m.put("deliveryCharge",        o.getDeliveryCharge());
        m.put(KEY_TOTAL_PRICE,            o.getTotalPrice());
        m.put(KEY_PAYMENT_MODE,           o.getPaymentMode());
        m.put(KEY_DELIVERY_TIME,          o.getDeliveryTime());
        m.put(KEY_TRACKING_STATUS,        o.getTrackingStatus().name());
        m.put("trackingStatusDisplay", o.getTrackingStatus().getDisplayName());
        m.put("currentCity",           o.getCurrentCity());
        // FIX: emit the immutable destination address separately from currentCity
        // (currentCity is mutated as the order moves; deliveryAddress never changes).
        m.put("deliveryAddress",       o.getDeliveryAddress() != null ? o.getDeliveryAddress() : "");
        m.put("orderDate",             o.getOrderDate() != null ? o.getOrderDate().toString() : null);
        m.put("replacementRequested",  o.isReplacementRequested());
        m.put(KEY_ITEMS,                 o.getItems().stream().map(this::mapItem).toList());
        if (o.getCustomer() != null) m.put("customerName", o.getCustomer().getName());

        // ── deliveredAt ───────────────────────────────────────────────────────
        // Looks up the DELIVERED event log entry and returns its exact timestamp.
        // The Flutter app uses this to enforce the 7-day refund/report window
        // client-side: if deliveredAt is null the window defaults to closed.
        if (o.getTrackingStatus() == TrackingStatus.DELIVERED) {
            trackingEventLogRepository.findByOrderOrderByEventTimeAsc(o)
                .stream()
                .filter(e -> e.getStatus() == TrackingStatus.DELIVERED)
                .findFirst()
                .ifPresent(e -> m.put("deliveredAt",
                        e.getEventTime() != null ? e.getEventTime().toString() : null));
        }

        // ── reviewedProductIds ────────────────────────────────────────────────
        // Returns the list of productIds this customer has already reviewed for
        // this order, so the Flutter app can hide the ★ Rate button per item and
        // show a "Reviewed" badge instead. Always present (empty list for
        // non-delivered orders) so the app never needs a null-check.
        if (o.getTrackingStatus() == TrackingStatus.DELIVERED
                && o.getCustomer() != null) {
            String customerName = o.getCustomer().getName();
            List<Integer> reviewedIds = o.getItems().stream()
                .filter(i -> i.getProductId() != null)
                .filter(i -> reviewRepository.existsByProductIdAndCustomerName(
                        i.getProductId(), customerName))
                .map(i -> i.getProductId())
                .toList();
            m.put("reviewedProductIds", reviewedIds);
        } else {
            m.put("reviewedProductIds", Collections.emptyList());
        }

        return m;
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
                ? adminAccountService.searchAccounts(search)
                : adminAccountService.getAllAccountsWithMetadata();
        res.put(KEY_SUCCESS, true);
        res.put("accounts", accounts);
        res.put(KEY_COUNT, accounts.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/accounts/stats */
    @GetMapping("/admin/accounts/stats")
    public ResponseEntity<Map<String, Object>> adminGetAccountStats() {
        Map<String, Object> stats = adminAccountService.getAccountStats();
        stats.put(KEY_SUCCESS, true);
        return ResponseEntity.ok(stats);
    }

    /** GET /api/flutter/admin/accounts/{id}/profile */
    @GetMapping("/admin/accounts/{id}/profile")
    public ResponseEntity<Map<String, Object>> adminGetAccountProfile(@PathVariable int id) {
        Map<String, Object> profile = adminAccountService.getUserProfile(id);
        if (profile.containsKey("error")) return ResponseEntity.badRequest().body(profile);
        return ResponseEntity.ok(profile);
    }

    /** POST /api/flutter/admin/accounts/{id}/toggle — toggle active/ban */
    @PostMapping("/admin/accounts/{id}/toggle")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleAccount(
            @PathVariable int id, @RequestBody Map<String, Object> body) {
        boolean activate = Boolean.TRUE.equals(body.get("isActive"));
        Map<String, Object> result = adminAccountService.toggleAccountStatus(id, activate);
        return Boolean.TRUE.equals(result.get("success"))
                ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /** POST /api/flutter/admin/accounts/{id}/reset-password */
    @PostMapping("/admin/accounts/{id}/reset-password")
    public ResponseEntity<Map<String, Object>> adminResetPassword(@PathVariable int id) {
        Map<String, Object> result = adminAccountService.generatePasswordResetLink(id);
        return Boolean.TRUE.equals(result.get("success"))
                ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /** DELETE /api/flutter/admin/accounts/{id} */
    @DeleteMapping("/admin/accounts/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminDeleteAccount(@PathVariable int id) {
        Map<String, Object> result = adminAccountService.deleteAccount(id);
        return Boolean.TRUE.equals(result.get("success"))
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
        List<com.example.ekart.dto.Review> all = reviewRepository.findAll();

        // Star distribution
        long five  = all.stream().filter(r -> r.getRating() == 5).count();
        long four  = all.stream().filter(r -> r.getRating() == 4).count();
        long three = all.stream().filter(r -> r.getRating() == 3).count();
        long two   = all.stream().filter(r -> r.getRating() == 2).count();
        long one   = all.stream().filter(r -> r.getRating() == 1).count();
        double avg = all.stream().mapToInt(com.example.ekart.dto.Review::getRating).average().orElse(0.0);

        List<com.example.ekart.dto.Review> filtered = new ArrayList<>(all);
        if (!filter.equals("all")) {
            try {
                int star = Integer.parseInt(filter);
                filtered = filtered.stream().filter(r -> r.getRating() == star).toList();
            } catch (NumberFormatException ignored) { /* non-numeric value — use default */ }
        }
        if (!search.isBlank()) {
            String q = search.toLowerCase();
            filtered = filtered.stream().filter(r ->
                (r.getCustomerName() != null && r.getCustomerName().toLowerCase().contains(q)) ||
                (r.getComment()      != null && r.getComment().toLowerCase().contains(q)) ||
                (r.getProduct()      != null && r.getProduct().getName().toLowerCase().contains(q))
            ).toList();
        }
        filtered.sort((a, b) -> {
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });

        List<Map<String, Object>> reviewMaps = filtered.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put(KEY_ID,           r.getId());
            m.put("rating",       r.getRating());
            m.put("comment",      r.getComment() != null ? r.getComment() : "");
            m.put("customerName", r.getCustomerName() != null ? r.getCustomerName() : "");
            m.put(KEY_PRODUCT_NAME,  r.getProduct() != null ? r.getProduct().getName() : "");
            m.put("productId",    r.getProduct() != null ? r.getProduct().getId() : 0);
            m.put("createdAt",    r.getCreatedAt() != null ? r.getCreatedAt().toString() : "");
            return m;
        }).toList();

        res.put(KEY_SUCCESS,      true);
        res.put("reviews",      reviewMaps);
        res.put("total",        all.size());
        res.put("filtered",     filtered.size());
        res.put("avgRating",    Math.round(avg * 10.0) / 10.0);
        res.put("fiveStars",    five);
        res.put("fourStars",    four);
        res.put("threeStars",   three);
        res.put("twoStars",     two);
        res.put("oneStar",      one);
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/admin/reviews/{id} */
    @DeleteMapping("/admin/reviews/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminDeleteReview(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            reviewRepository.deleteById(id);
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
            List<com.example.ekart.dto.Review> toDelete = reviewRepository.findAll().stream()
                    .filter(r -> r.getProduct() != null &&
                                 r.getProduct().getName().equalsIgnoreCase(productName))
                    .toList();
            reviewRepository.deleteAll(toDelete);
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
        List<Map<String, Object>> banners = bannerRepository.findAll().stream().map(b -> {
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
        bannerRepository.save(b);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Banner added"); res.put(KEY_ID, b.getId());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/banners/{id}/toggle */
    @PostMapping("/admin/banners/{id}/toggle")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleBanner(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = bannerRepository.findById(id).orElse(null);
        if (b == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Banner not found"); return ResponseEntity.badRequest().body(res); }
        b.setActive(!b.isActive());
        bannerRepository.save(b);
        res.put(KEY_SUCCESS, true); res.put(KEY_ACTIVE, b.isActive());
        res.put(KEY_MESSAGE, b.isActive() ? "Banner activated" : "Banner deactivated");
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/banners/{id}/toggle-customer-home */
    @PostMapping("/admin/banners/{id}/toggle-customer-home")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleBannerCustomerHome(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = bannerRepository.findById(id).orElse(null);
        if (b == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Banner not found"); return ResponseEntity.badRequest().body(res); }
        b.setShowOnCustomerHome(!b.isShowOnCustomerHome());
        bannerRepository.save(b);
        res.put(KEY_SUCCESS, true); res.put("showOnCustomerHome", b.isShowOnCustomerHome());
        res.put(KEY_MESSAGE, b.isShowOnCustomerHome() ? "Shown on customer home" : "Hidden from customer home");
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/admin/banners/{id} */
    @DeleteMapping("/admin/banners/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminDeleteBanner(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!bannerRepository.existsById(id)) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Banner not found"); return ResponseEntity.badRequest().body(res); }
        bannerRepository.deleteById(id);
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
        List<Map<String, Object>> warehouses = warehouseRepository.findAll().stream().map(wh -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put(KEY_ID,             wh.getId());
            m.put(KEY_NAME,           wh.getName());
            m.put("city",           wh.getCity());
            m.put("state",          wh.getState() != null ? wh.getState() : "");
            m.put("warehouseCode",  wh.getWarehouseCode() != null ? wh.getWarehouseCode() : "");
            m.put(KEY_ACTIVE,         wh.isActive());
            m.put("servedPinCodes", wh.getServedPinCodes() != null ? wh.getServedPinCodes() : "");
            long boyCount = deliveryBoyRepository.findAll().stream()
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
        String city = (String) body.getOrDefault("city", "");
        if (name.isBlank() || city.isBlank()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Name and city are required");
            return ResponseEntity.badRequest().body(res);
        }
        Warehouse wh = new Warehouse();
        wh.setName(name.trim());
        wh.setCity(city.trim());
        wh.setState((String) body.getOrDefault("state", ""));
        wh.setServedPinCodes((String) body.getOrDefault("servedPinCodes", ""));
        wh.setActive(true);
        warehouseRepository.save(wh);
        wh.setWarehouseCode(String.format("WH-%04d", wh.getId()));
        warehouseRepository.save(wh);
        res.put(KEY_SUCCESS, true); res.put(KEY_MESSAGE, "Warehouse added"); res.put(KEY_ID, wh.getId());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/warehouses/{id}/toggle */
    @PostMapping("/admin/warehouses/{id}/toggle")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleWarehouse(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Warehouse wh = warehouseRepository.findById(id).orElse(null);
        if (wh == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_WAREHOUSE_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        wh.setActive(!wh.isActive());
        warehouseRepository.save(wh);
        res.put(KEY_SUCCESS, true); res.put(KEY_ACTIVE, wh.isActive());
        res.put(KEY_MESSAGE, wh.isActive() ? "Warehouse activated" : "Warehouse deactivated");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/warehouses/{id}/boys */
    @GetMapping("/admin/warehouses/{id}/boys")
    public ResponseEntity<Map<String, Object>> adminGetDeliveryBoysByWarehouse(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Warehouse wh = warehouseRepository.findById(id).orElse(null);
        if (wh == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_WAREHOUSE_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Map<String, Object>> boys = deliveryBoyRepository.findAll().stream()
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
        List<Map<String, Object>> requests = warehouseChangeRequestRepository
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
        WarehouseChangeRequest req = warehouseChangeRequestRepository.findById(id).orElse(null);
        if (req == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Request not found"); return ResponseEntity.badRequest().body(res); }
        if (req.getStatus() != WarehouseChangeRequest.Status.PENDING) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Request already resolved"); return ResponseEntity.ok(res); }
        DeliveryBoy db = req.getDeliveryBoy();
        db.setWarehouse(req.getRequestedWarehouse());
        db.setAssignedPinCodes("");
        deliveryBoyRepository.save(db);
        req.setStatus(WarehouseChangeRequest.Status.APPROVED);
        req.setAdminNote(adminNote.trim());
        req.setResolvedAt(LocalDateTime.now());
        warehouseChangeRequestRepository.save(req);
        try { emailSender.sendWarehouseChangeApproved(db, req.getRequestedWarehouse(), adminNote); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
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
        WarehouseChangeRequest req = warehouseChangeRequestRepository.findById(id).orElse(null);
        if (req == null) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Request not found"); return ResponseEntity.badRequest().body(res); }
        if (req.getStatus() != WarehouseChangeRequest.Status.PENDING) { res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Request already resolved"); return ResponseEntity.ok(res); }
        req.setStatus(WarehouseChangeRequest.Status.REJECTED);
        req.setAdminNote(adminNote.trim());
        req.setResolvedAt(LocalDateTime.now());
        warehouseChangeRequestRepository.save(req);
        try { emailSender.sendWarehouseChangeRejected(req.getDeliveryBoy(), req.getRequestedWarehouse(), adminNote); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
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
        long totalCustomers    = customerRepository.count();
        long totalVendors      = vendorRepository.count();
        long totalProducts     = productRepository.count();
        long pendingProducts   = productRepository.findAll().stream().filter(p -> !p.isApproved()).count();
        long totalOrders       = orderRepository.count();
        long pendingOrders     = orderRepository.findAll().stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.PROCESSING || o.getTrackingStatus() == TrackingStatus.PACKED).count();
        double totalRevenue    = orderRepository.findAll().stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED)
                .mapToDouble(Order::getTotalPrice).sum();
        long totalDeliveryBoys = deliveryBoyRepository.count();
        long pendingApprovals  = deliveryBoyRepository.findByAdminApprovedFalseAndVerifiedTrue().size();
        long pendingWHChanges  = warehouseChangeRequestRepository
                .findByStatusOrderByRequestedAtDesc(WarehouseChangeRequest.Status.PENDING).size();
        long totalReviews      = reviewRepository.count();
        long totalBanners      = bannerRepository.count();
        res.put(KEY_SUCCESS,           true);
        res.put("totalCustomers",    totalCustomers);
        res.put("totalVendors",      totalVendors);
        res.put("totalProducts",     totalProducts);
        res.put("pendingProducts",   pendingProducts);
        res.put("totalOrders",       totalOrders);
        res.put("pendingOrders",     pendingOrders);
        res.put("totalRevenue",      Math.round(totalRevenue * 100.0) / 100.0);
        res.put("totalDeliveryBoys", totalDeliveryBoys);
        res.put("pendingApprovals",  pendingApprovals);
        res.put("pendingWHChanges",  pendingWHChanges);
        res.put("totalReviews",      totalReviews);
        res.put("totalBanners",      totalBanners);
        return ResponseEntity.ok(res);
    }
}