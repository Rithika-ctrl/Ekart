
/**
 * File: BackInStockController.java
 * Description: Handles REST endpoints for "Notify Me" back-in-stock subscriptions.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.controller;

import com.example.ekart.service.BackInStockService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired
    private BackInStockService backInStockService;

    /**
     * Subscribe the logged-in customer to back-in-stock alerts for a product.
     * @param productId ID of the product to subscribe to
     * @param session HTTP session of the logged-in user
     * @return ResponseEntity with subscription result
     */
    @PostMapping("/{productId}")
    public ResponseEntity<Map<String, Object>> subscribe(
            @PathVariable int productId,
            HttpSession session) {
        // Call service to subscribe user to product notifications
        Map<String, Object> result = backInStockService.subscribe(productId, session);
        boolean success = (boolean) result.get("success");
        // Return 200 OK if successful, else 400 Bad Request
        return success ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /**
     * Unsubscribe the logged-in customer from back-in-stock alerts for a product.
     * @param productId ID of the product to unsubscribe from
     * @param session HTTP session of the logged-in user
     * @return ResponseEntity with unsubscription result
     */
    @DeleteMapping("/{productId}")
    public ResponseEntity<Map<String, Object>> unsubscribe(
            @PathVariable int productId,
            HttpSession session) {
        // Call service to unsubscribe user from product notifications
        Map<String, Object> result = backInStockService.unsubscribe(productId, session);
        return ResponseEntity.ok(result);
    }

    /**
     * Check if the logged-in customer is already subscribed to back-in-stock alerts for a product.
     * @param productId ID of the product to check
     * @param session HTTP session of the logged-in user
     * @return ResponseEntity with subscription status (true/false)
     */
    @GetMapping("/{productId}")
    public ResponseEntity<Map<String, Object>> status(
            @PathVariable int productId,
            HttpSession session) {
        // Check subscription status using service
        boolean subscribed = backInStockService.isSubscribed(productId, session);
        return ResponseEntity.ok(Map.of(
            "success",    true,
            "subscribed", subscribed
        ));
    }
}