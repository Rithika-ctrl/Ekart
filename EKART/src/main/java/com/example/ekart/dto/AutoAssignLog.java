package com.example.ekart.dto;

// ================================================================
// NEW FILE: src/main/java/com/example/ekart/dto/AutoAssignLog.java
//
// Purpose:
//   Persistent audit trail of every automatic order assignment.
//   Admin can query this table to see all auto-assignment history,
//   filter by delivery boy, pin code, or date range.
// ================================================================

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auto_assign_log", indexes = {
    @Index(name = "idx_aal_order",    columnList = "orderId"),
    @Index(name = "idx_aal_db",       columnList = "deliveryBoyId"),
    @Index(name = "idx_aal_assigned", columnList = "assignedAt")
})
public class AutoAssignLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false)
    private int orderId;

    @Column(nullable = false)
    private int deliveryBoyId;

    @Column(nullable = false, length = 100)
    private String deliveryBoyName;

    @Column(nullable = false, length = 20)
    private String deliveryBoyCode;

    @Column(length = 10)
    private String pinCode;

    @Column(nullable = false)
    private LocalDateTime assignedAt;

    /** How many active orders the delivery boy had at time of assignment (0-2) */
    @Column(nullable = false)
    private int activeOrdersAtAssignment;

    // ── Getters & Setters ─────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getOrderId() { return orderId; }
    public void setOrderId(int orderId) { this.orderId = orderId; }

    public int getDeliveryBoyId() { return deliveryBoyId; }
    public void setDeliveryBoyId(int deliveryBoyId) { this.deliveryBoyId = deliveryBoyId; }

    public String getDeliveryBoyName() { return deliveryBoyName; }
    public void setDeliveryBoyName(String deliveryBoyName) { this.deliveryBoyName = deliveryBoyName; }

    public String getDeliveryBoyCode() { return deliveryBoyCode; }
    public void setDeliveryBoyCode(String deliveryBoyCode) { this.deliveryBoyCode = deliveryBoyCode; }

    public String getPinCode() { return pinCode; }
    public void setPinCode(String pinCode) { this.pinCode = pinCode; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }

    public int getActiveOrdersAtAssignment() { return activeOrdersAtAssignment; }
    public void setActiveOrdersAtAssignment(int activeOrdersAtAssignment) {
        this.activeOrdersAtAssignment = activeOrdersAtAssignment;
    }
}