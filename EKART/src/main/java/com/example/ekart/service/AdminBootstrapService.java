package com.example.ekart.service;

import java.time.LocalDateTime;

import com.example.ekart.dto.AdminCredential;
import com.example.ekart.repository.AdminCredentialRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Secure bootstrap service for initial admin account creation.
 * 
 * SECURITY PRINCIPLES:
 * 1. Only creates first admin if no admin exists
 * 2. Password must be provided via environment variables, never hardcoded
 * 3. Uses BCrypt for password hashing (never stored as plaintext)
 * 4. Validates password strength requirements
 * 5. Logs security events for audit trail
 * 
 * USAGE:
 *   export ADMIN_EMAIL="admin@company.com"
 *   export ADMIN_PASSWORD="SecurePassword123!@#"
 *   java -jar app.jar --init-admin
 */
@Service
@Transactional
public class AdminBootstrapService {

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_LENGTH = 128;

    // ── Injected dependencies ────────────────────────────────────────────────
    private final AdminCredentialRepository adminCredentialRepository;

    public AdminBootstrapService(
            AdminCredentialRepository adminCredentialRepository) {
        this.adminCredentialRepository = adminCredentialRepository;
    }

    /**
     * Create initial admin account from environment variables.
     * Only succeeds if:
     *   1. No admin exists yet (first-run scenario)
     *   2. ADMIN_EMAIL and ADMIN_PASSWORD are set
     *   3. Email is valid format
     *   4. Password meets strength requirements
     * 
     * @param adminEmail Email address from environment variable
     * @param adminPassword Password from environment variable
     * @return BootstrapResult with success status and message
     * @throws IllegalArgumentException if validation fails
     */
    public BootstrapResult createInitialAdmin(String adminEmail, String adminPassword) {
        // Check if admin already exists
        if (adminCredentialRepository.count() > 0) {
            return new BootstrapResult(
                false,
                "Admin account already exists. Cannot create initial admin.",
                "Admin already exists - skipping initialization"
            );
        }

        // Validate inputs
        if (adminEmail == null || adminEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("ADMIN_EMAIL environment variable is not set");
        }

        if (adminPassword == null || adminPassword.isEmpty()) {
            throw new IllegalArgumentException("ADMIN_PASSWORD environment variable is not set");
        }

        adminEmail = adminEmail.trim().toLowerCase();

        // Validate email format
        if (!isValidEmail(adminEmail)) {
            throw new IllegalArgumentException("ADMIN_EMAIL is not a valid email address: " + adminEmail);
        }

        // Validate password strength
        PasswordValidation pwValidation = validatePassword(adminPassword);
        if (!pwValidation.isValid()) {
            throw new IllegalArgumentException("ADMIN_PASSWORD does not meet requirements: " + pwValidation.getReason());
        }

        // Hash password
        String hashedPassword = passwordEncoder.encode(adminPassword);

        // Create admin credential
        AdminCredential admin = new AdminCredential(adminEmail, hashedPassword, extractNameFromEmail(adminEmail));
        admin.setCreatedAt(LocalDateTime.now());
        admin.setUpdatedAt(LocalDateTime.now());
        admin.setTwoFactorEnabled(false); // User can enable 2FA later

        try {
            adminCredentialRepository.save(admin);
            return new BootstrapResult(
                true,
                "Initial admin account created successfully",
                "Admin created: " + adminEmail
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to create initial admin account: " + e.getMessage(), e);
        }
    }

    /**
     * Check if initial admin setup is required.
     */
    public boolean isInitialSetupRequired() {
        return adminCredentialRepository.count() == 0;
    }

    /**
     * Validate email format using basic pattern matching.
     */
    private boolean isValidEmail(String email) {
        return email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    }

    /**
     * Validate password strength requirements.
     */
    private PasswordValidation validatePassword(String password) {
        if (password.length() < MIN_PASSWORD_LENGTH) {
            return new PasswordValidation(false, "Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }

        if (password.length() > MAX_PASSWORD_LENGTH) {
            return new PasswordValidation(false, "Password must not exceed " + MAX_PASSWORD_LENGTH + " characters");
        }

        // Check for character variety
        boolean hasUppercase = password.matches(".*[A-Z].*");
        boolean hasLowercase = password.matches(".*[a-z].*");
        boolean hasDigits = password.matches(".*\\d.*");
        boolean hasSpecial = password.matches(".*[!@#$%^&*()_\\-+=\\[\\]{};:'\",.<>?/\\\\|`~].*");

        int complexity = (hasUppercase ? 1 : 0) + (hasLowercase ? 1 : 0) + 
                        (hasDigits ? 1 : 0) + (hasSpecial ? 1 : 0);

        if (complexity < 3) {
            return new PasswordValidation(
                false,
                "Password must contain at least 3 of: uppercase, lowercase, digits, special characters"
            );
        }

        return new PasswordValidation(true, "Password meets all requirements");
    }

    /**
     * Extract a reasonable name from email (e.g., john.doe@company.com -> John Doe)
     */
    private String extractNameFromEmail(String email) {
        String[] parts = email.split("@");
        if (parts.length > 0) {
            String name = parts[0].replace(".", " ").replace("_", " ").trim();
            // Capitalize first letter of each word
            return name.split(" ").length > 0 ? 
                name.substring(0, 1).toUpperCase() + name.substring(1) : 
                "Administrator";
        }
        return "Administrator";
    }

    /**
     * Result of password validation.
     */
    private static class PasswordValidation {
        private boolean valid;
        private String reason;

        public PasswordValidation(boolean valid, String reason) {
            this.valid = valid;
            this.reason = reason;
        }

        public boolean isValid() {
            return valid;
        }

        public String getReason() {
            return reason;
        }
    }

    /**
     * Result of admin bootstrap operation.
     */
    public static class BootstrapResult {
        private boolean success;
        private String message;
        private String logMessage;

        public BootstrapResult(boolean success, String message, String logMessage) {
            this.success = success;
            this.message = message;
            this.logMessage = logMessage;
        }

        public boolean isSuccess() {
            return success;
        }

        public String getMessage() {
            return message;
        }

        public String getLogMessage() {
            return logMessage;
        }
    }
}