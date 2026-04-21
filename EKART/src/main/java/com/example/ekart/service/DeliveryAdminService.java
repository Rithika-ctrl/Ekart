package com.example.ekart.service;
import java.util.stream.Collectors;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// ================================================================
// DeliveryAdminService.java
// Handles all admin delivery management operations.
// 
// Key Features:
//   - Manual delivery boy assignment (admin-controlled)
//   - PIN code matching for deliveries
//   - 3-order concurrent limit per delivery boy
//   - Warehouse and delivery boy management
//   - Delivery boy load tracking (active order counts)
// ================================================================

import com.example.ekart.dto.*;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.*;
import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;

import java.util.*;
import java.util.LinkedHashSet;

@Service
@Transactional
public class DeliveryAdminService {

    private static final Logger LOGGER = LoggerFactory.getLogger(DeliveryAdminService.class);

    // Constants (from removed AutoAssignmentService)
    private static final int MAX_CONCURRENT_ORDERS = 3;


    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final OrderRepository orderRepository;
    private final WarehouseRepository warehouseRepository;
    private final DeliveryBoyRepository deliveryBoyRepository;
    private final TrackingEventLogRepository trackingEventLogRepository;
    private final AutoAssignLogRepository autoAssignLogRepository;
    private final EmailSender emailSender;
    private final DeliveryBoyService deliveryBoyService;

    public DeliveryAdminService(
            OrderRepository orderRepository,
            WarehouseRepository warehouseRepository,
            DeliveryBoyRepository deliveryBoyRepository,
            TrackingEventLogRepository trackingEventLogRepository,
            AutoAssignLogRepository autoAssignLogRepository,
            EmailSender emailSender,
            DeliveryBoyService deliveryBoyService) {
        this.orderRepository = orderRepository;
        this.warehouseRepository = warehouseRepository;
        this.deliveryBoyRepository = deliveryBoyRepository;
        this.trackingEventLogRepository = trackingEventLogRepository;
        this.autoAssignLogRepository = autoAssignLogRepository;
        this.emailSender = emailSender;
        this.deliveryBoyService = deliveryBoyService;
    }

    // Count active orders for a delivery boy (replaces autoAssignmentService.countActiveOrders)
    private int countActiveOrders(DeliveryBoy deliveryBoy) {
        if (deliveryBoy == null) return 0;
        return (int) orderRepository.findAll().stream()
                .filter(o -> o.getDeliveryBoy() != null 
                        && o.getDeliveryBoy().getId() == deliveryBoy.getId()
                        && (o.getTrackingStatus() == TrackingStatus.SHIPPED 
                            || o.getTrackingStatus() == TrackingStatus.OUT_FOR_DELIVERY))
                .count();
    }

    // ── Load delivery management page ────────────────────────────

    public String loadDeliveryManagement(HttpSession session, ModelMap map) {
        if (!isAdmin(session)) return "redirect:/admin/login";

        List<Order>       packedOrders     = orderRepository.findByTrackingStatus(TrackingStatus.PACKED);
        List<Order>       shippedOrders    = orderRepository.findByTrackingStatus(TrackingStatus.SHIPPED);
        List<Order>       outOrders        = orderRepository.findByTrackingStatus(TrackingStatus.OUT_FOR_DELIVERY);
        List<Warehouse>   warehouses       = warehouseRepository.findByActiveTrue();
        List<DeliveryBoy> deliveryBoys     = deliveryBoyRepository.findByActiveTrue();
        List<DeliveryBoy> pendingApprovals = deliveryBoyService.getPendingApprovals();

        // Auto-assign: load counts for admin visibility
        // Map<deliveryBoyId, activeOrderCount>
        Map<Integer, Integer> activeOrderCounts = new LinkedHashMap<>();
        for (DeliveryBoy db : deliveryBoys) {
            activeOrderCounts.put(db.getId(), countActiveOrders(db));
        }

        // Recent auto-assign logs (last 50)
        List<AutoAssignLog> recentAutoAssigns = autoAssignLogRepository
                .findTop50ByOrderByAssignedAtDesc();

        // Unassigned packed orders (waiting for auto or manual assignment)
        List<Order> unassignedPacked = packedOrders.stream()
                .filter(o -> o.getDeliveryBoy() == null)
                .collect(Collectors.toList());

        // Packed orders already auto/manually assigned (awaiting pickup)
        List<Order> assignedPacked = packedOrders.stream()
                .filter(o -> o.getDeliveryBoy() != null)
                .collect(Collectors.toList());

        map.put("packedOrders",       packedOrders);
        map.put("unassignedPacked",   unassignedPacked);
        map.put("assignedPacked",     assignedPacked);
        map.put("shippedOrders",      shippedOrders);
        map.put("outOrders",          outOrders);
        map.put("warehouses",         warehouses);
        map.put("deliveryBoys",       deliveryBoys);
        map.put("pendingApprovals",   pendingApprovals);
        map.put("activeOrderCounts",  activeOrderCounts);
        map.put("recentAutoAssigns",  recentAutoAssigns);
        map.put("maxConcurrent",      MAX_CONCURRENT_ORDERS);

        return "admin-delivery-management.html";
    }

