package com.example.ekart.service;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/service/DeliveryAdminService.java
// REPLACE your existing file.
// Changes from previous version:
//   1. loadDeliveryManagement() now also passes pendingApprovals to template
//   2. registerDeliveryBoy() now sets adminApproved=true immediately
//      (admin-created accounts don't need approval)
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

@Service
@Transactional
public class DeliveryAdminService {

    @Autowired private OrderRepository            orderRepository;
    @Autowired private WarehouseRepository        warehouseRepository;
    @Autowired private DeliveryBoyRepository      deliveryBoyRepository;
    @Autowired private TrackingEventLogRepository trackingEventLogRepository;
    @Autowired private EmailSender                emailSender;
    @Autowired private DeliveryBoyService         deliveryBoyService;

    // ── Load delivery management page ────────────────────────────

    public String loadDeliveryManagement(HttpSession session, ModelMap map) {
        if (!isAdmin(session)) return "redirect:/admin/login";

        List<Order>       packedOrders    = orderRepository.findByTrackingStatus(TrackingStatus.PACKED);
        List<Order>       shippedOrders   = orderRepository.findByTrackingStatus(TrackingStatus.SHIPPED);
        List<Order>       outOrders       = orderRepository.findByTrackingStatus(TrackingStatus.OUT_FOR_DELIVERY);
        List<Warehouse>   warehouses      = warehouseRepository.findByActiveTrue();
        List<DeliveryBoy> deliveryBoys    = deliveryBoyRepository.findByActiveTrue();

        // NEW: self-registered accounts waiting for admin approval
        List<DeliveryBoy> pendingApprovals = deliveryBoyService.getPendingApprovals();

        map.put("packedOrders",     packedOrders);
        map.put("shippedOrders",    shippedOrders);
        map.put("outOrders",        outOrders);
        map.put("warehouses",       warehouses);
        map.put("deliveryBoys",     deliveryBoys);
        map.put("pendingApprovals", pendingApprovals);
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
        db.setAdminApproved(true);  // admin-created = pre-approved
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

    // ── Assign delivery boy to order ─────────────────────────────

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

        order.setDeliveryBoy(db);
        order.setTrackingStatus(TrackingStatus.SHIPPED);
        order.setCurrentCity(db.getWarehouse() != null ? db.getWarehouse().getCity() : "In transit");
        orderRepository.save(order);

        String city = db.getWarehouse() != null ? db.getWarehouse().getCity() : "Warehouse";
        trackingEventLogRepository.save(new TrackingEventLog(
            order, TrackingStatus.SHIPPED, city,
            "Assigned to delivery boy: " + db.getName() + " (" + db.getDeliveryBoyCode() + ")",
            "admin"));

        try { emailSender.sendShippedEmail(order.getCustomer(), order, db.getName()); }
        catch (Exception e) { System.err.println("Shipped email failed: " + e.getMessage()); }

        res.put("success", true);
        res.put("message", "Order #" + orderId + " assigned to " + db.getName());
        return ResponseEntity.ok(res);
    }

    // ── Get ELIGIBLE delivery boys for an order (filtered by order's pin code) ──

    /**
     * Returns only delivery boys whose assignedPinCodes covers the order's
     * deliveryPinCode. This replaces the old warehouse-based dropdown.
     * Called via GET /admin/delivery/boys/for-order/{orderId}
     */
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

        // ── Step 1: boys with explicit pin assignment covering this pin ──────
        List<DeliveryBoy> boys = new ArrayList<>();
        if (pin != null && !pin.isBlank()) {
            boys = deliveryBoyRepository.findByPinCode(pin.trim());
        }

        // ── Step 2: if no explicit-pin boys found, fall back to warehouse ─────
        // A delivery boy whose warehouse.servedPinCodes covers this pin
        // but who hasn't been given explicit assignedPinCodes yet is still eligible.
        if (boys.isEmpty()) {
            Warehouse orderWarehouse = order.getWarehouse();
            if (orderWarehouse == null && pin != null && !pin.isBlank()) {
                // Try to resolve the warehouse from the pin (handles old orders with no warehouse set)
                List<Warehouse> whs = warehouseRepository.findByPinCode(pin.trim());
                if (!whs.isEmpty()) orderWarehouse = whs.get(0);
            }
            if (orderWarehouse != null) {
                boys = deliveryBoyRepository.findActiveByWarehouse(orderWarehouse);
            } else {
                // Last resort — all active approved boys
                boys = deliveryBoyRepository.findByActiveTrue().stream()
                        .filter(b -> b.isVerified() && b.isAdminApproved())
                        .collect(java.util.stream.Collectors.toList());
            }
        }

        List<Map<String, Object>> data = new ArrayList<>();
        for (DeliveryBoy b : boys) {
            if (!b.isActive() || !b.isVerified() || !b.isAdminApproved()) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",        b.getId());
            m.put("name",      b.getName());
            m.put("code",      b.getDeliveryBoyCode());
            m.put("pins",      b.getAssignedPinCodes() != null ? b.getAssignedPinCodes() : "");
            m.put("warehouse", b.getWarehouse() != null ? b.getWarehouse().getName() : "—");
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
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",   b.getId());
            m.put("name", b.getName());
            m.put("code", b.getDeliveryBoyCode());
            m.put("pins", b.getAssignedPinCodes());
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