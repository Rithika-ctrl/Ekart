package com.example.ekart.service;
import java.util.Optional;
import java.time.LocalDateTime;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ekart.dto.Order;
import com.example.ekart.dto.Warehouse;
import com.example.ekart.dto.WarehouseTransferLeg;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.WarehouseRepository;
import com.example.ekart.repository.WarehouseTransferLegRepository;

/**
 * LOCATION: src/main/java/com/example/ekart/service/WarehouseTransferService.java
 *
 * Manages warehouse-to-warehouse transfer workflow for multi-city orders.
 * 
 * Status progression for each transfer leg:
 * INITIATED → IN_TRANSIT → ARRIVED_AT_DESTINATION → RECEIVED
 * 
 * Example: Delhi Warehouse → Hyderabad Hub transfer
 * 1. initiateLegTransfer(): INITIATED state, record start time
 * 2. markLegInTransit(): IN_TRANSIT state, goods picked for shipping
 * 3. markLegArrived(): ARRIVED_AT_DESTINATION state, arrived at next hub
 * 4. markLegReceived(): RECEIVED state, warehouse staff scanned and received
 */
@Service
@Transactional
public class WarehouseTransferService {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final WarehouseTransferLegRepository warehouseTransferLegRepository;
    private final OrderRepository orderRepository;
    private final WarehouseRepository warehouseRepository;
    private final OrderTrackingService orderTrackingService;

    public WarehouseTransferService(
            WarehouseTransferLegRepository warehouseTransferLegRepository,
            OrderRepository orderRepository,
            WarehouseRepository warehouseRepository,
            OrderTrackingService orderTrackingService) {
        this.warehouseTransferLegRepository = warehouseTransferLegRepository;
        this.orderRepository = orderRepository;
        this.warehouseRepository = warehouseRepository;
        this.orderTrackingService = orderTrackingService;
    }






    /**
     * Initiates warehouse transfer legs based on the routing path.
     * Creates one WarehouseTransferLeg per transfer needed.
     *
     * Example: Delhi → Hyderabad → Bangalore creates 2 legs:
     * - Leg 1: Delhi → Hyderabad, status=INITIATED
     * - Leg 2: Hyderabad → Bangalore, status=INITIATED
     *
     * @param order Order with routing path set
     * @param route List of warehouses in transfer order
     */
    public void initiateTransferLegs(Order order, List<Warehouse> route) {
        if (order == null || route == null || route.size() <= 1) {
            return;
        }

        // Create transfer legs for each consecutive warehouse pair
        for (int i = 0; i < route.size() - 1; i++) {
            Warehouse fromWh = route.get(i);
            Warehouse toWh = route.get(i + 1);

            WarehouseTransferLeg leg = new WarehouseTransferLeg();
            leg.setOrder(order);
            leg.setFromWarehouse(fromWh);
            leg.setToWarehouse(toWh);
            leg.setLegSequence(i + 1);
            leg.setStatus("INITIATED");
            leg.setInitiatedAt(LocalDateTime.now());
            leg.setDescription("Transfer from " + fromWh.getCity() + " to " + toWh.getCity());

            warehouseTransferLegRepository.save(leg);
        }

        // Update order status to PREPARED_FOR_HUB_TRANSIT if multi-warehouse
        if (route.size() > 2) {
            order.setTrackingStatus(com.example.ekart.dto.TrackingStatus.PREPARED_FOR_HUB_TRANSIT);
            orderRepository.save(order);
            
            // Log tracking event
            orderTrackingService.logOrderStatusChange(
                order.getId(),
                "PREPARED_FOR_HUB_TRANSIT",
                order.getCurrentCity(),
                "Order prepared for multi-warehouse transfer"
            );
        }
    }

    /**
     * Marks a transfer leg as in-transit.
     * Called when warehouse staff hands over goods to transport.
     *
     * @param legId Transfer leg ID
     * @param description Optional description (e.g., tracking number)
     * @return Updated transfer leg
     */
    public WarehouseTransferLeg markLegInTransit(int legId, String description) {
        Optional<WarehouseTransferLeg> legOpt = warehouseTransferLegRepository.findById(legId);
        
        if (legOpt.isEmpty()) {
            return null;
        }

        WarehouseTransferLeg leg = legOpt.get();
        leg.setStatus("IN_TRANSIT");
        leg.setInTransitAt(LocalDateTime.now());
        if (description != null) {
            leg.setDescription(description);
        }

        WarehouseTransferLeg updated = warehouseTransferLegRepository.save(leg);

        // Update order to IN_HUB_TRANSIT if this is first transfer
        if (leg.getLegSequence() == 1) {
            Order order = leg.getOrder();
            order.setTrackingStatus(com.example.ekart.dto.TrackingStatus.IN_HUB_TRANSIT);
            order.setInIntermediateHub(true);
            orderRepository.save(order);

            orderTrackingService.logOrderStatusChange(
                order.getId(),
                "IN_HUB_TRANSIT",
                leg.getFromWarehouse().getCity(),
                "Transfer leg " + leg.getLegSequence() + " in transit to " + leg.getToWarehouse().getCity()
            );
        }

        return updated;
    }