    // ── Load warehouse management page ───────────────────────────

    public String loadWarehousePage(HttpSession session, ModelMap map) {
        if (!isAdmin(session)) return "redirect:/admin/login";
        List<Warehouse> warehouses = warehouseRepository.findAll();
        map.put("warehouses", warehouses);
        return "admin-warehouse.html";
    }

    // ── Add Warehouse ────────────────────────────────────────────

    public ResponseEntity<AdminEntityCreateResponse> addWarehouse(String name, String city,
                                                                  String state, String servedPinCodes,
                                                                  HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(403).body(AdminEntityCreateResponse.failure("Unauthorized"));
        }
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(AdminEntityCreateResponse.failure("Warehouse name is required"));
        }

        Warehouse wh = new Warehouse();
        wh.setName(name.trim());
        wh.setCity(city != null ? city.trim() : "");
        wh.setState(state != null ? state.trim() : "");
        wh.setServedPinCodes(servedPinCodes != null ? servedPinCodes.trim() : "");
        wh.setActive(true);
        warehouseRepository.save(wh);
        wh.setWarehouseCode(String.format("WH-%03d", wh.getId()));
        warehouseRepository.save(wh);

        return ResponseEntity.ok(AdminEntityCreateResponse.warehouseSuccess(
            "Warehouse '" + name + "' added (" + wh.getWarehouseCode() + ")", wh.getId()));
    }

    // ── Admin creates delivery boy (immediately approved) ─────────

    public ResponseEntity<AdminEntityCreateResponse> registerDeliveryBoy(
            String name, String email, long mobile,
            String password, String confirmPassword,
            int warehouseId, String assignedPinCodes,
            HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(403).body(AdminEntityCreateResponse.failure("Unauthorized"));
        }

        if (name == null || name.trim().length() < 3) {
            return ResponseEntity.badRequest().body(AdminEntityCreateResponse.failure("Name must be at least 3 characters"));
        }
        if (email == null || !email.contains("@")) {
            return ResponseEntity.badRequest().body(AdminEntityCreateResponse.failure("Enter a valid email"));
        }
        if (deliveryBoyRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(AdminEntityCreateResponse.failure("Email already registered"));
        }
        if (password == null || confirmPassword == null || !password.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(AdminEntityCreateResponse.failure("Passwords do not match"));
        }
        String passwordRegex = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";
        if (password == null || !password.matches(passwordRegex)) {
            return ResponseEntity.badRequest().body(AdminEntityCreateResponse.failure(
                    "Password must be at least 8 characters and include uppercase, lowercase, number and special character"));
        }

        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        if (warehouse == null) {
            return ResponseEntity.badRequest().body(AdminEntityCreateResponse.failure("Warehouse not found"));
        }

        DeliveryBoy db = new DeliveryBoy();
        db.setName(name.trim());
        db.setEmail(email.trim().toLowerCase());
        db.setMobile(mobile);
        db.setPassword(com.example.ekart.helper.AES.encrypt(password));
        db.setWarehouse(warehouse);
        db.setAssignedPinCodes(assignedPinCodes != null ? assignedPinCodes.trim() : "");
        db.setVerified(true);  // ← FIXED: Admin-created boys are immediately verified
        db.setAdminApproved(true);
        db.setActive(true);

        int otp = new Random().nextInt(100000, 1000000);
        db.setOtp(otp);

        deliveryBoyRepository.save(db);
        db.setDeliveryBoyCode(String.format("DB-%05d", db.getId()));
        deliveryBoyRepository.save(db);

        try { emailSender.sendDeliveryBoyOtp(db); } catch (Exception e) {
            LOGGER.error("Delivery boy OTP email failed: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok(AdminEntityCreateResponse.deliveryBoySuccess(
            "Delivery boy registered. OTP sent to " + email, db.getId()));
    }

    // ── Assign delivery boy to order (MANUAL OVERRIDE by admin) ──
    //   Admin can manually assign regardless of auto-assign state.
    //   Cap check is advisory — admin can override.

    public ResponseEntity<DeliveryAssignmentResponse> assignDeliveryBoy(int orderId,
                                                                       int deliveryBoyId,
                                                                       HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(403)
                    .body(DeliveryAssignmentResponse.failure("Unauthorized"));
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest()
                    .body(DeliveryAssignmentResponse.failure("Order not found"));
        }
        if (order.getTrackingStatus() != TrackingStatus.PACKED) {
            return ResponseEntity.badRequest().body(DeliveryAssignmentResponse.failure(
                    "Order must be PACKED before assigning. Current: "
                            + order.getTrackingStatus().getDisplayName()));
        }

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null || !db.isActive() || !db.isVerified() || !db.isAdminApproved()) {
            return ResponseEntity.badRequest().body(
                    DeliveryAssignmentResponse.failure("Delivery boy not found or not active"));
        }

        int activeCount = countActiveOrders(db);
        boolean overCap = activeCount >= MAX_CONCURRENT_ORDERS;

        order.setDeliveryBoy(db);
        order.setTrackingStatus(TrackingStatus.SHIPPED);
        String city = db.getWarehouse() != null ? db.getWarehouse().getCity() : "In transit";
        order.setCurrentCity(city);
        orderRepository.save(order);

        String note = overCap
            ? "[ADMIN OVERRIDE] Manually assigned to " + db.getName()
              + " (" + db.getDeliveryBoyCode() + "). Note: over cap (" + activeCount + "/" + MAX_CONCURRENT_ORDERS + ")"
            : "[ADMIN] Manually assigned to " + db.getName() + " (" + db.getDeliveryBoyCode() + ")";

        trackingEventLogRepository.save(new TrackingEventLog(
            order, TrackingStatus.SHIPPED, city, note, "admin"));

        try { emailSender.sendShippedEmail(order.getCustomer(), order, db.getName()); }
        catch (Exception e) { LOGGER.error("Shipped email failed: {}", e.getMessage(), e); }

        String message = "Order #" + orderId + " assigned to " + db.getName()
                + (overCap ? " (note: over 3-order cap)" : "");
        return ResponseEntity.ok(DeliveryAssignmentResponse.success(message, overCap));
    }

    // ── Admin marks order as PACKED (triggers auto-assign) ────────

    public ResponseEntity<Map<String, Object>> markOrderPacked(int orderId, HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!isAdmin(session)) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            res.put("success", false); res.put("message", "Order not found");
            return ResponseEntity.badRequest().body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.PROCESSING) {
            res.put("success", false);
            res.put("message", "Order must be PROCESSING to mark as Packed. Current: "
                    + order.getTrackingStatus().getDisplayName());
            return ResponseEntity.badRequest().body(res);
        }

        order.setTrackingStatus(TrackingStatus.PACKED);
        orderRepository.save(order);

        trackingEventLogRepository.save(new TrackingEventLog(
            order, TrackingStatus.PACKED,
            order.getCurrentCity() != null ? order.getCurrentCity() : "Warehouse",
            "Order packed and ready for pickup", "admin"));

        res.put("success", true);
        res.put("message", "Order #" + orderId + " marked as PACKED. Admin must manually assign a delivery boy.");
        return ResponseEntity.ok(res);
    }

    // ── Admin API: Get auto-assign logs ───────────────────────────

    public ResponseEntity<AutoAssignLogResponse> getAutoAssignLogs(HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(403).body(AutoAssignLogResponse.failure("Unauthorized"));
        }

        List<AutoAssignLog> logs = autoAssignLogRepository.findTop50ByOrderByAssignedAtDesc();
        List<AutoAssignLogItem> data = new ArrayList<>();
        for (AutoAssignLog log : logs) {
            data.add(new AutoAssignLogItem(
                    log.getId(),
                    log.getOrderId(),
                    log.getDeliveryBoy() != null ? log.getDeliveryBoy().getName() : "N/A",
                    log.getDeliveryBoy() != null ? log.getDeliveryBoy().getDeliveryBoyCode() : "N/A",
                    log.getPinCode(),
                    log.getAssignedAt() != null ? log.getAssignedAt().toString() : null,
                    log.getActiveOrdersAtAssignment(),
                    MAX_CONCURRENT_ORDERS));
        }

        return ResponseEntity.ok(AutoAssignLogResponse.success(data, MAX_CONCURRENT_ORDERS));
    }

    // ── Admin API: Get delivery boy load (active orders count) ────

    public ResponseEntity<DeliveryBoyLoadResponse> getDeliveryBoyLoad(HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(403).body(DeliveryBoyLoadResponse.failure("Unauthorized"));
        }

        List<DeliveryBoy> boys = deliveryBoyRepository.findByActiveTrue();
        List<DeliveryBoyLoadItem> data = new ArrayList<>();
        for (DeliveryBoy db : boys) {
            if (!db.isVerified() || !db.isAdminApproved()) continue;
            int active = countActiveOrders(db);
            int maxConcurrent = MAX_CONCURRENT_ORDERS;
            data.add(new DeliveryBoyLoadItem(
                    db.getId(),
                    db.getName(),
                    db.getDeliveryBoyCode(),
                    db.isAvailable(),
                    active,
                    maxConcurrent - active,
                    maxConcurrent,
                    active >= maxConcurrent,
                    db.getAssignedPinCodes(),
                    db.getWarehouse() != null ? db.getWarehouse().getName() : "—"));
        }

        return ResponseEntity.ok(DeliveryBoyLoadResponse.success(data, MAX_CONCURRENT_ORDERS));
    }

    // ── Get ELIGIBLE delivery boys for an order ─────────────────;

    public ResponseEntity<EligibleDeliveryBoysResponse> getEligibleDeliveryBoys(int orderId,
                                                                                HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(403).body(EligibleDeliveryBoysResponse.failure("Unauthorized"));
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body(EligibleDeliveryBoysResponse.failure("Order not found"));
        }

        String pin = order.getDeliveryPinCode();

        // ── FIX: Use a union strategy to find ALL eligible delivery boys ──
        // Problem: findByPinCode() only matched boys with explicit assignedPinCodes entries.
        // Boys registered at a warehouse that serves the PIN were missed when
        // the order had no warehouse set, or when DB-level REPLACE() failed on
        // edge-case whitespace/encoding.  We now:
        //   1. Collect boys via DB pin-code query  (catches explicit assignments)
        //   2. Collect boys via warehouse lookup   (catches warehouse-assigned boys)
        //   3. Merge & deduplicate by id
        //   4. Java-side covers() + warehouse-pin re-check as safety net
        //   5. If still empty, show ALL approved+active boys so admin is never blocked

        Set<Integer> seen = new LinkedHashSet<>();
        List<DeliveryBoy> boys = new ArrayList<>();

        // Step 1: DB-level pin-code match
        if (pin != null && !pin.isBlank()) {
            for (DeliveryBoy b : deliveryBoyRepository.findByPinCode(pin.trim())) {
                if (seen.add(b.getId())) boys.add(b);
            }
        }

        // Step 2: Warehouse-based match (always run, not just as fallback)
        Warehouse orderWarehouse = order.getWarehouse();
        if (orderWarehouse == null && pin != null && !pin.isBlank()) {
            List<Warehouse> whs = warehouseRepository.findByPinCode(pin.trim());
            if (!whs.isEmpty()) orderWarehouse = whs.get(0);
        }
        if (orderWarehouse != null) {
            for (DeliveryBoy b : deliveryBoyRepository.findActiveByWarehouse(orderWarehouse)) {
                if (seen.add(b.getId())) boys.add(b);
            }
        }

        // Step 3: Java-side safety-net — also include any active+verified boys whose
        //         covers() returns true for this pin (catches whitespace/encoding edge cases)
        if (pin != null && !pin.isBlank()) {
            for (DeliveryBoy b : deliveryBoyRepository.findByActiveTrue()) {
                if (!b.isVerified() || !b.isAdminApproved()) continue;
                if (b.covers(pin.trim()) && seen.add(b.getId())) boys.add(b);
            }
        }

        // Step 4: Last-resort — if still nobody found, show all approved boys
        //         so admin is never completely blocked from assigning
        if (boys.isEmpty()) {
            boys = deliveryBoyRepository.findByActiveTrue().stream()
                    .filter(b -> b.isVerified() && b.isAdminApproved())
                    .collect(java.util.stream.Collectors.toList());
        }

        List<EligibleDeliveryBoyItem> data = new ArrayList<>();
        for (DeliveryBoy b : boys) {
            if (!b.isActive() || !b.isVerified() || !b.isAdminApproved()) continue;
            int active = countActiveOrders(b);
            data.add(new EligibleDeliveryBoyItem(
                    b.getId(),
                    b.getName(),
                    b.getDeliveryBoyCode(),
                    b.getAssignedPinCodes() != null ? b.getAssignedPinCodes() : "",
                    b.getWarehouse() != null ? b.getWarehouse().getName() : "—",
                    b.isAvailable(),
                    active,
                    MAX_CONCURRENT_ORDERS - active,
                    active >= MAX_CONCURRENT_ORDERS));
        }

        return ResponseEntity.ok(EligibleDeliveryBoysResponse.success(data, pin != null ? pin : "N/A"));
    }

    // ── Get delivery boys for a warehouse (AJAX dropdown) ─────────

    public ResponseEntity<WarehouseDeliveryBoysResponse> getDeliveryBoysByWarehouse(
            int warehouseId, HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(403).body(WarehouseDeliveryBoysResponse.failure("Unauthorized"));
        }

        Warehouse wh = warehouseRepository.findById(warehouseId).orElse(null);
        if (wh == null) {
            return ResponseEntity.badRequest().body(WarehouseDeliveryBoysResponse.failure("Warehouse not found"));
        }

        List<DeliveryBoy> boys = deliveryBoyRepository.findByWarehouse(wh);
        List<WarehouseDeliveryBoyItem> data = new ArrayList<>();
        for (DeliveryBoy b : boys) {
            if (!b.isActive() || !b.isVerified() || !b.isAdminApproved()) continue;
            int active = countActiveOrders(b);
            data.add(new WarehouseDeliveryBoyItem(
                    b.getId(),
                    b.getName(),
                    b.getDeliveryBoyCode(),
                    b.getAssignedPinCodes(),
                    b.isAvailable(),
                    active,
                    active >= MAX_CONCURRENT_ORDERS));
        }
        return ResponseEntity.ok(WarehouseDeliveryBoysResponse.success(data));
    }

    // ── Update Delivery Boy PIN Codes ────────────────────────────

    public ResponseEntity<DeliveryBoyPinsUpdateResponse> updateDeliveryBoyPinCodes(
            int deliveryBoyId, String assignedPinCodes, HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(403).body(new DeliveryBoyPinsUpdateResponse(false, "Unauthorized", null, null));
        }

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null) {
            return ResponseEntity.badRequest().body(new DeliveryBoyPinsUpdateResponse(false, "Delivery boy not found", null, null));
        }

        // Update PIN codes
        String pins = assignedPinCodes != null ? assignedPinCodes.trim() : "";
        db.setAssignedPinCodes(pins);
        deliveryBoyRepository.save(db);

        return ResponseEntity.ok(new DeliveryBoyPinsUpdateResponse(true,
            "PIN codes updated for " + db.getName(), assignedPinCodes, pins));
    }

    // ── Verify all delivery boys (make them eligible for assignment) ─

    public ResponseEntity<VerifyDeliveryBoysResponse> verifyAllDeliveryBoys(HttpSession session) {
        if (!isAdmin(session)) {
            return ResponseEntity.status(403).body(new VerifyDeliveryBoysResponse(false, "Unauthorized", 0));
        }

        List<DeliveryBoy> boys = deliveryBoyRepository.findByActiveTrue();
        int updated = 0;
        for (DeliveryBoy b : boys) {
            if (!b.isVerified()) {
                b.setVerified(true);
                deliveryBoyRepository.save(b);
                updated++;
            }
        }

        return ResponseEntity.ok(new VerifyDeliveryBoysResponse(true,
            "Verified " + updated + " delivery boys for assignment eligibility", updated));
    }

    private boolean isAdmin(HttpSession session) {
        return session.getAttribute("admin") != null;
    }
}

