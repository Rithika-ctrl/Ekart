package com.example.ekart.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ekart.dto.Customer;
import com.example.ekart.service.ReorderService;
import com.example.ekart.service.ReorderService.ReorderResult;

import jakarta.servlet.http.HttpSession;

/**
 * REST API Controller for Re-Order functionality.
 * Provides endpoints for customers to reorder items from past orders.
 */
@RestController
@RequestMapping("/api/orders")
public class ReorderApiController {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final ReorderService reorderService;

    public ReorderApiController(
            ReorderService reorderService) {
        this.reorderService = reorderService;
    }



    /**
     * POST /api/orders/:id/reorder
     * Process a reorder request - clears cart and adds items from past order.
     * 
     * @param id The order ID to reorder from
     * @param session HTTP session for customer verification
     * @return ReorderResult with success status, added items, and out-of-stock items
     */
    @PostMapping("/{id}/reorder")
    public ResponseEntity<ReorderResult> reorder(@PathVariable int id, HttpSession session) {
        // Verify customer is logged in
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            ReorderResult result = new ReorderResult();
            result.setSuccess(false);
            result.setMessage("Please login to continue.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
        }

        // Process reorder
        ReorderResult result = reorderService.processReorder(id, session);

        if (!result.isSuccess() && result.getMessage().contains("not found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(result);
        }
        if (!result.isSuccess() && result.getMessage().contains("only reorder your own")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(result);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/orders/:id/check-stock
     * Pre-check stock availability for items in an order.
     * Used for showing confirmation modal with item availability info.
     * 
     * @param id The order ID to check
     * @param session HTTP session for customer verification
     * @return Map with item availability details
     */
    @GetMapping("/{id}/check-stock")
    public ResponseEntity<Map<String, Object>> checkStock(@PathVariable int id, HttpSession session) {
        // Verify customer is logged in
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("success", false, "message", "Please login to continue."));
        }

        Map<String, Object> result = reorderService.checkOrderStock(id, session);

        if (!(boolean) result.get("success")) {
            String message = (String) result.get("message");
            if ("Not authorized".equals(message)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(result);
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(result);
        }

        return ResponseEntity.ok(result);
    }
}