    /**
     * Marks a transfer leg as arrived at destination warehouse.
     * Called when goods reach the next warehouse/hub.
     *
     * @param legId Transfer leg ID
     * @param description Optional description
     * @return Updated transfer leg
     */
    public WarehouseTransferLeg markLegArrived(int legId, String description) {
        Optional<WarehouseTransferLeg> legOpt = warehouseTransferLegRepository.findById(legId);
        
        if (legOpt.isEmpty()) {
            return null;
        }

        WarehouseTransferLeg leg = legOpt.get();
        leg.setStatus("ARRIVED_AT_DESTINATION");
        leg.setArrivedAtTimestamp(LocalDateTime.now());
        if (description != null) {
            leg.setDescription(description);
        }

        WarehouseTransferLeg updated = warehouseTransferLegRepository.save(leg);

        // Log status change
        Order order = leg.getOrder();
        String nextWarehouseCity = leg.getToWarehouse().getCity();
        
        orderTrackingService.logOrderStatusChange(
            order.getId(),
            "ARRIVED_AT_INTERMEDIATE_HUB",
            nextWarehouseCity,
            "Order arrived at " + nextWarehouseCity
        );

        return updated;
    }

    /**
     * Marks a transfer leg as received by warehouse staff.
     * Final step in transfer leg completion.
     * Updates order status based on whether more transfers are pending.
     *
     * @param legId Transfer leg ID
     * @param warehouseStaffId Staff member who received the goods
     * @param description Optional description or notes
     * @return Updated transfer leg
     */
    public WarehouseTransferLeg markLegReceived(int legId, Integer warehouseStaffId, String description) {
        Optional<WarehouseTransferLeg> legOpt = warehouseTransferLegRepository.findById(legId);
        
        if (legOpt.isEmpty()) {
            return null;
        }

        WarehouseTransferLeg leg = legOpt.get();
        leg.setStatus("RECEIVED");
        leg.setReceivedAt(LocalDateTime.now());
        leg.setReceivedByWarehouseStaffId(warehouseStaffId);
        if (description != null) {
            leg.setDescription(description);
        }

        WarehouseTransferLeg updated = warehouseTransferLegRepository.save(leg);

        Order order = leg.getOrder();
        Warehouse receivedAtWarehouse = leg.getToWarehouse();

        // Check if there are more pending transfers for this order
        List<WarehouseTransferLeg> allLegs = warehouseTransferLegRepository.findByOrderOrderByLegSequence(order);
        boolean hasMoreTransfers = allLegs.stream()
            .anyMatch(l -> !l.getStatus().equals("RECEIVED") && l.getId() != legId);

        if (hasMoreTransfers) {
            // More transfers pending, update status to reflect we're at intermediate hub
            order.setCurrentCity(receivedAtWarehouse.getCity());
            order.setInIntermediateHub(true);
            orderRepository.save(order);

            orderTrackingService.logOrderStatusChange(
                order.getId(),
                "ARRIVED_AT_INTERMEDIATE_HUB",
                receivedAtWarehouse.getCity(),
                "Order received at " + receivedAtWarehouse.getCity() + " warehouse. Next transfer in progress."
            );
        } else {
            // All transfers completed, now at destination warehouse
            order.setCurrentCity(receivedAtWarehouse.getCity());
            order.setInIntermediateHub(false);
            order.setDestinationWarehouse(receivedAtWarehouse);
            order.setTrackingStatus(com.example.ekart.dto.TrackingStatus.ARRIVED_AT_DESTINATION_HUB);
            orderRepository.save(order);

            orderTrackingService.logOrderStatusChange(
                order.getId(),
                "ARRIVED_AT_DESTINATION_HUB",
                receivedAtWarehouse.getCity(),
                "Order arrived at destination warehouse. Ready for final delivery assignment."
            );
        }

        return updated;
    }

    /**
     * Gets all pending transfer legs for a specific warehouse (outgoing).
     *
     * @param warehouse Warehouse that is the transfer source
     * @return List of pending transfer legs
     */
    public List<WarehouseTransferLeg> getPendingOutgoingTransfers(Warehouse warehouse) {
        List<String> pendingStatuses = List.of("INITIATED", "IN_TRANSIT", "ARRIVED_AT_DESTINATION");
        return warehouseTransferLegRepository.findPendingTransfersFromWarehouse(warehouse, pendingStatuses);
    }

    /**
     * Gets all transfer legs for an order in sequence.
     *
     * @param orderId Order ID
     * @return List of transfer legs ordered by sequence
     */
    public List<WarehouseTransferLeg> getOrderTransferLegs(int orderId) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return List.of();
        }
        
        return warehouseTransferLegRepository.findByOrderOrderByLegSequence(orderOpt.get());
    }

    /**
     * Gets the current transfer leg an order is on.
     * Returns the first non-RECEIVED leg by sequence.
     *
     * @param orderId Order ID
     * @return Optional containing the current active transfer leg
     */
    public Optional<WarehouseTransferLeg> getCurrentTransferLeg(int orderId) {
        List<WarehouseTransferLeg> legs = getOrderTransferLegs(orderId);
        
        return legs.stream()
            .filter(l -> !l.getStatus().equals("RECEIVED"))
            .findFirst();
    }

    /**
     * Cancels all pending transfer legs for an order.
     * Used if order is cancelled or rejected.
     *
     * @param orderId Order ID
     * @param cancelReason Reason for cancellation
     */
    public void cancelOrderTransfers(int orderId, String cancelReason) {
        List<WarehouseTransferLeg> legs = getOrderTransferLegs(orderId);
        
        for (WarehouseTransferLeg leg : legs) {
            if (!leg.getStatus().equals("RECEIVED")) {
                leg.setStatus("CANCELLED");
                leg.setDescription("Cancelled: " + (cancelReason != null ? cancelReason : "Unknown reason"));
                warehouseTransferLegRepository.save(leg);
            }
        }
    }

    /**
     * Gets count of pending transfers for a warehouse.
     *
     * @param warehouse Warehouse to check
     * @return Count of pending transfers
     */
    public long getPendingTransferCount(Warehouse warehouse) {
        return warehouseTransferLegRepository.countByFromWarehouseAndStatus(warehouse, "IN_TRANSIT");
    }
}

