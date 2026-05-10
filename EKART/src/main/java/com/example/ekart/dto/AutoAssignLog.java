package com.example.ekart.dto;
import java.time.LocalDateTime;

// ================================================================
// NEW FILE: src/main/java/com/example/ekart/dto/AutoAssignLog.java
//
// Purpose:
//   Persistent audit trail of every automatic order assignment.
//   Admin can query this table to see all auto-assignment history,
//   filter by delivery boy, pin code, or date range.
// ================================================================

import jakarta.persistence.*;

@Entity
@Table(name = "auto_assign_log", indexes = {
    @Index(name = "idx_aal_order",    columnList = "order_id"),
    @Index(name = "idx_aal_db",       columnList = "delivery_boy_id"),
    @Index(name = "idx_aal_assigned", columnList = "assigned_at")
})
public class AutoAssignLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "order_id", nullable = false)
    private int orderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_boy_id")
    private DeliveryBoy deliveryBoy;

    @Column(length = 10)
    private String pinCode;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    /** How many active orders the delivery boy had at time of assignment (0-2) */
    @Column(name = "active_orders_at_assignment", nullable = false)
    private int activeOrdersAtAssignment;

    // ── Getters & Setters ─────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getOrderId() { return orderId; }
    public void setOrderId(int orderId) { this.orderId = orderId; }

    public DeliveryBoy getDeliveryBoy() { return deliveryBoy; }
    public void setDeliveryBoy(DeliveryBoy deliveryBoy) { this.deliveryBoy = deliveryBoy; }

    public String getPinCode() { return pinCode; }
    public void setPinCode(String pinCode) { this.pinCode = pinCode; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }

    public int getActiveOrdersAtAssignment() { return activeOrdersAtAssignment; }
    public void setActiveOrdersAtAssignment(int activeOrdersAtAssignment) {
        this.activeOrdersAtAssignment = activeOrdersAtAssignment;
    }
}
