package com.example.ekart.dto;

/**
 * CodCollectionStatus.java
 * ─────────────────────────────────────────────────────────────────────────────
 * Enum for tracking COD (Cash on Delivery) payment collection status.
 * 
 * States:
 * - PENDING:    Order awaiting cash collection at delivery
 * - COLLECTED:  Cash collected successfully from customer
 * - FAILED:     Payment collection failed (customer refused / payment issue)
 * - NOT_APPLICABLE: Order is online payment (RAZORPAY) or prepaid - N/A
 * ─────────────────────────────────────────────────────────────────────────────
 */
public enum CodCollectionStatus {
    PENDING("Payment pending at delivery"),
    COLLECTED("Cash collected from customer"),
    FAILED("Collection failed - payment pending"),
    NOT_APPLICABLE("Not applicable (online payment)");

    private final String description;

    CodCollectionStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
