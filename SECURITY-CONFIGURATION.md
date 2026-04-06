# EKART Security Configuration Guide

## ⚠️ CRITICAL: Issues Found and Required Fixes

### 1. **EXPOSED API KEYS IN .env** ❌ CRITICAL
**Status:** Keys are committed to Git and visible in repository

**Affected Credentials:**
```
GEMINI_API_KEY=AIzaSyBICsUWJjWr2OmdjQlIngOWytFM5igZ0I0
CLOUDINARY_CLOUD=dt2skuzaz
CLOUDINARY_KEY=624425421279873
CLOUDINARY_SECRET=be6vnXm7Z4Dm3_Ef3cxnCJPtgII
```

**⚠️ IMMEDIATE ACTIONS REQUIRED:**

1. **Revoke Gemini API Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Delete the exposed key: `AIzaSyBICsUWJjWr2OmdjQlIngOWytFM5igZ0I0`
   - Create a new API key
   - Update `.env` with new key (local only, don't commit)

2. **Revoke Cloudinary Credentials**
   - Go to: https://cloudinary.com/console/settings/api-keys
   - Regenerate all API keys and secrets
   - Update `.env` with new credentials

3. **Ensure .env is in .gitignore**
   ```bash
   # Verify .env is in .gitignore
   cat .gitignore | grep "^\.env"
   ```

---

### 2. **PostgreSQL Default Credentials** ⚠️ WARNING
**Current:** `postgres` / `postgres` in `application.properties`

**Risk:** Default credentials are easily guessable

**Fix for Production:**
```properties
# In application.properties (local dev only)
spring.datasource.url=jdbc:postgresql://localhost:5432/ekart
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASSWORD:postgres}
```

**In `.env` (production):**
```
DB_USER=prod_user_with_strong_name
DB_PASSWORD=strong_random_password_32_chars_minimum
```

**Generate strong password:**
```bash
# Linux/macOS
openssl rand -base64 32

# Windows PowerShell
[System.Convert]::ToBase64String((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))
```

---

### 3. **Gmail SMTP Credentials** ⚠️ WARNING
**Current:** Hardcoded in `application.properties`
```properties
spring.mail.username=${MAIL_USERNAME:sanjayellur@gmail.com}
spring.mail.password=${MAIL_PASSWORD:exvwhuheyrsusxma}
```

**Issue:** Gmail App Password exposed (not ideal for prod)

**Fix:**
1. **Generate Gmail App Password (2FA enabled account):**
   - Go to: https://myaccount.google.com/apppasswords
   - Select Mail & Windows
   - Generate 16-character app password
   - Never use your main Google password

2. **Update `.env`:**
   ```
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-16-char-app-password
   ```

3. **Lock production email account:**
   - Enable 2-Factor Authentication
   - Use separate email for automated systems
   - Monitor login activity

---

### 4. **AES Encryption Keys** ✅ FIXED
**Status:** Strong keys now in place

**Current (Secure):**
```
AES_SECRET=kT9mP2xL4vQ8wN6yH3jF7dZ1bX5cR0sU  (32 chars)
AES_SALT=fG2hJ4kL6mN8pQ  (16 chars)
```

**Verification:**
```java
// In AES.java
@Value("${aes.secret}")
private String aesSecret;  // Will load from .env environment variable
```

---

### 5. **Admin Authentication** ✅ FIXED
**Status:** Moved from hardcoded to database-backed with 2FA

**What was fixed:**
- ❌ Old: Credentials in `application.properties` (admin.email / admin.password)
- ✅ New: Database-backed `admin_credential` table with BCrypt hashing
- ✅ New: TOTP 2FA support (Google Authenticator compatible)
- ✅ New: Brute force protection (5 attempts, 15-min auto-unlock)

**Login flow (REST API):**
```bash
# Step 1: Authenticate
curl -X POST http://localhost:8080/api/react/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ekart.com","password":"strong_password_8_chars+"}'

# Response (if 2FA enabled):
# {"success":true,"adminId":1,"requires2FA":true}

# Step 2: Verify 2FA (if enabled)
curl -X POST http://localhost:8080/api/react/auth/admin/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{"adminId":1,"totpCode":"123456"}'

# Response:
# {"success":true,"token":"jwt-token-here"}
```

---

### 6. **Reporting Database (H2)** ⚠️ WARNING
**Current:** `jdbc:h2:file:./ekart_reporting_db` in properties

**Issue:** File-based H2 DB not suitable for production

**Fix for Production:**
```properties
# Change to PostgreSQL schema instead
spring.reporting.datasource.url=jdbc:postgresql://db-host:5432/ekart_reporting
spring.reporting.datasource.username=${DB_REPORTING_USER}
spring.reporting.datasource.password=${DB_REPORTING_PASS}
spring.reporting.datasource.driver-class-name=org.postgresql.Driver
```

**Or use:**
- AWS RDS (managed PostgreSQL)
- Azure Database for PostgreSQL
- DigitalOcean Managed Database

---

### 7. **DDL Auto Mode** ⚠️ WARNING
**Current:** `spring.jpa.hibernate.ddl-auto=update` in `application.properties`

**Risk:** Direct schema modifications in production can cause downtime

**Fix:** Use schema versioning with Flyway

```properties
# Development (local)
spring.jpa.hibernate.ddl-auto=update

# Production
spring.jpa.hibernate.ddl-auto=validate
```

**Flyway migrations are already in place:**
```
EKART/src/main/resources/db/migration/
├── V001__Create_AuthenticationOtp_Table.sql
├── V002__Create_AdminCredential_Table.sql
└── ... (more migrations)
```

---

## 🔐 Summary: What's Secure & What Needs Work

| Component | Status | Evidence |
|-----------|--------|----------|
| **OTP Storage** | ✅ SECURE | BCrypt hashed in `authentication_otp` table w/ 5-min expiry |
| **Admin Auth** | ✅ SECURE | Database-backed w/ BCrypt + 2FA (TOTP) + brute force protection |
| **AES Encryption Keys** | ✅ STRONG | 32-char secret, 16-char salt from environment |
| **PostgreSQL Credentials** | ⚠️ DEFAULT | Should use strong unique credentials in prod |
| **Gmail Credentials** | ⚠️ EXPOSED | App password in .env (ok for dev, rotate for prod) |
| **Gemini API Key** | ❌ EXPOSED | Key visible in .env file in Git - MUST REVOKE |
| **Cloudinary Credentials** | ❌ EXPOSED | Keys visible in .env file in Git - MUST ROTATE |
| **Admin Credentials** | ✅ SECURE | No longer in .env or properties (database-backed) |
| **DDL AutoUpdate** | ⚠️ RISKY | Safe for dev, but use `validate` + Flyway in prod |
| **H2 Reporting DB** | ⚠️ UNSUITABLE | Use PostgreSQL in production |

---

## 📋 Production Deployment Checklist

See: [PRODUCTION-DEPLOYMENT-CHECKLIST.md](./PRODUCTION-DEPLOYMENT-CHECKLIST.md)

---

## 🚀 Quick Start for Development

1. **Local `.env` setup (already done):**
   ```bash
   # File: EKART/.env (local only, not in Git)
   AES_SECRET=kT9mP2xL4vQ8wN6yH3jF7dZ1bX5cR0sU
   AES_SALT=fG2hJ4kL6mN8pQ
   MAIL_USERNAME=your-test-email@gmail.com
   MAIL_PASSWORD=your-app-password
   GEMINI_API_KEY=your-key
   CLOUDINARY_CLOUD=your-cloud
   CLOUDINARY_KEY=your-key
   CLOUDINARY_SECRET=your-secret
   ```

2. **Start PostgreSQL locally:**
   ```bash
   # macOS
   brew services start postgresql@15
   
   # Windows (if installed via PostgreSQL installer)
   # Service should auto-start, or use:
   # net start postgresql-x64-15
   
   # Linux
   sudo systemctl start postgresql
   ```

3. **Build & Run:**
   ```bash
   cd EKART
   mvn clean install -DskipTests
   java -jar target/ekart-0.0.1-SNAPSHOT.jar
   ```

4. **Access application:**
   - Backend: http://localhost:8080
   - API Docs: http://localhost:8080/swagger-ui.html
   - Admin Login: POST /api/react/auth/admin/login

---

## 📚 Related Documentation

- [PRODUCTION-DEPLOYMENT-CHECKLIST.md](./PRODUCTION-DEPLOYMENT-CHECKLIST.md) - Step-by-step prod deployment
- [.env.example](./EKART/.env.example) - Template for environment variables
- [MIGRATION-SUMMARY.md](./MIGRATION-SUMMARY.md) - Database migration history
- [AdminAuthService.java](./EKART/src/main/java/com/example/ekart/service/AdminAuthService.java) - 2FA implementation

---

**Last Updated:** April 6, 2026  
**Author:** Security Implementation Team  
**Status:** 🟡 PARTIAL - Waiting for credential rotation
