package com.example.ekart.controller;

import com.example.ekart.service.BackInStockService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * REST endpoints for "Notify Me" back-in-stock subscriptions.
 *
 * POST   /api/notify-me/{productId} → subscribe
 * DELETE /api/notify-me/{productId} → unsubscribe
 * GET    /api/notify-me/{productId} → check subscription status
 */
@RestController
@RequestMapping("/api/notify-me")
public class BackInStockController {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final BackInStockService backInStockService;

    public BackInStockController(
            BackInStockService backInStockService) {
        this.backInStockService = backInStockService;
    }



    /** Subscribe the logged-in customer to back-in-stock alerts for a product */
    @PostMapping("/{productId}")
    public ResponseEntity<Map<String, Object>> subscribe(
            @PathVariable int productId,
            HttpServletRequest request) {
        Map<String, Object> result = backInStockService.subscribe(productId, request);
        boolean success = (boolean) result.get("success");
        return success ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /** Unsubscribe */
    @DeleteMapping("/{productId}")
    public ResponseEntity<Map<String, Object>> unsubscribe(
            @PathVariable int productId,
            HttpServletRequest request) {
        Map<String, Object> result = backInStockService.unsubscribe(productId, request);
        return ResponseEntity.ok(result);
    }

    /** Check if the logged-in customer is already subscribed */
    @GetMapping("/{productId}")
    public ResponseEntity<Map<String, Object>> status(
            @PathVariable int productId,
            HttpServletRequest request) {
        boolean subscribed = backInStockService.isSubscribed(productId, request);
        return ResponseEntity.ok(Map.of(
                "success",    true,
                "subscribed", subscribed
        ));
    }
}