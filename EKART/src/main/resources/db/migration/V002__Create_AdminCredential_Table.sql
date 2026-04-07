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

-- ========================================================================
-- INITIAL ADMIN SETUP (IMPORTANT - READ BEFORE DEPLOYING)
--
-- ⚠️  DO NOT insert credentials manually or hardcode in migrations!
--
-- Instead, use the application bootstrap mechanism:
--   1. Set environment variables: ADMIN_EMAIL, ADMIN_PASSWORD
--   2. Start application with --init-admin flag
--   3. Application will create initial admin securely during startup
--
-- Example (Linux/macOS):
--   export ADMIN_EMAIL="admin@mycompany.com"
--   export ADMIN_PASSWORD="SecurePassword123!@#"
--   java -jar app.jar --init-admin
--
-- Example (Windows PowerShell):
--   $env:ADMIN_EMAIL="admin@mycompany.com"
--   $env:ADMIN_PASSWORD="SecurePassword123!@#"
--   java -jar app.jar --init-admin
--
-- ========================================================================
-- NOTE: Initial INSERT is handled by AdminBootstrapService, not migrations!
-- This table will be empty until first admin is created via --init-admin.
-- ========================================================================
