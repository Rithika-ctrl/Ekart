package com.example.ekart.controller;

import com.example.ekart.dto.*;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.JwtUtil;
import com.example.ekart.helper.PinCodeValidator;
import com.example.ekart.repository.*;
import com.example.ekart.service.AiAssistantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

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
 */
@RestController
@RequestMapping("/api/flutter")
@CrossOrigin(origins = "*")
public class FlutterApiController {

    @Autowired private CustomerRepository  customerRepository;
    @Autowired private VendorRepository    vendorRepository;
    @Autowired private ProductRepository   productRepository;
    @Autowired private OrderRepository     orderRepository;
    @Autowired private ItemRepository      itemRepository;
    @Autowired private WishlistRepository  wishlistRepository;
    @Autowired private AddressRepository   addressRepository;
    @Autowired private ReviewRepository    reviewRepository;
    @Autowired private RefundRepository    refundRepository;
    @Autowired private CouponRepository    couponRepository;
    @Autowired private AiAssistantService  aiAssistantService;

    private static final DateTimeFormatter CHAT_DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

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

    @Autowired
    private com.example.ekart.helper.EmailSender emailSender;

    @Autowired
    private JwtUtil jwtUtil;

    // Admin credentials come from application.properties (admin.email / admin.password)
    @org.springframework.beans.factory.annotation.Value("${admin.email}")
    private String adminEmail;

    @org.springframework.beans.factory.annotation.Value("${admin.password}")
    private String adminPassword;

    // ═══════════════════════════════════════════════════════
    // AUTH — CUSTOMER
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/auth/customer/register */
    @PostMapping("/auth/customer/register")
    public ResponseEntity<Map<String, Object>> customerRegister(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = (String) body.get("email");
            if (customerRepository.existsByEmail(email)) {
                res.put("success", false);
                res.put("message", "Email already registered");
                return ResponseEntity.badRequest().body(res);
            }
            Customer c = new Customer();
            c.setName((String) body.get("name"));
            c.setEmail(email);
            c.setMobile(Long.parseLong(body.get("mobile").toString()));
            c.setPassword(AES.encrypt((String) body.get("password")));
            c.setVerified(true);
            c.setRole(Role.CUSTOMER);
            c.setActive(true);
            customerRepository.save(c);
            res.put("success", true);
            res.put("message", "Registered successfully");
            res.put("customerId", c.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/customer/login */
    @PostMapping("/auth/customer/login")
    public ResponseEntity<Map<String, Object>> customerLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = (String) body.get("email");
            String password = (String) body.get("password");
            Customer c = customerRepository.findByEmail(email);
            if (c == null || !AES.decrypt(c.getPassword()).equals(password)) {
                res.put("success", false); res.put("message", "Invalid email or password");
                return ResponseEntity.badRequest().body(res);
            }
            if (!c.isActive()) {
                res.put("success", false); res.put("message", "Account suspended. Contact support.");
                return ResponseEntity.badRequest().body(res);
            }
            String token = jwtUtil.generateToken(c.getId(), c.getEmail(), "CUSTOMER");
            res.put("success", true);
            res.put("customerId", c.getId());
            res.put("name", c.getName());
            res.put("email", c.getEmail());
            res.put("mobile", c.getMobile());
            res.put("token", token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false); res.put("message", "Login failed: " + e.getMessage());
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
                res.put("success", false); res.put("message", "Email already registered");
                return ResponseEntity.badRequest().body(res);
            }
            Vendor v = new Vendor();
            v.setName((String) body.get("name"));
            v.setEmail(email);
            v.setMobile(Long.parseLong(body.get("mobile").toString()));
            v.setPassword(AES.encrypt((String) body.get("password")));
            v.setVerified(true);
            vendorRepository.save(v);
            res.put("success", true);
            res.put("message", "Registered successfully. Wait for admin approval.");
            res.put("vendorId", v.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false); res.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/vendor/login */
    @PostMapping("/auth/vendor/login")
    public ResponseEntity<Map<String, Object>> vendorLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = (String) body.get("email");
            String password = (String) body.get("password");
            Vendor v = vendorRepository.findByEmail(email);
            if (v == null || !AES.decrypt(v.getPassword()).equals(password)) {
                res.put("success", false); res.put("message", "Invalid email or password");
                return ResponseEntity.badRequest().body(res);
            }
            String token = jwtUtil.generateToken(v.getId(), v.getEmail(), "VENDOR");
            res.put("success", true);
            res.put("vendorId", v.getId());
            res.put("name", v.getName());
            res.put("email", v.getEmail());
            res.put("vendorCode", v.getVendorCode());
            res.put("token", token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false); res.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /**
     * POST /api/flutter/auth/admin/login
     * Body: { email, password }
     * Validates against admin.email / admin.password from application.properties.
     * Returns: { success, name, email, token, role:"ADMIN" }
     */
    @PostMapping("/auth/admin/login")
    public ResponseEntity<Map<String, Object>> adminLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        String email    = (String) body.get("email");
        String password = (String) body.get("password");
        if (email == null || password == null) {
            res.put("success", false); res.put("message", "Email and password are required");
            return ResponseEntity.badRequest().body(res);
        }
        if (!email.equals(adminEmail) || !password.equals(adminPassword)) {
            res.put("success", false); res.put("message", "Invalid admin credentials");
            return ResponseEntity.status(401).body(res);
        }
        // Token is a simple signed marker — not sensitive since admin screen is read-only
        String token = jwtUtil.generateToken(0, adminEmail, "ADMIN");
        res.put("success", true);
        res.put("adminId", 0);
        res.put("name", "Admin");
        res.put("email", adminEmail);
        res.put("token", token);
        res.put("role", "ADMIN");
        return ResponseEntity.ok(res);
    }

