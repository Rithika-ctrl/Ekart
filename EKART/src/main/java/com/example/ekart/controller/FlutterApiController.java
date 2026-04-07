package com.example.ekart.controller;

import com.example.ekart.dto.*;
import org.springframework.transaction.annotation.Transactional;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.helper.PinCodeValidator;
import com.example.ekart.repository.*;
import com.example.ekart.service.AdminAuthService;
import com.example.ekart.service.MobileApiReadService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ⚠️  DEPRECATED: Flutter REST API Controller for Ekart Mobile App.
 * 
 * Base path: /api/flutter
 * 
 * DEPRECATION NOTICE:
 * This controller duplicates nearly all endpoints from ReactApiController (/api/react).
 * To reduce maintenance burden and prevent divergence, clients should migrate to /api/react.
 * 
 * Migration Timeline:
 *   - CURRENT: Fully functional but DEPRECATED
 *   - NEXT MAJOR RELEASE: Will be removed
 * 
 * Clients still using /api/flutter should:
 *   1. Review differences between /api/flutter and /api/react endpoints
 *   2. Update client code to use /api/react equivalents
 *   3. Test thoroughly before deploying
 *
 * For migration guidance, see ReactApiController javadoc or contact DevOps.
 * 
 * Auth pattern:
 *   X-Customer-Id: <id>  for customer endpoints
 *   X-Vendor-Id:   <id>  for vendor endpoints
 *
 * All endpoints are under /api/flutter/** which is already
 * permitted in SecurityConfig (Chain 1 = permitAll, stateless).
 *
 * DEPRECATED ENDPOINTS (use /api/react equivalents instead):
 *   GET  /api/flutter/banners                       → GET  /api/react/banners
 *   POST /api/flutter/orders/place                  → POST /api/react/orders/place
 *   POST /api/flutter/notify-me/{productId}         → POST /api/react/notify-me/{productId}
 *   DELETE /api/flutter/notify-me/{productId}       → DELETE /api/react/notify-me/{productId}
 *   GET  /api/flutter/notify-me/{productId}         → GET  /api/react/notify-me/{productId}
 *
 * @deprecated Use {@link ReactApiController} (/api/react) instead. This controller will be removed in a future major release.
 * @see ReactApiController
 */
@Deprecated(since = "0.0.1", forRemoval = true)
@ConditionalOnProperty(name = "ekart.api.flutter.enabled", havingValue = "true", matchIfMissing = true)
@RestController
@RequestMapping("/api/flutter")
@CrossOrigin(origins = "*")
public class FlutterApiController {

    @Autowired private CustomerRepository          customerRepository;
    @Autowired private VendorRepository            vendorRepository;
    @Autowired private ProductRepository           productRepository;
    @Autowired private OrderRepository             orderRepository;
    @Autowired private ItemRepository              itemRepository;
    @Autowired private WishlistRepository          wishlistRepository;
    //@Autowired private AddressRepository           addressRepository; // unused
    @Autowired private ReviewRepository            reviewRepository;
    @Autowired private RefundRepository            refundRepository;
    @Autowired private StockAlertRepository        stockAlertRepository;
    @Autowired private BannerRepository            bannerRepository;
    @Autowired private BackInStockRepository       backInStockRepository;
    @Autowired private DeliveryBoyRepository              deliveryBoyRepository;
    @Autowired private WarehouseRepository                warehouseRepository;
    @Autowired private TrackingEventLogRepository         trackingEventLogRepository;
    @Autowired private DeliveryOtpRepository              deliveryOtpRepository;
    @Autowired private WarehouseChangeRequestRepository   warehouseChangeRequestRepository;
    @Autowired private EmailSender                        emailSender;
    @Autowired private AdminAuthService                   adminAuthService;
    @Autowired private MobileApiReadService               mobileApiReadService;

    // Admin credentials are now database-backed via AdminAuthService.
    // See AdminCredential entity and AdminAuthService for implementation.
    // Admin setup instructions are in .env.example

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
            String token = Base64.getEncoder().encodeToString((c.getId() + ":" + c.getEmail()).getBytes());
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
            String token = Base64.getEncoder().encodeToString((v.getId() + ":" + v.getEmail()).getBytes());
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
     * Authenticates admin via database-backed credentials with optional 2FA.
     * 
     * If 2FA is NOT enabled:
     *   Returns: { success: true, adminId, name, email, token, role: "ADMIN" }
     * 
     * If 2FA IS enabled:
     *   Returns: { success: true, adminId, requires2FA: true, message: "Please provide 2FA code" }
     *   Next step: POST /api/flutter/auth/admin/verify-2fa with { adminId, totpCode }
     * 
     * Failure cases:
     *   - Invalid credentials       → 401 + message
     *   - Account locked (5 fails)  → 403 + message (auto-unlocks after 15 min)
     */
    @PostMapping("/auth/admin/login")
    public ResponseEntity<Map<String, Object>> adminLogin(@RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        String email    = (String) body.get("email");
        String password = (String) body.get("password");
        if (email == null || password == null) {
            res.put("success", false); 
            res.put("message", "Email and password are required");
            return ResponseEntity.badRequest().body(res);
        }
        
        // Attempt authentication via AdminAuthService (BCrypt verification, brute force protection)
        com.example.ekart.dto.AuthenticationResult authResult = adminAuthService.authenticate(email, password);
        
        if (!authResult.isSuccess()) {
            // Authentication failed
            res.put("success", false);
            res.put("message", authResult.getMessage());
            return ResponseEntity.status(401).body(res);
        }
        
        // Authentication succeeded
        if (authResult.isRequires2FA()) {
            // 2FA is enabled — client must provide TOTP code in next request
            res.put("success", true);
            res.put("adminId", authResult.getAdminId());
            res.put("requires2FA", true);
            res.put("message", "Please provide 2FA code from your authenticator app");
            return ResponseEntity.ok(res);
        }
        
        // No 2FA — issue token immediately (Base64 encoded for backward compatibility with Flutter)
        String token = Base64.getEncoder().encodeToString(("admin:" + email).getBytes());
        res.put("success", true);
        res.put("adminId", authResult.getAdminId());
        res.put("name", authResult.getAdminName() != null ? authResult.getAdminName() : "Admin");
        res.put("email", email);
        res.put("token", token);
        res.put("role", "ADMIN");
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/auth/admin/verify-2fa
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
            adminId = ((Number) body.get("adminId")).intValue();
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Invalid adminId");
            return ResponseEntity.badRequest().body(res);
        }
        
