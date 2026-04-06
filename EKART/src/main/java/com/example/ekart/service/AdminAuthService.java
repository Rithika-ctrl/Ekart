package com.example.ekart.service;

import com.example.ekart.dto.AdminCredential;
import com.example.ekart.dto.AuthenticationResult;
import com.example.ekart.dto.VerificationResult;
import com.example.ekart.dto.PasswordChangeResult;
import com.example.ekart.repository.AdminCredentialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;

/**
 * Admin Authentication Service with 2FA (TOTP) support.
 * 
 * FEATURES:
 * - BCrypt password hashing
 * - 2FA via TOTP (Time-based OTP) - compatible with Google Authenticator
 * - Brute force protection (max 5 attempts, 15-minute lockout)
 * - Login attempt tracking and audit
 * - Secure TOTP secret generation
 */
@Service
@Transactional
public class AdminAuthService {

    @Autowired
    private AdminCredentialRepository adminCredentialRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // TOTP Configuration
    private static final int TOTP_TIME_STEP = 30; // seconds
    private static final int TOTP_DIGITS = 6;
    private static final int TOTP_WINDOW = 1; // Accept codes from previous/next time window

    /**
     * Authenticate admin with email and password
     * @param email Admin email
     * @param password Plain text password
     * @return AuthenticationResult with status and 2FA requirement
     */
    public AuthenticationResult authenticate(String email, String plainPassword) {
        email = email.trim().toLowerCase();

        var optAdmin = adminCredentialRepository.findByEmail(email);
        if (optAdmin.isEmpty()) {
            return new AuthenticationResult(false, "Invalid admin credentials", false, null);
        }

        AdminCredential admin = optAdmin.get();

        // Check if account is locked
        if (admin.isAccountLocked()) {
            LocalDateTime unlockTime = admin.getLastFailedAttempt().plusMinutes(AdminCredential.LOCKOUT_MINUTES);
            return new AuthenticationResult(false, "Account locked. Try again after " + unlockTime, false, null);
        }

        // Verify password
        if (!passwordEncoder.matches(plainPassword, admin.getHashedPassword())) {
            admin.recordFailedAttempt();
            adminCredentialRepository.save(admin);
            int remaining = AdminCredential.MAX_FAILED_ATTEMPTS - admin.getFailedAttempts();
            return new AuthenticationResult(false, "Invalid password. " + remaining + " attempts remaining.", false, null);
        }

        // Password correct - check if 2FA is required
        if (admin.isTwoFactorEnabled()) {
            // Return success but require 2FA verification
            return new AuthenticationResult(true, "Password verified. Enter 2FA code.", true, admin.getId());
        }

        // 2FA not enabled - full authentication success
        admin.recordSuccessfulLogin();
        adminCredentialRepository.save(admin);
        return new AuthenticationResult(true, "Authentication successful", false, admin.getId());
    }

    /**
     * Verify TOTP code for 2FA
     * @param adminId Admin ID
     * @param totpCode 6-digit TOTP code from authenticator app
     * @return VerificationResult
     */
    public VerificationResult verify2FA(int adminId, String totpCode) {
        var optAdmin = adminCredentialRepository.findById(adminId);
        if (optAdmin.isEmpty()) {
            return new VerificationResult(false, "Admin not found");
        }

        AdminCredential admin = optAdmin.get();

        if (!admin.isTwoFactorEnabled()) {
            return new VerificationResult(false, "2FA not enabled for this account");
        }

        if (admin.getTotpSecret() == null || admin.getTotpSecret().isEmpty()) {
            return new VerificationResult(false, "2FA secret not configured");
        }

        // Verify TOTP code
        if (!verifyTOTP(admin.getTotpSecret(), totpCode)) {
            return new VerificationResult(false, "Invalid 2FA code");
        }

        // Record successful login
        admin.recordSuccessfulLogin();
        adminCredentialRepository.save(admin);
        return new VerificationResult(true, "2FA verified successfully");
    }

    /**
     * Enable 2FA for an admin
     * @return TOTP secret that should be shown as QR code to user
     */
    public String enable2FA(int adminId) {
        var optAdmin = adminCredentialRepository.findById(adminId);
        if (optAdmin.isEmpty()) {
            return null;
        }

        AdminCredential admin = optAdmin.get();
        String secret = generateTOTPSecret();
        admin.setTotpSecret(secret);
        admin.setTwoFactorEnabled(true);
        adminCredentialRepository.save(admin);

        return secret;
    }

