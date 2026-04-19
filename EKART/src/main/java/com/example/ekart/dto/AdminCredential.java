package com.example.ekart.dto;
import com.example.ekart.dto.Address;

import java.time.LocalDateTime;
import jakarta.persistence.*;

/**
 * Secure Admin Credentials Storage.
 * Replaces hardcoded admin.email/admin.password in properties.
 * 
 * SECURITY FEATURES:
 * - Password stored as BCrypt hash (not plaintext)
 * - 2FA support via TOTP (Time-based One-Time Password) - Google Authenticator compatible
 * - Login attempt tracking (brute force prevention)
 * - Last login timestamp for audit
 * - 2FA can be enabled/disabled per admin
 */
@Entity
@Table(name = "admin_credential")
public class AdminCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    /** Admin email address */
    @Column(nullable = false, unique = true, length = 100)
    private String email;

    /** BCrypt-hashed password (NOT plaintext) */
    @Column(nullable = false, length = 100)
    private String hashedPassword;

    /** Name/title of admin */
    @Column(nullable = false, length = 100)
    private String name;

    /** 2FA secret key (for TOTP/Google Authenticator) */
    @Column(length = 255)
    private String totpSecret;

    /** Whether 2FA is enabled for this admin */
    @Column(nullable = false)
    private boolean twoFactorEnabled = false;

    /** Failed login attempts counter (for brute force protection) */
    @Column(nullable = false)
    private int failedAttempts = 0;

    /** Account locked after too many failed attempts */
    @Column(nullable = false)
    private boolean locked = false;

    /** Timestamp of last failed login attempt */
    private LocalDateTime lastFailedAttempt;

    /** Timestamp of last successful login */
    private LocalDateTime lastSuccessfulLogin;

    /** When this credential was created */
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /** When this credential was last updated */
    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Max attempts before account lock
    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final int LOCKOUT_MINUTES = 15;

    // ── Constructors ────────────────────────────────────────

    public AdminCredential() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public AdminCredential(String email, String hashedPassword, String name) {
        this.email = email;
        this.hashedPassword = hashedPassword;
        this.name = name;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // ── Business Logic ──────────────────────────────────────

    public void recordFailedAttempt() {
        this.failedAttempts++;
        this.lastFailedAttempt = LocalDateTime.now();
        if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            this.locked = true;
        }
    }

    public void recordSuccessfulLogin() {
        this.failedAttempts = 0;
        this.locked = false;
        this.lastSuccessfulLogin = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isAccountLocked() {
        if (!this.locked) return false;
        
        // Auto-unlock after LOCKOUT_MINUTES
        if (this.lastFailedAttempt != null && 
            LocalDateTime.now().isAfter(this.lastFailedAttempt.plusMinutes(LOCKOUT_MINUTES))) {
            this.locked = false;
            this.failedAttempts = 0;
            return false;
        }
        return true;
    }

    public boolean requires2FA() {
        return this.twoFactorEnabled;
    }

    // ── Getters & Setters ───────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getHashedPassword() { return hashedPassword; }
    public void setHashedPassword(String hashedPassword) { this.hashedPassword = hashedPassword; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTotpSecret() { return totpSecret; }
    public void setTotpSecret(String totpSecret) { this.totpSecret = totpSecret; }

    public boolean isTwoFactorEnabled() { return twoFactorEnabled; }
    public void setTwoFactorEnabled(boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }

    public int getFailedAttempts() { return failedAttempts; }
    public void setFailedAttempts(int failedAttempts) { this.failedAttempts = failedAttempts; }

    public boolean isLocked() { return locked; }
    public void setLocked(boolean locked) { this.locked = locked; }

    public LocalDateTime getLastFailedAttempt() { return lastFailedAttempt; }
    public void setLastFailedAttempt(LocalDateTime lastFailedAttempt) { this.lastFailedAttempt = lastFailedAttempt; }

    public LocalDateTime getLastSuccessfulLogin() { return lastSuccessfulLogin; }
    public void setLastSuccessfulLogin(LocalDateTime lastSuccessfulLogin) { this.lastSuccessfulLogin = lastSuccessfulLogin; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