        if (totpCode == null || totpCode.isEmpty()) {
            res.put("success", false);
            res.put("message", "2FA code is required");
            return ResponseEntity.badRequest().body(res);
        }
        
        // Verify TOTP code
        com.example.ekart.dto.VerificationResult verifyResult = adminAuthService.verify2FA(adminId, totpCode);
        
        if (!verifyResult.isSuccess()) {
            res.put("success", false);
            res.put("message", verifyResult.getMessage());
            return ResponseEntity.status(401).body(res);
        }
        
        // 2FA verification successful — issue token (Base64 encoded for Flutter)
        String token = Base64.getEncoder().encodeToString(("admin:" + adminId).getBytes());
        res.put("success", true);
        res.put("adminId", adminId);
        res.put("token", token);
        res.put("message", "2FA verification successful");
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
            String password = (String) body.get("password");

            if (email == null || password == null) {
                res.put("success", false);
                res.put("message", "Email and password are required");
                return ResponseEntity.badRequest().body(res);
            }

            DeliveryBoy db = deliveryBoyRepository.findByEmail(email);
            if (db == null) {
                res.put("success", false);
                res.put("message", "No account found with this email");
                return ResponseEntity.status(401).body(res);
            }

            String decrypted = AES.decrypt(db.getPassword());
            if (decrypted == null || !decrypted.equals(password)) {
                res.put("success", false);
                res.put("message", "Wrong password");
                return ResponseEntity.status(401).body(res);
            }

            if (!db.isVerified()) {
                res.put("success", false);
                res.put("status", "unverified");
                res.put("deliveryBoyId", db.getId());
                res.put("message", "Email not verified. Please check your inbox for the OTP.");
                return ResponseEntity.status(403).body(res);
            }

            if (!db.isActive()) {
                res.put("success", false);
                res.put("status", "inactive");
                res.put("message", "Your account has been deactivated. Contact admin.");
                return ResponseEntity.status(403).body(res);
            }

            if (!db.isAdminApproved()) {
                res.put("success", false);
                res.put("status", "pending");
                res.put("message", "Your account is pending admin approval. You will be notified by email once approved.");
                return ResponseEntity.status(403).body(res);
            }

