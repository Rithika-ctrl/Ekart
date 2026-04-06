package com.example.ekart.dto;

/**
 * Result DTO for 2FA verification attempts.
 * Returned by AdminAuthService.verify2FA()
 */
public class VerificationResult {
    private boolean success;
    private String message;

    public VerificationResult() {}

    public VerificationResult(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    // Getters and Setters
    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
