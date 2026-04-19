package com.example.ekart.service;

import com.example.ekart.dto.*;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.TrackingEventLogRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * UPDATED OrderTrackingService — real event-based tracking.
 *
 * REMOVED: simulateTrackingStatus() — the fake timer-based simulation is gone.
 *
 * Now works by reading TrackingEventLog rows inserted by real actions:
 *   - Order placed         → PROCESSING  (paymentSuccess)
 *   - Vendor packs         → PACKED      (VendorService.markReady)
 *   - Admin assigns DB     → SHIPPED     (DeliveryAdminService.assignDeliveryBoy)
 *   - Delivery boy picks up→ OUT_FOR_DELIVERY (DeliveryBoyService.markPickedUp)
 *   - OTP confirmed        → DELIVERED   (DeliveryBoyService.confirmDelivery)
 *
 * Replace your existing OrderTrackingService.java with this file.
 */
@Service
public class OrderTrackingService {

    @Autowired private OrderRepository            orderRepository;
    @Autowired private TrackingEventLogRepository trackingEventLogRepository;

    /**
     * Returns real tracking information for an order.
     * Only returns data if the order belongs to the logged-in customer.
     */
    public TrackingResponse getOrderTracking(int orderId, HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) return null;

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) return null;

        Order order = orderOpt.get();

        // Security: order must belong to this customer
        if (order.getCustomer() == null || order.getCustomer().getId() != customer.getId())
            return null;

        // NO simulateTrackingStatus() — status is what the DB says, set by real actions
        return buildTrackingResponse(order);
    }

    /**
     * Builds the TrackingResponse from real TrackingEventLog rows.
     */
    private TrackingResponse buildTrackingResponse(Order order) {
        TrackingResponse response = new TrackingResponse();
        response.setOrderId(order.getId());
        response.setCurrentStatus(order.getTrackingStatus());
        response.setCurrentCity(order.getCurrentCity());
        response.setProgressPercent(order.getTrackingStatus().getProgressPercent());

        // Estimated delivery: only show if not yet delivered
        if (order.getOrderDate() != null
                && order.getTrackingStatus() != TrackingStatus.DELIVERED
                && order.getTrackingStatus() != TrackingStatus.CANCELLED
                && order.getTrackingStatus() != TrackingStatus.REFUNDED) {
            response.setEstimatedDelivery(order.getOrderDate().plusHours(48));
        }

        // Real history from DB — sorted oldest first
        List<TrackingEventLog> events =
                trackingEventLogRepository.findByOrderOrderByEventTimeAsc(order);

        List<TrackingEvent> history = events.stream()
                .map(e -> new TrackingEvent(
                        e.getEventTime(),
                        e.getStatus(),
                        e.getCity(),
                        e.getDescription()))
                .collect(Collectors.toList());

        response.setHistory(history);
        return response;
    }

    /**
     * For use by controllers that need to verify order ownership.
     * Does NOT run simulation.
     */
    public Order getOrderForCustomer(int orderId, HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) return null;

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) return null;

        Order order = orderOpt.get();
        if (order.getCustomer() == null || order.getCustomer().getId() != customer.getId())
            return null;

        return order;
    }

    /**
     * Log an order status change to the TrackingEventLog.
     * Updates the order's tracking status and logs the event.
     * 
     * @param orderId        Order ID
     * @param fromStatus     Previous status (description)
     * @param toStatus       New status (description/enum name)
     * @param description    Event description/reason
     */
    public void logOrderStatusChange(int orderId, String fromStatus, String toStatus, String description) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) return;

        Order order = orderOpt.get();

        // Try to parse toStatus as TrackingStatus enum
        TrackingStatus newStatus;
        try {
            newStatus = TrackingStatus.valueOf(toStatus.trim().toUpperCase().replace(" ", "_"));
        } catch (Exception e) {
            // If parsing fails, keep current status
            newStatus = order.getTrackingStatus();
        }

        // Update order's tracking status
        order.setTrackingStatus(newStatus);
        orderRepository.save(order);

        // Create event log entry
        TrackingEventLog event = new TrackingEventLog();
        event.setOrder(order);
        event.setStatus(newStatus);
        event.setCity(order.getCurrentCity());
        event.setDescription(description != null ? description : toStatus);
        event.setEventTime(java.time.LocalDateTime.now());
        
        trackingEventLogRepository.save(event);
    }
}
