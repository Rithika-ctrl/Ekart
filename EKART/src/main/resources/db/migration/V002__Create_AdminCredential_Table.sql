-- ========================================================================
-- FILE: src/main/resources/db/migration/V002__Create_AdminCredential_Table.sql
--
-- Creates the admin_credential table for secure admin authentication.
-- Admin credentials are stored in database with BCrypt hashing, not in properties.
--
-- SECURITY FEATURES:
-- - hashed_password: BCrypt-hashed password (never plaintext)
-- - totp_secret: Base32-encoded secret for 2FA (Google Authenticator)
-- - failed_attempts: Brute force attack counter
-- - locked: Account lockout after max failed attempts
-- - last_successful_login: Audit trail
--
-- DATABASE: PostgreSQL
-- ========================================================================

CREATE TABLE IF NOT EXISTS admin_credential (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    hashed_password VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    totp_secret VARCHAR(255),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    last_failed_attempt TIMESTAMP,
    last_successful_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_email (email),
    INDEX idx_admin_created_at (created_at)
);

-- ========================================================================
-- INITIAL ADMIN ACCOUNT
-- 
-- ⚠️  IMPORTANT:
-- 1. Enter your hashed password below (see instructions)
-- 2. The default password is NOT used — only the hash matters
-- 3. This will be executed once during migration
-- 4. After setup, change the admin password via admin dashboard
--
-- TO GENERATE A BCRYPT HASH:
--   Linux/macOS:  echo -n "YourPassword123!" | htpasswd -iBBC -
--   Java:         Spring Security BCryptPasswordEncoder
--   Online:       https://bcrypt-generator.com/ (for testing only, never in production!)
-- ========================================================================

-- Example: Initial admin with a temporary password (replace the hash)
-- INSERT INTO admin_credential (email, hashed_password, name, two_factor_enabled, created_at, updated_at)
-- VALUES ('admin@ekart.local', '$2a$10$YOUR_BCRYPTED_HASH_HERE', 'Administrator', FALSE, NOW(), NOW());

-- ========================================================================
-- NOTE: For development, use this temporary command (NEVER in production):
-- INSERT INTO admin_credential (email, hashed_password, name, created_at, updated_at)
-- VALUES ('admin@ekart.local', '$2a$10$slYQmyNdGzin0rdZfH.iPuIC9z2qK21j5YbFsJ.cTPa0BvW7xDYiK', 'Admin User', NOW(), NOW());
-- Example hash shown for local bootstrap only (rotate immediately after first login).
-- ========================================================================
