package com.example.ekart.dto;

/**
 * Result DTO for admin password change attempts.
 * Returned by AdminAuthService.changePassword()
 */
public class PasswordChangeResult {
    private boolean success;
    private String message;

    public PasswordChangeResult() {}

    public PasswordChangeResult(boolean success, String message) {
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
