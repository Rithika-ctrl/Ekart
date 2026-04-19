package com.example.ekart.controller;
import java.util.Random;
import java.util.Optional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

import com.example.ekart.dto.DeliveryBoy;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.TrackingStatus;
import com.example.ekart.dto.Warehouse;
import com.example.ekart.dto.WarehouseTransferLeg;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.service.WarehouseReceivingService;
import com.example.ekart.service.WarehouseRoutingService;
import com.example.ekart.service.WarehouseTransferService;
import com.example.ekart.repository.DeliveryBoyRepository;
import com.example.ekart.repository.WarehouseRepository;
import com.example.ekart.repository.WarehouseTransferLegRepository;
import com.example.ekart.repository.OrderRepository;

/**
 * LOCATION: src/main/java/com/example/ekart/controller/WarehouseController.java
 *
 * REST APIs for warehouse staff operations:
 * - GET receiving queue (orders to be scanned in)
 * - GET assignment queue (orders ready for delivery boy assignment)
 * - GET transfer queue (pending warehouse-to-warehouse transfers)
 * - POST mark order received
 * - POST prepare order for delivery
 * - POST assign delivery boy to order
 * - GET available delivery boys for assignment
 * - GET transfer leg status
 * - POST mark transfer leg as in-transit/arrived/received
 *
 * Endpoints accessed by: warehouse-dashboard.html (warehouse staff UI)
 */
@RestController
@RequestMapping("/api/warehouse")
public class WarehouseController {

    private static final String ORDERS_KEY = "orders";
    private static final String ROUTING_PATH_KEY = "routingPath";

    // ── Injected dependencies ────────────────────────────────────────────────
    private final WarehouseReceivingService warehouseReceivingService;
    private final WarehouseRoutingService warehouseRoutingService;
    private final WarehouseTransferService warehouseTransferService;
    private final WarehouseRepository warehouseRepository;
    private final OrderRepository orderRepository;
    private final WarehouseTransferLegRepository warehouseTransferLegRepository;
    private final DeliveryBoyRepository deliveryBoyRepository;
    private final EmailSender emailSender;

    public WarehouseController(
            WarehouseReceivingService warehouseReceivingService,
            WarehouseRoutingService warehouseRoutingService,
            WarehouseTransferService warehouseTransferService,
            WarehouseRepository warehouseRepository,
            OrderRepository orderRepository,
            WarehouseTransferLegRepository warehouseTransferLegRepository,
            DeliveryBoyRepository deliveryBoyRepository,
            EmailSender emailSender) {
        this.warehouseReceivingService = warehouseReceivingService;
        this.warehouseRoutingService = warehouseRoutingService;
        this.warehouseTransferService = warehouseTransferService;
        this.warehouseRepository = warehouseRepository;
        this.orderRepository = orderRepository;
        this.warehouseTransferLegRepository = warehouseTransferLegRepository;
        this.deliveryBoyRepository = deliveryBoyRepository;
        this.emailSender = emailSender;
    }










    // ─────────────────────────────────────────────────────────────
    // RECEIVING QUEUE - Orders to scan in
    // ─────────────────────────────────────────────────────────────

