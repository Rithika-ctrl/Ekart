package com.example.ekart.service;

import com.example.ekart.dto.AuthenticationResult;
import com.example.ekart.dto.VerificationResult;
import com.example.ekart.dto.PasswordChangeResult;
import org.springframework.beans.factory.annotation.Value;
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
    public VerificationResult verify2FA(int adminId, String totpCode) {
        return new VerificationResult(true, "2FA not required");
    }

    /**
     * Change admin password (not supported with .env based auth)
     */
    public PasswordChangeResult changePassword(Integer adminId, String currentPassword, String newPassword) {
        return new PasswordChangeResult(false, "Cannot change password with environment variable based authentication. Update ADMIN_PASSWORD in .env file manually.");
    }

    /**
     * Get admin email by ID
     */
    public String getAdminEmailById(int adminId) {
        return envAdminEmail;
    }

    /**
     * Get primary admin email
     */
    public String getPrimaryAdminEmail() {
        return envAdminEmail;
    }
}
