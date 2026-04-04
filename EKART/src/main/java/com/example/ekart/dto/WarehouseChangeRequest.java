package com.example.ekart.dto;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/WarehouseChangeRequest.java
 *
 * A delivery boy submits a request to move to a different warehouse.
 * Status: PENDING → APPROVED | REJECTED by admin.
 */
@Entity
@Table(name = "warehouse_change_request",
       indexes = { @Index(name = "idx_wcr_db", columnList = "delivery_boy_id") })
public class WarehouseChangeRequest {

    public enum Status { PENDING, APPROVED, REJECTED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_boy_id", nullable = false)
    private DeliveryBoy deliveryBoy;

    /** The warehouse they want to move TO */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_warehouse_id", nullable = false)
    private Warehouse requestedWarehouse;

    /** Why they want to change */
    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false, columnDefinition = "VARCHAR(20) DEFAULT 'PENDING'")
    private Status status;

    /** Admin's note when approving / rejecting */
    @Column(length = 300)
    private String adminNote;

    @Column(nullable = false)
    private LocalDateTime requestedAt;

    @Column(nullable = true)
    private LocalDateTime resolvedAt;

    /** The warehouse they are currently assigned to */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_warehouse_id")
    private Warehouse currentWarehouse;

    // ── Getters & Setters ────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public DeliveryBoy getDeliveryBoy() { return deliveryBoy; }
    public void setDeliveryBoy(DeliveryBoy deliveryBoy) { this.deliveryBoy = deliveryBoy; }

    public Warehouse getRequestedWarehouse() { return requestedWarehouse; }
    public void setRequestedWarehouse(Warehouse requestedWarehouse) { this.requestedWarehouse = requestedWarehouse; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public String getAdminNote() { return adminNote; }
    public void setAdminNote(String adminNote) { this.adminNote = adminNote; }

    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public void setCurrentWarehouse(Warehouse currentWarehouse) {
        this.currentWarehouse = currentWarehouse;
    }
    
    public Warehouse getCurrentWarehouse() {
        return currentWarehouse;
    }
}