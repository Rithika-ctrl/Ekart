package com.example.ekart.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
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

import com.example.ekart.dto.DeliveryBoy;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.Warehouse;
import com.example.ekart.dto.WarehouseTransferLeg;
import com.example.ekart.service.WarehouseReceivingService;
import com.example.ekart.service.WarehouseRoutingService;
import com.example.ekart.service.WarehouseTransferService;
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

    @Autowired
    private WarehouseReceivingService warehouseReceivingService;

    @Autowired
    private WarehouseRoutingService warehouseRoutingService;

    @Autowired
    private WarehouseTransferService warehouseTransferService;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private WarehouseTransferLegRepository warehouseTransferLegRepository;

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
                "orders", receivingQueue
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
                "orders", prepQueue
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
                "orders", assignQueue
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

            List<WarehouseTransferLeg> transfers = warehouseTransferService.getPendingOutgoingTransfers(warehouse.get());
            
            return ResponseEntity.ok(Map.of(
                "warehouse", warehouse.get().getName(),
                "pending_count", transfers.size(),
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
}
