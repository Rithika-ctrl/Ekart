package com.example.ekart.dto;

/**
 * Enum representing the tracking status stages for order shipment.
 * Used for Real-Time Shipment Tracking feature.
 */
public enum TrackingStatus {
    PROCESSING("Processing"),
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

    /**
     * Returns the step index for the progress bar (0-3)
     */
    public int getStepIndex() {
        return this.ordinal();
    }

    /**
     * Returns the progress percentage for the progress bar
     */
    public int getProgressPercent() {
        switch (this) {
            case PROCESSING: return 0;
            case SHIPPED: return 33;
            case OUT_FOR_DELIVERY: return 66;
            case DELIVERED: return 100;
            case REFUNDED: return 100;
            case CANCELLED: return 0;
            default: return 0;
        }
    }
}
