package com.example.ekart.dto;
import java.util.Optional;
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
import jakarta.persistence.UniqueConstraint;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/SettlementOrderMapping.java
 *
 * Junction table that links orders to cash settlements.
 * A settlement batch can contain multiple COD orders, each contributing
 * a specific amount to the total settlement.
 *
 * Example:
 * - Settlement #S001 contains Orders {10, 12, 15, 18}
 * - Order 10: ₹500 (COD amount)
 * - Order 12: ₹800 (COD amount)
 * - Order 15: ₹300 (COD amount)
 * - Order 18: ₹400 (COD amount)
 * Total: ₹2000 (with 20% admin commission = ₹400, vendor gets ₹1600)
 */
@Entity(name = "settlement_order_mapping")
@Table(name = "settlement_order_mapping", 
    indexes = {
        @Index(name = "idx_som_settlement", columnList = "settlement_id"),
        @Index(name = "idx_som_order", columnList = "order_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"settlement_id", "order_id"}, name = "uk_settlement_order")
    }
)
public class SettlementOrderMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "settlement_id", nullable = false)
    private CashSettlement settlement;

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "amount_collected", nullable = false, columnDefinition = "FLOAT8")
    private double amountCollected;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // ─── Getters & Setters ────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public CashSettlement getSettlement() { return settlement; }
    public void setSettlement(CashSettlement settlement) { this.settlement = settlement; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public double getAmountCollected() { return amountCollected; }
    public void setAmountCollected(double amountCollected) { this.amountCollected = amountCollected; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    // ─── Convenience Methods ──────────────────────────────────────

    /**
     * Get settlement ID from the linked settlement.
     */
    public int getSettlementId() {
        return settlement != null ? settlement.getId() : -1;
    }

    /**
     * Get vendor ID from the linked order's vendor.
     */
    public int getVendorId() {
        return order != null && order.getVendor() != null ? order.getVendor().getId() : -1;
    }

    /**
     * Get order amount (same as amountCollected).
     */
    @SuppressWarnings("java:S4144")
    public double getOrderAmount() {
        return amountCollected;
    }

    /**
     * Get order ID from the linked order.
     */
    public int getOrderId() {
        return order != null ? order.getId() : -1;
    }

    /**
     * Set settlement by ID (for convenience).
     * Note: Prefer using setSettlement() with actual entity.
     */
    public void setSettlementId(int settlementId) {
        if (settlementId > 0) {
            CashSettlement cs = new CashSettlement();
            cs.setId(settlementId);
            this.settlement = cs;
        }
    }

    /**
     * Set order by ID (for convenience).
     * Note: Prefer using setOrder() with actual entity.
     */
    public void setOrderId(int orderId) {
        if (orderId > 0) {
            Order o = new Order();
            o.setId(orderId);
            this.order = o;
        }
    }

    /**
     * Set order amount.
     * Alias for setAmountCollected().
     */
    public void setOrderAmount(Double amount) {
        if (amount != null) {
            this.amountCollected = amount;
        }
    }

    /**
     * Set vendor ID (ignored - vendor comes from order).
     */
    public void setVendorId(int vendorId) {
        // Vendor ID is derived from order.vendor, so this is a no-op
        // But we keep it for API compatibility
    }
}

