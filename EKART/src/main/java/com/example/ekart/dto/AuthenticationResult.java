package com.example.ekart.dto;

/**
 * Result DTO for admin authentication attempts.
 * Returned by AdminAuthService.authenticate()
 */
public class AuthenticationResult {
    private boolean success;
    private String message;
    private boolean requires2FA;
    private Integer adminId;
    private String adminName;

    public AuthenticationResult() {}

    public AuthenticationResult(boolean success, String message, boolean requires2FA, Integer adminId) {
        this.success = success;
        this.message = message;
        this.requires2FA = requires2FA;
        this.adminId = adminId;
    }

    public AuthenticationResult(boolean success, String message, boolean requires2FA, Integer adminId, String adminName) {
        this.success = success;
        this.message = message;
        this.requires2FA = requires2FA;
        this.adminId = adminId;
        this.adminName = adminName;
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

    public boolean isRequires2FA() {
        return requires2FA;
    }

    public void setRequires2FA(boolean requires2FA) {
        this.requires2FA = requires2FA;
    }

    public Integer getAdminId() {
        return adminId;
    }

    public void setAdminId(Integer adminId) {
        this.adminId = adminId;
    }

    public String getAdminName() {
        return adminName;
    }

    public void setAdminName(String adminName) {
        this.adminName = adminName;
    }
}
