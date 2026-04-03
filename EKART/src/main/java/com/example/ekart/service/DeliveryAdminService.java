package com.example.ekart.service;

// ================================================================
// UPDATED FILE: src/main/java/com/example/ekart/service/DeliveryAdminService.java
// REPLACE your existing DeliveryAdminService.java with this.
//
// Changes from previous version:
//   1. loadDeliveryManagement() — now includes auto-assign stats per delivery boy
//   2. assignDeliveryBoy() — admin manual override still works as before
//   3. NEW: getAutoAssignLogs() — admin can see all auto-assignment history
//   4. NEW: getDeliveryBoyLoadMap() — admin sees each boy's active order count
//   5. markOrderPacked() — triggers auto-assign after status change
//   6. AutoAssignmentService is wired in for all three triggers
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
    @Autowired private AutoAssignmentService      autoAssignmentService;

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
            activeOrderCounts.put(db.getId(), autoAssignmentService.countActiveOrders(db));
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
        map.put("maxConcurrent",      AutoAssignmentService.MAX_CONCURRENT_ORDERS);

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
        if (!password.equals(confirmPassword)) {
            res.put("success", false); res.put("message", "Passwords do not match");
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
        db.setVerified(false);
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

        int activeCount = autoAssignmentService.countActiveOrders(db);
        boolean overCap = activeCount >= AutoAssignmentService.MAX_CONCURRENT_ORDERS;

        order.setDeliveryBoy(db);
        order.setTrackingStatus(TrackingStatus.SHIPPED);
        String city = db.getWarehouse() != null ? db.getWarehouse().getCity() : "In transit";
        order.setCurrentCity(city);
        orderRepository.save(order);

        String note = overCap
            ? "[ADMIN OVERRIDE] Manually assigned to " + db.getName()
              + " (" + db.getDeliveryBoyCode() + "). Note: over cap (" + activeCount + "/" + AutoAssignmentService.MAX_CONCURRENT_ORDERS + ")"
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

        // 🔑 TRIGGER AUTO-ASSIGN
        autoAssignmentService.onOrderPacked(order);

        // Re-fetch to check if auto-assign succeeded
        Order refreshed = orderRepository.findById(orderId).orElse(order);
        boolean autoAssigned = refreshed.getDeliveryBoy() != null;

        res.put("success", true);
        if (autoAssigned) {
            res.put("message", "Order #" + orderId + " marked as PACKED and automatically assigned to "
                + refreshed.getDeliveryBoy().getName());
            res.put("autoAssigned", true);
            res.put("assignedTo", refreshed.getDeliveryBoy().getName());
        } else {
            res.put("message", "Order #" + orderId + " marked as PACKED. No eligible delivery boys online — assign manually.");
            res.put("autoAssigned", false);
        }
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
            m.put("orderId",         log.getOrderId());
            m.put("deliveryBoyName", log.getDeliveryBoy() != null ? log.getDeliveryBoy().getName() : "N/A");
            m.put("deliveryBoyCode", log.getDeliveryBoy() != null ? log.getDeliveryBoy().getDeliveryBoyCode() : "N/A");
            m.put("pinCode",         log.getPinCode());
            m.put("assignedAt",      log.getAssignedAt().toString());
            m.put("activeAtTime",    log.getActiveOrdersAtAssignment());
            data.add(m);
        }

        res.put("success", true);
        res.put("logs", data);
        res.put("maxConcurrent", AutoAssignmentService.MAX_CONCURRENT_ORDERS);
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
            int active = autoAssignmentService.countActiveOrders(db);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           db.getId());
            m.put("name",         db.getName());
            m.put("code",         db.getDeliveryBoyCode());
            m.put("isOnline",     db.isAvailable());
            m.put("activeOrders", active);
            m.put("slots",        AutoAssignmentService.MAX_CONCURRENT_ORDERS - active);
            m.put("atCap",        active >= AutoAssignmentService.MAX_CONCURRENT_ORDERS);
            m.put("pins",         db.getAssignedPinCodes());
            m.put("warehouse",    db.getWarehouse() != null ? db.getWarehouse().getName() : "—");
            data.add(m);
        }

        res.put("success", true);
        res.put("deliveryBoys", data);
        res.put("maxConcurrent", AutoAssignmentService.MAX_CONCURRENT_ORDERS);
        return ResponseEntity.ok(res);
    }

    // ── Get ELIGIBLE delivery boys for an order ───────────────────

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

        List<DeliveryBoy> boys = new ArrayList<>();
        if (pin != null && !pin.isBlank()) {
            boys = deliveryBoyRepository.findByPinCode(pin.trim());
        }

        if (boys.isEmpty()) {
            Warehouse orderWarehouse = order.getWarehouse();
            if (orderWarehouse == null && pin != null && !pin.isBlank()) {
                List<Warehouse> whs = warehouseRepository.findByPinCode(pin.trim());
                if (!whs.isEmpty()) orderWarehouse = whs.get(0);
            }
            if (orderWarehouse != null) {
                boys = deliveryBoyRepository.findActiveByWarehouse(orderWarehouse);
            } else {
                boys = deliveryBoyRepository.findByActiveTrue().stream()
                        .filter(b -> b.isVerified() && b.isAdminApproved())
                        .collect(java.util.stream.Collectors.toList());
            }
        }

        List<Map<String, Object>> data = new ArrayList<>();
        for (DeliveryBoy b : boys) {
            if (!b.isActive() || !b.isVerified() || !b.isAdminApproved()) continue;
            int active = autoAssignmentService.countActiveOrders(b);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           b.getId());
            m.put("name",         b.getName());
            m.put("code",         b.getDeliveryBoyCode());
            m.put("pins",         b.getAssignedPinCodes() != null ? b.getAssignedPinCodes() : "");
            m.put("warehouse",    b.getWarehouse() != null ? b.getWarehouse().getName() : "—");
            m.put("isAvailable",  b.isAvailable());
            m.put("activeOrders", active);
            m.put("slots",        AutoAssignmentService.MAX_CONCURRENT_ORDERS - active);
            m.put("atCap",        active >= AutoAssignmentService.MAX_CONCURRENT_ORDERS);
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
            int active = autoAssignmentService.countActiveOrders(b);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           b.getId());
            m.put("name",         b.getName());
            m.put("code",         b.getDeliveryBoyCode());
            m.put("pins",         b.getAssignedPinCodes());
            m.put("isAvailable",  b.isAvailable());
            m.put("activeOrders", active);
            m.put("atCap",        active >= AutoAssignmentService.MAX_CONCURRENT_ORDERS);
            data.add(m);
        }
        res.put("success", true);
        res.put("deliveryBoys", data);
        return ResponseEntity.ok(res);
    }

    private boolean isAdmin(HttpSession session) {
        return session.getAttribute("admin") != null;
    }
}