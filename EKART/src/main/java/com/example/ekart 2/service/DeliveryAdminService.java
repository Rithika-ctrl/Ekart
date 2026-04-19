package com.example.ekart.service;

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
import java.util.stream.Collectors;

@Service
@Transactional
public class DeliveryAdminService {

    @Autowired private OrderRepository            orderRepository;
    @Autowired private WarehouseRepository        warehouseRepository;
    @Autowired private DeliveryBoyRepository      deliveryBoyRepository;
    @Autowired private TrackingEventLogRepository trackingEventLogRepository;
    @Autowired private AutoAssignLogRepository    autoAssignLogRepository;
    @Autowired private EmailSender                emailSender;
    @Autowired private DeliveryBoyService         deliveryBoyService;

    // Constants (from removed AutoAssignmentService)
    private static final int MAX_CONCURRENT_ORDERS = 3;

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

    public ResponseEntity<Map<String, Object>> addWarehouse(String name, String city,
                                                              String state, String servedPinCodes,
                                                              HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!isAdmin(session)) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }
        if (name == null || name.isBlank()) {
            res.put("success", false); res.put("message", "Warehouse name is required");
            return ResponseEntity.badRequest().body(res);
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

        res.put("success", true);
        res.put("message", "Warehouse '" + name + "' added (" + wh.getWarehouseCode() + ")");
        res.put("warehouseId", wh.getId());
        return ResponseEntity.ok(res);
    }

    // ── Admin creates delivery boy (immediately approved) ─────────

    public ResponseEntity<Map<String, Object>> registerDeliveryBoy(
            String name, String email, long mobile,
            String password, String confirmPassword,
            int warehouseId, String assignedPinCodes,
            HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        if (!isAdmin(session)) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }

        if (name == null || name.trim().length() < 3) {
            res.put("success", false); res.put("message", "Name must be at least 3 characters");
            return ResponseEntity.badRequest().body(res);
        }
        if (email == null || !email.contains("@")) {
            res.put("success", false); res.put("message", "Enter a valid email");
            return ResponseEntity.badRequest().body(res);
        }
        if (deliveryBoyRepository.existsByEmail(email)) {
            res.put("success", false); res.put("message", "Email already registered");
            return ResponseEntity.badRequest().body(res);
        }
        if (password == null || confirmPassword == null || !password.equals(confirmPassword)) {
            res.put("success", false); res.put("message", "Passwords do not match");
            return ResponseEntity.badRequest().body(res);
        }
        String passwordRegex = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";
        if (password == null || !password.matches(passwordRegex)) {
            res.put("success", false); res.put("message", "Password must be at least 8 characters and include uppercase, lowercase, number and special character");
            return ResponseEntity.badRequest().body(res);
        }

        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        if (warehouse == null) {
            res.put("success", false); res.put("message", "Warehouse not found");
            return ResponseEntity.badRequest().body(res);
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
            System.err.println("Delivery boy OTP email failed: " + e.getMessage());
        }

        res.put("success", true);
        res.put("message", "Delivery boy registered. OTP sent to " + email);
        res.put("deliveryBoyId", db.getId());
        return ResponseEntity.ok(res);
    }

    // ── Assign delivery boy to order (MANUAL OVERRIDE by admin) ──
    //   Admin can manually assign regardless of auto-assign state.
    //   Cap check is advisory — admin can override.

    public ResponseEntity<Map<String, Object>> assignDeliveryBoy(int orderId,
                                                                    int deliveryBoyId,
                                                                    HttpSession session) {
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
        if (order.getTrackingStatus() != TrackingStatus.PACKED) {
            res.put("success", false);
            res.put("message", "Order must be PACKED before assigning. Current: "
                    + order.getTrackingStatus().getDisplayName());
            return ResponseEntity.badRequest().body(res);
        }

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null || !db.isActive() || !db.isVerified() || !db.isAdminApproved()) {
            res.put("success", false); res.put("message", "Delivery boy not found or not active");
            return ResponseEntity.badRequest().body(res);
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
        catch (Exception e) { System.err.println("Shipped email failed: " + e.getMessage()); }

        res.put("success", true);
        res.put("message", "Order #" + orderId + " assigned to " + db.getName()
            + (overCap ? " (note: over 3-order cap)" : ""));
        res.put("wasOverCap", overCap);
        return ResponseEntity.ok(res);
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

    public ResponseEntity<Map<String, Object>> getAutoAssignLogs(HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!isAdmin(session)) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }

        List<AutoAssignLog> logs = autoAssignLogRepository.findTop50ByOrderByAssignedAtDesc();
        List<Map<String, Object>> data = new ArrayList<>();
        for (AutoAssignLog log : logs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",                           log.getId());
            m.put("orderId",                      log.getOrderId());
            m.put("deliveryBoyName",              log.getDeliveryBoy() != null ? log.getDeliveryBoy().getName() : "N/A");
            m.put("deliveryBoyCode",              log.getDeliveryBoy() != null ? log.getDeliveryBoy().getDeliveryBoyCode() : "N/A");
            m.put("pinCode",                      log.getPinCode());
            m.put("assignedAt",                   log.getAssignedAt() != null ? log.getAssignedAt().toString() : null);
            m.put("activeOrdersAtAssignment",     log.getActiveOrdersAtAssignment());
            m.put("maxConcurrent",                MAX_CONCURRENT_ORDERS);
            data.add(m);
        }

        res.put("success", true);
        res.put("logs", data);
        res.put("maxConcurrent", MAX_CONCURRENT_ORDERS);
        return ResponseEntity.ok(res);
    }

    // ── Admin API: Get delivery boy load (active orders count) ────

    public ResponseEntity<Map<String, Object>> getDeliveryBoyLoad(HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!isAdmin(session)) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }

        List<DeliveryBoy> boys = deliveryBoyRepository.findByActiveTrue();
        List<Map<String, Object>> data = new ArrayList<>();
        for (DeliveryBoy db : boys) {
            if (!db.isVerified() || !db.isAdminApproved()) continue;
            int active = countActiveOrders(db);
            int maxConcurrent = MAX_CONCURRENT_ORDERS;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           db.getId());
            m.put("name",         db.getName());
            m.put("code",         db.getDeliveryBoyCode());
            m.put("isOnline",     db.isAvailable());
            m.put("activeOrders", active);
            m.put("slots",        maxConcurrent - active);
            m.put("maxConcurrent", maxConcurrent);
            m.put("atCap",        active >= maxConcurrent);
            m.put("pins",         db.getAssignedPinCodes());
            m.put("warehouse",    db.getWarehouse() != null ? db.getWarehouse().getName() : "—");
            data.add(m);
        }

        res.put("success", true);
        res.put("deliveryBoys", data);
        res.put("maxConcurrent", MAX_CONCURRENT_ORDERS);
        return ResponseEntity.ok(res);
    }

    // ── Get ELIGIBLE delivery boys for an order ─────────────────;

    public ResponseEntity<Map<String, Object>> getEligibleDeliveryBoys(int orderId,
                                                                         HttpSession session) {
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

        List<Map<String, Object>> data = new ArrayList<>();
        for (DeliveryBoy b : boys) {
            if (!b.isActive() || !b.isVerified() || !b.isAdminApproved()) continue;
            int active = countActiveOrders(b);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           b.getId());
            m.put("name",         b.getName());
            m.put("code",         b.getDeliveryBoyCode());
            m.put("pins",         b.getAssignedPinCodes() != null ? b.getAssignedPinCodes() : "");
            m.put("warehouse",    b.getWarehouse() != null ? b.getWarehouse().getName() : "—");
            m.put("isAvailable",  b.isAvailable());
            m.put("activeOrders", active);
            m.put("slots",        MAX_CONCURRENT_ORDERS - active);
            m.put("atCap",        active >= MAX_CONCURRENT_ORDERS);
            data.add(m);
        }

        res.put("success", true);
        res.put("deliveryBoys", data);
        res.put("orderPin", pin != null ? pin : "N/A");
        return ResponseEntity.ok(res);
    }

    // ── Get delivery boys for a warehouse (AJAX dropdown) ─────────

    public ResponseEntity<Map<String, Object>> getDeliveryBoysByWarehouse(
            int warehouseId, HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!isAdmin(session)) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }

        Warehouse wh = warehouseRepository.findById(warehouseId).orElse(null);
        if (wh == null) {
            res.put("success", false); res.put("message", "Warehouse not found");
            return ResponseEntity.badRequest().body(res);
        }

        List<DeliveryBoy> boys = deliveryBoyRepository.findByWarehouse(wh);
        List<Map<String, Object>> data = new ArrayList<>();
        for (DeliveryBoy b : boys) {
            if (!b.isActive() || !b.isVerified() || !b.isAdminApproved()) continue;
            int active = countActiveOrders(b);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           b.getId());
            m.put("name",         b.getName());
            m.put("code",         b.getDeliveryBoyCode());
            m.put("pins",         b.getAssignedPinCodes());
            m.put("isAvailable",  b.isAvailable());
            m.put("activeOrders", active);
            m.put("atCap",        active >= MAX_CONCURRENT_ORDERS);
            data.add(m);
        }
        res.put("success", true);
        res.put("deliveryBoys", data);
        return ResponseEntity.ok(res);
    }

    // ── Update Delivery Boy PIN Codes ────────────────────────────

    public ResponseEntity<Map<String, Object>> updateDeliveryBoyPinCodes(
            int deliveryBoyId, String assignedPinCodes, HttpSession session) {

        Map<String, Object> res = new LinkedHashMap<>();
        if (!isAdmin(session)) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
        }

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null) {
            res.put("success", false); res.put("message", "Delivery boy not found");
            return ResponseEntity.badRequest().body(res);
        }

        // Update PIN codes
        String pins = assignedPinCodes != null ? assignedPinCodes.trim() : "";
        db.setAssignedPinCodes(pins);
        deliveryBoyRepository.save(db);

        res.put("success", true);
        res.put("message", "PIN codes updated for " + db.getName());
        res.put("oldPins", assignedPinCodes);
        res.put("newPins", pins);
        return ResponseEntity.ok(res);
    }

    // ── Verify all delivery boys (make them eligible for assignment) ─

    public ResponseEntity<Map<String, Object>> verifyAllDeliveryBoys(HttpSession session) {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!isAdmin(session)) {
            res.put("success", false); res.put("message", "Unauthorized");
            return ResponseEntity.status(403).body(res);
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

        res.put("success", true);
        res.put("message", "Verified " + updated + " delivery boys for assignment eligibility");
        res.put("updated", updated);
        return ResponseEntity.ok(res);
    }

    private boolean isAdmin(HttpSession session) {
        return session.getAttribute("admin") != null;
    }
}