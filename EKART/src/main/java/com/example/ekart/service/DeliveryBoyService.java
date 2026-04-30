package com.example.ekart.service;
import com.example.ekart.dto.Address;
import java.util.Random;
import java.time.LocalDateTime;

import com.example.ekart.dto.*;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.*;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.ModelMap;

import java.util.*;

@Service
@Transactional
public class DeliveryBoyService {

    // ── S1192 String constants ──
    private static final String K_NAME                              = "name";
    private static final String K_REDIRECT_DELIVERY_OTP             = "redirect:/delivery/otp/";
    private static final String K_REDIRECT_DELIVERY_REGISTER        = "redirect:/delivery/register";

    private static final Logger log = LoggerFactory.getLogger(DeliveryBoyService.class);
    private static final Random RANDOM = new Random();

    // ═══════════════════════════════════════════════════════════════════════════
    // String constants (S1192 — eliminates duplicate-literal violations)
    // ═══════════════════════════════════════════════════════════════════════════
    private static final String KEY_SUCCESS = "success";
    private static final String KEY_FAILURE = "failure";
    private static final String KEY_MESSAGE = "message";
    private static final String KEY_ADMIN = "admin";
    private static final String KEY_IS_AVAILABLE = "isAvailable";
    private static final String REDIRECT_DELIVERY_LOGIN = "redirect:/delivery/login";
    private static final String MSG_NOT_LOGGED_IN = "Not logged in";
    private static final String MSG_UNAUTHORIZED = "Unauthorized";
    private static final String MSG_WAREHOUSE_NOT_FOUND = "Warehouse not found";
    private static final String KEY_DELIVERY_BOY = "deliveryBoy";
    private static final String KEY_REASON = "reason";



    // ── Dependencies (constructor injection) ─────────────────────────────────
    private final DeliveryBoyRepository deliveryBoyRepository;
    private final WarehouseRepository warehouseRepository;
    private final OrderRepository orderRepository;
    private final TrackingEventLogRepository trackingEventLogRepository;
    private final DeliveryOtpRepository deliveryOtpRepository;
    private final EmailSender emailSender;
    private final WarehouseChangeRequestRepository warehouseChangeRequestRepository;
    private final OtpService otpService;
    // @Lazy breaks the circular dependency: DeliveryBoyService ↔ AutoAssignmentService
    private final AutoAssignmentService autoAssignmentService;

    public DeliveryBoyService(
            DeliveryBoyRepository deliveryBoyRepository,
            WarehouseRepository warehouseRepository,
            OrderRepository orderRepository,
            TrackingEventLogRepository trackingEventLogRepository,
            DeliveryOtpRepository deliveryOtpRepository,
            EmailSender emailSender,
            WarehouseChangeRequestRepository warehouseChangeRequestRepository,
            OtpService otpService,
            @Lazy AutoAssignmentService autoAssignmentService) {
        this.deliveryBoyRepository = deliveryBoyRepository;
        this.warehouseRepository = warehouseRepository;
        this.orderRepository = orderRepository;
        this.trackingEventLogRepository = trackingEventLogRepository;
        this.deliveryOtpRepository = deliveryOtpRepository;
        this.emailSender = emailSender;
        this.warehouseChangeRequestRepository = warehouseChangeRequestRepository;
        this.otpService = otpService;
        this.autoAssignmentService = autoAssignmentService;
    }

    // ── SELF REGISTRATION ─────────────────────────────────────────

    public String loadRegisterPage(ModelMap map) {
        return "delivery-register.html";
    }

