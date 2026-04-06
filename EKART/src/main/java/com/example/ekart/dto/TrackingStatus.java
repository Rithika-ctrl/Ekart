package com.example.ekart.dto;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/TrackingStatus.java
 *
 * REPLACE your existing TrackingStatus.java with this complete file.
 * Change from original: added PACKED status between PROCESSING and SHIPPED.
 */
public enum TrackingStatus {
    PENDING_PAYMENT("Pending Payment"),   // NEW — Waiting for Razorpay payment
    PAYMENT_VERIFIED("Payment Verified"),  // NEW — Razorpay payment verified
    PROCESSING("Processing"),
    PACKED("Packed"),              // NEW — vendor has packed the order, ready for pickup
    SHIPPED("Shipped"),
    OUT_FOR_DELIVERY("Out for Delivery"),
    DELIVERED("Delivered"),
    REFUNDED("Refunded"),
    CANCELLED("Cancelled");

    private final String displayName;

    TrackingStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public int getStepIndex() {
        return this.ordinal();
    }

    public int getProgressPercent() {
        switch (this) {
            case PROCESSING:       return 0;
            case PACKED:           return 15;   // NEW
            case SHIPPED:          return 33;
            case OUT_FOR_DELIVERY: return 66;
            case DELIVERED:        return 100;
            case REFUNDED:         return 100;
            case CANCELLED:        return 0;
            default:               return 0;
        }
    }
}