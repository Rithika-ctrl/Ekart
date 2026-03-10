package com.example.ekart.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingEvent;
import com.example.ekart.dto.TrackingResponse;
import com.example.ekart.dto.TrackingStatus;
import com.example.ekart.repository.OrderRepository;

import jakarta.servlet.http.HttpSession;

/**
 * Service for Real-Time Shipment Tracking.
 * Contains mock simulation logic based on time elapsed since order placement.
 */
@Service
public class OrderTrackingService {

    @Autowired
    private OrderRepository orderRepository;

    // Mock city progression for shipment tracking
    private static final String[] MOCK_CITIES = {
        "Processing Center",
        "Regional Hub",
        "City Distribution Center",
        "Local Delivery Station"
    };

    /**
     * Get tracking information for an order.
     * Verifies the order belongs to the logged-in customer for security.
     * Uses mock simulation to update status based on time elapsed.
     */
    public TrackingResponse getOrderTracking(int orderId, HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return null; // Not authenticated
        }

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return null; // Order not found
        }

        Order order = orderOpt.get();

        // Security check: Ensure the order belongs to the logged-in customer
        if (order.getCustomer() == null || order.getCustomer().getId() != customer.getId()) {
            return null; // Unauthorized access attempt
        }

        // Apply mock simulation to update order status
        simulateTrackingStatus(order);

        // Build the tracking response
        return buildTrackingResponse(order);
    }

    /**
     * Mock simulation function that updates tracking status based on
     * time elapsed since the order was placed.
     * 
     * Timeline:
     * - 0-1 hours: Processing
     * - 1-6 hours: Shipped
     * - 6-24 hours: Out for Delivery
     * - 24+ hours: Delivered
     */
    public void simulateTrackingStatus(Order order) {
        if (order.getOrderDate() == null) {
            return;
        }

        long hoursElapsed = Duration.between(order.getOrderDate(), LocalDateTime.now()).toHours();

        TrackingStatus newStatus;
        String newCity;

        if (hoursElapsed >= 24) {
            newStatus = TrackingStatus.DELIVERED;
            newCity = "Delivered";
        } else if (hoursElapsed >= 6) {
            newStatus = TrackingStatus.OUT_FOR_DELIVERY;
            newCity = MOCK_CITIES[3]; // Local Delivery Station
        } else if (hoursElapsed >= 1) {
            newStatus = TrackingStatus.SHIPPED;
            newCity = MOCK_CITIES[1]; // Regional Hub
        } else {
            newStatus = TrackingStatus.PROCESSING;
            newCity = MOCK_CITIES[0]; // Processing Center
        }

        // Update order if status has changed
        if (order.getTrackingStatus() != newStatus) {
            order.setTrackingStatus(newStatus);
            order.setCurrentCity(newCity);
            orderRepository.save(order);
        }
    }

    /**
     * Build tracking response with history of status changes.
     */
    private TrackingResponse buildTrackingResponse(Order order) {
        TrackingResponse response = new TrackingResponse();
        response.setOrderId(order.getId());
        response.setCurrentStatus(order.getTrackingStatus());
        response.setCurrentCity(order.getCurrentCity());
        response.setProgressPercent(order.getTrackingStatus().getProgressPercent());

        // Calculate estimated delivery (48 hours from order date)
        if (order.getOrderDate() != null && order.getTrackingStatus() != TrackingStatus.DELIVERED) {
            response.setEstimatedDelivery(order.getOrderDate().plusHours(48));
        }

        // Build tracking history based on current status
        List<TrackingEvent> history = new ArrayList<>();
        LocalDateTime orderDate = order.getOrderDate();

        if (orderDate != null) {
            // Processing event (always present)
            history.add(new TrackingEvent(
                orderDate,
                TrackingStatus.PROCESSING,
                MOCK_CITIES[0],
                "Order placed and being processed"
            ));

            // Shipped event
            if (order.getTrackingStatus().ordinal() >= TrackingStatus.SHIPPED.ordinal()) {
                history.add(new TrackingEvent(
                    orderDate.plusHours(1),
                    TrackingStatus.SHIPPED,
                    MOCK_CITIES[1],
                    "Package shipped from warehouse"
                ));
            }

            // Out for Delivery event
            if (order.getTrackingStatus().ordinal() >= TrackingStatus.OUT_FOR_DELIVERY.ordinal()) {
                history.add(new TrackingEvent(
                    orderDate.plusHours(6),
                    TrackingStatus.OUT_FOR_DELIVERY,
                    MOCK_CITIES[3],
                    "Out for delivery - arriving today"
                ));
            }

            // Delivered event
            if (order.getTrackingStatus() == TrackingStatus.DELIVERED) {
                history.add(new TrackingEvent(
                    orderDate.plusHours(24),
                    TrackingStatus.DELIVERED,
                    "Delivered",
                    "Package delivered successfully"
                ));
            }
        }

        response.setHistory(history);
        return response;
    }

    /**
     * Verify if an order belongs to the customer and return the order if valid.
     * Returns null if validation fails.
     */
    public Order getOrderForCustomer(int orderId, HttpSession session) {
        Customer customer = (Customer) session.getAttribute("customer");
        if (customer == null) {
            return null;
        }

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return null;
        }

        Order order = orderOpt.get();
        if (order.getCustomer() == null || order.getCustomer().getId() != customer.getId()) {
            return null; // Security: order doesn't belong to this customer
        }

        // Apply mock simulation
        simulateTrackingStatus(order);

        return order;
    }
}
