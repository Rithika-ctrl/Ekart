/**
 * File: OrderTrackingController.java
 * Description: Controller exposing order tracking endpoints and tracking history.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ekart.dto.TrackingResponse;
import com.example.ekart.service.OrderTrackingService;

import jakarta.servlet.http.HttpSession;

/**
 * REST API Controller for Real-Time Shipment Tracking.
 * 
 * Provides endpoints for:
 * - GET /api/orders/{id}/track - Returns current status and tracking history
 */
@RestController
@RequestMapping("/api/orders")
public class OrderTrackingController {

    @Autowired
    private OrderTrackingService orderTrackingService;

    /**
     * GET /api/orders/{id}/track
     * 
     * Returns tracking information including:
     * - Current status (Processing, Shipped, Out for Delivery, Delivered)
     * - Current city/location
     * - Timestamped history of location updates
     * - Estimated delivery time
     * 
     * Security: Only returns data if the order belongs to the logged-in customer.
     */
    @GetMapping("/{id}/track")
    public ResponseEntity<TrackingResponse> getOrderTracking(
            @PathVariable("id") int orderId,
            HttpSession session) {

        TrackingResponse tracking = orderTrackingService.getOrderTracking(orderId, session);

        if (tracking == null) {
            // Either not authenticated, order not found, or order belongs to another user
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(tracking);
    }
}
