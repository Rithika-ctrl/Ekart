# EKART Configuration Reference Card

## Quick Status Dashboard

### 🔴 CRITICAL - Action Required NOW
| Issue | Current Value | Exposed? | Action |
|-------|---------------|----------|--------|
| Gemini API Key | `AIzaSyBICsUWJjWr2OmdjQlIngOWytFM5igZ0I0` | ✅ YES in .env | REVOKE & ROTATE |
| Cloudinary Cloud | `dt2skuzaz` | ✅ YES in .env | ROTATE |
| Cloudinary Key | `624425421279873` | ✅ YES in .env | ROTATE |
| Cloudinary Secret | `be6vnXm7Z4Dm3_Ef3cxnCJPtgII` | ✅ YES in .env | ROTATE |

### ⚠️ WARNING - Plan for Production
| Component | Dev Setting | Prod Recommended | Status |
|-----------|------------|------------------|--------|
| DB Host | localhost:5432 | AWS RDS / VPN | ⚠️ Update needed |
| DB User | postgres | unique_prod_user | ⚠️ Update needed |
| DB Password | postgres | 32-char random | ⚠️ Update needed |
| DDL Auto | update | validate | ⚠️ Update needed |
| H2 Reporting | file-based | PostgreSQL schema | ⚠️ Update needed |
| HTTPS | OFF | ON (required) | ⚠️ Enable for prod |
| CORS | * (allow all) | specific domains | ⚠️ Restrict for prod |

### ✅ GREEN - Already Secure
| Component | Implementation | Status |
|-----------|----------------|--------|
| OTP Storage | BCrypt hashed + 5min expiry | ✅ SECURE |
| Admin Auth | Database + BCrypt + 2FA TOTP | ✅ SECURE |
| Admin Brute Force | 5 attempts → 15min lockout | ✅ SECURE |
| AES Encryption | 32-char key + 16-char salt | ✅ STRONG |
| Password Hashing | BCrypt (NIST compliant) | ✅ SECURE |
| Database Migrations | Flyway v001 + v002 | ✅ PREPARED |

---

## Configuration Files Location

```
EKART/
├── src/main/resources/
│   ├── application.properties      ← Database, JPA, Mail config
│   ├── application-prod.properties ← (need to create)
│   └── db/migration/
│       ├── V001__Create_AuthenticationOtp_Table.sql
│       └── V002__Create_AdminCredential_Table.sql
│
├── .env                            ← Local secrets (in .gitignore ✅)
├── .env.example                    ← Template (safe, no real values)
├── SECURITY-CONFIGURATION.md       ← This file explains everything
├── PRODUCTION-DEPLOYMENT-CHECKLIST.md ← Step-by-step prod guide
└── README.md                       ← Main documentation
```

---

## Environment Variables Map

### Required in ALL Environments

```bash
# Database
DB_USER=postgres                    # Must change for prod
DB_PASSWORD=postgres                # Must change for prod

# AES Encryption (ALREADY STRONG)
AES_SECRET=kT9mP2xL4vQ8wN6yH3jF7dZ1bX5cR0sU
AES_SALT=fG2hJ4kL6mN8pQ

# Mail (Gmail SMTP)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password     # Use Gmail app password (16 chars)

# Gemini AI
GEMINI_API_KEY=your-new-key         # MUST REVOKE OLD KEY

# Cloudinary
CLOUDINARY_CLOUD=your-cloud-name    # MUST ROTATE OLD CREDENTIALS
CLOUDINARY_KEY=your-api-key
CLOUDINARY_SECRET=your-api-secret
```

### Optional in Development Only

```bash
# Node.js config (legacy, not used by backend)
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com  # Unused
DB_PORT=4000                                              # Unused
DB_NAME=ekart                                             # Unused
```

---

## Database Schema Overview

### Core Tables

| Table | Purpose | Security |
|-------|---------|----------|
| `customer` | Customer accounts | Passwords AES-encrypted |
| `vendor` | Vendor accounts | Passwords AES-encrypted |
| `product` | Product catalog | Public data |
| `order` | Orders | Customer-scoped |
| `admin_credential` | Admin accounts | ✅ NEW - BCrypt hashed + 2FA |
| `authentication_otp` | OTP tokens | ✅ NEW - BCrypt hashed + expiry |

