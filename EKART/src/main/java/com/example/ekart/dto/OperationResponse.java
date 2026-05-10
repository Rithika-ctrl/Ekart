package com.example.ekart.dto;

/**
 * Simple API response for one-off operations that only need success and message.
 */
public class OperationResponse {

    private final boolean success;
    private final String message;

    public OperationResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }
}