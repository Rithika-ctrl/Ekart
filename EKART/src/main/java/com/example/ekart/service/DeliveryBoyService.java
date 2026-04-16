package com.example.ekart.service;

import com.example.ekart.dto.*;
import com.example.ekart.helper.AES;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.*;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.ModelMap;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class DeliveryBoyService {

    private static final Logger log = LoggerFactory.getLogger(DeliveryBoyService.class);

    @Autowired private DeliveryBoyRepository              deliveryBoyRepository;
    @Autowired private WarehouseRepository                warehouseRepository;
    @Autowired private OrderRepository                    orderRepository;
    @Autowired private TrackingEventLogRepository         trackingEventLogRepository;
    @Autowired private DeliveryOtpRepository              deliveryOtpRepository;
    @Autowired private EmailSender                        emailSender;
    @Autowired private WarehouseChangeRequestRepository   warehouseChangeRequestRepository;
    @Autowired private OtpService                         otpService;

    @Autowired @Lazy private AutoAssignmentService autoAssignmentService;

    // ── SELF REGISTRATION ─────────────────────────────────────────

    public String loadRegisterPage(ModelMap map) {
        return "delivery-register.html";
    }

    public String selfRegister(String name, String email, long mobile,
                                String password, String confirmPassword,
                                int warehouseId, HttpSession session) {

        if (name == null || name.trim().length() < 3) {
            session.setAttribute("failure", "Name must be at least 3 characters");
            return "redirect:/delivery/register";
        }
        if (email == null || !email.contains("@")) {
            session.setAttribute("failure", "Enter a valid email address");
            return "redirect:/delivery/register";
        }
        if (deliveryBoyRepository.existsByEmail(email.trim().toLowerCase())) {
            DeliveryBoy existing = deliveryBoyRepository.findByEmail(email.trim().toLowerCase());
            if (existing != null && existing.isVerified()) {
                session.setAttribute("failure", "This email is already verified. Please login instead.");
                return "redirect:/delivery/register";
            }
            // Allow updating unverified account
        }
        if (password == null || confirmPassword == null || !password.equals(confirmPassword)) {
            session.setAttribute("failure", "Password and Confirm Password must match");
            return "redirect:/delivery/register";
        }
        String passwordRegex = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";
        if (password == null || !password.matches(passwordRegex)) {
            session.setAttribute("failure", "Password must be at least 8 characters and include uppercase, lowercase, number and special character");
            return "redirect:/delivery/register";
        }
        if (warehouseId <= 0) {
            session.setAttribute("failure", "Please select a warehouse");
            return "redirect:/delivery/register";
        }

        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        if (warehouse == null) {
            session.setAttribute("failure", "Selected warehouse not found. Please try again.");
            return "redirect:/delivery/register";
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
            System.err.println("Delivery boy OTP email failed: " + e.getMessage());
        }

        session.setAttribute("success", "OTP sent to " + email + ". Verify your email to continue.");
        return "redirect:/delivery/otp/" + db.getId();
    }

    // ── OTP VERIFICATION ──────────────────────────────────────────

    public String loadOtpPage(int id, ModelMap map) {
        map.put("id", id);
        return "delivery-otp.html";
    }

    public String verifyOtp(int id, int otp, HttpSession session) {
        DeliveryBoy db = deliveryBoyRepository.findById(id).orElse(null);
        if (db == null) {
            session.setAttribute("failure", "Invalid request");
            return "redirect:/delivery/login";
        }

        // 🔒 NEW: Verify OTP using secure service (hashed comparison)
        OtpService.VerificationResult result = otpService.verifyOtp(db.getEmail(), String.format("%06d", otp), OtpService.PURPOSE_DELIVERY_REGISTER);
        
        if (result.success) {
            db.setVerified(true);
            deliveryBoyRepository.save(db);

            if (!db.isAdminApproved()) {
                try { emailSender.sendDeliveryBoyPendingAlert(db); }
                catch (Exception e) { System.err.println("Admin alert email failed: " + e.getMessage()); }
                return "redirect:/delivery/pending";
            }

            session.setAttribute("success", "Email verified! You can now login.");
            return "redirect:/delivery/login";
        }

        session.setAttribute("failure", result.message);
        return "redirect:/delivery/otp/" + id;
    }

    public String loadPendingPage() { return "delivery-pending.html"; }

    // ── ADMIN APPROVAL ────────────────────────────────────────────

    public List<DeliveryBoy> getPendingApprovals() {
        return deliveryBoyRepository.findByAdminApprovedFalseAndVerifiedTrue();
    }

    public ResponseEntity<Map<String, Object>> approveDeliveryBoy(
            int deliveryBoyId, String assignedPinCodes, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        if (session.getAttribute("admin") == null) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null) {
            res.put("success", false); res.put("message", "Delivery boy not found");
            return ResponseEntity.badRequest().body(res);
        }

        db.setAdminApproved(true);
        if (assignedPinCodes != null && !assignedPinCodes.isBlank()) {
            db.setAssignedPinCodes(assignedPinCodes.trim());
        }
        deliveryBoyRepository.save(db);

        try { emailSender.sendDeliveryBoyApproved(db); }
        catch (Exception e) { System.err.println("Approval email failed: " + e.getMessage()); }

        res.put("success", true);
        res.put("message", db.getName() + " approved successfully");
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Map<String, Object>> rejectDeliveryBoy(
            int deliveryBoyId, String reason, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        if (session.getAttribute("admin") == null) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null) {
            res.put("success", false); res.put("message", "Delivery boy not found");
            return ResponseEntity.badRequest().body(res);
        }

        db.setActive(false);
        deliveryBoyRepository.save(db);

        try { emailSender.sendDeliveryBoyRejected(db, reason); }
        catch (Exception e) { System.err.println("Rejection email failed: " + e.getMessage()); }

        res.put("success", true);
        res.put("message", db.getName() + " rejected and deactivated");
        return ResponseEntity.ok(res);
    }

    // ── LOGIN ─────────────────────────────────────────────────────

    public String loadLoginPage() { return "delivery-login.html"; }

    public String login(String email, String password, HttpSession session) {
        DeliveryBoy db = deliveryBoyRepository.findByEmail(email);

        if (db == null) {
            session.setAttribute("failure", "No account found with this email");
            return "redirect:/delivery/login";
        }

        String decrypted = AES.decrypt(db.getPassword());
        if (decrypted == null || !decrypted.equals(password)) {
            session.setAttribute("failure", "Wrong password");
            return "redirect:/delivery/login";
        }

        if (!db.isVerified()) {
            try {
                // 🔒 NEW: Use secure OTP service to resend
                String plainOtp = otpService.resendOtp(db.getEmail(), OtpService.PURPOSE_DELIVERY_LOGIN);
                emailSender.sendDeliveryBoyOtpSecure(db, plainOtp);
            } catch (Exception ignored) {}
            session.setAttribute("success", "Please verify your email first. OTP resent.");
            return "redirect:/delivery/otp/" + db.getId();
        }

        if (!db.isActive()) {
            session.setAttribute("failure", "Your account has been deactivated. Contact admin.");
            return "redirect:/delivery/login";
        }

        if (!db.isAdminApproved()) {
            session.setAttribute("failure",
                "Your account is pending admin approval. You will receive an email once approved.");
            return "redirect:/delivery/login";
        }

        session.setAttribute("deliveryBoy", db);
        session.setAttribute("success", "Welcome back, " + db.getName() + "!");
        return "redirect:/delivery/home";
    }

    public String logout(HttpSession session) {
        session.removeAttribute("deliveryBoy");
        session.setAttribute("success", "Logged out successfully");
        return "redirect:/delivery/login";
    }

    // ── PUBLIC: List active warehouses ────────────────────────────

    public ResponseEntity<List<Map<String, Object>>> getActiveWarehouses() {
        List<Warehouse> warehouses = warehouseRepository.findByActiveTrue();
        List<Map<String, Object>> data = new ArrayList<>();
        for (Warehouse wh : warehouses) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",   wh.getId());
            m.put("name", wh.getName());
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
            res.put("success", false); res.put("message", "Not logged in");
            return ResponseEntity.status(401).body(res);
        }

        boolean isAvailable = (Boolean) payload.getOrDefault("isAvailable", false);
        db.setAvailable(isAvailable);
        deliveryBoyRepository.save(db);

        // AUTO-ASSIGN DISABLED (Phase 3)
        // Previously: if (isAvailable) autoAssignmentService.onDeliveryBoyOnline(db);
        // Now: Warehouse staff manually assigns orders via WarehouseReceivingService
        if (isAvailable) {
            log.info("[DELIVERY BOY] {} is now online (manual assignment enabled)", db.getName());
        }

        res.put("success", true);
        res.put("message", isAvailable ? "You are now online" : "You are now offline");
        res.put("isAvailable", isAvailable);
        return ResponseEntity.ok(res);
    }

    // ── PICKUP ────────────────────────────────────────────────────

    public ResponseEntity<Map<String, Object>> markPickedUp(int orderId, HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put("success", false); res.put("message", "Not logged in");
            return ResponseEntity.status(401).body(res);
        }

        Order order = orderRepository.findById(orderId).orElse(null);
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
            res.put("message", "Order is already in status: " + order.getTrackingStatus().getDisplayName());
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

        int otp = new Random().nextInt(100000, 1000000);
        deliveryOtpRepository.findByOrder(order).ifPresent(deliveryOtpRepository::delete);
        deliveryOtpRepository.save(new DeliveryOtp(order, otp));

        try { emailSender.sendDeliveryOtp(order.getCustomer(), otp, order.getId()); }
        catch (Exception e) { System.err.println("Delivery OTP email failed: " + e.getMessage()); }

        res.put("success", true);
        res.put("message", "Marked as Out for Delivery. OTP sent to customer.");
        return ResponseEntity.ok(res);
    }

    // ── CONFIRM DELIVERY ──────────────────────────────────────────

    public ResponseEntity<Map<String, Object>> confirmDelivery(int orderId, int submittedOtp,
                                                                 HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put("success", false); res.put("message", "Not logged in");
            return ResponseEntity.status(401).body(res);
        }

        Order order = orderRepository.findById(orderId).orElse(null);
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
            res.put("success", false); res.put("message", "Wrong OTP. Ask customer for the correct OTP.");
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
        catch (Exception e) { System.err.println("Delivery confirmation email failed: " + e.getMessage()); }

        // AUTO-ASSIGN DISABLED (Phase 3)
        // Previously: autoAssignmentService.onOrderDelivered(db);
        // Now: Warehouse staff will manually assign next order for delivery boy
        log.info("[DELIVERY] Order #{} delivered by {} (auto-fill disabled)", orderId, db.getName());

        res.put("success", true);
        res.put("message", "Order #" + orderId + " marked as Delivered!");
        return ResponseEntity.ok(res);
    }

    // ── DASHBOARD ─────────────────────────────────────────────────

    public String loadHome(HttpSession session, ModelMap map) {
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) return "redirect:/delivery/login";
        db = deliveryBoyRepository.findById(db.getId()).orElse(db);
        session.setAttribute("deliveryBoy", db);
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
            res.put("success", false); res.put("message", "Not logged in");
            return ResponseEntity.status(401).body(res);
        }

        Warehouse requested = warehouseRepository.findById(warehouseId).orElse(null);
        if (requested == null) {
            res.put("success", false); res.put("message", "Warehouse not found");
            return ResponseEntity.badRequest().body(res);
        }

        boolean hasPending = warehouseChangeRequestRepository
            .findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING)
            .isPresent();

        if (hasPending) {
            res.put("success", false); res.put("message", "You already have a pending transfer request");
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

        res.put("success", true);
        res.put("message", "Transfer request submitted. Admin will review it shortly.");
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Map<String, Object>> approveWarehouseChange(
            int requestId, String adminNote, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        if (session.getAttribute("admin") == null) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }

        WarehouseChangeRequest req = warehouseChangeRequestRepository.findById(requestId).orElse(null);
        if (req == null || req.getStatus() != WarehouseChangeRequest.Status.PENDING) {
            res.put("success", false); res.put("message", "Request not found or already resolved");
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
        catch (Exception e) { System.err.println("Warehouse change approval email failed: " + e.getMessage()); }

        res.put("success", true);
        res.put("message", "Warehouse change approved for " + db.getName());
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Map<String, Object>> rejectWarehouseChange(
            int requestId, String adminNote, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        if (session.getAttribute("admin") == null) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }

        WarehouseChangeRequest req = warehouseChangeRequestRepository.findById(requestId).orElse(null);
        if (req == null || req.getStatus() != WarehouseChangeRequest.Status.PENDING) {
            res.put("success", false); res.put("message", "Request not found or already resolved");
            return ResponseEntity.badRequest().body(res);
        }

        req.setStatus(WarehouseChangeRequest.Status.REJECTED);
        req.setAdminNote(adminNote != null ? adminNote.trim() : "");
        req.setResolvedAt(LocalDateTime.now());
        warehouseChangeRequestRepository.save(req);

        DeliveryBoy db = req.getDeliveryBoy();
        try { emailSender.sendWarehouseChangeRejected(db, req.getRequestedWarehouse(), adminNote); }
        catch (Exception e) { System.err.println("Warehouse change rejection email failed: " + e.getMessage()); }

        res.put("success", true);
        res.put("message", "Warehouse change request rejected");
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
            res.put("success", false);
            res.put("message", "Not logged in");
            return ResponseEntity.status(401).body(res);
        }

        Map<String, Object> dbMap = new LinkedHashMap<>();
        dbMap.put("id", db.getId());
        dbMap.put("name", db.getName());
        dbMap.put("email", db.getEmail());
        dbMap.put("mobile", db.getMobile());
        dbMap.put("deliveryBoyCode", db.getDeliveryBoyCode());
        dbMap.put("assignedPinCodes", db.getAssignedPinCodes());
        dbMap.put("isAvailable", db.isAvailable());

        if (db.getWarehouse() != null) {
            Map<String, Object> whMap = new LinkedHashMap<>();
            whMap.put("id", db.getWarehouse().getId());
            whMap.put("name", db.getWarehouse().getName());
            whMap.put("city", db.getWarehouse().getCity());
            whMap.put("state", db.getWarehouse().getState());
            whMap.put("warehouseCode", db.getWarehouse().getWarehouseCode());
            dbMap.put("warehouse", whMap);
        }

        int activeCount = autoAssignmentService.countActiveOrders(db);
        dbMap.put("activeOrders", activeCount);
        dbMap.put("maxConcurrent", AutoAssignmentService.MAX_CONCURRENT_ORDERS);
        dbMap.put("availableSlots", AutoAssignmentService.MAX_CONCURRENT_ORDERS - activeCount);

        res.put("success", true);
        res.put("deliveryBoy", dbMap);
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Map<String, Object>> getDeliveryBoyOrders(HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put("success", false);
            res.put("message", "Not logged in");
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
                Map.of("name", order.getCustomer().getName(),
                       "phone", (Object) order.getCustomer().getMobile()) : null);
            orderMap.put("amount", order.getTotalPrice());
            orderMap.put("totalPrice", order.getTotalPrice());
            orderMap.put("status", order.getTrackingStatus().name());
            orderMap.put("deliveryAddress", order.getDeliveryAddress());
            orderMap.put("items", order.getItems() != null ?
                order.getItems().stream()
                    .map(item -> Map.of(
                        "name", (Object) item.getName(),
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

        res.put("success", true);
        res.put("toPickUp", toPickUp);
        res.put("outForDelivery", outForDelivery);
        res.put("delivered", delivered);
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Map<String, Object>> getPendingWarehouseChangeRequest(HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        DeliveryBoy db = getSessionDeliveryBoy(session);
        if (db == null) {
            res.put("success", false);
            res.put("message", "Not logged in");
            return ResponseEntity.status(401).body(res);
        }

        WarehouseChangeRequest pendingRequest = warehouseChangeRequestRepository
            .findByDeliveryBoyAndStatus(db, WarehouseChangeRequest.Status.PENDING)
            .orElse(null);

        if (pendingRequest != null) {
            Map<String, Object> reqMap = new LinkedHashMap<>();
            reqMap.put("id", pendingRequest.getId());
            reqMap.put("reason", pendingRequest.getReason());
            if (pendingRequest.getRequestedWarehouse() != null) {
                reqMap.put("requestedWarehouse", Map.of(
                    "id", pendingRequest.getRequestedWarehouse().getId(),
                    "name", pendingRequest.getRequestedWarehouse().getName()
                ));
            }
            res.put("success", true);
            res.put("request", reqMap);
        } else {
            res.put("success", true);
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
        return (DeliveryBoy) session.getAttribute("deliveryBoy");
    }
}