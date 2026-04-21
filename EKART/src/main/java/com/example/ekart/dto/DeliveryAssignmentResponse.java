package com.example.ekart.dto;

/**
 * API response for manual delivery boy assignment actions.
 */
public class DeliveryAssignmentResponse {

    private final boolean success;
    private final String message;
    private final boolean wasOverCap;

    private DeliveryAssignmentResponse(boolean success, String message, boolean wasOverCap) {
        this.success = success;
        this.message = message;
        this.wasOverCap = wasOverCap;
    }

    public static DeliveryAssignmentResponse success(String message, boolean wasOverCap) {
        return new DeliveryAssignmentResponse(true, message, wasOverCap);
    }

    public static DeliveryAssignmentResponse failure(String message) {
        return new DeliveryAssignmentResponse(false, message, false);
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public boolean isWasOverCap() {
        return wasOverCap;
    }
}