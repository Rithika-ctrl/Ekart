package com.example.ekart.controller;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/controller/ScheduledOrderController.java
// ================================================================

import com.example.ekart.service.ScheduledOrderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for Scheduled / Subscription Orders.
 *
 * Base path : /api/flutter/scheduled-orders
 * Auth      : Bearer JWT (validated by FlutterAuthFilter).
 *             Customer ID is read from the request attribute "flutter.userId"
 *             set by the filter — same pattern used by FlutterApiController.
 *
 * ENDPOINTS:
 *   GET    /api/flutter/scheduled-orders          → list all customer's schedules
 *   POST   /api/flutter/scheduled-orders          → create a new schedule
 *   PUT    /api/flutter/scheduled-orders/{id}     → update qty / pause / resume
 *   DELETE /api/flutter/scheduled-orders/{id}/cancel → cancel permanently
 */
@RestController
@RequestMapping("/api/flutter/scheduled-orders")
@CrossOrigin(origins = "*")
public class ScheduledOrderController {

    @Autowired
    private ScheduledOrderService scheduledOrderService;

    // ─────────────────────────────────────────────────────────────────────────
    //  GET /api/flutter/scheduled-orders
    //  Returns all schedules for the authenticated customer.
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getSchedules(HttpServletRequest request) {
        Integer customerId = getCustomerId(request);
        if (customerId == null) return unauthorized();

        List<Map<String, Object>> schedules =
                scheduledOrderService.getSchedulesForCustomer(customerId);

        return ResponseEntity.ok(schedules);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  POST /api/flutter/scheduled-orders
    //  Creates a new scheduled order.
    //
    //  Request body:
    //  {
    //    "productId"    : 42,
    //    "quantity"     : 2,
    //    "frequencyType": "DAILY" | "EVERY_N_DAYS",
    //    "frequencyValue": 25,          // ignored when DAILY
    //    "durationDays" : 90,           // null = forever
    //    "addressId"    : 7,
    //    "paymentMode"  : "COD" | "ONLINE_AUTOPAY",
    //    "startDate"    : "2026-04-01"  // ISO date, must be today or future
    //  }
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<Map<String, Object>> createSchedule(
            HttpServletRequest request,
            @RequestBody Map<String, Object> body) {

        Integer customerId = getCustomerId(request);
        if (customerId == null) return unauthorized();

        Map<String, Object> result = scheduledOrderService.createSchedule(customerId, body);
        boolean success = Boolean.TRUE.equals(result.get("success"));
        return success
                ? ResponseEntity.ok(result)
                : ResponseEntity.badRequest().body(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PUT /api/flutter/scheduled-orders/{id}
    //  Updates quantity and/or status of a schedule.
    //
    //  Request body (all fields optional):
    //  {
    //    "quantity": 3,
    //    "status"  : "PAUSED" | "ACTIVE"
    //  }
    // ─────────────────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateSchedule(
            HttpServletRequest request,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        Integer customerId = getCustomerId(request);
        if (customerId == null) return unauthorized();

        Map<String, Object> result = scheduledOrderService.updateSchedule(customerId, id, body);
        boolean success = Boolean.TRUE.equals(result.get("success"));
        return success
                ? ResponseEntity.ok(result)
                : ResponseEntity.badRequest().body(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DELETE /api/flutter/scheduled-orders/{id}/cancel
    //  Permanently cancels a scheduled order.
    // ─────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelSchedule(
            HttpServletRequest request,
            @PathVariable Long id) {

        Integer customerId = getCustomerId(request);
        if (customerId == null) return unauthorized();

        Map<String, Object> result = scheduledOrderService.cancelSchedule(customerId, id);
        boolean success = Boolean.TRUE.equals(result.get("success"));
        return success
                ? ResponseEntity.ok(result)
                : ResponseEntity.badRequest().body(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Extracts the authenticated customer's ID from the request attribute
     * set by FlutterAuthFilter ("flutter.userId").
     * Returns null if the attribute is missing (should not happen for
     * protected endpoints, but guards against misconfiguration).
     */
    private Integer getCustomerId(HttpServletRequest request) {
        Object attr = request.getAttribute("flutter.userId");
        if (attr == null) return null;
        try {
            return (Integer) attr;
        } catch (ClassCastException e) {
            try { return Integer.parseInt(attr.toString()); } catch (Exception ex) { return null; }
        }
    }

    /** Returns a 401 Unauthorized response in the standard Ekart error format. */
    @SuppressWarnings("unchecked")
    private ResponseEntity unauthorized() {
        Map<String, Object> err = new HashMap<>();
        err.put("success", false);
        err.put("message", "Unauthorized — please log in");
        return ResponseEntity.status(401).body(err);
    }
}