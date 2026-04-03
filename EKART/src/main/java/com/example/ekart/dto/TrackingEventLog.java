package com.example.ekart.dto;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/TrackingEventLog.java
 *
 * NEW FILE — copy as-is into that location.
 *
 * Records every real status change that happens to an order.
 * One row inserted each time the order moves to a new stage.
 * This replaces the fake time-based history in OrderTrackingService.
 *
 * Who inserts rows:
 *   PROCESSING       → auto on order save        (CustomerService.paymentSuccess)
 *   PACKED           → vendor clicks "Packed"    (VendorService.markOrderReady)
 *   SHIPPED          → admin assigns delivery boy (DeliveryAdminService.assignDeliveryBoy)
 *   OUT_FOR_DELIVERY → delivery boy picks up     (DeliveryBoyService.markPickedUp)
 *   DELIVERED        → delivery boy enters OTP   (DeliveryBoyService.confirmDelivery)
 *   CANCELLED        → customer cancels          (CustomerService.cancelOrder)
 */
@Entity
@Table(name = "tracking_event_log",
       indexes = { @Index(name = "idx_tel_order", columnList = "order_id") })
public class TrackingEventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    /** The order this event belongs to */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /** The tracking status at this point */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TrackingStatus status;

    /** Human-readable location — e.g. "Chennai Warehouse" */
    @Column(length = 200)
    private String city;

    /** Description shown on tracking page — e.g. "Packed by vendor" */
    @Column(length = 500)
    private String description;

    /**
     * Who triggered this event.
     * Values: "system" | "vendor" | "admin" | "delivery_boy"
     */
    @Column(name = "updated_by", length = 50)
    private String updatedBy;

    /** Exact timestamp this event happened */
    @Column(name = "event_time", nullable = false)
    private LocalDateTime eventTime;

    // ── Constructors ──────────────────────────────────────────────

    public TrackingEventLog() {}

    public TrackingEventLog(Order order, TrackingStatus status,
                             String city, String description, String updatedBy) {
        this.order       = order;
        this.status      = status;
        this.city        = city;
        this.description = description;
        this.updatedBy   = updatedBy;
        this.eventTime   = LocalDateTime.now();
    }

    // ── Getters & Setters ─────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public TrackingStatus getStatus() { return status; }
    public void setStatus(TrackingStatus status) { this.status = status; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public LocalDateTime getEventTime() { return eventTime; }
    public void setEventTime(LocalDateTime eventTime) { this.eventTime = eventTime; }
}
