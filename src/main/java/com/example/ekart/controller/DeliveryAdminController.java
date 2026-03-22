package com.example.ekart.controller;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/controller/DeliveryAdminController.java
// REPLACE your existing file.
//
// New endpoints added:
//   POST /admin/delivery/warehouse-change/approve  → approve transfer request
//   POST /admin/delivery/warehouse-change/reject   → reject transfer request
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

    @PostMapping("/admin/delivery/assign")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> assignDeliveryBoy(
            @RequestParam int orderId, @RequestParam int deliveryBoyId,
            HttpSession session) {
        return deliveryAdminService.assignDeliveryBoy(orderId, deliveryBoyId, session);
    }

    // ── Warehouse Change Requests ─────────────────────────────────

    /** Admin approves a delivery boy's warehouse transfer request */
    @PostMapping("/admin/delivery/warehouse-change/approve")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> approveWarehouseChange(
            @RequestParam int requestId,
            @RequestParam(required = false, defaultValue = "") String adminNote,
            HttpSession session) {
        return deliveryBoyService.approveWarehouseChange(requestId, adminNote, session);
    }

    /** Admin rejects a delivery boy's warehouse transfer request */
    @PostMapping("/admin/delivery/warehouse-change/reject")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> rejectWarehouseChange(
            @RequestParam int requestId,
            @RequestParam(required = false, defaultValue = "") String adminNote,
            HttpSession session) {
        return deliveryBoyService.rejectWarehouseChange(requestId, adminNote, session);
    }
}