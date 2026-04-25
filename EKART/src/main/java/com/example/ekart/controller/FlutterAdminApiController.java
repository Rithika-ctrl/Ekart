package com.example.ekart.controller;

/**
 * Flutter-compatible REST endpoints for admin/vendor features that previously
 * only existed as session-based web controllers or were fully commented out.
 *
 * All endpoints are under /api/flutter/** (same base as FlutterApiController).
 * Auth: stateless header-based — no HttpSession required.
 *
 * Endpoints provided:
 *   GET  /api/flutter/admin/coupons                         — list all coupons
 *   POST /api/flutter/admin/coupons/create                  — create coupon
 *   POST /api/flutter/admin/coupons/toggle/{id}             — activate/deactivate
 *   POST /api/flutter/admin/coupons/delete/{id}             — delete coupon
 *   GET  /api/flutter/admin/refunds                         — list all refund requests
 *   POST /api/flutter/admin/refunds/{orderId}/process       — approve or reject a refund
 *   GET  /api/flutter/admin/delivery/data                   — pending + active delivery boys
 *                                                             + unassigned orders
 *   POST /api/flutter/admin/delivery/assign                 — assign delivery boy to order
 *   POST /api/flutter/admin/delivery/boy/approve            — approve pending delivery boy
 *   POST /api/flutter/admin/delivery/boy/reject             — reject pending delivery boy
 *   POST /api/flutter/admin/products/approve-all            — approve all pending products
 *   POST /api/flutter/vendor/orders/{id}/mark-ready         — vendor marks order PACKED
 */

import com.example.ekart.dto.*;
import com.example.ekart.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/flutter")
@CrossOrigin(origins = "*")
public class FlutterAdminApiController {

    @Autowired private CouponRepository      couponRepository;
    @Autowired private RefundRepository      refundRepository;
    @Autowired private OrderRepository       orderRepository;
    @Autowired private ProductRepository     productRepository;
    @Autowired private VendorRepository      vendorRepository;
    @Autowired private DeliveryBoyRepository deliveryBoyRepository;

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — COUPON MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /** GET /api/flutter/admin/coupons — returns all coupons, newest first */
    @GetMapping("/admin/coupons")
    public ResponseEntity<Map<String, Object>> adminGetCoupons() {
        Map<String, Object> res = new LinkedHashMap<>();
        List<Map<String, Object>> list = couponRepository.findAllByOrderByIdDesc()
                .stream().map(this::mapCoupon).collect(Collectors.toList());
        res.put("success", true);
        res.put("coupons", list);
        res.put("count", list.size());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/coupons/create
     * Body: { code, description, type (PERCENT|FLAT), value,
     *         minOrderAmount?, maxDiscount?, usageLimit?, expiryDate? (yyyy-MM-dd) }
     */
    @PostMapping("/admin/coupons/create")
    public ResponseEntity<Map<String, Object>> adminCreateCoupon(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            String code = ((String) body.get("code")).toUpperCase().trim();
            if (couponRepository.findByCode(code).isPresent()) {
                res.put("success", false);
                res.put("message", "Coupon code '" + code + "' already exists");
                return ResponseEntity.badRequest().body(res);
            }
            Coupon c = new Coupon();
            c.setCode(code);
            c.setDescription((String) body.getOrDefault("description", ""));
            c.setType(Coupon.CouponType.valueOf(
                    ((String) body.getOrDefault("type", "PERCENT")).toUpperCase()));
            c.setValue(toDouble(body.get("value")));
            c.setMinOrderAmount(toDouble(body.getOrDefault("minOrderAmount", 0)));
            c.setMaxDiscount(toDouble(body.getOrDefault("maxDiscount", 0)));
            c.setUsageLimit(toInt(body.getOrDefault("usageLimit", 0)));
            c.setActive(true);
            Object expiry = body.get("expiryDate");
            if (expiry != null && !expiry.toString().isBlank()) {
                c.setExpiryDate(LocalDate.parse(expiry.toString()));
            }
            couponRepository.save(c);
            res.put("success", true);
            res.put("message", "Coupon '" + code + "' created successfully");
            res.put("coupon", mapCoupon(c));
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Error creating coupon: " + e.getMessage());
            return ResponseEntity.badRequest().body(res);
        }
    }

