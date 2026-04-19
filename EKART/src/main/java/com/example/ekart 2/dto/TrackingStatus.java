package com.example.ekart.dto;

/**
 * LOCATION: src/main/java/com/example/ekart/dto/TrackingStatus.java
 *
 * REPLACE your existing TrackingStatus.java with this complete file.
 * Change from original: added PACKED status between PROCESSING and SHIPPED.
 */
public enum TrackingStatus {
    PENDING_PAYMENT("Pending Payment"),          // Waiting for Razorpay payment
    PAYMENT_VERIFIED("Payment Verified"),        // Razorpay payment verified
    PROCESSING("Processing"),                    // Order received, processing by vendor
    PACKED("Packed"),                            // Vendor packed, ready for pickup
    WAREHOUSE_RECEIVED("Warehouse Received"),    // Received by warehouse staff (Phase 2)
    PREPARED_FOR_HUB_TRANSIT("Prepared for Hub Transit"), // Ready for hub-to-hub transfer (Phase 2)
    IN_HUB_TRANSIT("In Hub Transit"),           // In transit at intermediate warehouse (Phase 2)
    ARRIVED_AT_INTERMEDIATE_HUB("Arrived at Hub"), // Arrived at intermediate hub (Phase 2)
    ARRIVED_AT_DESTINATION_HUB("Arrived at Destination"), // Arrived at final warehouse (Phase 2)
    READY_FOR_DELIVERY("Ready for Delivery"),   // Prepared by warehouse, waiting for delivery boy assignment
    SHIPPED("Shipped"),                         // Assigned to delivery boy, in transit
    OUT_FOR_DELIVERY("Out for Delivery"),       // Delivery boy has picked up, on way to customer
    DELIVERED("Delivered"),                     // Delivered to customer
    RETURN_IN_PROGRESS("Return in Progress"),   // Returned by customer
    REFUNDED("Refunded"),                       // Order refunded
    CANCELLED("Cancelled");                     // Order cancelled

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
            case PENDING_PAYMENT:              return 0;
            case PAYMENT_VERIFIED:             return 5;
            case PROCESSING:                   return 10;
            case PACKED:                       return 20;
            case WAREHOUSE_RECEIVED:           return 25;
            case PREPARED_FOR_HUB_TRANSIT:    return 30;
            case IN_HUB_TRANSIT:               return 40;
            case ARRIVED_AT_INTERMEDIATE_HUB: return 45;
            case ARRIVED_AT_DESTINATION_HUB:  return 50;
            case READY_FOR_DELIVERY:           return 55;
            case SHIPPED:                      return 60;
            case OUT_FOR_DELIVERY:             return 80;
            case DELIVERED:                    return 100;
            case RETURN_IN_PROGRESS:           return 50;  // In-progress return
            case REFUNDED:                     return 100;
            case CANCELLED:                    return 0;
            default:                           return 0;
        }
    }
}