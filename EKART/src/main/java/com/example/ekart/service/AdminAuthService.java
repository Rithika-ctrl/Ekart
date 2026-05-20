package com.example.ekart.service;
import org.springframework.beans.factory.annotation.Value;

import com.example.ekart.dto.AuthenticationResult;
import com.example.ekart.dto.VerificationResult;
import com.example.ekart.dto.PasswordChangeResult;
import org.springframework.stereotype.Service;

/**
 * Admin Authentication Service - Environment Variable Based
 * Uses ADMIN_EMAIL and ADMIN_PASSWORD from .env file
 * No database table required
 */
@Service
public class AdminAuthService {

    @Value("${ADMIN_EMAIL:admin@example.com}")
    private String envAdminEmail;

    @Value("${ADMIN_PASSWORD:password}")
    private String envAdminPassword;

    /**
     * Authenticate admin with email and password from .env
     */
    public AuthenticationResult authenticate(String email, String password) {
        email = email.trim().toLowerCase();
        String envEmail = envAdminEmail.trim().toLowerCase();

        // Check email
        if (!email.equals(envEmail)) {
            return new AuthenticationResult(false, "Invalid admin credentials", false, null);
        }

        // Check password
        if (!password.equals(envAdminPassword)) {
            return new AuthenticationResult(false, "Invalid admin credentials", false, null);
        }

        // Authentication successful
        return new AuthenticationResult(true, "Authentication successful", false, 1);
    }

    /**
     * Verify TOTP code for 2FA (not used for .env based auth)
     */
    public VerificationResult verify2FA() {
        // No parameters needed for .env-based authentication
        return new VerificationResult(true, "2FA not required");
    }

    /**
     * Verify TOTP code for 2FA — overload accepting adminId and totpCode for
     * callers that pass those arguments. Parameters are unused in env-based auth.
     */
    @SuppressWarnings("java:S1172") // adminId and totpCode unused in env-based auth
    public VerificationResult verify2FA(Integer adminId, String totpCode) {
        // Delegate to no-arg version — env-based auth doesn't require 2FA
        return verify2FA();
    }

    /**
     * Change admin password (not supported with .env based auth)
     */
    @SuppressWarnings("java:S1172") // currentPassword and newPassword required by callers but unused in env-based auth
    public PasswordChangeResult changePassword(String currentPassword, String newPassword) {
        // Parameters unused in .env-based authentication
        return new PasswordChangeResult(false, "Cannot change password with environment variable based authentication. Update ADMIN_PASSWORD in .env file manually.");
    }

    /**
     * Get admin email (env-based auth has a single admin)
     */
    public String getAdminEmailById() {
        // No adminId parameter needed for .env-based authentication
        return envAdminEmail;
    }

    /**
     * Get admin email by ID — overload accepting adminId for callers that pass it.
     * Parameter is unused in env-based auth since there is only one admin.
     */
    @SuppressWarnings("java:S1172") // adminId unused in env-based auth
    public String getAdminEmailById(Integer adminId) {
        return getAdminEmailById();
    }

    /**
     * Get primary admin email.
     * Delegates to {@link #getAdminEmailById()} — both return the single env-based admin email.
     */
    public String getPrimaryAdminEmail() {
        return getAdminEmailById();
    }
}