    /**
     * GET /api/warehouse/{warehouseId}/receiving-queue
     * Get orders awaiting receiving scan at warehouse.
     *
     * @param warehouseId Warehouse ID
     * @return List of orders in receiving queue
     */
    @GetMapping("/{warehouseId}/receiving-queue")
    public ResponseEntity<?> getReceivingQueue(@PathVariable int warehouseId) {
        try {
            Optional<Warehouse> warehouse = warehouseRepository.findById(warehouseId);
            if (warehouse.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Warehouse not found"));
            }

            List<Order> receivingQueue = warehouseReceivingService.getReceivingQueue(warehouseId);
            
            return ResponseEntity.ok(Map.of(
                "warehouse", warehouse.get().getName(),
                "queue_count", receivingQueue.size(),
                ORDERS_KEY, receivingQueue
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/warehouse/{warehouseId}/order/{orderId}/receive
     * Mark an order as received at warehouse.
     *
     * @param warehouseId Warehouse ID
     * @param orderId Order ID
     * @param description Optional receiving notes
     * @return Updated order or error
     */
    @PostMapping("/{warehouseId}/order/{orderId}/receive")
    public ResponseEntity<?> markOrderReceived(
            @PathVariable int warehouseId,
            @PathVariable int orderId,
            @RequestParam(required = false) String description) {
        try {
            Order updated = warehouseReceivingService.markOrderAsWarehouseReceived(
                orderId, warehouseId, description
            );

            if (updated == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Failed to mark order as received"));
            }

            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Order marked as received",
                "order", updated
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // PREPARATION QUEUE - Orders awaiting preparation
    // ─────────────────────────────────────────────────────────────

    /**
     * GET /api/warehouse/{warehouseId}/preparation-queue
     * Get orders awaiting preparation at warehouse.
     *
     * @param warehouseId Warehouse ID
     * @return List of orders in preparation queue
     */
    @GetMapping("/{warehouseId}/preparation-queue")
    public ResponseEntity<?> getPreparationQueue(@PathVariable int warehouseId) {
        try {
            Optional<Warehouse> warehouse = warehouseRepository.findById(warehouseId);
            if (warehouse.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Warehouse not found"));
            }

            List<Order> prepQueue = warehouseReceivingService.getOrdersAwaitingPreparation(warehouseId);
            
            return ResponseEntity.ok(Map.of(
                "warehouse", warehouse.get().getName(),
                "queue_count", prepQueue.size(),
                ORDERS_KEY, prepQueue
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/warehouse/{warehouseId}/order/{orderId}/prepare
     * Mark an order as prepared for delivery.
     *
     * @param warehouseId Warehouse ID
     * @param orderId Order ID
     * @param description Optional preparation notes
     * @return Updated order or error
     */
    @PostMapping("/{warehouseId}/order/{orderId}/prepare")
    public ResponseEntity<?> markOrderPrepared(
            @PathVariable int warehouseId,
            @PathVariable int orderId,
            @RequestParam(required = false) String description) {
        try {
            Order updated = warehouseReceivingService.markOrderPreparedForDelivery(orderId, description);

            if (updated == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Failed to prepare order. Check order status."));
            }

            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Order prepared for delivery",
                "order", updated
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ASSIGNMENT QUEUE - Ready for delivery assignment
    // ─────────────────────────────────────────────────────────────

    /**
     * GET /api/warehouse/{warehouseId}/assignment-queue
     * Get orders ready for delivery boy assignment.
     *
     * @param warehouseId Warehouse ID
     * @return List of orders in assignment queue
     */
    @GetMapping("/{warehouseId}/assignment-queue")
    public ResponseEntity<?> getAssignmentQueue(@PathVariable int warehouseId) {
        try {
            Optional<Warehouse> warehouse = warehouseRepository.findById(warehouseId);
            if (warehouse.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Warehouse not found"));
            }

            List<Order> assignQueue = warehouseReceivingService.getOrdersReadyForDelivery(warehouseId);
            
            return ResponseEntity.ok(Map.of(
                "warehouse", warehouse.get().getName(),
                "queue_count", assignQueue.size(),
                ORDERS_KEY, assignQueue
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/warehouse/{warehouseId}/available-delivery-boys
     * Get available delivery boys for manual assignment.
     *
     * @param warehouseId Warehouse ID
     * @return List of available delivery boys with current load
     */
    @GetMapping("/{warehouseId}/available-delivery-boys")
    public ResponseEntity<?> getAvailableDeliveryBoys(@PathVariable int warehouseId) {
        try {
            Optional<Warehouse> warehouse = warehouseRepository.findById(warehouseId);
            if (warehouse.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Warehouse not found"));
            }

            List<DeliveryBoy> boys = warehouseReceivingService.getAvailableDeliveryBoys(warehouseId);
            
            // Enhance with current load for each delivery boy
            List<Map<String, Object>> boysWithLoad = new ArrayList<>();
            for (DeliveryBoy boy : boys) {
                int load = warehouseReceivingService.getDeliveryBoyCurrentLoad(boy.getId());
                boysWithLoad.add(Map.of(
                    "id", boy.getId(),
                    "name", boy.getName(),
                    "email", boy.getEmail(),
                    "mobile", boy.getMobile(),
                    "current_load", load,
                    "is_available", boy.isAvailable()
                ));
            }

            return ResponseEntity.ok(Map.of(
                "warehouse", warehouse.get().getName(),
                "available_count", boys.size(),
                "delivery_boys", boysWithLoad
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/warehouse/{warehouseId}/order/{orderId}/assign-delivery-boy
     * Assign a delivery boy to an order manually (warehouse staff decides).
     * Request body: { "delivery_boy_id": 5, "warehouse_staff_id": 10, "notes": "..." }
     *
     * @param warehouseId Warehouse ID
     * @param orderId Order ID
     * @param request Assignment request with delivery_boy_id
     * @return Updated order or error
     */
    @PostMapping("/{warehouseId}/order/{orderId}/assign-delivery-boy")
    public ResponseEntity<?> assignDeliveryBoy(
            @PathVariable int warehouseId,
            @PathVariable int orderId,
            @RequestBody Map<String, Object> request) {
        try {
            Integer deliveryBoyId = ((Number) request.get("delivery_boy_id")).intValue();
            Integer staffId = request.get("warehouse_staff_id") != null 
                ? ((Number) request.get("warehouse_staff_id")).intValue() 
                : null;
            String notes = (String) request.get("notes");

            Order updated = warehouseReceivingService.assignDeliveryBoy(
                orderId, deliveryBoyId, staffId, notes
            );

            if (updated == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Failed to assign delivery boy. Check order status and delivery boy availability."));
            }

            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Delivery boy assigned successfully",
                "order", updated
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // TRANSFER MANAGEMENT - Warehouse-to-warehouse transfers
    // ─────────────────────────────────────────────────────────────

    /**
     * GET /api/warehouse/{warehouseId}/transfer-queue
     * Get pending outgoing transfer legs from this warehouse.
     *
     * @param warehouseId Warehouse ID
     * @return List of pending transfer legs
     */
    @GetMapping("/{warehouseId}/transfer-queue")
    public ResponseEntity<?> getTransferQueue(@PathVariable int warehouseId) {
        try {
            Optional<Warehouse> warehouse = warehouseRepository.findById(warehouseId);
            if (warehouse.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Warehouse not found"));
            }

            // Get pending transfer legs from this warehouse
            List<WarehouseTransferLeg> transfers = warehouseTransferService.getPendingOutgoingTransfers(warehouse.get());
            
            // Extract unique orders and format for frontend display
            List<Map<String, Object>> orders = transfers.stream()
                .map(WarehouseTransferLeg::getOrder)
                .distinct()
                .map(order -> {
                    Map<String, Object> o = new LinkedHashMap<>();
                    o.put("id", order.getId());
                    o.put("customerName", order.getCustomer() != null ? order.getCustomer().getName() : "Unknown");
                    o.put("trackingStatus", order.getTrackingStatus().getDisplayName());
                    o.put("deliveryPinCode", order.getDeliveryPinCode());
                    o.put("totalPrice", order.getTotalPrice());
                    o.put("paymentMethod", order.getPaymentMethod());
                    o.put("sourceWarehouse", order.getSourceWarehouse() != null ? order.getSourceWarehouse().getCity() : "");
                    o.put("destinationWarehouse", order.getDestinationWarehouse() != null ? order.getDestinationWarehouse().getCity() : "");
                    o.put(ROUTING_PATH_KEY, order.getWarehouseRoutingPath());
                    return o;
                })
                .toList();
            
            return ResponseEntity.ok(Map.of(
                "warehouse", warehouse.get().getName(),
                "pending_count", orders.size(),
                ORDERS_KEY, orders,
                "transfers", transfers
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/warehouse/transfer-leg/{legId}
     * Get details of a specific transfer leg.
     *
     * @param legId Transfer leg ID
     * @return Transfer leg details
     */
    @GetMapping("/transfer-leg/{legId}")
    public ResponseEntity<?> getTransferLegDetails(@PathVariable int legId) {
        try {
            Optional<WarehouseTransferLeg> legOpt = warehouseTransferLegRepository.findById(legId);
            
            if (legOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Transfer leg not found"));
            }

            return ResponseEntity.ok(Map.of(
                "status", "success",
                "transfer_leg", legOpt.get()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/warehouse/transfer-leg/{legId}/mark-in-transit
     * Mark transfer leg as in-transit (handed over to transport).
     *
     * @param legId Transfer leg ID
     * @param request Optional tracking number or description
     * @return Updated transfer leg
     */
    @PostMapping("/transfer-leg/{legId}/mark-in-transit")
    public ResponseEntity<?> markTransferLegInTransit(
            @PathVariable int legId,
            @RequestBody(required = false) Map<String, String> request) {
        try {
            String description = request != null ? request.get("description") : null;
            
            WarehouseTransferLeg updated = warehouseTransferService.markLegInTransit(legId, description);

            if (updated == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Failed to mark transfer leg as in-transit"));
            }

            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Transfer leg marked as in-transit",
                "transfer_leg", updated
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/warehouse/transfer-leg/{legId}/mark-arrived
     * Mark transfer leg as arrived at destination.
     *
     * @param legId Transfer leg ID
     * @param request Optional notes
     * @return Updated transfer leg
     */
    @PostMapping("/transfer-leg/{legId}/mark-arrived")
    public ResponseEntity<?> markTransferLegArrived(
            @PathVariable int legId,
            @RequestBody(required = false) Map<String, String> request) {
        try {
            String description = request != null ? request.get("description") : null;
            
            WarehouseTransferLeg updated = warehouseTransferService.markLegArrived(legId, description);

            if (updated == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Failed to mark transfer leg as arrived"));
            }

            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Transfer leg marked as arrived",
                "transfer_leg", updated
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/warehouse/transfer-leg/{legId}/mark-received
     * Mark transfer leg as received by warehouse staff (final step).
     * Request body: { "warehouse_staff_id": 5, "description": "..." }
     *
     * @param legId Transfer leg ID
     * @param request Staff ID and optional description
     * @return Updated transfer leg
     */
    @PostMapping("/transfer-leg/{legId}/mark-received")
    public ResponseEntity<?> markTransferLegReceived(
            @PathVariable int legId,
            @RequestBody Map<String, Object> request) {
        try {
            Integer staffId = request.get("warehouse_staff_id") != null 
                ? ((Number) request.get("warehouse_staff_id")).intValue() 
                : null;
            String description = (String) request.get("description");
            
            WarehouseTransferLeg updated = warehouseTransferService.markLegReceived(legId, staffId, description);

            if (updated == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Failed to mark transfer leg as received"));
            }

            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Transfer leg marked as received",
                "transfer_leg", updated
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/warehouse/order/{orderId}/transfer-legs
     * Get all transfer legs for an order with their current status.
     *
     * @param orderId Order ID
     * @return List of transfer legs with details
     */
    @GetMapping("/order/{orderId}/transfer-legs")
    public ResponseEntity<?> getOrderTransferLegs(@PathVariable int orderId) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Order not found"));
            }

            List<WarehouseTransferLeg> legs = warehouseTransferService.getOrderTransferLegs(orderId);

            return ResponseEntity.ok(Map.of(
                "order_id", orderId,
                "leg_count", legs.size(),
                "transfer_legs", legs
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // HUB TRANSIT ENDPOINTS - Multi-warehouse order routing
    // ─────────────────────────────────────────────────────────────

    /**
     * TASK 1: Prepare for Hub Transit
     * POST /api/warehouse/orders/{orderId}/prepare-transit
     * 
     * After warehouse receives an order (WAREHOUSE_RECEIVED), mark it as
     * PREPARED_FOR_HUB_TRANSIT so it can be dispatched to next hub.
     */
    @PostMapping("/orders/{orderId}/prepare-transit")
    public ResponseEntity<?> prepareForTransit(
            @PathVariable int orderId,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute("warehouseId");
            if (warehouseId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
            }

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Order not found"));
            }

            Order order = orderOpt.get();
            if (order.getTrackingStatus() != TrackingStatus.WAREHOUSE_RECEIVED) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Order must be WAREHOUSE_RECEIVED", 
                                 "current_status", order.getTrackingStatus()));
            }

            order.setTrackingStatus(TrackingStatus.PREPARED_FOR_HUB_TRANSIT);
            orderRepository.save(order);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "PREPARED_FOR_HUB_TRANSIT",
                "orderId", orderId
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * TASK 2: Mark In-Transit
     * POST /api/warehouse/orders/{orderId}/mark-in-transit
     * 
     * Warehouse staff marks order as dispatched (in-transit to next hub).
     * Status changes: PREPARED_FOR_HUB_TRANSIT → IN_HUB_TRANSIT
     */
    @PostMapping("/orders/{orderId}/mark-in-transit")
    public ResponseEntity<?> markInTransit(
            @PathVariable int orderId,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute("warehouseId");
            if (warehouseId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
            }

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Order not found"));
            }

            Order order = orderOpt.get();
            if (order.getTrackingStatus() != TrackingStatus.PREPARED_FOR_HUB_TRANSIT) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Order must be PREPARED_FOR_HUB_TRANSIT",
                                 "current_status", order.getTrackingStatus()));
            }

            order.setTrackingStatus(TrackingStatus.IN_HUB_TRANSIT);
            orderRepository.save(order);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "IN_HUB_TRANSIT",
                "orderId", orderId,
                ROUTING_PATH_KEY, order.getWarehouseRoutingPath()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * TASK 3: Mark Arrived at Intermediate/Destination Hub
     * POST /api/warehouse/orders/{orderId}/mark-arrived-intermediate
     * 
     * When order arrives at a hub, check if it's intermediate or final destination:
     * - Intermediate hub → ARRIVED_AT_INTERMEDIATE_HUB (for continued transfer)
     * - Final destination → ARRIVED_AT_DESTINATION_HUB (ready for delivery assignment)
     */
    @PostMapping("/orders/{orderId}/mark-arrived-intermediate")
    public ResponseEntity<?> markArrivedIntermediate(
            @PathVariable int orderId,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute("warehouseId");
            if (warehouseId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
            }

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Order not found"));
            }

            Order order = orderOpt.get();
            if (order.getTrackingStatus() != TrackingStatus.IN_HUB_TRANSIT) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Order must be IN_HUB_TRANSIT",
                                 "current_status", order.getTrackingStatus()));
            }

            // Check if this warehouse is the final destination
            boolean isFinalDestination = order.getDestinationWarehouse() != null &&
                order.getDestinationWarehouse().getId() == warehouseId;

            if (isFinalDestination) {
                order.setTrackingStatus(TrackingStatus.ARRIVED_AT_DESTINATION_HUB);
                orderRepository.save(order);
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "status", "ARRIVED_AT_DESTINATION_HUB",
                    "orderId", orderId,
                    "message", "Order ready for delivery assignment"
                ));
            } else {
                order.setTrackingStatus(TrackingStatus.ARRIVED_AT_INTERMEDIATE_HUB);
                orderRepository.save(order);
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "status", "ARRIVED_AT_INTERMEDIATE_HUB",
                    "orderId", orderId,
                    "message", "Mark for continued transit to destination"
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * TASK 4: Assignment Queue
     * GET /api/warehouse/assignment-queue
     * 
     * Get orders ready for delivery boy assignment at this destination warehouse.
     * Only returns orders with status ARRIVED_AT_DESTINATION_HUB.
     */
    @GetMapping("/assignment-queue")
    public ResponseEntity<?> warehouseAssignmentQueue(HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute("warehouseId");
            if (warehouseId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
            }

            List<Order> queue = orderRepository.findByDestinationWarehouseIdAndTrackingStatus(
                warehouseId, TrackingStatus.ARRIVED_AT_DESTINATION_HUB);

            List<Map<String, Object>> result = queue.stream().map(o -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", o.getId());
                m.put("status", o.getTrackingStatus().getDisplayName());
                m.put("deliveryPinCode", o.getDeliveryPinCode());
                m.put("deliveryAddress", o.getDeliveryAddress());
                m.put("customerName", o.getCustomer() != null ? o.getCustomer().getName() : "");
                m.put("customerEmail", o.getCustomer() != null ? o.getCustomer().getEmail() : "");
                m.put("totalPrice", o.getTotalPrice());
                m.put("paymentMethod", o.getPaymentMethod());
                m.put(ROUTING_PATH_KEY, o.getWarehouseRoutingPath());
                return m;
            }).toList();

            return ResponseEntity.ok(Map.of(
                "count", result.size(),
                ORDERS_KEY, result
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * TASK 5: Get Available Delivery Boys for Pin Code
     * GET /api/warehouse/delivery-boys
     * 
     * Fetch delivery boys who serve the specified pin code at this warehouse.
     * Warehouse staff uses this to select which boy to assign for delivery.
     */
    @GetMapping("/delivery-boys")
    public ResponseEntity<?> getDeliveryBoysForPinCode(
            @RequestParam String pinCode,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute("warehouseId");
            if (warehouseId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
            }

            Optional<Warehouse> whOpt = warehouseRepository.findById(warehouseId);
            if (whOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Warehouse not found"));
            }

            Warehouse wh = whOpt.get();

            // Verify this warehouse serves this pin code
            if (wh.getServedPinCodes() != null && 
                !Arrays.asList(wh.getServedPinCodes().split(",")).stream()
                    .map(String::trim)
                    .toList()
                    .contains(pinCode.trim())) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Pin code " + pinCode + " is not served by this warehouse"));
            }

            // Find all active + admin-approved delivery boys
            List<DeliveryBoy> allBoys = deliveryBoyRepository.findByActiveTrueAndAdminApprovedTrue();

            // Filter to boys who serve this pin code
            List<Map<String, Object>> boys = allBoys.stream()
                .filter(b -> b.getAssignedPinCodes() != null &&
                    Arrays.asList(b.getAssignedPinCodes().split(",")).stream()
                        .map(String::trim)
                        .toList()
                        .contains(pinCode.trim()))
                .map(b -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", b.getId());
                    m.put("name", b.getName());
                    m.put("mobile", b.getMobile());
                    m.put("assignedPinCodes", b.getAssignedPinCodes());
                    return m;
                })
                .toList();

            return ResponseEntity.ok(Map.of(
                "pinCode", pinCode,
                "availableBoys", boys,
                "count", boys.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * TASK 6: Assign Delivery Boy + Send OTP to Customer
     * POST /api/warehouse/orders/{orderId}/assign-delivery-boy
     * 
     * Assign a delivery boy to order and send 6-digit OTP to customer email.
     * Status changes: ARRIVED_AT_DESTINATION_HUB → SHIPPED
     * Request body: { "deliveryBoyId": 5 }
     */
    @PostMapping("/orders/{orderId}/assign-delivery-boy")
    public ResponseEntity<?> assignDeliveryBoy(
            @PathVariable int orderId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        try {
            Integer warehouseId = (Integer) request.getAttribute("warehouseId");
            if (warehouseId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
            }

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Order not found"));
            }

            Order order = orderOpt.get();
            if (order.getTrackingStatus() != TrackingStatus.ARRIVED_AT_DESTINATION_HUB) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Order not ready for delivery boy assignment",
                                 "current_status", order.getTrackingStatus()));
            }

            if (body.get("deliveryBoyId") == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "deliveryBoyId is required"));
            }

            int deliveryBoyId = Integer.parseInt(body.get("deliveryBoyId").toString());

            Optional<DeliveryBoy> boyOpt = deliveryBoyRepository.findById(deliveryBoyId);
            if (boyOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Delivery boy not found"));
            }

            DeliveryBoy boy = boyOpt.get();

            // Assign delivery boy
            order.setDeliveryBoy(boy);
            order.setFinalDeliveryBoyId(deliveryBoyId);
            order.setTrackingStatus(TrackingStatus.SHIPPED);

            // Generate 6-digit OTP for delivery confirmation
            String otp = String.format("%06d", new Random().nextInt(1000000));
            order.setDeliveryOtp(otp);
            order.setDeliveryOtpVerified(false);

            orderRepository.save(order);

            // Send OTP to customer via email (async)
            try {
                if (order.getCustomer() != null) {
                    String customerEmail = order.getCustomer().getEmail();
                    String customerName = order.getCustomer().getName();
                    emailSender.sendDeliveryOtp(customerEmail, customerName, otp, order.getId());
                }
            } catch (Exception e) {
                System.err.println("Failed to send OTP email: " + e.getMessage());
                // Don't fail the request if email sending fails
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "orderId", orderId,
                "deliveryBoyName", boy.getName(),
                "deliveryBoyId", boy.getId(),
                "status", "SHIPPED",
                "message", "Delivery OTP sent to customer email"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }
}

