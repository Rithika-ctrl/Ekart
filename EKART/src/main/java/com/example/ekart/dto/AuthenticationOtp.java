package com.example.ekart.dto;
import com.example.ekart.dto.Address;
import java.time.LocalDateTime;

import jakarta.persistence.*;

/**
 * Secure OTP storage entity.
 * Stores one-time passwords with BCrypt hashing and expiry tracking.
 * 
 * SECURITY FEATURES:
 * - OTP stored as BCrypt hash (not plain text)
 * - Automatic expiry after 5 minutes
 * - Mark used OTPs to prevent replay attacks
 * - Tracks creation and usage timestamps
 * 
 * USAGE:
 * - Registration: customer/vendor/delivery boy OTP verification
 * - Password reset: OTP for forgot password flows
 * - One OTP per email per purpose
 */
@Entity
@Table(name = "authentication_otp",
       indexes = {
           @Index(name = "idx_otp_email", columnList = "email"),
           @Index(name = "idx_otp_purpose", columnList = "purpose"),
           @Index(name = "idx_otp_created_at", columnList = "created_at")
       })
public class AuthenticationOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    /** Email address for which OTP was generated */
    @Column(nullable = false, length = 100)
    private String email;

    /** Purpose of OTP: "VENDOR_REGISTER", "DELIVERY_REGISTER", "PASSWORD_RESET", etc. */
    @Column(nullable = false, length = 50)
    private String purpose;

    /** BCrypt-hashed OTP (NOT plain text) */
    @Column(nullable = false, length = 100)
    private String hashedOtp;

    /** Timestamp when OTP was generated */
    @Column(nullable = false, name = "created_at")
    private LocalDateTime createdAt;

    /** OTP expires after 5 minutes */
    @Column(nullable = false)
    private int expiryMinutes = 5;

    /** True once OTP is successfully verified */
    @Column(nullable = false)
    private boolean used = false;

    /** Timestamp when OTP was used */
    private LocalDateTime usedAt;

    /** Attempt counter to prevent brute force */
    @Column(nullable = false)
    private int attemptCount = 0;

    /** Max attempts before locking OTP */
    private static final int MAX_ATTEMPTS = 5;

    // ── Constructors ─────────────────────────────────────────

    public AuthenticationOtp() {
        this.createdAt = LocalDateTime.now();
    }

    public AuthenticationOtp(String email, String purpose, String hashedOtp) {
        this.email = email;
        this.purpose = purpose;
        this.hashedOtp = hashedOtp;
        this.createdAt = LocalDateTime.now();
    }

    // ── Business Logic ────────────────────────────────────────

    /**
     * Check if OTP is expired (more than 5 minutes old)
     */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(createdAt.plusMinutes(expiryMinutes));
    }

    /**
     * Check if OTP can still be attempted
     */
    public boolean canAttempt() {
        return !used && attemptCount < MAX_ATTEMPTS && !isExpired();
    }

    /**
     * Increment failed attempt counter
     */
    public void incrementAttempt() {
        this.attemptCount++;
    }

    /**
     * Mark OTP as used
     */
    public void markUsed() {
        this.used = true;
        this.usedAt = LocalDateTime.now();
    }

    // ── Getters & Setters ─────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getHashedOtp() { return hashedOtp; }
    public void setHashedOtp(String hashedOtp) { this.hashedOtp = hashedOtp; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public int getExpiryMinutes() { return expiryMinutes; }
    public void setExpiryMinutes(int expiryMinutes) { this.expiryMinutes = expiryMinutes; }

    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }

    public LocalDateTime getUsedAt() { return usedAt; }
    public void setUsedAt(LocalDateTime usedAt) { this.usedAt = usedAt; }

    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int attemptCount) { this.attemptCount = attemptCount; }

    public static int getMaxAttempts() { return MAX_ATTEMPTS; }
}