            res.put("success", true);
            res.put("status", "active");
            res.put("deliveryBoyId",   db.getId());
            res.put("name",            db.getName());
            res.put("email",           db.getEmail());
            res.put("deliveryBoyCode", db.getDeliveryBoyCode() != null ? db.getDeliveryBoyCode() : "");
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // ═══════════════════════════════════════════════════════
    // DELIVERY BOY — DASHBOARD & ACTIONS (stateless, header-auth)
    // All endpoints identify the delivery boy via X-Delivery-Boy-Id header.
    // ═══════════════════════════════════════════════════════

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
            res.put("success", false); res.put("message", "Not authenticated");
            return ResponseEntity.status(401).body(res);
        }
        // Refresh from DB
        db = deliveryBoyRepository.findById(db.getId()).orElseThrow();

        // Profile block
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id",               db.getId());
        profile.put("name",             db.getName());
        profile.put("email",            db.getEmail());
        profile.put("mobile",           db.getMobile());
        profile.put("deliveryBoyCode",  db.getDeliveryBoyCode() != null ? db.getDeliveryBoyCode() : "");
        profile.put("assignedPinCodes", db.getAssignedPinCodes() != null ? db.getAssignedPinCodes() : "");
        if (db.getWarehouse() != null) {
            Map<String, Object> wh = new LinkedHashMap<>();
            wh.put("id",   db.getWarehouse().getId());
            wh.put("name", db.getWarehouse().getName());
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

        res.put("success",   true);
        res.put("profile",   profile);
        res.put("toPickUp",  toPickUp);   // SHIPPED   → Mark Picked Up
        res.put("outNow",    outNow);     // OUT_FOR_DELIVERY → Confirm Delivery (OTP)
        res.put("delivered", delivered);  // DELIVERED → history
        return ResponseEntity.ok(res);
    }

    /** Helper: convert Order to map for delivery responses */
    private Map<String, Object> orderToMap(Order o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",              o.getId());
        m.put("trackingStatus",  o.getTrackingStatus().name());
        m.put("statusDisplay",   o.getTrackingStatus().getDisplayName());
        m.put("amount",          o.getAmount());
        m.put("totalPrice",      o.getTotalPrice());
        m.put("paymentMode",     o.getPaymentMode());
        m.put("deliveryTime",    o.getDeliveryTime());
        m.put("currentCity",     o.getCurrentCity() != null ? o.getCurrentCity() : "");
        m.put("deliveryAddress", o.getDeliveryAddress() != null ? o.getDeliveryAddress() : "");
        if (o.getCustomer() != null) {
            Map<String, Object> cust = new LinkedHashMap<>();
            cust.put("id",     o.getCustomer().getId());
            cust.put("name",   o.getCustomer().getName());
            cust.put("mobile", o.getCustomer().getMobile());
            m.put("customer", cust);
        }
        // Include items
        List<Map<String, Object>> items = new ArrayList<>();
        if (o.getItems() != null) {
            for (Item item : o.getItems()) {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("productName", item.getName() != null ? item.getName() : "");
                im.put("quantity",    item.getQuantity());
                im.put("price",       item.getPrice());
                items.add(im);
            }
        }
        m.put("items", items);
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
            res.put("success", false); res.put("message", "Not authenticated");
            return ResponseEntity.status(401).body(res);
        }
        db = deliveryBoyRepository.findById(db.getId()).orElseThrow();

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            res.put("success", false); res.put("message", "Order not found");
            return ResponseEntity.badRequest().body(res);
        }
        if (order.getDeliveryBoy() == null || order.getDeliveryBoy().getId() != db.getId()) {
            res.put("success", false); res.put("message", "This order is not assigned to you");
            return ResponseEntity.status(403).body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.SHIPPED) {
            res.put("success", false);
            res.put("message", "Order status is " + order.getTrackingStatus().getDisplayName() + " — cannot mark pickup");
            return ResponseEntity.badRequest().body(res);
        }

        String city = db.getWarehouse() != null ? db.getWarehouse().getCity() : "Warehouse";
        order.setTrackingStatus(TrackingStatus.OUT_FOR_DELIVERY);
        order.setCurrentCity("On the way — " + city);
        orderRepository.save(order);

        trackingEventLogRepository.save(new TrackingEventLog(
            order, TrackingStatus.OUT_FOR_DELIVERY,
            "On the way — " + city,
            "Parcel picked up by delivery boy " + db.getName(), "delivery_boy"));

        // Generate and send OTP to customer
        int otp = new Random().nextInt(100000, 1000000);
        deliveryOtpRepository.findByOrder(order).ifPresent(deliveryOtpRepository::delete);
        deliveryOtpRepository.save(new DeliveryOtp(order, otp));

        try {
            emailSender.sendDeliveryOtp(order.getCustomer(), otp, order.getId());
        } catch (Exception e) {
            System.err.println("Delivery OTP email failed: " + e.getMessage());
        }

        res.put("success", true);
        res.put("message", "Marked as Out for Delivery. OTP sent to customer's email.");
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
            res.put("success", false); res.put("message", "Not authenticated");
            return ResponseEntity.status(401).body(res);
        }

        int submittedOtp;
        try {
            submittedOtp = Integer.parseInt(body.getOrDefault("otp", "0").toString());
        } catch (NumberFormatException e) {
            res.put("success", false); res.put("message", "Invalid OTP format");
            return ResponseEntity.badRequest().body(res);
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            res.put("success", false); res.put("message", "Order not found");
            return ResponseEntity.badRequest().body(res);
        }
        if (order.getDeliveryBoy() == null || order.getDeliveryBoy().getId() != db.getId()) {
            res.put("success", false); res.put("message", "This order is not assigned to you");
            return ResponseEntity.status(403).body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.OUT_FOR_DELIVERY) {
            res.put("success", false); res.put("message", "Order is not out for delivery");
            return ResponseEntity.badRequest().body(res);
        }

        DeliveryOtp deliveryOtp = deliveryOtpRepository.findByOrder(order).orElse(null);
        if (deliveryOtp == null) {
            res.put("success", false); res.put("message", "No OTP found for this order");
            return ResponseEntity.badRequest().body(res);
        }
        if (deliveryOtp.isUsed()) {
            res.put("success", false); res.put("message", "OTP already used");
            return ResponseEntity.badRequest().body(res);
        }
        if (deliveryOtp.getOtp() != submittedOtp) {
            res.put("success", false); res.put("message", "Wrong OTP. Ask the customer for the correct OTP.");
            return ResponseEntity.badRequest().body(res);
        }

        deliveryOtp.setUsed(true);
        deliveryOtp.setUsedAt(LocalDateTime.now());
        deliveryOtpRepository.save(deliveryOtp);

        order.setTrackingStatus(TrackingStatus.DELIVERED);
        order.setCurrentCity("Delivered");
        orderRepository.save(order);

        trackingEventLogRepository.save(new TrackingEventLog(
            order, TrackingStatus.DELIVERED,
            "Delivered to customer",
            "Delivered by " + db.getName() + ". OTP verified at doorstep.", "delivery_boy"));

        try {
            emailSender.sendDeliveryConfirmation(order.getCustomer(), order);
        } catch (Exception e) {
            System.err.println("Delivery confirmation email failed: " + e.getMessage());
        }

        res.put("success", true);
        res.put("message", "Order #" + id + " marked as Delivered!");
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
            res.put("success", false); res.put("message", "Not authenticated");
            return ResponseEntity.status(401).body(res);
        }
        db = deliveryBoyRepository.findById(db.getId()).orElseThrow();

        int warehouseId;
        try {
            warehouseId = Integer.parseInt(body.getOrDefault("warehouseId", "0").toString());
        } catch (NumberFormatException e) {
            res.put("success", false); res.put("message", "Invalid warehouse ID");
            return ResponseEntity.badRequest().body(res);
        }
        String reason = (String) body.getOrDefault("reason", "");

        Optional<WarehouseChangeRequest> existing = warehouseChangeRequestRepository
                .findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING);
        if (existing.isPresent()) {
            res.put("success", false);
            res.put("message", "You already have a pending warehouse change request. Please wait for admin to review it.");
            return ResponseEntity.ok(res);
        }

        Warehouse requested = warehouseRepository.findById(warehouseId).orElse(null);
        if (requested == null) {
            res.put("success", false); res.put("message", "Warehouse not found");
            return ResponseEntity.badRequest().body(res);
        }
        if (db.getWarehouse() != null && db.getWarehouse().getId() == warehouseId) {
            res.put("success", false); res.put("message", "You are already assigned to this warehouse");
            return ResponseEntity.ok(res);
        }

        WarehouseChangeRequest req = new WarehouseChangeRequest();
        req.setDeliveryBoy(db);
        req.setRequestedWarehouse(requested);
        req.setReason(reason.trim());
        req.setStatus(WarehouseChangeRequest.Status.PENDING);
        req.setRequestedAt(LocalDateTime.now());
        warehouseChangeRequestRepository.save(req);

        res.put("success", true);
        res.put("message", "Warehouse change request submitted. Admin will review it shortly.");
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
            m.put("id",   wh.getId());
            m.put("name", wh.getName());
            m.put("city", wh.getCity());
            m.put("code", wh.getWarehouseCode());
            return m;
        }).collect(Collectors.toList());
        res.put("success", true);
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
            bm.put("id",           b.getId());
            bm.put("title",        b.getTitle()    != null ? b.getTitle()    : "");
            bm.put("imageUrl",     b.getImageUrl() != null ? b.getImageUrl() : "");
            bm.put("linkUrl",      b.getLinkUrl()  != null ? b.getLinkUrl()  : "");
            bm.put("displayOrder", b.getDisplayOrder());
            return bm;
        }).collect(Collectors.toList());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("count",   bannerList.size());
        res.put("banners", bannerList);
        return ResponseEntity.ok(res);
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
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getProduct() != null && r.getProduct().getId() == id)
                .collect(Collectors.toList());
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
        List<Review> reviews = reviewRepository.findAll().stream()
                .filter(r -> r.getProduct() != null && r.getProduct().getId() == id)
                .collect(Collectors.toList());
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
    public ResponseEntity<Map<String, Object>> getCart(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Cart cart = customer.getCart();
        if (cart == null) { res.put("success", true); res.put("items", new ArrayList<>()); res.put("total", 0.0); res.put("count", 0); return ResponseEntity.ok(res); }
        List<Map<String, Object>> items = cart.getItems().stream().map(this::mapItem).collect(Collectors.toList());
        double total = cart.getItems().stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        res.put("success", true); res.put("items", items); res.put("total", total); res.put("count", items.size());
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
    @Transactional
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int productId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null || customer.getCart() == null) { res.put("success", false); res.put("message", "Cart not found"); return ResponseEntity.badRequest().body(res); }
        List<Item> toDelete = customer.getCart().getItems().stream()
                .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                .collect(Collectors.toList());
        customer.getCart().getItems().removeAll(toDelete);
        customerRepository.save(customer);
        itemRepository.deleteAll(toDelete);
        res.put("success", true); res.put("message", "Removed from cart");
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/cart/update */
    @PutMapping("/cart/update")
    public ResponseEntity<Map<String, Object>> updateCart(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null || customer.getCart() == null) { res.put("success", false); res.put("message", "Cart not found"); return ResponseEntity.badRequest().body(res); }
        int productId = Integer.parseInt(body.get("productId").toString());
        int quantity  = Integer.parseInt(body.get("quantity").toString());
        Cart cart = customer.getCart();
        if (quantity <= 0) {
            List<Item> toDelete = cart.getItems().stream()
                    .filter(i -> i.getProductId() != null && i.getProductId() == productId)
                    .collect(Collectors.toList());
            cart.getItems().removeAll(toDelete);
            customerRepository.save(customer);
            itemRepository.deleteAll(toDelete);
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
            if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
            Cart cart = customer.getCart();
            if (cart == null || cart.getItems().isEmpty()) { res.put("success", false); res.put("message", "Cart is empty"); return ResponseEntity.badRequest().body(res); }

            List<Item> orderItems = new ArrayList<>();
            double total = 0;
            for (Item cartItem : cart.getItems()) {
                Product product = productRepository.findById(cartItem.getProductId()).orElse(null);
                if (product == null || product.getStock() < cartItem.getQuantity()) {
                    res.put("success", false);
                    res.put("message", "Insufficient stock for: " + cartItem.getName());
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

            String deliveryTime   = (String) body.getOrDefault("deliveryTime", "STANDARD");
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
                    res.put("success", false);
                    res.put("message", PinCodeValidator.ERROR_MESSAGE);
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
            order.setPaymentMode((String) body.getOrDefault("paymentMode", "COD"));
            order.setDeliveryTime(deliveryTime);
            order.setDateTime(LocalDateTime.now());
            order.setTrackingStatus(TrackingStatus.PROCESSING);
            order.setReplacementRequested(false);
            order.setCurrentCity(deliveryAddress);
            orderRepository.save(order);

            cart.getItems().clear();
            customerRepository.save(customer);

            res.put("success", true);
            res.put("message", "Order placed successfully");
            res.put("orderId", order.getId());
            res.put("totalPrice", order.getTotalPrice());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false); res.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(res);
        }
    }

    /** GET /api/flutter/orders */
    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> getOrders(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Order> orders = mobileApiReadService.findOrdersWithItems(customer);
        res.put("success", true);
        res.put("orders", orders.stream().map(this::mapOrder).collect(Collectors.toList()));
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/orders/{id} */
    @GetMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrder(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = mobileApiReadService.findOrderWithItems(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        res.put("success", true); res.put("order", mapOrder(order));
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/orders/{id}/cancel */
    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Order order = mobileApiReadService.findOrderWithItems(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        if (order.getTrackingStatus() == TrackingStatus.DELIVERED || order.getTrackingStatus() == TrackingStatus.CANCELLED) {
            res.put("success", false); res.put("message", "Cannot cancel this order");
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
        res.put("success", true); res.put("message", "Order cancelled");
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
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Wishlist> wishlist = mobileApiReadService.findWishlistWithProducts(customer);
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
    public ResponseEntity<Map<String, Object>> getWishlistIds(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Integer> ids = mobileApiReadService.findWishlistWithProducts(customer).stream()
                .map(w -> w.getProduct().getId()).collect(Collectors.toList());
        res.put("success", true); res.put("ids", ids);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/wishlist/toggle */
    @PostMapping("/wishlist/toggle")
    public ResponseEntity<Map<String, Object>> toggleWishlist(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Integer> body) {
        Map<String, Object> res = new HashMap<>();
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
    // PROFILE
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/profile */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@RequestHeader("X-Customer-Id") int customerId) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = mobileApiReadService.findCustomerWithAddresses(customerId);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", customer.getId()); profile.put("name", customer.getName());
        profile.put("email", customer.getEmail()); profile.put("mobile", customer.getMobile());
        profile.put("profileImage", customer.getProfileImage());
        profile.put("addresses", customer.getAddresses().stream().map(a -> {
            Map<String, Object> am = new HashMap<>();
            am.put("id",              a.getId());
            am.put("formattedAddress", a.getFormattedAddress());
            am.put("recipientName",   a.getRecipientName() != null ? a.getRecipientName() : "");
            am.put("houseStreet",     a.getHouseStreet()   != null ? a.getHouseStreet()   : "");
            am.put("city",            a.getCity()          != null ? a.getCity()          : "");
            am.put("state",           a.getState()         != null ? a.getState()         : "");
            am.put("postalCode",      a.getPostalCode()    != null ? a.getPostalCode()    : "");
            am.put("details",         a.getDetails()       != null ? a.getDetails()       : "");
            return am;
        }).collect(Collectors.toList()));
        res.put("success", true); res.put("profile", profile);
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/profile/update */
    @PutMapping("/profile/update")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
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
    @Transactional
    public ResponseEntity<Map<String, Object>> addAddress(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, String> body) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = mobileApiReadService.findCustomerWithAddresses(customerId);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }

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
                res.put("success", false);
                res.put("message", PinCodeValidator.ERROR_MESSAGE);
                return ResponseEntity.badRequest().body(res);
            }
            address.setPostalCode(postalCode);
        } else {
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
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteAddress(
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Customer customer = mobileApiReadService.findCustomerWithAddresses(customerId);
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        customer.getAddresses().removeIf(a -> a.getId() == id);
        customerRepository.save(customer);
        res.put("success", true); res.put("message", "Address deleted");
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
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        int productId  = Integer.parseInt(body.get("productId").toString());
        int rating     = Integer.parseInt(body.get("rating").toString());
        String comment = (String) body.get("comment");
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.status(404).body(res); }
        if (reviewRepository.existsByProductIdAndCustomerId(productId, customer.getId())) {
            res.put("success", false); res.put("message", "You have already reviewed this product");
            return ResponseEntity.badRequest().body(res);
        }
        int safeRating = Math.max(1, Math.min(5, rating));
        Review review = new Review();
        review.setProduct(product); review.setRating(safeRating); review.setComment(comment);
        review.setCustomer(customer);
        reviewRepository.save(review);
        res.put("success", true); res.put("message", "Review added successfully");
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
            res.put("success", false); res.put("message", "Customer not found");
            return ResponseEntity.badRequest().body(res);
        }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put("success", false); res.put("message", "Product not found");
            return ResponseEntity.status(404).body(res);
        }
        if (product.getStock() > 0) {
            res.put("success", false);
            res.put("message", "Product is already in stock — add it to your cart!");
            res.put("subscribed", false);
            return ResponseEntity.badRequest().body(res);
        }
        // Prevent duplicate subscriptions
        if (backInStockRepository.existsByCustomerAndProductAndNotifiedFalse(customer, product)) {
            res.put("success", true);
            res.put("subscribed", true);
            res.put("message", "You are already subscribed. We'll email you when it's back!");
            return ResponseEntity.ok(res);
        }
        BackInStockSubscription sub = new BackInStockSubscription(customer, product);
        backInStockRepository.save(sub);
        res.put("success", true);
        res.put("subscribed", true);
        res.put("message", "You'll be notified when " + product.getName() + " is back in stock!");
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
            res.put("success", false); res.put("message", "Customer not found");
            return ResponseEntity.badRequest().body(res);
        }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put("success", false); res.put("message", "Product not found");
            return ResponseEntity.status(404).body(res);
        }
        Optional<BackInStockSubscription> existing =
                backInStockRepository.findByCustomerAndProduct(customer, product);
        if (existing.isPresent()) {
            backInStockRepository.delete(existing.get());
            res.put("success", true);
            res.put("subscribed", false);
            res.put("message", "Notification removed");
        } else {
            res.put("success", true);
            res.put("subscribed", false);
            res.put("message", "No active subscription found");
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
            res.put("success", false); res.put("message", "Customer not found");
            return ResponseEntity.badRequest().body(res);
        }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            res.put("success", true); res.put("subscribed", false);
            return ResponseEntity.ok(res);
        }
        boolean subscribed = backInStockRepository
                .existsByCustomerAndProductAndNotifiedFalse(customer, product);
        res.put("success", true);
        res.put("subscribed", subscribed);
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
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        List<Order> delivered = orderRepository.findByCustomer(customer).stream()
                .filter(o -> o.getTrackingStatus() == TrackingStatus.DELIVERED).collect(Collectors.toList());
        if (delivered.isEmpty()) { res.put("success", true); res.put("hasData", false); return ResponseEntity.ok(res); }
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
        res.put("success", true); res.put("hasData", true);
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
            if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
            int orderId   = Integer.parseInt(body.get("orderId").toString());
            String reason = (String) body.getOrDefault("reason", "");
            String type   = (String) body.getOrDefault("type", "REFUND");
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
            if (order.getTrackingStatus() != TrackingStatus.DELIVERED) { res.put("success", false); res.put("message", "Refund can only be requested for delivered orders"); return ResponseEntity.badRequest().body(res); }
            Refund refund = new Refund();
            refund.setOrder(order); refund.setCustomer(customer);
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
            @RequestHeader("X-Customer-Id") int customerId, @PathVariable int orderId) {
        Map<String, Object> res = new HashMap<>();
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
        List<Refund> refunds = refundRepository.findByOrder(order);
        if (refunds.isEmpty()) { res.put("success", true); res.put("hasRefund", false); return ResponseEntity.ok(res); }
        Refund latest = refunds.get(refunds.size() - 1);
        res.put("success", true); res.put("hasRefund", true);
        res.put("status", latest.getStatus().name());
        String storedReason  = latest.getReason() != null ? latest.getReason() : "";
        String refundType    = "REFUND";
        String displayReason = storedReason;
        if (storedReason.startsWith("[REFUND] "))       { refundType = "REFUND";       displayReason = storedReason.substring(9);  }
        else if (storedReason.startsWith("[REPLACEMENT] ")) { refundType = "REPLACEMENT"; displayReason = storedReason.substring(14); }
        res.put("reason", displayReason);
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
    // VENDOR — PRODUCT CRUD
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
            Object mrpVal = body.get("mrp"); if (mrpVal != null) p.setMrp(Double.parseDouble(mrpVal.toString()));
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
            if (body.containsKey("mrp"))         p.setMrp(Double.parseDouble(body.get("mrp").toString()));
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

    /** GET /api/flutter/vendor/sales-report */
    @GetMapping("/vendor/sales-report")
    public ResponseEntity<Map<String, Object>> vendorSalesReport(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<Product> products  = productRepository.findByVendor(vendor);
        List<Integer> productIds = products.stream().map(Product::getId).collect(Collectors.toList());
        List<Order>   allOrders = orderRepository.findOrdersByVendor(vendor);
        List<Order>   activeOrders = allOrders.stream().filter(o -> o.getTrackingStatus() != TrackingStatus.CANCELLED).collect(Collectors.toList());
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
    // VENDOR — PROFILE & STOCK ALERTS
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/vendor/profile */
    @GetMapping("/vendor/profile")
    public ResponseEntity<Map<String, Object>> getVendorProfile(@RequestHeader("X-Vendor-Id") int vendorId) {
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

    /** PUT /api/flutter/vendor/profile/update */
    @PutMapping("/vendor/profile/update")
    public ResponseEntity<Map<String, Object>> updateVendorProfile(
            @RequestHeader("X-Vendor-Id") int vendorId, @RequestBody Map<String, Object> body) {
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

    /** GET /api/flutter/vendor/stock-alerts */
    @GetMapping("/vendor/stock-alerts")
    public ResponseEntity<Map<String, Object>> getStockAlerts(@RequestHeader("X-Vendor-Id") int vendorId) {
        Map<String, Object> res = new HashMap<>();
        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        List<StockAlert> alerts = stockAlertRepository.findByVendor(vendor);
        alerts.sort((a, b) -> {
            if (a.isAcknowledged() != b.isAcknowledged()) return a.isAcknowledged() ? 1 : -1;
            return Integer.compare(b.getId(), a.getId());
        });
        int unacknowledged = (int) alerts.stream().filter(a -> !a.isAcknowledged()).count();
        List<Map<String, Object>> alertMaps = alerts.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.getId());
            m.put("productName",  a.getProduct() != null ? a.getProduct().getName()  : "Unknown");
            m.put("productId",    a.getProduct() != null ? a.getProduct().getId()    : 0);
            m.put("currentStock", a.getProduct() != null ? a.getProduct().getStock() : 0);
            m.put("threshold",    a.getProduct() != null && a.getProduct().getStockAlertThreshold() != null ? a.getProduct().getStockAlertThreshold() : 10);
            m.put("message",      a.getMessage());
            m.put("acknowledged", a.isAcknowledged());
            m.put("alertTime",    a.getAlertTime() != null ? a.getAlertTime().toString() : null);
            return m;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("alerts", alertMaps); res.put("unacknowledgedCount", unacknowledged);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/vendor/stock-alerts/{id}/acknowledge */
    @PostMapping("/vendor/stock-alerts/{id}/acknowledge")
    public ResponseEntity<Map<String, Object>> acknowledgeAlert(
            @RequestHeader("X-Vendor-Id") int vendorId, @PathVariable int id) {
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
    // ADMIN
    // ═══════════════════════════════════════════════════════

    /** GET /api/flutter/admin/users */
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
        c.setActive(!c.isActive()); customerRepository.save(c);
        res.put("success", true); res.put("message", c.isActive() ? "Account activated" : "Account suspended"); res.put("active", c.isActive());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/vendors/{id}/toggle-active */
    @PostMapping("/admin/vendors/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> adminToggleVendor(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Vendor v = vendorRepository.findById(id).orElse(null);
        if (v == null) { res.put("success", false); res.put("message", "Vendor not found"); return ResponseEntity.badRequest().body(res); }
        v.setVerified(!v.isVerified()); vendorRepository.save(v);
        res.put("success", true); res.put("message", v.isVerified() ? "Vendor activated" : "Vendor suspended"); res.put("active", v.isVerified());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/products */
    @GetMapping("/admin/products")
    public ResponseEntity<Map<String, Object>> adminGetProducts() {
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("products", productRepository.findAll().stream().map(this::mapProduct).collect(Collectors.toList()));
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/approve */
    @PostMapping("/admin/products/{id}/approve")
    public ResponseEntity<Map<String, Object>> adminApproveProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.badRequest().body(res); }
        p.setApproved(true); productRepository.save(p);
        res.put("success", true); res.put("message", "Product approved and is now visible to customers");
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/products/{id}/reject */
    @PostMapping("/admin/products/{id}/reject")
    public ResponseEntity<Map<String, Object>> adminRejectProduct(@PathVariable int id) {
        Map<String, Object> res = new HashMap<>();
        Product p = productRepository.findById(id).orElse(null);
        if (p == null) { res.put("success", false); res.put("message", "Product not found"); return ResponseEntity.badRequest().body(res); }
        p.setApproved(false); productRepository.save(p);
        res.put("success", true); res.put("message", "Product rejected / hidden from customers");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/orders */
    @GetMapping("/admin/orders")
    public ResponseEntity<Map<String, Object>> adminGetOrders() {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
                .sorted(Comparator.comparingInt(Order::getId).reversed())
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
            order.setTrackingStatus(newStatus); orderRepository.save(order);
            res.put("success", true); res.put("message", "Order status updated to " + newStatus.getDisplayName());
        } catch (IllegalArgumentException e) {
            res.put("success", false); res.put("message", "Invalid status: " + body.get("status"));
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
            m.put("id", v.getId()); m.put("name", v.getName()); m.put("email", v.getEmail());
            m.put("mobile", v.getMobile()); m.put("vendorCode", v.getVendorCode());
            m.put("active", v.isVerified()); m.put("verified", v.isVerified());
            return m;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("vendors", vendors);
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
        if (customer == null) { res.put("success", false); res.put("message", "Customer not found"); return ResponseEntity.badRequest().body(res); }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || order.getCustomer().getId() != customerId) { res.put("success", false); res.put("message", "Order not found"); return ResponseEntity.badRequest().body(res); }
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
        res.put("success", true);
        res.put("addedCount", addedCount);
        res.put("outOfStockItems", outOfStock);
        res.put("message", addedCount > 0 ? addedCount + " item(s) added to cart" : "All items are out of stock");
        return ResponseEntity.ok(res);
    }

    /** PUT /api/flutter/profile/change-password */
    @PutMapping("/profile/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestHeader("X-Customer-Id") int customerId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new HashMap<>();
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
            customer.setPassword(AES.encrypt(newPwd)); customerRepository.save(customer);
            res.put("success", true); res.put("message", "Password changed successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) { res.put("success", false); res.put("message", "Failed: " + e.getMessage()); return ResponseEntity.internalServerError().body(res); }
    }

    // ═══════════════════════════════════════════════════════
    // HELPER MAPPERS
    // ═══════════════════════════════════════════════════════

    private Map<String, Object> mapProduct(Product p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId()); m.put("name", p.getName()); m.put("description", p.getDescription());
        m.put("price", p.getPrice()); m.put("mrp", p.getMrp()); m.put("category", p.getCategory());
        m.put("stock", p.getStock()); m.put("imageLink", p.getImageLink());
        m.put("extraImageLinks", p.getExtraImageLinks());
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
        if (o.getCustomer() != null) m.put("customerName", o.getCustomer().getName());
        return m;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN — ACCOUNTS (search, stats, profile, toggle, delete, reset-pwd)
    // ═══════════════════════════════════════════════════════════════════════

    @Autowired private com.example.ekart.service.AdminAccountService adminAccountService;

    /** GET /api/flutter/admin/accounts?search=... */
    @GetMapping("/admin/accounts")
    public ResponseEntity<Map<String, Object>> adminGetAccounts(
            @RequestParam(required = false) String search) {
        Map<String, Object> res = new LinkedHashMap<>();
        List<Map<String, Object>> accounts = (search != null && !search.isBlank())
                ? adminAccountService.searchAccounts(search)
                : adminAccountService.getAllAccountsWithMetadata();
        res.put("success", true);
        res.put("accounts", accounts);
        res.put("count", accounts.size());
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/accounts/stats */
    @GetMapping("/admin/accounts/stats")
    public ResponseEntity<Map<String, Object>> adminGetAccountStats() {
        Map<String, Object> stats = adminAccountService.getAccountStats();
        stats.put("success", true);
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
                filtered = filtered.stream().filter(r -> r.getRating() == star).collect(Collectors.toList());
            } catch (NumberFormatException ignored) {}
        }
        if (!search.isBlank()) {
            String q = search.toLowerCase();
            filtered = filtered.stream().filter(r ->
                (r.getCustomerName() != null && r.getCustomerName().toLowerCase().contains(q)) ||
                (r.getComment()      != null && r.getComment().toLowerCase().contains(q)) ||
                (r.getProduct()      != null && r.getProduct().getName().toLowerCase().contains(q))
            ).collect(Collectors.toList());
        }
        filtered.sort((a, b) -> {
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });

        List<Map<String, Object>> reviewMaps = filtered.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           r.getId());
            m.put("rating",       r.getRating());
            m.put("comment",      r.getComment() != null ? r.getComment() : "");
            m.put("customerName", r.getCustomerName() != null ? r.getCustomerName() : "");
            m.put("productName",  r.getProduct() != null ? r.getProduct().getName() : "");
            m.put("productId",    r.getProduct() != null ? r.getProduct().getId() : 0);
            m.put("createdAt",    r.getCreatedAt() != null ? r.getCreatedAt().toString() : "");
            return m;
        }).collect(Collectors.toList());

        res.put("success",      true);
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
            res.put("success", true); res.put("message", "Review deleted");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false); res.put("message", "Delete failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(res);
        }
    }

    /** POST /api/flutter/admin/reviews/bulk-delete  body: {productName} */
    @PostMapping("/admin/reviews/bulk-delete")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminBulkDeleteReviews(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        String productName = (String) body.getOrDefault("productName", "");
        try {
            List<com.example.ekart.dto.Review> toDelete = reviewRepository.findAll().stream()
                    .filter(r -> r.getProduct() != null &&
                                 r.getProduct().getName().equalsIgnoreCase(productName))
                    .collect(Collectors.toList());
            reviewRepository.deleteAll(toDelete);
            res.put("success", true);
            res.put("message", "Deleted " + toDelete.size() + " reviews for \"" + productName + "\"");
            res.put("deleted", toDelete.size());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false); res.put("message", "Bulk delete failed: " + e.getMessage());
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
            m.put("id",                 b.getId());
            m.put("title",              b.getTitle()    != null ? b.getTitle()    : "");
            m.put("imageUrl",           b.getImageUrl() != null ? b.getImageUrl() : "");
            m.put("linkUrl",            b.getLinkUrl()  != null ? b.getLinkUrl()  : "");
            m.put("active",             b.isActive());
            m.put("showOnCustomerHome", b.isShowOnCustomerHome());
            m.put("displayOrder",       b.getDisplayOrder());
            return m;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("banners", banners);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/banners/add  body:{title,imageUrl,linkUrl} */
    @PostMapping("/admin/banners/add")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminAddBanner(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = new Banner();
        b.setTitle((String) body.getOrDefault("title", ""));
        b.setImageUrl((String) body.getOrDefault("imageUrl", ""));
        b.setLinkUrl((String) body.getOrDefault("linkUrl", ""));
        b.setActive(true);
        b.setShowOnCustomerHome(true);
        b.setDisplayOrder(0);
        bannerRepository.save(b);
        res.put("success", true); res.put("message", "Banner added"); res.put("id", b.getId());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/banners/{id}/toggle */
    @PostMapping("/admin/banners/{id}/toggle")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleBanner(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = bannerRepository.findById(id).orElse(null);
        if (b == null) { res.put("success", false); res.put("message", "Banner not found"); return ResponseEntity.badRequest().body(res); }
        b.setActive(!b.isActive());
        bannerRepository.save(b);
        res.put("success", true); res.put("active", b.isActive());
        res.put("message", b.isActive() ? "Banner activated" : "Banner deactivated");
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/banners/{id}/toggle-customer-home */
    @PostMapping("/admin/banners/{id}/toggle-customer-home")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleBannerCustomerHome(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Banner b = bannerRepository.findById(id).orElse(null);
        if (b == null) { res.put("success", false); res.put("message", "Banner not found"); return ResponseEntity.badRequest().body(res); }
        b.setShowOnCustomerHome(!b.isShowOnCustomerHome());
        bannerRepository.save(b);
        res.put("success", true); res.put("showOnCustomerHome", b.isShowOnCustomerHome());
        res.put("message", b.isShowOnCustomerHome() ? "Shown on customer home" : "Hidden from customer home");
        return ResponseEntity.ok(res);
    }

    /** DELETE /api/flutter/admin/banners/{id} */
    @DeleteMapping("/admin/banners/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminDeleteBanner(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!bannerRepository.existsById(id)) { res.put("success", false); res.put("message", "Banner not found"); return ResponseEntity.badRequest().body(res); }
        bannerRepository.deleteById(id);
        res.put("success", true); res.put("message", "Banner deleted");
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
            m.put("id",             wh.getId());
            m.put("name",           wh.getName());
            m.put("city",           wh.getCity());
            m.put("state",          wh.getState() != null ? wh.getState() : "");
            m.put("warehouseCode",  wh.getWarehouseCode() != null ? wh.getWarehouseCode() : "");
            m.put("active",         wh.isActive());
            m.put("servedPinCodes", wh.getServedPinCodes() != null ? wh.getServedPinCodes() : "");
            long boyCount = deliveryBoyRepository.findAll().stream()
                    .filter(db -> db.getWarehouse() != null && db.getWarehouse().getId() == wh.getId()).count();
            m.put("deliveryBoyCount", boyCount);
            return m;
        }).collect(Collectors.toList());
        res.put("success", true); res.put("warehouses", warehouses);
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
            res.put("success", false); res.put("message", "Name and city are required");
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
        res.put("success", true); res.put("message", "Warehouse added"); res.put("id", wh.getId());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/warehouses/{id}/toggle */
    @PostMapping("/admin/warehouses/{id}/toggle")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminToggleWarehouse(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Warehouse wh = warehouseRepository.findById(id).orElse(null);
        if (wh == null) { res.put("success", false); res.put("message", "Warehouse not found"); return ResponseEntity.badRequest().body(res); }
        wh.setActive(!wh.isActive());
        warehouseRepository.save(wh);
        res.put("success", true); res.put("active", wh.isActive());
        res.put("message", wh.isActive() ? "Warehouse activated" : "Warehouse deactivated");
        return ResponseEntity.ok(res);
    }

    /** GET /api/flutter/admin/warehouses/{id}/boys */
    @GetMapping("/admin/warehouses/{id}/boys")
    public ResponseEntity<Map<String, Object>> adminGetDeliveryBoysByWarehouse(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Warehouse wh = warehouseRepository.findById(id).orElse(null);
        if (wh == null) { res.put("success", false); res.put("message", "Warehouse not found"); return ResponseEntity.badRequest().body(res); }
        List<Map<String, Object>> boys = deliveryBoyRepository.findAll().stream()
                .filter(db -> db.getWarehouse() != null && db.getWarehouse().getId() == id)
                .map(db -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",              db.getId());
                    m.put("name",            db.getName());
                    m.put("email",           db.getEmail());
                    m.put("deliveryBoyCode", db.getDeliveryBoyCode() != null ? db.getDeliveryBoyCode() : "");
                    m.put("active",          db.isActive());
                    m.put("adminApproved",   db.isAdminApproved());
                    m.put("assignedPinCodes",db.getAssignedPinCodes() != null ? db.getAssignedPinCodes() : "");
                    return m;
                }).collect(Collectors.toList());
        res.put("success", true); res.put("boys", boys);
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
                    m.put("id",                 req.getId());
                    m.put("deliveryBoyId",       req.getDeliveryBoy().getId());
                    m.put("deliveryBoyName",     req.getDeliveryBoy().getName());
                    m.put("deliveryBoyCode",     req.getDeliveryBoy().getDeliveryBoyCode() != null ? req.getDeliveryBoy().getDeliveryBoyCode() : "");
                    m.put("currentWarehouse",    req.getDeliveryBoy().getWarehouse() != null ? req.getDeliveryBoy().getWarehouse().getName() : "None");
                    m.put("requestedWarehouse",  req.getRequestedWarehouse().getName());
                    m.put("requestedWarehouseId",req.getRequestedWarehouse().getId());
                    m.put("reason",              req.getReason() != null ? req.getReason() : "");
                    m.put("requestedAt",         req.getRequestedAt() != null ? req.getRequestedAt().toString() : "");
                    return m;
                }).collect(Collectors.toList());
        res.put("success", true); res.put("requests", requests);
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/warehouse-change-requests/{id}/approve  body:{adminNote} */
    @PostMapping("/admin/warehouse-change-requests/{id}/approve")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminApproveWarehouseChange(
            @PathVariable int id, @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        String adminNote = body != null ? (String) body.getOrDefault("adminNote", "") : "";
        WarehouseChangeRequest req = warehouseChangeRequestRepository.findById(id).orElse(null);
        if (req == null) { res.put("success", false); res.put("message", "Request not found"); return ResponseEntity.badRequest().body(res); }
        if (req.getStatus() != WarehouseChangeRequest.Status.PENDING) { res.put("success", false); res.put("message", "Request already resolved"); return ResponseEntity.ok(res); }
        DeliveryBoy db = req.getDeliveryBoy();
        db.setWarehouse(req.getRequestedWarehouse());
        db.setAssignedPinCodes("");
        deliveryBoyRepository.save(db);
        req.setStatus(WarehouseChangeRequest.Status.APPROVED);
        req.setAdminNote(adminNote.trim());
        req.setResolvedAt(LocalDateTime.now());
        warehouseChangeRequestRepository.save(req);
        try { emailSender.sendWarehouseChangeApproved(db, req.getRequestedWarehouse(), adminNote); } catch (Exception ignored) {}
        res.put("success", true); res.put("message", db.getName() + " transferred to " + req.getRequestedWarehouse().getName());
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/warehouse-change-requests/{id}/reject  body:{adminNote} */
    @PostMapping("/admin/warehouse-change-requests/{id}/reject")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminRejectWarehouseChange(
            @PathVariable int id, @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        String adminNote = body != null ? (String) body.getOrDefault("adminNote", "") : "";
        WarehouseChangeRequest req = warehouseChangeRequestRepository.findById(id).orElse(null);
        if (req == null) { res.put("success", false); res.put("message", "Request not found"); return ResponseEntity.badRequest().body(res); }
        if (req.getStatus() != WarehouseChangeRequest.Status.PENDING) { res.put("success", false); res.put("message", "Request already resolved"); return ResponseEntity.ok(res); }
        req.setStatus(WarehouseChangeRequest.Status.REJECTED);
        req.setAdminNote(adminNote.trim());
        req.setResolvedAt(LocalDateTime.now());
        warehouseChangeRequestRepository.save(req);
        try { emailSender.sendWarehouseChangeRejected(req.getDeliveryBoy(), req.getRequestedWarehouse(), adminNote); } catch (Exception ignored) {}
        res.put("success", true); res.put("message", "Request rejected");
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
        res.put("success",           true);
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