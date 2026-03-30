package com.example.ekart.dto;

// ================================================================
// LOCATION: src/main/java/com/example/ekart/dto/ScheduledOrder.java
// ================================================================

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Represents a customer's recurring delivery schedule.
 *
 * A ScheduledOrder fires automatically each time nextDeliveryDate == today,
 * creating a real Order via ScheduledOrderService.processDueOrders().
 *
 * frequencyType = DAILY        → deliver every day (frequencyValue = 1)
 * frequencyType = EVERY_N_DAYS → deliver every N days (frequencyValue = N)
 *
 * durationDays = null          → run forever until customer cancels
 * durationDays = N             → auto-complete after N calendar days from startDate
 */
@Entity
@Table(name = "scheduled_orders", indexes = {
    @Index(name = "idx_so_customer",  columnList = "customer_id"),
    @Index(name = "idx_so_next_date", columnList = "next_delivery_date"),
    @Index(name = "idx_so_status",    columnList = "status")
})
public class ScheduledOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Relationships ─────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "address_id", nullable = false)
    private Address address;

    // ── Order configuration ───────────────────────────────────────────────────

    @Column(nullable = false)
    private int quantity = 1;

    /** COD or ONLINE_AUTOPAY */
    @Column(name = "payment_mode", nullable = false, length = 20)
    private String paymentMode = "COD";

    // ── Frequency ─────────────────────────────────────────────────────────────

    /** DAILY | EVERY_N_DAYS */
    @Column(name = "frequency_type", nullable = false, length = 20)
    private String frequencyType = "DAILY";

    /** For DAILY = 1; for EVERY_N_DAYS = the interval in days */
    @Column(name = "frequency_value", nullable = false)
    private int frequencyValue = 1;

    // ── Duration ──────────────────────────────────────────────────────────────

    /**
     * Number of calendar days from startDate after which the schedule
     * auto-completes. NULL = run forever until cancelled by customer.
     */
    @Column(name = "duration_days")
    private Integer durationDays;

    // ── Dates ─────────────────────────────────────────────────────────────────

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "next_delivery_date", nullable = false)
    private LocalDate nextDeliveryDate;

    // ── Status & counters ─────────────────────────────────────────────────────

    /**
     * ACTIVE     → running normally
     * PAUSED     → customer paused; scheduler skips
     * COMPLETED  → duration elapsed
     * CANCELLED  → customer cancelled
     */
    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "total_deliveries", nullable = false)
    private int totalDeliveries = 0;

    // ── Audit ─────────────────────────────────────────────────────────────────

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Computed helpers ──────────────────────────────────────────────────────

    /** How many deliveries remain. Returns null if duration is infinite. */
    public Integer getRemainingDeliveries() {
        if (durationDays == null) return null;
        int total = durationDays / frequencyValue;
        return Math.max(0, total - totalDeliveries);
    }

    /** Whether this schedule has passed its configured end date. */
    public boolean isDurationExceeded() {
        if (durationDays == null) return false;
        return !LocalDate.now().isBefore(startDate.plusDays(durationDays));
    }

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public Address getAddress() { return address; }
    public void setAddress(Address address) { this.address = address; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }

    public String getFrequencyType() { return frequencyType; }
    public void setFrequencyType(String frequencyType) { this.frequencyType = frequencyType; }

    public int getFrequencyValue() { return frequencyValue; }
    public void setFrequencyValue(int frequencyValue) { this.frequencyValue = frequencyValue; }

    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getNextDeliveryDate() { return nextDeliveryDate; }
    public void setNextDeliveryDate(LocalDate d) { this.nextDeliveryDate = d; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getTotalDeliveries() { return totalDeliveries; }
    public void setTotalDeliveries(int totalDeliveries) { this.totalDeliveries = totalDeliveries; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}