### Security-Critical Tables

```sql
-- Admin credentials (NEW - database-backed)
SELECT * FROM admin_credential;
-- Columns: id, email, hashed_password (BCrypt), 
--          totpSecret, twoFactorEnabled, failedAttempts, 
--          locked, lastSuccessfulLogin, createdAt, updatedAt

-- OTP tokens (NEW - secure storage)
SELECT * FROM authentication_otp;
-- Columns: id, email, purpose, hashed_otp (BCrypt),
--          createdAt, expiryMinutes, used, attemptCount
```

---

## Application Startup Sequence

```
1. Spring Boot starts
   ↓
2. Load application.properties
   (Default: localhost:5432, postgres/postgres)
   ↓
3. Load .env file (if present)
   Overrides: DB_USER, DB_PASSWORD, AES_SECRET, AES_SALT, 
              MAIL_USERNAME, GEMINI_API_KEY, CLOUDINARY_*, etc.
   ↓
4. Flyway runs migrations (if not already applied)
   - V001: Create authentication_otp table
   - V002: Create admin_credential table
   ↓
5. Hibernate validates schema (ddl-auto=update in dev, validate in prod)
   ↓
6. Application ready
   HTTP: http://localhost:8080
   Admin Login: POST /api/react/auth/admin/login
```

---

## Key Endpoints Reference

### Admin Authentication

```bash
# Step 1: Login with email/password
POST /api/react/auth/admin/login
Content-Type: application/json
{
  "email": "admin@company.com",
  "password": "strong_password_8_chars+"
}

# Response (if 2FA enabled):
{
  "success": true,
  "adminId": 1,
  "requires2FA": true,
  "message": "Please provide 2FA code from your authenticator app"
}

# Step 2: Verify 2FA code (6 digits from Google Authenticator)
POST /api/react/auth/admin/verify-2fa
Content-Type: application/json
{
  "adminId": 1,
  "totpCode": "123456"
}

# Response:
{
  "success": true,
  "token": "eyJhbGc...",
  "message": "2FA verification successful"
}

# Step 3: Use token for subsequent requests
Authorization: Bearer eyJhbGc...
```

### Change Admin Password

```bash
POST /api/react/admin/change-password
Authorization: Bearer <jwt-token>
Content-Type: application/json
{
  "currentPassword": "old_password",
  "newPassword": "new_strong_password_8_chars+",
  "confirmPassword": "new_strong_password_8_chars+"
}

# Response:
{
  "success": true,
  "message": "Admin password updated successfully"
}
```

---

## Security Checklist - Daily Operations

### On Startup
- [ ] Check `/var/log/ekart/application.log` for errors
- [ ] Verify database connectivity
- [ ] Confirm no unexpected admin login attempts
- [ ] Health check: `curl http://localhost:8080/actuator/health`

### Weekly
- [ ] Review failed authentication attempts
- [ ] Check database connection pool usage
- [ ] Verify backups completed successfully
- [ ] Review API error rates (should be < 1%)

### Monthly
- [ ] Audit admin user accounts (should be minimal)
- [ ] Update Spring Boot dependencies
- [ ] Review CloudTrail logs (if AWS)
- [ ] Test disaster recovery procedures

### Every 3 Months
- [ ] Rotate Gmail app password
- [ ] Review and test firewall rules
- [ ] Security awareness training for team

### Every 6 Months
- [ ] Rotate Gemini API key
- [ ] Rotate Cloudinary credentials
- [ ] Rotate database password
- [ ] Review and update security policies

---

## Troubleshooting Guide

### Application Won't Start
```
Error: Unable to connect to database
├─ Check: Is PostgreSQL running?
│  ✅ macOS: brew services list | grep postgres
│  ✅ Windows: Services → PostgreSQL
│  ✅ Linux: sudo systemctl status postgresql
│
├─ Check: Is .env file present?
│  ✅ Should be in EKART/ directory, not committed to Git
│
└─ Check: Are DB credentials correct?
   ✅ Default: postgres/postgres
   ✅ Can connect: psql -U postgres -d ekart
```