    /** POST /api/flutter/admin/coupons/toggle/{id} */
    @PostMapping("/admin/coupons/toggle/{id}")
    public ResponseEntity<Map<String, Object>> adminToggleCoupon(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        Coupon c = couponRepository.findById(id).orElse(null);
        if (c == null) {
            res.put("success", false); res.put("message", "Coupon not found");
            return ResponseEntity.badRequest().body(res);
        }
        c.setActive(!c.isActive());
        couponRepository.save(c);
        res.put("success", true);
        res.put("active", c.isActive());
        res.put("message", c.isActive() ? "Coupon activated" : "Coupon deactivated");
        return ResponseEntity.ok(res);
    }

    /** POST /api/flutter/admin/coupons/delete/{id} */
    @PostMapping("/admin/coupons/delete/{id}")
    public ResponseEntity<Map<String, Object>> adminDeleteCoupon(@PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();
        if (!couponRepository.existsById(id)) {
            res.put("success", false); res.put("message", "Coupon not found");
            return ResponseEntity.badRequest().body(res);
        }
        couponRepository.deleteById(id);
        res.put("success", true);
        res.put("message", "Coupon deleted successfully");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — REFUND MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /** GET /api/flutter/admin/refunds — all refund requests, newest first */
    @GetMapping("/admin/refunds")
    public ResponseEntity<Map<String, Object>> adminGetRefunds() {
        Map<String, Object> res = new LinkedHashMap<>();
        List<Map<String, Object>> list = refundRepository.findAllByOrderByRequestedAtDesc()
                .stream().map(this::mapRefund).collect(Collectors.toList());
        res.put("success", true);
        res.put("refunds", list);
        res.put("count", list.size());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/refunds/{orderId}/process
     * Body: { action: "approve" | "reject", reason?: "..." }
     */
    @PostMapping("/admin/refunds/{orderId}/process")
    public ResponseEntity<Map<String, Object>> adminProcessRefund(
            @PathVariable int orderId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> res = new LinkedHashMap<>();
        try {
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                res.put("success", false); res.put("message", "Order not found");
                return ResponseEntity.badRequest().body(res);
            }
            Refund refund = refundRepository.findByOrder(order).stream()
                    .filter(r -> r.getStatus() == RefundStatus.PENDING)
                    .findFirst().orElse(null);
            if (refund == null) {
                res.put("success", false);
                res.put("message", "No pending refund found for this order");
                return ResponseEntity.badRequest().body(res);
            }
            String action = (String) body.getOrDefault("action", "");
            String reason = (String) body.getOrDefault("reason", "");
            if ("approve".equalsIgnoreCase(action)) {
                refund.setStatus(RefundStatus.APPROVED);
                order.setTrackingStatus(TrackingStatus.REFUNDED);
                orderRepository.save(order);
            } else if ("reject".equalsIgnoreCase(action)) {
                refund.setStatus(RefundStatus.REJECTED);
                refund.setRejectionReason(reason);
            } else {
                res.put("success", false);
                res.put("message", "Invalid action. Use 'approve' or 'reject'");
                return ResponseEntity.badRequest().body(res);
            }
            refund.setProcessedAt(LocalDateTime.now());
            refund.setProcessedBy("Admin");
            refundRepository.save(refund);
            res.put("success", true);
            res.put("message", "Refund " + action + "d successfully");
            res.put("refund", mapRefund(refund));
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("success", false);
            res.put("message", "Error processing refund: " + e.getMessage());
            return ResponseEntity.badRequest().body(res);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — DELIVERY DATA
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/flutter/admin/delivery/data
     *
     * Previously this endpoint only existed as a commented-out stub.
     * The Flutter admin delivery screen hit this endpoint and always got 404,
     * making the entire delivery management tab non-functional.
     *
     * Returns:
     *   pendingApproval  — delivery boys registered but not yet admin-approved
     *   activeDeliveryBoys — approved + active boys
     *   unassignedOrders — PACKED/SHIPPED orders with no delivery boy assigned
     */
    @GetMapping("/admin/delivery/data")
    public ResponseEntity<Map<String, Object>> adminGetDeliveryData() {
        Map<String, Object> res = new LinkedHashMap<>();

        List<Map<String, Object>> pending = deliveryBoyRepository
                .findByAdminApprovedFalseAndVerifiedTrue()
                .stream().map(this::mapDeliveryBoy).collect(Collectors.toList());

        List<Map<String, Object>> active = deliveryBoyRepository.findByActiveTrue()
                .stream()
                .filter(DeliveryBoy::isAdminApproved)
                .map(this::mapDeliveryBoy)
                .collect(Collectors.toList());

        List<Map<String, Object>> unassignedOrders = orderRepository.findAll()
                .stream()
                .filter(o -> (o.getTrackingStatus() == TrackingStatus.PACKED
                           || o.getTrackingStatus() == TrackingStatus.SHIPPED)
                          && o.getDeliveryBoy() == null)
                .sorted(Comparator.comparingInt(Order::getId).reversed())
                .map(o -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",                   o.getId());
                    m.put("trackingStatus",        o.getTrackingStatus().name());
                    m.put("trackingStatusDisplay", o.getTrackingStatus().getDisplayName());
                    m.put("totalPrice",            o.getTotalPrice());
                    m.put("currentCity",           o.getCurrentCity() != null ? o.getCurrentCity() : "");
                    if (o.getCustomer() != null) {
                        m.put("customerName",  o.getCustomer().getName());
                        m.put("customerEmail", o.getCustomer().getEmail());
                        m.put("customerPhone", o.getCustomer().getMobile());
                    }
                    return m;
                }).collect(Collectors.toList());

        res.put("success",            true);
        res.put("pendingApproval",    pending);
        res.put("pendingCount",       pending.size());
        res.put("activeDeliveryBoys", active);
        res.put("activeCount",        active.size());
        res.put("unassignedOrders",   unassignedOrders);
        res.put("unassignedCount",    unassignedOrders.size());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/delivery/assign
     * Params: orderId, deliveryBoyId
     *
     * Assigns a delivery boy to an order and transitions PACKED → SHIPPED.
     * Previously the Flutter admin used the session-gated web route which
     * returned HTTP 302 to the login page.
     */
    @PostMapping("/admin/delivery/assign")
    public ResponseEntity<Map<String, Object>> adminAssignDeliveryBoy(
            @RequestParam int orderId,
            @RequestParam int deliveryBoyId) {
        Map<String, Object> res = new LinkedHashMap<>();

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            res.put("success", false); res.put("message", "Order not found");
            return ResponseEntity.badRequest().body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.PACKED) {
            res.put("success", false);
            res.put("message", "Order must be PACKED before assigning a delivery boy. Current status: "
                    + order.getTrackingStatus().getDisplayName());
            return ResponseEntity.badRequest().body(res);
        }

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null || !db.isActive() || !db.isVerified() || !db.isAdminApproved()) {
            res.put("success", false);
            res.put("message", "Delivery boy not found or not active/approved");
            return ResponseEntity.badRequest().body(res);
        }

        order.setDeliveryBoy(db);
        order.setTrackingStatus(TrackingStatus.SHIPPED);
        order.setCurrentCity(db.getWarehouse() != null
                ? db.getWarehouse().getCity() : "In transit");
        orderRepository.save(order);

        res.put("success",        true);
        res.put("message",        "Order #" + orderId + " assigned to " + db.getName());
        res.put("trackingStatus", order.getTrackingStatus().name());
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/delivery/boy/approve
     * Params: deliveryBoyId, assignedPinCodes (optional)
     *
     * Approves a pending delivery boy.
     * Previously the Flutter admin used the session-gated web route.
     */
    @PostMapping("/admin/delivery/boy/approve")
    public ResponseEntity<Map<String, Object>> adminApproveDeliveryBoy(
            @RequestParam int deliveryBoyId,
            @RequestParam(required = false, defaultValue = "") String assignedPinCodes) {
        Map<String, Object> res = new LinkedHashMap<>();

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null) {
            res.put("success", false); res.put("message", "Delivery boy not found");
            return ResponseEntity.badRequest().body(res);
        }
        if (db.isAdminApproved()) {
            res.put("success", false); res.put("message", "Already approved");
            return ResponseEntity.badRequest().body(res);
        }

        db.setAdminApproved(true);
        db.setActive(true);
        if (!assignedPinCodes.isBlank()) {
            db.setAssignedPinCodes(assignedPinCodes.trim());
        }
        deliveryBoyRepository.save(db);

        res.put("success", true);
        res.put("message", db.getName() + " approved successfully");
        res.put("deliveryBoy", mapDeliveryBoy(db));
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/flutter/admin/delivery/boy/reject
     * Params: deliveryBoyId, reason (optional)
     *
     * Rejects and removes a pending delivery boy registration.
     */
    @PostMapping("/admin/delivery/boy/reject")
    public ResponseEntity<Map<String, Object>> adminRejectDeliveryBoy(
            @RequestParam int deliveryBoyId,
            @RequestParam(required = false, defaultValue = "") String reason) {
        Map<String, Object> res = new LinkedHashMap<>();

        DeliveryBoy db = deliveryBoyRepository.findById(deliveryBoyId).orElse(null);
        if (db == null) {
            res.put("success", false); res.put("message", "Delivery boy not found");
            return ResponseEntity.badRequest().body(res);
        }

        String name = db.getName();
        deliveryBoyRepository.delete(db);

        res.put("success", true);
        res.put("message", name + "'s registration rejected"
                + (reason.isBlank() ? "" : ": " + reason));
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — APPROVE ALL PENDING PRODUCTS
    // ═══════════════════════════════════════════════════════════════

    /** POST /api/flutter/admin/products/approve-all */
    @PostMapping("/admin/products/approve-all")
    public ResponseEntity<Map<String, Object>> adminApproveAllProducts() {
        Map<String, Object> res = new LinkedHashMap<>();
        List<Product> pending = productRepository.findAll()
                .stream().filter(p -> !p.isApproved()).collect(Collectors.toList());
        pending.forEach(p -> p.setApproved(true));
        productRepository.saveAll(pending);
        res.put("success",       true);
        res.put("approvedCount", pending.size());
        res.put("message",       "Approved " + pending.size() + " product(s) successfully");
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════════════
    // VENDOR — MARK ORDER AS PACKED
    // ═══════════════════════════════════════════════════════════════

    /**
     * POST /api/flutter/vendor/orders/{id}/mark-ready
     * Header: X-Vendor-Id: <id>
     * Transitions PROCESSING → PACKED.
     */
    @PostMapping("/vendor/orders/{id}/mark-ready")
    public ResponseEntity<Map<String, Object>> vendorMarkOrderReady(
            @RequestHeader("X-Vendor-Id") int vendorId,
            @PathVariable int id) {
        Map<String, Object> res = new LinkedHashMap<>();

        Vendor vendor = vendorRepository.findById(vendorId).orElse(null);
        if (vendor == null) {
            res.put("success", false); res.put("message", "Vendor not found");
            return ResponseEntity.badRequest().body(res);
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            res.put("success", false); res.put("message", "Order not found");
            return ResponseEntity.badRequest().body(res);
        }
        if (order.getTrackingStatus() != TrackingStatus.PROCESSING) {
            res.put("success", false);
            res.put("message", "Order is already "
                    + order.getTrackingStatus().getDisplayName()
                    + " — cannot mark ready again");
            return ResponseEntity.badRequest().body(res);
        }

        order.setTrackingStatus(TrackingStatus.PACKED);
        orderRepository.save(order);

        res.put("success",        true);
        res.put("message",        "Order #" + id + " marked as Packed — ready for delivery pickup");
        res.put("trackingStatus", order.getTrackingStatus().name());
        return ResponseEntity.ok(res);
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE MAPPERS
    // ═══════════════════════════════════════════════════════════════

    private Map<String, Object> mapCoupon(Coupon c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            c.getId());
        m.put("code",          c.getCode());
        m.put("description",   c.getDescription());
        m.put("type",          c.getType().name());
        m.put("typeLabel",     c.getTypeLabel());
        m.put("value",         c.getValue());
        m.put("minOrderAmount", c.getMinOrderAmount());
        m.put("maxDiscount",   c.getMaxDiscount());
        m.put("usageLimit",    c.getUsageLimit());
        m.put("usedCount",     c.getUsedCount());
        m.put("active",        c.isActive());
        m.put("valid",         c.isValid());
        m.put("expiryDate",    c.getExpiryDate() != null ? c.getExpiryDate().toString() : null);
        return m;
    }

    private Map<String, Object> mapRefund(Refund r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",              r.getId());
        m.put("orderId",         r.getOrder()    != null ? r.getOrder().getId()       : null);
        m.put("orderAmount",     r.getOrder()    != null ? r.getOrder().getTotalPrice() : 0);
        m.put("amount",          r.getAmount());
        m.put("reason",          r.getReason());
        m.put("status",          r.getStatus().name());
        m.put("statusDisplay",   r.getStatus().getDisplayName());
        m.put("rejectionReason", r.getRejectionReason());
        m.put("requestedAt",     r.getRequestedAt() != null ? r.getRequestedAt().toString() : null);
        m.put("processedAt",     r.getProcessedAt() != null ? r.getProcessedAt().toString() : null);
        if (r.getCustomer() != null) {
            m.put("customerName",  r.getCustomer().getName());
            m.put("customerEmail", r.getCustomer().getEmail());
        }
        return m;
    }

    private Map<String, Object> mapDeliveryBoy(DeliveryBoy d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",              d.getId());
        m.put("name",            d.getName());
        m.put("email",           d.getEmail());
        m.put("mobile",          d.getMobile());
        m.put("deliveryBoyCode", d.getDeliveryBoyCode() != null ? d.getDeliveryBoyCode() : "");
        m.put("adminApproved",   d.isAdminApproved());
        m.put("active",          d.isActive());
        m.put("verified",        d.isVerified());
        m.put("assignedPinCodes", d.getAssignedPinCodes() != null ? d.getAssignedPinCodes() : "");
        if (d.getWarehouse() != null) {
            m.put("warehouseId",   d.getWarehouse().getId());
            m.put("warehouseName", d.getWarehouse().getName());
            m.put("warehouseCity", d.getWarehouse().getCity());
        } else {
            m.put("warehouseId",   null);
            m.put("warehouseName", "Not assigned");
            m.put("warehouseCity", "");
        }
        return m;
    }

    // ── Null-safe type coercions ─────────────────────────────────────────────

    private double toDouble(Object v) {
        if (v == null) return 0.0;
        try { return Double.parseDouble(v.toString()); }
        catch (NumberFormatException e) { return 0.0; }
    }

    private int toInt(Object v) {
        if (v == null) return 0;
        try { return Integer.parseInt(v.toString().replaceAll("\\..*", "")); }
        catch (NumberFormatException e) { return 0; }
    }
}
