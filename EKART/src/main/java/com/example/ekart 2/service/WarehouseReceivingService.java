package com.example.ekart.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ekart.dto.DeliveryBoy;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingStatus;
import com.example.ekart.dto.Warehouse;
import com.example.ekart.repository.DeliveryBoyRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.WarehouseRepository;

/**
 * LOCATION: src/main/java/com/example/ekart/service/WarehouseReceivingService.java
 *
 * Handles warehouse staff workflow for receiving and preparing orders for delivery.
 * 
 * Workflow:
 * 1. Warehouse staff receives order shipment (warehouse_received)
 * 2. Staff scans and prepares order for delivery (prepared_for_delivery)
 * 3. Staff assigns delivery boy manually from dropdown (assign_delivery_boy)
 * 4. Delivery boy picks up and delivers (delivery_boy_confirms)
 * 
 * Unlike auto-assignment, this is entirely manual with UI feedback.
 */
@Service
@Transactional
public class WarehouseReceivingService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private DeliveryBoyRepository deliveryBoyRepository;

    @Autowired
    private OrderTrackingService orderTrackingService;

    /**
     * Marks an order as received at warehouse.
     * Called when warehouse staff scans the order during inbound receiving.
     * 
     * Status: PACKED → WAREHOUSE_RECEIVED
     *
     * @param orderId Order to mark as received
     * @param warehouseId Warehouse receiving the order
     * @param description Optional description or tracking notes
     * @return Updated order, or null if not found
     */
    public Order markOrderAsWarehouseReceived(int orderId, int warehouseId, String description) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return null;
        }

        Order order = orderOpt.get();
        
        // Verify order is in PACKED or IN_HUB_TRANSIT state
        if (!isValidForReceiving(order)) {
            return null;
        }

        Optional<Warehouse> whOpt = warehouseRepository.findById(warehouseId);
        if (whOpt.isEmpty()) {
            return null;
        }

        Warehouse warehouse = whOpt.get();

        // Update order
        order.setWarehouse(warehouse);
        order.setCurrentCity(warehouse.getCity());
        order.setTrackingStatus(TrackingStatus.WAREHOUSE_RECEIVED);
        if (description != null) {
            order.setDeliveryTime(description);
        }

        Order updated = orderRepository.save(order);

        // Log tracking event
        orderTrackingService.logOrderStatusChange(
            orderId,
            "WAREHOUSE_RECEIVED",
            warehouse.getCity(),
            "Order received at warehouse. Awaiting preparation for delivery."
        );

        return updated;
    }

    /**
     * Marks an order as prepared for delivery.
     * Called when warehouse staff has sorted, packed, and quality-checked the order.
     * 
     * Status: WAREHOUSE_RECEIVED → READY_FOR_DELIVERY
     *
     * @param orderId Order to prepare for delivery
     * @param description Optional notes about preparation
     * @return Updated order, or null if not found
     */
    public Order markOrderPreparedForDelivery(int orderId, String description) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return null;
        }

        Order order = orderOpt.get();

        // Verify order is in WAREHOUSE_RECEIVED state
        if (order.getTrackingStatus() != TrackingStatus.WAREHOUSE_RECEIVED) {
            return null;
        }

        // Update order
        order.setTrackingStatus(TrackingStatus.READY_FOR_DELIVERY);
        order.setPreparedForTransferAt(LocalDateTime.now());
        if (description != null) {
            order.setDeliveryTime(description);
        }

        Order updated = orderRepository.save(order);

        // Log tracking event
        Warehouse warehouse = order.getWarehouse();
        String city = warehouse != null ? warehouse.getCity() : "Unknown";
        
        orderTrackingService.logOrderStatusChange(
            orderId,
            "READY_FOR_DELIVERY",
            city,
            "Order prepared and ready for delivery. Awaiting delivery boy assignment."
        );

        return updated;
    }

    /**
     * Assigns a delivery boy to an order manually.
     * Called from warehouse staff UI dropdown after preparation.
     * This replaces the old auto-assignment system.
     * 
     * Status: READY_FOR_DELIVERY → OUT_FOR_DELIVERY (once delivery boy picks up)
     *
     * @param orderId Order to assign
     * @param deliveryBoyId Delivery boy to assign
     * @param warehouseStaffId Warehouse staff member making the assignment
     * @param notes Optional assignment notes
     * @return Updated order, or null if not found or invalid
     */
    public Order assignDeliveryBoy(int orderId, int deliveryBoyId, Integer warehouseStaffId, String notes) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return null;
        }

        Order order = orderOpt.get();

        // Verify order is in READY_FOR_DELIVERY state
        if (order.getTrackingStatus() != TrackingStatus.READY_FOR_DELIVERY) {
            return null;
        }

        Optional<DeliveryBoy> dbOpt = deliveryBoyRepository.findById(deliveryBoyId);
        if (dbOpt.isEmpty()) {
            return null;
        }

        DeliveryBoy deliveryBoy = dbOpt.get();

        // Verify delivery boy is approved and active
        if (!deliveryBoy.isAdminApproved() || !deliveryBoy.isActive()) {
            return null;
        }

        // Verify delivery boy serves the warehouse's city
        Warehouse warehouse = order.getWarehouse();
        if (warehouse != null && !deliveryBoy.getAssignedPinCodes().contains(warehouse.getServedPinCodes())) {
            // Check if delivery boy's warehouse matches
            if (deliveryBoy.getWarehouse() == null || 
                deliveryBoy.getWarehouse().getId() != warehouse.getId()) {
                return null;
            }
        }

        // Update order with assignment
        order.setFinalDeliveryBoyId(deliveryBoyId);
        order.setDeliveryBoy(deliveryBoy);
        if (notes != null) {
            order.setDeliveryTime(notes);
        }

        Order updated = orderRepository.save(order);

        // Log tracking event
        String city = warehouse != null ? warehouse.getCity() : "Unknown";
        
        orderTrackingService.logOrderStatusChange(
            orderId,
            "OUT_FOR_DELIVERY",
            city,
            "Delivery assigned to " + deliveryBoy.getName() + 
            " (Staff: " + (warehouseStaffId != null ? warehouseStaffId : "Unknown") + ")"
        );

        return updated;
    }

    /**
     * Gets all orders ready for delivery at a warehouse.
     * Warehouse staff uses this to see what orders need assignment.
     * 
     * @param warehouseId Warehouse ID
     * @return List of orders in READY_FOR_DELIVERY state
     */
    public List<Order> getOrdersReadyForDelivery(int warehouseId) {
        Optional<Warehouse> whOpt = warehouseRepository.findById(warehouseId);
        if (whOpt.isEmpty()) {
            return List.of();
        }

        // Query: warehouse_id = ? AND tracking_status = 'READY_FOR_DELIVERY'
        // For now, returning empty as we need a custom query in OrderRepository
        List<Order> allOrders = orderRepository.findAll();
        
        return allOrders.stream()
            .filter(o -> o.getWarehouse() != null &&
                        o.getWarehouse().getId() == warehouseId &&
                        o.getTrackingStatus() == TrackingStatus.READY_FOR_DELIVERY &&
                        o.getFinalDeliveryBoyId() == null)
            .toList();
    }

    /**
     * Gets all orders received but not yet prepared at a warehouse.
     * Used for warehouse receiving queue display.
     *
     * @param warehouseId Warehouse ID
     * @return List of orders in WAREHOUSE_RECEIVED state
     */
    public List<Order> getOrdersAwaitingPreparation(int warehouseId) {
        Optional<Warehouse> whOpt = warehouseRepository.findById(warehouseId);
        if (whOpt.isEmpty()) {
            return List.of();
        }

        List<Order> allOrders = orderRepository.findAll();
        
        return allOrders.stream()
            .filter(o -> o.getWarehouse() != null &&
                        o.getWarehouse().getId() == warehouseId &&
                        o.getTrackingStatus() == TrackingStatus.WAREHOUSE_RECEIVED)
            .toList();
    }

    /**
     * Gets delivery boys available for assignment at a warehouse.
     * Filters: admin_approved = true, active = true, warehouse matches.
     *
     * @param warehouseId Warehouse ID
     * @return List of available delivery boys
     */
    public List<DeliveryBoy> getAvailableDeliveryBoys(int warehouseId) {
        Optional<Warehouse> whOpt = warehouseRepository.findById(warehouseId);
        if (whOpt.isEmpty()) {
            return List.of();
        }

        Warehouse warehouse = whOpt.get();
        List<DeliveryBoy> allBoys = deliveryBoyRepository.findAll();

        return allBoys.stream()
            .filter(db -> db.isAdminApproved() &&
                         db.isActive() &&
                         db.getWarehouse() != null &&
                         db.getWarehouse().getId() == warehouseId)
            .toList();
    }

    /**
     * Calculates how many orders a delivery boy is currently carrying.
     * Used for load balancing in manual assignment.
     *
     * @param deliveryBoyId Delivery boy ID
     * @return Count of active orders assigned to this delivery boy
     */
    public int getDeliveryBoyCurrentLoad(int deliveryBoyId) {
        List<Order> allOrders = orderRepository.findAll();
        
        return (int) allOrders.stream()
            .filter(o -> o.getFinalDeliveryBoyId() != null &&
                        o.getFinalDeliveryBoyId() == deliveryBoyId &&
                        (o.getTrackingStatus() == TrackingStatus.OUT_FOR_DELIVERY ||
                         o.getTrackingStatus() == TrackingStatus.READY_FOR_DELIVERY))
            .count();
    }

    /**
     * Validates if an order is in a state that allows receiving.
     * Valid states: PACKED or IN_HUB_TRANSIT (multi-city).
     *
     * @param order Order to validate
     * @return true if order can be received
     */
    private boolean isValidForReceiving(Order order) {
        TrackingStatus status = order.getTrackingStatus();
        return status == TrackingStatus.PACKED ||
               status == TrackingStatus.IN_HUB_TRANSIT ||
               status == TrackingStatus.PREPARED_FOR_HUB_TRANSIT ||
               status == TrackingStatus.ARRIVED_AT_INTERMEDIATE_HUB;
    }

    /**
     * Gets receiving queue for a warehouse - all orders that need to be scanned in.
     *
     * @param warehouseId Warehouse ID
     * @return List of orders needed to be received
     */
    public List<Order> getReceivingQueue(int warehouseId) {
        Optional<Warehouse> whOpt = warehouseRepository.findById(warehouseId);
        if (whOpt.isEmpty()) {
            return List.of();
        }

        List<Order> allOrders = orderRepository.findAll();
        
        return allOrders.stream()
            .filter(o -> (o.getTrackingStatus() == TrackingStatus.PACKED ||
                         o.getTrackingStatus() == TrackingStatus.PREPARED_FOR_HUB_TRANSIT ||
                         o.getTrackingStatus() == TrackingStatus.ARRIVED_AT_INTERMEDIATE_HUB) &&
                         o.getCurrentCity() != null &&
                         o.getCurrentCity().equalsIgnoreCase(whOpt.get().getCity()))
            .toList();
    }
}
