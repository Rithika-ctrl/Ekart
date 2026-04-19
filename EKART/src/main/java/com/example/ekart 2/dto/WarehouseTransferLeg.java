package com.example.ekart.dto;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/WarehouseTransferLeg.java
 *
 * Tracks each warehouse-to-warehouse transfer leg for multi-city orders.
 * Example: Order with items from Delhi → Chennai
 * - Leg 1: Delhi Warehouse → Intermediate Hub (Hyderabad)
 * - Leg 2: Intermediate Hub (Hyderabad) → Chennai Warehouse
 * - Leg 3: Chennai Warehouse → Delivery Boy (final delivery)
 *
 * Status progression:
 * INITIATED → IN_TRANSIT → ARRIVED_AT_DESTINATION → RECEIVED
 */
@Entity(name = "warehouse_transfer_leg")
@Table(name = "warehouse_transfer_leg", indexes = {
    @Index(name = "idx_wtl_order", columnList = "order_id"),
    @Index(name = "idx_wtl_status", columnList = "status"),
    @Index(name = "idx_wtl_from_warehouse", columnList = "from_warehouse_id"),
    @Index(name = "idx_wtl_to_warehouse", columnList = "to_warehouse_id")
})
public class WarehouseTransferLeg {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(optional = false)
    @JoinColumn(name = "from_warehouse_id", nullable = false)
    private Warehouse fromWarehouse;

    @ManyToOne(optional = false)
    @JoinColumn(name = "to_warehouse_id", nullable = false)
    private Warehouse toWarehouse;

    @Column(name = "leg_sequence", nullable = false)
    private int legSequence;

    @Column(name = "status", length = 50, nullable = false)
    private String status = "INITIATED";

    @CreationTimestamp
    @Column(name = "initiated_at")
    private LocalDateTime initiatedAt;

    @Column(name = "in_transit_at", nullable = true)
    private LocalDateTime inTransitAt;

    @Column(name = "arrived_at_timestamp", nullable = true)
    private LocalDateTime arrivedAtTimestamp;

    @Column(name = "received_by_warehouse_staff_id", nullable = true)
    private Integer receivedByWarehouseStaffId;

    @Column(name = "received_at", nullable = true)
    private LocalDateTime receivedAt;

    @Column(name = "description", length = 500, nullable = true)
    private String description;

    // ─── Getters & Setters ────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public Warehouse getFromWarehouse() { return fromWarehouse; }
    public void setFromWarehouse(Warehouse fromWarehouse) { this.fromWarehouse = fromWarehouse; }

    public Warehouse getToWarehouse() { return toWarehouse; }
    public void setToWarehouse(Warehouse toWarehouse) { this.toWarehouse = toWarehouse; }

    public int getLegSequence() { return legSequence; }
    public void setLegSequence(int legSequence) { this.legSequence = legSequence; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(LocalDateTime initiatedAt) { this.initiatedAt = initiatedAt; }

    public LocalDateTime getInTransitAt() { return inTransitAt; }
    public void setInTransitAt(LocalDateTime inTransitAt) { this.inTransitAt = inTransitAt; }

    public LocalDateTime getArrivedAtTimestamp() { return arrivedAtTimestamp; }
    public void setArrivedAtTimestamp(LocalDateTime arrivedAtTimestamp) { this.arrivedAtTimestamp = arrivedAtTimestamp; }

    public Integer getReceivedByWarehouseStaffId() { return receivedByWarehouseStaffId; }
    public void setReceivedByWarehouseStaffId(Integer receivedByWarehouseStaffId) { this.receivedByWarehouseStaffId = receivedByWarehouseStaffId; }

    public LocalDateTime getReceivedAt() { return receivedAt; }
    public void setReceivedAt(LocalDateTime receivedAt) { this.receivedAt = receivedAt; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
