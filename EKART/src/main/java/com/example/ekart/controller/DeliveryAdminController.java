package com.example.ekart.controller;

// ================================================================
// UPDATED FILE: src/main/java/com/example/ekart/controller/DeliveryAdminController.java
// REPLACE your existing file.
//
// New endpoints added:
//   POST /admin/delivery/order/pack       → mark order as PACKED (triggers auto-assign)
//   GET  /admin/delivery/auto-assign/logs → view auto-assignment history
//   GET  /admin/delivery/boys/load        → view delivery boy load (active orders count)
// ================================================================

import com.example.ekart.service.DeliveryAdminService;
import com.example.ekart.service.DeliveryBoyService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Controller
public class DeliveryAdminController {

    @Autowired private DeliveryAdminService deliveryAdminService;
    @Autowired private DeliveryBoyService   deliveryBoyService;

    // ── Pages ─────────────────────────────────────────────────────

    @GetMapping("/admin/delivery")
    public String deliveryManagement(HttpSession session, ModelMap map) {
        return deliveryAdminService.loadDeliveryManagement(session, map);
    }

    @GetMapping("/admin/warehouses")
    public String warehouseManagement(HttpSession session, ModelMap map) {
        return deliveryAdminService.loadWarehousePage(session, map);
    }

    // ── Warehouse ─────────────────────────────────────────────────

    @PostMapping("/admin/delivery/warehouse")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> addWarehouse(
            @RequestParam String name, @RequestParam String city,
            @RequestParam String state, @RequestParam String servedPinCodes,
            HttpSession session) {
        return deliveryAdminService.addWarehouse(name, city, state, servedPinCodes, session);
    }

    // ── Delivery Boy Management ───────────────────────────────────

    @PostMapping("/admin/delivery/boy/register")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> registerDeliveryBoy(
            @RequestParam String name, @RequestParam String email,
            @RequestParam long mobile, @RequestParam String password,
            @RequestParam String confirmPassword, @RequestParam int warehouseId,
            @RequestParam(required = false, defaultValue = "") String assignedPinCodes,
            HttpSession session) {
        return deliveryAdminService.registerDeliveryBoy(
                name, email, mobile, password, confirmPassword,
                warehouseId, assignedPinCodes, session);
    }

    @PostMapping("/admin/delivery/boy/approve")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> approveDeliveryBoy(
            @RequestParam int deliveryBoyId,
            @RequestParam(required = false, defaultValue = "") String assignedPinCodes,
            HttpSession session) {
        return deliveryBoyService.approveDeliveryBoy(deliveryBoyId, assignedPinCodes, session);
    }

    @PostMapping("/admin/delivery/boy/reject")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> rejectDeliveryBoy(
            @RequestParam int deliveryBoyId,
            @RequestParam(required = false, defaultValue = "") String reason,
            HttpSession session) {
        return deliveryBoyService.rejectDeliveryBoy(deliveryBoyId, reason, session);
    }

    @GetMapping("/admin/delivery/boys/for-order/{orderId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getEligibleDeliveryBoys(
            @PathVariable int orderId, HttpSession session) {
        return deliveryAdminService.getEligibleDeliveryBoys(orderId, session);
    }

    @GetMapping("/admin/delivery/boys/{warehouseId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getDeliveryBoysByWarehouse(
            @PathVariable int warehouseId, HttpSession session) {
        return deliveryAdminService.getDeliveryBoysByWarehouse(warehouseId, session);
    }

    // ── Order Assignment ──────────────────────────────────────────

    /**
     * Admin manually assigns a delivery boy to an order.
     * This works as an override even if auto-assign already ran
     * (e.g., admin wants to reassign to a different delivery boy).
     */
    @PostMapping("/admin/delivery/assign")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> assignDeliveryBoy(
            @RequestParam int orderId, @RequestParam int deliveryBoyId,
            HttpSession session) {
        return deliveryAdminService.assignDeliveryBoy(orderId, deliveryBoyId, session);
    }

    /**
     * Admin marks an order as PACKED.
     * This is the primary trigger for auto-assignment:
     * the system immediately tries to find an online delivery boy
     * covering the order's pin code with a free slot.
     */
    @PostMapping("/admin/delivery/order/pack")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> markOrderPacked(
            @RequestParam int orderId, HttpSession session) {
        return deliveryAdminService.markOrderPacked(orderId, session);
    }

    // ── Auto-Assign Monitoring (Admin) ────────────────────────────

    /**
     * Returns the last 50 auto-assignment events for admin audit.
     * Shows: orderId, delivery boy, pin code, timestamp, active orders at time.
     */
    @GetMapping("/admin/delivery/auto-assign/logs")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getAutoAssignLogs(HttpSession session) {
        return deliveryAdminService.getAutoAssignLogs(session);
    }

    /**
     * Returns each delivery boy's current active order count and slot availability.
     * Admin uses this to monitor workload distribution.
     * Response includes: isOnline, activeOrders (0-3), slots remaining, atCap flag.
     */
    @GetMapping("/admin/delivery/boys/load")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getDeliveryBoyLoad(HttpSession session) {
        return deliveryAdminService.getDeliveryBoyLoad(session);
    }

    // ── Warehouse Change Requests ─────────────────────────────────

    @PostMapping("/admin/delivery/warehouse-change/approve")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> approveWarehouseChange(
            @RequestParam int requestId,
            @RequestParam(required = false, defaultValue = "") String adminNote,
            HttpSession session) {
        return deliveryBoyService.approveWarehouseChange(requestId, adminNote, session);
    }

    @PostMapping("/admin/delivery/warehouse-change/reject")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> rejectWarehouseChange(
            @RequestParam int requestId,
            @RequestParam(required = false, defaultValue = "") String adminNote,
            HttpSession session) {
        return deliveryBoyService.rejectWarehouseChange(requestId, adminNote, session);
    }
}