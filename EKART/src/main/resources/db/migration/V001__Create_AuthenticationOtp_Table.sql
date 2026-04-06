-- ========================================================================
-- FILE: src/main/resources/db/migration/V001__Create_AuthenticationOtp_Table.sql
-- 
-- Creates the authentication_otp table for secure OTP storage.
-- OTPs are stored as BCrypt hashes, NOT plain text.
-- 
-- SECURITY FEATURES:
-- - hashed_otp: BCrypt-hashed OTP (256 chars to accommodate BCrypt cost)
-- - expiry_minutes: Default 5 minutes
-- - used: Mark OTPs as used to prevent replay attacks
-- - attempt_count: Track brute force attempts
-- 
-- DATABASE: PostgreSQL
-- ========================================================================

CREATE TABLE IF NOT EXISTS authentication_otp (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    hashed_otp VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiry_minutes INT NOT NULL DEFAULT 5,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP,
    attempt_count INT NOT NULL DEFAULT 0,
    INDEX idx_otp_email (email),
    INDEX idx_otp_purpose (purpose),
    INDEX idx_otp_created_at (created_at)
);

-- ========================================================================
-- NOTE: If using MySQL instead of PostgreSQL, replace TIMESTAMP with:
-- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
-- ========================================================================

-- Optional: Add this query to your application startup to clean old OTPs
-- DELETE FROM authentication_otp WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 DAY);
