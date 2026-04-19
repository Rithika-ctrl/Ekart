package com.example.ekart.service;
import com.example.ekart.dto.Address;
import java.util.Random;
import java.util.Optional;
import java.time.LocalDateTime;

import com.example.ekart.dto.AuthenticationOtp;
import com.example.ekart.repository.AuthenticationOtpRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * OTP Service for secure OTP generation, storage, and verification.
 * 
 * FEATURES:
 * - Generate random 6-digit OTPs
 * - Hash OTPs with BCrypt before storage
 * - Track OTP expiry (5 minutes)
 * - Prevent brute force attacks (max 5 attempts)
 * - One-time use enforcement
 * - Automatic cleanup of old OTPs
 */
@Service
@Transactional
public class OtpService {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final AuthenticationOtpRepository otpRepository;

    public OtpService(
            AuthenticationOtpRepository otpRepository) {
        this.otpRepository = otpRepository;
    }



    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Random random = new Random();

    public static final String PURPOSE_VENDOR_REGISTER = "VENDOR_REGISTER";
    public static final String PURPOSE_DELIVERY_REGISTER = "DELIVERY_REGISTER";
    public static final String PURPOSE_CUSTOMER_REGISTER = "CUSTOMER_REGISTER";
    public static final String PURPOSE_PASSWORD_RESET = "PASSWORD_RESET";
    public static final String PURPOSE_DELIVERY_LOGIN = "DELIVERY_LOGIN";

    /**
     * Generate a new 6-digit OTP, hash it, and save to database
     * @param email Email address to send OTP to
     * @param purpose Purpose of OTP (VENDOR_REGISTER, DELIVERY_REGISTER, etc.)
     * @return Plain text OTP (for sending via email; NOT stored in DB)
     */
    public String generateAndStoreOtp(String email, String purpose) {
        // Generate random 6-digit OTP
        String plainOtp = String.format("%06d", random.nextInt(1000000));

        // Hash the OTP using BCrypt
        String hashedOtp = passwordEncoder.encode(plainOtp);

        // Delete old unused OTPs for this email+purpose
        findAndMarkOldOtpsAsExpired(email, purpose);

        // Save the new OTP
        AuthenticationOtp otp = new AuthenticationOtp(email, purpose, hashedOtp);
        otpRepository.save(otp);

        // Return plain OTP for sending via email
        // This plain text is never saved anywhere
        return plainOtp;
    }

    /**
     * Verify an OTP submitted by the user
     * @param email Email address to verify
     * @param plainOtp The 6-digit OTP provided by user
     * @param purpose Purpose to verify against
     * @return VerificationResult with success status and message
     */
    public VerificationResult verifyOtp(String email, String plainOtp, String purpose) {
        // Find the most recent OTP for this email + purpose
        Optional<AuthenticationOtp> optOtp = otpRepository.findLatestByEmailAndPurpose(email, purpose);

        if (optOtp.isEmpty()) {
            return new VerificationResult(false, "No OTP found. Please request a new one.");
        }

        AuthenticationOtp otp = optOtp.get();

        // Check if already used
        if (otp.isUsed()) {
            return new VerificationResult(false, "OTP already used. Please request a new one.");
        }

        // Check if expired
        if (otp.isExpired()) {
            return new VerificationResult(false, "OTP expired. Please request a new one.");
        }

        // Check attempts
        if (!otp.canAttempt()) {
            return new VerificationResult(false, "Too many failed attempts. Please request a new OTP.");
        }

        // Verify the OTP using BCrypt
        if (!passwordEncoder.matches(plainOtp, otp.getHashedOtp())) {
            otp.incrementAttempt();
            otpRepository.save(otp);
            return new VerificationResult(false, "Invalid OTP. " + 
                (AuthenticationOtp.getMaxAttempts() - otp.getAttemptCount()) + " attempts remaining.");
        }

        // Success! Mark as used
        otp.markUsed();
        otpRepository.save(otp);

        return new VerificationResult(true, "OTP verified successfully.");
    }

    /**
     * Try to find an OTP for an email (without verifying it)
     * Used for checking if an OTP was already requested
     */
    public Optional<AuthenticationOtp> getLatestOtp(String email, String purpose) {
        return otpRepository.findLatestByEmailAndPurpose(email, purpose);
    }

    /**
     * Resend OTP: delete old and generate new one
     */
    public String resendOtp(String email, String purpose) {
        return generateAndStoreOtp(email, purpose);
    }

    /**
     * Invalidate all old OTPs for an email+purpose combination
     * (Called before generating a new one)
     */
    private void findAndMarkOldOtpsAsExpired(String email, String purpose) {
        var oldOtps = otpRepository.findRecentByEmailAndPurpose(email, purpose);
        for (AuthenticationOtp oldOtp : oldOtps) {
            if (!oldOtp.isUsed()) {
                oldOtp.setUsed(true); // Mark as used to disable it
                otpRepository.save(oldOtp);
            }
        }
    }

    /**
     * Clean up expired OTPs from the database
     * Call this periodically (e.g., every hour via a scheduled task)
     */
    @Transactional
    public void cleanupExpiredOtps() {
        LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);
        otpRepository.deleteExpiredOtps(oneDayAgo);
    }

    /**
     * DTO for OTP verification results
     */
    public static class VerificationResult {
        public final boolean success;
        public final String message;

        public VerificationResult(boolean success, String message) {
            this.success = success;
            this.message = message;
        }
    }
}


