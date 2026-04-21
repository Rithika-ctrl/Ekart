package com.example.ekart.dto;

public class VerifyDeliveryBoysResponse {

    private final boolean success;
    private final String message;
    private final int updated;

    public VerifyDeliveryBoysResponse(boolean success, String message, int updated) {
        this.success = success;
        this.message = message;
        this.updated = updated;
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public int getUpdated() { return updated; }
}