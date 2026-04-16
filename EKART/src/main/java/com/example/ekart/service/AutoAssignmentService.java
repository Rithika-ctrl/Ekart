package com.example.ekart.service;

// ================================================================
// MODIFIED FILE: src/main/java/com/example/ekart/service/AutoAssignmentService.java
//
// Purpose (PHASE 3 MODIFICATION):
//   This service is now DISABLED for automatic assignment.
//   Auto-assignment triggers have been REMOVED.
//   
//   Retained functionality:
//   - countActiveOrders() for load-balancing in manual assignment
//   - Delivery boy capacity/availability validation logic
//   
//   New workflow (MANUAL ASSIGNMENT):
//   - When order marked PACKED, NO auto-assignment occurs
//   - Warehouse staff manually assigns delivery boy via WarehouseReceivingService
//   - Staff sees available delivery boys with current load (via countActiveOrders)
//   - Load balancing handled manually with staff oversight
//
// Phase 3 Changes:
//   1. REMOVED: onOrderPacked() method (no auto-trigger)
//   2. REMOVED: onDeliveryBoyOnline() method (no auto-filling)
//   3. REMOVED: onOrderDelivered() method (no slot-filling)
//   4. KEPT: countActiveOrders() for manual assignment load display
// ================================================================

import com.example.ekart.dto.*;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AutoAssignmentService {

    /** Maximum number of concurrent active orders per delivery boy */
    public static final int MAX_CONCURRENT_ORDERS = 3;

    @Autowired private OrderRepository            orderRepository;
    @Autowired private DeliveryBoyRepository      deliveryBoyRepository;
    @Autowired private TrackingEventLogRepository trackingEventLogRepository;
    @Autowired private AutoAssignLogRepository    autoAssignLogRepository;
    @Autowired private EmailSender                emailSender;

    // ─────────────────────────────────────────────────────────────────────────
    // LOAD BALANCING HELPER — used by manual assignment
    // Counts SHIPPED + OUT_FOR_DELIVERY + READY_FOR_DELIVERY orders for a delivery boy
    // ─────────────────────────────────────────────────────────────────────────

    public int countActiveOrders(DeliveryBoy deliveryBoy) {
        if (deliveryBoy == null) {
            return 0;
        }

        List<Order> orders = orderRepository.findByDeliveryBoy(deliveryBoy);
        if (orders == null) {
            return 0;
        }

        return (int) orders.stream()
                .filter(o -> o != null && 
                           (o.getTrackingStatus() == TrackingStatus.SHIPPED
                            || o.getTrackingStatus() == TrackingStatus.OUT_FOR_DELIVERY
                            || o.getTrackingStatus() == TrackingStatus.READY_FOR_DELIVERY))
                .count();
    }

    /**
     * Checks if a delivery boy is at capacity or above.
     * Useful for WarehouseReceivingService to filter available delivery boys.
     *
     * @param deliveryBoy Delivery boy to check
     * @return true if at or above MAX_CONCURRENT_ORDERS
     */
    public boolean isAtCapacity(DeliveryBoy deliveryBoy) {
        return countActiveOrders(deliveryBoy) >= MAX_CONCURRENT_ORDERS;
    }

    /**
     * Gets available assignment slots for a delivery boy.
     *
     * @param deliveryBoy Delivery boy to check
     * @return Number of available slots (0 if at or above capacity)
     */
    public int getAvailableSlots(DeliveryBoy deliveryBoy) {
        int current = countActiveOrders(deliveryBoy);
        int available = MAX_CONCURRENT_ORDERS - current;
        return Math.max(0, available);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTO-ASSIGNMENT DISABLED (Phase 3)
    // The following trigger methods have been REMOVED:
    //   - onOrderPacked(Order order)       [REMOVED — was called when order marked PACKED]
    //   - onDeliveryBoyOnline(DeliveryBoy) [REMOVED — was called when delivery boy came online]
    //   - onOrderDelivered(DeliveryBoy)    [REMOVED — was called when order delivered]
    // 
    // Manual assignment is now handled by WarehouseReceivingService.assignDeliveryBoy()
    // Warehouse staff manually selects delivery boy from list with load information
}