    @Autowired private DeliveryBoyRepository deliveryBoyRepository;

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
    public ResponseEntity<Map<String, Object>> deliveryLogin(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email    = ((String) body.getOrDefault("email",    "")).trim().toLowerCase();
            String password = ((String) body.getOrDefault("password", "")).trim();
            if (email.isEmpty() || password.isEmpty()) {
                res.put("success", false);
                res.put("message", "Email and password are required");
                return ResponseEntity.badRequest().body(res);
            }
            DeliveryBoy db = deliveryBoyRepository.findByEmail(email);
            if (db == null) {
                res.put("success", false);
                res.put("message", "No account found with this email");
                return ResponseEntity.badRequest().body(res);
            }
            String decrypted = AES.decrypt(db.getPassword());
            if (decrypted == null || !decrypted.equals(password)) {
                res.put("success", false);
                res.put("message", "Wrong password");
                return ResponseEntity.badRequest().body(res);
            }
            if (!db.isVerified()) {
                // Resend OTP exactly like the web flow does
                int otp = new java.util.Random().nextInt(100000, 1000000);
                db.setOtp(otp);
                deliveryBoyRepository.save(db);
                try { emailSender.sendDeliveryBoyOtp(db); } catch (Exception ignored) {}
                res.put("success", false);
                res.put("message", "Please verify your email first — OTP resent to " + email);
                return ResponseEntity.status(403).body(res);
            }
            if (!db.isActive()) {
                res.put("success", false);
                res.put("message", "Your account has been deactivated. Contact admin.");
                return ResponseEntity.status(403).body(res);
            }
            if (!db.isAdminApproved()) {
                res.put("success", false);
                res.put("message", "Your account is pending admin approval. You will receive an email once approved.");
                return ResponseEntity.status(403).body(res);
            }
            // All checks passed — issue a simple token (same pattern as customer/vendor)
            String token = jwtUtil.generateToken(db.getId(), db.getEmail(), "DELIVERY");
            res.put("success",       true);
            res.put("deliveryBoyId", db.getId());
            res.put("name",          db.getName());
            res.put("email",         db.getEmail());
            res.put("token",         token);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Login failed: " + e.getMessage());
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
    public ResponseEntity<Map<String, Object>> customerForgotPassword(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault("email", "")).trim().toLowerCase();
            if (email.isEmpty()) {
                res.put("success", false);
                res.put("message", "Email is required");
                return ResponseEntity.badRequest().body(res);
            }
            Customer customer = customerRepository.findByEmail(email);
            if (customer == null) {
                // Generic response — avoids leaking which emails are registered
                res.put("success", true);
                res.put("message", "If that email is registered, an OTP has been sent");
                return ResponseEntity.ok(res);
            }
            int otp = new java.util.Random().nextInt(100000, 1000000);
            customer.setOtp(otp);
            customerRepository.save(customer);
            emailSender.send(customer);   // reuses existing OTP email template
            // Clear any previously-verified flag for this email so a fresh verify is required
            otpVerified.remove(email);
            res.put("success", true);
            res.put("message", "OTP sent to your registered email");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
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
            String email = ((String) body.getOrDefault("email", "")).trim().toLowerCase();
            String otpStr = body.getOrDefault("otp", "").toString().trim();
            if (email.isEmpty() || otpStr.isEmpty()) {
                res.put("success", false);
                res.put("message", "Email and OTP are required");
                return ResponseEntity.badRequest().body(res);
            }
            Customer customer = customerRepository.findByEmail(email);
            if (customer == null) {
                res.put("success", false);
                res.put("message", "No account found with this email");
                return ResponseEntity.badRequest().body(res);
            }
            int otp;
            try { otp = Integer.parseInt(otpStr); } catch (NumberFormatException ex) {
                res.put("success", false);
                res.put("message", "Invalid OTP format");
                return ResponseEntity.badRequest().body(res);
            }
            if (customer.getOtp() != otp) {
                res.put("success", false);
                res.put("message", "Invalid or expired OTP");
                return ResponseEntity.badRequest().body(res);
            }
            // Mark this email as OTP-verified so reset-password can proceed
            otpVerified.put(email, "customer");
            res.put("success", true);
            res.put("message", "OTP verified");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Verification failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/customer/reset-password */
    @PostMapping("/auth/customer/reset-password")
    public ResponseEntity<Map<String, Object>> customerResetPassword(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email       = ((String) body.getOrDefault("email", "")).trim().toLowerCase();
            String newPassword = (String) body.get("newPassword");
            if (email.isEmpty() || newPassword == null || newPassword.isBlank()) {
                res.put("success", false);
                res.put("message", "Email and new password are required");
                return ResponseEntity.badRequest().body(res);
            }
            if (!otpVerified.containsKey(email)) {
                res.put("success", false);
                res.put("message", "OTP not verified — please complete the OTP step first");
                return ResponseEntity.badRequest().body(res);
            }
            Customer customer = customerRepository.findByEmail(email);
            if (customer == null) {
                res.put("success", false);
                res.put("message", "Account not found");
                return ResponseEntity.badRequest().body(res);
            }
            if (newPassword.length() < 8) {
                res.put("success", false);
                res.put("message", "Password must be at least 8 characters");
                return ResponseEntity.badRequest().body(res);
            }
            customer.setPassword(AES.encrypt(newPassword));
            customer.setOtp(0);   // invalidate OTP so it cannot be reused
            customerRepository.save(customer);
            otpVerified.remove(email);   // consume the verified flag — one use only
            res.put("success", true);
            res.put("message", "Password reset successfully. Please log in.");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Reset failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    // ── Vendor mirror ─────────────────────────────────────────────────────────

    /** POST /api/flutter/auth/vendor/forgot-password */
    @PostMapping("/auth/vendor/forgot-password")
    public ResponseEntity<Map<String, Object>> vendorForgotPassword(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email = ((String) body.getOrDefault("email", "")).trim().toLowerCase();
            if (email.isEmpty()) {
                res.put("success", false);
                res.put("message", "Email is required");
                return ResponseEntity.badRequest().body(res);
            }
            Vendor vendor = vendorRepository.findByEmail(email);
            if (vendor == null) {
                res.put("success", true);
                res.put("message", "If that email is registered, an OTP has been sent");
                return ResponseEntity.ok(res);
            }
            int otp = new java.util.Random().nextInt(100000, 1000000);
            vendor.setOtp(otp);
            vendorRepository.save(vendor);
            emailSender.send(vendor);
            otpVerified.remove(email);
            res.put("success", true);
            res.put("message", "OTP sent to your registered email");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
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
            String email  = ((String) body.getOrDefault("email", "")).trim().toLowerCase();
            String otpStr = body.getOrDefault("otp", "").toString().trim();
            if (email.isEmpty() || otpStr.isEmpty()) {
                res.put("success", false);
                res.put("message", "Email and OTP are required");
                return ResponseEntity.badRequest().body(res);
            }
            Vendor vendor = vendorRepository.findByEmail(email);
            if (vendor == null) {
                res.put("success", false);
                res.put("message", "No account found with this email");
                return ResponseEntity.badRequest().body(res);
            }
            int otp;
            try { otp = Integer.parseInt(otpStr); } catch (NumberFormatException ex) {
                res.put("success", false);
                res.put("message", "Invalid OTP format");
                return ResponseEntity.badRequest().body(res);
            }
            if (vendor.getOtp() != otp) {
                res.put("success", false);
                res.put("message", "Invalid or expired OTP");
                return ResponseEntity.badRequest().body(res);
            }
            otpVerified.put(email, "vendor");
            res.put("success", true);
            res.put("message", "OTP verified");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Verification failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** POST /api/flutter/auth/vendor/reset-password */
    @PostMapping("/auth/vendor/reset-password")
    public ResponseEntity<Map<String, Object>> vendorResetPassword(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            String email       = ((String) body.getOrDefault("email", "")).trim().toLowerCase();
            String newPassword = (String) body.get("newPassword");
            if (email.isEmpty() || newPassword == null || newPassword.isBlank()) {
                res.put("success", false);
                res.put("message", "Email and new password are required");
                return ResponseEntity.badRequest().body(res);
            }
            if (!otpVerified.containsKey(email)) {
                res.put("success", false);
                res.put("message", "OTP not verified — please complete the OTP step first");
                return ResponseEntity.badRequest().body(res);
            }
            Vendor vendor = vendorRepository.findByEmail(email);
            if (vendor == null) {
                res.put("success", false);
                res.put("message", "Account not found");
                return ResponseEntity.badRequest().body(res);
            }
            if (newPassword.length() < 8) {
                res.put("success", false);
                res.put("message", "Password must be at least 8 characters");
                return ResponseEntity.badRequest().body(res);
            }
            vendor.setPassword(AES.encrypt(newPassword));
            vendor.setOtp(0);
            vendorRepository.save(vendor);
            otpVerified.remove(email);
            res.put("success", true);
            res.put("message", "Password reset successfully. Please log in.");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Reset failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // PRODUCTS
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/products[?search=x][?category=y] */
    @GetMapping("/products")
    public ResponseEntity<Map<String, Object>> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {
        Map<String, Object> res = new HashMap<>();
        List<Product> products;
        if (search != null && !search.isBlank()) {
            products = productRepository.findByNameContainingIgnoreCase(search)
                    .stream().filter(Product::isApproved).collect(Collectors.toList());
        } else if (category != null && !category.isBlank()) {
            products = productRepository.findByCategoryAndApprovedTrue(category);
        } else {
            products = productRepository.findByApprovedTrue();
        }
        res.put("success", true);
        res.put("products", products.stream().map(this::mapProduct).collect(Collectors.toList()));
        res.put("count", products.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/{id} — includes reviews */
    @GetMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || !p.isApproved()) {
            res.put("success", false); res.put("message", "Product not found");
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
            m.put("customerName", r.getCustomerName());
            return m;
        }).collect(Collectors.toList()));
        pm.put("avgRating", Math.round(avg * 10.0) / 10.0);
        pm.put("reviewCount", reviews.size());
        res.put("success", true);
        res.put("product", pm);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/products/{id}/reviews */
    @GetMapping("/products/{id}/reviews")
    public ResponseEntity<Map<String, Object>> getProductReviews(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        List<Review> reviews = reviewRepository.findByProductId(id);
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        res.put("success", true);
        res.put("reviews", reviews.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("rating", r.getRating());
            m.put("comment", r.getComment());
            m.put("customerName", r.getCustomerName());
            return m;
        }).collect(Collectors.toList()));
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
                .distinct().sorted().collect(Collectors.toList());
        res.put("success", true);
        res.put("categories", categories);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // CART
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/cart */
    @GetMapping("/cart")
    public ResponseEntity<Map<String, Object>> getCart(@RequestHeader(value = "X-Customer-Id", required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Cart cart = customer.getCart();
        if (cart == null) { res.put("success", true); res.put("items", new ArrayList<>()); res.put("total", 0.0); res.put("subtotal", 0.0); res.put("count", 0); res.put("couponApplied", false); res.put("couponCode", ""); res.put("couponDiscount", 0.0); return ResponseEntity.ok(res); }
        List<Map<String, Object>> items = cart.getItems().stream().map(this::mapItem).collect(Collectors.toList());
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

        res.put("success",       true);
        res.put("items",         items);
        res.put("itemCount",     items.size());
        res.put("subtotal",      subtotal);           // pre-discount subtotal (for "add ₹X for free delivery" hint)
        res.put("couponDiscount",couponDiscount);      // already set above, re-affirm here for clarity
        res.put("deliveryCharge",deliveryCharge);      // 0 when free, 40 otherwise
        res.put("total",         total);               // discounted subtotal + delivery
        res.put("count",         items.size());
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
                .collect(Collectors.toList());
        res.put("success", true);
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
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put("success", false); res.put("message", "Missing X-Customer-Id header");
            return ResponseEntity.badRequest().body(res);
        }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            res.put("success", false); res.put("message", "Customer not found");
            return ResponseEntity.badRequest().body(res);
        }

        String code = body.get("code") instanceof String s ? s.toUpperCase().trim() : "";
        if (code.isEmpty()) {
            res.put("success", false); res.put("message", "Coupon code is required");
            return ResponseEntity.badRequest().body(res);
        }

        // Look up the coupon
        Coupon coupon = couponRepository.findByCode(code).orElse(null);
        if (coupon == null) {
            res.put("success", false); res.put("message", "Invalid coupon code");
            return ResponseEntity.ok(res);
        }
        if (!coupon.isValid()) {
            res.put("success", false); res.put("message", "This coupon has expired or reached its usage limit");
            return ResponseEntity.ok(res);
        }

        // Calculate current cart subtotal
        Cart cart = customer.getCart();
        double subtotal = (cart == null) ? 0 :
                cart.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();

        if (subtotal < coupon.getMinOrderAmount()) {
            res.put("success", false);
            res.put("message", "Minimum order amount ₹" + (int) coupon.getMinOrderAmount() + " required for this coupon");
            return ResponseEntity.ok(res);
        }

        double discount = coupon.calculateDiscount(subtotal);

        // Store for this customer (overwrites any previously applied coupon)
        appliedCoupons.put(customerId, coupon);

        res.put("success",      true);
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
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) {
            res.put("success", false); res.put("message", "Missing X-Customer-Id header");
            return ResponseEntity.badRequest().body(res);
        }
        appliedCoupons.remove(customerId);
        res.put("success", true); res.put("message", "Coupon removed");
        return ResponseEntity.ok(res);
    }

