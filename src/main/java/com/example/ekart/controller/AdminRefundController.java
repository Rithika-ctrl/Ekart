
/**
 * File: AdminRefundController.java
 * Description: Handles admin refund management, including page rendering and REST API endpoints for processing refunds.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;

import com.example.ekart.dto.Refund;
import com.example.ekart.dto.RefundStatus;
import com.example.ekart.service.RefundService;

import jakarta.servlet.http.HttpSession;

/**
 * Controller for Admin Refund Management.
 * Provides REST API endpoints and page rendering.
 */
@Controller
public class AdminRefundController {

    @Autowired
    private RefundService refundService;

    // ───────────────────────────────────────────────────────────────────────────
    // PAGE ENDPOINT
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Renders the admin refund management page.
     * URL: /admin/refunds
     * Access: Admin only
     * @param session HTTP session for admin authentication
     * @param map ModelMap for passing data to the view
     * @return Name of the Thymeleaf template for admin refunds
     */
    @GetMapping("/admin/refunds")
    public String refundsPage(HttpSession session, ModelMap map) {
        // Check admin authentication
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Please login as Admin");
            return "redirect:/admin/login";
        }

        // Migrate any existing replacement requests on first load
        refundService.migrateExistingReplacementRequests();

        List<Refund> pendingRefunds = refundService.getPendingRefunds();
        List<Refund> processedRefunds = refundService.getProcessedRefunds();

        map.put("pendingRefunds", pendingRefunds);
        map.put("processedRefunds", processedRefunds);
        map.put("pendingCount", refundService.getPendingCount());
        map.put("totalPendingAmount", refundService.getTotalPendingAmount());

        return "admin-refunds.html";
    }

    // ───────────────────────────────────────────────────────────────────────────
    // REST API ENDPOINTS
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Fetch all pending refund requests (REST API).
     * URL: /api/admin/refunds
     * Access: Admin only
     * @param session HTTP session for admin authentication
     * @return ResponseEntity with pending refunds data
     */
    @GetMapping("/api/admin/refunds")
    @ResponseBody
    public ResponseEntity<?> getPendingRefunds(HttpSession session) {
        // Check admin authentication
        if (session.getAttribute("admin") == null) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "Unauthorized - Admin login required"
            ));
        }

        List<Refund> pendingRefunds = refundService.getPendingRefunds();

        // Convert Refund entities to serializable format for API response
        List<Map<String, Object>> refundsData = pendingRefunds.stream()
            .map(this::refundToMap)
            .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "refunds", refundsData,
            "count", pendingRefunds.size(),
            "totalAmount", refundService.getTotalPendingAmount()
        ));
    }

    /**
     * Update refund status (approve or reject) via REST API.
     * URL: /api/admin/refunds/{id}/status
     * Access: Admin only
     * @param refundId ID of the refund to update
     * @param payload Map containing action (approve/reject) and optional rejection reason
     * @param session HTTP session for admin authentication
     * @return ResponseEntity with update result
     */
    @PutMapping("/api/admin/refunds/{id}/status")
    @ResponseBody
    public ResponseEntity<?> updateRefundStatus(
            @PathVariable("id") int refundId,
            @RequestBody Map<String, String> payload,
            HttpSession session) {

        // Check admin authentication
        if (session.getAttribute("admin") == null) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "Unauthorized - Admin login required"
            ));
        }

        String action = payload.get("action");
        String rejectionReason = payload.get("rejectionReason");
        String adminEmail = (String) session.getAttribute("admin");

        // Validate action parameter
        if (action == null || action.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Action is required (approve or reject)"
            ));
        }

        Map<String, Object> result;

        if ("approve".equalsIgnoreCase(action)) {
            result = refundService.approveRefund(refundId, adminEmail);
        } else if ("reject".equalsIgnoreCase(action)) {
            result = refundService.rejectRefund(refundId, rejectionReason, adminEmail);
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid action. Use 'approve' or 'reject'"
            ));
        }

        // Return result based on success
        if ((boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * Fetch processed refunds (approved/rejected) via REST API.
     * URL: /api/admin/refunds/history
     * Access: Admin only
     * @param session HTTP session for admin authentication
     * @return ResponseEntity with processed refunds data
     */
    @GetMapping("/api/admin/refunds/history")
    @ResponseBody
    public ResponseEntity<?> getRefundHistory(HttpSession session) {
        // Check admin authentication
        if (session.getAttribute("admin") == null) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "Unauthorized - Admin login required"
            ));
        }

        List<Refund> processedRefunds = refundService.getProcessedRefunds();

        // Convert Refund entities to serializable format for API response
        List<Map<String, Object>> refundsData = processedRefunds.stream()
            .map(this::refundToMap)
            .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "refunds", refundsData,
            "count", processedRefunds.size()
        ));
    }

    // ───────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Convert Refund entity to a serializable Map for API responses.
     * @param refund Refund entity
     * @return Map with refund fields for API response
     */
    private Map<String, Object> refundToMap(Refund refund) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", refund.getId());
        map.put("orderId", refund.getOrder().getId());
        map.put("customerName", refund.getCustomer().getName());
        map.put("customerEmail", refund.getCustomer().getEmail());
        map.put("amount", refund.getAmount());
        map.put("orderTotal", refund.getOrder().getTotalPrice());
        map.put("reason", refund.getReason());
        map.put("status", refund.getStatus().getDisplayName());
        map.put("statusCode", refund.getStatus().name());
        map.put("requestedAt", refund.getRequestedAt() != null ? refund.getRequestedAt().toString() : null);
        map.put("processedAt", refund.getProcessedAt() != null ? refund.getProcessedAt().toString() : null);
        map.put("processedBy", refund.getProcessedBy());
        map.put("rejectionReason", refund.getRejectionReason());
        return map;
    }
}