    public String selfRegister(String name, String email, long mobile,
                                String password, String confirmPassword,
                                int warehouseId, HttpSession session) {

        if (name == null || name.trim().length() < 3) {
            session.setAttribute(KEY_FAILURE, "Name must be at least 3 characters");
            return K_REDIRECT_DELIVERY_REGISTER;
        }
        if (email == null || !email.contains("@")) {
            session.setAttribute(KEY_FAILURE, "Enter a valid email address");
            return K_REDIRECT_DELIVERY_REGISTER;
        }
        if (deliveryBoyRepository.existsByEmail(email.trim().toLowerCase())) {
            DeliveryBoy existing = deliveryBoyRepository.findByEmail(email.trim().toLowerCase());
            if (existing != null && existing.isVerified()) {
                session.setAttribute(KEY_FAILURE, "This email is already verified. Please login instead.");
                return K_REDIRECT_DELIVERY_REGISTER;
            }
            // Allow updating unverified account
        }
        if (password == null || confirmPassword == null || !password.equals(confirmPassword)) {
            session.setAttribute(KEY_FAILURE, "Password and Confirm Password must match");
            return K_REDIRECT_DELIVERY_REGISTER;
        }
        String passwordRegex = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";
        if (!password.matches(passwordRegex)) {
            session.setAttribute(KEY_FAILURE, "Password must be at least 8 characters and include uppercase, lowercase, number and special character");
            return K_REDIRECT_DELIVERY_REGISTER;
        }
        if (warehouseId <= 0) {
            session.setAttribute(KEY_FAILURE, "Please select a warehouse");
            return K_REDIRECT_DELIVERY_REGISTER;
        }

        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        if (warehouse == null) {
            session.setAttribute(KEY_FAILURE, "Selected warehouse not found. Please try again.");
            return K_REDIRECT_DELIVERY_REGISTER;
        }

        // Reuse existing unverified account or create new
        DeliveryBoy existing = deliveryBoyRepository.findByEmail(email.trim().toLowerCase());
        DeliveryBoy db = (existing != null && !existing.isVerified()) ? existing : new DeliveryBoy();
        db.setName(name.trim());
        db.setEmail(email.trim().toLowerCase());
        db.setMobile(mobile);
        db.setPassword(AES.encrypt(password));
        db.setVerified(false);
        db.setAdminApproved(false);
        db.setActive(true);
        db.setWarehouse(warehouse);
        // 🔒 Auto-assign PIN codes from warehouse (critical fix)
        db.setAssignedPinCodes(warehouse.getServedPinCodes());

        deliveryBoyRepository.save(db);
        if (existing == null || existing.getId() == 0) {
            db.setDeliveryBoyCode(String.format("DB-%05d", db.getId()));
            deliveryBoyRepository.save(db);
        }

        try {
            // 🔒 NEW: Use secure OTP service instead of plain Random
            String plainOtp = otpService.generateAndStoreOtp(db.getEmail(), OtpService.PURPOSE_DELIVERY_REGISTER);
            emailSender.sendDeliveryBoyOtpSecure(db, plainOtp);
        } catch (Exception e) { 
            log.error("Delivery boy OTP email failed: {}", e.getMessage(), e);
        }

        session.setAttribute(KEY_SUCCESS, "OTP sent to " + email + ". Verify your email to continue.");
        return K_REDIRECT_DELIVERY_OTP + db.getId();
    }

    // ── OTP VERIFICATION ──────────────────────────────────────────

    public String loadOtpPage(int id, ModelMap map) {
        map.put("id", id);
        return "delivery-otp.html";
    }

    public String verifyOtp(int id, int otp, HttpSession session) {
        DeliveryBoy db = deliveryBoyRepository.findById(id).orElse(null);
        if (db == null) {
            session.setAttribute(KEY_FAILURE, "Invalid request");
            return REDIRECT_DELIVERY_LOGIN;
        }

        // 🔒 NEW: Verify OTP using secure service (hashed comparison)
        OtpService.VerificationResult result = otpService.verifyOtp(db.getEmail(), String.format("%06d", otp), OtpService.PURPOSE_DELIVERY_REGISTER);
        
        if (result.success) {
            db.setVerified(true);
            deliveryBoyRepository.save(db);

            if (!db.isAdminApproved()) {
                try { emailSender.sendDeliveryBoyPendingAlert(db); }
                catch (Exception e) { log.error("Admin alert email failed: {}", e.getMessage(), e); }
                return "redirect:/delivery/pending";
            }

            session.setAttribute(KEY_SUCCESS, "Email verified! You can now login.");
            return REDIRECT_DELIVERY_LOGIN;
        }

        session.setAttribute(KEY_FAILURE, result.message);
        return K_REDIRECT_DELIVERY_OTP + id;
    }

    public String loadPendingPage() { return "delivery-pending.html"; }

    // ── ADMIN APPROVAL ────────────────────────────────────────────

    public List<DeliveryBoy> getPendingApprovals() {
        return deliveryBoyRepository.findByAdminApprovedFalseAndVerifiedTrue();
    }