        /** POST /api/flutter/cart/add */
    @PostMapping("/cart/add")
        public ResponseEntity<Map<String, Object>> addToCart(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
                if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
            int productId = Integer.parseInt(body.get("productId").toString());
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null || !product.isApproved()) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.badRequest().body(res); }
            if (product.getStock() <= 0) { res.put("success", false); res.put("message", "Product out of stock"); return ResponseEntity.badRequest().body(res); }
            Cart cart = customer.getCart();
            if (cart == null) { cart = new Cart(); customer.setCart(cart); }
            Optional<Item> existing = cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId).findFirst();
            if (existing.isPresent()) {
                Item item = existing.get();
                if (item.getQuantity() >= product.getStock()) { res.put("success", false); res.put("message", "Max stock reached"); return ResponseEntity.badRequest().body(res); }
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
            res.put("success", true); res.put("message", "Added to cart");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** DELETE /api/flutter/cart/remove/{productId} */
    @DeleteMapping("/cart/remove/{productId}")
        public ResponseEntity<Map<String, Object>> removeFromCart(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId, @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
            if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null || customer.getCart() == null) { res.put("success", false); res.put("message", "Cart not found"); return ResponseEntity.badRequest().body(res); }
        List<Item> toRemove = customer.getCart().getItems().stream()
            .filter(i -> i.getProductId() != null && i.getProductId() == productId)
            .collect(java.util.stream.Collectors.toList());
        if (toRemove.isEmpty()) {
            res.put("success", false); res.put("message", "Item not found in cart");
            return ResponseEntity.status(404).body(res);
        }
        customer.getCart().getItems().removeAll(toRemove);
        customerRepository.save(customer);
        itemRepository.deleteAll(toRemove);  // explicit delete — ensures DB row is gone even without orphanRemoval
        res.put("success", true); res.put("message", "Removed from cart");
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/cart/update */
    @PutMapping("/cart/update")
        public ResponseEntity<Map<String, Object>> updateCart(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
            if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null || customer.getCart() == null) { res.put("success", false); res.put("message", "Cart not found"); return ResponseEntity.badRequest().body(res); }
        int productId = Integer.parseInt(body.get("productId").toString());
        int quantity  = Integer.parseInt(body.get("quantity").toString());
        Cart cart = customer.getCart();
        if (quantity <= 0) {
            List<Item> toRemove = cart.getItems().stream()
                .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                .collect(java.util.stream.Collectors.toList());
            cart.getItems().removeAll(toRemove);
            customerRepository.save(customer);
            itemRepository.deleteAll(toRemove);
        } else {
            cart.getItems().stream()
                .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                .findFirst().ifPresent(i -> i.setQuantity(quantity));
            customerRepository.save(customer);
        }
        res.put("success", true); res.put("message", "Cart updated");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // ORDERS — CUSTOMER
    // ═══════════════════════════════════════════════════════


    /** POST /api/flutter/orders/place — splits cart by vendor into sub-orders */
    @PostMapping("/orders/place")
    public ResponseEntity<Map<String, Object>> placeOrder(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        try {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) {
                res.put("success", false); res.put("message", "Customer not found");
                return ResponseEntity.badRequest().body(res);
            }
            Cart cart = customer.getCart();
            if (cart == null || cart.getItems().isEmpty()) {
                res.put("success", false); res.put("message", "Cart is empty");
                return ResponseEntity.badRequest().body(res);
            }

            String paymentMode    = (String) body.getOrDefault("paymentMode", "COD");
            String deliveryTime   = (String) body.getOrDefault("deliveryTime", "STANDARD");
            double deliveryCharge = "EXPRESS".equals(deliveryTime) ? 50.0 : 0.0;

            // ── Coupon — resolve discount from in-memory store ───────────────
            Coupon appliedCoupon = appliedCoupons.get(customerId);

            // ── Validate stock for all items first ──────────────
            for (Item cartItem : cart.getItems()) {
                Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                if (product == null || product.getStock() < cartItem.getQuantity()) {
                    res.put("success", false);
                    res.put("message", "Insufficient stock for: " + cartItem.getName());
                    return ResponseEntity.badRequest().body(res);
                }
            }

            // ── Group cart items by vendor ───────────────────────
            Map<Integer, List<Item>>   vendorItems = new LinkedHashMap<>();
            Map<Integer, Vendor>       vendorMap   = new LinkedHashMap<>();

            double grandTotal = 0;
            for (Item cartItem : cart.getItems()) {
                Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                int vKey = (product != null && product.getVendor() != null)
                           ? product.getVendor().getId() : 0;
                if (product != null && product.getVendor() != null)
                    vendorMap.put(vKey, product.getVendor());
                vendorItems.computeIfAbsent(vKey, k -> new ArrayList<>()).add(cartItem);
                grandTotal += cartItem.getPrice() * cartItem.getQuantity();
            }

            // Apply coupon discount to grandTotal (validate again in case cart changed)
            double couponDiscount = 0;
            String appliedCouponCode = "";
            if (appliedCoupon != null && appliedCoupon.isValid()
                    && grandTotal >= appliedCoupon.getMinOrderAmount()) {
                couponDiscount   = appliedCoupon.calculateDiscount(grandTotal);
                appliedCouponCode = appliedCoupon.getCode();
            }
            double discountedTotal = Math.max(0, grandTotal - couponDiscount);

            // ── Deduct stock ────────────────────────────────────
            for (Item cartItem : cart.getItems()) {
                Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                if (product != null) {
                    product.setStock(product.getStock() - cartItem.getQuantity());
                    productRepository.save(product);
                }
            }

            boolean multiVendor = vendorItems.size() > 1;
            Integer parentId    = null;
            Order   firstOrder  = null;
            List<Integer> subOrderIds = new ArrayList<>();

            for (Map.Entry<Integer, List<Item>> entry : vendorItems.entrySet()) {
                int vKey              = entry.getKey();
                List<Item> group      = entry.getValue();
                Vendor vendor         = vendorMap.get(vKey);

                double subTotal = 0;
                for (Item ci : group) subTotal += ci.getPrice() * ci.getQuantity();
                // Pro-rate the coupon discount across vendor sub-orders by their share of grandTotal
                double subDiscount = (grandTotal > 0) ? couponDiscount * (subTotal / grandTotal) : 0;
                double subDelivery = (firstOrder == null) ? deliveryCharge : 0.0;

                List<Item> orderItems = new ArrayList<>();
                for (Item cartItem : group) {
                    Item oi = new Item();
                    oi.setName(cartItem.getName());
                    oi.setDescription(cartItem.getDescription());
                    oi.setPrice(cartItem.getPrice());
                    oi.setCategory(cartItem.getCategory());
                    oi.setQuantity(cartItem.getQuantity());
                    oi.setImageLink(cartItem.getImageLink());
                    oi.setProductId(cartItem.getProductId());
                    orderItems.add(oi);
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
                subOrder.setCurrentCity((String) body.getOrDefault("city", ""));
                if (vendor != null) {
                    subOrder.setVendorId(vendor.getId());
                    subOrder.setVendorName(vendor.getName());
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

            // Clear cart
            cart.getItems().clear();
            customerRepository.save(customer);

            // Increment coupon usedCount and clear from in-memory store
            if (appliedCoupon != null && !appliedCouponCode.isEmpty()) {
                appliedCoupon.setUsedCount(appliedCoupon.getUsedCount() + 1);
                couponRepository.save(appliedCoupon);
                appliedCoupons.remove(customerId);
            }

            res.put("success",        true);
            res.put("message",        "Order placed successfully");
            res.put("orderId",        firstOrder.getId());
            res.put("subOrderIds",    subOrderIds);
            res.put("totalPrice",     discountedTotal + deliveryCharge);
            res.put("couponDiscount", couponDiscount);
            res.put("couponCode",     appliedCouponCode);
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put("success", false);
            res.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** GET /api/flutter/orders */
    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> getOrders(@RequestHeader(value = "X-Customer-Id", required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Order> orders = orderRepository.findByCustomer(customer);
        res.put("success", true);
        res.put("orders", orders.stream().map(this::mapOrder).collect(Collectors.toList()));
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/orders/{id} */
    @GetMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrder(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        res.put("success", true); res.put("order", mapOrder(order));
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/orders/{id}/cancel */
    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        if (order.getTrackingStatus() == TrackingStatus.DELIVERED || order.getTrackingStatus() == TrackingStatus.CANCELLED) { res.put("success", false); res.put("message", "Cannot cancel this order"); return ResponseEntity.badRequest().body(res); }
        for (Item item : order.getItems()) {
            if (item.getProductId() != null) {
                productRepository.findById(item.getProductId()).ifPresent(p -> { p.setStock(p.getStock() + item.getQuantity()); productRepository.save(p); });
            }
        }
        order.setTrackingStatus(TrackingStatus.CANCELLED); orderRepository.save(order);
        res.put("success", true); res.put("message", "Order cancelled");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // WISHLIST  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/wishlist */
    @GetMapping("/wishlist")
    public ResponseEntity<Map<String, Object>> getWishlist(@RequestHeader(value = "X-Customer-Id", required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Wishlist> wishlist = wishlistRepository.findByCustomer(customer);
        List<Map<String, Object>> items = wishlist.stream().map(w -> {
            Map<String, Object> m = new HashMap<>();
            Product p = w.getProduct();
            m.put("wishlistId", w.getId()); m.put("addedAt", w.getAddedAt() != null ? w.getAddedAt().toString() : null);
            m.put("productId", p.getId()); m.put("name", p.getName()); m.put("price", p.getPrice());
            m.put("imageLink", p.getImageLink()); m.put("category", p.getCategory()); m.put("inStock", p.getStock() > 0);
            return m;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("count", items.size()); res.put("items", items);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/wishlist/ids */
    @GetMapping("/wishlist/ids")
    public ResponseEntity<Map<String, Object>> getWishlistIds(@RequestHeader(value = "X-Customer-Id", required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Integer> ids = wishlistRepository.findByCustomer(customer).stream()
                .map(w -> w.getProduct().getId()).collect(Collectors.toList());
        res.put("success", true); res.put("ids", ids);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/wishlist/toggle */
    @PostMapping("/wishlist/toggle")
    public ResponseEntity<Map<String, Object>> toggleWishlist(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @RequestBody Map<String, Integer> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Integer productId = body.get("productId");
        if (productId == null) { res.put("success", false); res.put("message", "productId is required"); return ResponseEntity.badRequest().body(res); }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.status(404).body(res); }
        List<Wishlist> existing = wishlistRepository.findByCustomer(customer).stream()
                .filter(w -> w.getProduct().getId() == productId).collect(Collectors.toList());
        if (!existing.isEmpty()) {
            wishlistRepository.deleteAll(existing);
            res.put("success", true); res.put("wishlisted", false); res.put("message", "Removed from wishlist");
        } else {
            Wishlist w = new Wishlist(); w.setCustomer(customer); w.setProduct(product); w.setAddedAt(LocalDateTime.now());
            wishlistRepository.save(w);
            res.put("success", true); res.put("wishlisted", true); res.put("message", "Added to wishlist");
        }
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // PROFILE  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/profile */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@RequestHeader(value = "X-Customer-Id", required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", customer.getId()); profile.put("name", customer.getName());
        profile.put("email", customer.getEmail()); profile.put("mobile", customer.getMobile());
        profile.put("profileImage", customer.getProfileImage());
        profile.put("lastLogin", customer.getLastLogin() != null ? customer.getLastLogin().toString() : null);
        profile.put("provider",  customer.getProvider()  != null ? customer.getProvider() : "local");
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
        }).collect(Collectors.toList()));
        res.put("success", true); res.put("profile", profile);
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/profile/update */
    @PutMapping("/profile/update")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name"))   customer.setName((String) body.get("name"));
        if (body.containsKey("mobile")) customer.setMobile(Long.parseLong(body.get("mobile").toString()));
        customerRepository.save(customer);
        res.put("success", true); res.put("message", "Profile updated successfully");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/profile/address/add
     * Accepts structured fields: recipientName, houseStreet, city, state, postalCode.
     * Also accepts legacy "address" flat-text field for backward compatibility.
     */
    @PostMapping("/profile/address/add")
    public ResponseEntity<Map<String, Object>> addAddress(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }

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
            if (!postalCode.isBlank() && !PinCodeValidator.isValid(postalCode)) {
                res.put("success", false);
                res.put("message", PinCodeValidator.ERROR_MESSAGE);
                return ResponseEntity.badRequest().body(res);
            }
            address.setPostalCode(postalCode);
        } else {
            // Legacy flat-text fallback
            String details = body.get("address");
            if (details == null || details.isBlank()) {
                res.put("success", false); res.put("message", "Address cannot be empty");
                return ResponseEntity.badRequest().body(res);
            }
            address.setDetails(details.trim());
        }

        customer.getAddresses().add(address);
        customerRepository.save(customer);
        res.put("success", true); res.put("message", "Address added");
        res.put("addressId", address.getId());
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/profile/address/{id}/delete */
    @DeleteMapping("/profile/address/{id}/delete")
    public ResponseEntity<Map<String, Object>> deleteAddress(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        customer.getAddresses().removeIf(a -> a.getId() == id);
        customerRepository.save(customer);
        res.put("success", true); res.put("message", "Address deleted");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // REVIEWS  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/reviews/add */
    @PostMapping("/reviews/add")
    public ResponseEntity<Map<String, Object>> addReview(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        int productId = Integer.parseInt(body.get("productId").toString());
        int rating    = Integer.parseInt(body.get("rating").toString());
        String comment = (String) body.get("comment");
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.status(404).body(res); }
        Review review = new Review();
        review.setProduct(product); review.setRating(rating); review.setComment(comment);
        review.setCustomerName(customer.getName());
        reviewRepository.save(review);
        res.put("success", true); res.put("message", "Review added successfully");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // SPENDING SUMMARY  (X-Customer-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/spending-summary */
    @GetMapping("/spending-summary")
    public ResponseEntity<Map<String, Object>> getSpendingSummary(@RequestHeader(value = "X-Customer-Id", required = false) Integer customerId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Order> delivered = orderRepository.findByCustomer(customer).stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED).collect(Collectors.toList());
        if (delivered.isEmpty()) { res.put("success", true); res.put("hasData", false); return ResponseEntity.ok(res); }
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
        res.put("success", true); res.put("hasData", true);
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
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        try {
            if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
            int orderId  = Integer.parseInt(body.get("orderId").toString());
            String reason = (String) body.getOrDefault("reason", "");
            String type   = (String) body.getOrDefault("type", "REFUND");
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
            if (order.getTrackingStatus() != TrackingStatus.DELIVERED) { res.put("success", false); res.put("message", "Refund can only be requested for delivered orders"); return ResponseEntity.badRequest().body(res); }
            Refund refund = new Refund();
            refund.setOrder(order); refund.setCustomer(customer);
            // Prepend type (REFUND/REPLACEMENT) to reason so it's stored without a separate column
            refund.setReason("[" + type + "] " + reason);
            refund.setStatus(RefundStatus.PENDING);
            refund.setAmount(order.getTotalPrice());
            refundRepository.save(refund);
            res.put("success", true); res.put("message", "Refund request submitted");
            res.put("refundId", refund.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** GET /api/flutter/refund/status/{orderId} */
    @GetMapping("/refund/status/{orderId}")
    public ResponseEntity<Map<String, Object>> getRefundStatus(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId, @PathVariable int orderId) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        List<Refund> refunds = refundRepository.findByOrder(order);
        if (refunds.isEmpty()) { res.put("success", true); res.put("hasRefund", false); return ResponseEntity.ok(res); }
        Refund latest = refunds.get(refunds.size() - 1);
        res.put("success", true); res.put("hasRefund", true);
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
    // VENDOR — VIEW  (X-Vendor-Id)
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/vendor/products */
    @GetMapping("/vendor/products")
    public ResponseEntity<Map<String, Object>> getVendorProducts(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Product> products = productRepository.findByVendor(vendor);
        res.put("success", true);
        res.put("products", products.stream().map(this::mapProduct).collect(Collectors.toList()));
        res.put("count", products.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/orders */
    @GetMapping("/vendor/orders")
    public ResponseEntity<Map<String, Object>> getVendorOrders(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Integer> vendorProductIds = productRepository.findByVendor(vendor).stream().map(Product::getId).collect(Collectors.toList());
        List<Order> allOrders = orderRepository.findOrdersByVendor(vendor);
        List<Map<String, Object>> vendorOrders = allOrders.stream().map(order -> {
            Map<String, Object> o = mapOrder(order);
            List<Map<String, Object>> vendorItems = order.getItems().stream()
                    .filter(i -> i.getProductId() != null && vendorProductIds.contains(i.getProductId()))
                    .map(this::mapItem).collect(Collectors.toList());
            o.put("items", vendorItems);
            double vendorTotal = vendorItems.stream().mapToDouble(i -> (double) i.get("price") * (int) i.get("quantity")).sum();
            o.put("vendorTotal", vendorTotal);
            return o;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("orders", vendorOrders);
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/vendor/stats */
    @GetMapping("/vendor/stats")
    public ResponseEntity<Map<String, Object>> getVendorStats(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Product> products = productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).collect(Collectors.toList());
        List<Order> orders = orderRepository.findOrdersByVendor(vendor);
        double totalRevenue = orders.stream().filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED)
                .flatMap(o -> o.getItems().stream())
                .filter(i -> i.getProductId() != null && productIds.contains(i.getProductId()))
                .mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        long activeProducts   = products.stream().filter(Product::isApproved).count();
        long lowStockProducts = products.stream().filter(p -> p.getStock() <= (p.getStockAlertThreshold() != null ? p.getStockAlertThreshold() : 10)).count();
        res.put("success", true); res.put("totalRevenue", totalRevenue);
        res.put("totalOrders", orders.size()); res.put("totalProducts", products.size());
        res.put("activeProducts", activeProducts); res.put("lowStockProducts", lowStockProducts);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // VENDOR — PRODUCT CRUD  (X-Vendor-Id)
    // ═══════════════════════════════════════════════════════

    /** POST /api/flutter/vendor/products/add */
    @PostMapping("/vendor/products/add")
    public ResponseEntity<Map<String, Object>> vendorAddProduct(
            @RequestHeader("X-Vendor-Id") int vendorId, @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        try {
            Product p = new Product();
            p.setName((String) body.get("name")); p.setDescription((String) body.get("description"));
            p.setPrice(Double.parseDouble(body.get("price").toString()));
            p.setCategory((String) body.get("category"));
            p.setStock(Integer.parseInt(body.get("stock").toString()));
            p.setImageLink((String) body.getOrDefault("imageLink", ""));
            p.setApproved(false); p.setVendor(vendor);
            Object thresh = body.get("stockAlertThreshold");
            if (thresh != null) p.setStockAlertThreshold(Integer.parseInt(thresh.toString()));
            productRepository.save(p);
            res.put("success", true); res.put("message", "Product added. Pending admin approval."); res.put("productId", p.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** PUT /api/flutter/vendor/products/{id}/update */
    @PutMapping("/vendor/products/{id}/update")
    public ResponseEntity<Map<String, Object>> vendorUpdateProduct(
            @RequestHeader("X-Vendor-Id") int vendorId, @PathVariable int id, @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || p.getVendor() == null || p.getVendor().getId() != vendorId) { res.put("success", false); res.put("message", "Product not found or not yours"); return ResponseEntity.badRequest().body(res); }
        try {
            if (body.containsKey("name"))        p.setName((String) body.get("name"));
            if (body.containsKey("description")) p.setDescription((String) body.get("description"));
            if (body.containsKey("price"))       p.setPrice(Double.parseDouble(body.get("price").toString()));
            if (body.containsKey("category"))    p.setCategory((String) body.get("category"));
            if (body.containsKey("stock"))       p.setStock(Integer.parseInt(body.get("stock").toString()));
            if (body.containsKey("imageLink"))   p.setImageLink((String) body.get("imageLink"));
            if (body.containsKey("stockAlertThreshold")) p.setStockAlertThreshold(Integer.parseInt(body.get("stockAlertThreshold").toString()));
            productRepository.save(p);
            res.put("success", true); res.put("message", "Product updated successfully.");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /** DELETE /api/flutter/vendor/products/{id}/delete */
    @DeleteMapping("/vendor/products/{id}/delete")
    public ResponseEntity<Map<String, Object>> vendorDeleteProduct(
            @RequestHeader("X-Vendor-Id") int vendorId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        Product p = productRepository.findById(id).orElse(null);
        if (p == null || p.getVendor() == null || p.getVendor().getId() != vendorId) { res.put("success", false); res.put("message", "Product not found or not yours"); return ResponseEntity.badRequest().body(res); }
        productRepository.delete(p);
        res.put("success", true); res.put("message", "Product deleted.");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/vendor/products/upload-csv
     * Multipart form: file (CSV)
     * CSV columns supported: id (optional), name, description, price, mrp (optional), category, stock, imageLink, stockAlertThreshold
     * If id is provided and product belongs to vendor, the product is updated; otherwise a new product is created (approved=false).
     */
    @PostMapping("/vendor/products/upload-csv")
    public ResponseEntity<Map<String, Object>> vendorUploadCsv(
            @RequestHeader("X-Vendor-Id") int vendorId,
            @RequestParam("file") MultipartFile file) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        if (file == null || file.isEmpty()) { res.put("success", false); res.put("message", "No file uploaded"); return ResponseEntity.badRequest().body(res); }

        int created = 0, updated = 0; List<String> errors = new ArrayList<>();
        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream()))) {
            String header = reader.readLine();
            if (header == null) { res.put("success", false); res.put("message", "Empty file"); return ResponseEntity.badRequest().body(res); }
            String[] cols = parseCsvLine(header);
            Map<String, Integer> idx = new HashMap<>();
            for (int i = 0; i < cols.length; i++) idx.put(cols[i].trim().toLowerCase(), i);

            String line; int row = 1;
            while ((line = reader.readLine()) != null) {
                row++;
                if (line.isBlank()) continue;
                String[] cells = parseCsvLine(line);
                try {
                    String idStr = getCell(cells, idx.get("id"));
                    String name = getCell(cells, idx.get("name"));
                    String desc = getCell(cells, idx.get("description"));
                    String priceStr = getCell(cells, idx.get("price"));
                    String mrpStr = getCell(cells, idx.get("mrp"));
                    String category = getCell(cells, idx.get("category"));
                    String stockStr = getCell(cells, idx.get("stock"));
                    String imageLink = getCell(cells, idx.get("imagelink"));
                    String threshStr = getCell(cells, idx.get("stockalertthreshold"));

                    if (name == null || name.isBlank()) throw new IllegalArgumentException("Missing name");
                    if (priceStr == null || priceStr.isBlank()) throw new IllegalArgumentException("Missing price");

                    double price = Double.parseDouble(priceStr);
                    int stock = (stockStr == null || stockStr.isBlank()) ? 0 : Integer.parseInt(stockStr);
                    Integer thresh = (threshStr == null || threshStr.isBlank()) ? null : Integer.parseInt(threshStr);
                    Double mrp = (mrpStr == null || mrpStr.isBlank()) ? 0.0 : Double.parseDouble(mrpStr);

                    if (idStr != null && !idStr.isBlank()) {
                        int id = Integer.parseInt(idStr);
                        Product p = productRepository.findById(id).orElse(null);
                        if (p == null) throw new IllegalArgumentException("Product id " + id + " not found");
                        if (p.getVendor() == null || p.getVendor().getId() != vendorId) throw new IllegalArgumentException("Product id " + id + " does not belong to you");
                        p.setName(name); p.setDescription(desc); p.setPrice(price); p.setMrp(mrp); p.setCategory(category); p.setStock(stock);
                        if (imageLink != null) p.setImageLink(imageLink);
                        if (thresh != null) p.setStockAlertThreshold(thresh);
                        productRepository.save(p); updated++;
                    } else {
                        Product p = new Product();
                        p.setName(name); p.setDescription(desc); p.setPrice(price); p.setMrp(mrp); p.setCategory(category); p.setStock(stock);
                        if (imageLink != null) p.setImageLink(imageLink);
                        if (thresh != null) p.setStockAlertThreshold(thresh);
                        p.setVendor(vendor); p.setApproved(false);
                        productRepository.save(p); created++;
                    }
                } catch (Exception e) {
                    errors.add("Row " + row + ": " + e.getMessage());
                    if (errors.size() > 50) break;
                }
            }
        } catch (Exception e) { res.put("success", false); res.put("message", "Failed to process file: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }

        res.put("success", true); res.put("created", created); res.put("updated", updated); res.put("errors", errors);
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

    /** GET /api/flutter/vendor/sales-report */
    @GetMapping("/vendor/sales-report")
    public ResponseEntity<Map<String, Object>> vendorSalesReport(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Product> products = productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).collect(Collectors.toList());
        List<Order> allOrders = orderRepository.findOrdersByVendor(vendor);
        List<Order> activeOrders = allOrders.stream().filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED).collect(Collectors.toList());
        double totalRevenue = activeOrders.stream().flatMap(o -> o.getItems().stream())
                .filter(i -> i.getProductId() != null && productIds.contains(i.getProductId()))
                .mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        long pendingOrders = allOrders.stream().filter(o -> o.getTrackingStatus() == TrackingStatus.PROCESSING || o.getTrackingStatus() == TrackingStatus.SHIPPED).count();
        Map<Integer, Integer> unitsSoldMap = new HashMap<>();
        for (Order o : activeOrders) {
            for (Item item : o.getItems()) {
                if (item.getProductId() != null && productIds.contains(item.getProductId())) unitsSoldMap.merge(item.getProductId(), item.getQuantity(), Integer::sum);
            }
        }
        List<Map<String, Object>> topProducts = products.stream()
                .filter(p -> unitsSoldMap.containsKey(p.getId()))
                .sorted((a, b) -> Integer.compare(unitsSoldMap.getOrDefault(b.getId(), 0), unitsSoldMap.getOrDefault(a.getId(), 0)))
                .limit(10).map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    int units = unitsSoldMap.getOrDefault(p.getId(), 0);
                    m.put("id", p.getId()); m.put("name", p.getName()); m.put("unitsSold", units); m.put("revenue", units * p.getPrice());
                    return m;
                }).collect(Collectors.toList());
        List<Map<String, Object>> recentOrders = allOrders.stream()
                .sorted(Comparator.comparingInt(Order::getId).reversed()).limit(10).map(o -> {
                    List<Item> vi = o.getItems().stream().filter(i -> i.getProductId() != null && productIds.contains(i.getProductId())).collect(Collectors.toList());
                    double vTotal = vi.stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", o.getId()); m.put("trackingStatus", o.getTrackingStatus().name()); m.put("vendorTotal", vTotal);
                    return m;
                }).collect(Collectors.toList());
        res.put("success", true); res.put("totalRevenue", totalRevenue);
        res.put("totalOrders", allOrders.size()); res.put("totalProducts", products.size());
        res.put("pendingOrders", pendingOrders); res.put("topProducts", topProducts); res.put("recentOrders", recentOrders);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // HELPER MAPPERS
    // ═══════════════════════════════════════════════════════

    private Map<String, Object> mapProduct(Product p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId()); m.put("name", p.getName()); m.put("description", p.getDescription());
        m.put("price", p.getPrice()); m.put("category", p.getCategory()); m.put("stock", p.getStock());
        m.put("imageLink", p.getImageLink()); m.put("extraImageLinks", p.getExtraImageLinks());
        m.put("approved", p.isApproved());
        m.put("vendorCode", p.getVendor() != null ? p.getVendor().getVendorCode() : null);
        return m;
    }

    private Map<String, Object> mapItem(Item i) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", i.getId()); m.put("name", i.getName()); m.put("description", i.getDescription());
        m.put("price", i.getPrice()); m.put("category", i.getCategory());
        m.put("quantity", i.getQuantity()); m.put("imageLink", i.getImageLink()); m.put("productId", i.getProductId());
        return m;
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
        m.put("items", o.getItems().stream().map(this::mapItem).collect(Collectors.toList()));
        // Include customer name for admin views
        if (o.getCustomer() != null) m.put("customerName", o.getCustomer().getName());
        return m;
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN ENDPOINTS  (no special auth — secured by admin login on web side)
    // Flutter admin screens call these after admin logs in on web
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/admin/users — returns all customers + vendors */
    @GetMapping("/admin/users")
    public ResponseEntity<Map<String, Object>> adminGetUsers() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> customers = customerRepository.findAll().stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId()); m.put("name", c.getName()); m.put("email", c.getEmail());
            m.put("mobile", c.getMobile()); m.put("active", c.isActive()); m.put("verified", c.isVerified());
            return m;
        }).collect(Collectors.toList());
        List<Map<String, Object>> vendors = vendorRepository.findAll().stream().map(v -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", v.getId()); m.put("name", v.getName()); m.put("email", v.getEmail());
            m.put("mobile", v.getMobile()); m.put("vendorCode", v.getVendorCode());
            m.put("active", v.isVerified()); m.put("verified", v.isVerified());
            return m;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("customers", customers); res.put("vendors", vendors);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/customers/{id}/toggle-active */
    @PostMapping("/admin/customers/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleCustomer(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer c = customerRepository.findById(id).orElse(null);
        if (c == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        c.setActive(!c.isActive());
        customerRepository.save(c);
        res.put("success", true); res.put("message", c.isActive() ? "Account activated" : "Account suspended"); res.put("active", c.isActive());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/vendors/{id}/toggle-active */
    @PostMapping("/admin/vendors/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleVendor(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor v = vendorRepository.findById(id).orElse(null);
        if (v == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        v.setVerified(!v.isVerified());
        vendorRepository.save(v);
        res.put("success", true); res.put("message", v.isVerified() ? "Vendor activated" : "Vendor suspended"); res.put("active", v.isVerified());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/products — returns all products with approval status */
    @GetMapping("/admin/products")
    public ResponseEntity<Map<String, Object>> adminGetProducts() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> products = productRepository.findAll().stream()
                .sorted(Comparator.comparingInt(p -> p.isApproved() ? 0 : 1))
                .map(this::mapProduct).collect(Collectors.toList());
        res.put("success", true); res.put("products", products);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/approve */
    @PostMapping("/admin/products/{id}/approve")
    public ResponseEntity<Map<String, Object>> adminApproveProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.badRequest().body(res); }
        p.setApproved(true);
        productRepository.save(p);
        res.put("success", true); res.put("message", "Product approved and is now visible to customers");
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/reject */
    @PostMapping("/admin/products/{id}/reject")
    public ResponseEntity<Map<String, Object>> adminRejectProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.badRequest().body(res); }
        p.setApproved(false);
        productRepository.save(p);
        res.put("success", true); res.put("message", "Product rejected / hidden from customers");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/orders — all orders with customer info */
    @GetMapping("/admin/orders")
    public ResponseEntity<Map<String, Object>> adminGetOrders() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
                .sorted(Comparator.comparingInt(Order::getId).reversed())
                .limit(200) // cap at 200 most recent orders for admin view
                .map(this::mapOrder).collect(Collectors.toList());
        res.put("success", true); res.put("orders", orders);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/orders/{id}/status  body: { status } */
    @PostMapping("/admin/orders/{id}/status")
    public ResponseEntity<Map<String, Object>> adminUpdateOrderStatus(
            @PathVariable int id, @RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        try {
            TrackingStatus newStatus = TrackingStatus.valueOf(body.get("status"));
            order.setTrackingStatus(newStatus);
            orderRepository.save(order);
            res.put("success", true); res.put("message", "Order status updated to " + newStatus.getDisplayName());
        } catch (IllegalArgumentException e) {
            res.put("success", false); res.put("message", "Invalid status: " + body.get("status"));
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/vendors — vendor list (alias of user list vendor section) */
    @GetMapping("/admin/vendors")
    public ResponseEntity<Map<String, Object>> adminGetVendors() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> vendors = vendorRepository.findAll().stream().map(v -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", v.getId()); m.put("name", v.getName()); m.put("email", v.getEmail());
            m.put("mobile", v.getMobile()); m.put("vendorCode", v.getVendorCode());
            m.put("active", v.isVerified()); m.put("verified", v.isVerified());
            return m;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("vendors", vendors);
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════
    // NEW ENDPOINTS — Reorder, Password Change, Vendor Profile,
    // Stock Alerts
    // ═══════════════════════════════════════════════════════

    @Autowired private StockAlertRepository stockAlertRepository;

    /**
     * POST /api/flutter/orders/{id}/reorder
     * Clears cart and re-adds all in-stock items from the given past order.
     * Header: X-Customer-Id
     */
    @PostMapping("/orders/{id}/reorder")
    public ResponseEntity<Map<String, Object>> reorder(
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }

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

        res.put("success", true);
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
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        if (customerId == null) { res.put("success", false); res.put("message", "Missing X-Customer-Id header"); return ResponseEntity.badRequest().body(res); }
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        String current = (String) body.get("currentPassword");
        String newPwd  = (String) body.get("newPassword");
        if (current == null || newPwd == null) { res.put("success", false); res.put("message", "Both passwords required"); return ResponseEntity.badRequest().body(res); }
        try {
            if (!AES.decrypt(customer.getPassword()).equals(current)) {
                res.put("success", false); res.put("message", "Current password is incorrect");
                return ResponseEntity.badRequest().body(res);
            }
            if (newPwd.length() < 8) { res.put("success", false); res.put("message", "New password must be at least 8 characters"); return ResponseEntity.badRequest().body(res); }
            customer.setPassword(AES.encrypt(newPwd));
            customerRepository.save(customer);
            res.put("success", true); res.put("message", "Password changed successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    /**
     * GET /api/flutter/vendor/profile
     * Header: X-Vendor-Id
     */
    @GetMapping("/vendor/profile")
    public ResponseEntity<Map<String, Object>> getVendorProfile(
            @RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> v = new HashMap<>();
        v.put("id", vendor.getId()); v.put("name", vendor.getName());
        v.put("email", vendor.getEmail()); v.put("mobile", vendor.getMobile());
        v.put("vendorCode", vendor.getVendorCode()); v.put("verified", vendor.isVerified());
        res.put("success", true); res.put("vendor", v);
        return ResponseEntity.ok(res);
    }

    /**
     * PUT /api/flutter/vendor/profile/update
     * Header: X-Vendor-Id
     * Body: { name, mobile }
     */
    @PutMapping("/vendor/profile/update")
    public ResponseEntity<Map<String, Object>> updateVendorProfile(
            @RequestHeader("X-Vendor-Id") int vendorId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        if (body.containsKey("name") && !((String) body.get("name")).isBlank())
            vendor.setName((String) body.get("name"));
        if (body.containsKey("mobile"))
            try { vendor.setMobile(Long.parseLong(body.get("mobile").toString())); } catch (Exception ignored) {}
        vendorRepository.save(vendor);
        res.put("success", true); res.put("message", "Profile updated successfully");
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/flutter/vendor/stock-alerts
     * Header: X-Vendor-Id
     */
    @GetMapping("/vendor/stock-alerts")
    public ResponseEntity<Map<String, Object>> getStockAlerts(
            @RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
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
            m.put("productId",   a.getProduct() != null ? a.getProduct().getId()   : 0);
            m.put("currentStock", a.getProduct() != null ? a.getProduct().getStock() : 0);
            m.put("threshold",    a.getProduct() != null && a.getProduct().getStockAlertThreshold() != null
                    ? a.getProduct().getStockAlertThreshold() : 10);
            m.put("message",      a.getMessage());
            m.put("acknowledged", a.isAcknowledged());
            m.put("alertTime",    a.getAlertTime() != null ? a.getAlertTime().toString() : null);
            return m;
        }).collect(Collectors.toList());
        res.put("success", true);
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
            @RequestHeader("X-Vendor-Id") int vendorId,
            @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        StockAlert alert = stockAlertRepository.findById(id).orElse(null);
        if (alert == null || alert.getVendor().getId() != vendorId) { res.put("success", false); res.put("message", "Alert not found"); return ResponseEntity.badRequest().body(res); }
        alert.setAcknowledged(true);
        stockAlertRepository.save(alert);
        res.put("success", true); res.put("message", "Alert acknowledged");
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
            @RequestHeader(value = "X-Customer-Id", required = false) Integer customerId,
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
            List<Order> recent = orders.stream().limit(10).collect(Collectors.toList());
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
                .collect(Collectors.toList());
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
}