### Admin Login Fails
```
Error: Invalid admin credentials
├─ Check: Is admin_credential table created?
│  ✅ SELECT * FROM admin_credential;
│
├─ Check: SQL to insert test admin (bcrypt hash required)
│  ✅ Use https://bcrypt.online to generate hash
│  ✅ INSERT INTO admin_credential 
│     (email, hashed_password, name, two_factor_enabled, 
│      failed_attempts, locked, created_at, updated_at)
│     VALUES ('test@test.com', '$2a$10$...', 'Test', false, 0, false, NOW(), NOW());
│
└─ Check: Password is BCrypt hashed?
   ✅ Should start with $2a$, $2b$, or $2y$
```

### 2FA Code Not Working
```
Error: Invalid 2FA code
├─ Check: Is TOTP enabled for admin?
│  ✅ SELECT two_factor_enabled FROM admin_credential WHERE id=1;
│
├─ Check: Is system time synchronized?
│  ✅ TOTP is time-based, must be ±30 seconds accurate
│
├─ Check: Code generation app (Google Authenticator, Authy, etc.)
│  ✅ Should generate 6-digit codes between 0-999999
│
└─ Solution:
   ✅ Disable 2FA: POST /api/react/disable-2fa (requires password)
   ✅ Re-enable and scan new QR code
```

### Emails Not Sending
```
Error: Failed to send email
├─ Check: Gmail credentials
│  ✅ Use app password (16 chars), not main password
│  ✅ Account must have 2FA enabled
│  ✅ Go to: https://myaccount.google.com/apppasswords
│
├─ Check: SMTP settings in application.properties
│  ✅ Host: smtp.gmail.com
│  ✅ Port: 587 (TLS)
│
└─ Check: .env file has MAIL_USERNAME and MAIL_PASSWORD
   ✅ Should override properties file defaults
```

---

## Security Headers Implemented

```
✅ Authorization: Bearer <JWT>     - Token-based auth
✅ X-Customer-Id: <id>            - Customer scope header
✅ X-Vendor-Id: <id>              - Vendor scope header
✅ X-Admin-Email: <email>         - Admin audit trail
✅ Content-Security-Policy        - XSS prevention
✅ X-Frame-Options: DENY          - Clickjacking prevention
✅ X-Content-Type-Options: nosniff - MIME sniffing prevention
✅ Strict-Transport-Security      - HTTPS only (prod)
```

---

## Database Connection Pool Settings

```properties
# HikariCP Configuration (src/main/resources/application.properties)
spring.datasource.hikari.maximum-pool-size=10      # Prod: 20-50
spring.datasource.hikari.minimum-idle=2            # Prod: 5-10
spring.datasource.hikari.connection-timeout=30000  # 30 seconds
spring.datasource.hikari.idle-timeout=600000       # 10 minutes
spring.datasource.hikari.max-lifetime=1800000      # 30 minutes
spring.datasource.hikari.auto-commit=true

# Hibernate JDBC Batching (Performance optimization)
spring.jpa.properties.hibernate.jdbc.batch_size=20
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true
```

**Tuning for Production:**
- Increase `maximum-pool-size` to 20-50 (depends on users)
- Increase `minimum-idle` to 5-10
- Monitor pool exhaustion in logs

---

## Useful Commands

```bash
# Build with profiles
mvn clean package -Pprod -DskipTests

# Run with specific profile
java -jar ekart.jar --spring.profiles.active=prod

# Run with environment variables
DB_USER=prod_user DB_PASSWORD=secret \
DB_HOST=rds-host \
GEMINI_API_KEY=xxx \
java -jar ekart.jar

# PostgreSQL connections
psql -U postgres -d ekart
\list                    # List databases
\dt                      # List tables
\d authentication_otp    # Describe table
SELECT COUNT(*) FROM admin_credential;

# Docker build & run
docker build -t ekart:prod .
docker run -d -p 8080:8080 -e DB_PASSWORD=xxx ekart:prod

# Health check
curl http://localhost:8080/actuator/health

# View logs
tail -f /var/log/ekart/application.log
```

---

**Document Version:** 2.0  
**Last Updated:** April 6, 2026  
**Status:** 🟡 PARTIAL - Awaiting credential rotation
