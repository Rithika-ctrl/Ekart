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
 * ⚠️ DEPRECATED: Order Tracking Controller
 * 
 * This controller is deprecated as of April 6, 2026.
 * All tracking endpoints have been moved to ReactApiController (/api/react/...)
 * 
 * Use: GET /api/react/orders/{id}/track instead
 * 
 * Kept for backwards compatibility only. Please migrate to ReactApiController.
 */
@RestController
@RequestMapping("/api/orders")
@Deprecated(since = "2.0", forRemoval = true)
public class OrderTrackingController {

    @Autowired
    private OrderTrackingService orderTrackingService;

    /**
     * ⚠️ DEPRECATED: Use GET /api/react/orders/{id}/track instead
     * 
     * @deprecated As of 2.0, use ReactApiController.getOrderTracking() instead
     */
    @GetMapping("/{id}/track")
    @Deprecated(since = "2.0", forRemoval = true)
    public ResponseEntity<TrackingResponse> getOrderTracking(
            @PathVariable("id") int orderId,
            HttpSession session) {

        TrackingResponse tracking = orderTrackingService.getOrderTracking(orderId, session);

        if (tracking == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(tracking);
    }
}
