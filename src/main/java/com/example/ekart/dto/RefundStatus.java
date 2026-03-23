/**
 * File: RefundStatus.java
 * Description: Enum/DTO for refund status values used in refund workflows.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.dto;

/**
 * Enum representing the status of a refund request.
 */
public enum RefundStatus {
    PENDING("Pending"),
    APPROVED("Approved"),
    REJECTED("Rejected");

    private final String displayName;

    RefundStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
