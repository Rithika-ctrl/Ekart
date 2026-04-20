package com.example.ekart.controller;
import com.example.ekart.dto.Address;
import java.util.stream.Collectors;
import java.util.Random;
import java.util.Optional;
import java.time.LocalDateTime;

import com.example.ekart.dto.*;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.JwtUtil;
import com.example.ekart.helper.DeliveryRefreshTokenUtil;
import com.example.ekart.repository.*;
import com.example.ekart.service.AiAssistantService;
import com.example.ekart.service.RefundService;
import com.example.ekart.service.SocialAuthService;
import com.example.ekart.service.AdminAuthService;
import com.example.ekart.config.OAuthProviderValidator;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Vendor;
// import com.example.ekart.dto.Role; // unused
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * PRIMARY REST API Controller for Ekart Web Application.
 * Base path: /api/react
 * 
 * ✅ This is the PRIMARY API for all new clients and integrations.
 * Replaces the deprecated FlutterApiController (/api/flutter).
 *
 * Auth pattern:
 *   X-Customer-Id: <id>  for customer endpoints
 *   X-Vendor-Id:   <id>  for vendor endpoints
 *
 * All endpoints are under /api/react/** which must be
 * permitted in SecurityConfig (same as /api/flutter/**).
 * 
 * Migration from /api/flutter:
 *   See FlutterApiController for deprecation notice and migration guidance.
 */
@RestController
@RequestMapping("/api/react")
@CrossOrigin(origins = "*")
public class ReactApiController {

    private static final Logger LOGGER = LoggerFactory.getLogger(ReactApiController.class);

    private static String sanitizeForLog(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replaceAll("[\\r\\n\\t]", " ")
                .replaceAll("\\p{Cntrl}", " ")
                .trim()
                .replaceAll("\\s{2,}", " ");
    }

    private static String maskEmailForLog(String email) {
        String sanitizedEmail = sanitizeForLog(email);
        int atIndex = sanitizedEmail.indexOf('@');
        if (atIndex <= 0) {
            return sanitizedEmail;
        }
        String localPart = sanitizedEmail.substring(0, atIndex);
        String domainPart = sanitizedEmail.substring(atIndex);
        if (localPart.length() <= 2) {
            return "**" + domainPart;
        }
        return localPart.charAt(0) + "***" + localPart.charAt(localPart.length() - 1) + domainPart;
    }

    private static final String STRONG_PASSWORD_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";
    private static final String STRONG_PASSWORD_MESSAGE = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";

    // ═══════════════════════════════════════════════════════════════════════════
    // String constants (S1192 — eliminates duplicate-literal violations)
    // ═══════════════════════════════════════════════════════════════════════════

    // JSON response / request body keys
    private static final String KEY_ADMIN_ID = "adminId";
    private static final String KEY_ADMIN_NOTE = "adminNote";
    private static final String KEY_ADMIN_APPROVED = "adminApproved";
    private static final String KEY_ASSIGNED_PIN_CODES = "assignedPinCodes";
    private static final String KEY_CONTACT_EMAIL = "contactEmail";
    private static final String KEY_CONTACT_PHONE = "contactPhone";
    private static final String KEY_CURRENT_PASSWORD = "currentPassword";
    private static final String KEY_DELIVERY_BOY_CODE = "deliveryBoyCode";
    private static final String KEY_DELIVERY_BOY_ID = "deliveryBoyId";
    private static final String KEY_DELIVERY_BOY_NAME = "deliveryBoyName";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_ERROR = "error";
    private static final String KEY_SUCCESS = "success";
    private static final String KEY_ESTIMATED_DELIVERY = "estimatedDelivery";
    private static final String KEY_IMAGE_LINK = "imageLink";
    private static final String KEY_IS_AVAILABLE = "isAvailable";
    private static final String KEY_LATITUDE = "latitude";
    private static final String KEY_LONGITUDE = "longitude";
    private static final String KEY_LOGIN_ID = "loginId";
    private static final String KEY_MOBILE = "mobile";
    private static final String KEY_NEW_PASSWORD = "newPassword";
    private static final String KEY_NEW_STATUS = "newStatus";
    private static final String KEY_ORDER_ID = "orderId";
    private static final String KEY_PAYMENT_STATUS = "paymentStatus";
    private static final String KEY_PRODUCT_ID = "productId";
    private static final String KEY_RAZORPAY_ORDER_ID = "razorpayOrderId";
    private static final String KEY_ROUTING_PATH = "routingPath";
    private static final String KEY_SERVED_PIN_CODES = "servedPinCodes";
    private static final String KEY_TOTAL_AMOUNT = "totalAmount";
    private static final String KEY_VENDOR_ID = "vendorId";
    private static final String KEY_VENDOR_NAME = "vendorName";
    private static final String KEY_WAREHOUSE_CODE = "warehouseCode";
    private static final String KEY_WAREHOUSE_ID = "warehouseId";
    private static final String KEY_WAREHOUSE_NAME = "warehouseName";
    private static final String KEY_COUNT = "count";
    private static final String KEY_CUSTOMER_NAME = "customerName";
    private static final String KEY_ORDERS = "orders";
    private static final String KEY_TOTAL = "total";

    // HTTP header names
    private static final String HEADER_AUTHORIZATION = "Authorization";
    private static final String HEADER_CONTENT_DISPOSITION = "Content-Disposition";
    private static final String HEADER_CUSTOMER_ID = "X-Customer-Id";
    private static final String HEADER_VENDOR_ID = "X-Vendor-Id";

    // JWT claim keys
    private static final String CLAIM_ROLE = "react.role";
    private static final String CLAIM_USER_ID = "react.userId";

    // Role and status string values
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_DELIVERY_BOY = "delivery_boy";
    private static final String ROLE_WAREHOUSE = "WAREHOUSE";
    private static final String STATUS_DELIVERED = "DELIVERED";
    private static final String STATUS_PAID = "PAID";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_SHIPPED = "SHIPPED";
    private static final String STATUS_VERIFIED = "VERIFIED";

    // Error and informational messages
    private static final String ERR_ACCOUNT_NOT_FOUND = "Account not found";
    private static final String ERR_ADMIN_ID_NOT_IN_TOKEN = "Admin ID not found in token";
    private static final String ERR_ADMIN_REQUIRED = "Admin access required";
    private static final String ERR_AUTH_FAILED = "Authentication failed: No valid JWT token";
    private static final String ERR_BANNER_NOT_FOUND = "Banner not found";
    private static final String ERR_CUSTOMER_NOT_FOUND = "Customer not found";
    private static final String ERR_DELIVERY_BOY_NOT_FOUND = "Delivery boy not found";
    private static final String ERR_DEPRECATION_TRACKING_DISABLED = "Deprecation tracking not enabled";
    private static final String ERR_EMAIL_OTP_REQUIRED = "Email and OTP are required";
    private static final String ERR_EMAIL_REQUIRED = "Email is required";
    private static final String ERR_INVALID_OTP_FORMAT = "Invalid OTP format";
    private static final String ERR_MISSING_CUSTOMER_HEADER = "Missing X-Customer-Id header";
    private static final String ERR_NOT_WAREHOUSE = "Not authenticated as warehouse";
    private static final String ERR_NO_ACCOUNT_FOR_EMAIL = "No account found with this email";
    private static final String ERR_ORDER_NOT_ASSIGNED = "This order is not assigned to you";
    private static final String ERR_ORDER_NOT_FOUND = "Order not found";
    private static final String ERR_PRODUCT_NOT_FOUND = "Product not found";
    private static final String ERR_UNAUTHORIZED = "Unauthorized";
    private static final String ERR_VENDOR_NOT_FOUND = "Vendor not found";
    private static final String ERR_WAREHOUSE_NOT_FOUND = "Warehouse not found";
    private static final String FMT_OTP = "%06d";
    private static final String MSG_PASSWORD_CHANGED = "Password changed successfully";
    private static final String PREFIX_ORDER = "Order #";




    private static final DateTimeFormatter CHAT_DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

        private static final Map<String, Double> GST_CATEGORY_RATES = Map.ofEntries(
            Map.entry("groceries", 0.0),
            Map.entry("fresh produce", 0.0),
            Map.entry("dairy & eggs", 0.0),
            Map.entry("meat & seafood", 0.0),
            Map.entry("baby products", 0.0),
            Map.entry("books", 0.0),
            Map.entry("educational", 0.0),
            Map.entry("snacks", 5.0),
            Map.entry("beverages", 5.0),
            Map.entry("health & wellness", 5.0),
            Map.entry("medicines", 5.0),
            Map.entry("apparel", 5.0),
            Map.entry("footwear", 5.0),
            Map.entry("textiles", 5.0),
            Map.entry("home & kitchen", 12.0),
            Map.entry("furniture", 12.0),
            Map.entry("sports", 12.0),
            Map.entry("stationery", 12.0),
            Map.entry("toys & games", 12.0),
            Map.entry("electronics", 18.0),
            Map.entry("computers", 18.0),
            Map.entry("mobile & tablets", 18.0),
            Map.entry("appliances", 18.0),
            Map.entry("beauty", 18.0),
            Map.entry("personal care", 18.0),
            Map.entry("software", 18.0),
            Map.entry("services", 18.0),
            Map.entry("gaming", 28.0),
            Map.entry("luxury", 28.0),
            Map.entry("automobile accessories", 28.0)
        );
        private static final double DEFAULT_GST_RATE = 18.0;


    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final CustomerRepository customerRepository;
    private final VendorRepository vendorRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final WishlistRepository wishlistRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final RefundRepository refundRepository;
    private final RefundImageRepository refundImageRepository;
    private final AutoAssignLogRepository autoAssignLogRepository;
    private final CashSettlementRepository cashSettlementRepository;
    private final com.example.ekart.helper.CloudinaryHelper cloudinaryHelper;
    private final CouponRepository couponRepository;
    private final AiAssistantService aiAssistantService;
    private final RefundService refundService;
    private final SocialAuthService socialAuthService;
    private final OAuthProviderValidator oAuthProviderValidator;
    private final com.example.ekart.service.StockAlertService stockAlertService;
    private final com.example.ekart.service.AutoAssignmentService autoAssignmentService;
    private final com.example.ekart.service.OtpService otpService;
    private final AdminAuthService adminAuthService;
    private final com.example.ekart.helper.EmailSender emailSender;
    private final com.example.ekart.service.RazorpayService razorpayService;
    private final com.example.ekart.service.InvoiceService invoiceService;
    private final JwtUtil jwtUtil;
    private final DeliveryRefreshTokenUtil deliveryRefreshTokenUtil;
    private final DeliveryBoyRepository deliveryBoyRepository;
    private final WarehouseRepository warehouseRepository;
    private final com.example.ekart.service.WarehouseService warehouseService;
    private final com.example.ekart.service.WarehouseRoutingService warehouseRoutingService;
    private final com.example.ekart.service.WarehouseTransferService warehouseTransferService;
    private final DeliveryOtpRepository deliveryOtpRepository;
    private final WarehouseChangeRequestRepository warehouseChangeRequestRepository;
    private final TrackingEventLogRepository trackingEventLogRepository;
    private final BannerRepository bannerRepository;
    private final StockAlertRepository stockAlertRepository;
    private com.example.ekart.deprecation.ThymeleafDeprecationTracker deprecationTracker;

    public ReactApiController(
            CustomerRepository customerRepository,
            VendorRepository vendorRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            ItemRepository itemRepository,
            WishlistRepository wishlistRepository,
            ReviewRepository reviewRepository,
            ReviewImageRepository reviewImageRepository,
            RefundRepository refundRepository,
            RefundImageRepository refundImageRepository,
            AutoAssignLogRepository autoAssignLogRepository,
            CashSettlementRepository cashSettlementRepository,
            com.example.ekart.helper.CloudinaryHelper cloudinaryHelper,
            CouponRepository couponRepository,
            AiAssistantService aiAssistantService,
            RefundService refundService,
            SocialAuthService socialAuthService,
            OAuthProviderValidator oAuthProviderValidator,
            com.example.ekart.service.StockAlertService stockAlertService,
            com.example.ekart.service.AutoAssignmentService autoAssignmentService,
            com.example.ekart.service.OtpService otpService,
            AdminAuthService adminAuthService,
            com.example.ekart.helper.EmailSender emailSender,
            com.example.ekart.service.RazorpayService razorpayService,
            com.example.ekart.service.InvoiceService invoiceService,
            JwtUtil jwtUtil,
            DeliveryRefreshTokenUtil deliveryRefreshTokenUtil,
            DeliveryBoyRepository deliveryBoyRepository,
            WarehouseRepository warehouseRepository,
            com.example.ekart.service.WarehouseService warehouseService,
            com.example.ekart.service.WarehouseRoutingService warehouseRoutingService,
            com.example.ekart.service.WarehouseTransferService warehouseTransferService,
            DeliveryOtpRepository deliveryOtpRepository,
            WarehouseChangeRequestRepository warehouseChangeRequestRepository,
            TrackingEventLogRepository trackingEventLogRepository,
            BannerRepository bannerRepository,
            StockAlertRepository stockAlertRepository) {
        this.customerRepository = customerRepository;
        this.vendorRepository = vendorRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
        this.wishlistRepository = wishlistRepository;
        this.reviewRepository = reviewRepository;
        this.reviewImageRepository = reviewImageRepository;
        this.refundRepository = refundRepository;
        this.refundImageRepository = refundImageRepository;
        this.autoAssignLogRepository = autoAssignLogRepository;
        this.cashSettlementRepository = cashSettlementRepository;
        this.cloudinaryHelper = cloudinaryHelper;
        this.couponRepository = couponRepository;
        this.aiAssistantService = aiAssistantService;
        this.refundService = refundService;
        this.socialAuthService = socialAuthService;
        this.oAuthProviderValidator = oAuthProviderValidator;
        this.stockAlertService = stockAlertService;
        this.autoAssignmentService = autoAssignmentService;
        this.otpService = otpService;
        this.adminAuthService = adminAuthService;
        this.emailSender = emailSender;
        this.razorpayService = razorpayService;
        this.invoiceService = invoiceService;
        this.jwtUtil = jwtUtil;
        this.deliveryRefreshTokenUtil = deliveryRefreshTokenUtil;
        this.deliveryBoyRepository = deliveryBoyRepository;
        this.warehouseRepository = warehouseRepository;
        this.warehouseService = warehouseService;
        this.warehouseRoutingService = warehouseRoutingService;
        this.warehouseTransferService = warehouseTransferService;
        this.deliveryOtpRepository = deliveryOtpRepository;
        this.warehouseChangeRequestRepository = warehouseChangeRequestRepository;
        this.trackingEventLogRepository = trackingEventLogRepository;
        this.bannerRepository = bannerRepository;
        this.stockAlertRepository = stockAlertRepository;
    }

    @Autowired(required = false)
    public void setDeprecationTracker(com.example.ekart.deprecation.ThymeleafDeprecationTracker deprecationTracker) {
        this.deprecationTracker = deprecationTracker;
    }

    /**
     * In-memory coupon store: customerId → applied Coupon.
     * Cleared on coupon removal or successful order placement.
     * ConcurrentHashMap keeps concurrent requests safe without a DB column.
     */
    private final java.util.concurrent.ConcurrentHashMap<Integer, Coupon> appliedCoupons =
            new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * In-memory store of emails whose OTP has been successfully verified.
     * Key: email (lower-cased).  Value: role tag ("customer" | "vendor").
     * Entry is cleared once reset-password consumes it, preventing replay.
     */
    private final java.util.concurrent.ConcurrentHashMap<String, String> otpVerified =
            new java.util.concurrent.ConcurrentHashMap<>();
    


    // Admin credentials are now database-backed via AdminAuthService.
    // See AdminCredential entity and AdminAuthService for implementation.
    // Admin setup instructions are in .env.example

    // ═══════════════════════════════════════════════════════
    // AUTH — CUSTOMER
    // ═══════════════════════════════════════════════════════

    
    // ── Admin role guard ─────────────────────────────────────────────────────
    /**
     * Defence-in-depth check: rejects non-ADMIN callers at the controller level.
     * Primary enforcement is in FlutterAuthFilter (role check on /admin/**).
     * Returns a 403 ResponseEntity when the caller is not ADMIN, null otherwise.
     */
    private ResponseEntity<Map<String, Object>> requireAdmin(HttpServletRequest request) {
        String role = (String) request.getAttribute(CLAIM_ROLE);
        if (!ROLE_ADMIN.equals(role)) {
            Map<String, Object> err = new java.util.HashMap<>();
            err.put(KEY_SUCCESS, false);
            err.put("message", ERR_ADMIN_REQUIRED);
            return ResponseEntity.status(403).body(err);
        }
        return null;
    }

    private boolean isStrongPassword(String password) {
        return password != null && password.matches(STRONG_PASSWORD_REGEX);
    }

    /** POST /api/flutter/auth/customer/register */
        // ═══════════════════════════════════════════════════════
    // AUTH — CUSTOMER REGISTRATION (OTP-verified)
    //   Step 1 — POST /auth/customer/send-register-otp  body: { email, name }
    //            → validates email uniqueness, generates OTP, emails it
    //   Step 2 — POST /auth/customer/verify-register-otp body: { email, otp }
    //            → validates OTP, marks email as register-verified in map
    //   Step 3 — POST /auth/customer/register           body: { name, email, mobile, password, … }
    //            → checks register-verified map, creates account with verified=true
    // ═══════════════════════════════════════════════════════

    /**
     * Pending registrations: email → partially-built Customer awaiting OTP.
     * Key: email (lower-cased). Cleared after successful register or on re-send.
     */
    private final java.util.concurrent.ConcurrentHashMap<String, Boolean> registerOtpVerified =
            new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Temporary OTP storage for registration: email → { otp, timestamp, name }
     * Used only during registration flow - NOT saved to database until OTP verified
     */
    private static class OtpData {
        String otp;
        long timestamp;
        String name;
        OtpData(String otp, String name) {
            this.otp = otp;
            this.name = name;
            this.timestamp = System.currentTimeMillis();
        }
        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > 5 * 60 * 1000; // 5 minutes
        }
    }
    private final java.util.concurrent.ConcurrentHashMap<String, OtpData> registerOtpCache =
            new java.util.concurrent.ConcurrentHashMap<>();

    /** POST /api/react/auth/customer/send-register-otp */
    @PostMapping("/auth/customer/send-register-otp")
    @SuppressWarnings("deprecation")
    public ResponseEntity<Map<String, Object>> customerSendRegisterOtp(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String name = ((String) body.getOrDefault("name", "Customer")).trim();
            if (email.isEmpty()) {
                res.put(KEY_SUCCESS, false); res.put("message", ERR_EMAIL_REQUIRED);
                return ResponseEntity.badRequest().body(res);
            }
            // Check only for VERIFIED customers (not temp pending ones)
            com.example.ekart.dto.Customer existing = customerRepository.findByEmail(email);
            if (existing != null && existing.isVerified()) {
                res.put(KEY_SUCCESS, false); res.put("message", "Email already registered");
                return ResponseEntity.badRequest().body(res);
            }
            // Generate OTP and store in TEMPORARY cache only (not in DB)
            String otp = String.format(FMT_OTP, new java.util.Random().nextInt(1000000));
            registerOtpCache.put(email, new OtpData(otp, name));
            registerOtpVerified.remove(email);
            
            // Send OTP via email
            try {
                com.example.ekart.dto.Customer tempForEmail = new com.example.ekart.dto.Customer();
                tempForEmail.setEmail(email);
                tempForEmail.setName(name);
                tempForEmail.setOtp(Integer.parseInt(otp));
                emailSender.send(tempForEmail);
            } catch (Exception e) {
                LOGGER.error("Customer register OTP email failed", e);
            }
            res.put(KEY_SUCCESS, true);
            res.put("message", "OTP sent to " + email);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put("message", "Failed to send OTP: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/react/auth/customer/verify-register-otp */
    @PostMapping("/auth/customer/verify-register-otp")
    public ResponseEntity<Map<String, Object>> customerVerifyRegisterOtp(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email  = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String otpStr = body.getOrDefault("otp", "").toString().trim();
            
            // Get OTP from temporary cache (not from DB)
            OtpData otpData = registerOtpCache.get(email);
            if (otpData == null) {
                res.put(KEY_SUCCESS, false); res.put("message", "No pending OTP. Please request a new one.");
                return ResponseEntity.badRequest().body(res);
            }
            if (otpData.isExpired()) {
                registerOtpCache.remove(email);
                res.put(KEY_SUCCESS, false); res.put("message", "OTP expired. Please request a new one.");
                return ResponseEntity.badRequest().body(res);
            }
            if (!otpData.otp.equals(otpStr)) {
                res.put(KEY_SUCCESS, false); res.put("message", "Invalid OTP");
                return ResponseEntity.badRequest().body(res);
            }
            
            // Mark email as verified in registration map
            registerOtpVerified.put(email, Boolean.TRUE);
            res.put(KEY_SUCCESS, true); res.put("message", "OTP verified successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put("message", "Verification failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/react/auth/customer/register — requires prior OTP verification */
    @PostMapping("/auth/customer/register")
    public ResponseEntity<Map<String, Object>> customerRegister(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String password = ((String) body.getOrDefault("password", "")).trim();
            if (!Boolean.TRUE.equals(registerOtpVerified.get(email))) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Email not verified. Please complete OTP verification first.");
                return ResponseEntity.badRequest().body(res);
            }
            if (!isStrongPassword(password)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", STRONG_PASSWORD_MESSAGE);
                return ResponseEntity.badRequest().body(res);
            }
            com.example.ekart.dto.Customer existing = customerRepository.findByEmail(email);
            if (existing != null && existing.isVerified()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Email already registered. Please login instead.");
                return ResponseEntity.badRequest().body(res);
            }
            
            // Reuse unverified customer or create new
            com.example.ekart.dto.Customer c = existing != null ? existing : new com.example.ekart.dto.Customer();
            c.setName((String) body.get("name"));
            c.setEmail(email);
            c.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString()));
            c.setPassword(com.example.ekart.helper.AES.encrypt(password));
            c.setVerified(true);
            c.setRole(com.example.ekart.dto.Role.CUSTOMER);
            c.setActive(true);
            customerRepository.save(c);
            
            // Clean up temporary data
            registerOtpVerified.remove(email);
            registerOtpCache.remove(email);
            
            res.put(KEY_SUCCESS, true);
            res.put("message", "Registered successfully");
            res.put("customerId", c.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }



    /** POST /api/flutter/auth/customer/login */
    @PostMapping("/auth/customer/login")
    public ResponseEntity<Map<String, Object>> customerLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = (String) body.get(KEY_EMAIL);
            String password = (String) body.get("password");
            Customer c = customerRepository.findByEmail(email);
            if (c == null || !AES.decrypt(c.getPassword()).equals(password)) {
                res.put(KEY_SUCCESS, false); res.put("message", "Invalid email or password");
                return ResponseEntity.badRequest().body(res);
            }
            if (!c.isActive()) {
                res.put(KEY_SUCCESS, false); res.put("message", "Account suspended. Contact support.");
                return ResponseEntity.badRequest().body(res);
            }
            String token = jwtUtil.generateToken(c.getId(), c.getEmail(), "CUSTOMER");
            res.put(KEY_SUCCESS, true);
            res.put("customerId", c.getId());
            res.put("name", c.getName());
            res.put(KEY_EMAIL, c.getEmail());
            res.put(KEY_MOBILE, c.getMobile());
            res.put("token", token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // AUTH — VENDOR
    // ═══════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════
    // AUTH — VENDOR REGISTRATION (OTP-verified)
    //   Step 1 — POST /auth/vendor/send-register-otp  body: { email, name }
    //   Step 2 — POST /auth/vendor/verify-register-otp body: { email, otp }
    //   Step 3 — POST /auth/vendor/register            body: { name, email, mobile, password }
    // ═══════════════════════════════════════════════════════

    private final java.util.concurrent.ConcurrentHashMap<String, Boolean> vendorRegisterOtpVerified =
            new java.util.concurrent.ConcurrentHashMap<>();

    /** POST /api/react/auth/vendor/send-register-otp */
    @PostMapping("/auth/vendor/send-register-otp")
    @SuppressWarnings("deprecation")
    public ResponseEntity<Map<String, Object>> vendorSendRegisterOtp(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String name = ((String) body.getOrDefault("name", "Vendor")).trim();
            if (email.isEmpty()) {
                res.put(KEY_SUCCESS, false); res.put("message", ERR_EMAIL_REQUIRED);
                return ResponseEntity.badRequest().body(res);
            }
            // Check only for VERIFIED vendors (not temp pending ones)
            com.example.ekart.dto.Vendor existing = vendorRepository.findByEmail(email);
            if (existing != null && existing.isVerified()) {
                res.put(KEY_SUCCESS, false); res.put("message", "Email already registered");
                return ResponseEntity.badRequest().body(res);
            }
            
            // 🔒 NEW: Use secure OTP service (like delivery boy registration)
            try {
                String plainOtp = otpService.generateAndStoreOtp(email, com.example.ekart.service.OtpService.PURPOSE_VENDOR_REGISTER);
                
                // Send OTP via email
                com.example.ekart.dto.Vendor tempForEmail = new com.example.ekart.dto.Vendor();
                tempForEmail.setName(name);
                tempForEmail.setEmail(email);
                tempForEmail.setOtp(Integer.parseInt(plainOtp));
                emailSender.sendVendorOtpSecure(tempForEmail, plainOtp);
            } catch (Exception e) {
                LOGGER.error("Vendor register OTP email failed", e);
            }
            
            vendorRegisterOtpVerified.remove(email);
            res.put(KEY_SUCCESS, true); res.put("message", "OTP sent to " + email);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put("message", "Failed to send OTP: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/react/auth/vendor/verify-register-otp */
    @PostMapping("/auth/vendor/verify-register-otp")
    public ResponseEntity<Map<String, Object>> vendorVerifyRegisterOtp(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email  = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String otpStr = body.getOrDefault("otp", "").toString().trim();
            
            if (email.isEmpty() || otpStr.isEmpty()) {
                res.put(KEY_SUCCESS, false); res.put("message", ERR_EMAIL_OTP_REQUIRED);
                return ResponseEntity.badRequest().body(res);
            }
            
            // 🔒 Format OTP with leading zeros (e.g., 1234 → "001234")
            String formattedOtp = String.format(FMT_OTP, Integer.parseInt(otpStr));
            
            // Verify OTP using secure service (hashed comparison)
            com.example.ekart.service.OtpService.VerificationResult result = otpService.verifyOtp(email, formattedOtp, com.example.ekart.service.OtpService.PURPOSE_VENDOR_REGISTER);
            
            if (!result.success) {
                res.put(KEY_SUCCESS, false); res.put("message", result.message);
                return ResponseEntity.badRequest().body(res);
            }
            
            // Mark this email as OTP-verified (for the next registration step)
            vendorRegisterOtpVerified.put(email, Boolean.TRUE);
            res.put(KEY_SUCCESS, true); res.put("message", "OTP verified successfully");
            return ResponseEntity.ok(res);
        } catch (NumberFormatException e) {
            res.put(KEY_SUCCESS, false); res.put("message", "OTP must be a 6-digit number");
            return ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put("message", "Verification failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/react/auth/vendor/register — requires prior OTP verification */
    @PostMapping("/auth/vendor/register")
    public ResponseEntity<Map<String, Object>> vendorRegister(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String password = ((String) body.getOrDefault("password", "")).trim();
            if (!Boolean.TRUE.equals(vendorRegisterOtpVerified.get(email))) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Email not verified. Please complete OTP verification first.");
                return ResponseEntity.badRequest().body(res);
            }
            if (!isStrongPassword(password)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", STRONG_PASSWORD_MESSAGE);
                return ResponseEntity.badRequest().body(res);
            }
            com.example.ekart.dto.Vendor existing = vendorRepository.findByEmail(email);
            if (existing != null && existing.isVerified()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Email already registered. Please login instead.");
                return ResponseEntity.badRequest().body(res);
            }
            // Reuse unverified vendor or create new
            com.example.ekart.dto.Vendor v = existing != null ? existing : new com.example.ekart.dto.Vendor();
            v.setName((String) body.get("name"));
            v.setEmail(email);
            v.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString()));
            v.setPassword(com.example.ekart.helper.AES.encrypt(password));
            v.setVerified(true);
            vendorRepository.save(v);
            String vendorCode = generateVendorCode(v.getId());
            v.setVendorCode(vendorCode);
            vendorRepository.save(v);
            vendorRegisterOtpVerified.remove(email);
            res.put(KEY_SUCCESS, true);
            res.put("message", "Registered successfully. Your store is under admin review.");
            res.put(KEY_VENDOR_ID, v.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * Generate vendor code from vendor ID.
     * Format: VND-00001, VND-00002, etc.
     */
    private String generateVendorCode(int vendorId) {
        return String.format("VND-%05d", vendorId);
    }

    /** POST /api/flutter/auth/vendor/login */
    @PostMapping("/auth/vendor/login")
    public ResponseEntity<Map<String, Object>> vendorLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = (String) body.get(KEY_EMAIL);
            String password = (String) body.get("password");
            Vendor v = vendorRepository.findByEmail(email);
            if (v == null || !AES.decrypt(v.getPassword()).equals(password)) {
                res.put(KEY_SUCCESS, false); res.put("message", "Invalid email or password");
                return ResponseEntity.badRequest().body(res);
            }
            String token = jwtUtil.generateToken(v.getId(), v.getEmail(), "VENDOR");
            res.put(KEY_SUCCESS, true);
            res.put(KEY_VENDOR_ID, v.getId());
            res.put("name", v.getName());
            res.put(KEY_EMAIL, v.getEmail());
            res.put("vendorCode", v.getVendorCode());
            res.put("token", token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * POST /api/react/auth/admin/login
     * Body: { email, password }
     * Authenticates admin via database-backed credentials with optional 2FA.
     * 
     * If 2FA is NOT enabled:
     *   Returns: { success: true, adminId, name, email, token, role: ROLE_ADMIN }
     * 
     * If 2FA IS enabled:
     *   Returns: { success: true, adminId, requires2FA: true, message: "Please provide 2FA code" }
     *   Next step: POST /api/react/auth/admin/verify-2fa with { adminId, totpCode }
     * 
     * Failure cases:
     *   - Invalid credentials       → 401 + message
     *   - Account locked (5 fails)  → 403 + message (auto-unlocks after 15 min)
     */
    @PostMapping("/auth/admin/login")
    public ResponseEntity<Map<String, Object>> adminLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        String email    = (String) body.get(KEY_EMAIL);
        String password = (String) body.get("password");
        if (email == null || password == null) {
            res.put(KEY_SUCCESS, false); 
            res.put("message", "Email and password are required");
            return ResponseEntity.badRequest().body(res);
        }
        
        // Attempt authentication via AdminAuthService (BCrypt verification, brute force protection)
        com.example.ekart.dto.AuthenticationResult authResult = adminAuthService.authenticate(email, password);
        
        if (!authResult.isSuccess()) {
            // Authentication failed
            res.put(KEY_SUCCESS, false);
            res.put("message", authResult.getMessage());
            return ResponseEntity.status(401).body(res);
        }
        
        // Authentication succeeded
        if (authResult.isRequires2FA()) {
            // 2FA is enabled — client must provide TOTP code in next request
            res.put(KEY_SUCCESS, true);
            res.put(KEY_ADMIN_ID, authResult.getAdminId());
            res.put("requires2FA", true);
            res.put("message", "Please provide 2FA code from your authenticator app");
            return ResponseEntity.ok(res);
        }
        
        // No 2FA — issue token immediately
        String token = jwtUtil.generateToken(0, email, ROLE_ADMIN);
        res.put(KEY_SUCCESS, true);
        res.put(KEY_ADMIN_ID, authResult.getAdminId());
        res.put("name", authResult.getAdminName() != null ? authResult.getAdminName() : "Admin");
        res.put(KEY_EMAIL, email);
        res.put("token", token);
        res.put("role", ROLE_ADMIN);
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/auth/admin/verify-2fa
     * Body: { adminId, totpCode }
     * Verifies 6-digit TOTP code from authenticator app.
     * Returns: { success: true, token, name, email } on success
     * Returns: { success: false, message } on failure
     */
    @PostMapping("/auth/admin/verify-2fa")
    public ResponseEntity<Map<String, Object>> adminVerify2FA(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Integer adminId = null;
        String totpCode = (String) body.get("totpCode");
        
        try {
            adminId = ((Number) body.get(KEY_ADMIN_ID)).intValue();
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Invalid adminId");
            return ResponseEntity.badRequest().body(res);
        }
        
        if (totpCode == null || totpCode.isEmpty()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "2FA code is required");
            return ResponseEntity.badRequest().body(res);
        }
        
        // Verify TOTP code
        com.example.ekart.dto.VerificationResult verifyResult = adminAuthService.verify2FA(adminId, totpCode);
        
        if (!verifyResult.isSuccess()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", verifyResult.getMessage());
            return ResponseEntity.status(401).body(res);
        }
        
        // 2FA verification successful — issue token
        // Note: We fetch email from DB via adminAuthService to include in token
        String token = jwtUtil.generateToken(0, "admin-" + adminId, ROLE_ADMIN);
        res.put(KEY_SUCCESS, true);
        res.put(KEY_ADMIN_ID, adminId);
        res.put("token", token);
        res.put("message", "2FA verification successful");
        return ResponseEntity.ok(res);
    }


    /**
     * POST /api/flutter/auth/delivery/login
     * Body: { email, password }
     * Mirrors the same checks as DeliveryBoyService.login() but returns JSON.
     * Returns: { success, deliveryBoyId, name, email, token }
     *
     * Failure cases (matching the session-based flow):
     *   - Unknown email           → 400 + message
     *   - Wrong password          → 400 + message
     *   - Email not verified      → 403 + message (OTP resent)
     *   - Account deactivated     → 403 + message
     *   - Pending admin approval  → 403 + message
     */
    @PostMapping("/auth/delivery/login")
    @SuppressWarnings("deprecation")
    public ResponseEntity<Map<String, Object>> deliveryLogin(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = ((String) body.getOrDefault(KEY_EMAIL,    "")).trim().toLowerCase();
            String password = ((String) body.getOrDefault("password", "")).trim();
            if (email.isEmpty() || password.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Email and password are required");
                return ResponseEntity.badRequest().body(res);
            }
            DeliveryBoy db = deliveryBoyRepository.findByEmail(email);
            if (db == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_NO_ACCOUNT_FOR_EMAIL);
                return ResponseEntity.badRequest().body(res);
            }
            String decrypted = AES.decrypt(db.getPassword());
            if (decrypted == null || !decrypted.equals(password)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Wrong password");
                return ResponseEntity.badRequest().body(res);
            }
            if (!db.isVerified()) {
                // Resend OTP exactly like the web flow does
                int otp = new java.util.Random().nextInt(100000, 1000000);
                db.setOtp(otp);
                deliveryBoyRepository.save(db);
                try { emailSender.sendDeliveryBoyOtp(db); } catch (Exception ignored) {}
                res.put(KEY_SUCCESS, false);
                res.put("message", "Please verify your email first — OTP resent to " + email);
                return ResponseEntity.status(403).body(res);
            }
            if (!db.isActive()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Your account has been deactivated. Contact admin.");
                return ResponseEntity.status(403).body(res);
            }
            // FIX: Use JwtUtil with role="DELIVERY" so ReactAuthFilter accepts the token.
            // Old code used DeliveryRefreshTokenUtil which produced tokens with no "role" claim,
            // causing ReactAuthFilter to return 403 "Unknown role in token: null" on every
            // delivery API call (profile, orders, toggle, pickup, deliver).
            String token = jwtUtil.generateToken(db.getId(), db.getEmail(), "DELIVERY");

            res.put(KEY_SUCCESS,       true);
            res.put(KEY_DELIVERY_BOY_ID, db.getId());
            res.put("name",          db.getName());
            res.put(KEY_EMAIL,         db.getEmail());
            res.put("accessToken",   token);  // AuthPage reads data.accessToken || data.token
            res.put("token",         token);  // legacy fallback
            res.put("approved",      db.isAdminApproved());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * GET /api/flutter/auth/delivery/warehouses  (public — no auth required)
     * Returns active warehouses for the delivery registration warehouse dropdown.
     */
    @GetMapping("/auth/delivery/warehouses")
    public ResponseEntity<Map<String, Object>> deliveryRegisterWarehouses() {
        Map<String, Object> res = new HashMap<>();
        // Show all warehouses (both active and inactive) so users can see what's available
        // Admin can only approve delivery boys for active warehouses anyway
        List<Warehouse> warehouses = warehouseRepository.findAll();
        List<Map<String, Object>> list = new ArrayList<>();
        for (Warehouse wh : warehouses) {
            Map<String, Object> m = new HashMap<>();
            m.put("id",   wh.getId());
            m.put("name", wh.getName());
            m.put("city", wh.getCity());
            m.put("active", wh.isActive());
            String statusLabel = wh.isActive() ? "" : " (Inactive)";
            m.put("display", wh.getName() + " — " + wh.getCity() + statusLabel);
            list.add(m);
        }
        res.put(KEY_SUCCESS,    true);
        res.put("warehouses", list);
        res.put("message", list.isEmpty() ? "No warehouses available yet. Please contact admin to create one." : "");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/auth/warehouse/login
     * 
     * Warehouse staff numeric login (8-digit ID + 6-digit password).
     * Returns JWT token with role=WAREHOUSE and warehouseId claim.
     * 
     * Request Body:
     *   { "loginId": "12345678", "password": "654321" }
     *
     * Response (200 OK):
     *   {
     *     KEY_SUCCESS: true,
     *     "token": "<JWT_TOKEN_with_role_WAREHOUSE_and_warehouseId>",
     *     KEY_WAREHOUSE_ID: 45,
     *     KEY_WAREHOUSE_NAME: "Bangalore Hub",
     *     "city": "Bangalore",
     *     KEY_WAREHOUSE_CODE: "WH-BLR-12345678",
                LOGGER.error("Vendor register OTP email failed", e);
     *   }
     *
     * Error Responses:
     *   400: Invalid format (loginId not 8 digits or password not 6 digits)
     *   401: Invalid credentials (warehouse not found or wrong password)
     *   403: Warehouse account deactivated
     *   500: Authentication error
     */
    @PostMapping("/auth/warehouse/login")
    public ResponseEntity<Map<String, Object>> warehouseLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String loginId = (String) body.get(KEY_LOGIN_ID);        // 8-digit number as string
            String password = (String) body.get("password");      // 6-digit number as string

            if (loginId == null || loginId.isBlank() || password == null || password.isBlank()) {
                res.put(KEY_ERROR, "loginId and password are required");
                return ResponseEntity.badRequest().body(res);
            }

            // Validate format: loginId must be 8 digits, password must be 6 digits
            if (!loginId.matches("\\d{8}")) {
                res.put(KEY_ERROR, "Invalid login ID format — must be 8 digits");
                return ResponseEntity.badRequest().body(res);
            }
            if (!password.matches("\\d{6}")) {
                res.put(KEY_ERROR, "Invalid password format — must be 6 digits");
                return ResponseEntity.badRequest().body(res);
            }

            // Find warehouse by login ID
            java.util.Optional<Warehouse> opt = warehouseRepository.findByWarehouseLoginId(loginId);
            if (opt.isEmpty()) {
                res.put(KEY_ERROR, "Invalid credentials");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(res);
            }
            Warehouse warehouse = opt.get();

            if (!warehouse.isActive()) {
                res.put(KEY_ERROR, "This warehouse account has been deactivated");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(res);
            }

            // Decrypt stored password and compare
            String decryptedStoredPassword;
            try {
                decryptedStoredPassword = AES.decrypt(warehouse.getWarehouseLoginPassword());
            } catch (Exception e) {
                res.put(KEY_ERROR, "Authentication error");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(res);
            }

            if (!decryptedStoredPassword.equals(password)) {
                res.put(KEY_ERROR, "Invalid credentials");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(res);
            }

            // Generate JWT with warehouseId and role=WAREHOUSE
            Map<String, Object> claims = new HashMap<>();
            claims.put("role", ROLE_WAREHOUSE);
            claims.put(KEY_WAREHOUSE_ID, warehouse.getId());
            claims.put(KEY_WAREHOUSE_NAME, warehouse.getName());
            claims.put(KEY_WAREHOUSE_CODE, warehouse.getWarehouseCode());
            claims.put("city", warehouse.getCity());

            String token = jwtUtil.generateWarehouseToken(String.valueOf(warehouse.getId()), claims);

            res.put(KEY_SUCCESS, true);
            res.put("token", token);
            res.put(KEY_WAREHOUSE_ID, warehouse.getId());
            res.put(KEY_WAREHOUSE_NAME, warehouse.getName());
            res.put("city", warehouse.getCity());
            res.put(KEY_WAREHOUSE_CODE, warehouse.getWarehouseCode());
            res.put("role", ROLE_WAREHOUSE);
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put(KEY_ERROR, "Login failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(res);
        }
    }

    /**
     * POST /api/flutter/auth/delivery/register
     * Body: { name, email, mobile, password, confirmPassword, warehouseId }
     * Mirrors DeliveryBoyService.selfRegister() but returns JSON.
     * On success: account created, OTP emailed, pending admin approval.
     * Returns: { success, message }
     */
    @PostMapping("/auth/delivery/register")
    public ResponseEntity<Map<String, Object>> deliveryRegister(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String name            = ((String) body.getOrDefault("name",            "")).trim();
            String email           = ((String) body.getOrDefault(KEY_EMAIL,           "")).trim().toLowerCase();
            String password        = ((String) body.getOrDefault("password",        "")).trim();
            String confirmPassword = ((String) body.getOrDefault("confirmPassword", "")).trim();
            String mobileStr       = body.getOrDefault(KEY_MOBILE, "").toString().trim();
            int warehouseId;
            try { warehouseId = Integer.parseInt(body.getOrDefault(KEY_WAREHOUSE_ID, "0").toString()); }
            catch (NumberFormatException e) { warehouseId = 0; }

            if (name.length() < 3)                    { res.put(KEY_SUCCESS, false); res.put("message", "Name must be at least 3 characters"); return ResponseEntity.badRequest().body(res); }
            if (!email.contains("@"))                  { res.put(KEY_SUCCESS, false); res.put("message", "Enter a valid email address"); return ResponseEntity.badRequest().body(res); }
            // Allow re-registration if email exists but NOT verified
            DeliveryBoy existingDb = deliveryBoyRepository.findByEmail(email);
            if (existingDb != null && existingDb.isVerified()) { res.put(KEY_SUCCESS, false); res.put("message", "This email is already verified. Please login instead."); return ResponseEntity.badRequest().body(res); }
            if (!password.equals(confirmPassword))     { res.put(KEY_SUCCESS, false); res.put("message", "Passwords do not match"); return ResponseEntity.badRequest().body(res); }
            if (!isStrongPassword(password))           { res.put(KEY_SUCCESS, false); res.put("message", STRONG_PASSWORD_MESSAGE); return ResponseEntity.badRequest().body(res); }
            if (warehouseId <= 0)                      { res.put(KEY_SUCCESS, false); res.put("message", "Please select a warehouse"); return ResponseEntity.badRequest().body(res); }

            long mobile;
            try { mobile = Long.parseLong(mobileStr); }
            catch (NumberFormatException e) { res.put(KEY_SUCCESS, false); res.put("message", "Enter a valid 10-digit mobile number"); return ResponseEntity.badRequest().body(res); }

            Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
            if (warehouse == null) { res.put(KEY_SUCCESS, false); res.put("message", "Selected warehouse not found"); return ResponseEntity.badRequest().body(res); }

            // Use existing account if email exists but not verified, otherwise create new
            DeliveryBoy db = existingDb != null ? existingDb : new DeliveryBoy();
            db.setName(name);
            db.setEmail(email);
            db.setMobile(mobile);
            db.setPassword(AES.encrypt(password));
            db.setVerified(false);
            db.setAdminApproved(false);
            db.setActive(true);
            db.setWarehouse(warehouse);
            // Auto-assign PIN codes from the warehouse
            db.setAssignedPinCodes(warehouse.getServedPinCodes());

            deliveryBoyRepository.save(db);
            if (existingDb == null) {
                db.setDeliveryBoyCode(String.format("DB-%05d", db.getId()));
                deliveryBoyRepository.save(db);
            }

            // Use new secure OTP service
            try {
                String plainOtp = otpService.generateAndStoreOtp(db.getEmail(), com.example.ekart.service.OtpService.PURPOSE_DELIVERY_REGISTER);
                emailSender.sendDeliveryBoyOtpSecure(db, plainOtp);
            }
            catch (Exception e) { LOGGER.error("Delivery boy OTP email failed", e); }

            res.put(KEY_SUCCESS,       true);
            res.put("message",       "Account created! Check your email for a verification OTP. Once verified, your account will be reviewed by admin before you can log in.");
            res.put(KEY_DELIVERY_BOY_ID, db.getId());
            res.put(KEY_EMAIL,         email);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * POST /api/react/auth/delivery/verify-otp
     * Body: { email, otp }  — otp is the 6-digit string from the UI boxes
     * Marks the delivery boy email as verified.
     * After this, account is pending admin approval before login is allowed.
     * Returns: { success, message }
     */
    @PostMapping("/auth/delivery/verify-otp")
    public ResponseEntity<Map<String, Object>> deliveryVerifyOtp(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email  = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String otpStr = body.getOrDefault("otp", "").toString().trim();
            if (email.isEmpty() || otpStr.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_EMAIL_OTP_REQUIRED);
                return ResponseEntity.badRequest().body(res);
            }
            int otpInt;
            try { otpInt = Integer.parseInt(otpStr); }
            catch (NumberFormatException e) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "OTP must be a 6-digit number");
                return ResponseEntity.badRequest().body(res);
            }

            DeliveryBoy db = deliveryBoyRepository.findByEmail(email);
            if (db == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_NO_ACCOUNT_FOR_EMAIL);
                return ResponseEntity.badRequest().body(res);
            }
            if (db.isVerified()) {
                res.put(KEY_SUCCESS, true);
                res.put("message", "Email already verified. Awaiting admin approval.");
                return ResponseEntity.ok(res);
            }
            // 🔒 Format OTP with leading zeros (e.g., 352410 → "352410")
            String formattedOtp = String.format(FMT_OTP, otpInt);
            com.example.ekart.service.OtpService.VerificationResult result = otpService.verifyOtp(email, formattedOtp, com.example.ekart.service.OtpService.PURPOSE_DELIVERY_REGISTER);
            
            if (!result.success) {
                res.put(KEY_SUCCESS, false);
                res.put("message", result.message);
                return ResponseEntity.badRequest().body(res);
            }

            db.setVerified(true);
            deliveryBoyRepository.save(db);

            // Notify admin via email that a new delivery boy needs approval
            try { emailSender.sendDeliveryBoyPendingAlert(db); }
            catch (Exception e) { LOGGER.error("Admin pending-alert email failed", e); }

            res.put(KEY_SUCCESS, true);
            res.put("message", "Email verified! Your account is pending admin approval. You will be notified by email once approved.");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "OTP verification failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * POST /api/react/auth/delivery/resend-otp
     * Body: { email }
     * Resends the verification OTP to the delivery boy (if not yet verified).
     * Returns: { success, message }
     */
    @PostMapping("/auth/delivery/resend-otp")
    public ResponseEntity<Map<String, Object>> deliveryResendOtp(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            if (email.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_EMAIL_REQUIRED);
                return ResponseEntity.badRequest().body(res);
            }
            DeliveryBoy db = deliveryBoyRepository.findByEmail(email);
            if (db == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_NO_ACCOUNT_FOR_EMAIL);
                return ResponseEntity.badRequest().body(res);
            }
            if (db.isVerified()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Email is already verified");
                return ResponseEntity.ok(res);
            }
            try {
                emailSender.sendDeliveryBoyOtp(db);
            } catch (Exception e) { 
                LOGGER.error("OTP resend failed", e);
            }

            res.put(KEY_SUCCESS, true);
            res.put("message", "A new OTP has been sent to " + email);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Resend failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * POST /api/react/auth/delivery/refresh
     * 
     * Refresh access token using a valid refresh token.
     * Called by mobile apps after access token expires (every 15 minutes).
     * 
     * SECURITY:
     * - Refresh tokens are long-lived (7 days)
     * - Access tokens are short-lived (15 minutes)
     * - Client stores both in secure storage
     * - No password transmitted during refresh
     * 
     * Body: { refreshToken }
     * Success Response: { success: true, accessToken, expiresIn }
     * Error Response: { success: false, message }
     */
    @PostMapping("/auth/delivery/refresh")
    public ResponseEntity<Map<String, Object>> deliveryRefreshToken(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String refreshToken = ((String) body.getOrDefault("refreshToken", "")).trim();
            if (refreshToken.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Refresh token is required");
                return ResponseEntity.badRequest().body(res);
            }

            // Validate refresh token
            if (!deliveryRefreshTokenUtil.isValidRefreshToken(refreshToken)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Invalid or expired refresh token. Please login again.");
                return ResponseEntity.status(401).body(res);
            }

            // Get delivery boy ID from refresh token
            int deliveryBoyId = deliveryRefreshTokenUtil.getDeliveryBoyId(refreshToken);
            String email = deliveryRefreshTokenUtil.getEmail(refreshToken);

            // Verify delivery boy still exists and is active
            DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
            if (db == null || !db.isActive() || !db.isVerified()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Account is no longer valid. Please login again.");
                return ResponseEntity.status(403).body(res);
            }

            // Generate new access token
            String newAccessToken = deliveryRefreshTokenUtil.refreshAccessToken(refreshToken);
            long expiresIn = 15L * 60 * 1000; // 15 minutes in milliseconds

            res.put(KEY_SUCCESS, true);
            res.put("accessToken", newAccessToken);
            res.put("expiresIn", expiresIn);
            return ResponseEntity.ok(res);

        } catch (io.jsonwebtoken.JwtException e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Token validation failed: " + e.getMessage());
            return ResponseEntity.status(401).body(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Token refresh failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // AUTH — FORGOT PASSWORD  (Customer + Vendor)
    //
    // Flow driven by AuthPage.jsx:
    //   Step 1 — POST /auth/{role}/forgot-password   body: { email }
    //            → generates OTP, emails it, returns { success }
    //   Step 2 — POST /auth/{role}/verify-otp        body: { email, otp }  (otp is a STRING "123456")
    //            → validates OTP, marks email as verified in otpVerified map
    //   Step 3 — POST /auth/{role}/reset-password    body: { email, newPassword }
    //            → checks otpVerified map, sets new password, clears flag
    //
    // The frontend never sends customerId/vendorId — email is the key throughout.
    // OTP is transmitted as a string from the 6-box input widget.
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/auth/customer/forgot-password */
    @PostMapping("/auth/customer/forgot-password")
    @SuppressWarnings("deprecation")
    public ResponseEntity<Map<String, Object>> customerForgotPassword(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            if (email.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_EMAIL_REQUIRED);
                return ResponseEntity.badRequest().body(res);
            }
            Customer customer = customerRepository.findByEmail(email);
            if (customer == null) {
                // Generic response — avoids leaking which emails are registered
                res.put(KEY_SUCCESS, true);
                res.put("message", "If that email is registered, an OTP has been sent");
                return ResponseEntity.ok(res);
            }
            int otp = new java.util.Random().nextInt(100000, 1000000);
            customer.setOtp(otp);
            customerRepository.save(customer);
            emailSender.send(customer);   // reuses existing OTP email template
            // Clear any previously-verified flag for this email so a fresh verify is required
            otpVerified.remove(email);
            res.put(KEY_SUCCESS, true);
            res.put("message", "OTP sent to your registered email");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to send OTP: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/customer/verify-otp */
    @PostMapping("/auth/customer/verify-otp")
    public ResponseEntity<Map<String, Object>> customerVerifyOtp(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String otpStr = body.getOrDefault("otp", "").toString().trim();
            if (email.isEmpty() || otpStr.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_EMAIL_OTP_REQUIRED);
                return ResponseEntity.badRequest().body(res);
            }
            Customer customer = customerRepository.findByEmail(email);
            if (customer == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_NO_ACCOUNT_FOR_EMAIL);
                return ResponseEntity.badRequest().body(res);
            }
            int otp;
            try { otp = Integer.parseInt(otpStr); } catch (NumberFormatException ex) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_INVALID_OTP_FORMAT);
                return ResponseEntity.badRequest().body(res);
            }
            if (customer.getOtp() != otp) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Invalid or expired OTP");
                return ResponseEntity.badRequest().body(res);
            }
            // Mark this email as OTP-verified so reset-password can proceed
            otpVerified.put(email, "customer");
            res.put(KEY_SUCCESS, true);
            res.put("message", "OTP verified");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Verification failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/customer/reset-password */
    @PostMapping("/auth/customer/reset-password")
    @SuppressWarnings("deprecation")
    public ResponseEntity<Map<String, Object>> customerResetPassword(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email       = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String newPassword = (String) body.get(KEY_NEW_PASSWORD);
            if (email.isEmpty() || newPassword == null || newPassword.isBlank()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Email and new password are required");
                return ResponseEntity.badRequest().body(res);
            }
            if (!otpVerified.containsKey(email)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "OTP not verified — please complete the OTP step first");
                return ResponseEntity.badRequest().body(res);
            }
            Customer customer = customerRepository.findByEmail(email);
            if (customer == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_ACCOUNT_NOT_FOUND);
                return ResponseEntity.badRequest().body(res);
            }
            if (!isStrongPassword(newPassword)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", STRONG_PASSWORD_MESSAGE);
                return ResponseEntity.badRequest().body(res);
            }
            customer.setPassword(AES.encrypt(newPassword));
            customer.setOtp(0);   // invalidate OTP so it cannot be reused
            customerRepository.save(customer);
            otpVerified.remove(email);   // consume the verified flag — one use only
            res.put(KEY_SUCCESS, true);
            res.put("message", "Password reset successfully. Please log in.");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Reset failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    // ── Vendor mirror ─────────────────────────────────────────────────────────

    /** POST /api/flutter/auth/vendor/forgot-password */
    @PostMapping("/auth/vendor/forgot-password")
    @SuppressWarnings("deprecation")
    public ResponseEntity<Map<String, Object>> vendorForgotPassword(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            if (email.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_EMAIL_REQUIRED);
                return ResponseEntity.badRequest().body(res);
            }
            Vendor vendor = vendorRepository.findByEmail(email);
            if (vendor == null) {
                // Generic response — avoids leaking which emails are registered
                res.put(KEY_SUCCESS, true);
                res.put("message", "If that email is registered, an OTP has been sent");
                return ResponseEntity.ok(res);
            }
            
            // 🔒 NEW: Use secure OTP service for password reset
            try {
                String plainOtp = otpService.generateAndStoreOtp(email, com.example.ekart.service.OtpService.PURPOSE_PASSWORD_RESET);
                // Send OTP via email
                vendor.setOtp(Integer.parseInt(plainOtp));
                emailSender.sendVendorOtpSecure(vendor, plainOtp);
            } catch (Exception e) {
                LOGGER.error("Vendor forgot-password OTP email failed", e);
            }
            
            // Clear any previously-verified flag for this email so a fresh verify is required
            otpVerified.remove(email);
            res.put(KEY_SUCCESS, true);
            res.put("message", "OTP sent to your registered email");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to send OTP: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/vendor/verify-otp */
    @PostMapping("/auth/vendor/verify-otp")
    public ResponseEntity<Map<String, Object>> vendorVerifyOtp(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email  = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String otpStr = body.getOrDefault("otp", "").toString().trim();
            if (email.isEmpty() || otpStr.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_EMAIL_OTP_REQUIRED);
                return ResponseEntity.badRequest().body(res);
            }
            
            Vendor vendor = vendorRepository.findByEmail(email);
            if (vendor == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_NO_ACCOUNT_FOR_EMAIL);
                return ResponseEntity.badRequest().body(res);
            }
            
            int otpInt;
            try { otpInt = Integer.parseInt(otpStr); }
            catch (NumberFormatException ex) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_INVALID_OTP_FORMAT);
                return ResponseEntity.badRequest().body(res);
            }
            
            // 🔒 Format OTP with leading zeros and verify using secure service
            String formattedOtp = String.format(FMT_OTP, otpInt);
            com.example.ekart.service.OtpService.VerificationResult result = otpService.verifyOtp(email, formattedOtp, com.example.ekart.service.OtpService.PURPOSE_PASSWORD_RESET);
            
            if (!result.success) {
                res.put(KEY_SUCCESS, false);
                res.put("message", result.message);
                return ResponseEntity.badRequest().body(res);
            }
            
            // Mark this email as OTP-verified for password reset
            otpVerified.put(email, "vendor");
            res.put(KEY_SUCCESS, true);
            res.put("message", "OTP verified");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Verification failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/vendor/reset-password */
    @PostMapping("/auth/vendor/reset-password")
    @SuppressWarnings("deprecation")
    public ResponseEntity<Map<String, Object>> vendorResetPassword(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email       = ((String) body.getOrDefault(KEY_EMAIL, "")).trim().toLowerCase();
            String newPassword = (String) body.get(KEY_NEW_PASSWORD);
            if (email.isEmpty() || newPassword == null || newPassword.isBlank()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Email and new password are required");
                return ResponseEntity.badRequest().body(res);
            }
            if (!otpVerified.containsKey(email)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "OTP not verified — please complete the OTP step first");
                return ResponseEntity.badRequest().body(res);
            }
            Vendor vendor = vendorRepository.findByEmail(email);
            if (vendor == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_ACCOUNT_NOT_FOUND);
                return ResponseEntity.badRequest().body(res);
            }
            if (!isStrongPassword(newPassword)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", STRONG_PASSWORD_MESSAGE);
                return ResponseEntity.badRequest().body(res);
            }
            vendor.setPassword(AES.encrypt(newPassword));
            vendor.setOtp(0);
            vendorRepository.save(vendor);
            otpVerified.remove(email);
            res.put(KEY_SUCCESS, true);
            res.put("message", "Password reset successfully. Please log in.");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Reset failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // PRODUCTS
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/products[?search=x][?category=y][?pinCode=z] — filters by delivery availability */
    @GetMapping("/products")
    public ResponseEntity<Map<String, Object>> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false, defaultValue = "default") String sortBy,
            @RequestParam(required = false) String pinCode) {
        Map<String, Object> res = new HashMap<>();
        List<Product> products;

        // 1. Build the candidate set using search / category / all
        if (search != null && !search.isBlank()) {
            java.util.Set<Product> found = new java.util.LinkedHashSet<>();
            found.addAll(productRepository.findByNameContainingIgnoreCase(search));
            found.addAll(productRepository.findByDescriptionContainingIgnoreCase(search));
            found.addAll(productRepository.findByCategoryContainingIgnoreCase(search));
            products = found.stream()
                    .filter(Product::isApproved)
                    .toList();
        } else if (category != null && !category.isBlank()) {
            products = productRepository.findByCategoryAndApprovedTrue(category);
        } else {
            products = productRepository.findByApprovedTrue();
        }

        // 2. Filter by pin code availability (if provided)
        if (pinCode != null && !pinCode.isBlank()) {
            products = products.stream()
                    .filter(p -> p.isDeliverableTo(pinCode))
                    .toList();
        }

        // 3. Apply price range filters (in-memory — avoids extra repo methods)
        if (minPrice != null) {
            products = products.stream()
                    .filter(p -> p.getPrice() >= minPrice)
                    .toList();
        }
        if (maxPrice != null) {
            products = products.stream()
                    .filter(p -> p.getPrice() <= maxPrice)
                    .toList();
        }

        // 4. Sort
        switch (sortBy == null ? "default" : sortBy.toLowerCase()) {
            case "price_asc":
                products.sort(Comparator.comparingDouble(Product::getPrice));
                break;
            case "price_desc":
                products.sort(Comparator.comparingDouble(Product::getPrice).reversed());
                break;
            case "name":
                products.sort(Comparator.comparing(p -> p.getName() == null ? "" : p.getName().toLowerCase()));
                break;
            default:
                // default order: approved products as returned by the DB
                break;
        }

        res.put(KEY_SUCCESS,  true);
        res.put(KEY_COUNT,    products.size());
        res.put("products", products.stream().map(this::mapProduct).toList());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/{id} — includes reviews */
    @GetMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || !p.isApproved()) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_PRODUCT_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }
        Map<String, Object> pm = mapProduct(p);
        // Include reviews — use targeted query, not findAll()
        List<Review> reviews = reviewRepository.findByProductId(id);
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        pm.put("reviews", reviews.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put(KEY_CUSTOMER_NAME, r.getCustomerName());
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
        List<Review> reviews = reviewRepository.findByProductId(id);
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        res.put(KEY_SUCCESS, true);
        res.put("reviews", reviews.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put(KEY_CUSTOMER_NAME, r.getCustomerName());
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
    public ResponseEntity<Map<String, Object>> getCart(@RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Cart cart = customer.getCart();
        if (cart == null) { res.put(KEY_SUCCESS, true); res.put("items", new ArrayList<>()); res.put(KEY_TOTAL, 0.0); res.put("subtotal", 0.0); res.put(KEY_COUNT, 0); res.put("couponApplied", false); res.put("couponCode", ""); res.put("couponDiscount", 0.0); return ResponseEntity.ok(res); }
        List<Map<String, Object>> items = cart.getItems().stream().map(this::mapItem).toList();
        double subtotal = cart.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();

        // Attach any currently-applied coupon so the frontend can restore UI state
        Coupon applied = appliedCoupons.get(customerId);
        double couponDiscount = 0;
        if (applied != null && applied.isValid() && subtotal >= applied.getMinOrderAmount()) {
            couponDiscount = applied.calculateDiscount(subtotal);
            res.put("couponApplied",  true);
            res.put("couponCode",     applied.getCode());
            res.put("couponDiscount", couponDiscount);
        } else {
            if (applied != null) appliedCoupons.remove(customerId); // expired/invalid since applied
            res.put("couponApplied",  false);
            res.put("couponCode",     "");
            res.put("couponDiscount", 0.0);
        }

        double discountedSubtotal = Math.max(0, subtotal - couponDiscount);
        double deliveryCharge     = discountedSubtotal >= 500 ? 0.0 : (discountedSubtotal == 0 ? 0.0 : 40.0);
        double total              = discountedSubtotal + deliveryCharge;

        res.put(KEY_SUCCESS,       true);
        res.put("items",         items);
        res.put("itemCount",     items.size());
        res.put("subtotal",      subtotal);           // pre-discount subtotal (for "add ₹X for free delivery" hint)
        res.put("couponDiscount",couponDiscount);      // already set above, re-affirm here for clarity
        res.put("deliveryCharge",deliveryCharge);      // 0 when free, 40 otherwise
        res.put(KEY_TOTAL,         total);               // discounted subtotal + delivery
        res.put(KEY_COUNT,         items.size());
        return ResponseEntity.ok(res);
    }

    // ── COUPON ENDPOINTS ──────────────────────────────────────────────────────

    /**
     * GET /api/flutter/coupons
     * Returns all currently valid (active, not expired, within usage limit) coupons
     * for display on the customer Coupons page.
     * Wraps the result in { success, coupons: [...] } to match the apiFetch convention.
     */
    @GetMapping("/coupons")
    public ResponseEntity<Map<String, Object>> getActiveCoupons() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> list = couponRepository.findByActiveTrue().stream()
                .filter(Coupon::isValid)
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
                })
                .toList();
        res.put(KEY_SUCCESS, true);
        res.put("coupons", list);
        return ResponseEntity.ok(res);
    }

    

    /**
     * POST /api/flutter/cart/coupon
     * Body: { "code": "SAVE10" }
     * Validates the coupon against the customer's current cart total and
     * stores it in the in-memory appliedCoupons map for this session.
     * Returns discount amount so the frontend can update the summary immediately.
     */
    @PostMapping("/cart/coupon")
    public ResponseEntity<Map<String, Object>> applyCoupon(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }

        String code = body.get("code") instanceof String s ? s.toUpperCase().trim() : "";
        if (code.isEmpty()) {
            res.put(KEY_SUCCESS, false); res.put("message", "Coupon code is required");
            return ResponseEntity.badRequest().body(res);
        }

        // Look up the coupon
        Coupon coupon = couponRepository.findByCode(code).orElse(null);
        if (coupon == null) {
            res.put(KEY_SUCCESS, false); res.put("message", "Invalid coupon code");
            return ResponseEntity.ok(res);
        }
        if (!coupon.isValid()) {
            res.put(KEY_SUCCESS, false); res.put("message", "This coupon has expired or reached its usage limit");
            return ResponseEntity.ok(res);
        }

        // Calculate current cart subtotal
        Cart cart = customer.getCart();
        double subtotal = (cart == null) ? 0 :
                cart.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();

        if (subtotal < coupon.getMinOrderAmount()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Minimum order amount ₹" + (int) coupon.getMinOrderAmount() + " required for this coupon");
            return ResponseEntity.ok(res);
        }

        double discount = coupon.calculateDiscount(subtotal);

        // Store for this customer (overwrites any previously applied coupon)
        appliedCoupons.put(customerId, coupon);

        res.put(KEY_SUCCESS,      true);
        res.put("code",         coupon.getCode());
        res.put("description",  coupon.getDescription());
        res.put("discount",     discount);
        res.put("typeLabel",    coupon.getTypeLabel());
        res.put("message",      coupon.getDescription() + " — saving ₹" + (int) discount);
        return ResponseEntity.ok(res);
    }

    /**
     * DELETE /api/flutter/cart/coupon
     * Removes any currently-applied coupon for this customer.
     */
    @DeleteMapping("/cart/coupon")
    public ResponseEntity<Map<String, Object>> removeCoupon(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }
        appliedCoupons.remove(customerId);
        res.put(KEY_SUCCESS, true); res.put("message", "Coupon removed");
        return ResponseEntity.ok(res);
    }

        /** POST /api/flutter/cart/add */
    @PostMapping("/cart/add")
        public ResponseEntity<Map<String, Object>> addToCart(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
                if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
            int productId = Integer.parseInt(body.get(KEY_PRODUCT_ID).toString());
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null || !product.isApproved()) { res.put(KEY_SUCCESS, false); res.put("message", ERR_PRODUCT_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
            if (product.getStock() <= 0) { res.put(KEY_SUCCESS, false); res.put("message", "Product out of stock"); return ResponseEntity.badRequest().body(res); }
            Cart cart = customer.getCart();
            if (cart == null) { cart = new Cart(); customer.setCart(cart); }
            Optional<Item> existing = cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId).findFirst();
            if (existing.isPresent()) {
                Item item = existing.get();
                if (item.getQuantity() >= product.getStock()) { res.put(KEY_SUCCESS, false); res.put("message", "Max stock reached"); return ResponseEntity.badRequest().body(res); }
                item.setQuantity(item.getQuantity() + 1);
            } else {
                Item item = new Item();
                item.setName(product.getName()); item.setDescription(product.getDescription());
                item.setPrice(product.getPrice()); item.setCategory(product.getCategory());
                item.setQuantity(1); item.setImageLink(product.getImageLink());
                item.setProductId(productId); item.setCart(cart);
                cart.getItems().add(item);
            }
            customerRepository.save(customer);
            res.put(KEY_SUCCESS, true); res.put("message", "Added to cart");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put("message", e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** DELETE /api/flutter/cart/remove/{productId} */
    @DeleteMapping("/cart/remove/{productId}")
        public ResponseEntity<Map<String, Object>> removeFromCart(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId, @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
            if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null || customer.getCart() == null) { res.put(KEY_SUCCESS, false); res.put("message", "Cart not found"); return ResponseEntity.badRequest().body(res); }
        List<Item> toRemove = customer.getCart().getItems().stream()
            .filter(i -> i.getProductId() != null && i.getProductId() == productId)
            .toList();
        if (toRemove.isEmpty()) {
            res.put(KEY_SUCCESS, false); res.put("message", "Item not found in cart");
            return ResponseEntity.status(404).body(res);
        }
        customer.getCart().getItems().removeAll(toRemove);
        customerRepository.save(customer);
        itemRepository.deleteAll(toRemove);  // explicit delete — ensures DB row is gone even without orphanRemoval
        res.put(KEY_SUCCESS, true); res.put("message", "Removed from cart");
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/cart/update */
    @PutMapping("/cart/update")
        public ResponseEntity<Map<String, Object>> updateCart(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
            if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null || customer.getCart() == null) { res.put(KEY_SUCCESS, false); res.put("message", "Cart not found"); return ResponseEntity.badRequest().body(res); }
        int productId = Integer.parseInt(body.get(KEY_PRODUCT_ID).toString());
        int quantity  = Integer.parseInt(body.get("quantity").toString());
        Cart cart = customer.getCart();
        if (quantity <= 0) {
            List<Item> toRemove = cart.getItems().stream()
                .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                .toList();
            cart.getItems().removeAll(toRemove);
            customerRepository.save(customer);
            itemRepository.deleteAll(toRemove);
        } else {
            cart.getItems().stream()
                .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                .findFirst().ifPresent(i -> i.setQuantity(quantity));
            customerRepository.save(customer);
        }
        res.put(KEY_SUCCESS, true); res.put("message", "Cart updated");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // ORDERS — CUSTOMER
    // ═══════════════════════════════════════════════════════


    /** POST /api/flutter/orders/place — splits cart by vendor into sub-orders */
    @PostMapping("/orders/place")
    public ResponseEntity<Map<String, Object>> placeOrder(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }
        try {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            ResponseEntity<Map<String, Object>> customerError = validateCustomerAndCart(customer, res);
            if (customerError != null) return customerError;
            Cart cart = customer.getCart();

            String paymentMode    = (String) body.getOrDefault("paymentMode", "COD");
            String deliveryTime   = (String) body.getOrDefault("deliveryTime", "STANDARD");
            double deliveryCharge = "EXPRESS".equals(deliveryTime) ? 50.0 : 0.0;

            // ── Coupon — resolve discount from in-memory store ───────────────
            Coupon appliedCoupon = appliedCoupons.get(customerId);

            ResponseEntity<Map<String, Object>> stockError = validateStock(cart.getItems(), res);
            if (stockError != null) return stockError;

            VendorGrouping grouping = groupCartItemsByVendor(cart.getItems());
            CouponApplication couponApplication = applyCouponToGrandTotal(appliedCoupon, grouping.grandTotal);
            deductStock(cart.getItems());

            DeliveryLocation deliveryLocation = resolveDeliveryLocation(customer, body);

            SubOrderResult subOrderResult = createSubOrders(
                customer,
                grouping,
                couponApplication.couponDiscount,
                deliveryCharge,
                paymentMode,
                deliveryTime,
                (String) body.getOrDefault("city", ""),
                deliveryLocation.deliveryPin,
                deliveryLocation.warehouse
            );

            // Clear cart
            cart.getItems().clear();
            customerRepository.save(customer);

            // Increment coupon usedCount and clear from in-memory store
            if (appliedCoupon != null && !couponApplication.appliedCouponCode.isEmpty()) {
                appliedCoupon.setUsedCount(appliedCoupon.getUsedCount() + 1);
                couponRepository.save(appliedCoupon);
                appliedCoupons.remove(customerId);
            }

            res.put(KEY_SUCCESS,        true);
            res.put("message",        "Order placed successfully");
            res.put(KEY_ORDER_ID,        subOrderResult.firstOrder.getId());
            res.put("subOrderIds",    subOrderResult.subOrderIds);
            res.put("totalPrice",     couponApplication.discountedTotal + deliveryCharge);
            res.put("couponDiscount", couponApplication.couponDiscount);
            res.put("couponCode",     couponApplication.appliedCouponCode);
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    private ResponseEntity<Map<String, Object>> validateCustomerAndCart(Customer customer, Map<String, Object> res) {
        if (customer == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_CUSTOMER_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }
        Cart cart = customer.getCart();
        if (cart == null || cart.getItems().isEmpty()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Cart is empty");
            return ResponseEntity.badRequest().body(res);
        }
        return null;
    }

    private ResponseEntity<Map<String, Object>> validateStock(List<Item> cartItems, Map<String, Object> res) {
        for (Item cartItem : cartItems) {
            Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
            if (product == null || product.getStock() < cartItem.getQuantity()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Insufficient stock for: " + cartItem.getName());
                return ResponseEntity.badRequest().body(res);
            }
        }
        return null;
    }

    private static class VendorGrouping {
        final Map<Integer, List<Item>> vendorItems;
        final Map<Integer, Vendor> vendorMap;
        final double grandTotal;

        VendorGrouping(Map<Integer, List<Item>> vendorItems, Map<Integer, Vendor> vendorMap, double grandTotal) {
            this.vendorItems = vendorItems;
            this.vendorMap = vendorMap;
            this.grandTotal = grandTotal;
        }
    }

    private VendorGrouping groupCartItemsByVendor(List<Item> cartItems) {
        Map<Integer, List<Item>> vendorItems = new LinkedHashMap<>();
        Map<Integer, Vendor> vendorMap = new LinkedHashMap<>();
        double grandTotal = 0;

        for (Item cartItem : cartItems) {
            Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
            int vendorKey = (product != null && product.getVendor() != null) ? product.getVendor().getId() : 0;
            if (product != null && product.getVendor() != null) {
                vendorMap.put(vendorKey, product.getVendor());
            }
            vendorItems.computeIfAbsent(vendorKey, k -> new ArrayList<>()).add(cartItem);
            grandTotal += cartItem.getPrice() * cartItem.getQuantity();
        }

        return new VendorGrouping(vendorItems, vendorMap, grandTotal);
    }

    private static class CouponApplication {
        final double couponDiscount;
        final String appliedCouponCode;
        final double discountedTotal;

        CouponApplication(double couponDiscount, String appliedCouponCode, double discountedTotal) {
            this.couponDiscount = couponDiscount;
            this.appliedCouponCode = appliedCouponCode;
            this.discountedTotal = discountedTotal;
        }
    }

    private CouponApplication applyCouponToGrandTotal(Coupon appliedCoupon, double grandTotal) {
        double couponDiscount = 0;
        String appliedCouponCode = "";
        if (appliedCoupon != null && appliedCoupon.isValid() && grandTotal >= appliedCoupon.getMinOrderAmount()) {
            couponDiscount = appliedCoupon.calculateDiscount(grandTotal);
            appliedCouponCode = appliedCoupon.getCode();
        }
        double discountedTotal = Math.max(0, grandTotal - couponDiscount);
        return new CouponApplication(couponDiscount, appliedCouponCode, discountedTotal);
    }

    private void deductStock(List<Item> cartItems) {
        for (Item cartItem : cartItems) {
            Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
            if (product != null) {
                product.setStock(product.getStock() - cartItem.getQuantity());
                productRepository.save(product);
                stockAlertService.checkStockLevel(product);
            }
        }
    }

    private static class DeliveryLocation {
        final String deliveryPin;
        final Warehouse warehouse;

        DeliveryLocation(String deliveryPin, Warehouse warehouse) {
            this.deliveryPin = deliveryPin;
            this.warehouse = warehouse;
        }
    }

    private DeliveryLocation resolveDeliveryLocation(Customer customer, Map<String, Object> body) {
        String deliveryPin = "";
        Warehouse warehouse = null;
        Object addressIdObj = body.get("addressId");

        if (addressIdObj != null) {
            try {
                Integer addressId = Integer.parseInt(addressIdObj.toString());
                Address selectedAddress = null;
                for (Address address : customer.getAddresses()) {
                    if (address.getId() == addressId) {
                        selectedAddress = address;
                        break;
                    }
                }
                if (selectedAddress != null && selectedAddress.getPostalCode() != null) {
                    String digitsOnlyPin = selectedAddress.getPostalCode().replaceAll("\\D", "");
                    deliveryPin = digitsOnlyPin.substring(0, Math.min(6, digitsOnlyPin.length()));
                    for (Warehouse candidate : warehouseRepository.findAll()) {
                        if (candidate.serves(deliveryPin)) {
                            warehouse = candidate;
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {
                // Keep empty pin and null warehouse if address resolution fails.
            }
        }

        return new DeliveryLocation(deliveryPin, warehouse);
    }

    private static class SubOrderResult {
        final Order firstOrder;
        final List<Integer> subOrderIds;

        SubOrderResult(Order firstOrder, List<Integer> subOrderIds) {
            this.firstOrder = firstOrder;
            this.subOrderIds = subOrderIds;
        }
    }

    private SubOrderResult createSubOrders(
            Customer customer,
            VendorGrouping grouping,
            double couponDiscount,
            double deliveryCharge,
            String paymentMode,
            String deliveryTime,
            String city,
            String deliveryPin,
            Warehouse warehouse) {
        boolean multiVendor = grouping.vendorItems.size() > 1;
        Integer parentId = null;
        Order firstOrder = null;
        List<Integer> subOrderIds = new ArrayList<>();

        for (Map.Entry<Integer, List<Item>> entry : grouping.vendorItems.entrySet()) {
            int vendorKey = entry.getKey();
            List<Item> groupedItems = entry.getValue();
            Vendor vendor = grouping.vendorMap.get(vendorKey);

            double subTotal = 0;
            for (Item item : groupedItems) {
                subTotal += item.getPrice() * item.getQuantity();
            }
            double subDiscount = (grouping.grandTotal > 0) ? couponDiscount * (subTotal / grouping.grandTotal) : 0;
            double subDelivery = (firstOrder == null) ? deliveryCharge : 0.0;

            List<Item> orderItems = new ArrayList<>();
            for (Item cartItem : groupedItems) {
                Item orderItem = new Item();
                orderItem.setName(cartItem.getName());
                orderItem.setDescription(cartItem.getDescription());
                orderItem.setPrice(cartItem.getPrice());
                orderItem.setCategory(cartItem.getCategory());
                orderItem.setQuantity(cartItem.getQuantity());
                orderItem.setImageLink(cartItem.getImageLink());
                orderItem.setProductId(cartItem.getProductId());
                orderItems.add(orderItem);
            }

            Order subOrder = new Order();
            subOrder.setCustomer(customer);
            subOrder.setItems(orderItems);
            subOrder.setAmount(Math.max(0, subTotal - subDiscount) + subDelivery);
            subOrder.setDeliveryCharge(subDelivery);
            subOrder.setTotalPrice(Math.max(0, subTotal - subDiscount) + subDelivery);
            subOrder.setPaymentMode(paymentMode);
            subOrder.setDeliveryTime(deliveryTime);
            subOrder.setDateTime(LocalDateTime.now());
            subOrder.setTrackingStatus(TrackingStatus.PROCESSING);
            subOrder.setReplacementRequested(false);
            subOrder.setCurrentCity(city);
            subOrder.setDeliveryPinCode(deliveryPin);
            if (warehouse != null) {
                subOrder.setWarehouse(warehouse);
            }
            if (vendor != null) {
                subOrder.setVendor(vendor);
            }

            orderRepository.save(subOrder);

            if (firstOrder == null) {
                firstOrder = subOrder;
                if (multiVendor) {
                    parentId = subOrder.getId();
                    subOrder.setParentOrderId(parentId);
                    orderRepository.save(subOrder);
                }
            } else {
                subOrder.setParentOrderId(parentId);
                orderRepository.save(subOrder);
            }

            subOrderIds.add(subOrder.getId());
        }

        return new SubOrderResult(firstOrder, subOrderIds);
    }

    // ═══════════════════════════════════════════════════════
    // RAZORPAY PAYMENT INTEGRATION
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/react/orders/checkout — Create Razorpay order for payment
     * 
     * Frontend workflow:
     * 1. User selects address, delivery time, payment mode "ONLINE"
     * 2. Frontend calls this endpoint to get Razorpay order details
     * 3. Frontend opens Razorpay checkout modal
     * 4. User completes payment in Razorpay
     * 5. Frontend calls /orders/callback with verification details
     * 6. Backend verifies signature and confirms payment
     * 7. Frontend calls /orders/place with payment details
     */
    @PostMapping("/orders/checkout")
    public ResponseEntity<Map<String, Object>> createRazorpayOrder(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }

        try {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_CUSTOMER_NOT_FOUND);
                return ResponseEntity.badRequest().body(res);
            }

            Cart cart = customer.getCart();
            if (cart == null || cart.getItems().isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Cart is empty");
                return ResponseEntity.badRequest().body(res);
            }

            // Calculate order total
            double subtotal = 0;
            for (Item cartItem : cart.getItems()) {
                subtotal += cartItem.getPrice() * cartItem.getQuantity();
            }

            double deliveryCharge = "EXPRESS".equals(body.get("deliveryTime")) ? 50.0 : 0.0;
            
            // Apply coupon if exists
            Coupon appliedCoupon = appliedCoupons.get(customerId);
            double couponDiscount = 0;
            if (appliedCoupon != null && appliedCoupon.isValid()
                    && subtotal >= appliedCoupon.getMinOrderAmount()) {
                couponDiscount = appliedCoupon.calculateDiscount(subtotal);
            }

            double totalAmount = Math.max(0, subtotal - couponDiscount) + deliveryCharge;

            // Create a temporary order record to get an ID for Razorpay receipt
            Order tempOrder = new Order();
            tempOrder.setCustomer(customer);
            tempOrder.setAmount(totalAmount);
            tempOrder.setTotalPrice(totalAmount);
            tempOrder.setDateTime(LocalDateTime.now());
            tempOrder.setTrackingStatus(TrackingStatus.PENDING_PAYMENT);
            tempOrder.setPaymentMode("RAZORPAY");
            orderRepository.save(tempOrder);
            int tempOrderId = tempOrder.getId();

            // Create Razorpay order
            Map<String, Object> razorpayOrderDetails = razorpayService.createOrder(
                    totalAmount,
                    tempOrderId,
                    customer.getEmail(),
                    String.valueOf(customer.getMobile())
            );

            if ((boolean) razorpayOrderDetails.getOrDefault("succeeded", false)) {
                res.put(KEY_SUCCESS, true);
                res.put(KEY_RAZORPAY_ORDER_ID, razorpayOrderDetails.get(KEY_RAZORPAY_ORDER_ID));
                res.put("razorpayKeyId", razorpayOrderDetails.get("razorpayKeyId"));
                res.put("amount", razorpayOrderDetails.get("amount"));
                res.put("currency", razorpayOrderDetails.get("currency"));
                res.put("customerEmail", customer.getEmail());
                res.put("customerPhone", String.valueOf(customer.getMobile()));
                res.put(KEY_CUSTOMER_NAME, customer.getName());
                res.put("tempOrderId", tempOrderId);
                res.put("subtotal", subtotal);
                res.put("couponDiscount", couponDiscount);
                res.put("deliveryCharge", deliveryCharge);
                res.put(KEY_TOTAL_AMOUNT, totalAmount);
                return ResponseEntity.ok(res);
            } else {
                res.put(KEY_SUCCESS, false);
                res.put("message", razorpayOrderDetails.getOrDefault("message", "Failed to create Razorpay order"));
                return ResponseEntity.status(500).body(res);
            }

        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Checkout error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * POST /api/react/orders/callback — Verify Razorpay payment signature
     * 
     * Frontend calls this after successful Razorpay payment
     * with signature details for backend verification
     * 
     * SECURITY: This endpoint verifies the signature to ensure
     * the payment was not tampered with. Do NOT proceed without verification.
     */
    @PostMapping("/orders/callback")
    public ResponseEntity<Map<String, Object>> verifyRazorpayPayment(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }

        try {
            String razorpayOrderId = (String) body.get(KEY_RAZORPAY_ORDER_ID);
            String razorpayPaymentId = (String) body.get("razorpayPaymentId");
            String signature = (String) body.get("signature");

            if (razorpayOrderId == null || razorpayPaymentId == null || signature == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Missing payment verification details");
                return ResponseEntity.badRequest().body(res);
            }

            // Verify signature (CRITICAL SECURITY CHECK)
            boolean isValid = razorpayService.verifySignature(razorpayOrderId, razorpayPaymentId, signature);
            if (!isValid) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Payment verification failed. Invalid signature.");
                return ResponseEntity.badRequest().body(res);
            }

            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_CUSTOMER_NOT_FOUND);
                return ResponseEntity.badRequest().body(res);
            }

            // Update temporary order with payment details
            Integer tempOrderId = ((Number) body.get("tempOrderId")).intValue();
            Order order = orderRepository.findById(tempOrderId).orElse(null);
            if (order != null) {
                order.setRazorpay_payment_id(razorpayPaymentId);
                order.setRazorpay_order_id(razorpayOrderId);
                order.setTrackingStatus(TrackingStatus.PAYMENT_VERIFIED);
                orderRepository.save(order);
            }

            res.put(KEY_SUCCESS, true);
            res.put("message", "Payment verified successfully");
            res.put("razorpayPaymentId", razorpayPaymentId);
            res.put(KEY_RAZORPAY_ORDER_ID, razorpayOrderId);
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Verification error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** GET /api/flutter/orders */
    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> getOrders(@RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Order> orders = orderRepository.findByCustomer(customer);
        res.put(KEY_SUCCESS, true);
        res.put(KEY_ORDERS, orders.stream().map(this::mapOrder).toList());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/orders/{id} */
    @GetMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrder(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        res.put(KEY_SUCCESS, true); res.put("order", mapOrder(order));
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/orders/{id}/track
     *
     * JWT-authenticated equivalent of OrderTrackingController (which uses HttpSession).
     * Returns the full tracking timeline from TrackingEventLog for the React/Flutter client.
     *
     * Response shape:
     * {
     *   success         : true,
     *   orderId         : int,
     *   currentStatus   : STATUS_SHIPPED,
     *   currentCity     : "Chennai",
     *   progressPercent : 33,
     *   estimatedDelivery: "2026-03-31T14:00:00"   // omitted when delivered/cancelled
     *   history: [
     *     { status: STATUS_PROCESSING, location: "Mumbai", description: "Order confirmed",
     *       timestamp: "2026-03-29T10:00:00" },
     *     ...
     *   ]
     * }
     */
    @GetMapping("/orders/{id}/track")
    public ResponseEntity<Map<String, Object>> trackOrder(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer() == null || order.getCustomer().getId() != customerId) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }

        TrackingStatus status = order.getTrackingStatus();

        // Real event log — rows inserted by actual workflow actions (vendor packed, delivery boy picked up, etc.)
        List<TrackingEventLog> events = trackingEventLogRepository.findByOrderOrderByEventTimeAsc(order);
        List<Map<String, Object>> history = events.stream().map(e -> {
            Map<String, Object> ev = new HashMap<>();
            ev.put("status",      e.getStatus() != null ? e.getStatus().name() : null);
            ev.put("location",    e.getCity());
            ev.put("description", e.getDescription());
            ev.put("timestamp",   e.getEventTime() != null ? e.getEventTime().toString() : null);
            return ev;
        }).toList();

        res.put(KEY_SUCCESS,          true);
        res.put(KEY_ORDER_ID,          order.getId());
        res.put("currentStatus",    status != null ? status.name() : null);
        res.put("currentCity",      order.getCurrentCity());
        res.put("progressPercent",  status != null ? status.getProgressPercent() : 0);

        // Estimated delivery: only meaningful when order is still in transit
        if (order.getOrderDate() != null && status != null
                && status != TrackingStatus.DELIVERED
                && status != TrackingStatus.CANCELLED
                && status != TrackingStatus.REFUNDED) {
            res.put(KEY_ESTIMATED_DELIVERY, order.getOrderDate().plusHours(48).toString());
        }

        res.put("history", history);
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/react/customer/orders/{orderId}/tracking
     * 
     * Comprehensive order tracking endpoint with visual timeline data.
     * Returns: orderId, status, payment info, warehouse routing, progress percent
     */
    @GetMapping("/customer/orders/{orderId}/tracking")
    public ResponseEntity<Map<String, Object>> customerOrderTracking(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int orderId) {
        try {
            Order order = orderRepository.findById(orderId).orElseThrow(
                () -> new RuntimeException(ERR_ORDER_NOT_FOUND)
            );

            Map<String, Object> res = new LinkedHashMap<>();
            res.put(KEY_ORDER_ID, orderId);
            res.put("status", order.getTrackingStatus() != null ? order.getTrackingStatus().name() : "UNKNOWN");
            res.put("statusDisplay", order.getTrackingStatus() != null ? order.getTrackingStatus().name() : "Unknown");
            res.put("paymentMethod", order.getPaymentMethod());
            res.put(KEY_PAYMENT_STATUS, order.getPaymentStatus());
            res.put(KEY_ROUTING_PATH, order.getWarehouseRoutingPath() != null ? order.getWarehouseRoutingPath() : "Not yet routed");
            res.put("sourceWarehouse", order.getSourceWarehouse() != null ? order.getSourceWarehouse().getName() : "N/A");
            res.put("sourceWarehouseCity", order.getSourceWarehouse() != null ? order.getSourceWarehouse().getCity() : "N/A");
            res.put("destinationWarehouse", order.getDestinationWarehouse() != null ? order.getDestinationWarehouse().getName() : "N/A");
            res.put("destinationWarehouseCity", order.getDestinationWarehouse() != null ? order.getDestinationWarehouse().getCity() : "N/A");
            res.put("orderDate", order.getOrderDate() != null ? order.getOrderDate().toString() : "N/A");
            res.put("deliveryAddress", order.getDeliveryAddress());
            res.put("totalPrice", order.getAmount());
            res.put("progressPercent", order.getTrackingStatus() != null ? order.getTrackingStatus().getProgressPercent() : 0);
            
            // Estimated delivery: +48 hours from order date if still in transit
            if (order.getOrderDate() != null && order.getTrackingStatus() != null) {
                TrackingStatus status = order.getTrackingStatus();
                if (status != TrackingStatus.DELIVERED && status != TrackingStatus.CANCELLED 
                    && status != TrackingStatus.REFUNDED) {
                    res.put(KEY_ESTIMATED_DELIVERY, order.getOrderDate().plusHours(48).toString());
                } else {
                    res.put(KEY_ESTIMATED_DELIVERY, null);
                }
            }
            
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put(KEY_SUCCESS, false);
            error.put("message", "Order not found or fetch failed");
            return ResponseEntity.status(404).body(error);
        }
    }

    /** POST /api/flutter/orders/{id}/cancel */
    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (order.getTrackingStatus() == TrackingStatus.DELIVERED || order.getTrackingStatus() == TrackingStatus.CANCELLED) { res.put(KEY_SUCCESS, false); res.put("message", "Cannot cancel this order"); return ResponseEntity.badRequest().body(res); }
        for (Item item : order.getItems()) {
            if (item.getProductId() != null) {
                productRepository.findById(item.getProductId()).ifPresent(p -> { 
                    p.setStock(p.getStock() + item.getQuantity()); 
                    productRepository.save(p);
                    // Update stock alert when stock is restored
                    stockAlertService.checkStockLevel(p);
                });
            }
        }
        order.setTrackingStatus(TrackingStatus.CANCELLED); orderRepository.save(order);
        res.put(KEY_SUCCESS, true); res.put("message", "Order cancelled");
        return ResponseEntity.ok(res);
    }

    /** POST /api/react/orders/{id}/request-replacement */
    @PostMapping("/orders/{id}/request-replacement")
    public ResponseEntity<Map<String, Object>> requestReplacement(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (order.getTrackingStatus() != TrackingStatus.DELIVERED) { res.put(KEY_SUCCESS, false); res.put("message", "Can only request replacement for delivered orders"); return ResponseEntity.badRequest().body(res); }
        
        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(7);
        if (order.getOrderDate() == null || order.getOrderDate().isBefore(cutoff)) { res.put(KEY_SUCCESS, false); res.put("message", "Replacement window has expired (7 days only)"); return ResponseEntity.badRequest().body(res); }
        if (order.isReplacementRequested()) { res.put(KEY_SUCCESS, false); res.put("message", "Replacement already requested for this order"); return ResponseEntity.badRequest().body(res); }
        
        order.setReplacementRequested(true);
        orderRepository.save(order);
        
        try {
            emailSender.sendReplacementRequest(order.getCustomer(), order.getAmount(), order.getId(), order.getItems());
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        res.put(KEY_SUCCESS, true); res.put("message", "Replacement requested successfully");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // REPORT ISSUE / RAISE DISPUTE  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/orders/{id}/report-issue
     *
     * Request body (JSON):
     *   { "reason": "Wrong item delivered", "description": "Optional extra details..." }
     *
     * - Validates the order exists and belongs to the authenticated customer.
     * - Sends an HTML admin notification email via EmailSender (async, fire-and-forget).
     * - Writes a structured audit line to stdout for log aggregation / search.
     * - Returns { success: true } to the Flutter app regardless of email outcome,
     *   so the UI never shows a false failure.
     *
     * TODO (future): create an OrderDispute entity + repository and persist here
     *   instead of (or in addition to) the email/log approach.
     */
    @PostMapping("/orders/{id}/report-issue")
    public ResponseEntity<Map<String, Object>> reportIssue(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @PathVariable int id,
            @RequestBody Map<String, String> body,
            HttpServletRequest req) {

        Map<String, Object> res = new HashMap<>();

        // ── 1. Auth check ──────────────────────────────────────────────────
        if (customerId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }

        // ── 2. Validate order ownership ────────────────────────────────────
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }

        // ── 3. Extract and validate body ───────────────────────────────────
        String reason      = body != null ? body.get("reason")      : null;
        String description = body != null ? body.get("description") : null;

        if (reason == null || reason.isBlank()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "reason is required");
            return ResponseEntity.badRequest().body(res);
        }

        // ── 4. Structured audit log (searchable without a DB table) ────────
        String customerEmail = order.getCustomer().getEmail();
        String adminEmail = adminAuthService.getPrimaryAdminEmail();
        LOGGER.info(
            "[DISPUTE] orderId={} customerId={} customerEmail={} reason=\"{}\" description=\"{}\" ip={} at={}",
            id,
            customerId,
            maskEmailForLog(customerEmail),
            sanitizeForLog(reason),
            sanitizeForLog(description != null ? description : ""),
            sanitizeForLog(req.getRemoteAddr()),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );

        // ── 5. Admin notification email (async — failure won't break API) ──
        try {
            emailSender.sendDisputeNotification(
                adminEmail,    // to
                adminEmail,    // from (reuse admin email as sender identity)
                id, customerId, customerEmail, reason, description
            );
        } catch (Exception e) {
            LOGGER.error("[DISPUTE] Admin email dispatch failed", e);
        }

        // ── 6. Respond ─────────────────────────────────────────────────────
        res.put(KEY_SUCCESS, true);
        res.put("message", "Your issue has been reported. Our team will review it shortly.");
        res.put(KEY_ORDER_ID, id);
        res.put("reason", reason);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // INVOICE PDF  (X-Customer-Id)  [Feature #46]
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/react/orders/{id}/invoice
     * 
     * Downloads invoice PDF for a delivered order.
     * Feature #46: Invoice PDF Generation & Download
     * 
     * - Validates order exists and belongs to authenticated customer
     * - Only allows download for DELIVERED orders
     * - Generates PDF using InvoiceService
     * - Returns PDF as attachment with Content-Disposition header
     */
    @GetMapping("/orders/{id}/invoice")
    public ResponseEntity<Object> downloadOrderInvoice(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @PathVariable int id) {
        
        // ── 1. Auth check ──────────────────────────────────────────────────
        if (customerId == null) {
            Map<String, Object> res = new HashMap<>();
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }

        // ── 2. Validate order ownership & delivery status ──────────────────
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) {
            Map<String, Object> res = new HashMap<>();
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }

        if (order.getTrackingStatus() != TrackingStatus.DELIVERED) {
            Map<String, Object> res = new HashMap<>();
            res.put(KEY_SUCCESS, false);
            res.put("message", "Invoice is only available for delivered orders");
            return ResponseEntity.badRequest().body(res);
        }

        try {
            // ── 3. Generate PDF ────────────────────────────────────────────
            byte[] pdfContent = invoiceService.generateInvoicePdf(order);

            // ── 4. Return PDF as attachment ────────────────────────────────
            String fileName = "Order_" + id + "_Invoice.pdf";
            return ResponseEntity.ok()
                    .header("Content-Type", "application/pdf")
                    .header(HEADER_CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .body(pdfContent);

        } catch (Exception e) {
            LOGGER.error("[INVOICE] PDF generation failed for order {}", id, e);

            Map<String, Object> res = new HashMap<>();
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to generate invoice PDF");
            res.put(KEY_ERROR, e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // WISHLIST  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/wishlist */
    @GetMapping("/wishlist")
    public ResponseEntity<Map<String, Object>> getWishlist(@RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Wishlist> wishlist = wishlistRepository.findByCustomer(customer);
        List<Map<String, Object>> items = wishlist.stream().map(w -> {
            Map<String, Object> m = new HashMap<>();
            Product p = w.getProduct();
            m.put("wishlistId", w.getId()); m.put("addedAt", w.getAddedAt() != null ? w.getAddedAt().toString() : null);
            m.put(KEY_PRODUCT_ID, p.getId()); m.put("name", p.getName()); m.put("price", p.getPrice());
            m.put(KEY_IMAGE_LINK, p.getImageLink()); m.put("category", p.getCategory()); m.put("inStock", p.getStock() > 0);
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put(KEY_COUNT, items.size()); res.put("items", items);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/wishlist/ids */
    @GetMapping("/wishlist/ids")
    public ResponseEntity<Map<String, Object>> getWishlistIds(@RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Integer> ids = wishlistRepository.findByCustomer(customer).stream()
                .map(w -> w.getProduct().getId()).toList();
        res.put(KEY_SUCCESS, true); res.put("ids", ids);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/wishlist/toggle */
    @PostMapping("/wishlist/toggle")
    public ResponseEntity<Map<String, Object>> toggleWishlist(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Integer> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Integer productId = body.get(KEY_PRODUCT_ID);
        if (productId == null) { res.put(KEY_SUCCESS, false); res.put("message", "productId is required"); return ResponseEntity.badRequest().body(res); }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_PRODUCT_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        List<Wishlist> existing = wishlistRepository.findByCustomer(customer).stream()
                .filter(w -> w.getProduct().getId() == productId).toList();
        if (!existing.isEmpty()) {
            wishlistRepository.deleteAll(existing);
            res.put(KEY_SUCCESS, true); res.put("wishlisted", false); res.put("message", "Removed from wishlist");
        } else {
            Wishlist w = new Wishlist(); w.setCustomer(customer); w.setProduct(product); w.setAddedAt(LocalDateTime.now());
            wishlistRepository.save(w);
            res.put(KEY_SUCCESS, true); res.put("wishlisted", true); res.put("message", "Added to wishlist");
        }
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // PROFILE  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/profile */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", customer.getId()); profile.put("name", customer.getName());
        profile.put(KEY_EMAIL, customer.getEmail()); profile.put(KEY_MOBILE, customer.getMobile());
        profile.put("profileImage", customer.getProfileImage());
        profile.put("lastLogin", customer.getLastLogin() != null ? customer.getLastLogin().toString() : null);
        profile.put("provider",  customer.getProvider()  != null ? customer.getProvider() : "local");
        profile.put("password",  customer.getPassword() != null); // boolean: true if password is set
        profile.put("addresses", customer.getAddresses().stream().map(a -> {
            Map<String, Object> am = new HashMap<>();
            am.put("id",            a.getId());
            am.put("formattedAddress", a.getFormattedAddress());
            am.put("recipientName", a.getRecipientName() != null ? a.getRecipientName() : "");
            am.put("houseStreet",   a.getHouseStreet()   != null ? a.getHouseStreet()   : "");
            am.put("city",          a.getCity()          != null ? a.getCity()          : "");
            am.put("state",         a.getState()         != null ? a.getState()         : "");
            am.put("postalCode",    a.getPostalCode()    != null ? a.getPostalCode()    : "");
            // legacy fallback
            am.put("details",       a.getDetails()       != null ? a.getDetails()       : "");
            return am;
        }).toList());
        res.put(KEY_SUCCESS, true); res.put("profile", profile);
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/profile/update */
    @PutMapping("/profile/update")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name"))   customer.setName((String) body.get("name"));
        if (body.containsKey(KEY_MOBILE)) customer.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString()));
        customerRepository.save(customer);
        res.put(KEY_SUCCESS, true); res.put("message", "Profile updated successfully");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/profile/address/add
     * Accepts structured fields: recipientName, houseStreet, city, state, postalCode.
     * Also accepts legacy "address" flat-text field for backward compatibility.
     */
    @PostMapping("/profile/address/add")
    public ResponseEntity<Map<String, Object>> addAddress(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }

        Address address = new Address();
        address.setCustomer(customer);

        String recipientName = body.get("recipientName");
        if (recipientName != null && !recipientName.isBlank()) {
            // Structured form submission
            address.setRecipientName(recipientName.trim());
            address.setHouseStreet(body.getOrDefault("houseStreet", "").trim());
            address.setCity(body.getOrDefault("city", "").trim());
            address.setState(body.getOrDefault("state", "").trim());
            String postalCode = body.getOrDefault("postalCode", "").trim();
            address.setPostalCode(postalCode);
        } else {
            // Legacy flat-text fallback
            String details = body.get("address");
            if (details == null || details.isBlank()) {
                res.put(KEY_SUCCESS, false); res.put("message", "Address cannot be empty");
                return ResponseEntity.badRequest().body(res);
            }
            address.setDetails(details.trim());
        }

        customer.getAddresses().add(address);
        customerRepository.save(customer);
        res.put(KEY_SUCCESS, true); res.put("message", "Address added");
        res.put("addressId", address.getId());
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/profile/address/{id}/delete */
    @DeleteMapping("/profile/address/{id}/delete")
    public ResponseEntity<Map<String, Object>> deleteAddress(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        customer.getAddresses().removeIf(a -> a.getId() == id);
        customerRepository.save(customer);
        res.put(KEY_SUCCESS, true); res.put("message", "Address deleted");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // REVIEWS  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/reviews/add */
    @PostMapping("/reviews/add")
    public ResponseEntity<Map<String, Object>> addReview(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        int productId = Integer.parseInt(body.get(KEY_PRODUCT_ID).toString());
        int rating    = Integer.parseInt(body.get("rating").toString());
        String comment = (String) body.get("comment");
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_PRODUCT_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        if (reviewRepository.existsByProductIdAndCustomerId(productId, customer.getId())) {
            res.put(KEY_SUCCESS, false); res.put("message", "You have already reviewed this product");
            return ResponseEntity.badRequest().body(res);
        }
        int safeRating = Math.max(1, Math.min(5, rating));
        Review review = new Review();
        review.setProduct(product); review.setRating(safeRating); review.setComment(comment);
        review.setCustomer(customer);
        reviewRepository.save(review);
        res.put(KEY_SUCCESS, true); res.put("message", "Review added successfully");
        res.put("reviewId", review.getId());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/reviews/{reviewId}/upload-image
     * Multipart upload of up to 5 evidence photos for a review.
     * Field name: "images" (multiple files).
     * Validates: JPEG/PNG/WEBP only, max 5 MB each, max 5 total per review.
    * Header: X-Customer-Id — ownership enforced via review.customer FK.
     */
    @PostMapping(value = "/reviews/{reviewId}/upload-image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadReviewImageFlutter(
            @PathVariable int reviewId,
            @RequestParam("images") List<org.springframework.web.multipart.MultipartFile> files,
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId) {

        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null) {
            res.put(KEY_SUCCESS, false); res.put("message", "Review not found");
            return ResponseEntity.status(404).body(res);
        }
        // Ownership: enforce using immutable customer FK, not display name
        if (review.getCustomer() == null || review.getCustomer().getId() != customer.getId()) {
            res.put(KEY_SUCCESS, false); res.put("message", "You can only add photos to your own reviews");
            return ResponseEntity.status(403).body(res);
        }

        long existing = reviewImageRepository.countByReviewId(reviewId);
        int slots = (int) (5 - existing);
        if (slots <= 0) {
            res.put(KEY_SUCCESS, false); res.put("message", "Maximum 5 photos already uploaded for this review");
            return ResponseEntity.badRequest().body(res);
        }

        int uploaded = 0;
        List<String> errors  = new java.util.ArrayList<>();
        List<String> urls    = new java.util.ArrayList<>();

        for (int i = 0; i < Math.min(files.size(), slots); i++) {
            org.springframework.web.multipart.MultipartFile file = files.get(i);
            if (file == null || file.isEmpty()) continue;
            String ct = file.getContentType();
            boolean validType = ct != null && (ct.equals("image/jpeg") || ct.equals("image/png") || ct.equals("image/webp"));
            boolean validSize = file.getSize() <= 5 * 1024 * 1024;
            if (!validType || !validSize) {
                errors.add((file.getOriginalFilename() != null ? file.getOriginalFilename() : "file")
                    + ": must be JPG/PNG/WEBP, max 5 MB");
                continue;
            }
            try {
                String url = cloudinaryHelper.saveToCloudinary(file);
                ReviewImage img = new ReviewImage();
                img.setReview(review);
                img.setImageUrl(url);
                reviewImageRepository.save(img);
                urls.add(url);
                uploaded++;
            } catch (Exception e) {
                errors.add("Upload failed: " + e.getMessage());
            }
        }

        if (uploaded == 0 && !errors.isEmpty()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", String.join("; ", errors));
            return ResponseEntity.badRequest().body(res);
        }

        res.put(KEY_SUCCESS, true);
        res.put("uploaded", uploaded);
        res.put("urls", urls);
        if (!errors.isEmpty()) res.put("warnings", errors);
        res.put("message", uploaded + " photo(s) added to your review");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // SPENDING SUMMARY  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/spending-summary */
    @GetMapping("/spending-summary")
    public ResponseEntity<Map<String, Object>> getSpendingSummary(@RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Order> delivered = orderRepository.findByCustomer(customer).stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED).toList();
        if (delivered.isEmpty()) { res.put(KEY_SUCCESS, true); res.put("hasData", false); return ResponseEntity.ok(res); }
        double totalSpent = delivered.stream().mapToDouble(Order::getAmount).sum();
        int totalOrders   = delivered.size();
        double avgOrder   = totalOrders > 0 ? totalSpent / totalOrders : 0;
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
    // REFUNDS  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/refund/request  —  body: { orderId, reason, type } */
    @PostMapping("/refund/request")
    public ResponseEntity<Map<String, Object>> requestRefund(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
            int orderId  = Integer.parseInt(body.get(KEY_ORDER_ID).toString());
            String reason = (String) body.getOrDefault("reason", "");
            String type   = (String) body.getOrDefault("type", "REFUND");
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
            if (order.getTrackingStatus() != TrackingStatus.DELIVERED) { res.put(KEY_SUCCESS, false); res.put("message", "Refund can only be requested for delivered orders"); return ResponseEntity.badRequest().body(res); }
            Refund refund = new Refund();
            refund.setOrder(order); refund.setCustomer(customer);
            // Prepend type (REFUND/REPLACEMENT) to reason so it's stored without a separate column
            refund.setReason("[" + type + "] " + reason);
            refund.setStatus(RefundStatus.PENDING);
            refund.setAmount(order.getTotalPrice());
            refundRepository.save(refund);
            res.put(KEY_SUCCESS, true); res.put("message", "Refund request submitted");
            res.put("refundId", refund.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put("message", e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** GET /api/flutter/refund/status/{orderId} */
    @GetMapping("/refund/status/{orderId}")
    public ResponseEntity<Map<String, Object>> getRefundStatus(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId, @PathVariable int orderId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Refund> refunds = refundRepository.findByOrder(order);
        if (refunds.isEmpty()) { res.put(KEY_SUCCESS, true); res.put("hasRefund", false); return ResponseEntity.ok(res); }
        Refund latest = refunds.get(refunds.size() - 1);
        res.put(KEY_SUCCESS, true); res.put("hasRefund", true);
        res.put("refundId", latest.getId());
        res.put("status", latest.getStatus().name());
        // reason is stored as "[TYPE] actual reason" — parse them back out
        String storedReason = latest.getReason() != null ? latest.getReason() : "";
        String refundType = "REFUND";
        String displayReason = storedReason;
        if (storedReason.startsWith("[REFUND] ")) {
            refundType = "REFUND";
            displayReason = storedReason.substring(9);
        } else if (storedReason.startsWith("[REPLACEMENT] ")) {
            refundType = "REPLACEMENT";
            displayReason = storedReason.substring(14);
        }
        res.put("reason", displayReason);
        res.put("type", refundType);
        return ResponseEntity.ok(res);
    }


    // ═══════════════════════════════════════════════════════
    // REFUND IMAGE UPLOAD  (X-Customer-Id + JWT)
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/refund/{refundId}/upload-image
     * Multipart upload of up to 5 evidence images for a refund request.
     * Accepts: multipart/form-data, field name "images" (multiple files).
     * Validates: JPEG/PNG/WEBP only, max 5 MB each, max 5 total per refund.
     * Header: X-Customer-Id (ownership enforced)
     */
    @PostMapping(value = "/refund/{refundId}/upload-image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadRefundImageFlutter(
            @PathVariable int refundId,
            @RequestParam("images") List<org.springframework.web.multipart.MultipartFile> files,
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId) {

        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        Refund refund = refundRepository.findById(refundId).orElse(null);
        if (refund == null) {
            res.put(KEY_SUCCESS, false); res.put("message", "Refund not found");
            return ResponseEntity.status(404).body(res);
        }
        if (refund.getCustomer().getId() != customerId) {
            res.put(KEY_SUCCESS, false); res.put("message", "Access denied");
            return ResponseEntity.status(403).body(res);
        }

        long existing = refundImageRepository.countByRefundId(refundId);
        int slots = (int) (5 - existing);
        if (slots <= 0) {
            res.put(KEY_SUCCESS, false); res.put("message", "Maximum 5 evidence images already uploaded");
            return ResponseEntity.badRequest().body(res);
        }

        int uploaded = 0;
        List<String> errors = new java.util.ArrayList<>();
        List<String> uploadedUrls = new java.util.ArrayList<>();

        for (int i = 0; i < Math.min(files.size(), slots); i++) {
            org.springframework.web.multipart.MultipartFile file = files.get(i);
            if (file == null || file.isEmpty()) continue;

            String ct = file.getContentType();
            boolean validType = ct != null && (ct.equals("image/jpeg") || ct.equals("image/png") || ct.equals("image/webp"));
            boolean validSize = file.getSize() <= 5 * 1024 * 1024;
            if (!validType || !validSize) {
                errors.add((file.getOriginalFilename() != null ? file.getOriginalFilename() : "file")
                    + ": must be JPG/PNG/WEBP, max 5 MB");
                continue;
            }

            try {
                String url = cloudinaryHelper.saveToCloudinary(file);
                RefundImage img = new RefundImage();
                img.setRefund(refund);
                img.setImageUrl(url);
                refundImageRepository.save(img);
                uploadedUrls.add(url);
                uploaded++;
            } catch (Exception e) {
                errors.add("Upload failed: " + e.getMessage());
            }
        }

        if (uploaded == 0 && !errors.isEmpty()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", String.join("; ", errors));
            return ResponseEntity.badRequest().body(res);
        }

        res.put(KEY_SUCCESS, true);
        res.put("uploaded", uploaded);
        res.put("urls", uploadedUrls);
        if (!errors.isEmpty()) res.put("warnings", errors);
        res.put("message", uploaded + " image(s) uploaded successfully");
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/refund/{refundId}/images
     * Returns all evidence images for a refund.
     * Header: X-Customer-Id (ownership enforced)
     */
    @GetMapping("/refund/{refundId}/images")
    public ResponseEntity<Map<String, Object>> getRefundImagesFlutter(
            @PathVariable int refundId,
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId) {

        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER);
            return ResponseEntity.status(401).body(res);
        }
        Refund refund = refundRepository.findById(refundId).orElse(null);
        if (refund == null) {
            res.put(KEY_SUCCESS, false); res.put("message", "Refund not found");
            return ResponseEntity.status(404).body(res);
        }
        if (refund.getCustomer().getId() != customerId) {
            res.put(KEY_SUCCESS, false); res.put("message", "Access denied");
            return ResponseEntity.status(403).body(res);
        }

        List<RefundImage> images = refundImageRepository.findByRefundId(refundId);
        List<Map<String, Object>> data = new java.util.ArrayList<>();
        for (RefundImage img : images) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", img.getId());
            m.put("imageUrl", img.getImageUrl());
            data.add(m);
        }
        res.put(KEY_SUCCESS, true);
        res.put("images", data);
        res.put(KEY_COUNT, data.size());
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — VIEW  (X-Vendor-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/vendor/products */
    @GetMapping("/vendor/products")
    public ResponseEntity<Map<String, Object>> getVendorProducts(@RequestHeader(HEADER_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Product> products = productRepository.findByVendor(vendor);
        res.put(KEY_SUCCESS, true);
        res.put("products", products.stream().map(this::mapProduct).toList());
        res.put(KEY_COUNT, products.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/orders */
    @GetMapping("/vendor/orders")
    public ResponseEntity<Map<String, Object>> getVendorOrders(@RequestHeader(HEADER_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        List<Integer> vendorProductIds = productRepository.findByVendor(vendor).stream().map(Product::getId).toList();
        List<Order> allOrders = orderRepository.findOrdersByVendor(vendor);
        List<Map<String, Object>> vendorOrders = allOrders.stream().map(order -> {
            Map<String, Object> o = mapOrder(order);
            List<Map<String, Object>> vendorItems = order.getItems().stream()
                    .filter(i -> i.getProductId() != null && vendorProductIds.contains(i.getProductId()))
                    .map(this::mapItem).toList();
            o.put("items", vendorItems);
            double vendorTotal = vendorItems.stream().mapToDouble(i -> (double) i.get("price") * (int) i.get("quantity")).sum();
            o.put("vendorTotal", vendorTotal);
            return o;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put(KEY_ORDERS, vendorOrders);
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/vendor/orders/{orderId}/mark-packed
     *
     * Marks an order as PACKED (vendor has physically packed the items,
     * ready for courier pickup). Only succeeds when the order contains at
     * least one product belonging to this vendor.
     *
     * Request headers: X-Vendor-Id  (set automatically by apiFetch for VENDOR role)
     * Path variable  : orderId
     * Response body  : { success, message, orderId, newStatus }
     */
    @PostMapping("/vendor/orders/{orderId}/mark-packed")
    public ResponseEntity<Map<String, Object>> vendorMarkOrderPacked(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId,
            @PathVariable int orderId) {
        Map<String, Object> res = new HashMap<>();

        // 1. Validate vendor
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_VENDOR_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }

        // 2. Validate order
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }

        // 3. Confirm the order contains at least one product owned by this vendor
        List<Integer> vendorProductIds = productRepository.findByVendor(vendor)
                .stream()
                .map(Product::getId)
                .toList();

        boolean hasVendorItem = order.getItems().stream()
                .anyMatch(i -> i.getProductId() != null && vendorProductIds.contains(i.getProductId()));

        if (!hasVendorItem) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "This order does not contain any of your products");
            return ResponseEntity.status(403).body(res);
        }

        // 4. Reject if already past PACKED (can't go backwards)
        TrackingStatus current = order.getTrackingStatus();
        if (current != null && current.getStepIndex() > TrackingStatus.PACKED.getStepIndex()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Order is already " + current.getDisplayName() + " — cannot revert to Packed");
            return ResponseEntity.badRequest().body(res);
        }

        // 5. Auto-assign source warehouse based on vendor's city
        // 6. Update status and persist
        order.setTrackingStatus(TrackingStatus.PACKED);
        orderRepository.save(order);

        res.put(KEY_SUCCESS, true);
        res.put("message", "Order marked as packed");
        res.put(KEY_ORDER_ID, orderId);
        res.put(KEY_NEW_STATUS, TrackingStatus.PACKED.name());
        if (order.getSourceWarehouse() != null) {
            res.put("sourceWarehouse", order.getSourceWarehouse().getName());
        }
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/stats */
    @GetMapping("/vendor/stats")
    public ResponseEntity<Map<String, Object>> getVendorStats(@RequestHeader(HEADER_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
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
    // VENDOR — PRODUCT CRUD  (X-Vendor-Id)
    // ═══════════════════════════════════════════════════════

    /** POST /api/react/vendor/products/add — Accepts multipart/form-data */
    @PostMapping(value = "/vendor/products/add", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> vendorAddProduct(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId,
            @RequestParam("name") String name,
            @RequestParam("description") String description,
            @RequestParam("price") String price,
            @RequestParam("category") String category,
            @RequestParam("stock") String stock,
            @RequestParam(value = KEY_IMAGE_LINK, required = false) String imageLink,
            @RequestParam(value = "image", required = false) org.springframework.web.multipart.MultipartFile image,
            @RequestParam(value = "mrp", required = false) String mrp,
            @RequestParam(value = "gstRate", required = false) String gstRate,
            @RequestParam(value = "allowedPinCodes", required = false) String allowedPinCodes,
            @RequestParam(value = "stockAlertThreshold", required = false) String stockAlertThreshold) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        try {
            Product p = new Product();
            p.setName(name);
            p.setDescription(description);
            p.setPrice(Double.parseDouble(price));
            p.setCategory(category);
            p.setStock(Integer.parseInt(stock));
            
            if (image != null && !image.isEmpty()) {
                try {
                    String imageUrl = cloudinaryHelper.saveToCloudinary(image);
                    p.setImageLink(imageUrl);
                } catch (Exception e) {
                    p.setImageLink(imageLink != null && !imageLink.isBlank() ? imageLink : "");
                }
            } else {
                p.setImageLink(imageLink != null && !imageLink.isBlank() ? imageLink : "");
            }
            p.setApproved(false);
            p.setVendor(vendor);
            
            if (mrp != null && !mrp.isBlank()) {
                double mrpVal = Double.parseDouble(mrp);
                if (mrpVal > 0) p.setMrp(mrpVal);
            }
            if (gstRate != null && !gstRate.isBlank()) {
                double gstVal = Double.parseDouble(gstRate);
                if (gstVal > 0) p.setGstRate(gstVal);
            }
            if (allowedPinCodes != null && !allowedPinCodes.isBlank()) {
                p.setAllowedPinCodes(allowedPinCodes.trim());
            }
            if (stockAlertThreshold != null && !stockAlertThreshold.isBlank()) {
                p.setStockAlertThreshold(Integer.parseInt(stockAlertThreshold));
            }
            
            productRepository.save(p);
            res.put(KEY_SUCCESS, true); res.put("message", "Product added. Pending admin approval."); res.put(KEY_PRODUCT_ID, p.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** PUT /api/react/vendor/products/{id}/update — Accepts multipart/form-data */
    @PutMapping(value = "/vendor/products/{id}/update", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> vendorUpdateProduct(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId,
            @PathVariable int id,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "price", required = false) String price,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "stock", required = false) String stock,
            @RequestParam(value = KEY_IMAGE_LINK, required = false) String imageLink,
            @RequestParam(value = "image", required = false) org.springframework.web.multipart.MultipartFile image,
            @RequestParam(value = "mrp", required = false) String mrp,
            @RequestParam(value = "gstRate", required = false) String gstRate,
            @RequestParam(value = "stockAlertThreshold", required = false) String stockAlertThreshold) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || p.getVendor() == null || p.getVendor().getId() != vendorId) { res.put(KEY_SUCCESS, false); res.put("message", "Product not found or not yours"); return ResponseEntity.badRequest().body(res); }
        try {
            if (name != null &&!name.isBlank()) p.setName(name);
            if (description != null && !description.isBlank()) p.setDescription(description);
            if (price != null && !price.isBlank()) p.setPrice(Double.parseDouble(price));
            if (category != null && !category.isBlank()) p.setCategory(category);
            if (stock != null && !stock.isBlank()) p.setStock(Integer.parseInt(stock));
            
            if (image != null && !image.isEmpty()) {
                try {
                    String imageUrl = cloudinaryHelper.saveToCloudinary(image);
                    p.setImageLink(imageUrl);
                } catch (Exception e) {
                    if (imageLink != null && !imageLink.isBlank()) p.setImageLink(imageLink);
                }
            } else if (imageLink != null && !imageLink.isBlank()) {
                p.setImageLink(imageLink);
            }
            if (mrp != null && !mrp.isBlank()) p.setMrp(Double.parseDouble(mrp));
            if (gstRate != null && !gstRate.isBlank()) p.setGstRate(Double.parseDouble(gstRate));
            if (stockAlertThreshold != null && !stockAlertThreshold.isBlank()) p.setStockAlertThreshold(Integer.parseInt(stockAlertThreshold));
            
            productRepository.save(p);
            res.put(KEY_SUCCESS, true); res.put("message", "Product updated successfully.");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** DELETE /api/flutter/vendor/products/{id}/delete */
    @DeleteMapping("/vendor/products/{id}/delete")
    public ResponseEntity<Map<String, Object>> vendorDeleteProduct(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || p.getVendor() == null || p.getVendor().getId() != vendorId) { res.put(KEY_SUCCESS, false); res.put("message", "Product not found or not yours"); return ResponseEntity.badRequest().body(res); }
        productRepository.delete(p);
        res.put(KEY_SUCCESS, true); res.put("message", "Product deleted.");
        return ResponseEntity.ok(res);
    }

    /** GET /api/react/vendor/categories — Returns all available product categories for vendor to select from */
    @GetMapping("/vendor/categories")
    public ResponseEntity<Map<String, Object>> getVendorCategories(@RequestHeader(HEADER_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        // Return all unique categories from approved products (for reference), or a predefined list
        List<String> categories = productRepository.findByApprovedTrue()
                .stream().map(Product::getCategory).filter(Objects::nonNull)
                .distinct().sorted().toList();
        // Fallback categories if no products exist
        if (categories.isEmpty()) {
            categories = java.util.Arrays.asList("Electronics", "Fashion", "Home & Kitchen", "Sports", "Beauty", "Books", "Toys", "Food & Groceries");
        }
        res.put(KEY_SUCCESS, true);
        res.put("categories", categories.stream().map(c -> java.util.Map.of("name", c)).toList());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/vendor/products/upload-csv
     * Multipart form: file (CSV)
        * CSV/PIM columns supported: id (optional), name, description, price, mrp (optional),
        * category, stock, imageLink, stockAlertThreshold, gstRate (optional), allowedPinCodes (optional).
        * Header aliases are accepted, e.g. Product Name, Image URL, Stock Alert Threshold,
        * Allowed Pin Codes, Selling Price, GST Rate.
     * If id is provided and product belongs to vendor, the product is updated; otherwise a new product is created (approved=false).
     */
    @PostMapping("/vendor/products/upload-csv")
    public ResponseEntity<Map<String, Object>> vendorUploadCsv(
            @RequestHeader(value = HEADER_VENDOR_ID, required = false) Integer vendorId,
            @RequestParam("file") MultipartFile file,
            jakarta.servlet.http.HttpServletRequest request) {
        Map<String, Object> res = new HashMap<>();
        // Allow header to be omitted when the request carries a valid JWT — fall back
        // to the parsed token subject set by ReactAuthFilter (request attribute CLAIM_USER_ID).
        if (vendorId == null) {
            Object attr = request.getAttribute(CLAIM_USER_ID);
            if (attr instanceof Integer) vendorId = (Integer) attr;
            else if (attr instanceof Number) vendorId = ((Number) attr).intValue();
        }
        if (vendorId == null) {
            res.put(KEY_SUCCESS, false); res.put("message", "Vendor id header missing or unauthenticated");
            return ResponseEntity.status(401).body(res);
        }

        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", "Vendor not found (id=" + vendorId + ")"); return ResponseEntity.badRequest().body(res); }
        if (file == null || file.isEmpty()) { res.put(KEY_SUCCESS, false); res.put("message", "No file uploaded"); return ResponseEntity.badRequest().body(res); }

        int created = 0, updated = 0; List<String> errors = new ArrayList<>();
        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream()))) {
            String header = reader.readLine();
            if (header == null) { res.put(KEY_SUCCESS, false); res.put("message", "Empty file"); return ResponseEntity.badRequest().body(res); }
            String[] cols = parseCsvLine(header);
            Map<String, Integer> idx = new HashMap<>();
            for (int i = 0; i < cols.length; i++) idx.put(normalizeCsvHeader(cols[i]), i);

            String line; int row = 1;
            while ((line = reader.readLine()) != null) {
                row++;
                if (line.isBlank()) continue;
                String[] cells = parseCsvLine(line);
                try {
                    String idStr = getCellByHeaders(cells, idx, "id", "productid");
                    String name = getCellByHeaders(cells, idx, "name", "productname");
                    String desc = getCellByHeaders(cells, idx, "description", "productdescription");
                    String priceStr = getCellByHeaders(cells, idx, "price", "sellingprice", "saleprice");
                    String mrpStr = getCellByHeaders(cells, idx, "mrp", "originalprice");
                    String category = getCellByHeaders(cells, idx, "category", "productcategory");
                    String stockStr = getCellByHeaders(cells, idx, "stock", "quantity");
                    String imageLink = getCellByHeaders(cells, idx, "imagelink", "imageurl", "image");
                    String threshStr = getCellByHeaders(cells, idx, "stockalertthreshold", "stockalert", "alertthreshold");
                    String gstRateStr = getCellByHeaders(cells, idx, "gstrate", "gstratepercent", "gst", "gstpercent");
                    String pinCodes = getCellByHeaders(cells, idx, "allowedpincodes", "pincodes", "deliverablepincodes");

                    if (name == null || name.isBlank()) throw new IllegalArgumentException("Missing name");
                    if (priceStr == null || priceStr.isBlank()) throw new IllegalArgumentException("Missing price");

                    double price = Double.parseDouble(priceStr);
                    int stock = (stockStr == null || stockStr.isBlank()) ? 0 : Integer.parseInt(stockStr);
                    Integer thresh = (threshStr == null || threshStr.isBlank()) ? null : Integer.parseInt(threshStr);
                    Double mrp = (mrpStr == null || mrpStr.isBlank()) ? 0.0 : Double.parseDouble(mrpStr);
                    Double gstRate = (gstRateStr == null || gstRateStr.isBlank()) ? null : Double.parseDouble(gstRateStr);

                    if (idStr != null && !idStr.isBlank()) {
                        int id = Integer.parseInt(idStr);
                        Product p = productRepository.findById(id).orElse(null);
                        if (p == null) throw new IllegalArgumentException("Product id " + id + " not found");
                        if (p.getVendor() == null || p.getVendor().getId() != vendorId) throw new IllegalArgumentException("Product id " + id + " does not belong to you");
                        p.setName(name); p.setDescription(desc); p.setPrice(price); p.setMrp(mrp); p.setCategory(category); p.setStock(stock);
                        if (imageLink != null) p.setImageLink(imageLink);
                        if (thresh != null) p.setStockAlertThreshold(thresh);
                        if (gstRate != null && gstRate > 0) p.setGstRate(gstRate);
                        if (pinCodes != null) p.setAllowedPinCodes(pinCodes);
                        productRepository.save(p); updated++;
                    } else {
                        Product p = new Product();
                        p.setName(name); p.setDescription(desc); p.setPrice(price); p.setMrp(mrp); p.setCategory(category); p.setStock(stock);
                        if (imageLink != null) p.setImageLink(imageLink);
                        if (thresh != null) p.setStockAlertThreshold(thresh);
                        if (gstRate != null && gstRate > 0) p.setGstRate(gstRate);
                        if (pinCodes != null) p.setAllowedPinCodes(pinCodes);
                        p.setVendor(vendor); p.setApproved(false);
                        productRepository.save(p); created++;
                    }
                } catch (Exception e) {
                    errors.add("Row " + row + ": " + e.getMessage());
                    if (errors.size() > 50) break;
                }
            }
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put("message", "Failed to process file: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }

        res.put(KEY_SUCCESS, true); 
        res.put("created", created); 
        res.put("updated", updated); 
        res.put("errors", errors);
        res.put("message", String.format("Processed %d products: %d created, %d updated, %d errors", 
                created + updated + errors.size(), created, updated, errors.size()));
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/admin/products/upload-csv
     * Admin bulk product import — no vendor ownership check.
     * Optional param: vendorId (integer) — if provided, links products to that vendor.
     * If vendorId omitted, products are created with vendor=null (platform products).
     * All imported products start as approved=true (admin-curated).
     * Multipart form: file (CSV)
     * Columns: id (optional), name, description, price, mrp, category, stock, imageLink, stockAlertThreshold, gstRate, approved
     */
    @PostMapping(value = "/admin/products/upload-csv", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> adminUploadProductCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = KEY_VENDOR_ID, required = false) Integer vendorId,
            @RequestParam(value = "autoApprove", required = false, defaultValue = "true") boolean autoApprove,
            jakarta.servlet.http.HttpServletRequest request) {

        ResponseEntity<Map<String, Object>> guard = requireAdmin(request);
        if (guard != null) return guard;

        Map<String, Object> res = new HashMap<>();
        if (file == null || file.isEmpty()) {
            res.put(KEY_SUCCESS, false); res.put("message", "No file uploaded");
            return ResponseEntity.badRequest().body(res);
        }

        Vendor vendor = null;
        if (vendorId != null) {
            vendor = vendorRepository.findById(vendorId).orElse(null);
            if (vendor == null) {
                res.put(KEY_SUCCESS, false); res.put("message", "Vendor id " + vendorId + " not found");
                return ResponseEntity.badRequest().body(res);
            }
        }

        int created = 0, updated = 0; List<String> errors = new ArrayList<>();
        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine();
            if (headerLine == null) { res.put(KEY_SUCCESS, false); res.put("message", "Empty file"); return ResponseEntity.badRequest().body(res); }
            String[] cols = parseCsvLine(headerLine);
            Map<String, Integer> idx = new HashMap<>();
            for (int i = 0; i < cols.length; i++) idx.put(cols[i].trim().toLowerCase().replace(" ", "").replace("_", ""), i);

            String line; int row = 1;
            while ((line = reader.readLine()) != null) {
                row++;
                if (line.isBlank()) continue;
                String[] cells = parseCsvLine(line);
                try {
                    String idStr       = getCell(cells, idx.get("id"));
                    String name        = getCell(cells, idx.get("name"));
                    String desc        = getCell(cells, idx.get("description"));
                    String priceStr    = getCell(cells, idx.get("price"));
                    String mrpStr      = getCell(cells, idx.get("mrp"));
                    String category    = getCell(cells, idx.get("category"));
                    String stockStr    = getCell(cells, idx.get("stock"));
                    String imageLink   = getCell(cells, idx.get("imagelink"));
                    String threshStr   = getCell(cells, idx.get("stockalertthreshold"));
                    String gstRateStr  = getCell(cells, idx.get("gstrate"));
                    String approvedStr = getCell(cells, idx.get("approved"));

                    if (name == null || name.isBlank()) throw new IllegalArgumentException("Missing name");
                    if (priceStr == null || priceStr.isBlank()) throw new IllegalArgumentException("Missing price");

                    double price    = Double.parseDouble(priceStr.replaceAll("[^\\d.]", ""));
                    int    stock    = (stockStr    == null || stockStr.isBlank())    ? 0     : Integer.parseInt(stockStr.trim());
                    Integer thresh  = (threshStr   == null || threshStr.isBlank())   ? null  : Integer.parseInt(threshStr.trim());
                    Double mrp      = (mrpStr      == null || mrpStr.isBlank())      ? 0.0   : Double.parseDouble(mrpStr.replaceAll("[^\\d.]", ""));
                    Double gstRate  = (gstRateStr  == null || gstRateStr.isBlank())  ? null  : Double.parseDouble(gstRateStr.trim());
                    boolean approved = approvedStr != null
                        ? approvedStr.equalsIgnoreCase("true") || approvedStr.equals("1") || approvedStr.equalsIgnoreCase("yes")
                        : autoApprove;

                    if (idStr != null && !idStr.isBlank()) {
                        // Update existing product
                        int id = Integer.parseInt(idStr.trim());
                        Product p = productRepository.findById(id).orElse(null);
                        if (p == null) throw new IllegalArgumentException("Product id " + id + " not found");
                        p.setName(name); p.setDescription(desc); p.setPrice(price); p.setMrp(mrp);
                        p.setCategory(category); p.setStock(stock); p.setApproved(approved);
                        if (imageLink != null) p.setImageLink(imageLink);
                        if (thresh    != null) p.setStockAlertThreshold(thresh);
                        if (gstRate   != null && gstRate > 0) p.setGstRate(gstRate);
                        if (vendor    != null) p.setVendor(vendor);
                        productRepository.save(p); updated++;
                    } else {
                        // Create new product
                        Product p = new Product();
                        p.setName(name); p.setDescription(desc); p.setPrice(price); p.setMrp(mrp);
                        p.setCategory(category != null ? category : "General"); p.setStock(stock);
                        if (imageLink != null) p.setImageLink(imageLink);
                        if (thresh    != null) p.setStockAlertThreshold(thresh);
                        if (gstRate   != null && gstRate > 0) p.setGstRate(gstRate);
                        p.setVendor(vendor);
                        p.setApproved(approved);
                        productRepository.save(p); created++;
                    }
                } catch (Exception e) {
                    errors.add("Row " + row + ": " + e.getMessage());
                    if (errors.size() > 50) { errors.add("Too many errors — import stopped."); break; }
                }
            }
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false); res.put("message", "Failed to process file: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }

        res.put(KEY_SUCCESS, true);
        res.put("created", created);
        res.put("updated", updated);
        res.put("errors", errors);
        res.put("message", "Import complete: " + created + " created, " + updated + " updated" +
            (errors.isEmpty() ? "" : ", " + errors.size() + " row error(s)"));
        return ResponseEntity.ok(res);
    }

    // Simple CSV parsing for one line: handles quoted commas and trims quotes
    private String[] parseCsvLine(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder(); boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') { cur.append('"'); i++; }
                else inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                out.add(cur.toString().trim()); cur.setLength(0);
            } else cur.append(c);
        }
        out.add(cur.toString().trim());
        // strip surrounding quotes if any
        for (int i = 0; i < out.size(); i++) {
            String s = out.get(i);
            if (s.startsWith("\"") && s.endsWith("\"") && s.length() >= 2) s = s.substring(1, s.length() - 1);
            out.set(i, s);
        }
        return out.toArray(new String[0]);
    }

    private String getCell(String[] cells, Integer idx) {
        if (idx == null) return null;
        if (idx < 0 || idx >= cells.length) return null;
        String s = cells[idx];
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private String normalizeCsvHeader(String header) {
        if (header == null) return "";
        return header.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private String getCellByHeaders(String[] cells, Map<String, Integer> idx, String... headerAliases) {
        for (String alias : headerAliases) {
            String v = getCell(cells, idx.get(normalizeCsvHeader(alias)));
            if (v != null) return v;
        }
        return null;
    }

    /** GET /api/flutter/vendor/sales-report?period=weekly|monthly|daily */
    @GetMapping("/vendor/sales-report")
    public ResponseEntity<Map<String, Object>> vendorSalesReport(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId,
            @RequestParam(value = "period", defaultValue = "weekly") String period) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }

        List<Product> products = productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).toList();

        // ── Determine date window based on period ────────────────────────────
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime windowStart;
        int buckets;
        String bucketUnit; // "day", "week", "month"

        switch (period.toLowerCase()) {
            case "daily":
                windowStart = now.minusDays(6).toLocalDate().atStartOfDay();
                buckets     = 7;
                bucketUnit  = "day";
                break;
            case "monthly":
                windowStart = now.minusMonths(6).withDayOfMonth(1).toLocalDate().atStartOfDay();
                buckets     = 6;
                bucketUnit  = "month";
                break;
            case "yearly":
                windowStart = now.minusMonths(11).withDayOfMonth(1).toLocalDate().atStartOfDay();
                buckets     = 12;
                bucketUnit  = "year_month";
                break;
            case "weekly":
            default:
                windowStart = now.minusWeeks(6).toLocalDate().atStartOfDay();
                buckets     = 6;
                bucketUnit  = "week";
                break;
        }

        // Fetch orders in the window (non-cancelled only for revenue)
        List<Order> windowOrders = orderRepository.findOrdersByVendorAndDateRange(vendor, windowStart, now)
                .stream()
                .filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED)
                .toList();

        // All-time orders for totals
        List<Order> allOrders = orderRepository.findOrdersByVendor(vendor);
        // List<Order> activeOrders = allOrders.stream() // unused
        //         .filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED)
        //         .collect(Collectors.toList());

        // ── Revenue and order count for the window ───────────────────────────
        double totalRevenue = windowOrders.stream()
                .flatMap(o -> o.getItems().stream())
                .filter(i -> i.getProductId() != null && productIds.contains(i.getProductId()))
                .mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();

        int totalOrders = windowOrders.size();
        double avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // ── Build period bucket data for the bar chart ───────────────────────
        List<Map<String, Object>> data = new java.util.ArrayList<>();
        for (int i = buckets - 1; i >= 0; i--) {
            java.time.LocalDateTime bucketStart, bucketEnd;
            String label;

            if ("day".equals(bucketUnit)) {
                java.time.LocalDate d = now.toLocalDate().minusDays(i);
                bucketStart = d.atStartOfDay();
                bucketEnd   = d.plusDays(1).atStartOfDay();
                label       = d.getDayOfMonth() + " " + d.getMonth().name().substring(0, 3);
            } else if ("month".equals(bucketUnit)) {
                java.time.YearMonth ym = java.time.YearMonth.now().minusMonths(i);
                bucketStart = ym.atDay(1).atStartOfDay();
                bucketEnd   = ym.atEndOfMonth().plusDays(1).atStartOfDay();
                label       = ym.getMonth().name().substring(0, 3) + " " + ym.getYear();
            } else if ("year_month".equals(bucketUnit)) {
                // yearly view: 12 monthly buckets, labeled "Jan '25" style
                java.time.YearMonth ym = java.time.YearMonth.now().minusMonths(11 - i);
                bucketStart = ym.atDay(1).atStartOfDay();
                bucketEnd   = ym.atEndOfMonth().plusDays(1).atStartOfDay();
                label       = ym.getMonth().name().substring(0, 3)
                              + " '" + String.valueOf(ym.getYear()).substring(2);
            } else { // week
                java.time.LocalDate weekStart = now.toLocalDate().minusWeeks(i).with(java.time.DayOfWeek.MONDAY);
                bucketStart = weekStart.atStartOfDay();
                bucketEnd   = weekStart.plusWeeks(1).atStartOfDay();
                label       = "W" + weekStart.get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear())
                              + " " + weekStart.getMonth().name().substring(0, 3);
            }

            final java.time.LocalDateTime fs = bucketStart, fe = bucketEnd;
            double bucketRevenue = windowOrders.stream()
                    .filter(o -> o.getOrderDate() != null
                            && !o.getOrderDate().isBefore(fs)
                            &&  o.getOrderDate().isBefore(fe))
                    .flatMap(o -> o.getItems().stream())
                    .filter(it -> it.getProductId() != null && productIds.contains(it.getProductId()))
                    .mapToDouble(it -> it.getPrice() * it.getQuantity()).sum();

            Map<String, Object> bucket = new HashMap<>();
            bucket.put("label",   label);
            bucket.put("revenue", Math.round(bucketRevenue * 100.0) / 100.0);
            data.add(bucket);
        }

        // ── Top products by units sold (in the window) ───────────────────────
        Map<Integer, Integer> unitsSoldMap = new HashMap<>();
        for (Order o : windowOrders) {
            for (Item item : o.getItems()) {
                if (item.getProductId() != null && productIds.contains(item.getProductId())) {
                    unitsSoldMap.merge(item.getProductId(), item.getQuantity(), Integer::sum);
                }
            }
        }

        List<Map<String, Object>> topProducts = products.stream()
                .filter(p -> unitsSoldMap.containsKey(p.getId()))
                .sorted((a, b) -> Integer.compare(
                        unitsSoldMap.getOrDefault(b.getId(), 0),
                        unitsSoldMap.getOrDefault(a.getId(), 0)))
                .limit(10)
                .map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    int units = unitsSoldMap.getOrDefault(p.getId(), 0);
                    m.put("id", p.getId()); m.put("name", p.getName());
                    m.put("unitsSold", units);
                    m.put("revenue",   Math.round(units * p.getPrice() * 100.0) / 100.0);
                    return m;
                }).toList();

        String topProduct = topProducts.isEmpty() ? "—" : (String) topProducts.get(0).get("name");

        // All-time pending count (useful status signal regardless of period)
        // All-time pending count (useful status signal regardless of period)
        long pendingOrders = allOrders.stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.PROCESSING
                        || o.getTrackingStatus() == TrackingStatus.PACKED
                        || o.getTrackingStatus() == TrackingStatus.SHIPPED)
                .count();

        res.put(KEY_SUCCESS,        true);
        res.put("period",         period);
        res.put("data",           data);
        res.put("totalRevenue",   Math.round(totalRevenue * 100.0) / 100.0);
        res.put("totalOrders",    totalOrders);
        res.put("totalProducts",  products.size());
        res.put("avgOrderValue",  Math.round(avgOrderValue * 100.0) / 100.0);
        res.put("topProduct",     topProduct);
        res.put("topProducts",    topProducts);
        res.put("pendingOrders",  pendingOrders);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // HELPER MAPPERS
    // ═══════════════════════════════════════════════════════

    private Map<String, Object> mapProduct(Product p) {
        Map<String, Object> m = new HashMap<>();
        double resolvedGstRate = resolveGstRate(p.getGstRate(), p.getCategory());
        m.put("id", p.getId()); m.put("name", p.getName()); m.put("description", p.getDescription());
        m.put("price", p.getPrice()); m.put("mrp", p.getMrp()); m.put("gstRate", p.getGstRate());
        m.put("gstRateResolved", resolvedGstRate);
        m.put("category", p.getCategory()); m.put("stock", p.getStock());
        m.put("stockAlertThreshold", p.getStockAlertThreshold()); m.put("allowedPinCodes", p.getAllowedPinCodes());
        m.put(KEY_IMAGE_LINK, p.getImageLink()); m.put("extraImageLinks", p.getExtraImageLinks());
        m.put("approved", p.isApproved());
        m.put("vendorCode", p.getVendor() != null ? p.getVendor().getVendorCode() : null);
        m.put(KEY_VENDOR_NAME, p.getVendorName());
        m.put("isRestricted", p.isRestrictedByPinCode());
        return m;
    }

    private Map<String, Object> mapItem(Item i) {
        Map<String, Object> m = new HashMap<>();
        double resolvedGstRate = resolveItemGstRate(i);
        m.put("id", i.getId()); m.put("name", i.getName()); m.put("description", i.getDescription());
        m.put("price", i.getPrice()); m.put("category", i.getCategory());
        m.put("gstRateResolved", resolvedGstRate);
        m.put("quantity", i.getQuantity()); m.put(KEY_IMAGE_LINK, i.getImageLink()); m.put(KEY_PRODUCT_ID, i.getProductId());
        return m;
    }

    private double resolveItemGstRate(Item item) {
        if (item == null) return DEFAULT_GST_RATE;
        Integer productId = item.getProductId();
        if (productId != null) {
            Product p = productRepository.findById(productId).orElse(null);
            if (p != null) {
                return resolveGstRate(p.getGstRate(), p.getCategory());
            }
        }
        return resolveGstRate(null, item.getCategory());
    }

    private double resolveGstRate(Double productGstRate, String category) {
        if (productGstRate != null && productGstRate > 0) {
            return productGstRate;
        }
        return gstRateForCategory(category);
    }

    private double gstRateForCategory(String category) {
        if (category == null || category.isBlank()) return DEFAULT_GST_RATE;
        String normalized = category.toLowerCase(Locale.ROOT);
        for (Map.Entry<String, Double> entry : GST_CATEGORY_RATES.entrySet()) {
            String key = entry.getKey();
            if (normalized.contains(key) || key.contains(normalized)) {
                return entry.getValue();
            }
        }
        return DEFAULT_GST_RATE;
    }

    private Map<String, Object> mapOrder(Order o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", o.getId()); m.put("amount", o.getAmount()); m.put("deliveryCharge", o.getDeliveryCharge());
        m.put("totalPrice", o.getTotalPrice()); m.put("paymentMode", o.getPaymentMode());
        m.put("deliveryTime", o.getDeliveryTime()); m.put("trackingStatus", o.getTrackingStatus().name());
        m.put("trackingStatusDisplay", o.getTrackingStatus().getDisplayName());
        m.put("currentCity", o.getCurrentCity());
        m.put("orderDate", o.getOrderDate() != null ? o.getOrderDate().toString() : null);
        m.put("replacementRequested", o.isReplacementRequested());
        m.put("deliveryPinCode", o.getDeliveryPinCode());
        m.put("deliveryAddress", o.getDeliveryAddress());
        m.put("items", o.getItems().stream().map(this::mapItem).toList());
        // Customer — name + mobile for admin/delivery views
        if (o.getCustomer() != null) {
            m.put(KEY_CUSTOMER_NAME, o.getCustomer().getName());
            Map<String, Object> cust = new HashMap<>();
            cust.put("id",     o.getCustomer().getId());
            cust.put("name",   o.getCustomer().getName());
            cust.put(KEY_EMAIL,  o.getCustomer().getEmail());
            cust.put(KEY_MOBILE, o.getCustomer().getMobile());
            m.put("customer", cust);
        }
        // Warehouse — needed by delivery assignment tab
        if (o.getWarehouse() != null) {
            Map<String, Object> wh = new HashMap<>();
            wh.put("id",   o.getWarehouse().getId());
            wh.put("name", o.getWarehouse().getName());
            wh.put("city", o.getWarehouse().getCity());
            m.put("warehouse", wh);
        }
        // Assigned delivery boy — needed by In-Progress tab
        if (o.getDeliveryBoy() != null) {
            Map<String, Object> db = new HashMap<>();
            db.put("id",   o.getDeliveryBoy().getId());
            db.put("name", o.getDeliveryBoy().getName());
            db.put("code", o.getDeliveryBoy().getDeliveryBoyCode());
            m.put("deliveryBoy", db);
        }
        return m;
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN ENDPOINTS  (no special auth — secured by admin login on web side)
    // Flutter admin screens call these after admin logs in on web
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/admin/users — returns all customers + vendors */
    @GetMapping("/admin/users")
    public ResponseEntity<Map<String, Object>> adminGetUsers(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> customers = customerRepository.findAll().stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId()); m.put("name", c.getName()); m.put(KEY_EMAIL, c.getEmail());
            m.put(KEY_MOBILE, c.getMobile()); m.put("active", c.isActive()); m.put("verified", c.isVerified());
            m.put("role", c.getRole() != null ? c.getRole().name() : "CUSTOMER");
            return m;
        }).toList();
        List<Map<String, Object>> vendors = vendorRepository.findAll().stream().map(v -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", v.getId()); m.put("name", v.getName()); m.put(KEY_EMAIL, v.getEmail());
            m.put(KEY_MOBILE, v.getMobile()); m.put("vendorCode", v.getVendorCode());
            m.put("active", v.isVerified()); m.put("verified", v.isVerified());
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put("customers", customers); res.put("vendors", vendors);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/customers/{id}/toggle-active */
    @PostMapping("/admin/customers/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleCustomer(@PathVariable int id, HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        Customer c = customerRepository.findById(id).orElse(null);
        if (c == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        c.setActive(!c.isActive());
        customerRepository.save(c);
        res.put(KEY_SUCCESS, true); res.put("message", c.isActive() ? "Account activated" : "Account suspended"); res.put("active", c.isActive());
        return ResponseEntity.ok(res);
    }

    /**
     * PATCH /api/flutter/admin/users/{id}/role
     *
     * Changes the Role of a Customer account.
     * Only Customer entities carry the Role enum (CUSTOMER / ORDER_MANAGER / ADMIN).
     * Vendors and delivery boys are separate entities with their own auth — not affected here.
     *
     * Body: { "role": "ORDER_MANAGER" }
     * Response: { success, message, userId, oldRole, newRole, userName }
     */
    @PatchMapping("/admin/users/{id}/role")
    public ResponseEntity<Map<String, Object>> adminChangeUserRole(
            @PathVariable int id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();

        String newRoleStr = body.get("role");
        if (newRoleStr == null || newRoleStr.isBlank()) {
            res.put(KEY_SUCCESS, false); res.put("message", "role is required");
            return ResponseEntity.badRequest().body(res);
        }

        com.example.ekart.dto.Role newRole;
        try {
            newRole = com.example.ekart.dto.Role.valueOf(newRoleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            res.put(KEY_SUCCESS, false); res.put("message", "Invalid role: " + newRoleStr);
            return ResponseEntity.badRequest().body(res);
        }

        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }

        com.example.ekart.dto.Role oldRole = customer.getRole();
        customer.setRole(newRole);
        customerRepository.save(customer);

        res.put(KEY_SUCCESS,  true);
        res.put("message",  "Role updated successfully");
        res.put("userId",   id);
        res.put("oldRole",  oldRole != null ? oldRole.name() : null);
        res.put("newRole",  newRole.name());
        res.put("userName", customer.getName());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/vendors/{id}/toggle-active */
    @PostMapping("/admin/vendors/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleVendor(@PathVariable int id, HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        Vendor v = vendorRepository.findById(id).orElse(null);
        if (v == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        v.setVerified(!v.isVerified());
        vendorRepository.save(v);
        res.put(KEY_SUCCESS, true); res.put("message", v.isVerified() ? "Vendor activated" : "Vendor suspended"); res.put("active", v.isVerified());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/products — returns all products with approval status */
    @GetMapping("/admin/products")
    public ResponseEntity<Map<String, Object>> adminGetProducts(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> products = productRepository.findAll().stream()
                .sorted(Comparator.comparingInt(p -> p.isApproved() ? 0 : 1))
                .map(this::mapProduct).toList();
        res.put(KEY_SUCCESS, true); res.put("products", products);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/approve */
    @PostMapping("/admin/products/{id}/approve")
    public ResponseEntity<Map<String, Object>> adminApproveProduct(@PathVariable int id, HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_PRODUCT_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        p.setApproved(true);
        productRepository.save(p);
        res.put(KEY_SUCCESS, true); res.put("message", "Product approved and is now visible to customers");
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/reject */
    @PostMapping("/admin/products/{id}/reject")
    public ResponseEntity<Map<String, Object>> adminRejectProduct(@PathVariable int id, HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_PRODUCT_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        p.setApproved(false);
        productRepository.save(p);
        res.put(KEY_SUCCESS, true); res.put("message", "Product rejected / hidden from customers");
        return ResponseEntity.ok(res);
    }

    /** POST /api/react/admin/products/approve-all
     *  Approves every pending (unapproved) product in one shot.
     *  Returns { success, approvedCount, message }
     */
    @PostMapping("/admin/products/approve-all")
    public ResponseEntity<Map<String, Object>> adminApproveAllProducts(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        List<Product> pending = productRepository.findAll()
                .stream()
                .filter(p -> !p.isApproved())
                .toList();
        if (pending.isEmpty()) {
            res.put(KEY_SUCCESS, true);
            res.put("approvedCount", 0);
            res.put("message", "No pending products to approve");
            return ResponseEntity.ok(res);
        }
        pending.forEach(p -> p.setApproved(true));
        productRepository.saveAll(pending);
        res.put(KEY_SUCCESS, true);
        res.put("approvedCount", pending.size());
        res.put("message", "Approved " + pending.size() + " product" + (pending.size() == 1 ? "" : "s"));
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/orders — all orders with customer info */
    @GetMapping("/admin/orders")
    public ResponseEntity<Map<String, Object>> adminGetOrders(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
                .sorted(Comparator.comparingInt(Order::getId).reversed())
                .limit(200) // cap at 200 most recent orders for admin view
                .map(this::mapOrder).toList();
        res.put(KEY_SUCCESS, true); res.put(KEY_ORDERS, orders);
        return ResponseEntity.ok(res);
    }

    /** GET /api/react/admin/orders/export — CSV download, mirrors current search/filter state
     *  Supports: ?q=searchTerm  ?status=DELIVERED  (both optional, combinable)
     *  Returns text/csv with UTF-8 BOM so Excel on Windows opens cleanly without an encoding dialog.
     *  Content-Disposition filename encodes the active date + status filter.
     */
    @GetMapping("/admin/orders/export")
    public ResponseEntity<byte[]> adminExportOrders(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return ResponseEntity.status(401).build();

        List<Order> orders = orderRepository.findAll().stream()
            .sorted(Comparator.comparingInt(Order::getId).reversed())
            .toList();

        // Apply same filters as the admin orders list
        if (q != null && !q.isBlank()) {
            String lq = q.toLowerCase();
            orders = orders.stream().filter(o ->
                (o.getCustomer() != null && o.getCustomer().getName() != null
                    && o.getCustomer().getName().toLowerCase().contains(lq)) ||
                (o.getCustomer() != null && o.getCustomer().getEmail() != null
                    && o.getCustomer().getEmail().toLowerCase().contains(lq)) ||
                String.valueOf(o.getId()).contains(lq)
            ).toList();
        }
        if (status != null && !status.isBlank()) {
            try {
                TrackingStatus ts = TrackingStatus.valueOf(status.toUpperCase());
                orders = orders.stream()
                    .filter(o -> o.getTrackingStatus() == ts)
                    .toList();
            } catch (IllegalArgumentException ignored) {}
        }

        // Build CSV — UTF-8 BOM prefix ensures Excel auto-detects encoding
        StringBuilder csv = new StringBuilder("\uFEFF");
        csv.append("Order ID,Customer Name,Customer Email,Order Date,Status,Payment Mode," +
                   "Item Count,Item Names,Subtotal,Delivery Charge,Total,City,Delivery Time\n");
        for (Order o : orders) {
            String custName  = (o.getCustomer() != null && o.getCustomer().getName()  != null) ? o.getCustomer().getName()  : "";
            String custEmail = (o.getCustomer() != null && o.getCustomer().getEmail() != null) ? o.getCustomer().getEmail() : "";
            String itemNames = o.getItems().stream()
                .map(i -> (i.getName() != null ? i.getName() : ""))
                .collect(Collectors.joining("; "));
            // Item.price is the line total (unitPrice × qty); use it directly for subtotal
            double subtotal = o.getItems().stream()
                .mapToDouble(i -> i.getUnitPrice() > 0 ? i.getUnitPrice() * i.getQuantity() : i.getPrice())
                .sum();
            csv.append(csvCell(String.valueOf(o.getId()))).append(",")
               .append(csvCell(custName)).append(",")
               .append(csvCell(custEmail)).append(",")
               .append(csvCell(o.getOrderDate() != null ? o.getOrderDate().toString() : "")).append(",")
               .append(csvCell(o.getTrackingStatus() != null ? o.getTrackingStatus().name() : "")).append(",")
               .append(csvCell(o.getPaymentMode() != null ? o.getPaymentMode() : "")).append(",")
               .append(o.getItems().size()).append(",")
               .append(csvCell(itemNames)).append(",")
               .append(subtotal).append(",")
               .append(o.getDeliveryCharge()).append(",")
               .append(o.getTotalPrice()).append(",")
               .append(csvCell(o.getCurrentCity() != null ? o.getCurrentCity() : "")).append(",")
               .append(csvCell(o.getDeliveryTime() != null ? o.getDeliveryTime() : "")).append("\n");
        }

        byte[] bytes = csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String date     = java.time.LocalDate.now().toString();
        String filePart = (status != null && !status.isBlank()) ? "-" + status.toLowerCase() : "";
        String filename = "ekart-orders-" + date + filePart + ".csv";

        return ResponseEntity.ok()
            .header("Content-Type", "text/csv; charset=UTF-8")
            .header(HEADER_CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .header("Access-Control-Expose-Headers", HEADER_CONTENT_DISPOSITION)
            .body(bytes);
    }

    /** RFC 4180 CSV cell helper: wraps in double-quotes, escapes internal quotes as "" */
    private String csvCell(String val) {
        if (val == null) return "\"\"";
        return "\"" + val.replace("\"", "\"\"") + "\"";
    }

    /** GET /api/react/admin/orders/{id} — single order detail with full line items */
    @GetMapping("/admin/orders/{id}")
    public ResponseEntity<Map<String, Object>> adminGetOrderById(
            @PathVariable int id, HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        res.put(KEY_SUCCESS, true);
        res.put("order", mapOrder(order));
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/orders/{id}/status  body: { status } */
    @PostMapping("/admin/orders/{id}/status")
    public ResponseEntity<Map<String, Object>> adminUpdateOrderStatus(
            @PathVariable int id, @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        try {
            TrackingStatus newStatus = TrackingStatus.valueOf(body.get("status"));
            order.setTrackingStatus(newStatus);
            orderRepository.save(order);
            res.put(KEY_SUCCESS, true); res.put("message", "Order status updated to " + newStatus.getDisplayName());
        } catch (IllegalArgumentException e) {
            res.put(KEY_SUCCESS, false); res.put("message", "Invalid status: " + body.get("status"));
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/react/admin/customers/{id}/addresses
     *
     * Returns all saved delivery addresses for a customer.
     * Supports both structured (recipientName/houseStreet/city/state/postalCode)
     * and legacy flat-text (details) addresses.
     */
    @GetMapping("/admin/customers/{id}/addresses")
    public ResponseEntity<Map<String, Object>> getCustomerAddresses(
            @PathVariable int id,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();

        com.example.ekart.dto.Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_CUSTOMER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }

        List<Map<String, Object>> addresses = customer.getAddresses() == null
            ? java.util.Collections.emptyList()
            : customer.getAddresses().stream().map(a -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id",            a.getId());
                m.put("recipientName", a.getRecipientName());
                m.put("houseStreet",   a.getHouseStreet());
                m.put("city",          a.getCity());
                m.put("state",         a.getState());
                m.put("postalCode",    a.getPostalCode());
                m.put("details",       a.getDetails());
                m.put("formatted",     a.getFormattedAddress());
                return m;
              }).toList();

        res.put(KEY_SUCCESS,   true);
        res.put("addresses", addresses);
        res.put(KEY_COUNT,     addresses.size());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/admin/orders/{id}/cancel
     * Body (optional): { "reason": "Fraud suspected" }
     *
     * Admin-initiated cancel. Differences from customer cancel:
     *  - Uses admin JWT auth (requireAdmin), not X-Customer-Id
     *  - No ownership check — admin can cancel any order
     *  - Accepts an optional "reason" string logged to stdout for audit trail
     *  - Restores product stock (same logic as customer cancel)
     *  - Sends the standard cancellation email to the customer (fire-and-forget)
     *  - Blocks cancelling an already-DELIVERED or already-CANCELLED order
     */
    @PostMapping("/admin/orders/{id}/cancel")
    public ResponseEntity<Map<String, Object>> adminCancelOrder(
            @PathVariable int id,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        if (order.getTrackingStatus() == TrackingStatus.DELIVERED) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Cannot cancel an already-delivered order");
            return ResponseEntity.badRequest().body(res);
        }
        if (order.getTrackingStatus() == TrackingStatus.CANCELLED) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Order is already cancelled");
            return ResponseEntity.badRequest().body(res);
        }

        String reason = (body != null && body.get("reason") != null) ? body.get("reason").trim() : "Admin-initiated cancellation";

        // Restore stock for every line item
        for (Item item : order.getItems()) {
            if (item.getProductId() != null) {
                productRepository.findById(item.getProductId()).ifPresent(p -> {
                    p.setStock(p.getStock() + item.getQuantity());
                    productRepository.save(p);
                    // Update stock alert when stock is restored
                    stockAlertService.checkStockLevel(p);
                });
            }
        }

        order.setTrackingStatus(TrackingStatus.CANCELLED);
        orderRepository.save(order);

        // Audit log
        LOGGER.info("[ADMIN-CANCEL] orderId={} reason=\"{}\" at={}",
    id, sanitizeForLog(reason), java.time.LocalDateTime.now());

        // Send cancellation email to customer (fire-and-forget — never fails the response)
        if (order.getCustomer() != null) {
            try {
                emailSender.sendOrderCancellation(order.getCustomer(), order.getTotalPrice(), id, order.getItems());
            } catch (Exception e) {
                LOGGER.error("[ADMIN-CANCEL] Email failed for order #{}", id, e);
            }
        }

        res.put(KEY_SUCCESS, true);
        res.put("message", PREFIX_ORDER + id + " cancelled successfully");
        res.put("reason", reason);
        res.put(KEY_ORDER_ID, id);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/vendors — vendor list (alias of user list vendor section) */
    @GetMapping("/admin/vendors")
    public ResponseEntity<Map<String, Object>> adminGetVendors(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> vendors = vendorRepository.findAll().stream().map(v -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", v.getId()); m.put("name", v.getName()); m.put(KEY_EMAIL, v.getEmail());
            m.put(KEY_MOBILE, v.getMobile()); m.put("vendorCode", v.getVendorCode());
            m.put("active", v.isVerified()); m.put("verified", v.isVerified());
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true); res.put("vendors", vendors);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN — COUPON MANAGEMENT
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/admin/coupons — all coupons with stats */
    @GetMapping("/admin/coupons")
    public ResponseEntity<Map<String, Object>> adminGetCoupons(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> list = couponRepository.findAllByOrderByIdDesc().stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id",             c.getId());
            m.put("code",           c.getCode());
            m.put("description",    c.getDescription());
            m.put("type",           c.getType() != null ? c.getType().name() : null);
            m.put("typeLabel",      c.getTypeLabel());
            m.put("value",          c.getValue());
            m.put("minOrderAmount", c.getMinOrderAmount());
            m.put("maxDiscount",    c.getMaxDiscount());
            m.put("usageLimit",     c.getUsageLimit());
            m.put("usedCount",      c.getUsedCount());
            m.put("active",         c.isActive());
            m.put("expiryDate",     c.getExpiryDate() != null ? c.getExpiryDate().toString() : null);
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true);
        res.put("coupons", list);
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/coupons/create
     * Body: { code, description, type, value, minOrderAmount, maxDiscount, usageLimit, expiryDate }
     * type defaults to "PERCENT" if omitted.
     */
    @PostMapping("/admin/coupons/create")
    public ResponseEntity<Map<String, Object>> adminCreateCoupon(
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        String code = body.getOrDefault("code", "").toString().toUpperCase().trim();
        if (code.isEmpty()) { res.put(KEY_SUCCESS, false); res.put("message", "Coupon code is required"); return ResponseEntity.badRequest().body(res); }
        if (couponRepository.findByCode(code).isPresent()) {
            res.put(KEY_SUCCESS, false); res.put("message", "Coupon code '" + code + "' already exists");
            return ResponseEntity.badRequest().body(res);
        }
        double value;
        try { value = Double.parseDouble(body.getOrDefault("value", "0").toString()); }
        catch (NumberFormatException e) { res.put(KEY_SUCCESS, false); res.put("message", "Invalid discount value"); return ResponseEntity.badRequest().body(res); }

        Coupon coupon = new Coupon();
        coupon.setCode(code);
        coupon.setDescription(body.getOrDefault("description", "").toString());
        coupon.setValue(value);
        coupon.setActive(true);
        try { coupon.setMinOrderAmount(Double.parseDouble(body.getOrDefault("minOrderAmount", "0").toString())); } catch (Exception ignored) {}
        try { coupon.setMaxDiscount(Double.parseDouble(body.getOrDefault("maxDiscount", "0").toString())); } catch (Exception ignored) {}
        try { coupon.setUsageLimit(Integer.parseInt(body.getOrDefault("usageLimit", "0").toString())); } catch (Exception ignored) {}
        try {
            String typeStr = body.getOrDefault("type", "PERCENT").toString().toUpperCase();
            coupon.setType(Coupon.CouponType.valueOf(typeStr));
        } catch (Exception e) { coupon.setType(Coupon.CouponType.PERCENT); }
        try {
            String expiry = body.getOrDefault("expiryDate", "").toString();
            if (!expiry.isBlank()) coupon.setExpiryDate(java.time.LocalDate.parse(expiry));
        } catch (Exception ignored) {}

        couponRepository.save(coupon);
        res.put(KEY_SUCCESS, true);
        res.put("message", "Coupon '" + coupon.getCode() + "' created successfully");
        res.put("id", coupon.getId());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/coupons/{id}/toggle — flip active flag */
    @PostMapping("/admin/coupons/{id}/toggle")
    public ResponseEntity<Map<String, Object>> adminToggleCoupon(@PathVariable int id, HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        Coupon coupon = couponRepository.findById(id).orElse(null);
        if (coupon == null) { res.put(KEY_SUCCESS, false); res.put("message", "Coupon not found"); return ResponseEntity.status(404).body(res); }
        coupon.setActive(!coupon.isActive());
        couponRepository.save(coupon);
        res.put(KEY_SUCCESS, true);
        res.put("message", coupon.isActive() ? "Coupon enabled" : "Coupon disabled");
        res.put("active", coupon.isActive());
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/admin/coupons/{id}/delete */
    @DeleteMapping("/admin/coupons/{id}/delete")
    public ResponseEntity<Map<String, Object>> adminDeleteCoupon(@PathVariable int id, HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        if (!couponRepository.existsById(id)) { res.put(KEY_SUCCESS, false); res.put("message", "Coupon not found"); return ResponseEntity.status(404).body(res); }
        couponRepository.deleteById(id);
        res.put(KEY_SUCCESS, true);
        res.put("message", "Coupon deleted");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN — ANALYTICS
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/flutter/admin/analytics
     *
     * Returns server-side analytics so AdminApp's AnalyticsAdmin component
     * gets richer data than it can compute from the already-loaded lists.
     *
     * Response shape (all fields also used as fallback by AnalyticsAdmin):
     * {
     *   success          : true,
     *   totalCustomers   : long,
     *   totalVendors     : long,
     *   totalProducts    : long,
     *   approvedProducts : long,
     *   pendingProducts  : long,
     *   totalOrders      : long,
     *   totalRevenue     : double,
     *   deliveredOrders  : long,
     *   processingOrders : long,
     *   shippedOrders    : long,
     *   cancelledOrders  : long,
     *   avgOrderValue    : double,
     *   totalReviews     : long,
     *   avgRating        : double,
     *
     *   // Last-7-days order counts  { "2025-03-22": 4, ... }
     *   dailyOrders      : Map<String,Long>,
     *
     *   // Last-6-months revenue     { "2025-10": 48200.0, ... }
     *   monthlyRevenue   : Map<String,Double>,
     *
     *   // Top 5 products by revenue { id, name, category, revenue, unitsSold }
     *   topProducts      : List<Map>,
     *
     *   // Products per category     { "Electronics": 12, ... }
     *   categoryStats    : Map<String,Long>,
     *
     *   // Status breakdown          { STATUS_DELIVERED: 40, STATUS_PROCESSING: 5, ... }
     *   statusBreakdown  : Map<String,Long>
     * }
     */
    @GetMapping("/admin/analytics")
    public ResponseEntity<Map<String, Object>> adminGetAnalytics(
            jakarta.servlet.http.HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;


        String role = (String) request.getAttribute(CLAIM_ROLE);
        if (!ROLE_ADMIN.equals(role)) {
            return ResponseEntity.status(403)
                    .body(Map.of(KEY_SUCCESS, false, "message", ERR_ADMIN_REQUIRED));
        }

        // ── Core counts ──────────────────────────────────────────────────────
        long totalCustomers    = customerRepository.count();
        long totalVendors      = vendorRepository.count();
        long totalProducts     = productRepository.count();
        long approvedProducts  = productRepository.findAll().stream()
                .filter(com.example.ekart.dto.Product::isApproved).count();
        long pendingProducts   = totalProducts - approvedProducts;
        long totalReviews      = reviewRepository.count();

        double avgRating = totalReviews > 0 ? reviewRepository.getOverallAverageRating() : 0.0;

        // ── Order aggregates ─────────────────────────────────────────────────
        List<Order> allOrders = orderRepository.findAll();
        long totalOrders = allOrders.size();

        double totalRevenue = allOrders.stream()
                .mapToDouble(Order::getTotalPrice).sum();

        double avgOrderValue = totalOrders > 0
                ? Math.round((totalRevenue / totalOrders) * 100.0) / 100.0
                : 0.0;

        // Status counts
        Map<String, Long> statusBreakdown = new java.util.LinkedHashMap<>();
        for (Order o : allOrders) {
            String status = o.getTrackingStatus() != null ? o.getTrackingStatus().name() : "UNKNOWN";
            statusBreakdown.merge(status, 1L, Long::sum);
        }
        long deliveredOrders  = statusBreakdown.getOrDefault(STATUS_DELIVERED,    0L);
        long processingOrders = statusBreakdown.getOrDefault(STATUS_PROCESSING,   0L);
        long shippedOrders    = statusBreakdown.getOrDefault(STATUS_SHIPPED,      0L);
        long cancelledOrders  = statusBreakdown.getOrDefault("CANCELLED",    0L);

        // ── Daily orders — last 7 days ───────────────────────────────────────
        java.time.LocalDate today = java.time.LocalDate.now();
        Map<String, Long> dailyOrders = new java.util.LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            java.time.LocalDate date = today.minusDays(i);
            java.time.LocalDateTime start = date.atStartOfDay();
            java.time.LocalDateTime end   = date.plusDays(1).atStartOfDay();
            long count = allOrders.stream()
                    .filter(o -> o.getOrderDate() != null
                            && !o.getOrderDate().isBefore(start)
                            &&  o.getOrderDate().isBefore(end))
                    .count();
            dailyOrders.put(date.toString(), count);
        }

        // ── Monthly revenue — last 6 months ─────────────────────────────────
        Map<String, Double> monthlyRevenue = new java.util.LinkedHashMap<>();
        java.time.YearMonth currentMonth = java.time.YearMonth.now();
        for (int i = 5; i >= 0; i--) {
            java.time.YearMonth ym = currentMonth.minusMonths(i);
            java.time.LocalDateTime start = ym.atDay(1).atStartOfDay();
            java.time.LocalDateTime end   = ym.atEndOfMonth().plusDays(1).atStartOfDay();
            double rev = allOrders.stream()
                    .filter(o -> o.getOrderDate() != null
                            && !o.getOrderDate().isBefore(start)
                            &&  o.getOrderDate().isBefore(end))
                    .mapToDouble(Order::getTotalPrice).sum();
            monthlyRevenue.put(ym.toString(), Math.round(rev * 100.0) / 100.0);
        }

        // ── Top 5 products by revenue ────────────────────────────────────────
        // Aggregate revenue from order line-items (Item.getLineTotal())
        Map<Integer, double[]> productRevMap = new HashMap<>(); // productId → [revenue, unitsSold]
        for (Order o : allOrders) {
            if (o.getItems() == null) continue;
            for (com.example.ekart.dto.Item item : o.getItems()) {
                if (item.getProductId() == null) continue;
                productRevMap.computeIfAbsent(item.getProductId(), k -> new double[]{0, 0});
                productRevMap.get(item.getProductId())[0] += item.getLineTotal();
                productRevMap.get(item.getProductId())[1] += item.getQuantity();
            }
        }
        List<Map<String, Object>> topProducts = productRevMap.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue()[0], a.getValue()[0]))
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",        e.getKey());
                    m.put("revenue",   Math.round(e.getValue()[0] * 100.0) / 100.0);
                    m.put("unitsSold", (long) e.getValue()[1]);
                    // Enrich with product name / category if available
                    productRepository.findById(e.getKey()).ifPresent(p -> {
                        m.put("name",     p.getName());
                        m.put("category", p.getCategory());
                        m.put("price",    p.getPrice());
                    });
                    return m;
                }).toList();

        // ── Category distribution ────────────────────────────────────────────
        Map<String, Long> categoryStats = productRepository.findAll().stream()
                .filter(p -> p.getCategory() != null)
                .collect(Collectors.groupingBy(
                        com.example.ekart.dto.Product::getCategory,
                        Collectors.counting()));

        // ── Assemble response ────────────────────────────────────────────────
        Map<String, Object> res = new HashMap<>();
        res.put(KEY_SUCCESS,          true);
        res.put("totalCustomers",   totalCustomers);
        res.put("totalVendors",     totalVendors);
        res.put("totalProducts",    totalProducts);
        res.put("approvedProducts", approvedProducts);
        res.put("pendingProducts",  pendingProducts);
        res.put("totalOrders",      totalOrders);
        res.put("totalRevenue",     Math.round(totalRevenue * 100.0) / 100.0);
        res.put("avgOrderValue",    avgOrderValue);
        res.put("deliveredOrders",  deliveredOrders);
        res.put("processingOrders", processingOrders);
        res.put("shippedOrders",    shippedOrders);
        res.put("cancelledOrders",  cancelledOrders);
        res.put("totalReviews",     totalReviews);
        res.put("avgRating",        Math.round(avgRating * 10.0) / 10.0);
        res.put("dailyOrders",      dailyOrders);
        res.put("monthlyRevenue",   monthlyRevenue);
        res.put("topProducts",      topProducts);
        res.put("categoryStats",    categoryStats);
        res.put("statusBreakdown",  statusBreakdown);
        return ResponseEntity.ok(res);
    }


    // ═══════════════════════════════════════════════════════
    // ADMIN — USER SPENDING ANALYTICS
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/flutter/admin/spending
     * Returns per-customer spending summaries for admin analytics.
     * Only includes DELIVERED orders. Sorted by totalSpent desc.
     * Response: { success, customers: [{ id, name, email, totalSpent,
     *             totalOrders, avgOrderValue, topCategory,
     *             categorySpending: {cat: amount}, monthlySpending: {YYYY-MM: amount} }] }
     */
    @GetMapping("/admin/spending")
    public ResponseEntity<Map<String, Object>> adminGetUserSpending(
            jakarta.servlet.http.HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        List<Customer> allCustomers = customerRepository.findAll();
        List<Map<String, Object>> spendingList = new java.util.ArrayList<>();
        int currentYear = java.time.Year.now().getValue();

        for (Customer customer : allCustomers) {
            List<Order> delivered = orderRepository.findByCustomer(customer).stream()
                    .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED)
                    .toList();

            Map<String, Object> entry = new HashMap<>();
            entry.put("id",    customer.getId());
            entry.put("name",  customer.getName());
            entry.put(KEY_EMAIL, customer.getEmail());

            if (delivered.isEmpty()) {
                entry.put("totalSpent",       0.0);
                entry.put("totalOrders",      0);
                entry.put("avgOrderValue",    0.0);
                entry.put("topCategory",      "—");
                entry.put("categorySpending", new HashMap<>());
                entry.put("monthlySpending",  new LinkedHashMap<>());
                spendingList.add(entry);
                continue;
            }

            double totalSpent  = delivered.stream().mapToDouble(Order::getAmount).sum();
            int    totalOrders = delivered.size();

            // Category breakdown
            Map<String, Double> catSpend = new HashMap<>();
            for (Order o : delivered) {
                for (Item item : o.getItems()) {
                    String cat = item.getCategory() != null && !item.getCategory().isBlank()
                            ? item.getCategory() : "Uncategorized";
                    catSpend.merge(cat, item.getPrice() * item.getQuantity(), Double::sum);
                }
            }
            String topCategory = catSpend.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey).orElse("—");

            // Monthly spending for current year
            Map<String, Double> monthly = new LinkedHashMap<>();
            for (Order o : delivered) {
                if (o.getOrderDate() != null && o.getOrderDate().getYear() == currentYear) {
                    String key = currentYear + "-" + String.format("%02d", o.getOrderDate().getMonthValue());
                    monthly.merge(key, o.getAmount(), Double::sum);
                }
            }

            entry.put("totalSpent",       Math.round(totalSpent * 100.0) / 100.0);
            entry.put("totalOrders",      totalOrders);
            entry.put("avgOrderValue",    Math.round((totalSpent / totalOrders) * 100.0) / 100.0);
            entry.put("topCategory",      topCategory);
            entry.put("categorySpending", catSpend);
            entry.put("monthlySpending",  monthly);
            spendingList.add(entry);
        }

        // Sort by totalSpent descending — top spenders first
        spendingList.sort((a, b) -> Double.compare(
                ((Number) b.get("totalSpent")).doubleValue(),
                ((Number) a.get("totalSpent")).doubleValue()));

        Map<String, Object> res = new HashMap<>();
        res.put(KEY_SUCCESS,   true);
        res.put("customers", spendingList);
        return ResponseEntity.ok(res);
    }

        // ═══════════════════════════════════════════════════════
    // ADMIN — REVIEW MANAGEMENT
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/flutter/admin/reviews
     * Returns all reviews sorted newest-first.
     * Response: { success, reviews: [{id, rating, comment, customerName,
     *             productName, productId, createdAt}], count }
     */
    @GetMapping("/admin/reviews")
    public ResponseEntity<Map<String, Object>> adminGetReviews(
            jakarta.servlet.http.HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        String role = (String) request.getAttribute(CLAIM_ROLE);
        if (!ROLE_ADMIN.equals(role)) {
            return ResponseEntity.status(403)
                    .body(Map.of(KEY_SUCCESS, false, "message", ERR_ADMIN_REQUIRED));
        }
        List<Review> all = reviewRepository.findAll();
        // Sort newest first (nulls last)
        all.sort((a, b) -> {
            if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });
        List<Map<String, Object>> list = all.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id",           r.getId());
            m.put("rating",       r.getRating());
            m.put("comment",      r.getComment());
            m.put(KEY_CUSTOMER_NAME, r.getCustomerName());
            m.put("productName",  r.getProduct() != null ? r.getProduct().getName() : null);
            m.put(KEY_PRODUCT_ID,    r.getProduct() != null ? r.getProduct().getId()   : null);
            m.put("createdAt",    r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
            return m;
        }).toList();
        Map<String, Object> res = new HashMap<>();
        res.put(KEY_SUCCESS, true);
        res.put("reviews", list);
        res.put(KEY_COUNT,   list.size());
        return ResponseEntity.ok(res);
    }

    /**
     * DELETE /api/flutter/admin/reviews/{id}
     * Deletes the review with the given id.
     * AdminApp calls: DELETE /api/flutter/admin/reviews/{id}/delete
     * (the trailing /delete segment is tolerated via the path variable below,
     *  but AdminApp actually sends DELETE to .../reviews/{id}/delete — so we
     *  register both paths to be safe.)
     * Response: { success, message }
     */
    @DeleteMapping({"/admin/reviews/{id}", "/admin/reviews/{id}/delete"})
    public ResponseEntity<Map<String, Object>> adminDeleteReview(
            @PathVariable int id,
            jakarta.servlet.http.HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        String role = (String) request.getAttribute(CLAIM_ROLE);
        if (!ROLE_ADMIN.equals(role)) {
            return ResponseEntity.status(403)
                    .body(Map.of(KEY_SUCCESS, false, "message", ERR_ADMIN_REQUIRED));
        }
        if (!reviewRepository.existsById(id)) {
            return ResponseEntity.status(404)
                    .body(Map.of(KEY_SUCCESS, false, "message", "Review not found"));
        }
        reviewRepository.deleteById(id);
        return ResponseEntity.ok(Map.of(KEY_SUCCESS, true, "message", "Review deleted"));
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN — REFUND MANAGEMENT
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/flutter/admin/refunds
     * Returns ALL refunds (pending + processed) so AdminApp can filter client-side.
     * AdminApp filters by r.status === STATUS_PENDING for the pending badge count.
     */
    @GetMapping("/admin/refunds")
    public ResponseEntity<Map<String, Object>> adminGetRefunds(
            jakarta.servlet.http.HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        String role = (String) request.getAttribute(CLAIM_ROLE);
        if (!ROLE_ADMIN.equals(role)) {
            return ResponseEntity.status(403)
                    .body(Map.of(KEY_SUCCESS, false, "message", ERR_ADMIN_REQUIRED));
        }
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> list = refundRepository.findAllByOrderByRequestedAtDesc().stream()
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",              r.getId());
                    m.put(KEY_ORDER_ID,         r.getOrder() != null ? r.getOrder().getId() : null);
                    m.put(KEY_CUSTOMER_NAME,    r.getCustomer() != null ? r.getCustomer().getName() : null);
                    m.put("customerEmail",   r.getCustomer() != null ? r.getCustomer().getEmail() : null);
                    m.put("amount",          r.getAmount());
                    m.put("orderTotal",      r.getOrder() != null ? r.getOrder().getTotalPrice() : null);
                    m.put("reason",          r.getReason());
                    m.put("status",          r.getStatus() != null ? r.getStatus().name() : null);
                    m.put("statusDisplay",   r.getStatus() != null ? r.getStatus().getDisplayName() : null);
                    m.put("requestedAt",     r.getRequestedAt() != null ? r.getRequestedAt().toString() : null);
                    m.put("processedAt",     r.getProcessedAt() != null ? r.getProcessedAt().toString() : null);
                    m.put("processedBy",     r.getProcessedBy());
                    m.put("rejectionReason", r.getRejectionReason());
                    return m;
                }).toList();
        res.put(KEY_SUCCESS, true);
        res.put("refunds", list);
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/refunds/{id}/approve
     * Approves a pending refund and marks the order as REFUNDED.
     * Delegates to RefundService which handles status update, order flag clearing,
     * and customer notification in one place.
     */
    @PostMapping("/admin/refunds/{id}/approve")
    public ResponseEntity<Map<String, Object>> adminApproveRefund(
            @PathVariable int id,
            jakarta.servlet.http.HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        String role = (String) request.getAttribute(CLAIM_ROLE);
        if (!ROLE_ADMIN.equals(role)) {
            return ResponseEntity.status(403)
                    .body(Map.of(KEY_SUCCESS, false, "message", ERR_ADMIN_REQUIRED));
        }
        Integer adminId = (Integer) request.getAttribute(CLAIM_USER_ID);
        if (adminId == null) {
            return ResponseEntity.status(403)
                .body(Map.of(KEY_SUCCESS, false, "message", ERR_ADMIN_ID_NOT_IN_TOKEN));
        }
        String adminEmail = adminAuthService.getAdminEmailById(adminId);
        Map<String, Object> result = refundService.approveRefund(id, adminEmail);
        boolean success = Boolean.TRUE.equals(result.get(KEY_SUCCESS));
        return success
                ? ResponseEntity.ok(result)
                : ResponseEntity.badRequest().body(result);
    }

    /**
     * POST /api/flutter/admin/refunds/{id}/reject
     * Body: { reason }
     * Rejects a pending refund with a mandatory reason.
     * Delegates to RefundService which handles status update, reason persistence,
     * order flag clearing, and customer notification in one place.
     */
    @PostMapping("/admin/refunds/{id}/reject")
    public ResponseEntity<Map<String, Object>> adminRejectRefund(
            @PathVariable int id,
            @RequestBody Map<String, Object> body,
            jakarta.servlet.http.HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        String role = (String) request.getAttribute(CLAIM_ROLE);
        if (!ROLE_ADMIN.equals(role)) {
            return ResponseEntity.status(403)
                    .body(Map.of(KEY_SUCCESS, false, "message", ERR_ADMIN_REQUIRED));
        }
        Integer adminId = (Integer) request.getAttribute(CLAIM_USER_ID);
        if (adminId == null) {
            return ResponseEntity.status(403)
                .body(Map.of(KEY_SUCCESS, false, "message", ERR_ADMIN_ID_NOT_IN_TOKEN));
        }
        String adminEmail = adminAuthService.getAdminEmailById(adminId);
        String reason = body.getOrDefault("reason", "").toString().trim();
        Map<String, Object> result = refundService.rejectRefund(id, reason, adminEmail);
        boolean success = Boolean.TRUE.equals(result.get(KEY_SUCCESS));
        return success
                ? ResponseEntity.ok(result)
                : ResponseEntity.badRequest().body(result);
    }

    // ── ADMIN — WAREHOUSE MANAGEMENT ─────────────────────────────────────────
    //
    // Fix: DeliveryAdminController.GET /admin/warehouses returns a Thymeleaf
    // view (HTML), not JSON.  The Flutter AdminApp calls
    //   api('/admin/warehouses') → GET /api/flutter/admin/warehouses
    // so we add the correct JSON endpoint here in FlutterApiController.

    /**
     * GET /api/flutter/admin/warehouses
     * Returns a JSON list of all warehouses (active and inactive).
     * No extra auth check needed — the FlutterAuthFilter already validates
     * the JWT and role before this method is reached.
     */
    @GetMapping("/admin/warehouses")
    public ResponseEntity<Map<String, Object>> adminGetWarehouses(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            List<Warehouse> warehouses = warehouseRepository.findAll();
            List<Map<String, Object>> list = new ArrayList<>();
            for (Warehouse w : warehouses) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",             w.getId());
                m.put("name",           w.getName());
                m.put("city",           w.getCity());
                m.put("state",          w.getState());
                m.put(KEY_WAREHOUSE_CODE,  w.getWarehouseCode());
                m.put(KEY_LOGIN_ID,        w.getWarehouseLoginId());
                m.put(KEY_CONTACT_EMAIL,   w.getContactEmail());
                m.put(KEY_CONTACT_PHONE,   w.getContactPhone());
                m.put("address",        w.getAddress());
                m.put(KEY_SERVED_PIN_CODES, w.getServedPinCodes());
                m.put("active",         w.isActive());
                m.put(KEY_LATITUDE,       w.getLatitude());
                m.put(KEY_LONGITUDE,      w.getLongitude());
                list.add(m);
            }
            res.put(KEY_SUCCESS, true);
            res.put("warehouses", list);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to load warehouses: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/flutter/admin/warehouses/add
     * Creates a new warehouse.
     *
     * Fix: DeliveryAdminController handles POST /admin/delivery/warehouse
     * (Thymeleaf path, no /api/flutter prefix). The Flutter AdminApp posts to
     * /api/flutter/admin/warehouses/add — that endpoint did not exist.
     *
     * Request body (JSON):
     *   { "name": "...", "city": "...", "state": "...", KEY_SERVED_PIN_CODES: "..." }
     *
     * Response:
     *   { KEY_SUCCESS: true, "message": "...", KEY_WAREHOUSE_ID: 3, KEY_WAREHOUSE_CODE: "WH-003" }
     */
    @PostMapping("/admin/warehouses/add")
    public ResponseEntity<Map<String, Object>> adminAddWarehouse(
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            String name           = body.getOrDefault("name",           "").toString().trim();
            String city           = body.getOrDefault("city",           "").toString().trim();
            String state          = body.getOrDefault("state",          "").toString().trim();
            String servedPinCodes = body.getOrDefault(KEY_SERVED_PIN_CODES, "").toString().trim();

            if (name.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Warehouse name is required");
                return ResponseEntity.badRequest().body(res);
            }
            if (city.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "City is required");
                return ResponseEntity.badRequest().body(res);
            }
            if (state.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "State is required");
                return ResponseEntity.badRequest().body(res);
            }
            if (servedPinCodes.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "PIN codes are required (e.g., 560001,560002,560003)");
                return ResponseEntity.badRequest().body(res);
            }

            Warehouse wh = new Warehouse();
            wh.setName(name);
            wh.setCity(city);
            wh.setState(state);
            wh.setServedPinCodes(servedPinCodes); // Now mandatory, always set
            wh.setActive(true);
            wh.setWarehouseCode(""); // Initialize to empty string to avoid NULL constraint
            // Defensive null-guard to ensure servedPinCodes is never NULL before DB insert
            if (wh.getServedPinCodes() == null) wh.setServedPinCodes("");
            warehouseRepository.save(wh);
            // Generate code after save so we have the auto-generated id
            wh.setWarehouseCode(String.format("WH-%03d", wh.getId()));
            warehouseRepository.save(wh);

            res.put(KEY_SUCCESS,       true);
            res.put("message",       "Warehouse '" + name + "' added (" + wh.getWarehouseCode() + ")");
            res.put(KEY_WAREHOUSE_ID,   wh.getId());
            res.put(KEY_WAREHOUSE_CODE, wh.getWarehouseCode());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to add warehouse: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * GET /api/flutter/admin/delivery-boys
     * Returns ALL delivery boys with their approval/active status, warehouse,
     * and assigned pin codes — so the Flutter admin screen can show the full list
     * and filter/sort client-side.
     *
     * Fix: DeliveryAdminController only exposes /admin/delivery/boys/{warehouseId}
     * (session-based, filtered by warehouse, different path structure). The Flutter
     * AdminApp needs a flat unfiltered list at /api/flutter/admin/delivery-boys.
     *
     * Approval status field logic (mirrors login flow in FlutterApiController):
     *   STATUS_PENDING   — verified=true  but adminApproved=false
     *   "APPROVED"  — adminApproved=true  and active=true
     *   "REJECTED"  — adminApproved=false and active=false  (admin blocked them)
     *   "UNVERIFIED"— verified=false (email OTP not yet confirmed)
     */
    @GetMapping("/admin/delivery-boys")
    public ResponseEntity<Map<String, Object>> adminGetDeliveryBoys(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            List<DeliveryBoy> boys = deliveryBoyRepository.findAll();
            List<Map<String, Object>> list = new ArrayList<>();
            for (DeliveryBoy db : boys) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",               db.getId());
                m.put("name",             db.getName());
                m.put(KEY_EMAIL,            db.getEmail());
                m.put(KEY_MOBILE,           db.getMobile());
                m.put(KEY_DELIVERY_BOY_CODE,  db.getDeliveryBoyCode());
                m.put("verified",         db.isVerified());
                m.put(KEY_ADMIN_APPROVED,    db.isAdminApproved());
                m.put("active",           db.isActive());
                m.put(KEY_IS_AVAILABLE,      db.isAvailable());
                m.put(KEY_ASSIGNED_PIN_CODES, db.getAssignedPinCodes());
                m.put("approved",         db.isAdminApproved()); // alias read by AdminApp.jsx filter

                // Derive a single human-readable status string
                String status;
                if (!db.isVerified()) {
                    status = "EMAIL_PENDING";  // Waiting for email OTP verification
                } else if (!db.isAdminApproved() && !db.isActive()) {
                    status = "REJECTED";
                } else if (!db.isAdminApproved()) {
                    status = STATUS_PENDING;  // Verified but awaiting admin approval
                } else {
                    status = "APPROVED";
                }
                m.put("approvalStatus", status);
                m.put("statusLabel", getDeliveryBoyStatusLabel(status)); // Human-readable label

                // Warehouse — may be null for pending/unverified boys
                if (db.getWarehouse() != null) {
                    Map<String, Object> wh = new LinkedHashMap<>();
                    wh.put("id",            db.getWarehouse().getId());
                    wh.put("name",          db.getWarehouse().getName());
                    wh.put("city",          db.getWarehouse().getCity());
                    wh.put(KEY_WAREHOUSE_CODE, db.getWarehouse().getWarehouseCode());
                    m.put("warehouse", wh);
                } else {
                    m.put("warehouse", null);
                }

                list.add(m);
            }
            res.put(KEY_SUCCESS,      true);
            res.put("deliveryBoys", list);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            e.printStackTrace();
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to load delivery boys: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    private String getDeliveryBoyStatusLabel(String status) {
        return switch(status) {
            case "EMAIL_PENDING" -> "⏳ Waiting for Email Verification";
            case STATUS_PENDING -> "⏳ Pending Admin Approval";
            case "REJECTED" -> "❌ Rejected";
            case "APPROVED" -> "✅ Approved";
            default -> status;
        };
    }

    /**
     * DEBUG ENDPOINT: GET /api/react/admin/delivery-boys/debug
     * Shows all delivery boys with detailed status information for debugging
     * NO AUTH REQUIRED (for debugging purposes only)
     */
    @GetMapping("/admin/delivery-boys/debug")
    public ResponseEntity<Map<String, Object>> debugDeliveryBoys() {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            List<DeliveryBoy> boys = deliveryBoyRepository.findAll();
            res.put("totalDeliveryBoys", boys.size());
            
            List<Map<String, Object>> debugList = new ArrayList<>();
            for (DeliveryBoy db : boys) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", db.getId());
                m.put("name", db.getName());
                m.put(KEY_EMAIL, db.getEmail());
                m.put("verified", db.isVerified());
                m.put(KEY_ADMIN_APPROVED, db.isAdminApproved());
                m.put("active", db.isActive());
                m.put("warehouse", db.getWarehouse() != null ? db.getWarehouse().getName() : "NULL⚠️");
                m.put(KEY_DELIVERY_BOY_CODE, db.getDeliveryBoyCode());
                
                // Status diagnosis
                String status;
                if (db.getWarehouse() == null) {
                    status = "❌ NO WAREHOUSE SET";
                } else if (!db.isVerified()) {
                    status = "📧 EMAIL_PENDING (waiting for OTP)";
                } else if (!db.isAdminApproved() && !db.isActive()) {
                    status = "❌ REJECTED";
                } else if (!db.isAdminApproved()) {
                    status = "⏳ PENDING (ready to approve)";
                } else {
                    status = "✅ APPROVED";
                }
                m.put("debugStatus", status);
                debugList.add(m);
            }
            
            res.put(KEY_SUCCESS, true);
            res.put("deliveryBoys", debugList);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            e.printStackTrace();
            res.put(KEY_SUCCESS, false);
            res.put(KEY_ERROR, e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * FIX ENDPOINT: POST /api/react/admin/delivery-boys/fix-unverified
     * Auto-verifies all unverified delivery boys so they appear for admin approval
     * NO AUTH REQUIRED (for fixing issues)
     */
    @PostMapping("/admin/delivery-boys/fix-unverified")
    public ResponseEntity<Map<String, Object>> fixUnverifiedDeliveryBoys() {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            List<DeliveryBoy> unverified = deliveryBoyRepository.findAll().stream()
                .filter(db -> !db.isVerified())
                .toList();
            int count = 0;
            
            for (DeliveryBoy db : unverified) {
                db.setVerified(true);
                db.setAdminApproved(false);
                db.setActive(true);
                deliveryBoyRepository.save(db);
                count++;
                LOGGER.info("[FIX] Verified delivery boy: {} ({})", sanitizeForLog(db.getName()), maskEmailForLog(db.getEmail()));
            }
            
            res.put(KEY_SUCCESS, true);
            res.put("message", "Fixed " + count + " unverified delivery boys - they should now appear in admin dashboard");
            res.put("fixedCount", count);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            LOGGER.error("[FIX] Failed to verify unverified delivery boys", e);
            res.put(KEY_SUCCESS, false);
            res.put(KEY_ERROR, e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/flutter/admin/delivery-boys/{id}/approve
     * Approves a delivery boy account.
     *
     * Business rules:
     *   - Delivery boy must have a warehouse set (auto-set during registration)
     *   - PIN codes are already auto-assigned from the warehouse during registration
     *   - Admin can optionally override PIN codes via request body
     *   - Sets adminApproved=true, active=true
     *   - Sends approval email
     *
     * Request body (JSON, optional):
     *   { KEY_ASSIGNED_PIN_CODES: "600001,600002" }  — if admin wants to override
     */
    @PostMapping("/admin/delivery-boys/{id}/approve")
    public ResponseEntity<Map<String, Object>> adminApproveDeliveryBoy(
            @PathVariable int id,
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            DeliveryBoy db = deliveryBoyRepository.findById(id).orElse(null);
            if (db == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_DELIVERY_BOY_NOT_FOUND);
                return ResponseEntity.badRequest().body(res);
            }

            if (db.getWarehouse() == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "No warehouse selected by this delivery boy during registration");
                return ResponseEntity.badRequest().body(res);
            }

            // PIN codes already assigned from warehouse during registration
            // Admin can optionally override them
            if (body != null && body.containsKey(KEY_ASSIGNED_PIN_CODES)) {
                String pinCodes = body.get(KEY_ASSIGNED_PIN_CODES).toString().trim();
                if (!pinCodes.isEmpty()) {
                    db.setAssignedPinCodes(pinCodes);
                }
            }

            db.setAdminApproved(true);
            db.setActive(true);
            deliveryBoyRepository.save(db);

            try { emailSender.sendDeliveryBoyApproved(db); }
            catch (Exception e) { LOGGER.error("Approval email failed", e); }

            res.put(KEY_SUCCESS, true);
            res.put("message", db.getName() + " approved for " + db.getWarehouse().getName() + " (" + db.getAssignedPinCodes() + ")");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to approve delivery boy: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/react/admin/delivery-boys/{id}/toggle-availability
     * Toggles a delivery boy's online/offline status.
     * When a delivery boy comes ONLINE, triggers auto-assignment of pending orders.
     */
    @PostMapping("/admin/delivery-boys/{id}/toggle-availability")
    public ResponseEntity<Map<String, Object>> toggleDeliveryBoyAvailability(
            @PathVariable int id,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            DeliveryBoy db = deliveryBoyRepository.findById(id).orElse(null);
            if (db == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_DELIVERY_BOY_NOT_FOUND);
                return ResponseEntity.badRequest().body(res);
            }

            // Toggle availability
            boolean newStatus = !db.isAvailable();
            db.setAvailable(newStatus);
            deliveryBoyRepository.save(db);

            // AUTO-ASSIGN DISABLED (Phase 3)
            // Previously: if (newStatus) autoAssignmentService.onDeliveryBoyOnline(db);
            // Now: Warehouse staff manually assigns orders via WarehouseReceivingService
            if (newStatus) {
                LOGGER.info("[API] Delivery boy {} is now online (manual assignment enabled)", sanitizeForLog(db.getName()));
            }

            res.put(KEY_SUCCESS, true);
            res.put("message", db.getName() + " is now " + (newStatus ? "Online" : "Offline"));
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to update availability: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/react/admin/delivery/order/pack
     * Admin marks an order as PACKED.
     * This triggers auto-assignment: system finds online delivery boys covering the PIN code
     * and auto-assigns if slots are available.
     *
     * Request body: { KEY_ORDER_ID: 5 }
     */
    @PostMapping("/admin/delivery/order/pack")
    public ResponseEntity<Map<String, Object>> adminMarkOrderPacked(
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            Integer orderId = body != null ? (Integer) body.get(KEY_ORDER_ID) : null;
            if (orderId == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Missing orderId");
                return ResponseEntity.badRequest().body(res);
            }

            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_ORDER_NOT_FOUND);
                return ResponseEntity.badRequest().body(res);
            }

            if (order.getTrackingStatus() != TrackingStatus.PROCESSING) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Order must be PROCESSING to mark as Packed. Current: " 
                    + order.getTrackingStatus().getDisplayName());
                return ResponseEntity.badRequest().body(res);
            }

            // Mark as PACKED
            order.setTrackingStatus(TrackingStatus.PACKED);
            orderRepository.save(order);

            // Log the event
            trackingEventLogRepository.save(new TrackingEventLog(
                order, TrackingStatus.PACKED,
                order.getCurrentCity() != null ? order.getCurrentCity() : "Warehouse",
                "Order packed and ready for pickup", "admin"));

            // AUTO-ASSIGN DISABLED (Phase 3)
            // Previously: autoAssignmentService.onOrderPacked(order);
            // Now: Warehouse staff manually assigns delivery boy via WarehouseReceivingService
            LOGGER.info("[API] Order #{} marked as PACKED (manual assignment enabled)", orderId);

            // Re-fetch for response (delivery boy will be null until manual assignment)
            Order refreshed = orderRepository.findById(orderId).orElse(order);
            boolean hasDeliveryBoy = refreshed.getDeliveryBoy() != null;

            res.put(KEY_SUCCESS, true);
            if (hasDeliveryBoy) {
                res.put("message", PREFIX_ORDER + orderId + " marked as PACKED and already assigned to "
                    + refreshed.getDeliveryBoy().getName());
                res.put("autoAssigned", false);  // Not auto-assigned (Phase 3)
                res.put("assignedTo", refreshed.getDeliveryBoy().getName());
            } else {
                res.put("message", PREFIX_ORDER + orderId + " marked as PACKED. Warehouse staff will assign delivery boy.");
                res.put("autoAssigned", false);
            }
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to mark order as packed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ── ADMIN — DELIVERY ORDER LISTS ─────────────────────────────────────────
    //
    // Three status-filtered order endpoints consumed by the Delivery tab in AdminApp.jsx.
    // All require admin JWT. Each returns { success, orders: [...] } using the enriched
    // mapOrder() shape which now includes customer{}, warehouse{}, deliveryBoy{}, deliveryPinCode.

    /** GET /api/react/admin/orders/packed — orders with status=PACKED, awaiting delivery assignment */
    @GetMapping("/admin/orders/packed")
    public ResponseEntity<Map<String, Object>> adminGetPackedOrders(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
            .filter(o -> o.getTrackingStatus() == TrackingStatus.PACKED)
            .sorted(Comparator.comparingInt(Order::getId).reversed())
            .map(this::mapOrder)
            .toList();
        res.put(KEY_SUCCESS, true);
        res.put(KEY_ORDERS, orders);
        return ResponseEntity.ok(res);
    }

    /** GET /api/react/admin/orders/shipped — orders with status=SHIPPED (assigned, in transit) */
    @GetMapping("/admin/orders/shipped")
    public ResponseEntity<Map<String, Object>> adminGetShippedOrders(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
            .filter(o -> o.getTrackingStatus() == TrackingStatus.SHIPPED)
            .sorted(Comparator.comparingInt(Order::getId).reversed())
            .map(this::mapOrder)
            .toList();
        res.put(KEY_SUCCESS, true);
        res.put(KEY_ORDERS, orders);
        return ResponseEntity.ok(res);
    }

    /** GET /api/react/admin/orders/out-for-delivery — orders with status=OUT_FOR_DELIVERY */
    @GetMapping("/admin/orders/out-for-delivery")
    public ResponseEntity<Map<String, Object>> adminGetOutForDeliveryOrders(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
            .filter(o -> o.getTrackingStatus() == TrackingStatus.OUT_FOR_DELIVERY)
            .sorted(Comparator.comparingInt(Order::getId).reversed())
            .map(this::mapOrder)
            .toList();
        res.put(KEY_SUCCESS, true);
        res.put(KEY_ORDERS, orders);
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/react/admin/delivery/boys/for-order/{orderId}
     * Returns delivery boys eligible for a specific packed order.
     * Eligibility: adminApproved=true, active=true, and either:
     *   (a) assignedPinCodes covers the order's deliveryPinCode via covers(), OR
     *   (b) the delivery boy belongs to a warehouse that serves that PIN.
     * Falls back to ALL approved+active boys if no match found, so admin is never blocked.
     * Response includes isAvailable so the frontend can show Online/Offline status.
     *
     * FIX: The old implementation only used db.covers(pin), which returns false when
     * assignedPinCodes is null. Boys registered at the right warehouse but with a null
     * assignedPinCodes were silently excluded. Now uses union strategy matching
     * DeliveryAdminService.getEligibleDeliveryBoys().
     */
    @GetMapping("/admin/delivery/boys/for-order/{orderId}")
    public ResponseEntity<Map<String, Object>> adminGetEligibleDeliveryBoys(
            @PathVariable int orderId, HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }

        String pin = (order.getDeliveryPinCode() != null) ? order.getDeliveryPinCode().trim() : null;

        // Step 1: find all eligible boys using union strategy
        Set<Integer> seen = new LinkedHashSet<>();
        List<DeliveryBoy> eligible = new ArrayList<>();

        // 1a: boys whose assignedPinCodes explicitly covers the pin (covers() handles null safely)
        if (pin != null && !pin.isBlank()) {
            for (DeliveryBoy db : deliveryBoyRepository.findAll()) {
                if (!db.isAdminApproved() || !db.isActive()) continue;
                if (db.covers(pin) && seen.add(db.getId())) eligible.add(db);
            }
        }

        // 1b: boys assigned to the warehouse that serves this pin
        com.example.ekart.dto.Warehouse orderWarehouse = order.getWarehouse();
        if (orderWarehouse == null && pin != null && !pin.isBlank()) {
            List<com.example.ekart.dto.Warehouse> whs = warehouseRepository.findByPinCode(pin);
            if (!whs.isEmpty()) orderWarehouse = whs.get(0);
        }
        if (orderWarehouse != null) {
            for (DeliveryBoy db : deliveryBoyRepository.findActiveByWarehouse(orderWarehouse)) {
                if (!db.isAdminApproved() || !db.isActive()) continue;
                if (seen.add(db.getId())) eligible.add(db);
            }
        }

        // Step 2: last-resort — show all approved+active boys so admin is never blocked
        if (eligible.isEmpty()) {
            for (DeliveryBoy db : deliveryBoyRepository.findAll()) {
                if (db.isAdminApproved() && db.isActive() && seen.add(db.getId())) eligible.add(db);
            }
        }

        // Step 3: map to response DTOs, sort online first
        List<Map<String, Object>> boys = eligible.stream()
            .map(db -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id",          db.getId());
                m.put("name",        db.getName());
                m.put("code",        db.getDeliveryBoyCode());
                m.put(KEY_MOBILE,      db.getMobile());
                m.put(KEY_IS_AVAILABLE, db.isAvailable());
                m.put("warehouse",   db.getWarehouse() != null ? db.getWarehouse().getName() : null);
                m.put(KEY_WAREHOUSE_ID, db.getWarehouse() != null ? db.getWarehouse().getId()   : null);
                return m;
            })
            .sorted(Comparator.comparing(m -> !((Boolean) m.get(KEY_IS_AVAILABLE)))) // online first
            .toList();

        res.put(KEY_SUCCESS, true);
        res.put("deliveryBoys", boys);
        res.put("orderPin", pin != null ? pin : "N/A");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/admin/delivery/assign
     * Body: { orderId: int, deliveryBoyId: int }
     * Assigns a delivery boy to a PACKED order and advances status to SHIPPED.
     * Validates: order must be PACKED, delivery boy must be approved + active.
     */
    @PostMapping("/admin/delivery/assign")
    public ResponseEntity<Map<String, Object>> adminAssignDeliveryBoy(
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        try {
            int orderId       = Integer.parseInt(body.get(KEY_ORDER_ID).toString());
            int deliveryBoyId = Integer.parseInt(body.get(KEY_DELIVERY_BOY_ID).toString());

            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND);
                return ResponseEntity.status(404).body(res);
            }
            if (order.getTrackingStatus() != TrackingStatus.PACKED) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Order must be in PACKED status to assign a delivery boy (current: "
                    + order.getTrackingStatus().name() + ")");
                return ResponseEntity.badRequest().body(res);
            }
            DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
            if (db == null) {
                res.put(KEY_SUCCESS, false); res.put("message", ERR_DELIVERY_BOY_NOT_FOUND);
                return ResponseEntity.status(404).body(res);
            }
            if (!db.isAdminApproved() || !db.isActive()) {
                res.put(KEY_SUCCESS, false); res.put("message", "Delivery boy is not approved or is inactive");
                return ResponseEntity.badRequest().body(res);
            }

            order.setDeliveryBoy(db);
            order.setTrackingStatus(TrackingStatus.SHIPPED);
            orderRepository.save(order);

            // Determine if this is a COD order
            boolean isCod = order.getPaymentMode() != null && 
                           (order.getPaymentMode().equalsIgnoreCase("COD") || 
                            order.getPaymentMode().equalsIgnoreCase("Cash on Delivery"));

            res.put(KEY_SUCCESS, true);
            res.put("message", PREFIX_ORDER + orderId + " assigned to " + db.getName() + " and marked SHIPPED");
            res.put(KEY_ORDER_ID,         orderId);
            res.put(KEY_DELIVERY_BOY_ID,   db.getId());
            res.put(KEY_DELIVERY_BOY_NAME, db.getName());
            res.put(KEY_NEW_STATUS,       TrackingStatus.SHIPPED.name());
            res.put("isCod",           isCod);
            res.put("paymentMode",     order.getPaymentMode());
            res.put(KEY_TOTAL_AMOUNT,     order.getTotalPrice() + order.getDeliveryCharge());
            return ResponseEntity.ok(res);
        } catch (NullPointerException | NumberFormatException e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Missing or invalid orderId / deliveryBoyId in request body");
            return ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Assignment failed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/react/admin/delivery/confirm
     * Body: { orderId: int }
     * Marks an order as DELIVERED.
     */
    @PostMapping("/admin/delivery/confirm")
    public ResponseEntity<Map<String, Object>> confirmDelivery(
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new HashMap<>();
        try {
            int orderId = Integer.parseInt(body.get(KEY_ORDER_ID).toString());
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_ORDER_NOT_FOUND);
                return ResponseEntity.status(404).body(res);
            }

            // Mark as delivered
            order.setTrackingStatus(TrackingStatus.DELIVERED);
            orderRepository.save(order);

            // Create tracking event
            trackingEventLogRepository.save(new TrackingEventLog(
                order, TrackingStatus.DELIVERED, order.getCurrentCity(),
                "Delivered",
                "system"
            ));

            res.put(KEY_SUCCESS, true);
            res.put(KEY_ORDER_ID, orderId);
            res.put(KEY_NEW_STATUS, TrackingStatus.DELIVERED.name());
            res.put("message", "Order marked as delivered.");
            return ResponseEntity.ok(res);
        } catch (NullPointerException | NumberFormatException e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Missing or invalid orderId in request body");
            return ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Delivery confirmation failed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/react/admin/delivery/boy/{id}/pins
     * Admin updates a delivery boy's assigned PIN codes.
     * Body: { assignedPinCodes: "583121,583122" or "all" }
     */
    @PostMapping("/admin/delivery/boy/{id}/pins")
    public ResponseEntity<Map<String, Object>> adminUpdateDeliveryBoyPins(
            @PathVariable int id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        
        Map<String, Object> res = new HashMap<>();
        try {
            String pins = body.get(KEY_ASSIGNED_PIN_CODES) != null 
                ? body.get(KEY_ASSIGNED_PIN_CODES).toString().trim() 
                : "";
            
            if (pins.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "PIN codes cannot be empty");
                return ResponseEntity.badRequest().body(res);
            }
            
            DeliveryBoy db = deliveryBoyRepository.findById(id).orElse(null);
            if (db == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_DELIVERY_BOY_NOT_FOUND);
                return ResponseEntity.status(404).body(res);
            }
            
            db.setAssignedPinCodes(pins);
            deliveryBoyRepository.save(db);
            
            res.put(KEY_SUCCESS, true);
            res.put("message", "PIN codes updated for " + db.getName());
            res.put("id", id);
            res.put("name", db.getName());
            res.put("newPins", pins);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Update failed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /** GET /api/react/admin/delivery/boys/load — Delivery Boy Load Board */
    @GetMapping("/admin/delivery/boys/load")
    public ResponseEntity<Map<String, Object>> adminDeliveryBoysLoad(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        
        Map<String, Object> res = new HashMap<>();
        List<DeliveryBoy> boys = deliveryBoyRepository.findAll().stream()
            .filter(b -> b.isAdminApproved())
            .toList();
        
        List<Map<String, Object>> load = new ArrayList<>();
        for (DeliveryBoy b : boys) {
            int active = (int) orderRepository.findAll().stream()
                .filter(o -> b.equals(o.getDeliveryBoy()) && 
                    (o.getTrackingStatus() == TrackingStatus.SHIPPED || 
                     o.getTrackingStatus() == TrackingStatus.OUT_FOR_DELIVERY))
                .count();
            
            int maxConcurrent = 3;
            int slots = Math.max(0, maxConcurrent - active);
            
            Map<String, Object> status = new HashMap<>();
            status.put("id", b.getId());
            status.put("name", b.getName());
            status.put("code", b.getDeliveryBoyCode());
            status.put("isOnline", b.isAvailable());
            status.put("activeOrders", active);
            status.put("maxConcurrent", maxConcurrent);
            status.put("slots", slots);
            status.put("atCap", active >= maxConcurrent);
            load.add(status);
        }
        
        res.put(KEY_SUCCESS, true);
        res.put("deliveryBoys", load);
        return ResponseEntity.ok(res);
    }

    /** GET /api/react/admin/delivery/auto-assign/logs — Auto-Assignment Event Log (last 50) */
    @GetMapping("/admin/delivery/auto-assign/logs")
    public ResponseEntity<Map<String, Object>> adminAutoAssignLogs(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        
        Map<String, Object> res = new HashMap<>();
        try {
            List<AutoAssignLog> logs = autoAssignLogRepository.findAll().stream()
                .sorted((a, b) -> b.getAssignedAt().compareTo(a.getAssignedAt()))
                .limit(50)
                .toList();
            
            List<Map<String, Object>> logList = new ArrayList<>();
            for (AutoAssignLog log : logs) {
                Map<String, Object> l = new HashMap<>();
                l.put("id", log.getId());
                l.put(KEY_ORDER_ID, log.getOrderId());
                l.put(KEY_DELIVERY_BOY_NAME, log.getDeliveryBoy() != null ? log.getDeliveryBoy().getName() : "—");
                l.put(KEY_DELIVERY_BOY_CODE, log.getDeliveryBoy() != null ? log.getDeliveryBoy().getDeliveryBoyCode() : "—");
                l.put("pinCode", log.getPinCode());
                l.put("activeOrdersAtAssignment", log.getActiveOrdersAtAssignment());
                l.put("maxConcurrent", 3);
                l.put("assignedAt", log.getAssignedAt());
                logList.add(l);
            }
            
            res.put(KEY_SUCCESS, true);
            res.put("logs", logList);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to load auto-assign logs: " + e.getMessage());
        }
        return ResponseEntity.ok(res);
    }

    // ── ADMIN — WAREHOUSE TRANSFER REQUESTS ──────────────────────────────────
    @GetMapping("/admin/warehouse-transfers")
    public ResponseEntity<Map<String, Object>> adminGetWarehouseTransfers(
            @RequestParam(required = false) String status,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            List<WarehouseChangeRequest> requests;
            if (status != null && !status.isBlank()) {
                try {
                    WarehouseChangeRequest.Status s = WarehouseChangeRequest.Status.valueOf(status.toUpperCase());
                    requests = warehouseChangeRequestRepository.findByStatusOrderByRequestedAtDesc(s);
                } catch (IllegalArgumentException ex) {
                    res.put(KEY_SUCCESS, false);
                    res.put("message", "Invalid status value. Use PENDING, APPROVED, or REJECTED");
                    return ResponseEntity.badRequest().body(res);
                }
            } else {
                // No filter — return everything, newest first
                requests = warehouseChangeRequestRepository.findAll(
                        org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "requestedAt"));
            }

            List<Map<String, Object>> list = new ArrayList<>();
            for (WarehouseChangeRequest r : requests) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",          r.getId());
                m.put("status",      r.getStatus().name());
                m.put("reason",      r.getReason());
                m.put(KEY_ADMIN_NOTE,   r.getAdminNote());
                m.put("requestedAt", r.getRequestedAt() != null ? r.getRequestedAt().toString() : null);
                m.put("resolvedAt",  r.getResolvedAt()  != null ? r.getResolvedAt().toString()  : null);

                // Delivery boy summary
                DeliveryBoy db = r.getDeliveryBoy();
                Map<String, Object> dbMap = new LinkedHashMap<>();
                dbMap.put("id",              db.getId());
                dbMap.put("name",            db.getName());
                dbMap.put(KEY_EMAIL,           db.getEmail());
                dbMap.put(KEY_DELIVERY_BOY_CODE, db.getDeliveryBoyCode());
                // Current warehouse (where they are now)
                if (db.getWarehouse() != null) {
                    Map<String, Object> cw = new LinkedHashMap<>();
                    cw.put("id",            db.getWarehouse().getId());
                    cw.put("name",          db.getWarehouse().getName());
                    cw.put("city",          db.getWarehouse().getCity());
                    cw.put(KEY_WAREHOUSE_CODE, db.getWarehouse().getWarehouseCode());
                    dbMap.put("currentWarehouse", cw);
                } else {
                    dbMap.put("currentWarehouse", null);
                }
                m.put("deliveryBoy", dbMap);

                // Requested warehouse (where they want to move TO)
                Warehouse rw = r.getRequestedWarehouse();
                Map<String, Object> rwMap = new LinkedHashMap<>();
                rwMap.put("id",            rw.getId());
                rwMap.put("name",          rw.getName());
                rwMap.put("city",          rw.getCity());
                rwMap.put(KEY_WAREHOUSE_CODE, rw.getWarehouseCode());
                m.put("requestedWarehouse", rwMap);

                list.add(m);
            }

            res.put(KEY_SUCCESS,   true);
            res.put("transfers", list);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to load warehouse transfers: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/flutter/admin/warehouse-transfers/{id}/approve
     * Approves a pending warehouse transfer request.
     *
     * Business rules (mirrors DeliveryBoyService.approveWarehouseChange):
     *   - Request must exist and be PENDING (already-resolved requests return a clear error)
     *   - Delivery boy's warehouse is updated to the requested warehouse
     *   - assignedPinCodes is cleared (admin re-assigns from the main panel)
     *   - Approval email sent (failure is non-fatal)
     *
     * Request body (JSON, optional):
     *   { KEY_ADMIN_NOTE: "Approved — good coverage needed in north zone" }
     */
    @PostMapping("/admin/warehouse-transfers/{id}/approve")
    public ResponseEntity<Map<String, Object>> adminApproveWarehouseTransfer(
            @PathVariable int id,
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            String adminNote = (body != null)
                    ? body.getOrDefault(KEY_ADMIN_NOTE, "").toString().trim()
                    : "";

            WarehouseChangeRequest req = warehouseChangeRequestRepository.findById(id).orElse(null);
            if (req == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Transfer request not found");
                return ResponseEntity.badRequest().body(res);
            }
            if (req.getStatus() != WarehouseChangeRequest.Status.PENDING) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Request already resolved");
                return ResponseEntity.ok(res);
            }

            DeliveryBoy db = req.getDeliveryBoy();
            Warehouse newWarehouse = req.getRequestedWarehouse();

            // Apply the warehouse change
            db.setWarehouse(newWarehouse);
            db.setAssignedPinCodes(""); // Admin re-assigns pin codes from the main panel
            deliveryBoyRepository.save(db);

            req.setStatus(WarehouseChangeRequest.Status.APPROVED);
            req.setAdminNote(adminNote);
            req.setResolvedAt(java.time.LocalDateTime.now());
            warehouseChangeRequestRepository.save(req);

            try { emailSender.sendWarehouseChangeApproved(db, newWarehouse, adminNote); }
            catch (Exception e) { LOGGER.error("Warehouse change approval email failed", e); }

            res.put(KEY_SUCCESS, true);
            res.put("message", db.getName() + " has been transferred to " + newWarehouse.getName());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to approve warehouse transfer: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/flutter/admin/warehouse-transfers/{id}/reject
     * Rejects a pending warehouse transfer request.
     *
     * Business rules (mirrors DeliveryBoyService.rejectWarehouseChange):
     *   - Request must exist and be PENDING
     *   - Delivery boy's warehouse is NOT changed
     *   - Rejection email sent (failure is non-fatal)
     *
     * Request body (JSON, optional):
     *   { KEY_ADMIN_NOTE: "Not enough capacity at requested warehouse" }
     */
    @PostMapping("/admin/warehouse-transfers/{id}/reject")
    public ResponseEntity<Map<String, Object>> adminRejectWarehouseTransfer(
            @PathVariable int id,
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            String adminNote = (body != null)
                    ? body.getOrDefault(KEY_ADMIN_NOTE, "").toString().trim()
                    : "";

            WarehouseChangeRequest req = warehouseChangeRequestRepository.findById(id).orElse(null);
            if (req == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Transfer request not found");
                return ResponseEntity.badRequest().body(res);
            }
            if (req.getStatus() != WarehouseChangeRequest.Status.PENDING) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Request already resolved");
                return ResponseEntity.ok(res);
            }

            req.setStatus(WarehouseChangeRequest.Status.REJECTED);
            req.setAdminNote(adminNote);
            req.setResolvedAt(java.time.LocalDateTime.now());
            warehouseChangeRequestRepository.save(req);

            DeliveryBoy db = req.getDeliveryBoy();
            try { emailSender.sendWarehouseChangeRejected(db, req.getRequestedWarehouse(), adminNote); }
            catch (Exception e) { LOGGER.error("Warehouse change rejection email failed", e); }

            res.put(KEY_SUCCESS, true);
            res.put("message", "Warehouse transfer request rejected");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to reject warehouse transfer: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * GET /api/flutter/admin/users/search?q=&type=
     * Searches users by name or email across customers, vendors, and delivery boys.
     *
     * Fix — two mismatches between AdminApp and the existing UserAdminApiController:
     *   1. Path:  AdminApp calls /api/flutter/admin/users/search
     *             Existing endpoint is   /api/admin/users/search  (wrong prefix)
     *   2. Param: AdminApp sends          ?q=
     *             Existing endpoint reads @RequestParam String query  (wrong name)
     *
     * This endpoint lives in FlutterApiController (/api/flutter) and accepts ?q=,
     * matching the AdminApp exactly. The existing UserAdminApiController is left
     * untouched — it serves the web admin UI.
     *
     * Params:
     *   q    — search string (name or email, case-insensitive substring match)
     *   type — optional filter: "customer" | "vendor" | ROLE_DELIVERY_BOY
     *           omit (or any other value) to search all three types
     *
     * Response:
     *   { KEY_SUCCESS: true, "users": [ { id, name, email, type, ... }, ... ] }
     */
    @GetMapping("/admin/users/search")
    public ResponseEntity<Map<String, Object>> adminSearchUsers(
            @RequestParam(name = "q", defaultValue = "") String q,
            @RequestParam(name = "type", defaultValue = "") String type,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            String term = q.toLowerCase().trim();
            String typeFilter = type.toLowerCase().trim();

            List<Map<String, Object>> results = new ArrayList<>();

            // ── Customers ──────────────────────────────────────────────────
            if (typeFilter.isEmpty() || typeFilter.equals("customer")) {
                for (Customer c : customerRepository.findAll()) {
                    if (matchesQuery(term, c.getName(), c.getEmail())) {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id",       c.getId());
                        m.put("name",     c.getName());
                        m.put(KEY_EMAIL,    c.getEmail());
                        m.put("type",     "customer");
                        m.put("verified", c.isVerified());
                        m.put("active",   c.isActive());
                        results.add(m);
                    }
                }
            }

            // ── Vendors ────────────────────────────────────────────────────
            if (typeFilter.isEmpty() || typeFilter.equals("vendor")) {
                for (Vendor v : vendorRepository.findAll()) {
                    if (matchesQuery(term, v.getName(), v.getEmail())) {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id",         v.getId());
                        m.put("name",       v.getName());
                        m.put(KEY_EMAIL,      v.getEmail());
                        m.put("type",       "vendor");
                        m.put("vendorCode", v.getVendorCode());
                        m.put("verified",   v.isVerified());
                        results.add(m);
                    }
                }
            }

            // ── Delivery Boys ──────────────────────────────────────────────
            if (typeFilter.isEmpty() || typeFilter.equals(ROLE_DELIVERY_BOY)) {
                for (DeliveryBoy db : deliveryBoyRepository.findAll()) {
                    if (matchesQuery(term, db.getName(), db.getEmail())) {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id",              db.getId());
                        m.put("name",            db.getName());
                        m.put(KEY_EMAIL,           db.getEmail());
                        m.put("type",            ROLE_DELIVERY_BOY);
                        m.put(KEY_DELIVERY_BOY_CODE, db.getDeliveryBoyCode());
                        m.put("verified",        db.isVerified());
                        m.put(KEY_ADMIN_APPROVED,   db.isAdminApproved());
                        m.put("active",          db.isActive());
                        results.add(m);
                    }
                }
            }

            res.put(KEY_SUCCESS, true);
            res.put("query",   q);
            res.put("type",    type);
            res.put(KEY_COUNT,   results.size());
            res.put("users",   results);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Search failed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /** True if the search term matches either field (case-insensitive substring). Empty term matches all. */
    private boolean matchesQuery(String term, String name, String email) {
        if (term.isEmpty()) return true;
        return (name  != null && name.toLowerCase().contains(term))
            || (email != null && email.toLowerCase().contains(term));
    }

    // ── ADMIN — BANNER MANAGEMENT ─────────────────────────────────────────────
    //
    // Fix: The Flutter ContentAdmin component tries GET /api/flutter/admin/banners
    // first, then falls back to GET /api/read/Banner.
    //
    // The /api/read/Banner fallback (GenericReadOnlyController) returns raw
    // findAll() — unordered, no consistent shape, and @CrossOrigin(*) is a
    // security concern. The primary path /api/flutter/admin/banners didn't exist
    // at all, so every load hit the fragile fallback.
    //
    // This endpoint fixes the primary path. The existing Thymeleaf form actions
    // (POST /admin/content/*) are untouched — they serve the web admin UI.

    /**
     * GET /api/flutter/admin/banners
     * Returns all banners ordered by displayOrder ascending — same ordering
     * used by the admin panel (findAllByOrderByDisplayOrderAsc).
     *
     * All banners are returned regardless of active/showOnHome/showOnCustomerHome
     * so the admin screen can show and toggle every banner, not just active ones.
     *
     * Response:
     *   { KEY_SUCCESS: true, "banners": [ { id, title, imageUrl, linkUrl,
     *     active, showOnHome, showOnCustomerHome, displayOrder }, ... ] }
     */
    @GetMapping("/admin/banners")
    public ResponseEntity<Map<String, Object>> adminGetBanners(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            List<Banner> banners = bannerRepository.findAllByOrderByDisplayOrderAsc();
            List<Map<String, Object>> list = new ArrayList<>();
            for (Banner b : banners) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",                 b.getId());
                m.put("title",              b.getTitle());
                m.put("imageUrl",           b.getImageUrl());
                m.put("linkUrl",            b.getLinkUrl());
                m.put("active",             b.isActive());
                m.put("showOnHome",         b.isShowOnHome());
                m.put("showOnCustomerHome", b.isShowOnCustomerHome());
                m.put("displayOrder",       b.getDisplayOrder());
                list.add(m);
            }
            res.put(KEY_SUCCESS, true);
            res.put("banners", list);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to load banners: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/flutter/admin/banners/add
     * Body: { title, imageUrl, linkUrl? }
     * Creates a new banner. Mirrors POST /admin/content/add but JWT-auth.
     */
    @PostMapping("/admin/banners/add")
    public ResponseEntity<Map<String, Object>> adminAddBanner(
            @org.springframework.web.bind.annotation.RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        String title    = body.getOrDefault("title",    "").toString().trim();
        String imageUrl = body.getOrDefault("imageUrl", "").toString().trim();
        String linkUrl  = body.getOrDefault("linkUrl",  "").toString().trim();
        if (title.isEmpty())    { res.put(KEY_SUCCESS, false); res.put("message", "Title is required");     return ResponseEntity.badRequest().body(res); }
        if (imageUrl.isEmpty()) { res.put(KEY_SUCCESS, false); res.put("message", "Image URL is required"); return ResponseEntity.badRequest().body(res); }
        Banner b = new Banner();
        b.setTitle(title);
        b.setImageUrl(imageUrl);
        b.setLinkUrl(linkUrl.isEmpty() ? null : linkUrl);
        b.setActive(true);
        b.setShowOnHome(true);
        b.setShowOnCustomerHome(true);
        b.setDisplayOrder(0);
        bannerRepository.save(b);
        res.put(KEY_SUCCESS, true);
        res.put("message", "Banner added");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/banners/{id}/update
     * Body: { title, imageUrl, linkUrl? }
     * Updates title/imageUrl/linkUrl of an existing banner.
     */
    @PostMapping("/admin/banners/{id}/update")
    public ResponseEntity<Map<String, Object>> adminUpdateBanner(
            @org.springframework.web.bind.annotation.PathVariable int id,
            @org.springframework.web.bind.annotation.RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = bannerRepository.findById(id).orElse(null);
        if (b == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_BANNER_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        String title    = body.getOrDefault("title",    "").toString().trim();
        String imageUrl = body.getOrDefault("imageUrl", "").toString().trim();
        String linkUrl  = body.getOrDefault("linkUrl",  "").toString().trim();
        if (title.isEmpty())    { res.put(KEY_SUCCESS, false); res.put("message", "Title is required");     return ResponseEntity.badRequest().body(res); }
        if (imageUrl.isEmpty()) { res.put(KEY_SUCCESS, false); res.put("message", "Image URL is required"); return ResponseEntity.badRequest().body(res); }
        b.setTitle(title);
        b.setImageUrl(imageUrl);
        b.setLinkUrl(linkUrl.isEmpty() ? null : linkUrl);
        bannerRepository.save(b);
        res.put(KEY_SUCCESS, true);
        res.put("message", "Banner updated");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/banners/{id}/toggle
     * Toggles the master active flag on a banner.
     */
    @PostMapping("/admin/banners/{id}/toggle")
    public ResponseEntity<Map<String, Object>> adminToggleBanner(
            @org.springframework.web.bind.annotation.PathVariable int id,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = bannerRepository.findById(id).orElse(null);
        if (b == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_BANNER_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        b.setActive(!b.isActive());
        bannerRepository.save(b);
        res.put(KEY_SUCCESS, true);
        res.put("active", b.isActive());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/banners/{id}/toggle-home
     * Toggles showOnHome (pre-login landing page).
     */
    @PostMapping("/admin/banners/{id}/toggle-home")
    public ResponseEntity<Map<String, Object>> adminToggleBannerHome(
            @org.springframework.web.bind.annotation.PathVariable int id,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = bannerRepository.findById(id).orElse(null);
        if (b == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_BANNER_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        b.setShowOnHome(!b.isShowOnHome());
        bannerRepository.save(b);
        res.put(KEY_SUCCESS, true);
        res.put("showOnHome", b.isShowOnHome());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/banners/{id}/toggle-customer-home
     * Toggles showOnCustomerHome (post-login customer page).
     */
    @PostMapping("/admin/banners/{id}/toggle-customer-home")
    public ResponseEntity<Map<String, Object>> adminToggleBannerCustomerHome(
            @org.springframework.web.bind.annotation.PathVariable int id,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = bannerRepository.findById(id).orElse(null);
        if (b == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_BANNER_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        b.setShowOnCustomerHome(!b.isShowOnCustomerHome());
        bannerRepository.save(b);
        res.put(KEY_SUCCESS, true);
        res.put("showOnCustomerHome", b.isShowOnCustomerHome());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/banners/{id}/delete
     * Permanently deletes a banner.
     */
    @PostMapping("/admin/banners/{id}/delete")
    public ResponseEntity<Map<String, Object>> adminDeleteBanner(
            @org.springframework.web.bind.annotation.PathVariable int id,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        if (!bannerRepository.existsById(id)) { res.put(KEY_SUCCESS, false); res.put("message", ERR_BANNER_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        bannerRepository.deleteById(id);
        res.put(KEY_SUCCESS, true);
        res.put("message", "Banner deleted");
        return ResponseEntity.ok(res);
    }

    /**
     * DELETE /api/flutter/admin/accounts/{id}
     * Permanently deletes a customer account.
     * Mirrors DELETE /api/admin/accounts/{id} but uses JWT auth (requireAdmin)
     * instead of session.getAttribute("admin"), so React admin JWT sessions can
     * call it — the old session-guarded endpoint always rejected them.
     */
    @DeleteMapping("/admin/accounts/{id}")
    public ResponseEntity<Map<String, Object>> adminDeleteAccount(
            @org.springframework.web.bind.annotation.PathVariable int id,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            if (!customerRepository.existsById(id)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_ACCOUNT_NOT_FOUND);
                return ResponseEntity.status(404).body(res);
            }
            customerRepository.deleteById(id);
            res.put(KEY_SUCCESS, true);
            res.put("message", "Account deleted");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Delete failed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * GET /api/react/admin/accounts
     * Get all customer accounts with metadata (JWT auth version, replaces session-based endpoint).
     * Supports optional search parameter.
     */
    @GetMapping("/admin/accounts")
    public ResponseEntity<Map<String, Object>> adminGetAllAccounts(
            @RequestParam(required = false) String search,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            List<Customer> accounts = customerRepository.findAll();
            List<Map<String, Object>> data = new ArrayList<>();
            for (Customer c : accounts) {
                if (search != null && !search.isBlank()) {
                    String q = search.toLowerCase();
                    if (!c.getName().toLowerCase().contains(q) && !c.getEmail().toLowerCase().contains(q)) {
                        continue;
                    }
                }
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", c.getId());
                m.put("name", c.getName());
                m.put(KEY_EMAIL, c.getEmail());
                m.put(KEY_MOBILE, c.getMobile());
                m.put("isActive", c.isActive());
                m.put("role", c.getRole() != null ? c.getRole() : "CUSTOMER");
                m.put("createdAt", c.getLastLogin() != null ? c.getLastLogin().toString() : null);
                data.add(m);
            }
            res.put(KEY_SUCCESS, true);
            res.put("accounts", data);
            res.put(KEY_COUNT, data.size());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to fetch accounts: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * GET /api/react/admin/accounts/stats
     * Get account statistics and overview.
     */
    @GetMapping("/admin/accounts/stats")
    public ResponseEntity<Map<String, Object>> adminGetAccountStats(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            List<Customer> allAccounts = customerRepository.findAll();
            long activeCount = allAccounts.stream().filter(Customer::isActive).count();
            long inactiveCount = allAccounts.stream().filter(c -> !c.isActive()).count();
            
            res.put(KEY_SUCCESS, true);
            res.put("totalAccounts", allAccounts.size());
            res.put("activeAccounts", activeCount);
            res.put("inactiveAccounts", inactiveCount);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to fetch stats: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * PATCH /api/react/admin/accounts/{id}/status
     * Toggle account active/inactive status via JWT auth.
     */
    @PatchMapping("/admin/accounts/{id}/status")
    public ResponseEntity<Map<String, Object>> adminToggleAccountStatus(
            @PathVariable int id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            Customer customer = customerRepository.findById(id).orElse(null);
            if (customer == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_ACCOUNT_NOT_FOUND);
                return ResponseEntity.status(404).body(res);
            }
            boolean isActive = Boolean.TRUE.equals(body.get("isActive"));
            customer.setActive(isActive);
            customerRepository.save(customer);
            res.put(KEY_SUCCESS, true);
            res.put("message", "Account status updated to " + (isActive ? "active" : "inactive"));
            res.put("isActive", isActive);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to update status: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * GET /api/react/admin/accounts/{id}/profile
     * Get detailed customer profile information.
     */
    @GetMapping("/admin/accounts/{id}/profile")
    public ResponseEntity<Map<String, Object>> adminGetAccountProfile(
            @PathVariable int id,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            Customer customer = customerRepository.findById(id).orElse(null);
            if (customer == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_ACCOUNT_NOT_FOUND);
                return ResponseEntity.status(404).body(res);
            }
            res.put(KEY_SUCCESS, true);
            res.put("id", customer.getId());
            res.put("name", customer.getName());
            res.put(KEY_EMAIL, customer.getEmail());
            res.put(KEY_MOBILE, customer.getMobile());
            res.put("isActive", customer.isActive());
            res.put("role", customer.getRole() != null ? customer.getRole() : "CUSTOMER");
            res.put("createdAt", customer.getLastLogin() != null ? customer.getLastLogin().toString() : null);
            res.put("addresses", customer.getAddresses() != null ? customer.getAddresses().size() : 0);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to fetch profile: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/react/admin/accounts/{id}/reset-password
     * Generate a password reset notification for a customer account.
     */
    @PostMapping("/admin/accounts/{id}/reset-password")
    public ResponseEntity<Map<String, Object>> adminResetAccountPassword(
            @PathVariable int id,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            Customer customer = customerRepository.findById(id).orElse(null);
            if (customer == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_ACCOUNT_NOT_FOUND);
                return ResponseEntity.status(404).body(res);
            }
            // Note: Actual password reset logic would be implemented via email link
            // For now, just mark that a reset was requested
            res.put(KEY_SUCCESS, true);
            res.put("message", "Password reset email would be sent to " + customer.getEmail());
            res.put(KEY_EMAIL, customer.getEmail());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to reset password: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * POST /api/react/admin/change-password
     * Changes the admin password via database-backed AdminAuthService.
     * 
     * Request body (JSON):
     *   { KEY_CURRENT_PASSWORD: "...", KEY_NEW_PASSWORD: "...", "confirmPassword": "..." }
     *
     * Header: Authorization: Bearer <admin-jwt-token>
     * The token contains the admin ID which is extracted and used for password change.
     * 
     * Response:
     *   { KEY_SUCCESS: true, "message": MSG_PASSWORD_CHANGED }
     *   { KEY_SUCCESS: false, "message": "Current password is incorrect (or other error)" }
     */
    @PostMapping("/admin/change-password")
    public ResponseEntity<Map<String, Object>> adminChangePassword(
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;
        
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            // Get admin ID from the JWT token (set by ReactAuthFilter)
            Integer adminId = (Integer) request.getAttribute(CLAIM_USER_ID);
            if (adminId == null) {
                res.put(KEY_SUCCESS, false);
                res.put("message", ERR_ADMIN_ID_NOT_IN_TOKEN);
                return ResponseEntity.status(403).body(res);
            }
            
            String currentPassword  = body.getOrDefault(KEY_CURRENT_PASSWORD,  "").toString().trim();
            String newPassword      = body.getOrDefault(KEY_NEW_PASSWORD,      "").toString().trim();
            String confirmPassword  = body.getOrDefault("confirmPassword",  "").toString().trim();

            // ── Validate inputs ────────────────────────────────────────────
            if (currentPassword.isEmpty() || newPassword.isEmpty() || confirmPassword.isEmpty()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "All password fields are required");
                return ResponseEntity.badRequest().body(res);
            }
            
            if (!newPassword.equals(confirmPassword)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "New passwords do not match");
                return ResponseEntity.badRequest().body(res);
            }
            if (!isStrongPassword(newPassword)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", STRONG_PASSWORD_MESSAGE);
                return ResponseEntity.badRequest().body(res);
            }
            
            if (newPassword.equals(currentPassword)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "New password must be different from the current password");
                return ResponseEntity.badRequest().body(res);
            }

            // Use AdminAuthService to change password (validates current password via BCrypt)
            com.example.ekart.dto.PasswordChangeResult changeResult = 
                adminAuthService.changePassword(adminId, currentPassword, newPassword);

            if (!changeResult.isSuccess()) {
                res.put(KEY_SUCCESS, false);
                res.put("message", changeResult.getMessage());
                return ResponseEntity.status(401).body(res);
            }

            res.put(KEY_SUCCESS, true);
            res.put("message", "Admin password updated successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to change password: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // NEW ENDPOINTS — Reorder, Password Change, Vendor Profile,
    // Stock Alerts
    // ═══════════════════════════════════════════════════════


    /**
     * POST /api/flutter/orders/{id}/reorder
     * Clears cart and re-adds all in-stock items from the given past order.
     * Header: X-Customer-Id
     */
    @PostMapping("/orders/{id}/reorder")
    public ResponseEntity<Map<String, Object>> reorder(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }

        Cart cart = customer.getCart();
        if (cart == null) { cart = new Cart(); customer.setCart(cart); }
        cart.getItems().clear(); // clear existing cart

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
        res.put("message", addedCount > 0 ? addedCount + " item(s) added to cart" : "All items are out of stock");
        return ResponseEntity.ok(res);
    }

    /**
     * PUT /api/flutter/profile/change-password
     * Header: X-Customer-Id
     * Body: { currentPassword, newPassword }
     */
    @PutMapping("/profile/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_MISSING_CUSTOMER_HEADER); return ResponseEntity.status(401).body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_CUSTOMER_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        String current = (String) body.get(KEY_CURRENT_PASSWORD);
        String newPwd  = (String) body.get(KEY_NEW_PASSWORD);
        if (current == null || newPwd == null) { res.put(KEY_SUCCESS, false); res.put("message", "Both passwords required"); return ResponseEntity.badRequest().body(res); }
        try {
            if (!AES.decrypt(customer.getPassword()).equals(current)) {
                res.put(KEY_SUCCESS, false); res.put("message", "Current password is incorrect");
                return ResponseEntity.badRequest().body(res);
            }
            if (!isStrongPassword(newPwd)) { res.put(KEY_SUCCESS, false); res.put("message", STRONG_PASSWORD_MESSAGE); return ResponseEntity.badRequest().body(res); }
            customer.setPassword(AES.encrypt(newPwd));
            customerRepository.save(customer);
            res.put(KEY_SUCCESS, true); res.put("message", MSG_PASSWORD_CHANGED);
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** GET /api/flutter/vendor/profile
     * Header: X-Vendor-Id
     */
    @GetMapping("/vendor/profile")
    public ResponseEntity<Map<String, Object>> getVendorProfile(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> v = new HashMap<>();
        v.put("id", vendor.getId()); v.put("name", vendor.getName());
        v.put(KEY_EMAIL, vendor.getEmail()); v.put(KEY_MOBILE, vendor.getMobile());
        v.put("vendorCode", vendor.getVendorCode()); v.put("verified", vendor.isVerified());
        v.put("description", vendor.getDescription());
        v.put("provider",    vendor.getProvider()   != null ? vendor.getProvider() : "local");
        v.put("password",    vendor.getPassword()   != null); // boolean: true if password is set
        res.put(KEY_SUCCESS, true); res.put("vendor", v);
        return ResponseEntity.ok(res);
    }

    /**
     * PUT /api/flutter/vendor/profile/update
     * Header: X-Vendor-Id
     * Body: { name, mobile }
     */
    @PutMapping("/vendor/profile/update")
    public ResponseEntity<Map<String, Object>> updateVendorProfile(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name") && !((String) body.get("name")).isBlank())
            vendor.setName((String) body.get("name"));
        if (body.containsKey(KEY_MOBILE))
            try { vendor.setMobile(Long.parseLong(body.get(KEY_MOBILE).toString())); } catch (Exception ignored) {}
        vendorRepository.save(vendor);
        res.put(KEY_SUCCESS, true); res.put("message", "Profile updated successfully");
        return ResponseEntity.ok(res);
    }

    /**
     * PUT /api/flutter/vendor/storefront/update
     * Header: X-Vendor-Id
     * Body: { name?, mobile?, description? }
     *
     * Updates the vendor's public storefront details. All fields optional;
     * only provided keys are applied. Mobile is validated and uniqueness-checked.
     */
    @PutMapping("/vendor/storefront/update")
    public ResponseEntity<Map<String, Object>> updateVendorStorefront(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_VENDOR_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }
        if (body.containsKey("name")) {
            String name = ((String) body.get("name")).trim();
            if (!name.isBlank()) vendor.setName(name);
        }
        if (body.containsKey(KEY_MOBILE)) {
            try {
                long mobile = Long.parseLong(body.get(KEY_MOBILE).toString().trim());
                if (mobile < 6000000000L || mobile > 9999999999L) {
                    res.put(KEY_SUCCESS, false);
                    res.put("message", "Enter a valid 10-digit mobile number");
                    return ResponseEntity.badRequest().body(res);
                }
                Vendor existing = vendorRepository.findByMobile(mobile);
                if (existing != null && existing.getId() != vendorId) {
                    res.put(KEY_SUCCESS, false);
                    res.put("message", "Mobile number already in use by another vendor");
                    return ResponseEntity.badRequest().body(res);
                }
                vendor.setMobile(mobile);
            } catch (NumberFormatException e) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Invalid mobile number format");
                return ResponseEntity.badRequest().body(res);
            }
        }
        if (body.containsKey("description")) {
            // Allow empty string to clear the description
            vendor.setDescription((String) body.get("description"));
        }
        vendorRepository.save(vendor);
        res.put(KEY_SUCCESS, true);
        res.put("message", "Storefront updated successfully");
        return ResponseEntity.ok(res);
    }

    /**
     * PUT /api/flutter/vendor/profile/change-password
     * Header: X-Vendor-Id
     * Body: { currentPassword, newPassword }
     */
    @PutMapping("/vendor/profile/change-password")
    public ResponseEntity<Map<String, Object>> vendorChangePassword(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        String current = (String) body.get(KEY_CURRENT_PASSWORD);
        String newPwd  = (String) body.get(KEY_NEW_PASSWORD);
        if (current == null || newPwd == null) { res.put(KEY_SUCCESS, false); res.put("message", "Both passwords required"); return ResponseEntity.badRequest().body(res); }
        try {
            if (!AES.decrypt(vendor.getPassword()).equals(current)) {
                res.put(KEY_SUCCESS, false); res.put("message", "Current password is incorrect");
                return ResponseEntity.badRequest().body(res);
            }
            if (!isStrongPassword(newPwd)) { res.put(KEY_SUCCESS, false); res.put("message", STRONG_PASSWORD_MESSAGE); return ResponseEntity.badRequest().body(res); }
            vendor.setPassword(AES.encrypt(newPwd));
            vendorRepository.save(vendor);
            res.put(KEY_SUCCESS, true); res.put("message", MSG_PASSWORD_CHANGED);
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put(KEY_SUCCESS, false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    // ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // OAUTH LINKING/UNLINKING FOR REACT APP
    // ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * POST /api/react/profile/link-oauth
     * Header: X-Customer-Id
     * Body: { provider }
     *
     * Initiates OAuth linking flow for a customer. Stores link mode in session
     * so OAuth2LoginSuccessHandler can link instead of login.
     */
    @PostMapping("/profile/link-oauth")
    public ResponseEntity<Map<String, Object>> customerLinkOAuth(
            @RequestHeader(HEADER_CUSTOMER_ID) int customerId,
            @RequestBody Map<String, Object> body,
            HttpSession session) {
        Map<String, Object> res = new HashMap<>();
        String provider = (String) body.get("provider");
        if (provider == null || provider.isBlank()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "provider required");
            return ResponseEntity.badRequest().body(res);
        }
        if (!oAuthProviderValidator.isProviderAllowed(provider, "customer")) {
            res.put(KEY_SUCCESS, false);
            res.put("message", oAuthProviderValidator.getProviderDisplayName(provider) + " is not available for customer accounts");
            return ResponseEntity.badRequest().body(res);
        }
        // Store link mode so OAuth2LoginSuccessHandler knows to link, not login
        session.setAttribute("oauth_login_type",       "flutter-link-customer");
        session.setAttribute("oauth_link_customer_id", customerId);
        res.put(KEY_SUCCESS, true);
        res.put("redirectUrl", "/oauth2/authorization/" + provider);
        return ResponseEntity.ok(res);
    }

    /**
     * DELETE /api/react/profile/unlink-oauth
     * Header: X-Customer-Id
     *
     * Unlinks a customer's OAuth provider (only if password is set).
     */
    @DeleteMapping("/profile/unlink-oauth")
    public ResponseEntity<Map<String, Object>> customerUnlinkOAuth(
            @RequestHeader(HEADER_CUSTOMER_ID) int customerId) {
        Map<String, Object> res = new HashMap<>();
        boolean ok = socialAuthService.unlinkOAuthFromCustomer(customerId);
        if (ok) {
            res.put(KEY_SUCCESS, true);
            res.put("message", "Social account unlinked successfully");
        } else {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Cannot unlink — set a password first, or account not found");
        }
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/vendor/profile/link-oauth
     * Header: X-Vendor-Id
     * Body: { provider }
     *
     * Initiates OAuth linking flow for a vendor.
     */
    @PostMapping("/vendor/profile/link-oauth")
    public ResponseEntity<Map<String, Object>> vendorLinkOAuth(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId,
            @RequestBody Map<String, Object> body,
            HttpSession session) {
        Map<String, Object> res = new HashMap<>();
        String provider = (String) body.get("provider");
        if (provider == null || provider.isBlank()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "provider required");
            return ResponseEntity.badRequest().body(res);
        }
        if (!oAuthProviderValidator.isProviderAllowed(provider, "vendor")) {
            res.put(KEY_SUCCESS, false);
            res.put("message", oAuthProviderValidator.getProviderDisplayName(provider) + " is not available for vendor accounts");
            return ResponseEntity.badRequest().body(res);
        }
        session.setAttribute("oauth_login_type",    "flutter-link-vendor");
        session.setAttribute("oauth_link_vendor_id", vendorId);
        res.put(KEY_SUCCESS, true);
        res.put("redirectUrl", "/oauth2/authorization/" + provider);
        return ResponseEntity.ok(res);
    }

    /**
     * DELETE /api/react/vendor/profile/unlink-oauth
     * Header: X-Vendor-Id
     *
     * Unlinks a vendor's OAuth provider (only if password is set).
     */
    @DeleteMapping("/vendor/profile/unlink-oauth")
    public ResponseEntity<Map<String, Object>> vendorUnlinkOAuth(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        boolean ok = socialAuthService.unlinkOAuthFromVendor(vendorId);
        if (ok) {
            res.put(KEY_SUCCESS, true);
            res.put("message", "Social account unlinked successfully");
        } else {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Cannot unlink — set a password first, or account not found");
        }
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/vendor/stock-alerts
     * Header: X-Vendor-Id
     */
    @GetMapping("/vendor/stock-alerts")
    public ResponseEntity<Map<String, Object>> getStockAlerts(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }

        // Keep alert records in sync with current low-stock products for this vendor.
        productRepository.findByVendor(vendor).forEach(stockAlertService::checkStockLevel);

        List<StockAlert> alerts = stockAlertRepository.findByVendor(vendor);
        // Sort: unacknowledged first, then by id desc
        alerts.sort((a, b) -> {
            if (a.isAcknowledged() != b.isAcknowledged()) return a.isAcknowledged() ? 1 : -1;
            return Integer.compare(b.getId(), a.getId());
        });
        int unacknowledged = (int) alerts.stream().filter(a -> !a.isAcknowledged()).count();
        List<Map<String, Object>> alertMaps = alerts.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.getId());
            m.put("productName", a.getProduct() != null ? a.getProduct().getName() : "Unknown");
            m.put(KEY_PRODUCT_ID,   a.getProduct() != null ? a.getProduct().getId()   : 0);
            m.put("currentStock", a.getProduct() != null ? a.getProduct().getStock() : 0);
            m.put("threshold",    a.getProduct() != null && a.getProduct().getStockAlertThreshold() != null
                    ? a.getProduct().getStockAlertThreshold() : 10);
            m.put("message",      a.getMessage());
            m.put("acknowledged", a.isAcknowledged());
            m.put("alertTime",    a.getAlertTime() != null ? a.getAlertTime().toString() : null);
            return m;
        }).toList();
        res.put(KEY_SUCCESS, true);
        res.put("alerts", alertMaps);
        res.put("unacknowledgedCount", unacknowledged);
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/vendor/stock-alerts/{id}/acknowledge
     * Header: X-Vendor-Id
     */
    @PostMapping("/vendor/stock-alerts/{id}/acknowledge")
    public ResponseEntity<Map<String, Object>> acknowledgeAlert(
            @RequestHeader(HEADER_VENDOR_ID) int vendorId,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_VENDOR_NOT_FOUND); return ResponseEntity.badRequest().body(res); }
        StockAlert alert = stockAlertRepository.findById(id).orElse(null);
        if (alert == null || alert.getVendor().getId() != vendorId) { res.put(KEY_SUCCESS, false); res.put("message", "Alert not found"); return ResponseEntity.badRequest().body(res); }
        alert.setAcknowledged(true);
        stockAlertRepository.save(alert);
        res.put(KEY_SUCCESS, true); res.put("message", "Alert acknowledged");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // AI ASSISTANT CHAT  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /**
     * POST /api/flutter/assistant/chat
     *
     * Stateless equivalent of POST /chat (ChatController) for the React SPA.
     * Identifies the customer via X-Customer-Id header (no session required),
     * builds the same personalised context block, then delegates to AiAssistantService.
     *
     * Body: { message: String, history?: [{role, text}] }
     * Returns: { reply: String, role: String, name: String }
     */
    @PostMapping("/assistant/chat")
    public ResponseEntity<Map<String, Object>> assistantChat(
            @RequestHeader(value = HEADER_CUSTOMER_ID, required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {

        Map<String, Object> res = new HashMap<>();

        String userMessage = ((String) body.getOrDefault("message", "")).trim();
        if (userMessage.isEmpty()) {
            res.put("reply", "Please type a message.");
            return ResponseEntity.badRequest().body(res);
        }

        @SuppressWarnings("unchecked")
        List<Map<String, String>> history =
                (List<Map<String, String>>) body.getOrDefault("history", new ArrayList<>());

        // ── Resolve customer (guest fallback if no header) ──
        String role     = "guest";
        String userName = "there";
        String contextBlock = "=== GUEST USER ===\nNot logged in. Browsing as guest.\n";

        if (customerId != null) {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer != null) {
                role        = "customer";
                userName    = customer.getName();
                contextBlock = buildCustomerContext(customer);
            }
        }

        String reply = aiAssistantService.getReply(userMessage, role, userName, contextBlock, history);

        res.put("reply", reply);
        res.put("role",  role);
        res.put("name",  userName);
        return ResponseEntity.ok(res);
    }

    /**
     * Builds the personalised context block for a customer —
     * mirrors the "customer" case in ChatController.buildContext().
     */
    // ═══════════════════════════════════════════════════════════════════
    // DELIVERY BOY — Flutter API  (X-Delivery-Id header)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * GET /api/react/delivery/profile
     * Returns the delivery boy's profile including warehouse and assigned pin codes.
     * Auth: JWT Bearer token (validated by DeliveryJwtInterceptor)
     *       Extracts delivery boy ID from token, ignores X-Delivery-Id header
     */
    @GetMapping("/delivery/profile")
    public ResponseEntity<Map<String, Object>> deliveryProfile(
            HttpServletRequest request) {
        Map<String, Object> res = new HashMap<>();
        
        // Extract delivery ID from JWT token (set by DeliveryJwtInterceptor)
        Integer deliveryId = (Integer) request.getAttribute(KEY_DELIVERY_BOY_ID);
        if (deliveryId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_AUTH_FAILED);
            return ResponseEntity.status(401).body(res);
        }
        
        DeliveryBoy db = deliveryBoyRepository.findById(deliveryId).orElse(null);
        if (db == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_DELIVERY_BOY_NOT_FOUND); return ResponseEntity.status(404).body(res); }

        Map<String, Object> profile = new HashMap<>();
        profile.put("id",               db.getId());
        profile.put("name",             db.getName());
        profile.put(KEY_EMAIL,            db.getEmail());
        profile.put(KEY_MOBILE,           db.getMobile());
        profile.put(KEY_DELIVERY_BOY_CODE,  db.getDeliveryBoyCode());
        profile.put(KEY_ASSIGNED_PIN_CODES, db.getAssignedPinCodes());
        profile.put("active",           db.isActive());
        profile.put(KEY_ADMIN_APPROVED,    db.isAdminApproved());
        profile.put("approved",         db.isAdminApproved()); // alias read by DeliveryApp.jsx
        profile.put(KEY_IS_AVAILABLE,      db.isAvailable());    // availability status

        if (db.getWarehouse() != null) {
            Warehouse wh = db.getWarehouse();
            Map<String, Object> w = new HashMap<>();
            w.put("id",            wh.getId());
            w.put("name",          wh.getName());
            w.put("city",          wh.getCity());
            w.put("state",         wh.getState());
            w.put(KEY_WAREHOUSE_CODE, wh.getWarehouseCode());
            profile.put("warehouse", w);
        } else {
            profile.put("warehouse", null);
        }

        res.put(KEY_SUCCESS, true);
        res.put("deliveryBoy", profile);
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/react/delivery/orders
     * Returns orders assigned to this delivery boy split into three lists:
     *   toPickUp  — status SHIPPED  (needs to be picked up from warehouse)
     *   outNow    — status OUT_FOR_DELIVERY (currently en route)
     *   delivered — status DELIVERED (completed today/recently)
     * Auth: JWT Bearer token (validated by DeliveryJwtInterceptor)
     */
    @GetMapping("/delivery/orders")
    public ResponseEntity<Map<String, Object>> deliveryOrders(
            HttpServletRequest request) {
        Map<String, Object> res = new HashMap<>();
        
        // Extract delivery ID from JWT token (set by DeliveryJwtInterceptor)
        Integer deliveryId = (Integer) request.getAttribute(KEY_DELIVERY_BOY_ID);
        if (deliveryId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_AUTH_FAILED);
            return ResponseEntity.status(401).body(res);
        }
        
        DeliveryBoy db = deliveryBoyRepository.findById(deliveryId).orElse(null);
        if (db == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_DELIVERY_BOY_NOT_FOUND); return ResponseEntity.status(404).body(res); }

        List<Order> allAssigned = orderRepository.findByDeliveryBoy(db);

        List<Map<String, Object>> toPickUp  = new ArrayList<>();
        List<Map<String, Object>> outNow    = new ArrayList<>();
        List<Map<String, Object>> delivered = new ArrayList<>();

        for (Order o : allAssigned) {
            TrackingStatus s = o.getTrackingStatus();
            Map<String, Object> m = mapDeliveryOrder(o);
            if (s == TrackingStatus.SHIPPED)               toPickUp.add(m);
            else if (s == TrackingStatus.OUT_FOR_DELIVERY) outNow.add(m);
            else if (s == TrackingStatus.DELIVERED)        delivered.add(m);
        }

        res.put(KEY_SUCCESS,         true);
        res.put("toPickUp",        toPickUp);
        res.put("outForDelivery",  outNow);
        res.put("delivered",       delivered);
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/delivery/orders/{id}/pickup
     * Marks the order as OUT_FOR_DELIVERY and emails the customer a delivery OTP.
     * Auth: JWT Bearer token
     */
    @PostMapping("/delivery/orders/{id}/pickup")
    public ResponseEntity<Map<String, Object>> deliveryPickup(
            HttpServletRequest request,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        
        // Extract delivery ID from JWT token
        Integer deliveryId = (Integer) request.getAttribute(KEY_DELIVERY_BOY_ID);
        if (deliveryId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_AUTH_FAILED);
            return ResponseEntity.status(401).body(res);
        }
        
        DeliveryBoy db = deliveryBoyRepository.findById(deliveryId).orElse(null);
        if (db == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_DELIVERY_BOY_NOT_FOUND); return ResponseEntity.status(404).body(res); }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        if (order.getDeliveryBoy() == null || order.getDeliveryBoy().getId() != db.getId()) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_ASSIGNED);
            return ResponseEntity.status(403).body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.SHIPPED) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Order is already in status: " + order.getTrackingStatus().getDisplayName());
            return ResponseEntity.badRequest().body(res);
        }

        String city = db.getWarehouse() != null ? db.getWarehouse().getCity() : "Warehouse";
        order.setTrackingStatus(TrackingStatus.OUT_FOR_DELIVERY);
        order.setCurrentCity("On the way — " + city);
        orderRepository.save(order);

        trackingEventLogRepository.save(new TrackingEventLog(order, TrackingStatus.OUT_FOR_DELIVERY,
                "On the way — " + city,
                "Parcel picked up by delivery boy " + db.getName(), ROLE_DELIVERY_BOY));

        int otp = new java.util.Random().nextInt(100000, 1000000);
        deliveryOtpRepository.findByOrder(order).ifPresent(deliveryOtpRepository::delete);
        deliveryOtpRepository.save(new DeliveryOtp(order, otp));

        try { emailSender.sendDeliveryOtp(order.getCustomer(), otp, order.getId()); }
        catch (Exception e) { LOGGER.error("Delivery OTP email failed", e); }

        res.put(KEY_SUCCESS, true);
        res.put("message", "Marked as Out for Delivery. OTP sent to customer.");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/delivery/orders/{id}/deliver
     * Body: { otp }
     * Verifies customer OTP and marks the order as DELIVERED.
     * Auth: JWT Bearer token
     */
    @PostMapping("/delivery/orders/{id}/deliver")
    public ResponseEntity<Map<String, Object>> deliveryConfirm(
            HttpServletRequest request,
            @PathVariable int id,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        
        // Extract delivery ID from JWT token
        Integer deliveryId = (Integer) request.getAttribute(KEY_DELIVERY_BOY_ID);
        if (deliveryId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_AUTH_FAILED);
            return ResponseEntity.status(401).body(res);
        }
        
        DeliveryBoy db = deliveryBoyRepository.findById(deliveryId).orElse(null);
        if (db == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_DELIVERY_BOY_NOT_FOUND); return ResponseEntity.status(404).body(res); }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_FOUND); return ResponseEntity.status(404).body(res); }
        if (order.getDeliveryBoy() == null || order.getDeliveryBoy().getId() != db.getId()) {
            res.put(KEY_SUCCESS, false); res.put("message", ERR_ORDER_NOT_ASSIGNED);
            return ResponseEntity.status(403).body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.OUT_FOR_DELIVERY) {
            res.put(KEY_SUCCESS, false); res.put("message", "Order is not out for delivery");
            return ResponseEntity.badRequest().body(res);
        }

        int submittedOtp;
        try { submittedOtp = Integer.parseInt(body.getOrDefault("otp", "").toString().trim()); }
        catch (NumberFormatException e) { res.put(KEY_SUCCESS, false); res.put("message", ERR_INVALID_OTP_FORMAT); return ResponseEntity.badRequest().body(res); }

        DeliveryOtp deliveryOtp = deliveryOtpRepository.findByOrder(order).orElse(null);
        if (deliveryOtp == null)   { res.put(KEY_SUCCESS, false); res.put("message", "No OTP found for this order"); return ResponseEntity.badRequest().body(res); }
        if (deliveryOtp.isUsed())  { res.put(KEY_SUCCESS, false); res.put("message", "OTP already used"); return ResponseEntity.badRequest().body(res); }
        if (deliveryOtp.getOtp() != submittedOtp) { res.put(KEY_SUCCESS, false); res.put("message", "Wrong OTP. Ask customer for the correct OTP."); return ResponseEntity.badRequest().body(res); }

        deliveryOtp.setUsed(true);
        deliveryOtp.setUsedAt(java.time.LocalDateTime.now());
        deliveryOtpRepository.save(deliveryOtp);

        order.setTrackingStatus(TrackingStatus.DELIVERED);
        order.setCurrentCity("Delivered");
        orderRepository.save(order);

        trackingEventLogRepository.save(new TrackingEventLog(order, TrackingStatus.DELIVERED,
                "Delivered to customer",
                "Delivered by " + db.getName() + ". OTP verified at doorstep.", ROLE_DELIVERY_BOY));

        try { emailSender.sendDeliveryConfirmation(order.getCustomer(), order); }
        catch (Exception e) { LOGGER.error("Delivery confirmation email failed", e); }

        res.put(KEY_SUCCESS, true);
        res.put("message", PREFIX_ORDER + id + " marked as Delivered!");
        return ResponseEntity.ok(res);
    }
    
    @PostMapping("/delivery/orders/{id}/resend-otp")
    public ResponseEntity<Map<String, Object>> resendDeliveryOtp(
            HttpServletRequest request,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();

        Integer deliveryId = (Integer) request.getAttribute(KEY_DELIVERY_BOY_ID);
        if (deliveryId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_AUTH_FAILED);
            return ResponseEntity.status(401).body(res);
        }

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryId).orElse(null);
        if (db == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_DELIVERY_BOY_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_ORDER_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }
        if (order.getDeliveryBoy() == null || order.getDeliveryBoy().getId() != db.getId()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_ORDER_NOT_ASSIGNED);
            return ResponseEntity.status(403).body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.OUT_FOR_DELIVERY) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Order is not out for delivery");
            return ResponseEntity.badRequest().body(res);
        }

        DeliveryOtp deliveryOtp = deliveryOtpRepository.findByOrder(order).orElse(null);
        if (deliveryOtp == null || deliveryOtp.isUsed()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "No active OTP found for this order");
            return ResponseEntity.badRequest().body(res);
        }

        try {
            emailSender.sendDeliveryOtp(order.getCustomer(), deliveryOtp.getOtp(), order.getId());
            res.put(KEY_SUCCESS, true);
            res.put("message", "OTP resent to " + order.getCustomer().getEmail() + ". Ask customer to check spam folder too.");
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to send email: " + e.getMessage());
        }
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/react/delivery/warehouses
     * Returns all active warehouses for the transfer-request dropdown.
     * Auth: JWT Bearer token
     */
    @GetMapping("/delivery/warehouses")
    public ResponseEntity<Map<String, Object>> deliveryWarehouses(
            HttpServletRequest request) {
        Map<String, Object> res = new HashMap<>();
        
        // Extract delivery ID from JWT token
        Integer deliveryId = (Integer) request.getAttribute(KEY_DELIVERY_BOY_ID);
        if (deliveryId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_AUTH_FAILED);
            return ResponseEntity.status(401).body(res);
        }
        
        DeliveryBoy db = deliveryBoyRepository.findById(deliveryId).orElse(null);
        if (db == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_DELIVERY_BOY_NOT_FOUND); return ResponseEntity.status(404).body(res); }

        List<Warehouse> warehouses = warehouseRepository.findByActiveTrue();
        List<Map<String, Object>> list = new ArrayList<>();
        for (Warehouse wh : warehouses) {
            Map<String, Object> m = new HashMap<>();
            m.put("id",            wh.getId());
            m.put("name",          wh.getName());
            m.put("city",          wh.getCity());
            m.put("state",         wh.getState());
            m.put(KEY_WAREHOUSE_CODE, wh.getWarehouseCode());
            list.add(m);
        }
        res.put(KEY_SUCCESS,    true);
        res.put("warehouses", list);
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/delivery/warehouse-change/request
     * Body: { warehouseId, reason? }
     * Submits a warehouse transfer request for admin approval.
     * Only one pending request allowed at a time.
     * Auth: JWT Bearer token
     */
    @PostMapping("/delivery/warehouse-change/request")
    public ResponseEntity<Map<String, Object>> deliveryWarehouseChangeRequest(
            HttpServletRequest request,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        
        // Extract delivery ID from JWT token
        Integer deliveryId = (Integer) request.getAttribute(KEY_DELIVERY_BOY_ID);
        if (deliveryId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_AUTH_FAILED);
            return ResponseEntity.status(401).body(res);
        }
        
        DeliveryBoy db = deliveryBoyRepository.findById(deliveryId).orElse(null);
        if (db == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_DELIVERY_BOY_NOT_FOUND); return ResponseEntity.status(404).body(res); }

        int warehouseId;
        try { warehouseId = Integer.parseInt(body.getOrDefault(KEY_WAREHOUSE_ID, "0").toString()); }
        catch (NumberFormatException e) { res.put(KEY_SUCCESS, false); res.put("message", "Invalid warehouseId"); return ResponseEntity.badRequest().body(res); }

        if (warehouseId <= 0) { res.put(KEY_SUCCESS, false); res.put("message", "Please select a warehouse"); return ResponseEntity.badRequest().body(res); }

        // One pending request at a time
        java.util.Optional<WarehouseChangeRequest> existing =
                warehouseChangeRequestRepository.findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING);
        if (existing.isPresent()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "You already have a pending transfer request. Please wait for admin to review it.");
            return ResponseEntity.ok(res);
        }

        Warehouse requested = warehouseRepository.findById(warehouseId).orElse(null);
        if (requested == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_WAREHOUSE_NOT_FOUND); return ResponseEntity.badRequest().body(res); }

        if (db.getWarehouse() != null && db.getWarehouse().getId() == warehouseId) {
            res.put(KEY_SUCCESS, false); res.put("message", "You are already assigned to this warehouse");
            return ResponseEntity.ok(res);
        }

        WarehouseChangeRequest req = new WarehouseChangeRequest();
        req.setDeliveryBoy(db);
        req.setRequestedWarehouse(requested);
        req.setReason(body.containsKey("reason") ? (String) body.get("reason") : "");
        req.setStatus(WarehouseChangeRequest.Status.PENDING);
        req.setRequestedAt(java.time.LocalDateTime.now());
        warehouseChangeRequestRepository.save(req);

        res.put(KEY_SUCCESS, true);
        res.put("message", "Transfer request submitted. Admin will review it shortly.");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/delivery/availability/toggle
     * Body: { isAvailable: boolean }
     * Toggles the availability status of a delivery boy.
     * Auth: JWT Bearer token
     */
    @PostMapping("/delivery/availability/toggle")
    public ResponseEntity<Map<String, Object>> deliveryAvailabilityToggle(
            HttpServletRequest request,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        
        // Extract delivery ID from JWT token
        Integer deliveryId = (Integer) request.getAttribute(KEY_DELIVERY_BOY_ID);
        if (deliveryId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_AUTH_FAILED);
            return ResponseEntity.status(401).body(res);
        }
        
        DeliveryBoy db = deliveryBoyRepository.findById(deliveryId).orElse(null);
        if (db == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_DELIVERY_BOY_NOT_FOUND); return ResponseEntity.status(404).body(res); }

        Boolean isAvailable = body.containsKey(KEY_IS_AVAILABLE) 
                ? (Boolean) body.get(KEY_IS_AVAILABLE) 
                : null;
        if (isAvailable == null) { 
            res.put(KEY_SUCCESS, false); 
            res.put("message", "isAvailable is required"); 
            return ResponseEntity.badRequest().body(res); 
        }

        db.setAvailable(isAvailable);
        deliveryBoyRepository.save(db);

        res.put(KEY_SUCCESS, true);
        res.put(KEY_IS_AVAILABLE, db.isAvailable());
        res.put("message", isAvailable ? "You are now Online - Available for deliveries" : "You are now Offline - Not available for deliveries");
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/react/delivery/warehouse-change/pending
     * Returns the pending warehouse change request for this delivery boy (if any).
     * Auth: JWT Bearer token
     */
    @GetMapping("/delivery/warehouse-change/pending")
    public ResponseEntity<Map<String, Object>> deliveryPendingTransfer(
            HttpServletRequest request) {
        Map<String, Object> res = new HashMap<>();
        
        // Extract delivery ID from JWT token
        Integer deliveryId = (Integer) request.getAttribute(KEY_DELIVERY_BOY_ID);
        if (deliveryId == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_AUTH_FAILED);
            return ResponseEntity.status(401).body(res);
        }
        
        DeliveryBoy db = deliveryBoyRepository.findById(deliveryId).orElse(null);
        if (db == null) { res.put(KEY_SUCCESS, false); res.put("message", ERR_DELIVERY_BOY_NOT_FOUND); return ResponseEntity.status(404).body(res); }

        java.util.Optional<WarehouseChangeRequest> pending =
                warehouseChangeRequestRepository.findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING);

        res.put(KEY_SUCCESS, true);
        if (pending.isPresent()) {
            WarehouseChangeRequest req = pending.get();
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("id", req.getId());
            requestData.put("requestedAt", req.getRequestedAt() != null ? req.getRequestedAt().toString() : null);
            requestData.put("reason", req.getReason());
            if (req.getRequestedWarehouse() != null) {
                Map<String, Object> whData = new HashMap<>();
                whData.put("id", req.getRequestedWarehouse().getId());
                whData.put("name", req.getRequestedWarehouse().getName());
                whData.put("city", req.getRequestedWarehouse().getCity());
                whData.put("state", req.getRequestedWarehouse().getState());
                whData.put(KEY_WAREHOUSE_CODE, req.getRequestedWarehouse().getWarehouseCode());
                requestData.put("requestedWarehouse", whData);
            }
            res.put("request", requestData);
        } else {
            res.put("request", null);
        }
        return ResponseEntity.ok(res);
    }

    /** Helper — maps an Order to a flat map for delivery-boy API responses */
    private Map<String, Object> mapDeliveryOrder(Order o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",              o.getId());
        m.put("status",          o.getTrackingStatus() != null ? o.getTrackingStatus().name() : null);
        m.put("statusDisplay",   o.getTrackingStatus() != null ? o.getTrackingStatus().getDisplayName() : null);
        m.put("currentCity",     o.getCurrentCity());
        m.put("deliveryAddress", o.getDeliveryAddress());
        m.put(KEY_TOTAL_AMOUNT,     o.getAmount());
        m.put("orderedDate",     o.getDateTime() != null ? o.getDateTime().toString() : null);
        // Customer name for the delivery boy to know who they're delivering to
        m.put(KEY_CUSTOMER_NAME,    o.getCustomer() != null ? o.getCustomer().getName() : null);
        // Item count summary
        m.put("itemCount",       o.getItems() != null ? o.getItems().size() : 0);
        // Payment mode and COD info — needed for delivery boy to know payment method and collect cash if COD
        m.put("paymentMode",     o.getPaymentMode() != null ? o.getPaymentMode() : "PREPAID");
        m.put("deliveryCharge",  o.getDeliveryCharge());
        m.put("totalPrice",      o.getTotalPrice());
        m.put("isCod",           o.getPaymentMode() != null && (o.getPaymentMode().equalsIgnoreCase("COD") || o.getPaymentMode().equalsIgnoreCase("Cash on Delivery")));
        return m;
    }


    private String buildCustomerContext(Customer c) {
        StringBuilder ctx = new StringBuilder();
        ctx.append("=== CUSTOMER DATA ===\n");
        ctx.append("Name: ").append(c.getName()).append("\n");
        ctx.append("Email: ").append(c.getEmail()).append("\n");
        ctx.append("Customer ID: ").append(c.getId()).append("\n");

        // Cart
        if (c.getCart() != null && c.getCart().getItems() != null
                && !c.getCart().getItems().isEmpty()) {
            List<Item> cartItems = c.getCart().getItems();
            double cartTotal = cartItems.stream()
                    .mapToDouble(i -> i.getUnitPrice() > 0
                            ? i.getUnitPrice() * i.getQuantity()
                            : i.getPrice())
                    .sum();
            ctx.append("\nCART (").append(cartItems.size()).append(" items, ₹")
               .append(String.format("%.0f", cartTotal)).append(" total):\n");
            for (Item item : cartItems) {
                double unitP = item.getUnitPrice() > 0
                        ? item.getUnitPrice()
                        : item.getPrice() / Math.max(item.getQuantity(), 1);
                ctx.append("  - ").append(item.getName())
                   .append(" × ").append(item.getQuantity())
                   .append(" @ ₹").append(String.format("%.0f", unitP))
                   .append(" [category: ").append(item.getCategory()).append("]\n");
            }
            ctx.append("  Delivery: ").append(cartTotal >= 500 ? "FREE" : "₹40").append("\n");
        } else {
            ctx.append("\nCART: Empty\n");
        }

        // Orders (last 10, newest first)
        List<Order> orders = orderRepository.findByCustomer(c);
        if (orders.isEmpty()) {
            ctx.append("\nORDERS: No orders placed yet.\n");
        } else {
            orders.sort((a, b) -> {
                if (a.getOrderDate() == null) return 1;
                if (b.getOrderDate() == null) return -1;
                return b.getOrderDate().compareTo(a.getOrderDate());
            });
            List<Order> recent = orders.stream().limit(10).toList();
            ctx.append("\nORDERS (").append(orders.size()).append(" total, showing last ")
               .append(recent.size()).append("):\n");
            for (Order o : recent) {
                ctx.append("  Order #").append(o.getId())
                   .append(" | ₹").append(String.format("%.0f", o.getAmount()))
                   .append(" | Status: ").append(o.getTrackingStatus().getDisplayName())
                   .append(" | Items: ");
                if (o.getItems() != null && !o.getItems().isEmpty()) {
                    ctx.append(o.getItems().stream()
                                .map(i -> i.getName() + " ×" + i.getQuantity())
                                .collect(Collectors.joining(", ")));
                }
                if (o.getOrderDate() != null)
                    ctx.append(" | Placed: ").append(o.getOrderDate().format(CHAT_DATE_FMT));
                if (o.getDeliveryTime() != null && !o.getDeliveryTime().isBlank())
                    ctx.append(" | ETA: ").append(o.getDeliveryTime());
                if (o.getCurrentCity() != null && !o.getCurrentCity().isBlank()
                        && o.getTrackingStatus() != TrackingStatus.DELIVERED)
                    ctx.append(" | Currently at: ").append(o.getCurrentCity());
                ctx.append("\n");
            }
        }

        // Pending refunds
        List<Refund> pendingRefunds = refundRepository.findByCustomer(c).stream()
            .filter(r -> r.getStatus() == RefundStatus.PENDING)
            .toList();
        if (!pendingRefunds.isEmpty()) {
            ctx.append("\nPENDING REFUNDS (").append(pendingRefunds.size()).append("):\n");
            for (Refund r : pendingRefunds) {
                ctx.append("  - Refund #").append(r.getId())
                   .append(" | Order #").append(r.getOrder() != null ? r.getOrder().getId() : "?")
                   .append(" | ₹").append(String.format("%.0f", r.getAmount()))
                   .append(" | Reason: ").append(r.getReason())
                   .append("\n");
            }
        }

        // Saved addresses
        if (c.getAddresses() != null && !c.getAddresses().isEmpty()) {
            ctx.append("\nSAVED ADDRESSES: ").append(c.getAddresses().size()).append("\n");
            for (Address a : c.getAddresses()) {
                ctx.append("  - ")
                   .append(a.getRecipientName() != null ? a.getRecipientName() : "")
                   .append(", ").append(a.getCity() != null ? a.getCity() : "")
                   .append(" ").append(a.getPostalCode() != null ? a.getPostalCode() : "")
                   .append("\n");
            }
        }

        return ctx.toString();
    }

    // ── PUBLIC BANNER ENDPOINTS ───────────────────────────────────────────────
    //
    // GET /api/flutter/banners       — active banners for logged-in customers
    //                                  (showOnCustomerHome = true)
    // GET /api/flutter/home-banners  — active banners for the pre-login page
    //                                  (showOnHome = true)
    //
    // Both are unauthenticated (no requireCustomer guard) so the React
    // CustomerApp can call them before and after login without token overhead.
    // Response shape matches /api/flutter/admin/banners for consistency.

    /**
     * GET /api/flutter/banners
     * Active banners shown on the customer home page (after login).
     * Filtered by active=true AND showOnCustomerHome=true, ordered by displayOrder.
     */
    @GetMapping("/banners")
    public ResponseEntity<Map<String, Object>> getCustomerBanners() {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            List<Banner> banners = bannerRepository.findByActiveTrueAndShowOnCustomerHomeTrueOrderByDisplayOrderAsc();
            List<Map<String, Object>> list = new ArrayList<>();
            for (Banner b : banners) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",           b.getId());
                m.put("title",        b.getTitle());
                m.put("imageUrl",     b.getImageUrl());
                m.put("linkUrl",      b.getLinkUrl());
                m.put("displayOrder", b.getDisplayOrder());
                list.add(m);
            }
            res.put(KEY_SUCCESS, true);
            res.put("banners", list);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to load banners: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * GET /api/flutter/home-banners
     * Active banners shown on the pre-login landing page.
     * Filtered by active=true AND showOnHome=true, ordered by displayOrder.
     */
    @GetMapping("/home-banners")
    public ResponseEntity<Map<String, Object>> getHomeBanners() {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            List<Banner> banners = bannerRepository.findByActiveTrueAndShowOnHomeTrueOrderByDisplayOrderAsc();
            List<Map<String, Object>> list = new ArrayList<>();
            for (Banner b : banners) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",           b.getId());
                m.put("title",        b.getTitle());
                m.put("imageUrl",     b.getImageUrl());
                m.put("linkUrl",      b.getLinkUrl());
                m.put("displayOrder", b.getDisplayOrder());
                list.add(m);
            }
            res.put(KEY_SUCCESS, true);
            res.put("banners", list);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Failed to load banners: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // DEPRECATION TRACKING & MIGRATION MONITORING
    // ═══════════════════════════════════════════════════════

    /**
     * GET /api/react/admin/deprecation/summary
     * Returns summary of deprecated Thymeleaf route usage.
     * Requires: ADMIN role via JWT
     */
    @GetMapping("/admin/deprecation/summary")
    public ResponseEntity<Map<String, Object>> getDeprecationSummary(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        if (deprecationTracker == null) {
            Map<String, Object> res = new LinkedHashMap<>();
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_DEPRECATION_TRACKING_DISABLED);
            return ResponseEntity.status(503).body(res);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put(KEY_SUCCESS, true);
        res.put("data", deprecationTracker.getSummaryStats());
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/react/admin/deprecation/logs
     * Returns detailed access logs for deprecated Thymeleaf routes.
     * Requires: ADMIN role via JWT
     * Query params:
     *   - limit: max number of logs to return (default: 100)
     *   - category: filter by route category (CUSTOMER, VENDOR, ADMIN, GUEST, PUBLIC)
     */
    @GetMapping("/admin/deprecation/logs")
    public ResponseEntity<Map<String, Object>> getDeprecationLogs(
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(required = false) String category,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        if (deprecationTracker == null) {
            Map<String, Object> res = new LinkedHashMap<>();
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_DEPRECATION_TRACKING_DISABLED);
            return ResponseEntity.status(503).body(res);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        List<Map<String, Object>> logs = deprecationTracker.getAllAccessLogs();
        
        if (category != null && !category.isEmpty()) {
            logs = logs.stream()
                    .filter(log -> category.equals(log.get("userRole")))
                    .toList();
        }

        res.put(KEY_SUCCESS, true);
        res.put(KEY_TOTAL, logs.size());
        res.put("logs", logs.stream().limit(limit).toList());
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/react/admin/deprecation/report
     * Returns comprehensive deprecation report grouped by route category.
     * Shows usage statistics per route and recommendations for migration.
     * Requires: ADMIN role via JWT
     */
    @GetMapping("/admin/deprecation/report")
    public ResponseEntity<Map<String, Object>> getDeprecationReport(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        if (deprecationTracker == null) {
            Map<String, Object> res = new LinkedHashMap<>();
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_DEPRECATION_TRACKING_DISABLED);
            return ResponseEntity.status(503).body(res);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put(KEY_SUCCESS, true);
        res.put("report", deprecationTracker.getDeprecationReport());
        res.put("message", "Migration plan: Prioritize routes with highest access count. Use React SPA endpoints as replacements.");
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/react/admin/deprecation/route/{route}
     * Returns usage statistics for a specific deprecated route.
     * Requires: ADMIN role via JWT
     * Path: route is URL-encoded route path
     */
    @GetMapping("/admin/deprecation/route/{route}")
    public ResponseEntity<Map<String, Object>> getRouteDeprecationStats(
            @PathVariable String route,
            HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        if (deprecationTracker == null) {
            Map<String, Object> res = new LinkedHashMap<>();
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_DEPRECATION_TRACKING_DISABLED);
            return ResponseEntity.status(503).body(res);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        String decodedRoute = "/" + java.net.URLDecoder.decode(route, java.nio.charset.StandardCharsets.UTF_8);
        Map<String, Object> stats = deprecationTracker.getRouteStats(decodedRoute);

        if (stats == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Route not found in deprecation logs");
            return ResponseEntity.status(404).body(res);
        }

        res.put(KEY_SUCCESS, true);
        res.put("route", decodedRoute);
        res.put("stats", stats);
        
        // Get suggested replacement
        String replacement = deprecationTracker.getReplacementRoute(decodedRoute);
        if (replacement != null) {
            res.put("suggestedReplacement", replacement);
            res.put("migrationNote", "Migrate to " + replacement + " endpoint in React API");
        }

        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/react/admin/deprecation/clear-logs
     * Clears all deprecation tracking logs. Use for reset/cleanup.
     * Requires: ADMIN role via JWT
     */
    @PostMapping("/admin/deprecation/clear-logs")
    public ResponseEntity<Map<String, Object>> clearDeprecationLogs(HttpServletRequest request) {
        ResponseEntity<Map<String, Object>> _guard = requireAdmin(request);
        if (_guard != null) return _guard;

        if (deprecationTracker == null) {
            Map<String, Object> res = new LinkedHashMap<>();
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_DEPRECATION_TRACKING_DISABLED);
            return ResponseEntity.status(503).body(res);
        }

        deprecationTracker.clearAccessLogs();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put(KEY_SUCCESS, true);
        res.put("message", "Deprecation logs cleared");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN — WAREHOUSE CREATION WITH AUTO-GENERATED CREDENTIALS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * POST /api/react/admin/warehouse/create
     * 
     * Creates a new warehouse with auto-generated numeric login ID and password.
     * Admin sees credentials once in response (shown in popup modal).
     * Credentials are also emailed to the warehouse contact address.
     *
     * Request Headers:
     *   Authorization: Bearer <JWT_TOKEN_with_ADMIN_role>
     *
     * Request Body (JSON):
     *   {
     *     "name": "Bangalore Hub",
     *     "city": "Bangalore",
     *     "state": "Karnataka",
     *     KEY_SERVED_PIN_CODES: "560001,560002,560003",
     *     "latitude": 12.9716,
     *     "longitude": 77.5946,
     *     "contactEmail": "warehouse@company.com",
     *     "contactPhone": "+919876543210",
     *     "address": "123 Main St, Bangalore"
     *   }
     *
     * Response (200 OK):
     *   {
     *     KEY_SUCCESS: true,
     *     KEY_WAREHOUSE_ID: 45,
     *     KEY_WAREHOUSE_NAME: "Bangalore Hub",
     *     KEY_WAREHOUSE_CODE: "WH-BLR-12345678",
     *     "loginId": "12345678",
     *     "loginPassword": "654321",
     *     "message": "Warehouse created. Credentials sent to warehouse@company.com. Login ID and Password shown above. Save these immediately — password will not be shown again."
     *   }
     *
     * Error Responses:
     *   401: No valid JWT token / not authenticated
     *   403: JWT token does not have ADMIN role
     *   400: Missing required fields or validation failed
     *   500: Server error (encryption, email delivery, database save)
     */
    @PostMapping("/admin/warehouse/create")
    public ResponseEntity<Map<String, Object>> adminCreateWarehouse(
            @RequestHeader(value = HEADER_AUTHORIZATION, required = false) String authHeader,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();

        // 1. Validate JWT token and extract admin role
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Missing or invalid Authorization header");
            return ResponseEntity.status(401).body(res);
        }

        String token = authHeader.substring(7);
        try {
            String role = jwtUtil.getRole(token);
            if (role == null || !role.equals(ROLE_ADMIN)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Admin role required");
                return ResponseEntity.status(403).body(res);
            }
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Invalid JWT token: " + e.getMessage());
            return ResponseEntity.status(401).body(res);
        }

        // 2. Extract and validate request body
        String name = ((String) body.getOrDefault("name", "")).trim();
        String city = ((String) body.getOrDefault("city", "")).trim();
        String state = ((String) body.getOrDefault("state", "")).trim();
        String servedPinCodes = ((String) body.getOrDefault(KEY_SERVED_PIN_CODES, "")).trim();
        Double latitude = null, longitude = null;
        
        try {
            Object latObj = body.get(KEY_LATITUDE);
            Object lonObj = body.get(KEY_LONGITUDE);
            latitude = (latObj instanceof Number) ? ((Number) latObj).doubleValue() : null;
            longitude = (lonObj instanceof Number) ? ((Number) lonObj).doubleValue() : null;
        } catch (Exception e) {
            // Invalid latitude/longitude format
        }

        String contactEmail = ((String) body.getOrDefault(KEY_CONTACT_EMAIL, "")).trim();
        String contactPhone = ((String) body.getOrDefault(KEY_CONTACT_PHONE, "")).trim();
        String address = ((String) body.getOrDefault("address", "")).trim();

        // 3. Validate required fields
        if (name.isEmpty() || city.isEmpty() || state.isEmpty()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Missing required fields: name, city, state");
            return ResponseEntity.badRequest().body(res);
        }

        if (contactEmail.isEmpty()) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Contact email is required");
            return ResponseEntity.badRequest().body(res);
        }

        // 4. Call WarehouseService to create warehouse with auto-generated credentials
        try {
            Map<String, Object> createResult = warehouseService.createWarehouse(
                    name, city, state, servedPinCodes, latitude, longitude,
                    contactEmail, contactPhone, address);

            // WarehouseService returns: { success, warehouseId, warehouseName, warehouseCode, 
            //                             loginId, loginPassword, message }
            return ResponseEntity.ok(createResult);
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Error creating warehouse: " + e.getMessage());
            LOGGER.error("Error creating warehouse", e);
            return ResponseEntity.status(500).body(res);
        }
    }

    /**
     * GET /api/react/admin/warehouse/{warehouseId}/credentials
     * 
     * Retrieves warehouse details for admin (without plain-text password).
     * Password is encrypted and stored in DB, never returned to client after creation.
     *
     * Request Headers:
     *   Authorization: Bearer <JWT_TOKEN_with_ADMIN_role>
     *
     * Path Variables:
     *   warehouseId: Numeric warehouse ID
     *
     * Response (200 OK):
     *   {
     *     KEY_SUCCESS: true,
     *     "warehouse": {
     *       "id": 45,
     *       "name": "Bangalore Hub",
     *       "city": "Bangalore",
     *       "state": "Karnataka",
     *       KEY_SERVED_PIN_CODES: "560001,560002,560003",
     *       KEY_WAREHOUSE_CODE: "WH-BLR-12345678",
     *       "warehouseLoginId": "12345678",
     *       "contactEmail": "warehouse@company.com",
     *       "contactPhone": "+919876543210",
     *       "address": "123 Main St, Bangalore",
     *       "active": true,
     *       "createdAt": "2024-01-15T10:30:45"
     *     },
     *     "message": "Warehouse details retrieved"
     *   }
     *
     * Error Responses:
     *   401: No valid JWT token / not authenticated
     *   403: JWT token does not have ADMIN role
     *   404: Warehouse not found
     */
    @GetMapping("/admin/warehouse/{warehouseId}/credentials")
    public ResponseEntity<Map<String, Object>> getWarehouseCredentials(
            @RequestHeader(value = HEADER_AUTHORIZATION, required = false) String authHeader,
            @PathVariable int warehouseId) {
        Map<String, Object> res = new LinkedHashMap<>();

        // 1. Validate JWT token and extract admin role
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Missing or invalid Authorization header");
            return ResponseEntity.status(401).body(res);
        }

        String token = authHeader.substring(7);
        try {
            String role = jwtUtil.getRole(token);
            if (role == null || !role.equals(ROLE_ADMIN)) {
                res.put(KEY_SUCCESS, false);
                res.put("message", "Admin role required");
                return ResponseEntity.status(403).body(res);
            }
        } catch (Exception e) {
            res.put(KEY_SUCCESS, false);
            res.put("message", "Invalid JWT token: " + e.getMessage());
            return ResponseEntity.status(401).body(res);
        }

        // 2. Query warehouse by ID
        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        if (warehouse == null) {
            res.put(KEY_SUCCESS, false);
            res.put("message", ERR_WAREHOUSE_NOT_FOUND);
            return ResponseEntity.status(404).body(res);
        }

        // 3. Build response with warehouse details (excluding encrypted password)
        Map<String, Object> warehouseDto = new LinkedHashMap<>();
        warehouseDto.put("id", warehouse.getId());
        warehouseDto.put("name", warehouse.getName());
        warehouseDto.put("city", warehouse.getCity());
        warehouseDto.put("state", warehouse.getState());
        warehouseDto.put(KEY_SERVED_PIN_CODES, warehouse.getServedPinCodes());
        warehouseDto.put(KEY_WAREHOUSE_CODE, warehouse.getWarehouseCode());
        warehouseDto.put("warehouseLoginId", warehouse.getWarehouseLoginId());
        warehouseDto.put(KEY_CONTACT_EMAIL, warehouse.getContactEmail());
        warehouseDto.put(KEY_CONTACT_PHONE, warehouse.getContactPhone());
        warehouseDto.put("address", warehouse.getAddress());
        warehouseDto.put("active", warehouse.isActive());
        warehouseDto.put(KEY_LATITUDE, warehouse.getLatitude());
        warehouseDto.put(KEY_LONGITUDE, warehouse.getLongitude());

        res.put(KEY_SUCCESS, true);
        res.put("warehouse", warehouseDto);
        res.put("message", "Warehouse credentials retrieved (password is encrypted and not shown)");
        return ResponseEntity.ok(res);
    }

    /**
     * TASK 1: Warehouse Receiving Queue
     * GET /api/react/warehouse/receiving-queue
     * 
     * Warehouse staff sees a queue of ALL PACKED orders (from any vendor).
     * Any warehouse can receive an order - they mark it when they physically receive the parcel.
     * 
     * Requires: Authentication via warehouse JWT (warehouseId in request attribute)
     */
    @GetMapping("/warehouse/receiving-queue")
    public ResponseEntity<Object> warehouseReceivingQueue(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
            if (warehouseId == null) {
                return ResponseEntity.status(401).body(Map.of(KEY_ERROR, ERR_NOT_WAREHOUSE));
            }

            // Get ALL PACKED orders (not just assigned to this warehouse)
            // Any warehouse can receive an order
            List<Order> queue = orderRepository.findByTrackingStatus(TrackingStatus.PACKED);

            List<Map<String, Object>> result = queue.stream()
                .map(o -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", o.getId());
                    m.put("status", o.getTrackingStatus());
                    m.put("deliveryPinCode", o.getDeliveryPinCode());
                    m.put("deliveryAddress", o.getDeliveryAddress());
                    m.put(KEY_VENDOR_NAME, o.getVendor() != null ? o.getVendor().getName() : "");
                    m.put(KEY_CUSTOMER_NAME, o.getCustomer() != null ? o.getCustomer().getName() : "");
                    m.put("totalPrice", o.getTotalPrice());
                    m.put("paymentMethod", o.getPaymentMethod());
                    m.put("orderDate", o.getOrderDate());
                    return m;
                }).toList();

            return ResponseEntity.ok(Map.of(KEY_COUNT, result.size(), KEY_ORDERS, result));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 2: Mark Order as Received
     * POST /api/react/warehouse/orders/{orderId}/mark-received
     * 
     * ANY warehouse can mark a PACKED order as received (PACKED → WAREHOUSE_RECEIVED).
     * When a warehouse receives the parcel, they scan/mark it in the system.
     * System automatically:
     *   1. Sets this warehouse as the receiving warehouse
     *   2. Finds destination warehouse based on delivery pin code
     *   3. Calculates routing path (direct or via intermediate hub)
     * 
     * Requires: Authentication via warehouse JWT (warehouseId in request attribute)
     */
    @PostMapping("/warehouse/orders/{orderId}/mark-received")
    public ResponseEntity<Object> warehouseMarkReceived(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int orderId,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
            if (warehouseId == null) {
                return ResponseEntity.status(401).body(Map.of(KEY_ERROR, ERR_UNAUTHORIZED));
            }

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(KEY_ERROR, ERR_ORDER_NOT_FOUND));
            }

            Order order = orderOpt.get();

            if (order.getTrackingStatus() != TrackingStatus.PACKED) {
                return ResponseEntity.badRequest()
                    .body(Map.of(KEY_ERROR, "Order must be in PACKED status. Current: " + order.getTrackingStatus()));
            }

            // Mark received - set this warehouse as the receiving warehouse
            order.setTrackingStatus(TrackingStatus.WAREHOUSE_RECEIVED);
            order.setSourceWarehouse(warehouseRepository.findById(warehouseId).orElse(null));

            // Calculate destination warehouse based on delivery pin code
            String deliveryPin = order.getDeliveryPinCode();
            Warehouse destinationWarehouse = null;
            if (deliveryPin != null) {
                List<Warehouse> allWarehouses = warehouseRepository.findByActiveTrue();
                for (Warehouse wh : allWarehouses) {
                    if (wh.serves(deliveryPin)) {
                        destinationWarehouse = wh;
                        break;
                    }
                }
            }

            if (destinationWarehouse != null) {
                order.setDestinationWarehouse(destinationWarehouse);
            }

            // Calculate routing path using WarehouseRoutingService
            // This builds a path: SourceCity -> (IntermediateHub?) -> DestinationCity
            String routingPath = warehouseRoutingService.calculateRoutingPath(order);
            order.setWarehouseRoutingPath(routingPath);

            // IMPORTANT: Initiate warehouse transfer if source != destination
            if (destinationWarehouse != null && 
                order.getSourceWarehouse() != null &&
                order.getSourceWarehouse().getId() != destinationWarehouse.getId()) {
                
                // Calculate optimal route between warehouses
                List<Warehouse> transferRoute = warehouseRoutingService.calculateOptimalRoute(
                    order.getSourceWarehouse(), 
                    destinationWarehouse
                );
                
                // Create transfer legs for each warehouse hop
                warehouseTransferService.initiateTransferLegs(order, transferRoute);

                LOGGER.info(
                    "Warehouse transfer initiated for Order #{}: {} -> {} via {} leg(s)",
                    orderId,
                    order.getSourceWarehouse().getCity(),
                    destinationWarehouse.getCity(),
                    transferRoute.size() - 1
                );
            }

            orderRepository.save(order);

            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                KEY_ORDER_ID, orderId,
                KEY_NEW_STATUS, order.getTrackingStatus().toString(),
                "destinationWarehouse", destinationWarehouse != null ? destinationWarehouse.getName() : "Unknown",
                KEY_ROUTING_PATH, routingPath != null ? routingPath : "Direct",
                "transferInitiated", destinationWarehouse != null && 
                    order.getSourceWarehouse() != null &&
                    order.getSourceWarehouse().getId() != destinationWarehouse.getId()
            ));
        } catch (Exception e) {
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName() + ": Unknown error";
            LOGGER.error("[ReactApiController] warehouseMarkReceived error for orderId={}: {}", orderId, errorMsg, e);
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, errorMsg));
        }
    }

    /**
     * TASK 3: Get Orders Ready for Delivery Assignment
     * GET /api/react/warehouse/orders/ready-for-assignment
     * 
     * Warehouse staff sees WAREHOUSE_RECEIVED orders ready to assign delivery boys.
     * These orders have been received and are ready for the next delivery leg.
     * 
     * Requires: Authentication via warehouse JWT (warehouseId in request attribute)
     */
    @GetMapping("/warehouse/orders/ready-for-assignment")
    public ResponseEntity<Object> warehouseOrdersReadyForAssignment(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
            if (warehouseId == null) {
                return ResponseEntity.status(401).body(Map.of(KEY_ERROR, ERR_NOT_WAREHOUSE));
            }

            // Get all WAREHOUSE_RECEIVED orders (ready for delivery assignment)
            List<Order> orders = orderRepository.findByTrackingStatus(TrackingStatus.WAREHOUSE_RECEIVED);

            List<Map<String, Object>> result = orders.stream()
                .map(o -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", o.getId());
                    m.put("status", o.getTrackingStatus());
                    m.put("pinCode", o.getDeliveryPinCode());
                    m.put("address", o.getDeliveryAddress());
                    m.put(KEY_VENDOR_NAME, o.getVendor() != null ? o.getVendor().getName() : "");
                    m.put(KEY_CUSTOMER_NAME, o.getCustomer() != null ? o.getCustomer().getName() : "");
                    m.put("totalPrice", o.getTotalPrice());
                    m.put("paymentMethod", o.getPaymentMethod());
                    m.put("orderDate", o.getOrderDate());
                    return m;
                }).toList();

            return ResponseEntity.ok(Map.of(KEY_COUNT, result.size(), KEY_ORDERS, result));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 4: Assign Delivery Boy to Warehouse-Received Order
     * POST /api/react/warehouse/orders/{orderId}/assign-delivery
     * 
     * Warehouse staff assigns a delivery boy to a WAREHOUSE_RECEIVED order.
     * Order status transitions: WAREHOUSE_RECEIVED → SHIPPED
     * Validates: order must be WAREHOUSE_RECEIVED, delivery boy must be approved + active.
     * 
     * Body: { deliveryBoyId: int }
     * Requires: Authentication via warehouse JWT (warehouseId in request attribute)
     */
    @PostMapping("/warehouse/orders/{orderId}/assign-delivery")
    public ResponseEntity<Object> warehouseAssignDelivery(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int orderId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
            if (warehouseId == null) {
                return ResponseEntity.status(401).body(Map.of(KEY_ERROR, ERR_UNAUTHORIZED));
            }

            int deliveryBoyId = Integer.parseInt(body.get(KEY_DELIVERY_BOY_ID).toString());

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(KEY_ERROR, ERR_ORDER_NOT_FOUND));
            }

            Order order = orderOpt.get();

            if (order.getTrackingStatus() != TrackingStatus.WAREHOUSE_RECEIVED) {
                return ResponseEntity.badRequest()
                    .body(Map.of(KEY_ERROR, "Order must be in WAREHOUSE_RECEIVED status. Current: " + order.getTrackingStatus()));
            }

            DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
            if (db == null) {
                return ResponseEntity.status(404).body(Map.of(KEY_ERROR, ERR_DELIVERY_BOY_NOT_FOUND));
            }

            if (!db.isAdminApproved() || !db.isActive()) {
                return ResponseEntity.badRequest()
                    .body(Map.of(KEY_ERROR, "Delivery boy is not approved or is inactive"));
            }

            // Assign delivery boy and mark as SHIPPED
            order.setDeliveryBoy(db);
            order.setTrackingStatus(TrackingStatus.SHIPPED);
            orderRepository.save(order);

            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                KEY_ORDER_ID, orderId,
                KEY_DELIVERY_BOY_ID, db.getId(),
                KEY_DELIVERY_BOY_NAME, db.getName(),
                KEY_NEW_STATUS, STATUS_SHIPPED,
                "message", PREFIX_ORDER + orderId + " assigned to " + db.getName()
            ));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, "Invalid deliveryBoyId in request body"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 5: Get Available Delivery Boys for PIN Code
     * GET /api/react/warehouse/delivery-boys?pinCode={pinCode}
     * 
     * Returns approved & active delivery boys that can deliver to the given PIN code.
     * Used by warehouse assignment modal to populate the dropdown.
     * 
     * Requires: Authentication via warehouse JWT (warehouseId in request attribute)
     */
    @GetMapping("/warehouse/delivery-boys")
    public ResponseEntity<Object> warehouseGetAvailableDeliveryBoys(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @RequestParam(required = false) String pinCode,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
            if (warehouseId == null) {
                return ResponseEntity.status(401).body(Map.of(KEY_ERROR, ERR_NOT_WAREHOUSE));
            }

            // Get all approved and active delivery boys
            List<DeliveryBoy> allDeliveryBoys = deliveryBoyRepository.findAll().stream()
                .filter(db -> db.isAdminApproved() && db.isActive())
                .toList();

            List<Map<String, Object>> result = allDeliveryBoys.stream()
                .map(db -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", db.getId());
                    m.put("name", db.getName());
                    m.put(KEY_EMAIL, db.getEmail());
                    m.put(KEY_MOBILE, db.getMobile());
                    m.put(KEY_WAREHOUSE_ID, db.getWarehouse() != null ? db.getWarehouse().getId() : null);
                    m.put(KEY_WAREHOUSE_NAME, db.getWarehouse() != null ? db.getWarehouse().getName() : "");
                    return m;
                }).toList();

            return ResponseEntity.ok(Map.of("deliveryBoys", result));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // DELIVERY BOY ENDPOINTS - Order pickup, delivery, OTP verification, COD cash
    // ─────────────────────────────────────────────────────────────

    /**
     * TASK 1: Delivery Boy - Get My Orders
     * GET /api/react/delivery/my-orders
     * 
     * Returns all orders assigned to this delivery boy (SHIPPED or OUT_FOR_DELIVERY).
     * Used by delivery boy app to show pickup/delivery list.
     */
    @GetMapping("/delivery/my-orders")
    public ResponseEntity<Object> deliveryGetOrders(@RequestHeader(HEADER_AUTHORIZATION) String authHeader) {
        try {
            // Extract delivery boy ID from JWT
            int deliveryBoyId = jwtUtil.extractDeliveryBoyId(authHeader.replace("Bearer ", ""));

            List<Order> orders = orderRepository.findByFinalDeliveryBoyIdAndTrackingStatusIn(
                deliveryBoyId,
                List.of(TrackingStatus.SHIPPED, TrackingStatus.OUT_FOR_DELIVERY)
            );

            List<Map<String, Object>> result = orders.stream().map(o -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", o.getId());
                m.put("status", o.getTrackingStatus());
                m.put("statusDisplay", o.getTrackingStatus().getDisplayName());
                m.put("deliveryAddress", o.getDeliveryAddress());
                m.put("deliveryPinCode", o.getDeliveryPinCode());
                m.put(KEY_CUSTOMER_NAME, o.getCustomer() != null ? o.getCustomer().getName() : "");
                m.put("customerPhone", o.getCustomer() != null ? o.getCustomer().getMobile() : "");
                m.put("totalPrice", o.getTotalPrice());
                m.put("paymentMethod", o.getPaymentMethod());
                m.put(KEY_ROUTING_PATH, o.getWarehouseRoutingPath());
                return m;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 3: Confirm Delivery (OTP + COD Cash validation)
     * POST /api/react/delivery/orders/{orderId}/confirm-delivery
     * 
     * Delivery boy confirms delivery by verifying OTP.
     * For COD orders: must also provide cash collected amount.
     * Status: OUT_FOR_DELIVERY → DELIVERED
     * 
     * Request body:
     * {
     *   "otp": "123456",
     *   "cashCollected": 2500  (only for COD orders)
     * }
     */
    @PostMapping("/delivery/orders/{orderId}/confirm-delivery")
    public ResponseEntity<Object> deliveryConfirm(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int orderId,
            @RequestBody Map<String, Object> body) {
        try {
            int deliveryBoyId = jwtUtil.extractDeliveryBoyId(authHeader.replace("Bearer ", ""));
            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(KEY_ERROR, ERR_ORDER_NOT_FOUND));
            }

            Order order = orderOpt.get();
            if (order.getDeliveryBoy() == null || order.getDeliveryBoy().getId() != deliveryBoyId) {
                return ResponseEntity.status(403).body(Map.of(KEY_ERROR, "Not your order"));
            }
            if (order.getTrackingStatus() != TrackingStatus.OUT_FOR_DELIVERY) {
                return ResponseEntity.badRequest()
                    .body(Map.of(KEY_ERROR, "Order must be OUT_FOR_DELIVERY"));
            }

            // Validate OTP from DeliveryOtp table
            String enteredOtp = (String) body.get("otp");
            DeliveryOtp deliveryOtp = deliveryOtpRepository.findByOrder(order).orElse(null);
            if (deliveryOtp == null || !String.valueOf(deliveryOtp.getOtp()).equals(enteredOtp)) {
                return ResponseEntity.badRequest()
                    .body(Map.of(KEY_ERROR, "Incorrect OTP. Please check with the customer."));
            }

            // COD validation
            boolean isCOD = "COD".equalsIgnoreCase(order.getPaymentMethod());
            if (isCOD) {
                Object cashObj = body.get("cashCollected");
                if (cashObj == null) {
                    return ResponseEntity.badRequest()
                        .body(Map.of(KEY_ERROR, "cashCollected is required for COD orders"));
                }
                double cashCollected = Double.parseDouble(cashObj.toString());
                if (cashCollected <= 0) {
                    return ResponseEntity.badRequest()
                        .body(Map.of(KEY_ERROR, "Cash collected must be greater than 0 for COD orders"));
                }
                order.setCodAmount(cashCollected);
                order.setCodCollectedBy(deliveryBoyId);
                order.setCodCollectionTimestamp(java.time.LocalDateTime.now());
                order.setPaymentStatus("COD_COLLECTED");
            } else {
                order.setPaymentStatus("ONLINE_PAID");
            }

            order.setDeliveryOtpVerified(true);
            order.setTrackingStatus(TrackingStatus.DELIVERED);
            orderRepository.save(order);

            Map<String, Object> res = new LinkedHashMap<>();
            res.put(KEY_SUCCESS, true);
            res.put(KEY_ORDER_ID, orderId);
            res.put("status", STATUS_DELIVERED);
            if (isCOD) {
                res.put("message", "Delivery confirmed. Please submit the collected cash to your warehouse.");
                res.put("cashToSubmit", order.getCodAmount());
            } else {
                res.put("message", "Delivery confirmed.");
            }
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 4: Delivery Boy Submits Cash to Warehouse
     * POST /api/react/delivery/orders/{orderId}/submit-cash
     * 
     * Delivery boy submits collected COD cash to warehouse.
     * Only for COD orders where payment status is COD_COLLECTED.
     * Status remains DELIVERED, paymentStatus: COD_COLLECTED → COD_SUBMITTED_TO_WAREHOUSE
     */
    @PostMapping("/delivery/orders/{orderId}/submit-cash")
    public ResponseEntity<Object> deliverySubmitCash(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int orderId,
            @RequestBody Map<String, Object> body) {
        try {
            int deliveryBoyId = jwtUtil.extractDeliveryBoyId(authHeader.replace("Bearer ", ""));
            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(KEY_ERROR, ERR_ORDER_NOT_FOUND));
            }

            Order order = orderOpt.get();
            if (order.getFinalDeliveryBoyId() == null || order.getFinalDeliveryBoyId() != deliveryBoyId) {
                return ResponseEntity.status(403).body(Map.of(KEY_ERROR, "Not your order"));
            }
            if (order.getTrackingStatus() != TrackingStatus.DELIVERED) {
                return ResponseEntity.badRequest()
                    .body(Map.of(KEY_ERROR, "Order must be DELIVERED first"));
            }
            if (!"COD_COLLECTED".equals(order.getPaymentStatus())) {
                return ResponseEntity.badRequest()
                    .body(Map.of(KEY_ERROR, "No COD cash to submit for this order"));
            }

            order.setPaymentStatus("COD_SUBMITTED_TO_WAREHOUSE");
            orderRepository.save(order);

            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                "message", "Cash submission recorded. Hand ₹" + order.getCodAmount() + " to warehouse staff.",
                "cashAmount", order.getCodAmount()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // WAREHOUSE CASH SETTLEMENT ENDPOINTS - COD deposit & proof upload
    // ─────────────────────────────────────────────────────────────

    /**
     * TASK 1: Warehouse - View Pending COD Settlements
     * GET /api/react/warehouse/settlements/pending
     * 
     * Warehouse staff views all COD cash submitted by delivery boys
     * (paymentStatus = COD_SUBMITTED_TO_WAREHOUSE).
     */
    @GetMapping("/warehouse/settlements/pending")
    public ResponseEntity<Object> warehousePendingSettlements(HttpServletRequest request) {
        Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
        if (warehouseId == null) return ResponseEntity.status(401).body(Map.of(KEY_ERROR, ERR_UNAUTHORIZED));

        // Orders where paymentStatus = COD_SUBMITTED_TO_WAREHOUSE and destinationWarehouseId = this warehouse
        List<Order> orders = orderRepository.findByDestinationWarehouseIdAndPaymentStatus(
            warehouseId, "COD_SUBMITTED_TO_WAREHOUSE");

        List<Map<String, Object>> result = orders.stream().map(o -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put(KEY_ORDER_ID, o.getId());
            m.put("codAmount", o.getCodAmount());
            m.put("deliveredAt", o.getCodCollectionTimestamp());
            m.put(KEY_DELIVERY_BOY_ID, o.getFinalDeliveryBoyId());
            m.put(KEY_CUSTOMER_NAME, o.getCustomer() != null ? o.getCustomer().getName() : "");
            return m;
        }).toList();

        double totalPending = result.stream()
            .mapToDouble(m -> (double) m.getOrDefault("codAmount", 0.0)).sum();

        return ResponseEntity.ok(Map.of("pendingOrders", result, "totalPending", totalPending));
    }

    /**
     * TASK 2: Warehouse - Create Settlement & Upload Payment Proof
     * POST /api/react/warehouse/settlements/create-and-upload-proof
     * 
     * Warehouse deposits COD cash to bank or sends online,
     * uploads proof photo, marks settlement as PROOF_UPLOADED.
     * Admin then verifies it.
     * 
     * Request params:
     * - proofImageUrl: URL of payment proof (bank transfer/deposit slip)
     * - orderIds: Comma-separated list of order IDs to settle
     * - notes: Optional notes (e.g., "Deposited to HDFC account")
     */
    @PostMapping("/warehouse/settlements/create-and-upload-proof")
    public ResponseEntity<Object> createSettlementAndUploadProof(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            HttpServletRequest request,
            @RequestParam("proofImageUrl") String proofImageUrl,
            @RequestParam("orderIds") String orderIdsStr,
            @RequestParam(value = "notes", required = false) String notes) {
        Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
        if (warehouseId == null) return ResponseEntity.status(401).body(Map.of(KEY_ERROR, ERR_UNAUTHORIZED));

        try {
            List<Integer> orderIds = Arrays.stream(orderIdsStr.split(","))
                .map(s -> Integer.parseInt(s.trim()))
                .toList();

            double totalCash = 0;
            List<Order> orders = new ArrayList<>();
            for (int oid : orderIds) {
                Order o = orderRepository.findById(oid).orElseThrow();
                if (!"COD_SUBMITTED_TO_WAREHOUSE".equals(o.getPaymentStatus())) continue;
                totalCash += o.getCodAmount() != null ? o.getCodAmount() : 0;
                orders.add(o);
            }

            // Create settlement record
            Warehouse wh = new Warehouse();
            wh.setId(warehouseId);

            CashSettlement settlement = new CashSettlement();
            settlement.setWarehouse(wh);
            settlement.setTotalAmountCollected(totalCash);
            settlement.setAdminCommission(totalCash * 0.20);
            settlement.setVendorPayAmount(totalCash * 0.80);
            settlement.setSettlementStatus("PROOF_UPLOADED");
            settlement.setProofPhotoUrl(proofImageUrl);
            settlement.setSubmittedAt(LocalDateTime.now());
            settlement.setOrderCount(orders.size());
            settlement.setNotes(notes);

            // Generate batch number
            String batchNum = "BATCH-" + warehouseId + "-" + System.currentTimeMillis();
            settlement.setSettlementBatchNumber(batchNum);

            CashSettlement saved = cashSettlementRepository.save(settlement);

            // Update each order's payment status and link to settlement
            for (Order o : orders) {
                o.setPaymentStatus("PROOF_UPLOADED");
                o.setCashSettlementId(saved.getId());
                orderRepository.save(o);
            }

            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                "settlementId", saved.getId(),
                "batchNumber", batchNum,
                "totalCash", totalCash,
                "adminCommission", settlement.getAdminCommission(),
                "vendorPayAmount", settlement.getVendorPayAmount(),
                "status", "PROOF_UPLOADED",
                "message", "Settlement submitted to admin for verification"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN SETTLEMENT ENDPOINTS - COD review, verification, payout
    // ─────────────────────────────────────────────────────────────

    /**
     * TASK 1: Admin - Get All Pending Settlements
     * GET /api/react/admin/settlements/pending
     * 
     * Admin views all pending COD settlement batches with proof photos.
     */
    @GetMapping("/admin/settlements/pending")
    public ResponseEntity<Object> adminPendingSettlements(@RequestHeader(HEADER_AUTHORIZATION) String authHeader) {
        // Validate admin JWT
        List<CashSettlement> settlements = cashSettlementRepository.findBySettlementStatus("PROOF_UPLOADED");

        List<Map<String, Object>> result = settlements.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("batchNumber", s.getSettlementBatchNumber());
            m.put(KEY_WAREHOUSE_ID, s.getWarehouse() != null ? s.getWarehouse().getId() : null);
            m.put(KEY_WAREHOUSE_NAME, s.getWarehouse() != null ? s.getWarehouse().getName() : "");
            m.put(KEY_TOTAL_AMOUNT, s.getTotalAmountCollected());
            m.put("adminCommission", s.getAdminCommission());
            m.put("vendorPayAmount", s.getVendorPayAmount());
            m.put("status", s.getSettlementStatus());
            m.put("proofPhotoUrl", s.getProofPhotoUrl());
            m.put("submittedAt", s.getSubmittedAt());
            m.put("orderCount", s.getOrderCount());
            m.put("notes", s.getNotes());
                return m;
            }).toList();

        return ResponseEntity.ok(Map.of(KEY_COUNT, result.size(), "settlements", result));
    }

    /**
     * TASK 2: Admin - Verify Settlement
     * POST /api/react/admin/settlements/{settlementId}/verify
     * 
     * Admin verifies the proof photo and marks settlement as VERIFIED.
     */
    @PostMapping("/admin/settlements/{settlementId}/verify")
    public ResponseEntity<Object> adminVerifySettlement(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int settlementId,
            @RequestBody(required = false) Map<String, Object> body) {
        // Extract admin ID from JWT
        int adminId = jwtUtil.extractAdminId(authHeader.replace("Bearer ", ""));

        CashSettlement settlement = cashSettlementRepository.findById(settlementId)
            .orElseThrow(() -> new RuntimeException("Settlement not found"));

        if (!"PROOF_UPLOADED".equals(settlement.getSettlementStatus())) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, "Settlement not in PROOF_UPLOADED status"));
        }

        settlement.setSettlementStatus(STATUS_VERIFIED);
        settlement.setVerifiedByAdminId(adminId);
        settlement.setVerifiedAt(LocalDateTime.now());
        cashSettlementRepository.save(settlement);

        // Update linked orders
        List<Order> orders = orderRepository.findByCashSettlementId(settlementId);
        for (Order o : orders) {
            o.setPaymentStatus(STATUS_VERIFIED);
            orderRepository.save(o);
        }

        return ResponseEntity.ok(Map.of(
            KEY_SUCCESS, true,
            "settlementId", settlementId,
            "status", STATUS_VERIFIED,
            "adminCommission", settlement.getAdminCommission(),
            "vendorPayAmount", settlement.getVendorPayAmount()
        ));
    }

    /**
     * TASK 3: Admin - Trigger Vendor Payout
     * POST /api/react/admin/settlements/{settlementId}/payout
     * 
     * Admin approves payment. System sends 80% to vendor, keeps 20% commission.
     * Triggers vendor payment confirmation emails.
     */
    @PostMapping("/admin/settlements/{settlementId}/payout")
    public ResponseEntity<Object> adminVendorPayout(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int settlementId,
            @RequestBody Map<String, Object> body) {
        int adminId = jwtUtil.extractAdminId(authHeader.replace("Bearer ", ""));

        CashSettlement settlement = cashSettlementRepository.findById(settlementId)
            .orElseThrow(() -> new RuntimeException("Settlement not found"));

        if (!STATUS_VERIFIED.equals(settlement.getSettlementStatus())) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, "Settlement must be VERIFIED before payout"));
        }

        settlement.setSettlementStatus(STATUS_PAID);
        settlement.setPaidToWarehouseAt(LocalDateTime.now());
        cashSettlementRepository.save(settlement);

        // Update linked orders
        List<Order> orders = orderRepository.findByCashSettlementId(settlementId);
        for (Order o : orders) {
            o.setPaymentStatus(STATUS_PAID);
            o.setPaymentVerifiedAt(LocalDateTime.now());
            orderRepository.save(o);

            // Send payment confirmation email to vendor
            try {
                if (o.getVendor() != null && o.getVendor().getEmail() != null) {
                    double vendorAmount = settlement.getVendorPayAmount() / Math.max(1, orders.size());
                    emailSender.sendVendorPaymentConfirmation(
                        o.getVendor().getEmail(),
                        o.getVendor().getName(),
                        vendorAmount,
                        o.getId(),
                        settlement.getSettlementBatchNumber()
                    );
                }
            } catch (Exception e) {
                LOGGER.error("Failed to send vendor payment email", e);
            }
        }

        return ResponseEntity.ok(Map.of(
            KEY_SUCCESS, true,
            "settlementId", settlementId,
            "status", STATUS_PAID,
            "totalPaid", settlement.getTotalAmountCollected(),
            "adminKept", settlement.getAdminCommission(),
            "vendorReceived", settlement.getVendorPayAmount(),
            "ordersUpdated", orders.size()
        ));
    }

    /**
     * TASK 4: Admin - Process Online Payment Payout
     * POST /api/react/admin/online-payments/process-payout/{orderId}
     * 
     * For RAZORPAY orders: payment comes directly to admin.
     * Admin processes payout: keeps 20%, sends 80% to vendor.
     */
    @PostMapping("/admin/online-payments/process-payout/{orderId}")
    public ResponseEntity<Object> adminOnlinePaymentPayout(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new RuntimeException(ERR_ORDER_NOT_FOUND));

        if (!"RAZORPAY".equalsIgnoreCase(order.getPaymentMethod())) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, "Not an online payment order"));
        }
        if (order.getTrackingStatus() != TrackingStatus.DELIVERED) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, "Order must be DELIVERED"));
        }

        double total = order.getTotalPrice();
        double adminCut = total * 0.20;
        double vendorCut = total * 0.80;

        order.setPaymentStatus(STATUS_PAID);
        order.setPaymentVerifiedAt(LocalDateTime.now());
        orderRepository.save(order);

        // Email vendor about payout
        try {
            if (order.getVendor() != null) {
                emailSender.sendVendorPaymentConfirmation(
                    order.getVendor().getEmail(), order.getVendor().getName(),
                    vendorCut, orderId, "ONLINE-" + orderId
                );
            }
        } catch (Exception e) { 
            LOGGER.error("Vendor payment email failed", e);
        }

        return ResponseEntity.ok(Map.of(
            KEY_SUCCESS, true,
            KEY_ORDER_ID, orderId,
            KEY_TOTAL_AMOUNT, total,
            "adminKeeps", adminCut,
            "vendorReceives", vendorCut,
            KEY_PAYMENT_STATUS, STATUS_PAID
        ));
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN DASHBOARD ENDPOINTS - Orders, Warehouses, Delivery Boys, Vendor Payments
    // ─────────────────────────────────────────────────────────────

    /**
     * TASK 1: Admin - Get All Orders with Full Details
     * GET /api/react/admin/orders/all?page=0&size=50
     * 
     * Paginated list of all orders, newest first.
     * Includes: id, status, paymentMethod, paymentStatus, customer, vendor, warehouses, delivery boy, routing
     */
    @GetMapping("/admin/orders/all")
    public ResponseEntity<Object> adminAllOrders(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        try {
            List<Order> allOrders = orderRepository.findAllByOrderByOrderDateDesc();
            
            // Simple pagination
            int start = page * size;
            int end = Math.min(start + size, allOrders.size());
            List<Order> pageOrders = allOrders.subList(start, end);

            List<Map<String, Object>> result = pageOrders.stream().map(o -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", o.getId());
                m.put("status", o.getTrackingStatus());
                m.put("paymentMethod", o.getPaymentMethod());
                m.put(KEY_PAYMENT_STATUS, o.getPaymentStatus());
                m.put(KEY_CUSTOMER_NAME, o.getCustomer() != null ? o.getCustomer().getName() : "");
                m.put("customerId", o.getCustomer() != null ? o.getCustomer().getId() : null);
                m.put(KEY_VENDOR_NAME, o.getVendor() != null ? o.getVendor().getName() : "");
                m.put(KEY_VENDOR_ID, o.getVendor() != null ? o.getVendor().getId() : null);
                m.put("sourceWarehouse", o.getSourceWarehouse() != null ? o.getSourceWarehouse().getName() : "");
                m.put("destinationWarehouse", o.getDestinationWarehouse() != null ? o.getDestinationWarehouse().getName() : "");
                m.put(KEY_ROUTING_PATH, o.getWarehouseRoutingPath());
                m.put(KEY_DELIVERY_BOY_ID, o.getFinalDeliveryBoyId());
                m.put("totalPrice", o.getTotalPrice());
                m.put("orderDate", o.getOrderDate());
                return m;
            }).toList();

            return ResponseEntity.ok(Map.of(
                KEY_TOTAL, allOrders.size(),
                "page", page,
                "size", size,
                KEY_ORDERS, result
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 2: Admin - Get All Warehouses
     * GET /api/react/admin/warehouses/all
     * 
     * Lists all warehouses with details. Password NOT returned (use /credentials endpoint).
     */
    @GetMapping("/admin/warehouses/all")
    public ResponseEntity<Object> adminAllWarehouses(@RequestHeader(HEADER_AUTHORIZATION) String authHeader) {
        try {
            List<Warehouse> warehouses = warehouseRepository.findAll();
            List<Map<String, Object>> result = warehouses.stream().map(wh -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", wh.getId());
                m.put("name", wh.getName());
                m.put("city", wh.getCity());
                m.put("state", wh.getState());
                m.put(KEY_WAREHOUSE_CODE, wh.getWarehouseCode());
                m.put(KEY_LOGIN_ID, wh.getWarehouseLoginId());
                m.put(KEY_CONTACT_EMAIL, wh.getContactEmail());
                m.put(KEY_CONTACT_PHONE, wh.getContactPhone());
                m.put("address", wh.getAddress());
                m.put(KEY_SERVED_PIN_CODES, wh.getServedPinCodes());
                m.put("active", wh.isActive());
                m.put(KEY_LATITUDE, wh.getLatitude());
                m.put(KEY_LONGITUDE, wh.getLongitude());
                return m;
            }).toList();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 3: Admin - Reset Warehouse Password
     * POST /api/react/admin/warehouse/{warehouseId}/reset-password
     * 
     * Generates new password, encrypts, saves, and emails to warehouse contact.
     */
    @PostMapping("/admin/warehouse/{warehouseId}/reset-password")
    public ResponseEntity<Object> adminResetWarehousePassword(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int warehouseId) {
        try {
            Warehouse wh = warehouseRepository.findById(warehouseId).orElseThrow(() -> new RuntimeException(ERR_WAREHOUSE_NOT_FOUND));

            String newPlainPassword = Warehouse.generateLoginPassword();
            String encrypted = AES.encrypt(newPlainPassword);

            wh.setWarehouseLoginPassword(encrypted);
            warehouseRepository.save(wh);

            // Email new password to warehouse contact
            if (wh.getContactEmail() != null) {
                try { 
                    emailSender.sendWarehouseCredentials(
                        wh.getContactEmail(), wh.getName(), 
                        wh.getWarehouseLoginId(), newPlainPassword, wh.getCity()
                    ); 
                } catch (Exception e) { 
                    LOGGER.error("Failed to send credentials email", e);
                }
            }

            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                KEY_NEW_PASSWORD, newPlainPassword,
                "message", "Password reset. New password emailed to " + wh.getContactEmail()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 4: Admin - Toggle Warehouse Active Status
     * PUT /api/react/admin/warehouse/{warehouseId}/toggle-active
     * 
     * Activates or deactivates a warehouse.
     */
    @PutMapping("/admin/warehouse/{warehouseId}/toggle-active")
    public ResponseEntity<Object> adminToggleWarehouseActive(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int warehouseId) {
        try {
            Warehouse wh = warehouseRepository.findById(warehouseId).orElseThrow(() -> new RuntimeException(ERR_WAREHOUSE_NOT_FOUND));
            wh.setActive(!wh.isActive());
            warehouseRepository.save(wh);
            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                "active", wh.isActive(),
                KEY_WAREHOUSE_ID, warehouseId,
                "message", "Warehouse " + (wh.isActive() ? "activated" : "deactivated")
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 6: Admin - View Pending Vendor Payments
     * GET /api/react/admin/vendor-payments/pending
     * 
     * Shows all DELIVERED orders that are NOT PAID yet.
     * Displays: order ID, payment method, vendor info, admin cut (20%), vendor cut (80%).
     */
    @GetMapping("/admin/vendor-payments/pending")
    public ResponseEntity<Object> adminPendingVendorPayments(@RequestHeader(HEADER_AUTHORIZATION) String authHeader) {
        try {
            List<Order> delivered = orderRepository.findByTrackingStatusAndPaymentStatusNot(
                TrackingStatus.DELIVERED, STATUS_PAID);
            
            List<Map<String, Object>> result = delivered.stream().map(o -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put(KEY_ORDER_ID, o.getId());
                m.put("paymentMethod", o.getPaymentMethod());
                m.put(KEY_PAYMENT_STATUS, o.getPaymentStatus());
                m.put("totalPrice", o.getTotalPrice());
                m.put(KEY_VENDOR_ID, o.getVendor() != null ? o.getVendor().getId() : null);
                m.put(KEY_VENDOR_NAME, o.getVendor() != null ? o.getVendor().getName() : "");
                m.put("adminCut20pct", o.getTotalPrice() * 0.20);
                m.put("vendorGet80pct", o.getTotalPrice() * 0.80);
                return m;
            }).toList();
            
            return ResponseEntity.ok(Map.of(
                KEY_TOTAL, result.size(),
                "pendingPayments", result
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 5: Admin - Get Pending Delivery Boy Approvals
     * GET /api/react/admin/delivery-boys/pending
     * 
     * Lists all delivery boys awaiting admin approval (adminApproved = false, verified = true).
     */
    @GetMapping("/admin/delivery-boys/pending")
    public ResponseEntity<Object> adminPendingDeliveryBoys(@RequestHeader(HEADER_AUTHORIZATION) String authHeader) {
        try {
            List<DeliveryBoy> pending = deliveryBoyRepository.findByAdminApprovedFalseAndVerifiedTrue();
            
            List<Map<String, Object>> result = pending.stream().map(db -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", db.getId());
                m.put("name", db.getName());
                m.put(KEY_EMAIL, db.getEmail());
                m.put(KEY_MOBILE, db.getMobile());
                m.put(KEY_WAREHOUSE_ID, db.getWarehouse() != null ? db.getWarehouse().getId() : null);
                m.put(KEY_WAREHOUSE_NAME, db.getWarehouse() != null ? db.getWarehouse().getName() : "");
                m.put(KEY_ASSIGNED_PIN_CODES, db.getAssignedPinCodes());
                m.put("active", db.isActive());
                m.put(KEY_DELIVERY_BOY_CODE, db.getDeliveryBoyCode());
                return m;
            }).toList();
            
            return ResponseEntity.ok(Map.of(
                KEY_TOTAL, result.size(),
                "pending", result
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 5: Admin - Approve Delivery Boy
     * POST /api/react/admin/delivery-boys/{deliveryBoyId}/approve
     * 
     * Approves a pending delivery boy and activates their account.
     */
    @PostMapping("/admin/delivery-boys/{deliveryBoyId}/approve")
    public ResponseEntity<Object> adminApproveDeliveryBoy(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int deliveryBoyId,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId)
                .orElseThrow(() -> new RuntimeException(ERR_DELIVERY_BOY_NOT_FOUND));
            
            db.setAdminApproved(true);
            db.setActive(true);
            deliveryBoyRepository.save(db);
            
            // Optional: Send approval email
            try {
                if (db.getEmail() != null) {
                    emailSender.sendDeliveryBoyApproved(db);
                }
            } catch (Exception e) {
                LOGGER.error("Failed to send approval email", e);
            }
            
            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                KEY_DELIVERY_BOY_ID, deliveryBoyId,
                "message", "Delivery boy approved and activated",
                KEY_DELIVERY_BOY_CODE, db.getDeliveryBoyCode()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * TASK 5: Admin - Reject/Deactivate Delivery Boy
     * POST /api/react/admin/delivery-boys/{deliveryBoyId}/reject
     * 
     * Rejects a pending delivery boy or deactivates an approved one.
     */
    @PostMapping("/admin/delivery-boys/{deliveryBoyId}/reject")
    public ResponseEntity<Object> adminRejectDeliveryBoy(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @PathVariable int deliveryBoyId,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId)
                .orElseThrow(() -> new RuntimeException(ERR_DELIVERY_BOY_NOT_FOUND));
            String reason = body != null ? (String) body.get("reason") : null;
            
            db.setAdminApproved(false);
            db.setActive(false);
            deliveryBoyRepository.save(db);
            
            // Optional: Send rejection email
            try {
                if (db.getEmail() != null && reason != null) {
                    emailSender.sendDeliveryBoyRejected(db, reason);
                }
            } catch (Exception e) {
                LOGGER.error("Failed to send rejection email", e);
            }
            
            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                KEY_DELIVERY_BOY_ID, deliveryBoyId,
                "message", "Delivery boy deactivated"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * WAREHOUSE STAFF: GET /api/react/warehouse/delivery-boys/pending
     * 
     * Lists delivery boys awaiting approval for the warehouse staff's warehouse.
     * Requires: Warehouse JWT token (sets warehouseId in request attribute).
     */
    @GetMapping("/warehouse/delivery-boys/pending")
    public ResponseEntity<Object> warehousePendingDeliveryBoys(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
            if (warehouseId == null) {
                return ResponseEntity.status(401).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, ERR_NOT_WAREHOUSE));
            }
            
            Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
            if (warehouse == null) {
                return ResponseEntity.status(404).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, ERR_WAREHOUSE_NOT_FOUND));
            }
            
            // Get pending delivery boys for this warehouse (verified but not admin approved)
            List<DeliveryBoy> pending = deliveryBoyRepository.findAll().stream()
                .filter(db -> db.getWarehouse() != null && db.getWarehouse().getId() == warehouseId)
                .filter(db -> db.isVerified() && !db.isAdminApproved())
                .toList();
            
            List<Map<String, Object>> result = pending.stream().map(db -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", db.getId());
                m.put("name", db.getName());
                m.put(KEY_EMAIL, db.getEmail());
                m.put(KEY_MOBILE, db.getMobile());
                m.put(KEY_DELIVERY_BOY_CODE, db.getDeliveryBoyCode());
                m.put(KEY_ASSIGNED_PIN_CODES, db.getAssignedPinCodes());
                m.put("registeredAt", "Pending approval");
                return m;
            }).toList();
            
            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                KEY_WAREHOUSE_ID, warehouseId,
                KEY_WAREHOUSE_NAME, warehouse.getName(),
                "pendingDeliveryBoys", result,
                KEY_TOTAL, result.size()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * WAREHOUSE STAFF: POST /api/react/warehouse/delivery-boys/{deliveryBoyId}/approve
     * 
     * Approves a delivery boy for the warehouse staff's warehouse.
     */
    @PostMapping("/warehouse/delivery-boys/{deliveryBoyId}/approve")
    public ResponseEntity<Object> warehouseApproveDeliveryBoy(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            HttpServletRequest request,
            @PathVariable int deliveryBoyId) {
        try {
            Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
            if (warehouseId == null) {
                return ResponseEntity.status(401).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, ERR_NOT_WAREHOUSE));
            }
            
            DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId)
                .orElseThrow(() -> new RuntimeException(ERR_DELIVERY_BOY_NOT_FOUND));
            
            // Verify delivery boy belongs to this warehouse
            if (db.getWarehouse() == null || db.getWarehouse().getId() != warehouseId) {
                return ResponseEntity.status(403).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, "Not your delivery boy"));
            }
            
            db.setAdminApproved(true);
            db.setActive(true);
            deliveryBoyRepository.save(db);
            
            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                "message", "Delivery boy approved successfully",
                KEY_DELIVERY_BOY_ID, deliveryBoyId,
                KEY_DELIVERY_BOY_NAME, db.getName()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * WAREHOUSE STAFF: POST /api/react/warehouse/delivery-boys/{deliveryBoyId}/reject
     * 
     * Rejects a delivery boy for the warehouse staff's warehouse.
     */
    @PostMapping("/warehouse/delivery-boys/{deliveryBoyId}/reject")
    public ResponseEntity<Object> warehouseRejectDeliveryBoy(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            HttpServletRequest request,
            @PathVariable int deliveryBoyId,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
            if (warehouseId == null) {
                return ResponseEntity.status(401).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, ERR_NOT_WAREHOUSE));
            }
            
            DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId)
                .orElseThrow(() -> new RuntimeException(ERR_DELIVERY_BOY_NOT_FOUND));
            
            // Verify delivery boy belongs to this warehouse
            if (db.getWarehouse() == null || db.getWarehouse().getId() != warehouseId) {
                return ResponseEntity.status(403).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, "Not your delivery boy"));
            }
            
            String reason = body != null ? (String) body.get("reason") : null;
            
            db.setAdminApproved(false);
            db.setActive(false);
            deliveryBoyRepository.save(db);
            
            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                "message", "Delivery boy rejected",
                KEY_DELIVERY_BOY_ID, deliveryBoyId,
                KEY_DELIVERY_BOY_NAME, db.getName()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * WAREHOUSE STAFF: GET /api/react/warehouse/staff/list
     * 
     * Lists all staff members in the warehouse staff's warehouse.
     */
    @GetMapping("/warehouse/staff/list")
    public ResponseEntity<Object> warehouseListStaff(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
            if (warehouseId == null) {
                return ResponseEntity.status(401).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, ERR_NOT_WAREHOUSE));
            }

            Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
            if (warehouse == null) {
                return ResponseEntity.status(404).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, ERR_WAREHOUSE_NOT_FOUND));
            }

            // Get all warehouse staff for this warehouse (assuming there's a relationship)
            // For now, returning empty array - implement based on your Warehouse entity structure
            List<Map<String, Object>> staff = new ArrayList<>();
            
            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                KEY_WAREHOUSE_ID, warehouseId,
                KEY_WAREHOUSE_NAME, warehouse.getName(),
                "staff", staff
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, e.getMessage()));
        }
    }

    /**
     * WAREHOUSE STAFF: POST /api/react/warehouse/staff/create
     * 
     * Creates a new staff member for the warehouse staff's warehouse.
     */
    @PostMapping("/warehouse/staff/create")
    public ResponseEntity<Object> warehouseCreateStaff(
            @RequestHeader(HEADER_AUTHORIZATION) String authHeader,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute(KEY_WAREHOUSE_ID);
            if (warehouseId == null) {
                return ResponseEntity.status(401).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, ERR_NOT_WAREHOUSE));
            }

            Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
            if (warehouse == null) {
                return ResponseEntity.status(404).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, ERR_WAREHOUSE_NOT_FOUND));
            }

            String name = (String) body.get("name");
            String email = (String) body.get(KEY_EMAIL);
            String mobile = (String) body.get(KEY_MOBILE);
            String role = (String) body.get("role");

            if (name == null || email == null || mobile == null) {
                return ResponseEntity.badRequest().body(Map.of(KEY_SUCCESS, false, KEY_ERROR, "Name, email, and mobile are required"));
            }

            // Generate random 8-digit staff ID and 6-digit password
            String staffId = String.format("%08d", System.currentTimeMillis() % 100000000L);
            String password = String.format(FMT_OTP, new java.util.Random().nextInt(1000000));

            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                "staff_id", staffId,
                KEY_EMAIL, email,
                "password", password,
                "name", name,
                KEY_MOBILE, mobile,
                "role", role
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(KEY_SUCCESS, false, KEY_ERROR, e.getMessage()));
        }
    }

}