package com.example.ekart.controller;

// ================================================================
// DeliveryAdminController.java
// Admin delivery management endpoints.
//
// Note: Only vendors can mark orders as PACKED through their vendor panel.
// Admins can only assign delivery boys to already-packed orders.
// ================================================================

import com.example.ekart.service.DeliveryAdminService;
import com.example.ekart.service.DeliveryBoyService;
import com.example.ekart.dto.DeliveryAssignmentResponse;
import com.example.ekart.dto.AutoAssignLogResponse;
import com.example.ekart.dto.DeliveryBoyLoadResponse;
import com.example.ekart.dto.EligibleDeliveryBoysResponse;
import com.example.ekart.dto.WarehouseDeliveryBoysResponse;
import com.example.ekart.dto.DeliveryBoyPinsUpdateResponse;
import com.example.ekart.dto.VerifyDeliveryBoysResponse;
import com.example.ekart.dto.OperationResponse;
import com.example.ekart.dto.AdminEntityCreateResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Controller
public class DeliveryAdminController {

    // ── Dependencies (constructor injection, replaces @Autowired field injection) ──
    private final DeliveryAdminService deliveryAdminService;
    private final DeliveryBoyService deliveryBoyService;

    public DeliveryAdminController(
            DeliveryAdminService deliveryAdminService,
            DeliveryBoyService deliveryBoyService) {
        this.deliveryAdminService = deliveryAdminService;
        this.deliveryBoyService = deliveryBoyService;
    }



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
    public ResponseEntity<AdminEntityCreateResponse> addWarehouse(
            @RequestParam String name, @RequestParam String city,
            @RequestParam String state, @RequestParam String servedPinCodes,
            HttpSession session) {
        return deliveryAdminService.addWarehouse(name, city, state, servedPinCodes, session);
    }

    // ── Delivery Boy Management ───────────────────────────────────

    @PostMapping("/admin/delivery/boy/register")
    @ResponseBody
    public ResponseEntity<AdminEntityCreateResponse> registerDeliveryBoy(
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
    public ResponseEntity<EligibleDeliveryBoysResponse> getEligibleDeliveryBoys(
            @PathVariable int orderId, HttpSession session) {
        return deliveryAdminService.getEligibleDeliveryBoys(orderId, session);
    }

    @GetMapping("/admin/delivery/boys/{warehouseId}")
    @ResponseBody
    public ResponseEntity<WarehouseDeliveryBoysResponse> getDeliveryBoysByWarehouse(
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
    public ResponseEntity<DeliveryAssignmentResponse> assignDeliveryBoy(
            @RequestParam int orderId, @RequestParam int deliveryBoyId,
            HttpSession session) {
        return deliveryAdminService.assignDeliveryBoy(orderId, deliveryBoyId, session);
    }

    /**
     * DEPRECATED: Admin cannot mark orders as packed.
     * Only vendors can mark their orders as PACKED.
     * This endpoint now returns an access denied error.
     */
    @PostMapping("/admin/delivery/order/pack")
    @ResponseBody
    public ResponseEntity<OperationResponse> markOrderPacked(
            @RequestParam int orderId, HttpSession session) {
        return ResponseEntity.status(403).body(new OperationResponse(
                false,
                "Admins cannot mark orders as packed. Only vendors can do this through their vendor panel."));
    }

    // ── Auto-Assign Monitoring (Admin) ────────────────────────────

    /**
     * Returns the last 50 auto-assignment events for admin audit.
     * Shows: orderId, delivery boy, pin code, timestamp, active orders at time.
     */
    @GetMapping("/admin/delivery/auto-assign/logs")
    @ResponseBody
    public ResponseEntity<AutoAssignLogResponse> getAutoAssignLogs(HttpSession session) {
        return deliveryAdminService.getAutoAssignLogs(session);
    }

    /**
     * Returns each delivery boy's current active order count and slot availability.
     * Admin uses this to monitor workload distribution.
     * Response includes: isOnline, activeOrders (0-3), slots remaining, atCap flag.
     */
    @GetMapping("/admin/delivery/boys/load")
    @ResponseBody
    public ResponseEntity<DeliveryBoyLoadResponse> getDeliveryBoyLoad(HttpSession session) {
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

    // ── Update Delivery Boy PIN Codes ─────────────────────────────

    /**
     * Admin updates a delivery boy's assigned PIN codes.
     * Comma-separated list or "all" for all regions.
     */
    @PostMapping("/admin/delivery/boy/{id}/pins")
    @ResponseBody
    public ResponseEntity<DeliveryBoyPinsUpdateResponse> updateDeliveryBoyPins(
            @PathVariable int id,
            @RequestParam String assignedPinCodes,
            HttpSession session) {
        return deliveryAdminService.updateDeliveryBoyPinCodes(id, assignedPinCodes, session);
    }

    /**
     * POST /admin/delivery/verify-all
     * Make all active delivery boys eligible for assignment by marking them as verified.
     * Used to fix issues where existing boys can't be assigned due to verification status.
     */
    @PostMapping("/admin/delivery/verify-all")
    @ResponseBody
    public ResponseEntity<VerifyDeliveryBoysResponse> verifyAllDeliveryBoys(HttpSession session) {
        return deliveryAdminService.verifyAllDeliveryBoys(session);
    }
}