    /**
     * Disable 2FA for an admin
     */
    public boolean disable2FA(int adminId, String plainPassword) {
        var optAdmin = adminCredentialRepository.findById(adminId);
        if (optAdmin.isEmpty()) {
            return false;
        }

        AdminCredential admin = optAdmin.get();

        // Require password verification to disable 2FA
        if (!passwordEncoder.matches(plainPassword, admin.getHashedPassword())) {
            return false;
        }

        admin.setTwoFactorEnabled(false);
        admin.setTotpSecret(null);
        adminCredentialRepository.save(admin);
        return true;
    }

    /**
     * Change admin password
     */
    public PasswordChangeResult changePassword(int adminId, String currentPassword, String newPassword) {
        var optAdmin = adminCredentialRepository.findById(adminId);
        if (optAdmin.isEmpty()) {
            return new PasswordChangeResult(false, "Admin not found");
        }

        AdminCredential admin = optAdmin.get();

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, admin.getHashedPassword())) {
            return new PasswordChangeResult(false, "Current password is incorrect");
        }

        if (newPassword.length() < 8) {
            return new PasswordChangeResult(false, "New password must be at least 8 characters");
        }

        if (currentPassword.equals(newPassword)) {
            return new PasswordChangeResult(false, "New password must be different from current password");
        }

        admin.setHashedPassword(passwordEncoder.encode(newPassword));
        admin.setUpdatedAt(LocalDateTime.now());
        adminCredentialRepository.save(admin);

        return new PasswordChangeResult(true, "Password changed successfully");
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // TOTP Implementation (Time-based One-Time Password)
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * Generate a random TOTP secret (base32 encoded)
     */
    public String generateTOTPSecret() {
        SecureRandom random = new SecureRandom();
        byte[] secretBytes = new byte[20]; // 160 bits for TOTP
        random.nextBytes(secretBytes);
        return Base32.encode(secretBytes);
    }

    /**
     * Verify a TOTP code against the secret
     */
    private boolean verifyTOTP(String secret, String code) {
        try {
            byte[] decodedSecret = Base32.decode(secret);
            long currentTime = System.currentTimeMillis() / 1000;

            // Check current time window and adjacent time windows (for time drift)
            for (long i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
                long timeWindow = currentTime / TOTP_TIME_STEP + i;
                String expectedCode = generateTOTP(decodedSecret, timeWindow);
                if (expectedCode.equals(code)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            System.err.println("TOTP verification error: " + e.getMessage());
            return false;
        }
    }

    /**
     * Generate TOTP code for a given time window
     */
    private String generateTOTP(byte[] secret, long timeWindow) throws NoSuchAlgorithmException, InvalidKeyException {
        byte[] timeBytes = new byte[8];
        for (int i = 7; i >= 0; i--) {
            timeBytes[i] = (byte) (timeWindow & 0xff);
            timeWindow >>= 8;
        }

        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(secret, "HmacSHA1"));
        byte[] hash = mac.doFinal(timeBytes);

        int offset = hash[hash.length - 1] & 0xf;
        int code = ((hash[offset] & 0x7f) << 24)
                 | ((hash[offset + 1] & 0xff) << 16)
                 | ((hash[offset + 2] & 0xff) << 8)
                 | (hash[offset + 3] & 0xff);

        code %= (int) Math.pow(10, TOTP_DIGITS);
        return String.format("%06d", code);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // Base32 Encoding/Decoding for TOTP Secret
    // ══════════════════════════════════════════════════════════════════════════════

    public static class Base32 {
        private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

        public static String encode(byte[] bytes) {
            StringBuilder sb = new StringBuilder();
            int buffer = 0;
            int bufferSize = 0;

            for (byte b : bytes) {
                buffer = (buffer << 8) | (b & 0xFF);
                bufferSize += 8;

                while (bufferSize >= 5) {
                    bufferSize -= 5;
                    sb.append(ALPHABET.charAt((buffer >> bufferSize) & 0x1F));
                }
            }

            if (bufferSize > 0) {
                sb.append(ALPHABET.charAt((buffer << (5 - bufferSize)) & 0x1F));
            }

            return sb.toString();
        }

        public static byte[] decode(String encoded) throws IOException {
            byte[] result = new byte[(encoded.length() * 5) / 8];
            int buffer = 0;
            int bufferSize = 0;
            int resultIndex = 0;

            for (char c : encoded.toUpperCase().toCharArray()) {
                int digit = ALPHABET.indexOf(c);
                if (digit < 0) continue;

                buffer = (buffer << 5) | digit;
                bufferSize += 5;

                if (bufferSize >= 8) {
                    bufferSize -= 8;
                    result[resultIndex++] = (byte) ((buffer >> bufferSize) & 0xFF);
                }
            }

            return Arrays.copyOf(result, resultIndex);
        }
    }
}
