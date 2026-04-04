package com.example.ekart.dto;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 200)
    private String description;

    // PERCENT = percentage off, FLAT = fixed rupee off
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CouponType type = CouponType.PERCENT;

    // value: 10 = 10% off (if PERCENT) or ₹10 off (if FLAT)
    private double value;

    // Minimum order amount to use this coupon
    @Column(columnDefinition = "FLOAT8 DEFAULT 0")
    private double minOrderAmount = 0;

    // Max discount cap (0 = no cap)
    @Column(columnDefinition = "FLOAT8 DEFAULT 0")
    private double maxDiscount = 0;

    // Usage limit (0 = unlimited)
    @Column(columnDefinition = "INT4 DEFAULT 0")
    private int usageLimit = 0;

    // How many times it has been used
    @Column(columnDefinition = "INT4 DEFAULT 0")
    private int usedCount = 0;

    private boolean active = true;

    private LocalDate expiryDate;

    public enum CouponType { PERCENT, FLAT }

    // ── Getters & Setters ──
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code != null ? code.toUpperCase().trim() : null; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public CouponType getType() { return type; }
    public void setType(CouponType type) { this.type = type; }
    public double getValue() { return value; }
    public void setValue(double value) { this.value = value; }
    public double getMinOrderAmount() { return minOrderAmount; }
    public void setMinOrderAmount(double minOrderAmount) { this.minOrderAmount = minOrderAmount; }
    public double getMaxDiscount() { return maxDiscount; }
    public void setMaxDiscount(double maxDiscount) { this.maxDiscount = maxDiscount; }
    public int getUsageLimit() { return usageLimit; }
    public void setUsageLimit(int usageLimit) { this.usageLimit = usageLimit; }
    public int getUsedCount() { return usedCount; }
    public void setUsedCount(int usedCount) { this.usedCount = usedCount; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    // Computed: is this coupon currently valid?
    public boolean isValid() {
        if (!active) return false;
        if (expiryDate != null && LocalDate.now().isAfter(expiryDate)) return false;
        if (usageLimit > 0 && usedCount >= usageLimit) return false;
        return true;
    }

    // Calculate discount for a given order amount
    public double calculateDiscount(double orderAmount) {
        if (!isValid() || orderAmount < minOrderAmount) return 0;
        double discount;
        if (type == CouponType.PERCENT) {
            discount = orderAmount * value / 100.0;
        } else {
            discount = value;
        }
        if (maxDiscount > 0) discount = Math.min(discount, maxDiscount);
        return Math.min(discount, orderAmount);
    }

    // Display string for type
    public String getTypeLabel() {
        return type == CouponType.PERCENT ? value + "% off" : "₹" + (int)value + " off";
    }
}