    public ResponseEntity<Map<String, Object>> approveDeliveryBoy(
            int deliveryBoyId, String assignedPinCodes, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        if (session.getAttribute(KEY_ADMIN) == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_UNAUTHORIZED);
            return ResponseEntity.status(403).body(res);
        }

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Delivery boy not found");
            return ResponseEntity.badRequest().body(res);
        }

        db.setAdminApproved(true);
        if (assignedPinCodes != null && !assignedPinCodes.isBlank()) {
            db.setAssignedPinCodes(assignedPinCodes.trim());
        }
        deliveryBoyRepository.save(db);

        try { emailSender.sendDeliveryBoyApproved(db); }
        catch (Exception e) { log.error("Approval email failed: {}", e.getMessage(), e); }

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, db.getName() + " approved successfully");
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Map<String, Object>> rejectDeliveryBoy(
            int deliveryBoyId, String reason, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        if (session.getAttribute(KEY_ADMIN) == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_UNAUTHORIZED);
            return ResponseEntity.status(403).body(res);
        }

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Delivery boy not found");
            return ResponseEntity.badRequest().body(res);
        }

        db.setActive(false);
        deliveryBoyRepository.save(db);

        try { emailSender.sendDeliveryBoyRejected(db, reason); }
        catch (Exception e) { log.warn("Rejection email failed", e); }

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, db.getName() + " rejected and deactivated");
        return ResponseEntity.ok(res);
    }

    // ── LOGIN ─────────────────────────────────────────────────────

    public String loadLoginPage() { return "delivery-login.html"; }

    public String login(String email, String password, HttpSession session) {
        DeliveryBoy db = deliveryBoyRepository.findByEmail(email);

        if (db == null) {
            session.setAttribute(KEY_FAILURE, "No account found with this email");
            return REDIRECT_DELIVERY_LOGIN;
        }

        String decrypted = AES.decrypt(db.getPassword());
        if (decrypted == null || !decrypted.equals(password)) {
            session.setAttribute(KEY_FAILURE, "Wrong password");
            return REDIRECT_DELIVERY_LOGIN;
        }

        if (!db.isVerified()) {
            try {
                // 🔒 NEW: Use secure OTP service to resend
                String plainOtp = otpService.resendOtp(db.getEmail(), OtpService.PURPOSE_DELIVERY_LOGIN);
                emailSender.sendDeliveryBoyOtpSecure(db, plainOtp);
            } catch (Exception ignored) { /* OTP resend failure — non-critical, continue login flow */ }
            session.setAttribute(KEY_SUCCESS, "Please verify your email first. OTP resent.");
            return K_REDIRECT_DELIVERY_OTP + db.getId();
        }

        if (!db.isActive()) {
            session.setAttribute(KEY_FAILURE, "Your account has been deactivated. Contact admin.");
            return REDIRECT_DELIVERY_LOGIN;
        }

        if (!db.isAdminApproved()) {
            session.setAttribute(KEY_FAILURE,
                "Your account is pending admin approval. You will receive an email once approved.");
            return REDIRECT_DELIVERY_LOGIN;
        }

        session.setAttribute(KEY_DELIVERY_BOY, db);
        session.setAttribute(KEY_SUCCESS, "Welcome back, " + db.getName() + "!");
        return "redirect:/delivery/home";
    }

    public String logout(HttpSession session) {
        session.removeAttribute(KEY_DELIVERY_BOY);
        session.setAttribute(KEY_SUCCESS, "Logged out successfully");
        return REDIRECT_DELIVERY_LOGIN;
    }

    // ── PUBLIC: List active warehouses ────────────────────────────

    public ResponseEntity<List<Map<String, Object>>> getActiveWarehouses() {
        List<Warehouse> warehouses = warehouseRepository.findByActiveTrue();
        List<Map<String, Object>> data = new ArrayList<>();
        for (Warehouse wh : warehouses) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",   wh.getId());
            m.put(K_NAME, wh.getName());
            m.put("city", wh.getCity());
            m.put("code", wh.getWarehouseCode());
            data.add(m);
        }
        return ResponseEntity.ok(data);
    }

    // ── AVAILABILITY TOGGLE ───────────────────────────────────────

    public ResponseEntity<Map<String, Object>> toggleAvailability(
            Map<String, Object> payload, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_NOT_LOGGED_IN);
            return ResponseEntity.status(401).body(res);
        }

        boolean isAvailable = (Boolean) payload.getOrDefault(KEY_IS_AVAILABLE, false);
        db.setAvailable(isAvailable);
        deliveryBoyRepository.save(db);

        // AUTO-ASSIGN DISABLED (Phase 3)
        // Previously: if (isAvailable) autoAssignmentService.onDeliveryBoyOnline(db);
        // Now: Warehouse staff manually assigns orders via WarehouseReceivingService
        if (isAvailable) {
            log.info("[DELIVERY BOY] {} is now online (manual assignment enabled)", db.getName());
        }

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, isAvailable ? "You are now online" : "You are now offline");
        res.put(KEY_IS_AVAILABLE, isAvailable);
        return ResponseEntity.ok(res);
    }

    // ── PICKUP ────────────────────────────────────────────────────

    public ResponseEntity<Map<String, Object>> markPickedUp(int orderId, HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_NOT_LOGGED_IN);
            return ResponseEntity.status(401).body(res);
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Order not found");
            return ResponseEntity.badRequest().body(res);
        }
        if (order.getDeliveryBoy() == null || order.getDeliveryBoy().getId() != db.getId()) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "This order is not assigned to you");
            return ResponseEntity.status(403).body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.SHIPPED) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, "Order is already in status: " + order.getTrackingStatus().getDisplayName());
            return ResponseEntity.badRequest().body(res);
        }

        db = deliveryBoyRepository.findById(db.getId()).orElseThrow();
        String city = db.getWarehouse() != null ? db.getWarehouse().getCity() : "Warehouse";

        order.setTrackingStatus(TrackingStatus.OUT_FOR_DELIVERY);
        order.setCurrentCity("On the way — " + city);
        orderRepository.save(order);

        logEvent(order, TrackingStatus.OUT_FOR_DELIVERY,
                "On the way — " + city,
                "Parcel picked up by delivery boy " + db.getName(), "delivery_boy");

        int otp = RANDOM.nextInt(100000, 1000000);
        deliveryOtpRepository.findByOrder(order).ifPresent(deliveryOtpRepository::delete);
        deliveryOtpRepository.save(new DeliveryOtp(order, otp));

        try { emailSender.sendDeliveryOtp(order.getCustomer(), otp, order.getId()); }
        catch (Exception e) { log.error("Delivery OTP email failed: {}", e.getMessage(), e); }

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, "Marked as Out for Delivery. OTP sent to customer.");
        return ResponseEntity.ok(res);
    }

    // ── CONFIRM DELIVERY ──────────────────────────────────────────

    public ResponseEntity<Map<String, Object>> confirmDelivery(int orderId, int submittedOtp,
                                                                 HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_NOT_LOGGED_IN);
            return ResponseEntity.status(401).body(res);
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Order not found");
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
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Wrong OTP. Ask customer for the correct OTP.");
            return ResponseEntity.badRequest().body(res);
        }

        deliveryOtp.setUsed(true);
        deliveryOtp.setUsedAt(LocalDateTime.now());
        deliveryOtpRepository.save(deliveryOtp);

        order.setTrackingStatus(TrackingStatus.DELIVERED);
        order.setCurrentCity("Delivered");
        orderRepository.save(order);

        logEvent(order, TrackingStatus.DELIVERED,
                "Delivered to customer",
                "Delivered by " + db.getName() + ". OTP verified at doorstep.", "delivery_boy");

        try { emailSender.sendDeliveryConfirmation(order.getCustomer(), order); }
        catch (Exception e) { log.error("Delivery confirmation email failed: {}", e.getMessage(), e); }

        // AUTO-ASSIGN DISABLED (Phase 3)
        // Previously: autoAssignmentService.onOrderDelivered(db);
        // Now: Warehouse staff will manually assign next order for delivery boy
        log.info("[DELIVERY] Order #{} delivered by delivery_boy_id={} (auto-fill disabled)", orderId, db.getId());

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, "Order #" + orderId + " marked as Delivered!");
        return ResponseEntity.ok(res);
    }

    // ── DASHBOARD ─────────────────────────────────────────────────

    public String loadHome(HttpSession session, ModelMap map) {
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) return REDIRECT_DELIVERY_LOGIN;
        db = deliveryBoyRepository.findById(db.getId()).orElse(db);
        session.setAttribute(KEY_DELIVERY_BOY, db);
        map.addAttribute("db", db);
        map.addAttribute("activeOrders", autoAssignmentService.countActiveOrders(db));
        map.addAttribute("maxConcurrent", AutoAssignmentService.MAX_CONCURRENT_ORDERS);
        return "delivery-home.html";
    }

    // ── WAREHOUSE CHANGE REQUESTS ─────────────────────────────────

    public ResponseEntity<Map<String, Object>> submitWarehouseChangeRequest(int warehouseId, String reason, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_NOT_LOGGED_IN);
            return ResponseEntity.status(401).body(res);
        }

        Warehouse requested = warehouseRepository.findById(warehouseId).orElse(null);
        if (requested == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_WAREHOUSE_NOT_FOUND);
            return ResponseEntity.badRequest().body(res);
        }

        boolean hasPending = warehouseChangeRequestRepository
            .findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING)
            .isPresent();

        if (hasPending) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "You already have a pending transfer request");
            return ResponseEntity.badRequest().body(res);
        }

        WarehouseChangeRequest req = new WarehouseChangeRequest();
        req.setDeliveryBoy(db);
        req.setCurrentWarehouse(db.getWarehouse());
        req.setRequestedWarehouse(requested);
        req.setReason(reason.trim());
        req.setStatus(WarehouseChangeRequest.Status.PENDING);
        req.setRequestedAt(LocalDateTime.now());
        warehouseChangeRequestRepository.save(req);

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, "Transfer request submitted. Admin will review it shortly.");
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Map<String, Object>> approveWarehouseChange(
            int requestId, String adminNote, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        if (session.getAttribute(KEY_ADMIN) == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_UNAUTHORIZED);
            return ResponseEntity.status(403).body(res);
        }

        WarehouseChangeRequest req = warehouseChangeRequestRepository.findById(requestId).orElse(null);
        if (req == null || req.getStatus() != WarehouseChangeRequest.Status.PENDING) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Request not found or already resolved");
            return ResponseEntity.badRequest().body(res);
        }

        DeliveryBoy db = req.getDeliveryBoy();
        db.setWarehouse(req.getRequestedWarehouse());
        // 🔒 Update pin codes when warehouse changes
        db.setAssignedPinCodes(req.getRequestedWarehouse().getServedPinCodes());
        deliveryBoyRepository.save(db);

        req.setStatus(WarehouseChangeRequest.Status.APPROVED);
        req.setAdminNote(adminNote != null ? adminNote.trim() : "");
        req.setResolvedAt(LocalDateTime.now());
        warehouseChangeRequestRepository.save(req);

        try { 
            emailSender.sendWarehouseChangeApproved(db, req.getRequestedWarehouse(), "Approved by Admin"); 
        }
        catch (Exception e) { log.error("Warehouse change approval email failed: {}", e.getMessage(), e); }

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, "Warehouse change approved for " + db.getName());
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Map<String, Object>> rejectWarehouseChange(
            int requestId, String adminNote, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        if (session.getAttribute(KEY_ADMIN) == null) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, MSG_UNAUTHORIZED);
            return ResponseEntity.status(403).body(res);
        }

        WarehouseChangeRequest req = warehouseChangeRequestRepository.findById(requestId).orElse(null);
        if (req == null || req.getStatus() != WarehouseChangeRequest.Status.PENDING) {
            res.put(KEY_SUCCESS, false); res.put(KEY_MESSAGE, "Request not found or already resolved");
            return ResponseEntity.badRequest().body(res);
        }

        req.setStatus(WarehouseChangeRequest.Status.REJECTED);
        req.setAdminNote(adminNote != null ? adminNote.trim() : "");
        req.setResolvedAt(LocalDateTime.now());
        warehouseChangeRequestRepository.save(req);

        DeliveryBoy db = req.getDeliveryBoy();
        try { emailSender.sendWarehouseChangeRejected(db, req.getRequestedWarehouse(), adminNote); }
        catch (Exception e) { log.error("Warehouse change rejection email failed: {}", e.getMessage(), e); }

        res.put(KEY_SUCCESS, true);
        res.put(KEY_MESSAGE, "Warehouse change request rejected");
        return ResponseEntity.ok(res);
    }

    public List<WarehouseChangeRequest> getPendingWarehouseChangeRequests() {
        return warehouseChangeRequestRepository
                .findByStatusOrderByRequestedAtDesc(WarehouseChangeRequest.Status.PENDING);
    }

    // ── API ENDPOINTS FOR REACT DASHBOARD ────────────────────────

    public ResponseEntity<Map<String, Object>> getDeliveryBoyProfile(HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, MSG_NOT_LOGGED_IN);
            return ResponseEntity.status(401).body(res);
        }

        Map<String, Object> dbMap = new LinkedHashMap<>();
        dbMap.put("id", db.getId());
        dbMap.put(K_NAME, db.getName());
        dbMap.put("email", db.getEmail());
        dbMap.put("mobile", db.getMobile());
        dbMap.put("deliveryBoyCode", db.getDeliveryBoyCode());
        dbMap.put("assignedPinCodes", db.getAssignedPinCodes());
        dbMap.put(KEY_IS_AVAILABLE, db.isAvailable());

        if (db.getWarehouse() != null) {
            Map<String, Object> whMap = new LinkedHashMap<>();
            whMap.put("id", db.getWarehouse().getId());
            whMap.put(K_NAME, db.getWarehouse().getName());
            whMap.put("city", db.getWarehouse().getCity());
            whMap.put("state", db.getWarehouse().getState());
            whMap.put("warehouseCode", db.getWarehouse().getWarehouseCode());
            dbMap.put("warehouse", whMap);
        }

        int activeCount = autoAssignmentService.countActiveOrders(db);
        dbMap.put("activeOrders", activeCount);
        dbMap.put("maxConcurrent", AutoAssignmentService.MAX_CONCURRENT_ORDERS);
        dbMap.put("availableSlots", AutoAssignmentService.MAX_CONCURRENT_ORDERS - activeCount);

        res.put(KEY_SUCCESS, true);
        res.put(KEY_DELIVERY_BOY, dbMap);
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Map<String, Object>> getDeliveryBoyOrders(HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, MSG_NOT_LOGGED_IN);
            return ResponseEntity.status(401).body(res);
        }

        List<Order> allOrders = orderRepository.findByDeliveryBoy(db);
        List<Map<String, Object>> toPickUp = new ArrayList<>();
        List<Map<String, Object>> outForDelivery = new ArrayList<>();
        List<Map<String, Object>> delivered = new ArrayList<>();

        for (Order order : allOrders) {
            Map<String, Object> orderMap = new LinkedHashMap<>();
            orderMap.put("id", order.getId());
            orderMap.put("customerName", order.getCustomer() != null ? order.getCustomer().getName() : "");
            orderMap.put("customer", order.getCustomer() != null ?
                Map.of(K_NAME, order.getCustomer().getName(),
                       "phone", (Object) order.getCustomer().getMobile()) : null);
            orderMap.put("amount", order.getTotalPrice());
            orderMap.put("totalPrice", order.getTotalPrice());
            orderMap.put("status", order.getTrackingStatus().name());
            orderMap.put("deliveryAddress", order.getDeliveryAddress());
            orderMap.put("items", order.getItems() != null ?
                order.getItems().stream()
                    .map(item -> Map.of(
                        K_NAME, (Object) item.getName(),
                        "quantity", (Object) item.getQuantity()
                    ))
                    .toList() : new ArrayList<>());

            if (order.getTrackingStatus() == TrackingStatus.SHIPPED) {
                toPickUp.add(orderMap);
            } else if (order.getTrackingStatus() == TrackingStatus.OUT_FOR_DELIVERY) {
                outForDelivery.add(orderMap);
            } else if (order.getTrackingStatus() == TrackingStatus.DELIVERED) {
                delivered.add(orderMap);
            }
        }

        res.put(KEY_SUCCESS, true);
        res.put("toPickUp", toPickUp);
        res.put("outForDelivery", outForDelivery);
        res.put("delivered", delivered);
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Map<String, Object>> getPendingWarehouseChangeRequest(HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put(KEY_SUCCESS, false);
            res.put(KEY_MESSAGE, MSG_NOT_LOGGED_IN);
            return ResponseEntity.status(401).body(res);
        }

        WarehouseChangeRequest pendingRequest = warehouseChangeRequestRepository
            .findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING)
            .orElse(null);

        if (pendingRequest != null) {
            Map<String, Object> reqMap = new LinkedHashMap<>();
            reqMap.put("id", pendingRequest.getId());
            reqMap.put(KEY_REASON, pendingRequest.getReason());
            if (pendingRequest.getRequestedWarehouse() != null) {
                reqMap.put("requestedWarehouse", Map.of(
                    "id", pendingRequest.getRequestedWarehouse().getId(),
                    K_NAME, pendingRequest.getRequestedWarehouse().getName()
                ));
            }
            res.put(KEY_SUCCESS, true);
            res.put("request", reqMap);
        } else {
            res.put(KEY_SUCCESS, true);
            res.put("request", null);
        }

        return ResponseEntity.ok(res);
    }

    // ── HELPERS ───────────────────────────────────────────────────

    private void logEvent(Order order, TrackingStatus status,
                           String city, String description, String actor) {
        trackingEventLogRepository.save(
            new TrackingEventLog(order, status, city, description, actor));
    }

    private DeliveryBoy getSessionDeliveryBoy(HttpSession session) {
        return (DeliveryBoy) session.getAttribute(KEY_DELIVERY_BOY);
    }
}